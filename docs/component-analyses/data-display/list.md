# List

A vertical (or horizontal) collection of homogeneous items rendered in
flow. The canonical use cases are: contact lists, settings groups,
key-value stat blocks, sidebar navigation, the "messages" rail in a
chat shell, the rows of a notification centre. The defining property
is **structural homogeneity** — every row is the same kind of thing,
the rows form a set, and the set deserves a single accessible name.
Visually it is the lightest possible container: stacked items,
optional dividers, optional hover highlight, optional
selection/active chrome on a row.

> **Not yet on disk.** No `packages/core/src/list/`, no
> `packages/components/src/list/`. This is a greenfield design. The
> roadmap entry slots List into `data-display`, alongside Card and
> the avatar family.

A List is **not** any of the following — and the discipline of this
component is keeping those neighbours out:

- **Listbox / Select children** — option semantics, single source of
  truth on a parent form control, `role="listbox"` /
  `role="option"`, `aria-selected`, value model. Owned by
  [`../data-input/select.md`](../data-input/select.md) (and
  [`../data-input/multi-select.md`](../data-input/multi-select.md)).
  The selectable-list pattern in this library is **not** a List
  flavour — it's the headless listbox primitive that already lives
  inside Select and Multi-select. List does **not** ship a "selectable"
  mode; consumers who want one are reaching for Listbox / Multi-select
  with custom rendering.
- **Menu / Dropdown menu** — items are commands (verbs), not data;
  `role="menu"` / `role="menuitem"`; activation closes the menu;
  arrow-key navigation; first-letter typeahead. Owned by
  [`../actions/dropdown-menu.md`](../actions/dropdown-menu.md) and
  [`../actions/context-menu.md`](../actions/context-menu.md). If your
  rows are "do this thing now", you want Menu, not List.
- **Tabs** — exactly-one-of selection driving a panel switch; owned
  by [`../navigation/tabs.md`](../navigation/tabs.md).
- **Accordion** — disclosure pattern (each row toggles a body); owned
  by [`./accordion.md`](./accordion.md).
- **Table** — when the rows have *columns* (cells with independent
  meaning) and the consumer benefits from `<th>` / `<td>` semantics,
  reach for Table. List rows are uni-cellular — a row is *one* unit
  of meaning, possibly with secondary text or trailing metadata, but
  it is read as one announcement.
- **Card grid** — when rows become substantive enough to deserve
  individual chrome (border, shadow, internal layout), the consumer
  is composing a Card list, not a List. We do **not** ship a
  "card list" component; `<kj-list>` of `<kj-card>` works without
  ceremony.

For the **list of bubbles** in a chat shell, see
[`./chat-bubble.md`](./chat-bubble.md): a chat surface is a List
(`<kj-list>`) of bubbles where each bubble is the row content. The
roadmap also points the messages rail at this component. List is the
container; Chat Bubble is the per-row visual.

## Source comparison

| Concern | PrimeNG | Angular Material `mat-list` family | shadcn/ui | daisyUI `list` |
|---|---|---|---|---|
| Primary surface | **No first-class generic List.** `<p-listbox>` is the selectable variant — option-shaped, owns a value model. PrimeNG has no `<p-list>` for plain rendering. | Four sibling components: `<mat-list>` (display), `<mat-nav-list>` (navigation links), `<mat-action-list>` (button rows), `<mat-selection-list>` (multi-select with checkboxes). All re-use `<mat-list-item>` for rows. | **No first-class List.** Community recipes layer Tailwind `divide-y` / `space-y-*` over a `<ul>`. | One component family: `.list` on the container plus `.list-row`, `.list-col-grow`, `.list-col-wrap` modifier classes. CSS-only — no a11y, no JS. |
| Item template | n/a | `<mat-list-item>` projects four named slots: `matListItemTitle`, `matListItemLine`, `matListItemAvatar`, `matListItemIcon`, `matListItemMeta`. | n/a | Free-form `<li class="list-row">`. |
| Roles | n/a (Listbox is `role="listbox"` + `role="option"`) | Display: `role="list"` + `role="listitem"`. Nav: `<nav>` + `<ul>` + `<li>` + `<a>` (no list role — the implicit `<ul>` is enough). Action: `role="list"` + each row is a `<button>`. Selection: `role="listbox"` + `role="option"` + `aria-selected`. | n/a | None — pure CSS. |
| Keyboard | Listbox: full `aria-activedescendant` / arrow / Home / End / typeahead. | **None on display lists.** Nav-list inherits Tab between links. Action-list inherits Tab between buttons. Selection-list ships `Up`/`Down`/`Space`/`Home`/`End` via internal `FocusKeyManager`. | n/a | None. |
| Selection | Listbox owns it. | Selection-list owns it (multi by default; single via `[multiple]="false"`). Each row renders a leading checkbox. | n/a | None. |
| Dividers | n/a | `<mat-divider>` projected between items, or `[matListItemDisabled]` chrome. | n/a | `border-base-content/5 border-b` utility on `.list-row`. |
| Densities | n/a | `[dense]` input on `<mat-list>` (deprecated; replaced by Material density tokens). | n/a | `list-sm`, `list-md`, `list-lg` modifiers. |
| Avatar / icon slots | n/a | Built-in projection slots (named above). | n/a | Free-form. |
| Form-control integration | n/a | Selection-list implements `ControlValueAccessor`. | n/a | None. |

**Read-off.**

- **PrimeNG** has no answer for a plain List. Its selectable-list
  needs are met by `<p-listbox>` (which we already cover via
  `KjSelect` / `KjMultiSelect` headless internals). The fact that
  PrimeNG ships *only* a Listbox tells us the generic-List slot is
  small enough that some libraries skip it entirely.
- **Angular Material** has the **most ambitious** decomposition:
  four sibling components, one shared row component, four ARIA
  contracts, four keyboard contracts. It is the maximalist take.
  The cost is real — a consumer must pick the right component
  *before* writing a row, and switching from "display list" to
  "selection list" is a template-class change, not an attribute
  flip. This is the **mistake** we want to avoid (mirrors the
  PrimeNG `<p-tag>` vs. `<p-chip>` split, see [`./tag.md`](./tag.md)).
- **shadcn** signals correctly that the basic case ("a `<ul>` with
  some divider styling") doesn't deserve a primitive. We agree on
  the visual layer but disagree on the headless layer: there is a
  small cluster of cross-element rules (single accessible name on
  the container, role pairing, optional roving) that *is* worth
  centralising — even if 80% of consumers never touch them.
- **daisyUI** is CSS-only. Nice for prototyping; useless for a11y
  beyond `<ul>` / `<li>` defaults. We can borrow the modifier-class
  *aesthetics* (rows, growable columns, wrap helpers) without
  inheriting the lack of semantics.

## Decision (core directive): yes — but small, and exactly one List

**Ship a single basic semantic List.** `KjList` (root, owns the
container ARIA / orientation / divider data attribute) plus
`KjListItem` (row, owns per-row ARIA + an optional active/disabled
state). That is the entire core surface. Selectable-list and
selection-list patterns are **not** List flavours — they are
[`../data-input/select.md`](../data-input/select.md) and
[`../data-input/multi-select.md`](../data-input/multi-select.md). The
"action list" pattern (rows that navigate / fire commands) is
**composition**: `<kj-list>` of `<kj-list-item>` containing a
projected `<a kjLink>` or `<button kjButton>`. We do **not** wrap that
into a separate component.

### Why a directive at all (the pro side)

1. **Single accessible name.** A list with no container ARIA is
   announced as N independent items, not as a labelled set. Modern
   screen readers do flatten implicit `<ul><li>` semantics (see
   `1.3.1` analysis below), but `aria-label` / `aria-labelledby` on
   the container is the only way to tell the user *what* set this is
   ("Recent contacts", "Settings", "Today's notifications"). The
   directive owns this binding so consumers do not forget it.
2. **Role pairing.** `role="list"` and `role="listitem"` must travel
   together; one without the other defeats the announcement. When a
   consumer renders the list as `<div>` / `<div>` (e.g. because they
   need flex layout that `<li>` complicates), they need both halves
   wired automatically. A pair of directives gets this right by
   construction.
3. **Orientation.** A horizontal list (avatar rail, story rail,
   chip-as-row strip when not interactive) needs
   `aria-orientation="horizontal"` to inform AT, and benefits from a
   data attribute the wrapper CSS can hang flex-direction off.
4. **Active row chrome.** The "currently selected page" row in a
   sidebar nav, the "now playing" row in a media list — that is a
   `data-active=""` attribute the consumer toggles, plus
   `aria-current="page"` (or whichever token applies) on the
   embedded link. The directive does not own the activeness *value*
   (consumers route that off the URL or some signal), but it *does*
   own the data-attribute discipline so themes can paint a
   consistent selected row.
5. **Divider / hover discipline.** Whether a list is divided
   (between-row borders) and whether rows highlight on hover are
   theme-level concerns that the wrapper CSS reads off `data-*`
   attributes the directive sets. Centralising removes the per-row
   class-name plumbing.
6. **Roving tabindex (opt-in).** Some lists *are* keyboard composites
   — the sidebar nav-list with `Up` / `Down` arrow navigation between
   page links is the textbook case. We expose `kjArrowNavigation` as
   an opt-in flag that wires `KjRovingTabindex` exactly the way
   Accordion does (see [`./accordion.md`](./accordion.md), Decision
   section). The roving primitive is shared; List does not implement
   keyboard plumbing of its own.

### Why not several flavours (the con side)

1. **Material's four-component spread is over-engineered.** Each
   flavour ships its own template, its own examples, its own tests,
   its own footprint. Most projects use one or two of them and pay
   the bundle cost for all four. Worse, switching flavours mid-design
   ("we want these settings rows clickable now") forces a template
   refactor, not an attribute flip. We refuse this trade.
2. **The selectable-list pattern is already covered.** Multi-select
   trigger menus, Select option lists, even the Filter chips story
   in [`./tag.md`](./tag.md) all consume the same headless
   listbox primitive (when it exists; today the role wiring is
   inside `KjSelect` / `KjMultiSelect`). Cloning that primitive into
   a sibling List flavour would be a parallel implementation with
   the same a11y contract — a maintenance trap. **Defer all
   selection semantics** to those components and document it
   loudly here.
3. **The action-list pattern is just composition.** A list of
   clickable rows is `<kj-list-item>` projecting a `<a kjLink>` (or
   `<button kjButton>`). The clickable element, not the list, owns
   the focus stop, the keyboard contract, the disabled story, and
   the routing. The List is just rendering. There is nothing for
   `KjActionList` to *do*.
4. **Compound shapes belong to consumers.** "List with checkboxes"
   is `<kj-list><kj-list-item><kj-checkbox>...</kj-checkbox>` —
   that's not a flavour, that's the headless idea working as
   intended. The day a real consumer says "I keep writing this and
   want a shorthand", we revisit. Today, no such pressure exists.

### Why not zero directives (the lower-bound)

A pure CSS solution (`<ul class="kj-list">`) is appealing — every
browser ships `<ul>` / `<li>` for free, the basic case is one
tag-and-class away. We reject it for one reason: **the wrapper
component still needs to enforce the labelling discipline** (a
container with no `aria-label` and no `aria-labelledby` is a sin
that the wrapper must surface as a runtime warning) and the
**orientation / divider / roving inputs need a host to live on**.
That host is a directive. We could collapse it to a single
`KjList` and make `<li>` the row (no `KjListItem`), but the
consumer would then have to render `<li role="listitem">` themselves
when their list isn't a `<ul>` (flex layouts, virtualised lists).
Two directives, one for each role, costs almost nothing and gives
us composition.

### Final shape

```
KjList            (selector: [kjList])
  └── provides KJ_LIST { orientation, divided, hoverable, registerItem, items }
KjListItem        (selector: [kjListItem])
  └── injects KJ_LIST; host-binds role/data-active/data-disabled; auto-registers
```

That is the entire core. No third directive for the action wrapper,
no fourth directive for the selection state. **The list-row has no
keyboard contract of its own** — keyboard reachability is a
property of the *focusable child* the consumer projects (a link, a
button, a checkbox). When the consumer wants list-level arrow nav
(sidebar nav-list), they opt in with `kjArrowNavigation` on the
root, which wraps `KjRovingTabindex` around the *projected
focusable children of items*, not the items themselves. Mirrors the
Accordion arrow-nav decision exactly.

## What exists today

Nothing on disk for List. Cross-references from neighbouring
components:

- [`./chat-bubble.md`](./chat-bubble.md) (when written) will need
  `KjList` as the bubble rail container — the bubble is one row,
  the rail is `<kj-list orientation="vertical" [aria-labelledby]="…">`.
- [`./card.md`](./card.md) (if written) will document `<kj-list>` of
  `<kj-card>` as the canonical "card collection" shape; no separate
  card-grid component is needed.
- [`../navigation/sidebar.md`](../navigation/sidebar.md) (when
  written) — the rail of nav links is `<kj-list arrowNavigation>`
  containing `<kj-list-item>` of `<a kjLink>`.

## Base features

| Feature | Where it lives | Notes |
|---|---|---|
| Container role | `KjList` host-binds `role="list"` (auto-omitted when host element is `<ul>` or `<ol>`) | A `<ul>` / `<ol>` already announces as a list; emitting `role="list"` on it is redundant. The directive sniffs `tagName` once at construction and omits the binding when the implicit role would be the same. Mirrors how `KjMenu` handles `<menu>` (where applicable). |
| Item role | `KjListItem` host-binds `role="listitem"` (auto-omitted when host element is `<li>`) | Same logic. |
| Orientation | `kjListOrientation: 'vertical' \| 'horizontal'` (default `'vertical'`) | Drives `aria-orientation` on the root + `data-orientation` mirror for CSS. |
| Divided rows | `kjListDivided: boolean` (default `false`) | Drives `data-divided=""` on the root; the wrapper CSS draws between-row borders via a `:not(:last-child)` rule on `KjListItem`. No JS required. |
| Hoverable rows | `kjListHoverable: boolean` (default `false`) | Drives `data-hoverable=""` on the root; CSS reads it to apply `:hover` chrome. Off by default because purely informational lists (stat blocks) should not hint at interactivity. |
| Per-row active | `kjListItemActive: boolean` (default `false`) | Drives `data-active=""` on the item host. The consumer also sets `aria-current` on the projected link/button when applicable — the directive does not infer that, because the right token (`'page'`, `'step'`, `'true'`, `'date'`) depends on the consumer's domain. |
| Per-row disabled | `kjListItemDisabled: boolean` (default `false`) | Drives `data-disabled=""` on the item host **and** dims any projected interactive child via CSS. Does **not** disable the projected child's keyboard reachability — that responsibility belongs to the projected `KjButton` / `KjLink`, which composes `KjDisabled` itself. The list item only owns the visual + the data attribute. |
| Roving tabindex (opt-in) | `kjArrowNavigation: boolean` (default `false`) | When `true`, wraps `KjRovingTabindex` around the projected focusable children of items. Same axis-aware behaviour as Accordion's arrow-nav (see [`./accordion.md`](./accordion.md), Q9). Off by default because a non-keyboard List is the common case. |
| Sizes | `KjSize` host-composed on the wrapper | Standard `xs / sm / md / lg / xl` mapping. Drives row min-height, padding, gap. The `xs` size lives at the lower bound of WCAG 2.5.5 — see Accessibility. |
| Variants | `KjVariant` host-composed on the wrapper | Mostly a chrome knob: `default`, `bordered` (outer ring + rounded corners), `flat` (no chrome). |
| Empty state | wrapper-only `[empty]` template input | When the list has zero items, the wrapper renders the `[empty]` template instead. Directive layer treats this as "register zero items" and stays neutral; the empty-state UX is a wrapper convenience. |
| Loading state | **Out of scope.** | A "loading list" is a Skeleton concern (see [`../feedback/skeleton.md`](../feedback/skeleton.md), when written). Consumers conditional-render skeleton rows or a skeleton list block. We will not bake `[loading]` into List. |

## Accessibility (WCAG 2.1 AAA)

References:

- [WAI-ARIA 1.2 — `list` role](https://www.w3.org/TR/wai-aria-1.2/#list)
  and `listitem` role.
- [WAI-ARIA APG — Listbox
  Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) —
  **explicitly out of scope** for this component; cross-link only.
- [HTML spec — `<ul>` /
  `<ol>` / `<li>`](https://html.spec.whatwg.org/multipage/grouping-content.html#the-ul-element).

### Per-criterion checklist

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.3.1 Info & Relationships | The set is announced as a list with a known item count and a known group name | `role="list"` + `role="listitem"` paired (or implicit via `<ul>` / `<li>`); `aria-label` or `aria-labelledby` on the root. **Wrapper enforces the labelling rule with a dev-mode `console.warn`** when neither is set — we do not throw, because anonymous lists are valid in a few cases (visual-only lists in a card already labelled by its title). |
| 1.3.2 Meaningful Sequence | Rows are announced in document order | Inherent — flow rendering, no virtual reorder. |
| 1.4.3 Contrast (AA) / 1.4.6 Contrast (AAA) | Row text and divider rules meet 7:1 | Theme tokens. The `data-divided` rule must use `var(--kj-color-border-strong)` (≥ 3:1 against background per `1.4.11`). |
| 1.4.11 Non-text Contrast | Active-row indicator (the chrome that says "this row is selected") ≥ 3:1 | Theme tokens. The active indicator is **not** colour-only — at minimum a left border or a background token shift, both with sufficient contrast. Mirrors how `KjTabs` paints the active tab. |
| 2.1.1 Keyboard | Every interactive descendant reachable | Inherent: the projected `KjButton` / `KjLink` / `KjCheckbox` is the focus stop. List does not consume keyboard events unless `kjArrowNavigation` is enabled. |
| 2.1.2 No Keyboard Trap | Tab leaves the list when no further focusable descendants | Inherent. Roving tabindex (when enabled) collapses the group to a single tab stop; Tab still moves out. |
| 2.4.3 Focus Order | List items are tabbed in document order | Inherent. |
| 2.4.4 Link Purpose / 2.4.9 Link Purpose (AAA) | Links inside nav-list rows have purpose-clear text or `aria-label` | Consumer-owned (the projected `<a kjLink>` ships its own a11y story). |
| 2.4.7 Focus Visible | Focused row's projected child shows a focus ring | Inherent — projected `KjButton` / `KjLink` composes `KjFocusRing`. The list item itself is **not focusable** and has no ring. |
| 2.4.8 Location (AAA) | When the list is a navigation menu, the current page is identified | The consumer sets `aria-current="page"` on the active link. The list item only mirrors this with `data-active`; the AT-readable signal is `aria-current`. |
| 2.5.5 Target Size (AAA) | Each interactive row ≥ 44×44 CSS px | Wrapper enforces a `min-height` of `44px` on `<kj-list-item>` at every size *except* `xs`. The `xs` size is reserved for dense settings-list / metadata-grid use cases that fall under 2.5.8 (24×24 minimum, AA — not AAA). Document the trade-off in the wrapper TSDoc; recommend `xs` only for non-interactive lists. |
| 4.1.2 Name, Role, Value | Group is `list`; rows are `listitem`; activeness via `aria-current` on the link | Wired at the directive layer. |
| 4.1.3 Status Messages | A row added / removed in real time announces politely | **Not by default.** Adding a row to a static list does not need announcement; doing it for a notification-list / chat-shell list does. Consumers wire `KjLiveRegion` (already shipped, see `packages/core/src/a11y/live-region.ts`) when needed. List does not auto-announce because the policy is consumer-domain. |

### Keyboard contract

There **is no** List-level keyboard contract by default. The List is
a container; the focus stops live on the projected interactive
children.

When `kjArrowNavigation` is enabled (the sidebar-nav-list case), the
contract becomes:

| Key | Behaviour | Required by APG? |
|---|---|---|
| `Tab` / `Shift+Tab` | Enter / leave the list group at the active item; subsequent `Tab` exits the list | Required for composite widgets |
| `ArrowDown` / `ArrowUp` (vertical) | Move focus to the next / previous list-row's focusable child (with wrap, configurable) | Standard |
| `ArrowRight` / `ArrowLeft` (horizontal) | Move focus to the next / previous list-row's focusable child (when `kjListOrientation === 'horizontal'`) | Standard |
| `Home` / `End` | First / last list-row's focusable child | Standard |

We **do not** ship typeahead at the List level. Typeahead is a
Listbox / Menu pattern (the user is searching among options), not a
List pattern (the user is reading a stable rendering). When a
consumer needs typeahead they are reaching for Multi-select or
Combobox.

### Native-element discipline

When the consumer renders the list as `<ul>` / `<li>`, the directive
omits its `role` host bindings (would be redundant) and lets the
implicit roles do the work. When the consumer renders the list as
`<div>` / `<div>` (necessary for some flex / virtualised layouts),
the directive emits `role="list"` and `role="listitem"`. **There is
a known Safari quirk**: applying CSS `list-style: none` to a `<ul>`
strips the implicit `role="list"` (per WebKit's "list voice"
heuristic) — see the
[Scott O'Hara writeup](https://www.scottohara.me/blog/2019/01/12/lists-and-safari.html).
The wrapper CSS uses `list-style: none` for chrome, so when the host
is a `<ul>` we **also** emit `role="list"` to defeat the heuristic.
This is the rare case where a redundant ARIA binding is correct.

### Active row vs. selected row

A row's "active" state is a **navigation** signal (this is the
current page / step / view), not a **selection** signal. The
distinction matters for ARIA:

| Concept | Token | Used in |
|---|---|---|
| Active (current location) | `aria-current="page"` (or `step`, `date`, `true`) | nav-list rows. The token sits on the projected `<a kjLink>`, not the list-item host. |
| Selected (chosen for an action) | `aria-selected="true"` | listbox / option pattern only — **not in scope for List**. |
| Pressed (toggled state) | `aria-pressed="true"` | toggle-button rows. The token sits on the projected `<button kjButton>` or `<button kjToggle>`, not the list-item host. |

The list-item directive only paints a `data-active=""` attribute
that themes use to highlight the row. It does **not** infer the
ARIA token from `kjListItemActive` because the right token depends
on the consumer's domain. Document this explicitly in the wrapper
TSDoc with examples.

## Composition model

```
KjList               (provides KJ_LIST)
  └── KjListItem     (injects KJ_LIST; registers itself; provides KJ_LIST_ITEM for descendants)
```

Two directives, one injection token at the root, one helper token at
the item. The item's token is exposed only because:

1. A descendant `KjLink` / `KjButton` / `KjCheckbox` may want to
   read its parent item's `disabled` signal to mirror it (e.g. an
   icon button inside a disabled row should not be a focus stop).
2. The future "row-level checkbox" pattern (when a real consumer
   demands it) wants to read its parent's `active` / `disabled` so
   the wrapper template can render once-and-for-all.

We keep the surface minimal — three properties on `KJ_LIST_ITEM`
(`active`, `disabled`, `index`), nothing else.

### Reused primitives

| Primitive | Where | Why |
|---|---|---|
| `KjVariant` | `hostDirectives` on the `KjListComponent` wrapper | Standard variant token routing for the chrome (`default`, `bordered`, `flat`). |
| `KjSize` | `hostDirectives` on the `KjListComponent` wrapper | Standard size token routing for row density. |
| `KjRovingTabindex` + `KjRovingTabindexItem` | Conditionally applied when `kjArrowNavigation === true` | Reused identically to Accordion's opt-in arrow-nav (see [`./accordion.md`](./accordion.md), Decision section). The `KjRovingTabindexItem` is applied by the **wrapper** to the *projected focusable child* of `<kj-list-item>` (the `<a>` / `<button>`), not to the item host. The wrapper handles this with a content-query + `Renderer2.setAttribute` pass during `afterRenderEffect`. See Q3. |
| `KjFocusRing` | **Not composed by List itself.** Composed by the projected `KjButton` / `KjLink`. | The list-item host is not a focus stop. There is no ring to draw on it. |
| `KjDisabled` | **Not composed by List itself.** Composed by the projected `KjButton` / `KjLink`. The list-item only paints `data-disabled` for theming. | Same reason — the list-item is not interactive. |
| `KjLink` | **Composed inside list rows by consumers**, not by List. | The "nav-list row" pattern is `<kj-list-item><a kjLink kjLinkActive>...</a></kj-list-item>`. List does not pre-template a link; it stays neutral. |

### Wrapper composition (components package)

`<kj-list>` applies `KjList` via `hostDirectives` and re-maps inputs:
`orientation`, `divided`, `hoverable`, `arrowNavigation`,
`ariaLabel` (alias for the standard `aria-label` host attribute,
exposed as a typed input so TS catches missing labels under the
strict-template rule). `<kj-list-item>` applies `KjListItem` via
`hostDirectives` and re-maps `active`, `disabled`. Neither wrapper
forces the host element — both default to `<ul>` / `<li>` (for the
free implicit semantics) but expose an `as` input the consumer can
flip to `'div'` when flex/virtualised layouts demand it.

```ts
@Component({
  selector: 'kj-list',
  template: `<ng-content />`,
  hostDirectives: [
    { directive: KjList, inputs: [
      'kjListOrientation: orientation',
      'kjListDivided: divided',
      'kjListHoverable: hoverable',
      'kjArrowNavigation: arrowNavigation',
    ]},
    { directive: KjVariant, inputs: ['kjVariant: variant'] },
    { directive: KjSize, inputs: ['kjSize: size'] },
  ],
  host: {
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-labelledby]': 'ariaLabelledby() || null',
  },
})
```

### Cross-component pointers

- [`../data-input/select.md`](../data-input/select.md) — owns the
  selectable-list pattern (`role="listbox"` + `role="option"`,
  single source of truth on the trigger). When you need a
  user-pickable list, that's where to look. **Do not** add
  selection to `KjList`.
- [`../data-input/multi-select.md`](../data-input/multi-select.md) —
  same for the multi-select case (chips inside a trigger,
  multi-selectable listbox). Cross-link explicitly: a "list with
  checkboxes" composed of `<kj-list-item><kj-checkbox>` is *not*
  a multi-select; it's a settings UI. The two patterns differ in
  whether there's a single value model.
- [`../actions/dropdown-menu.md`](../actions/dropdown-menu.md) —
  owns the command-list pattern (`role="menu"` + `role="menuitem"`).
  When rows are verbs that fire and dismiss, it's a Menu.
- [`./chat-bubble.md`](./chat-bubble.md) — Chat Bubble is the row,
  `KjList` is the rail. The chat shell renders `<kj-list
  orientation="vertical" [arrowNavigation]="false"
  [aria-label]="'Conversation with ' + peer">` and projects bubbles
  as items. Chat-rail-specific affordances (auto-scroll-to-bottom,
  paged history loading) live in the Chat shell, not in List.
- [`./card.md`](./card.md) — `<kj-list>` of `<kj-card>` is the
  canonical card-collection shape. No separate card-grid component.
- [`../actions/button.md`](../actions/button.md) — projected as the
  interactive child of an action-list row.
- [`../navigation/breadcrumb.md`](../navigation/breadcrumb.md) (when
  written) — breadcrumb is a *horizontal nav-list*; consider
  whether to compose `<kj-list orientation="horizontal">` or ship a
  separate `<kj-breadcrumb>` for the chevron-separator chrome and
  the `aria-label="Breadcrumb"` discipline. **Recommendation:**
  separate component, composes `KjList` internally, because the
  separator semantics (`aria-hidden` chevrons interleaved between
  items) are not a List concern.
- [`./accordion.md`](./accordion.md) — direct precedent for the
  opt-in `kjArrowNavigation` pattern. Mirror the implementation
  exactly: always-applied roving primitive that no-ops when the
  flag is off.

## Inputs / Outputs / Models

All public bindings are `kj`-prefixed at the directive layer; the
wrapper re-maps to terse names.

### `KjList` (`[kjList]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjListOrientation` | `input` | `'vertical' \| 'horizontal'` | `'vertical'` | Drives `aria-orientation` and `data-orientation`. |
| `kjListDivided` | `input` | `boolean` | `false` | Drives `data-divided=""`. CSS-only effect. |
| `kjListHoverable` | `input` | `boolean` | `false` | Drives `data-hoverable=""`. CSS-only effect. |
| `kjArrowNavigation` | `input` | `boolean` | `false` | When `true`, the wrapper wires `KjRovingTabindexItem` to the projected focusable child of each `<kj-list-item>` and applies `KjRovingTabindex` to the root. Same opt-in pattern as Accordion. |
| `kjListWrap` | `input` | `boolean` | `true` | Whether arrow-nav wraps at ends. Forwarded to `KjRovingTabindex`. Only meaningful when `kjArrowNavigation` is true. |
| `items` | `Signal<readonly KjListItem[]>` | — | — | Public read-only registry of items, populated by `contentChildren(KjListItem)`. Consumers can `effect()` over it for analytics or item-count announcements. |

No outputs. The list is a presentation layer; events come from the
projected interactive children.

### `KjListItem` (`[kjListItem]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjListItemActive` | `input` | `boolean` | `false` | Drives `data-active=""` host attribute. |
| `kjListItemDisabled` | `input` | `boolean` | `false` | Drives `data-disabled=""` host attribute and dims projected interactive child via CSS (`[data-disabled] :where(a, button) { ... }`). Does **not** wire `aria-disabled` on the projected child — that's the projected child's responsibility (via `KjDisabled`). |
| `index` | `Signal<number>` | — | — | Computed from the parent's `items()` signal; the item's position in registration order. Useful for "row N of M" live-region announcements. |
| `active` | `Signal<boolean>` | — | — | Mirrors `kjListItemActive`. Exposed on `KJ_LIST_ITEM` for descendant directives. |
| `disabled` | `Signal<boolean>` | — | — | Mirrors `kjListItemDisabled`. Exposed on `KJ_LIST_ITEM`. |

| Host binding | Source |
|---|---|
| `[attr.role]` | `'listitem'` (omitted when host is `<li>`) |
| `[attr.data-active]` | `kjListItemActive() ? '' : null` |
| `[attr.data-disabled]` | `kjListItemDisabled() ? '' : null` |
| `[attr.data-index]` | `index()` (informational; lets CSS apply `:nth-child`-style rules without relying on DOM position) |

No outputs.

### Wrapper inputs (components package)

| Element | Input | Maps to |
|---|---|---|
| `<kj-list>` | `orientation` | `KjList.kjListOrientation` |
| `<kj-list>` | `divided` | `KjList.kjListDivided` |
| `<kj-list>` | `hoverable` | `KjList.kjListHoverable` |
| `<kj-list>` | `arrowNavigation` | `KjList.kjArrowNavigation` |
| `<kj-list>` | `wrap` | `KjList.kjListWrap` |
| `<kj-list>` | `as` | wrapper-only — `'ul' \| 'ol' \| 'div' \| 'nav'` (default `'ul'`); picks host element |
| `<kj-list>` | `ariaLabel` | wrapper-only — host-binds `aria-label`; **dev-mode warn when neither `ariaLabel` nor `ariaLabelledby` is set** |
| `<kj-list>` | `ariaLabelledby` | wrapper-only |
| `<kj-list>` | `variant` | `KjVariant` |
| `<kj-list>` | `size` | `KjSize` |
| `<kj-list>` | `[empty]` | template input — rendered when `items().length === 0` |
| `<kj-list-item>` | `active` | `KjListItem.kjListItemActive` |
| `<kj-list-item>` | `disabled` | `KjListItem.kjListItemDisabled` |
| `<kj-list-item>` | `as` | wrapper-only — `'li' \| 'div'` (default `'li'`) |

The `as` input is a small but real ergonomic win: in 90% of cases
the consumer wants `<ul>` / `<li>` and gets it for free; in 10% they
want `<div>` / `<div>` and need to flip a single attribute, not
re-template their consumer code.

## Examples to ship

1. **Basic vertical list** (`list.example.ts`) — five static rows
   inside a card, `<kj-list ariaLabel="Recent files">`. Anchors the
   default chrome.
2. **Divided + hoverable** (`list.divided.example.ts`) — toggles
   `divided` and `hoverable` to demonstrate the chrome combinations.
3. **Horizontal rail** (`list.horizontal.example.ts`) — story rail
   of avatars; `<kj-list orientation="horizontal">` of
   `<kj-list-item>` projecting `<kj-avatar>`. Demonstrates
   `aria-orientation` + flex layout.
4. **Nav list with active row** (`list.nav.example.ts`) —
   `<kj-list as="nav" arrowNavigation ariaLabel="Primary">` of
   `<kj-list-item active="true">` containing `<a kjLink
   kjLinkActive="true" aria-current="page">`. Demonstrates the
   active-vs-selected discipline and the opt-in roving.
5. **Action list (clickable rows)** (`list.action.example.ts`) —
   rows containing `<button kjButton variant="ghost">`; demonstrates
   that the row inherits its keyboard from the projected button and
   the list is just rendering.
6. **Settings list with controls** (`list.settings.example.ts`) —
   rows with leading icon, two-line text, trailing
   `<kj-toggle>`. Demonstrates that the list-row is a layout slot
   and not a focus stop; Tab goes from toggle to toggle, skipping
   the row chrome.
7. **List of cards** (`list.cards.example.ts`) — `<kj-list>` of
   `<kj-card>`; pins the cross-component story documented in
   [`./card.md`](./card.md).
8. **List of chat bubbles** (`list.chat.example.ts`) — anchors the
   forward reference in [`./chat-bubble.md`](./chat-bubble.md).
9. **Disabled row** (`list.disabled.example.ts`) — projected
   `<button>` is disabled (via `KjDisabled`) and the row is dimmed
   via `data-disabled`. Confirms the two-layer disabled story.
10. **Empty state** (`list.empty.example.ts`) — passes `[empty]`
    template; demonstrates the wrapper's empty-render behaviour.
11. **Themed (core-only)** — `list.example.ts`,
    `list.retro.example.ts`, `list.finance.example.ts` under
    `packages/core/`. Confirms the headless directives work under
    arbitrary theme CSS.

## Open questions / risks

1. **Where does roving tabindex *attach* when the focus stop is a
   projected child, not the item itself?** `KjRovingTabindexItem`
   today applies to the host of whatever element it's on (see
   `packages/core/src/a11y/roving-tabindex.ts`). For Accordion the
   trigger *is* the focus stop, so the directive is applied
   directly. For List, the focus stop is *inside* the
   `<kj-list-item>` (a projected `<a>` or `<button>`), so the
   wrapper needs to forward `KjRovingTabindexItem` to the projected
   child. Three options:
   - **(a) Wrapper-side projection.** The wrapper does a
     `contentChildren()` on its `<ng-content>` to find the
     focusable child and applies `KjRovingTabindexItem` via a
     `Renderer2` attribute write. Brittle: requires a heuristic
     ("first descendant matching `[tabindex],a,button`") and
     misbehaves for nested controls.
   - **(b) Explicit selector marker.** Consumer adds a
     `kjListItemFocus` attribute to the focusable child, and the
     wrapper queries for that. Slightly more typing but
     deterministic.
   - **(c) Reverse the direction.** `KjRovingTabindexItem` is
     applied to the `<kj-list-item>` host (which is not focusable)
     and *delegates* the focus to its first focusable descendant on
     activation. Requires extending `KjRovingTabindexItem` with a
     `delegateTo` mode.
   - **Recommendation:** **(b)** — a `kjListItemFocus` marker on
     the projected child. Cheap, deterministic, and the consumer
     already understands they are projecting a focus stop. Document
     prominently in the nav-list example. Revisit if pain emerges.

2. **`<ul>` / `<ol>` vs. `<div>` host element default.** Material
   uses `<div>` as the default and adds the role; daisyUI uses
   `<ul>`. The argument for `<ul>`: free implicit semantics, no role
   binding needed. The argument for `<div>`: flex-direction works
   uniformly without resetting `<ul>`'s default `padding-inline-start`,
   `list-style`, `margin-block`. **Decision:** default to `<ul>`
   (the wrapper resets the user-agent margins / padding /
   list-style in a single CSS rule), expose `as="div"` as the
   escape hatch for layouts that fight `<ul>` defaults. The wrapper
   CSS lives in one place; the `<ul>`-flattening rule is one line.
   Mirror the same default for `<kj-list-item>` ↔ `<li>`.

3. **Safari `list-style: none` defeats the implicit `role="list"`.**
   Already noted in the Native-element discipline section. **Plan:**
   when host element is `<ul>` *and* the wrapper's CSS applies
   `list-style: none`, emit `role="list"` anyway. Same for
   `<ol>`. The directive can sniff the computed style at
   `afterNextRender()`, but cheaper to *always* emit `role="list"`
   on `<ul>`/`<ol>` and document the redundancy as deliberate.
   **Decision:** always emit on `<ul>`/`<ol>`. Two extra DOM
   attributes per list is well below the noise floor.

4. **Item index stability under `@for`.** When items are rendered
   via `@for (item of items(); track item.id)`, the `KjListItem`
   instances re-register on each iteration. The `index` signal must
   reflect the new position, not the registration history. The
   parent's `contentChildren(KjListItem)` already returns items in
   DOM order; `index` is `computed(() =>
   list.items().indexOf(this))`. Verify this stays cheap with 1000
   items (likely fine — `indexOf` on a small array; if not, the
   parent can maintain a `WeakMap<KjListItem, number>` and update
   it on each `items` change).

5. **The wrapper's `[empty]` template input is wrapper-only.** The
   directive layer treats "no items" as "no items"; nothing
   special. The wrapper's empty handling is convenience —
   `@if (items().length > 0) { default rendering } @else { empty
   template }`. **Risk:** consumers who use the directive directly
   (without the wrapper) lose the empty-state convenience. They
   conditional-render at their layer. Documented as a wrapper-only
   feature.

6. **`aria-label` enforcement is wrapper-only.** A bare
   `[kjList]` attribute on a `<ul>` with no `aria-label` is valid
   HTML but loses the labelling discipline. The wrapper's dev-mode
   warn is the enforcement layer. **Decision:** do not move the
   warn into the directive — the directive doesn't own the host
   element and shouldn't dictate label policy when used bare. The
   wrapper, which *does* own its host, can warn.

7. **Active-row chrome conflicts with hover chrome.** When the
   active row is also being hovered, which chrome wins? CSS
   specificity has to pick one. **Plan:** active wins — the user's
   mental model is "this is the current page; hovering me doesn't
   change that". Implement via cascade order in the wrapper CSS:
   `:hover` rule first, `[data-active]` rule after. Document for
   theme authors.

8. **`KjListItem` registration with the parent.** The item
   registers in its constructor via `inject(KJ_LIST,
   { optional: true })?.register(this)` and unregisters via
   `DestroyRef`. Standard Angular pattern; not a risk, just a
   reminder that **a list-item without a list parent should still
   render** (no errors thrown) — it just gets `role="listitem"` and
   no participation in the registry. This is the "loose item" case
   (an item rendered outside a list for layout demos) and we
   support it silently.

9. **Virtualised lists.** A 10,000-row list rendered via a
   virtualisation library (we don't ship one — see the no-CDK
   policy in [`rules/stack.md`](../../../rules/stack.md)) materialises
   only N visible rows. The `items()` signal will reflect the
   visible window, not the full data set. **Risk:** AT will report
   "list, N items" where N is the visible count, not the full count
   — confusing. **Plan:** expose `aria-rowcount` on the root (an
   ARIA token from the grid pattern that AT already understands as
   "total rows including offscreen") as an optional input
   `kjListTotalCount`. When set, the wrapper emits
   `aria-rowcount` on the root and `aria-rowindex` on each item.
   Off by default; on for virtualised lists. Document the pattern
   when virtualisation lands.

10. **`role="list"` redundancy on `<menu>`.** The `<menu>` HTML
    element has historically had varying ARIA mappings; modern
    spec treats it as a list. We do **not** support `as="menu"` on
    `<kj-list>` — that's a Menu component (`role="menu"` +
    `role="menuitem"`), not a List. The wrapper's `as` input
    enumerates `'ul' | 'ol' | 'div' | 'nav'` only. Closing this
    door explicitly.

11. **`as="nav"` and the nav-list pattern.** When `as="nav"`, the
    host is a `<nav>` and the implicit `role="navigation"` is
    enough — but a `<nav>` is a *landmark*, and landmarks must have
    accessible names (per ARIA's named-landmark rule). The wrapper
    enforces `aria-label` or `aria-labelledby` more strictly when
    `as === 'nav'`: it errors in dev mode (vs. a warn for the
    other cases). Makes the contract clear: a nav-list **must**
    be named. Mirror what's documented for breadcrumbs and any
    future `<kj-sidebar>`.

12. **Disabled state on the row vs. on the projected child.** A
    "disabled list-row" (e.g. an upgrade-required setting) is
    currently a two-layer affair: `[disabled]="true"` on the
    `<kj-list-item>` paints the chrome, *and* `[disabled]="true"`
    on the projected `<button>` makes it actually unreachable. Two
    bindings is one too many. Three options:
    - **(a) `KjListItem` propagates `disabled` to descendants via
      `KJ_LIST_ITEM`**, and `KjButton` / `KjLink` opt-in to read
      the parent's signal. Cheap, but couples `KjButton` to
      `KJ_LIST_ITEM`.
    - **(b) The wrapper does it** — when
      `<kj-list-item disabled>`, the wrapper auto-sets `disabled`
      on the first focusable descendant via a template attribute.
      Brittle (relies on the descendant being a `KjButton` /
      `KjLink` and not, say, a `<input>`).
    - **(c) Document the two-binding pattern** and provide a
      shorthand only when the row is a card-without-projection (rare).
    - **Recommendation:** **(c)** for v1 — explicit wins. Revisit
      if real consumers complain. The two-binding pattern is also
      what Accordion uses for trigger-disabled (per
      [`./accordion.md`](./accordion.md), Q4).

13. **The "list within a list" pattern.** A nav with a top-level
    list of categories and a nested list of pages within each
    category (settings UI, sidebar with sections). The directive
    composes recursively — `<kj-list>` of `<kj-list-item>` of
    `<kj-list>` of `<kj-list-item>`. ARIA-wise, both lists need
    independent names (one per `<ul>`'s context). The `index`
    signal refers to position in the *immediate parent* list, not
    the flattened tree — by virtue of how `inject(KJ_LIST)`
    resolves to the nearest ancestor. Test explicitly under nesting
    in `list.spec.ts`.

14. **Should `KjList` ship a `kjListGap` size axis?** daisyUI's
    `.list` has implicit gap; Material's `mat-list` doesn't.
    **Decision:** no — gap is a `KjSize` derivative (the size token
    cascades a `--kj-list-row-gap` custom property in the wrapper
    CSS). One source of truth for density.

15. **Animations on row insertion / removal.** A notification rail
    that slides in new rows is a real UX requirement. We have
    Accordion's height-measurement plan to draw on (see
    [`./accordion.md`](./accordion.md), Animation section), but
    row-level animation is per-item, not per-container, and is
    closer to a `[@listAnimations]` Angular Animations
    contract — which we **don't** use (per
    [`rules/stack.md`](../../../rules/stack.md)). **Plan:**
    document the consumer-owned CSS pattern (`@starting-style` +
    transitions on `[data-mounted]` attribute the consumer toggles
    in their own component) as a recipe; do not bake animation
    into List. Revisit if multiple consumers re-implement the
    recipe identically.

16. **`<ol>` ordered-list semantics.** `<ol>` carries an implicit
    "the order is meaningful" semantic. We expose `as="ol"` for
    consumers who genuinely have a meaningful order (steps,
    rankings, ranked search results). The directive does nothing
    different at the JS level — the implicit semantics are
    sufficient. Document the choice criterion: use `<ol>` if
    re-ordering changes meaning; otherwise `<ul>`.

17. **Forward reference reconciliation.** When
    [`./chat-bubble.md`](./chat-bubble.md) is written, it should
    consume `KjList` as the rail container. When
    [`../navigation/sidebar.md`](../navigation/sidebar.md) is
    written, it should consume `KjList arrowNavigation` as the
    nav-link rail. When [`./card.md`](./card.md) is written (or
    revised), it should cross-link to this file as the card
    collection container. The `KjList` selector is canonical;
    other analyses must point here, not duplicate.

18. **`aria-rowcount` / `aria-rowindex` on a `role="list"`.**
    Strictly, the `aria-rowcount` token belongs to grid / table
    contexts. AT support for emitting it on a plain list is
    inconsistent. The fallback for virtualised lists is to inject
    a visually-hidden "Showing 50 of 10,000" announcement at the
    top of the list and let the consumer rebuild it on window
    change. **Decision:** ship the `aria-rowcount` /
    `aria-rowindex` plan (per Q9) but flag it as an experimental
    a11y improvement; verify with NVDA + JAWS + VoiceOver before
    promoting it from "opt-in" to "default for virtualised
    lists".
