# Command Palette

A **Command Palette** is a Cmd-K / Ctrl-K typeahead launcher: a modal overlay
that overlays the application chrome, presents a single search input, and
filters a list of commands as the user types. Press `Enter` to run the
focused command, `Escape` to dismiss, arrow keys to walk the result list.
Familiar surface from VS Code, Linear, Slack, Raycast, GitHub's `?`
shortcut, Notion's `/` prompt.

The palette is a **typeahead-driven action launcher** rather than a value
picker. It is emphatically not a `<select>` — there is no committed value,
no form participation, no "selected" state to round-trip; activating an
item runs a side effect (open route, run shortcut, toggle a setting) and
closes the palette. This distinction shapes nearly every API choice below
(`role="dialog"` instead of `role="listbox"` at the root, no
`ControlValueAccessor`, two-way `kjOpen` model only, no committed-value
emission).

This analysis resolves the three pivotal design questions called out in
the brief:

1. **Reuse `KjDialog` for the modal frame, or roll our own?** — Reuse, via
   `hostDirectives`. See [Decision](#decision-core-directive-and-reuse).
2. **Reuse `KjMenu` items, or define a fresh `KjCommandItem`?** — Fresh
   `[kjCommandItem]` family. The role contract (`option` inside `listbox`)
   differs from menu items (`menuitem` inside `menu`), and conflating them
   would force ambiguous ARIA. Same internal taxonomy (item / group /
   label / separator / radio is dropped — no checkable state in a palette)
   but distinct directive names and roles. See [Decision](#decision-core-directive-and-reuse).
3. **Filter algorithm — fuzzy by default, or substring?** — Plug-in
   filter function with a substring default; ship a `kjFuzzyFilter`
   pure helper alongside that consumers opt into. See
   [Filtering](#filtering).

Cross-references: [`actions/dialog.md`](./dialog.md) for the modal frame;
[`actions/dropdown-menu.md`](./dropdown-menu.md) for the per-role item
directive pattern; [`data-input/combobox.md`](../data-input/combobox.md)
for the listbox + typeahead input pattern that this directive most
closely resembles in mechanics; [`data-input/autocomplete.md`](../data-input/autocomplete.md)
for the form-bound cousin.

## Source comparison

### PrimeNG — *no first-class command palette*

PrimeNG ships no Cmd-K palette. The closest approximations its
documentation suggests are:

- **`<p-autoComplete>` in `dropdown` mode** inside a `<p-dialog>` — a
  user can technically wire one up, but it lacks the global keyboard
  shortcut, command-grouping, recently-used affordances, and the
  result-count live announcement expected of a palette.
- **`<p-overlayPanel>` + `<p-listbox>` + manual filter input** — same
  story; nothing AAA-correct out of the box.

PrimeNG also exposes `<p-menu popup="true">` (covered in
[Dropdown Menu](./dropdown-menu.md)) which is a *menu* (`role="menu"`),
not a palette (`role="dialog"` containing a `role="listbox"`). Surface
differences:

- A palette cannot use `role="menu"` because the listbox supports
  typeahead-as-search-text (with full text content) — `menu`'s
  `aria-activedescendant` model is the wrong fit. APG's
  [Combobox-with-Listbox-Popup pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
  is the correct contract.

**Read-off:** PrimeNG omission. We document the gap and ship our own.

### Angular Material — *no first-class command palette*

Material ships no palette either. The closest building blocks are:

- **`MatDialog`** for the modal frame.
- **`MatAutocomplete`** for the typeahead, but it's anchored to an input
  and renders a popup — not a full-screen modal.
- **`MatListbox`** (CDK) — primitive only, not styled.

A consumer can stitch these together (see Material's own example
documentation for a "search dialog" pattern) but the result lacks:

- Global open shortcut (Cmd-K / Ctrl-K).
- Recently-used / pinned commands.
- Group + label semantics inside the result list.
- `aria-live` result-count announcements.
- A documented "when filter input is focused, arrow keys still drive the
  listbox below it" contract.

**Read-off:** Material omission. We document the gap and ship our own.

### shadcn/ui — `Command` (cmdk-based)

shadcn's [`Command`](https://ui.shadcn.com/docs/components/command) is a
re-skin of [`cmdk`](https://github.com/pacocoursey/cmdk), the de-facto
command-palette primitive in the React ecosystem (used by Vercel,
Linear, Raycast clones). This is the canonical reference and the surface
we'll most closely mirror.

Compound shape:

```tsx
<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="Type a command..." />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="Suggestions">
      <CommandItem>Calendar</CommandItem>
      <CommandItem>Search Emoji</CommandItem>
      <CommandItem>Calculator</CommandItem>
    </CommandGroup>
    <CommandSeparator />
    <CommandGroup heading="Settings">
      <CommandItem>Profile</CommandItem>
      <CommandItem>Billing</CommandItem>
      <CommandItem>Settings</CommandItem>
    </CommandGroup>
  </CommandList>
</CommandDialog>
```

Surface worth lifting:

- **`Command` is the root listbox**, separable from the modal frame
  (`CommandDialog` = `Dialog` + `Command`). This split lets consumers
  embed the palette inline (e.g. on a `/search` route) without forcing
  the modal frame.
- **`CommandInput` owns the search text and the listbox's
  `aria-activedescendant`**. The input has `role="combobox"` with
  `aria-controls` pointed at the list. Arrow keys in the input drive
  the list selection — this is the load-bearing UX choice.
- **`CommandItem` is filterable on `value`**, not just on its text
  content. Items can pass keywords/synonyms to broaden matches (e.g.
  `<CommandItem value="theme dark light">Toggle theme</CommandItem>`).
- **`CommandEmpty`** is a content-projected slot rendered when the
  filter returns zero items. A separate directive avoids ad-hoc
  `*ngIf="filtered().length === 0"` boilerplate.
- **`CommandGroup`** has a `heading` prop that doubles as a filter
  hint — when no item in the group passes the filter, the group is
  hidden entirely (heading included).
- **`CommandLoading`** slot for async result fetching.
- **Built-in fuzzy filter** (`command-score`) with override via
  `filter` prop on `Command`. The default is forgiving (handles
  typos, transposition).
- **`shouldFilter={false}`** lets consumers run their own filter
  outside the directive (e.g. server-side search).
- **Compound `CommandDialog`**: convenience wrapper that puts the
  palette inside a Radix `Dialog`. The dialog handles modal frame +
  focus trap; the command handles list semantics.

Critique:

- The cmdk `Command` root assigns `role="application"` historically
  (since switched to plain `<div>` with the listbox inside) — this is
  one of those react-only ergonomics that have evolved. We will not
  use `application` (we don't need to suppress AT virtual cursor; the
  combobox/listbox pair is sufficient).
- cmdk's filter algorithm is buried in `command-score`; we document
  the swap-points clearly and ship a small first-party fuzzy helper.
- `value` as the filter key on items doubles as the React key — this
  reads as a leaky cross-concern. We separate "filter text" (an
  optional `kjKeywords` input) from "value/identity" (an optional
  `kjValue` input passed to the activation event).
- The compound `CommandDialog` flattens a dialog and a listbox into a
  single component. We prefer composition: `[kjCommandPalette]` is
  the listbox-rooted directive; `[kjCommandPaletteDialog]` is a
  convenience directive that combines `KjDialog` + `KjCommandPalette`
  via `hostDirectives` for the common modal case.

### Cross-library summary

|                                  | PrimeNG       | Material      | shadcn/ui (cmdk) | kouji direction                                                                  |
| -------------------------------- | ------------- | ------------- | ----------------- | -------------------------------------------------------------------------------- |
| First-class palette              | no            | no            | yes (`Command`)   | **yes** — `[kjCommandPalette]` family                                            |
| Modal frame reuse                | n/a           | n/a           | reuses `Dialog`   | reuses `KjDialog` via `hostDirectives` on `[kjCommandPaletteDialog]` convenience |
| Listbox role                     | n/a           | n/a           | `listbox`         | `listbox` (APG combobox-with-listbox pattern)                                     |
| Input role                       | n/a           | n/a           | `combobox`        | `combobox` with `aria-controls`/`aria-activedescendant`                          |
| Default filter                   | n/a           | n/a           | fuzzy (cmdk-score)| **substring (case- and diacritic-insensitive)**, plug-in for fuzzy / server      |
| Item filter source               | n/a           | n/a           | `value` prop      | text content + optional `kjKeywords: input<readonly string[]>`                   |
| Group / label                    | n/a           | n/a           | `Group` (heading) | `[kjCommandGroup]` + `[kjCommandLabel]`                                          |
| Separator                        | n/a           | n/a           | `Separator`       | `[kjCommandSeparator]`                                                           |
| Empty state                      | n/a           | n/a           | `CommandEmpty`    | `[kjCommandEmpty]`                                                               |
| Loading state                    | n/a           | n/a           | `CommandLoading`  | `[kjCommandLoading]` (slot, no behaviour)                                         |
| Recently-used / pinned           | n/a           | n/a           | consumer state    | consumer state (documented pattern; `kjPinned` flag on items for sort hint)      |
| Global keybind to open           | n/a           | n/a           | consumer wires it | **`[kjCommandPaletteHotkey]` directive** (defaults to `mod+k`, configurable)     |
| Result-count announcement        | n/a           | n/a           | none built-in     | **yes** — `KjLiveRegion` integration emits "N results"                            |
| Activation                       | n/a           | n/a           | `onSelect(value)` | `(kjActivate)` output with `{ value, item }` payload                              |
| Dismiss on activate              | n/a           | n/a           | yes (default)     | yes (default; `kjDismissOnActivate` to opt out)                                   |

## Decision (core directive and reuse)

**Two-tier directive set.** The palette is two concerns stacked:

1. A **listbox-with-input** primitive — the typeahead, the filter, the
   roving active-descendant on the list, the activation event. This is
   the heart of the palette and stands alone (consumers can embed it
   inline in a sidebar, on a `/search` page, etc.). Provided by
   `[kjCommandPalette]` and its child directives.
2. A **modal-dialog wrapper** — the palette in its most common form is
   modal. Provided by `[kjCommandPaletteDialog]`, a thin convenience
   directive that composes `KjDialog` (existing) with
   `KjCommandPalette` (new) via `hostDirectives` plus a global hotkey
   listener.

| Directive                          | Role                                                                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `[kjCommandPalette]` (new)         | Listbox-rooted state container. Owns `kjValue` (active item, *not* selected — there is no commit semantic), filter function, items registry, item-activation policy. Provides `KJ_COMMAND_PALETTE` context. Standalone (works inline or inside a dialog). |
| `[kjCommandInput]` (new)           | The single text input. `role="combobox"`, `aria-controls` → list, `aria-activedescendant` → active item id, `aria-autocomplete="list"`. Handles ArrowUp / ArrowDown / Home / End / Enter / Escape / PageUp / PageDown.          |
| `[kjCommandList]` (new)            | The scrollable result region. `role="listbox"`. Hosts items, groups, separators. Owns the keyboard scroll-into-view behaviour for the active item.                                                                                                |
| `[kjCommandItem]` (new)            | `role="option"` row. Filterable. Activates on click or on Enter when active. `kjValue: input<unknown>`, `kjKeywords: input<readonly string[]>`, `kjDisabled`, `(kjActivate)` output.                                                                |
| `[kjCommandGroup]` (new)           | `role="group"` wrapper with optional `aria-labelledby` to a `[kjCommandLabel]`. Hides itself when all child items are filtered out.                                                                                                            |
| `[kjCommandLabel]` (new)           | Group heading. `role="presentation"` (text consumed by the group's `aria-labelledby`). Auto-generated id.                                                                                                                                       |
| `[kjCommandSeparator]` (new)       | `role="separator"` divider. Non-focusable. Hidden when adjacent to a hidden group.                                                                                                                                                              |
| `[kjCommandEmpty]` (new)           | Slot shown when the active filter returns zero items. Plain `<div>`, conditionally rendered via internal `*ngIf`-equivalent (input signal projection).                                                                                          |
| `[kjCommandLoading]` (new)         | Slot shown when `kjLoading` is true on the palette root. Same shape as Empty.                                                                                                                                                                  |
| `[kjCommandPaletteDialog]` (new)   | Convenience composition: `hostDirectives: [KjDialog, KjCommandPalette]`. Sits on the dialog panel. Adds nothing the consumer couldn't write themselves; ships because the modal-palette pattern is by far the most common.                       |
| `[kjCommandPaletteHotkey]` (new)   | Global keyboard listener that toggles a referenced `[kjCommandPalette]` (or `[kjCommandPaletteDialog]`) on a configurable chord. Default `mod+k` (Cmd-K on macOS, Ctrl-K elsewhere).                                                            |

### Why a fresh `[kjCommandItem]` family instead of reusing `[kjMenuItem]`

The brief raises this directly. Same item taxonomy, different ARIA
roles. Concretely:

- **Role.** Menu items use `role="menuitem"` inside `role="menu"`. Command
  palette items use `role="option"` inside `role="listbox"`. Reusing
  `[kjMenuItem]` would force one of:
  - **Role-as-input** on the item (Material's old menu pattern). We
    rejected that for the dropdown menu (see
    [`actions/dropdown-menu.md`](./dropdown-menu.md), Decision §
    "shadcn/ui — DropdownMenu (Radix)" critique). It conflates concerns
    and makes type narrowing ugly.
  - **Reusing the menuitem role inside a listbox**. AAA-incorrect; AT
    handling diverges between the two roles (notably `aria-selected`
    vs. activation semantics, and how `aria-activedescendant` is
    interpreted).
- **Activation contract.** Menu items emit a "select" that is consumed
  by the menu (closes by default). Command palette items emit
  `kjActivate` that the *consumer* wires to a side effect (open a
  route, run a shortcut). Activation always closes the palette; this
  is hard-coded with `kjDismissOnActivate` to opt out.
- **Filterability.** Menu items don't filter. Command items do, with
  optional keyword/synonym inputs.
- **Two-way `kjOpen` semantics.** A menu has one open state with
  multiple close reasons. A palette has open + a transient "active
  item" state (active-descendant). Different state shape is clearer in
  separate directives.
- **Active-descendant vs. roving tabindex.** The dropdown menu uses
  *roving tabindex* (`KjRovingTabindex` on `[kjMenuContent]`) — focus
  literally moves between items. The command palette must use
  **`aria-activedescendant`** because the actual `:focus` stays on the
  text input the entire time. This is a fundamentally different focus
  model and lives in `[kjCommandList]` / `[kjCommandInput]` rather
  than `KjRovingTabindex`.

So: same compound shape, distinct directives, distinct roles, distinct
state model. The two families share zero runtime code. They share
*conventions* (per-role directives, content projection, `kj`-prefixed
inputs, host-attribute ARIA wiring) and that's enough.

### Why reuse `KjDialog` (not roll our own modal frame)

The brief invites the alternative ("reuse `KjDialog`?") and the answer
is unambiguously yes. `KjDialog` already owns:

- `role="dialog"` + `aria-modal="true"` host bindings.
- `aria-labelledby` wiring via `KjDialogTitle`.
- Backdrop-click dismissal via `KjDialogOverlay`.
- Escape-to-close via `KjDialogTrigger`.
- View attachment to `document.body` (via the trigger today; see Open
  Questions for the gap-fill needed before the palette ships).
- Focus restoration (in `KjDialogService` — gap-filled in the dialog
  analysis, see [`actions/dialog.md`](./dialog.md) §Open questions
  #1, #2 — these gaps are blockers for the palette, not new work).

What we *don't* want from `KjDialog` for the palette case:

- `KjDialogTitle` is wrong for the palette: the input itself acts as
  the accessible name source via `aria-label`, so we don't need a
  visually-rendered heading. The palette's `aria-labelledby` points to
  the *input's* description ("Command palette") via an
  `kjAriaLabel: input<string>` on `[kjCommandPalette]` (default
  `'Command palette'`).

The composition shape:

```ts
@Directive({
  selector: '[kjCommandPaletteDialog]',
  standalone: true,
  hostDirectives: [
    {
      directive: KjDialog,
      // KjDialog reads its labelledby from KjDialogTitle today; we override
      // via a new `kjAriaLabel` input on KjDialog (small primitive enhancement —
      // tracked in Open Questions). Until it lands, the palette dialog
      // synthesises a hidden span with id and points labelledby at it.
    },
    {
      directive: KjCommandPalette,
      inputs: [
        'kjFilter: kjFilter',
        'kjValue: kjValue',
        'kjLoading: kjLoading',
        'kjDismissOnActivate: kjDismissOnActivate',
        'kjAriaLabel: kjAriaLabel',
      ],
      outputs: ['kjActivate: kjActivate', 'kjValueChange: kjValueChange'],
    },
  ],
})
export class KjCommandPaletteDialog {}
```

The trigger (the consumer's "Search" button or `mod+k` hotkey) drives
the dialog's open state via the standard `[kjDialogTrigger]` /
`KjDialogService` paths plus `[kjCommandPaletteHotkey]`. No new modal
machinery.

### Why a separate `[kjCommandPaletteHotkey]` rather than baking the hotkey into the palette

Three reasons:

1. **Single-responsibility.** The palette doesn't need to know about
   global keyboard shortcuts; it only knows about its own listbox.
   Hotkeys are an orthogonal cross-cutting concern that other
   directives (a future `[kjShortcut]`) will share.
2. **Inline-mode compatibility.** A palette embedded inline (e.g. on a
   `/search` page) doesn't want a global Cmd-K listener — that would
   conflict with another modal palette on the same page. The hotkey
   directive is opt-in.
3. **Configurability.** Some apps already own Cmd-K (Linear has a
   layered system); a separate directive lets them disable just the
   hotkey without losing the palette.

The directive is small (~30 lines) and platform-aware:
`mod+k` resolves to `Meta+K` on macOS and `Ctrl+K` elsewhere via the
standard `navigator.platform` (or `navigator.userAgentData.platform`)
detection.

## Base features

- **Open / dismiss lifecycle.** When wrapped in `[kjCommandPaletteDialog]`,
  delegated to `KjDialog`'s lifecycle. Standalone `[kjCommandPalette]`
  does not own open/close — its consumer renders/hides it via
  template logic. The hotkey directive toggles the dialog's `open`
  signal.
- **Search input.** `[kjCommandInput]` owns the `model<string>`
  `kjQuery` (default `''`). Two-way bindable. Internally debounced via
  the consumer (no built-in debounce — palettes feel sluggish with
  one). Input is autofocused when the palette opens (via
  `KjDialog`'s `kjDialogAutoFocus="[kjCommandInput] input"` — see
  Open Questions).
- **Filtering.** Pluggable. Default substring matcher (case- and
  diacritic-insensitive) over each item's `textContent` plus
  `kjKeywords`. Override via `kjFilter: input<KjCommandFilter>` on the
  palette root. Setting `kjShouldFilter={false}` disables internal
  filtering entirely (server-side search). Items expose
  `data-state="visible|hidden"` plus `aria-hidden` reflection.
- **Active item.** Tracked via the palette root's `kjValue` model
  (the *active* item, distinct from a "selected" commit value — the
  palette has no commit). Always reset to the first visible item when
  the filter changes (configurable via `kjAutoActivateFirst`,
  default `true`). Programmatic `palette.activate(value)` is exposed
  on the directive.
- **Activation.** Click on an item, Enter while active, mouse hover
  to activate (configurable via `kjActivateOnHover`, default `true`
  matching cmdk). Activation fires `(kjActivate)` with `{ value, el }`
  payload and (when `kjDismissOnActivate` is `true`, default)
  closes the dialog.
- **Keyboard contract.** See [Accessibility](#accessibility-wcag-21-aaa)
  below. Summary: ArrowUp/Down move active item, Home/End jump,
  PageUp/PageDown jump by page (10 items default), Enter activates,
  Escape closes (delegates to `KjDialog`).
- **Empty state.** `[kjCommandEmpty]` is rendered when the visible
  item count is zero. Provided as a content-projected slot.
  Live-region announces "No results found" (or `kjEmptyAnnouncement`
  override) once the filter settles.
- **Loading state.** `kjLoading: input<boolean>` on the palette root.
  When true, `[kjCommandLoading]` is visible, items are visually
  faded (CSS via `data-loading="true"` on the list), and the input's
  `aria-busy="true"` reflects.
- **Groups and labels.** `[kjCommandGroup]` with optional
  `[kjCommandLabel]`. Groups auto-hide (`hidden` attribute, removed
  from AT) when all child items are filtered out — including the
  label. Adjacent separators are also auto-hidden.
- **Recently-used.** *Not* a built-in feature. Documented pattern: the
  consumer keeps a recent-commands array in their own store and
  renders a `[kjCommandGroup]` labelled "Recent" at the top of the
  list, populated from that store. The palette doesn't persist
  state across opens — opinionated v1 stance, revisitable in v1.1
  if real consumers ask for built-in MRU. Pinned items: a `kjPinned`
  attribute on the item lets the consumer's CSS sort them to the top.
- **Variant / Size.** `KjVariant` / `KjSize` host directives on
  `[kjCommandItem]` only (the input has its own `KjInput`-style
  directive in the wrapper). Mirrors `KjButton` and `KjMenuItem`.
- **`kjDismissOnActivate`.** Input on `[kjCommandPalette]`, defaults
  `true`. Per-item override via `[kjDismissOnActivate]` on
  `[kjCommandItem]` (e.g. for a "Toggle theme" item that should keep
  the palette open).

## Filtering

The filter pipeline is the heart of the palette UX. Get it wrong and
typing feels lifeless or unpredictable.

### Pipeline

```text
input change → kjQuery signal updates
            → palette root re-derives `filteredItems` via kjFilter()
            → each item flips data-state (visible/hidden) and aria-hidden
            → KjLiveRegion announces "{N} results" (debounced)
            → if the active item is now hidden, jump to first visible
```

All steps run inside Angular's signal graph (computed signals + an
`effect` for the live-region announce). No manual change-detection
plumbing.

### Default filter — substring, case- and diacritic-insensitive

Rationale:

- **Predictable.** Substring matching never surprises users. Fuzzy
  matchers occasionally hide items that "should" match (or surface
  ones that "shouldn't"); for AAA we lean toward predictability.
- **Cheap.** O(n × m) over visible items; for the typical
  ≤500-command palette, runs in < 1 ms. Fuzzy matchers are typically
  10–50 × slower (OK still, but no reason to pay the cost by
  default).
- **Diacritic stripping.** `'café'.normalize('NFD').replace(/\p{Diacritic}/gu, '')`
  → `'cafe'`. Improves UX for users on non-English keyboards. Built-in
  via a small `stripDiacritics` helper exposed from the package.

The default matcher signature:

```ts
export type KjCommandFilter = (
  query: string,
  haystacks: readonly string[],
) => number; // score; > 0 = visible, higher = more relevant; 0 = hidden

/** Default: case- and diacritic-insensitive substring; score = 1 if matches any haystack, 0 otherwise. */
export const kjSubstringFilter: KjCommandFilter = (query, haystacks) => {
  if (!query) return 1; // empty query → everything visible
  const needle = stripDiacritics(query.toLowerCase());
  return haystacks.some(h => stripDiacritics(h.toLowerCase()).includes(needle)) ? 1 : 0;
};
```

`haystacks` for a given item is `[item.textContent, ...item.kjKeywords()]`,
flattened. Items can broaden their match surface without changing the
visible label.

### Built-in fuzzy filter — `kjFuzzyFilter` (opt-in)

For palettes with hundreds of commands and power users who want
typo-tolerance, we ship `kjFuzzyFilter` alongside `kjSubstringFilter`.
Adapted from the public-domain
[fzy](https://github.com/jhawthorn/fzy) algorithm — small (~50 LOC),
deterministic, surfaces "abbreviation" matches naturally (e.g. `gth`
matches `git checkout`).

```ts
import { kjFuzzyFilter } from '@kouji-ui/core';
// ...
<div kjCommandPalette [kjFilter]="kjFuzzyFilter">…</div>
```

Score-based (returns 0..1) so consumers can sort by relevance. The
palette sorts by score descending when `kjSortByScore` is true
(default `false` to preserve consumer ordering, which often
encodes recency or pinning).

### Custom / async / server-side filtering

Two paths:

1. **Custom synchronous filter.** Provide a function with the
   `KjCommandFilter` shape. Useful for domain-specific logic (e.g.
   weighting recently-used commands).
2. **Server-side filter.** Set `kjShouldFilter={false}`. The consumer
   maintains the visible items themselves (via signals) and the
   palette only handles activation + keyboard navigation. The
   `kjQueryChange` output emits debounced text for the consumer to
   pipe to a backend. The consumer renders only the items the server
   returned; the palette doesn't filter further. Loading state is
   surfaced via `kjLoading`.

### Sort

Default: declared order (consumer wins). Optional `kjSortByScore`:
when true, items are reordered by descending score. Implementation
hides "lower-score" items via `order:` CSS (no DOM reordering — keeps
focus / animation stable; the visual order changes via flexbox
`order` based on the score reflected as `style="order:-N"` on the
item). Cross-reference: this is the same trick used by the cmdk
library.

## Accessibility (WCAG 2.1 AAA)

### Roles

| Element                          | Role                                                                                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `[kjCommandPalette]` (root)      | none (state container; if used standalone, host element gets no role)                                                                            |
| `[kjCommandPaletteDialog]`       | `dialog` + `aria-modal="true"` (from `KjDialog`)                                                                                                |
| `[kjCommandInput]`               | `combobox`                                                                                                                                       |
| `[kjCommandList]`                | `listbox`                                                                                                                                        |
| `[kjCommandItem]`                | `option`                                                                                                                                         |
| `[kjCommandGroup]`               | `group` (+ `aria-labelledby` if a label is present)                                                                                              |
| `[kjCommandLabel]`               | `presentation`                                                                                                                                   |
| `[kjCommandSeparator]`           | `separator` + `aria-orientation="horizontal"`                                                                                                    |
| `[kjCommandEmpty]`               | `status` (`aria-live="polite"`, see Live region below)                                                                                            |
| `[kjCommandLoading]`             | `status` (`aria-live="polite"`)                                                                                                                  |

### ARIA wiring

Following the [APG combobox-with-listbox-popup pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/),
adapted for "popup is always visible while dialog is open":

On `[kjCommandInput]`:

- `role="combobox"`
- `aria-expanded="true"` while the palette is open. (The combobox spec
  requires `aria-expanded` even when the popup is statically visible
  inside the same modal.)
- `aria-controls="<list id>"` pointing at `[kjCommandList]`.
- `aria-activedescendant="<active item id>"` (or empty when no
  visible items). This is what AT announces as the user arrows
  through the list while focus stays on the input.
- `aria-autocomplete="list"` (the list is filtered, not inline-completed).
- `aria-haspopup="listbox"`.
- `autocomplete="off"`, `autocorrect="off"`, `spellcheck="false"`,
  `autocapitalize="none"` to prevent browser interference.
- `type="search"` on the underlying `<input>` (responsibility of the
  consumer — the directive sits on `<input>`).

On `[kjCommandList]`:

- `role="listbox"`.
- `id="<auto-generated, kj-command-list-{n}>"` consumed by the input.
- `aria-label` defaults to the palette's `kjAriaLabel` (e.g.
  `'Commands'`); override via `kjAriaLabel` on `[kjCommandList]`
  directly.

On `[kjCommandItem]`:

- `role="option"`.
- `id="<auto-generated, kj-command-item-{n}>"`.
- `aria-selected="true"` only on the *active* item (the one
  highlighted by ArrowDown / hover). This matches the APG pattern:
  in a single-select listbox driven by `aria-activedescendant`,
  `aria-selected` reflects the current visual focus, not a committed
  selection. **Note:** the palette doesn't have a "committed
  selection" — Enter activates the item and closes — so
  `aria-selected="true"` is transiently true on the active item only,
  and never persists across opens.
- `aria-disabled` reflects `kjDisabled`.
- `aria-hidden` reflects filter state (item filtered out → hidden
  from AT). This deviates from cmdk (which uses `display:none`) and
  preserves a tiny perf win: filtered items stay in the DOM but are
  invisible to AT.

On `[kjCommandPaletteDialog]`:

- All `KjDialog` ARIA (`role="dialog"`, `aria-modal="true"`).
- `aria-label="Command palette"` by default, overridable via
  `kjAriaLabel` (the palette's own input, forwarded to the dialog
  host). No `aria-labelledby` to a title element — the input *is*
  effectively the heading.
- `aria-describedby="<live-region id>"` so the result-count
  announcement is associated with the dialog. Optional; consumers
  who provide their own describedby win.

### Keyboard contract

The keyboard model is **focus-stays-on-input throughout**. Arrow keys
in the input drive the listbox via `aria-activedescendant`. This is
the load-bearing UX choice — typeahead is the entire interaction.

| Key                       | When focus is on…       | Behaviour                                                                                                                                      |
| ------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Printable character       | Input                   | Append to query. Filter re-runs. Active item resets to first visible (if `kjAutoActivateFirst`).                                                |
| `Backspace`               | Input                   | Standard. If query becomes empty, the active item resets to first visible item in the unfiltered list.                                          |
| `ArrowDown`               | Input                   | Move active item to next visible. Wraps to first if at end.                                                                                     |
| `ArrowUp`                 | Input                   | Move active item to previous visible. Wraps to last if at start.                                                                                |
| `Home`                    | Input (with no text *or* text-cursor at column 0) | Active item → first visible. **Note:** when there is text and the cursor is mid-string, `Home` is the standard caret-to-start key — we don't override it then. See Open Questions. |
| `End`                     | Input (cursor at end-of-text) | Active item → last visible.                                                                                                              |
| `PageDown`                | Input                   | Active item → +N visible (where N = `kjPageSize`, default `10`). Clamps to last.                                                                 |
| `PageUp`                  | Input                   | Active item → −N. Clamps to first.                                                                                                               |
| `Enter`                   | Input                   | Activate the current `aria-activedescendant`. If no active item (empty list), no-op.                                                            |
| `Escape`                  | Input                   | If query non-empty, **first press clears the query**; second press closes the dialog (delegates to `KjDialog`'s Escape handler). Configurable via `kjEscapeBehavior`: `'clear-then-close'` (default), `'close'` (immediate). |
| `Tab` / `Shift+Tab`       | Input                   | Standard tab order. Inside a focus trap (modal), tabs through the close button (if any) and back. **Tab does not activate** an option — that's a `<select>` antipattern; matches APG.   |
| Click on item             | n/a                     | Activate the clicked item. Hover sets active before click.                                                                                       |
| Mouse hover               | n/a                     | Set active item (move `aria-activedescendant`). Disabled when `kjActivateOnHover=false`.                                                         |
| `Cmd-K` / `Ctrl-K` (or configured chord) | document        | Toggle palette open. Owned by `[kjCommandPaletteHotkey]`. Suppressed when the user is typing in another input (consumer-overridable predicate). |

The roving-active-descendant logic lives in `[kjCommandList]`. The
input directive forwards arrow keys to the list via the shared context.
We do **not** use `KjRovingTabindex` — that primitive moves
`tabindex="0"` between elements, and we want focus to stay on the
input.

### Focus management

- **On open:** dialog focus-trap engages (via `KjDialog`'s
  `KjFocusTrap`), focus moves to `[kjCommandInput] input`. Dialog's
  `kjDialogAutoFocus` selector is set to the input. (Open Questions
  #1: dialog auto-focus needs the selector input to land — already
  flagged in [`actions/dialog.md`](./dialog.md) §Open questions #2.)
- **On filter change:** focus stays on the input. The active item
  scrolls into view (`scrollIntoView({ block: 'nearest' })`), but
  focus never moves to it.
- **On activate:** the activated item's `(kjActivate)` fires; if
  `kjDismissOnActivate=true`, the dialog closes and `KjDialog`
  restores focus to the original opener (typically the trigger
  button or — when opened by hotkey — the `document.body`).
- **On dismiss:** dialog closes, focus restored to opener.
- **No focus on items.** Items are not in the tab order
  (`tabindex="-1"`). They are activated by mouse / by Enter on the
  active descendant. This is the APG-blessed pattern.

### Live region for result count

The palette composes `KjLiveRegion` (existing primitive at
`packages/core/src/a11y/live-region.ts`) for two announcements:

1. **Result count.** Debounced 200 ms after the last filter run:
   `"{N} results"` (or `"1 result"`, or `"No results found"`). This
   is a major AAA win — without it, AT users can't tell if their
   typing is doing anything. The directive emits the announcement
   via `KjLiveRegion.announce(...)`. A `kjAnnounceResultCount: input<boolean>(true)`
   lets consumers disable.
2. **Loading state.** When `kjLoading` becomes true: `"Loading…"`.
   When it returns false with results: result-count announcement.
   Skipped if results haven't changed.

The live region element is rendered inside the palette root with
`role="status"`, `aria-live="polite"`, `aria-atomic="true"`, and is
visually hidden via `KjVisuallyHidden`. `aria-describedby` on the
palette dialog points at it so AT associates the announcements with
the modal.

### Touch target (WCAG 2.5.5 AAA — 44×44 CSS px)

Items must hit 44×44 px minimum. The core directive does not enforce
sizes; the wrapper's `KjSize` defaults must guarantee. `[kjCommandItem]`
defaults likely to a single-row 44 px height matching `KjMenuItem`.
Same contract as Menu Item.

### Reduced motion

Active-item scroll-into-view uses `behavior: 'smooth'` only when
`prefers-reduced-motion: no-preference`. Otherwise instant. Implemented
inside `[kjCommandList]` (one matchMedia check at directive
construction).

### Color & contrast

Wrapper concern. AAA targets: 7:1 for normal text, 4.5:1 for large
text, 4.5:1 for the active-item highlight against background, 3:1 for
focus indicators. The active-item highlight must not rely on color
alone (WCAG 1.4.1) — pair with an icon, weight, or a left-border
indicator. Documented in the wrapper's CSS comments.

## Composition model

```text
command-palette/
  command-palette.ts             ← KjCommandPalette (root listbox state)
  command-palette-dialog.ts      ← KjCommandPaletteDialog (modal convenience)
  command-palette-hotkey.ts      ← KjCommandPaletteHotkey (global keybind)
  command-input.ts               ← KjCommandInput (combobox input)
  command-list.ts                ← KjCommandList (listbox host)
  command-item.ts                ← KjCommandItem (option row)
  command-group.ts               ← KjCommandGroup
  command-label.ts               ← KjCommandLabel
  command-separator.ts           ← KjCommandSeparator
  command-empty.ts               ← KjCommandEmpty (slot)
  command-loading.ts             ← KjCommandLoading (slot)
  command-palette.context.ts     ← KJ_COMMAND_PALETTE token + interfaces + filters
  command-palette.filters.ts     ← kjSubstringFilter, kjFuzzyFilter, stripDiacritics
  command-palette.example.ts
  command-palette.dialog.example.ts
  command-palette.async.example.ts
  command-palette.groups.example.ts
  command-palette.hotkey.example.ts
  command-palette.fuzzy.example.ts
  command-palette.spec.ts
  index.ts
```

### Shared state — `KJ_COMMAND_PALETTE` context

```ts
export interface KjCommandPaletteContext {
  /** Current query text (two-way bound via [kjCommandInput] [(kjQuery)]). */
  readonly query: Signal<string>;
  /** The active item value (highlighted, not committed). */
  readonly activeValue: Signal<unknown>;
  /** All registered items in declaration order. */
  readonly items: Signal<readonly KjCommandItemRegistration[]>;
  /** Items visible after the current filter pass (sorted if kjSortByScore). */
  readonly visibleItems: Signal<readonly KjCommandItemRegistration[]>;
  /** Auto-generated id for the listbox host. */
  readonly listId: string;
  /** Whether the palette is in the loading state. */
  readonly loading: Signal<boolean>;
  /** Whether result-count announcements are enabled. */
  readonly announceResultCount: Signal<boolean>;
  /** Should internal filtering run? (false = consumer-controlled.) */
  readonly shouldFilter: Signal<boolean>;
  /** Activate by value; runs the filter check + emits kjActivate + (optionally) closes. */
  activate(value: unknown): void;
  /** Move the active descendant by visible-item delta (e.g. +1 for ArrowDown, +10 for PageDown). */
  moveActive(delta: number, wrap?: boolean): void;
  /** Set the active descendant to the first / last visible item. */
  setActiveTo(target: 'first' | 'last' | 'value', value?: unknown): void;
  /** Register / unregister an item. Called from KjCommandItem's lifecycle. */
  registerItem(item: KjCommandItemRegistration): void;
  unregisterItem(item: KjCommandItemRegistration): void;
}

export interface KjCommandItemRegistration {
  readonly id: string;
  readonly value: unknown;
  readonly disabled: Signal<boolean>;
  readonly el: HTMLElement;
  readonly haystacks: Signal<readonly string[]>; // textContent + keywords
  readonly score: WritableSignal<number>; // updated by the filter pass
}

export const KJ_COMMAND_PALETTE = new InjectionToken<KjCommandPaletteContext>('KjCommandPalette');
```

### `hostDirectives` composition

- **`[kjCommandPalette]`** composes:
  - `KjLiveRegion` (mounted on a hidden child element, not the host —
    so the palette host is free to be anything; the directive
    creates a `<div>` programmatically for the live region).
  - **Nothing else.** The palette is a pure state container.
- **`[kjCommandInput]`** composes:
  - `KjFocusRing` only if not already present on the consumer's
    input — same rationale as `[kjDropdownMenuTriggerFor]`.
  - **No** `KjFormControl` — this is not a form input. Its `kjQuery`
    is a `model<string>` for two-way binding only.
- **`[kjCommandList]`** composes nothing. Pure ARIA.
- **`[kjCommandItem]`** composes:
  - `KjVariant`, `KjSize`, `KjFocusRing`, `KjDisabled` — same
    pattern as `KjMenuItem`.
  - Capture-phase click suppression on disabled (mirrors `KjButton`
    / `KjMenuItem` / `KjSpeedDialAction`; fourth instance — at this
    point we should extract a shared helper, see Open Questions
    #4).
- **`[kjCommandPaletteDialog]`** composes:
  - `KjDialog` (with all its existing host directives — `KjFocusTrap`
    once Open Questions #1 in `dialog.md` is closed).
  - `KjCommandPalette` (forwarding inputs/outputs).
- **`[kjCommandGroup]`**, **`[kjCommandLabel]`**, **`[kjCommandSeparator]`**,
  **`[kjCommandEmpty]`**, **`[kjCommandLoading]`** compose nothing.
  Pure ARIA / projection.
- **`[kjCommandPaletteHotkey]`** composes nothing. Pure
  `document:keydown` listener.

### Cross-component pointers

- **Dialog** ([`actions/dialog.md`](./dialog.md)) — modal frame
  reused via `hostDirectives` on `[kjCommandPaletteDialog]`. The
  palette **blocks** on Dialog's Open Questions #1 (focus trap
  wired) and #2 (auto-focus on directive path). Both are gap-fills
  in the existing dialog code, not new work.
- **Dropdown Menu** ([`actions/dropdown-menu.md`](./dropdown-menu.md))
  — sibling action surface. **Different roles** (`menuitem` vs.
  `option`), **different focus model** (roving tabindex vs.
  `aria-activedescendant`). The two analyses share conventions and
  the per-role-directive split philosophy. We do not reuse code.
- **Combobox** ([`data-input/combobox.md`](../data-input/combobox.md))
  — closest cousin in mechanics (combobox + listbox + typeahead).
  When that analysis lands, expect overlap on:
  - The `aria-activedescendant` keyboard model.
  - The filter pipeline (substring default, fuzzy opt-in).
  - The result-count live announcement.

  The split: combobox is a **form control** with a committed value
  (round-trips through `KjFormControl`, fires `(kjValueChange)`).
  Command palette is an **action launcher** without a committed
  value (fires `(kjActivate)` instead). They share *shape* but not
  *contract*. We expect Combobox to extract a shared
  `KjListboxNav` primitive from this work — see Open Questions.
- **Autocomplete** ([`data-input/autocomplete.md`](../data-input/autocomplete.md))
  — a more freeform combobox where the user can also commit
  arbitrary text. Same `KjListboxNav` primitive consumer.
- **Dropdown Menu** also documents the deferred `KjPopupTrigger`
  primitive (its Open Question #11). Command Palette does **not**
  use a popup trigger — it's modal, opened via dialog or hotkey,
  not anchored to a button. Outside that abstraction's surface.
- **Toast** ([`feedback/toast.md`](../feedback/toast.md)) — both
  consume `KjLiveRegion`. The palette uses it for its own
  result-count announcements; toasts use it for transient app
  notifications. No conflict — they are independent live regions
  on different DOM nodes.
- **Speed Dial** ([`actions/speed-dial.md`](./speed-dial.md)) — also
  an action launcher, but radial / spatial. The palette is the
  text-driven counterpart. No code shared.
- **Context Menu** ([`actions/context-menu.md`](./context-menu.md))
  — opened by right-click, contains menu items. Different role
  contract than the palette. No overlap beyond shared conventions.

## Inputs / Outputs / Models

### `[kjCommandPalette]` (root)

| Member                      | Kind   | Type                                        | Default               | Notes                                                                                                                |
| --------------------------- | ------ | ------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `kjFilter`                  | input  | `KjCommandFilter`                           | `kjSubstringFilter`   | Pluggable filter. Returns a numeric score; > 0 = visible, 0 = hidden.                                                |
| `kjShouldFilter`            | input  | `boolean`                                   | `true`                | When `false`, internal filtering is skipped — items are visible iff the consumer renders them.                         |
| `kjSortByScore`             | input  | `boolean`                                   | `false`               | When `true`, items sort by score descending via CSS `order`. Preserves DOM order otherwise.                            |
| `kjLoading`                 | input  | `boolean`                                   | `false`               | Renders `[kjCommandLoading]` slot, sets `aria-busy="true"` on the input, dims items via `data-loading="true"`.        |
| `kjAutoActivateFirst`       | input  | `boolean`                                   | `true`                | Reset active item to first visible whenever filter changes.                                                            |
| `kjActivateOnHover`         | input  | `boolean`                                   | `true`                | Mouse hover sets active item (matches cmdk).                                                                          |
| `kjDismissOnActivate`       | input  | `boolean`                                   | `true`                | Activation closes the host dialog. Per-item override available.                                                       |
| `kjPageSize`                | input  | `number`                                    | `10`                  | Items moved by `PageUp`/`PageDown`.                                                                                   |
| `kjEscapeBehavior`          | input  | `'clear-then-close' \| 'close'`             | `'clear-then-close'`  | First Escape clears query if non-empty (mode 1) or closes immediately (mode 2).                                        |
| `kjAnnounceResultCount`     | input  | `boolean`                                   | `true`                | Live-region announces "N results" after filter runs.                                                                  |
| `kjAriaLabel`               | input  | `string`                                    | `'Command palette'`   | The accessible name for the listbox + (when wrapped in dialog) the dialog. Forwarded to `[kjCommandPaletteDialog]`.   |
| `kjValue`                   | model  | `unknown`                                   | `null`                | Two-way bindable. The active item's value (highlighted, not committed).                                               |
| `kjQuery`                   | model  | `string`                                    | `''`                  | Two-way bindable. The query text. Mirrored from `[kjCommandInput]` if both are bound.                                  |

| Output                      | Kind   | Payload                                     | Notes                                                                                                                |
| --------------------------- | ------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `kjValueChange`             | output | `unknown`                                   | Convenience event paired with the `kjValue` model. Fires when the active descendant changes.                          |
| `kjQueryChange`             | output | `string`                                    | Convenience event paired with `kjQuery`. Fires on every query change (synchronous; debouncing is consumer's job).      |
| `kjActivate`                | output | `KjCommandActivateEvent`                    | Fires on item activation (click, Enter, programmatic). `{ value: unknown, item: HTMLElement, query: string }`.        |
| `kjVisibleCountChange`      | output | `number`                                    | Number of items visible after the latest filter pass. Useful for analytics + custom empty-state messaging.            |

### `[kjCommandInput]`

| Member                | Kind   | Type                                        | Default | Notes                                                                                                                       |
| --------------------- | ------ | ------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| `kjQuery`             | model  | `string`                                    | `''`    | Two-way bindable. Mirrors palette's `kjQuery` if both are bound (the directive resolves and keeps them in sync internally). |
| `kjPlaceholder`       | input  | `string`                                    | `''`    | Forwarded to the underlying `<input>`'s `placeholder` attribute.                                                            |

| Output                | Kind   | Payload                                     | Notes                                                                                                                       |
| --------------------- | ------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `kjQueryChange`       | output | `string`                                    | Convenience event.                                                                                                          |

The directive expects to sit on an `<input type="search">` (consumer-
controlled). It does not project content; the input is the host.

### `[kjCommandList]`

No public inputs/outputs. Reads `KJ_COMMAND_PALETTE`. Owns
`scrollIntoView` for the active item, `aria-label` (default forwarded
from palette), and the listbox role.

### `[kjCommandItem]`

| Member                  | Kind   | Type                          | Default     | Notes                                                                                                                       |
| ----------------------- | ------ | ----------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| `kjValue`               | input  | `unknown`                     | (undefined) | Identity passed to `(kjActivate)` payload. If unset, defaults to the item's text content.                                   |
| `kjKeywords`            | input  | `readonly string[]`           | `[]`        | Extra haystacks for the filter. Includes synonyms (e.g. `['theme', 'appearance', 'mode']` for a "Toggle dark mode" item).   |
| `kjVariant`             | input  | `KjVariant` (forwarded)       | preset      |                                                                                                                             |
| `kjSize`                | input  | `KjSize` (forwarded)          | preset      |                                                                                                                             |
| `kjDisabled`            | input  | `boolean`                     | `false`     | Reflects `aria-disabled`. Filtered to visible but cannot be activated.                                                      |
| `kjPinned`              | input  | `boolean`                     | `false`     | Hint for consumer CSS / wrapper to sort to top. No behaviour at the directive level (does not affect filter or score).      |
| `kjDismissOnActivate`   | input  | `boolean \| undefined`        | `undefined` | When undefined, inherits from `[kjCommandPalette]`. Override per item.                                                      |

| Output                  | Kind   | Payload                       | Notes                                                                                                                       |
| ----------------------- | ------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `kjActivate`            | output | `KjCommandActivateEvent`      | Fires before the palette-level `kjActivate`. Item-local handler. Useful for "do this thing for this command" handlers.      |

### `[kjCommandGroup]` / `[kjCommandLabel]` / `[kjCommandSeparator]`

No public inputs/outputs.

- `[kjCommandGroup]` auto-hides itself (sets `hidden` on its host) when
  every child item has score `0`. Adjacent `[kjCommandSeparator]`
  siblings auto-hide via the same mechanism.
- `[kjCommandLabel]` auto-generates an id (`kj-command-label-{n}`); the
  wrapping `[kjCommandGroup]` picks it up via `contentChild(KjCommandLabel)`
  and binds `aria-labelledby` on the group host.
- `[kjCommandSeparator]` host attrs: `role="separator"`,
  `aria-orientation="horizontal"`.

### `[kjCommandEmpty]` / `[kjCommandLoading]`

No public inputs/outputs. Visibility driven by the palette context:

- `[kjCommandEmpty]` is rendered when `visibleItems().length === 0` and
  `loading()` is false. Sets `role="status"`, `aria-live="polite"`.
- `[kjCommandLoading]` is rendered when `loading()` is true. Same
  ARIA. Mutually exclusive with the items list (items are visually
  faded but still rendered to preserve scroll position).

### `[kjCommandPaletteDialog]`

Forwards all `[kjDialog]` and `[kjCommandPalette]` inputs/outputs via
`hostDirectives` aliasing. Adds nothing of its own.

### `[kjCommandPaletteHotkey]`

| Member                 | Kind   | Type                                                 | Default                              | Notes                                                                                                  |
| ---------------------- | ------ | ---------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `kjCommandPaletteHotkey` | input  | `KjCommandPaletteDialog \| KjDialogTrigger \| Signal<boolean>` | required                             | Reference to the palette to toggle. Accepts a directive instance (template ref) or a writable signal.    |
| `kjHotkey`             | input  | `string \| readonly string[]`                        | `'mod+k'`                            | Chord(s). `mod` resolves to `meta` on macOS, `ctrl` elsewhere. Multiple chords (e.g. `['mod+k', '/']`).  |
| `kjHotkeyEnabled`      | input  | `boolean`                                            | `true`                               | Disable without unmounting (e.g. when nested in a focus-disabled region).                              |
| `kjHotkeyShouldHandle` | input  | `(e: KeyboardEvent) => boolean`                      | `defaultShouldHandlePredicate`       | Override predicate. Default suppresses when target is `<input>`/`<textarea>`/`[contenteditable]` (so users can use Cmd-K inside a text field if needed — but we *invert* that for command palettes since `mod+k` should always open). See Open Questions #5. |

| Output                 | Kind   | Payload | Notes                                                                                                  |
| ---------------------- | ------ | ------- | ------------------------------------------------------------------------------------------------------ |
| `kjHotkeyTriggered`    | output | `KeyboardEvent` | Fires whenever the chord is detected (regardless of whether it actually toggled the palette). |

### Type aliases

```ts
export interface KjCommandActivateEvent {
  readonly value: unknown;
  readonly item: HTMLElement;
  readonly query: string;
}

export type KjCommandFilter = (
  query: string,
  haystacks: readonly string[],
) => number;
```

## Examples to ship

`@doc-example` groups in the directive's TSDoc:

1. **Basic dialog palette** (`command-palette.dialog.example.ts`):
   `<button kjButton [kjDialogTrigger]="palette">⌘K</button>` plus a
   `<ng-template #palette><div kjCommandPaletteDialog>…</div></ng-template>`
   with a `[kjCommandInput]`, a `[kjCommandList]`, and ten
   `[kjCommandItem]`s. Default theme. Demonstrates open + filter +
   activate + dismiss-on-activate + Escape clears-then-closes.
2. **Inline palette** (`command-palette.example.ts`): standalone
   `[kjCommandPalette]` without the dialog wrapper. Sat on a
   `/search` page-style example. No focus trap, no modal — just
   typeahead.
3. **With groups, labels, and separators** (`command-palette.groups.example.ts`):
   "Recent" group, separator, "Files" group, separator, "Settings"
   group. Demonstrates auto-hiding of empty groups and adjacent
   separators.
4. **Async / server-side filter** (`command-palette.async.example.ts`):
   `kjShouldFilter="false"` + `kjLoading` toggled via a debounced
   resource. Items rendered from a `signal()` of server results.
   Demonstrates the loading slot, the empty slot, and live-region
   announcements.
5. **Fuzzy filter** (`command-palette.fuzzy.example.ts`):
   `[kjFilter]="kjFuzzyFilter"` + `kjSortByScore="true"`. Demonstrates
   abbreviation matching (`gth` → `git checkout`).
6. **Hotkey** (`command-palette.hotkey.example.ts`): a global
   `[kjCommandPaletteHotkey]="palette"` on the app shell that opens
   the palette on Cmd-K from anywhere. Demonstrates the
   `kjHotkeyShouldHandle` predicate by allowing Cmd-K from inside a
   text input.
7. **Pinned + recently-used pattern** (`command-palette.recent.example.ts`):
   consumer-managed recent-commands store, a "Recent" group
   populated from a signal + a "Pinned" group with `kjPinned` items.
   Demonstrates the documented MRU pattern without any built-in
   state.
8. **Themed** (`command-palette.retro.example.ts`,
   `command-palette.finance.example.ts`): variant + size composition
   under retro and finance themes — mirrors the dropdown-menu doc
   structure.

## Open questions / risks

1. **`KjDialog` blockers.** `[kjCommandPaletteDialog]` depends on
   focus-trap + auto-focus + scroll-lock + body-mount paths in
   `KjDialog` that are flagged as gaps in
   [`actions/dialog.md`](./dialog.md) §Open questions #1, #2, #3, #4.
   None of these are new work, but the palette **blocks** on them
   for the modal use case. The standalone `[kjCommandPalette]`
   directive ships independently and isn't blocked.

2. **`KjDialog.kjAriaLabel` input.** `KjDialog` today derives
   `aria-labelledby` from `[kjDialogTitle]` and exposes no
   `aria-label` override. The palette wants `aria-label="Command
   palette"` on the dialog with no visible heading. Two options:
   (a) add `kjAriaLabel: input<string \| null>(null)` to `KjDialog`
   that, when set, overrides `aria-labelledby`. (b) The palette
   renders a hidden `[kjDialogTitle]` with `KjVisuallyHidden` and the
   palette's own label text inside it. Recommendation: **(a)** —
   it's a small primitive enhancement, useful for `KjAlertDialog`
   too. Tracked.

3. **Home / End disambiguation in the input.** `Home`/`End` are
   text-cursor keys when there's text in the input. The palette
   wants `Home`/`End` to mean "active item → first/last visible".
   Options:
   - (a) Always intercept (cmdk does this — feels wrong when typing
     a long query).
   - (b) Intercept only when text-cursor is at column 0 (Home) or
     end-of-text (End). Standard caret behaviour otherwise.
   - (c) Intercept with `Cmd+Home` / `Cmd+End` (or `Ctrl+`).
     Caret keys stay native.

   Recommendation: **(b)**. It's the least surprising. PageUp/Down
   always intercept (those have no native input meaning). Documented.

4. **Capture-phase click suppression on disabled — fourth instance.**
   `KjButton`, `KjMenuItem`, `KjSpeedDialAction`, and now
   `KjCommandItem` all need to swallow click events on disabled in
   the capture phase (matching the AAA disabled-button stance). At
   four consumers it's time to extract. Recommendation: ship a
   `KjDisabledClickGuard` standalone directive in
   `packages/core/src/a11y/` (or fold into `KjDisabled`). Not a
   blocker — the palette can copy the inline pattern for v1 and
   refactor in v1.1. Tracked.

5. **`kjHotkeyShouldHandle` predicate semantics.** Default behaviour
   for `mod+k`: fire even when the user is typing in another
   input? Linear, VS Code, and Slack all do — the chord is "global
   enough" that suppressing inside text inputs feels wrong (users
   can't open the palette from an editor otherwise). Decision:
   default predicate **does not** suppress inside text fields for
   `mod+k` chord; consumers can override for chords like `'/'`
   that *do* need suppression inside inputs. Documented behaviour.

6. **Diacritic stripping is locale-naive.** `'ß'` doesn't normalize
   to `'ss'` via NFD; Turkish dotless `ı` doesn't lowercase to `i`
   under default `toLowerCase()`. We accept this for v1 (the default
   filter is "good enough for English + Latin-script European
   languages"). Consumers needing Turkish-correct casing or German
   sharp-s expansion should plug a custom `kjFilter`. Documented.

7. **"Recent commands" not built-in.** Several reviewers will
   expect this. Decision: not in v1. The palette is opinion-light —
   recency, pinning, frequency-weighting all live in consumer state.
   The example #7 ships a documented pattern. Revisit in v1.1 only
   if a real consumer wants it baked in.

8. **`kjValue` defaulting to `textContent`.** When `kjValue` is
   unset, the activation event uses the item's `textContent`. This
   is convenient for prototype-y usage but produces unstable values
   if the item content is dynamic (e.g. localized). Documented:
   "set `kjValue` for any item whose visible text is dynamic or
   localized."

9. **`aria-selected` semantics.** Strictly per APG, a single-select
   listbox should have `aria-selected="true"` on the active option
   only. We follow this. But some AT (older NVDA, JAWS in browse
   mode) have historically been quirky with `aria-activedescendant`
   + `aria-selected` combinations on listboxes inside dialogs. We
   plan to test against the current NVDA / JAWS / VoiceOver matrix
   before declaring v1.

10. **Item registration via content children vs. signal-input
    array.** Two implementation paths: (a) items register with the
    palette via DI (`inject(KJ_COMMAND_PALETTE).registerItem(this)`
    in their `ngAfterViewInit`); (b) palette uses
    `contentChildren(KjCommandItem)` to discover them. Path (a) is
    more flexible (works through projection/wrappers) but harder to
    reason about. Path (b) is cleaner but breaks if a wrapper
    component sits between palette and items. Recommendation:
    **(a)** — DI-based registration. Matches the dropdown-menu's
    inferred shape and the existing `KjMenu` family. Tracked.

11. **`KjListboxNav` extraction.** The keyboard model
    (`aria-activedescendant`, ArrowUp/Down/Home/End/PageUp/Down,
    scroll-into-view) will be reused by Combobox and Autocomplete.
    Extract a primitive? Not yet — the palette is the first
    consumer, and we follow the dropdown-menu's "wait for the third
    consumer" rule (Speed Dial Open Question #7 / Dropdown Menu
    Open Question #11). Combobox is the second consumer; Autocomplete
    is the third. Extract when Autocomplete lands.

12. **Filter performance for very large palettes.** At 5,000+
    commands, the per-keystroke filter can stutter even with
    substring matching (DOM updates dominate). Decision: not a v1
    concern. The default palette pattern targets 50–500 commands.
    For larger sets, consumers should virtualize the list (a future
    `[kjVirtualScroll]` primitive — out of scope for v1) and / or
    use `kjShouldFilter="false"` with server-side search.

13. **Top-layer / `<dialog>` element.** Same call as `KjDialog` —
    not used. SSR + Safari maturity insufficient. Inherits the
    Dialog analysis's stance.

14. **Hover-activate accessibility.** `kjActivateOnHover=true`
    means the active item changes as the mouse moves over the list.
    For users with motor impairments, this can be jarring. The
    feature matches cmdk and Linear; we keep the default but
    document that consumers serving accessibility-first audiences
    should consider `kjActivateOnHover=false`. Mouse click still
    activates regardless.

15. **Dismissal of the palette while a command is async-in-flight.**
    A command activates ("Search GitHub"), the activation handler
    kicks off an async request, the user dismisses with Escape. The
    request continues. The palette doesn't track in-flight work;
    that's the consumer's concern (cancel via `AbortController`
    in their `(kjActivate)` handler). Documented.

16. **Empty-query behaviour.** Default: when query is empty, all
    items are visible (substring filter returns score 1 for empty
    query — see the filter signature). Some teams want "show the
    Recent group only on empty query". That's a consumer concern:
    they conditionally render groups based on `kjQuery()` from a
    `KJ_COMMAND_PALETTE` injection. The palette doesn't ship a
    "default view" mode. Documented.

17. **Multi-select / checkable items.** Out of scope for v1.
    Command palettes are activation surfaces, not selection
    surfaces. If a future consumer needs multi-select inside a
    palette-shaped UI, they should compose a `KjListbox` (a
    distinct primitive — not analyzed yet) inside a `KjDialog`,
    not retrofit checkable state onto `[kjCommandItem]`.

18. **Auto-id collisions across palettes on a page.** Item ids are
    generated via a module-level counter (`kj-command-item-{n}`).
    Same approach as `KjMenu`. Counter resets per module load; ids
    only need stability per DOM. No action; documented.
