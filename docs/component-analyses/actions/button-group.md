# Button Group

Container for related actions rendered as a visually-joined cluster of
`KjButton` instances. Per the kouji-ui roadmap this component subsumes three
distinct PrimeNG/Material widgets: plain Button Group, Toggle Button (single
press-toggle), and Split Button (primary action + dropdown trigger). One
core directive — `KjButtonGroup` — drives all three behaviours through a
`[kjMode]` discriminator and a child `KjButtonGroupItem` directive.

Cross-references:
- [`button.md`](./button.md) — every group item is a `[kjButton]` host; toggle
  semantics reuse `KjButton.kjPressed`.
- [`dropdown-menu.md`](./dropdown-menu.md) — split-button trigger is the same
  anchored-menu pattern; `KjButtonGroup` does not own menu behaviour, it only
  marks one child as the dropdown trigger and delegates to `KjDropdownMenu`.
- `KjRovingTabindex` (a11y primitive) — keyboard navigation contract.
- `KjButton.kjPressed` — toggle state model reused per item.

## Source comparison

### PrimeNG — `p-buttongroup`, `p-togglebutton`, `p-splitbutton`

- **`p-buttongroup`** is purely visual: a `<span class="p-buttonset">` wrapper
  that joins consecutive `p-button` children with collapsed borders/radii.
  No state, no keyboard handling, no role — accessibility is inherited from
  the buttons themselves. API surface is empty (one content-projection slot).
- **`p-togglebutton`** is a standalone single-press-toggle component with
  `[(ngModel)]`/`[(checked)]`, `onLabel`/`offLabel`, `onIcon`/`offIcon`, and
  `iconPos`. It renders `aria-pressed` on a `<button>`. Not coupled to
  `p-buttongroup`; PrimeNG users hand-roll segmented controls by composing
  multiple `p-togglebutton`s and managing exclusive selection themselves.
- **`p-splitbutton`** is a self-contained widget: a primary `<button>` next to
  a chevron `<button>` that opens a `p-tieredmenu` populated from a `[model]`
  array of `MenuItem` objects. Emits `(onClick)` for the primary action and
  delegates item commands through `MenuItem.command`. The dropdown trigger
  carries `aria-haspopup="menu"` and `aria-expanded`.

### Angular Material — `mat-button-toggle-group` / `mat-button-toggle`

Material has no plain "button group". Its closest equivalent is the
button-toggle group, which is a *segmented control* by design: a parent
`<mat-button-toggle-group>` with `[multiple]`, `[value]`, `[name]`,
`[hideSingleSelectionIndicator]`, and a roving-tabindex/arrow-key keyboard
contract; child `<mat-button-toggle [value]>`s render as `role="radio"` (or
`role="button"` with `aria-pressed` when `multiple`). The group is a
`ControlValueAccessor` so it plugs into reactive forms. Material does not
ship a "split button" — users compose `<button mat-button>` with
`<mat-menu>` + `[matMenuTriggerFor]`.

### shadcn/ui — `<ButtonGroup>`

shadcn's recently-added Button Group is purely a layout primitive: a flex
container plus presentational siblings (`ButtonGroupSeparator`,
`ButtonGroupText`) that collapses border-radii of children. It carries
`role="group"` and forwards `aria-label`. There is no toggle mode and no
split-button mode — those are documented as recipes (combine with
`Toggle`/`ToggleGroup` and `DropdownMenu` respectively). `ToggleGroup` is a
sibling primitive (Radix-based) that handles single/multi exclusive
selection with `radiogroup` semantics.

## Decision: needs a core directive?

**Yes.** Three forces push this above pure styling:

1. **Roadmap mandate** — Toggle Button and Split Button are absorbed
   variants. Both carry non-trivial behaviour (exclusive selection across
   children, dropdown-trigger wiring) that must live in core, not in
   `@kouji-ui/components` CSS.
2. **Keyboard contract** — for `mode="toggle"` (segmented control) the group
   is the natural owner of arrow-key navigation via `KjRovingTabindex`, of
   exclusive-vs-inclusive selection state, and of `radiogroup`/`group` role
   selection.
3. **ARIA role coordination** — the parent's role (`group`, `radiogroup`,
   `toolbar`) determines each child's role (`radio`, button with
   `aria-pressed`, plain `button`). That coupling can only be enforced by a
   directive that children inject.

A pure-CSS group would force consumers to hand-wire roving tabindex, exclusive
selection, and radio semantics on every use site, duplicating the bug surface
shadcn explicitly accepts and Material explicitly avoids. We follow Material.

## Base features

- **Plain group layout** (`kjMode="actions"`, default) — `role="group"`,
  visual joining only, no selection state, items keep their own
  tabindex (no roving). Equivalent to PrimeNG `p-buttongroup` and
  shadcn `<ButtonGroup>`.
- **Toggle mode** (`kjMode="toggle"`) — segmented control. Two sub-modes via
  `[kjExclusive]`:
  - `kjExclusive=true` (default for `toggle`) → single-select, `role="radiogroup"`,
    each item gets `role="radio"` + `aria-checked`, behaves like a radio group
    bound to `[(kjValue)]`.
  - `kjExclusive=false` → multi-select, `role="group"`, each item is a button
    with `aria-pressed`, bound to `[(kjValue)]` as `unknown[]`.
  - Single-button toggle (PrimeNG `p-togglebutton`) is just a `kjButtonGroup`
    of one item with `kjExclusive=false`, or — more idiomatically — a bare
    `[kjButton]` with `[(kjPressed)]` (already supported by `KjButton`,
    no group needed). The group is required only when *multiple* items
    coordinate.
- **Split mode** (`kjMode="split"`) — primary action button + dropdown
  trigger sibling. Exactly two children: one `[kjButtonGroupItem]` (the
  primary), one `[kjButtonGroupItem kjSplitTrigger]` paired with
  `[kjDropdownMenuTriggerFor]` from the dropdown package. The group itself
  does not own the menu — it just sets `aria-haspopup="menu"` /
  `aria-expanded` on the trigger by reading the dropdown's open signal.
- **Orientation** (`kjOrientation="horizontal" | "vertical"`, default
  `horizontal`) — affects roving-tabindex arrow keys (← → vs ↑ ↓) and is
  also a styling hook for `@kouji-ui/components`.
- **Variants & sizes** — inherited from each child `KjButton`. The group
  exposes `[kjVariant]` and `[kjSize]` as **convenience overrides** that are
  forwarded to children that don't set their own (via context token, items
  read group's value as a fallback). This matches shadcn's "variant on the
  group, override per child" ergonomics without forcing a single appearance.
- **Disabled propagation** — `[kjDisabled]` on the group disables every item
  (each item ORs its own `kjDisabled` with the group's). Loading state is
  per-item only; the group does not own loading semantics.

## Accessibility (WCAG 2.1 AAA)

| Mode | Host role | Item role | Selection ARIA | Keyboard |
|---|---|---|---|---|
| `actions` (plain) | `group` | (button) | — | Tab through items (no roving) |
| `toggle` exclusive | `radiogroup` | `radio` | `aria-checked` | Tab to enter, ←/→ (or ↑/↓) move + select, Home/End jump, Space/Enter selects |
| `toggle` inclusive | `group` | `button` | `aria-pressed` | Tab to enter, ←/→ move focus only, Space/Enter toggles |
| `split` | `group` | `button` for primary; `button` with `aria-haspopup="menu"` + `aria-expanded` for trigger | — | Tab to primary, Tab to trigger; ↓ on trigger opens menu (delegated to `KjDropdownMenu`) |

Implementation:

- Roving tabindex is provided by **`KjRovingTabindex`** (already in `a11y/`)
  applied via `hostDirectives` whenever `kjMode === 'toggle'`. Plain
  `actions` mode keeps native Tab order. Split mode keeps native Tab order
  (only two items; a roving group between primary and trigger would surprise
  users coming from PrimeNG/Material).
- `KjButtonGroup` sets `role` reactively on the host based on `kjMode` +
  `kjExclusive`. When the consumer supplies an explicit `role` (e.g.
  `role="toolbar"` for icon-only edit toolbars) the directive defers to it
  — toolbars are a valid alternative for plain `actions` mode, and a project
  rule (`accessibility.md`) requires honouring author-provided roles.
- `aria-label` / `aria-labelledby` is required when the group has a
  semantic role (`radiogroup`, `toolbar`); the directive does **not**
  fabricate one but emits a `console.warn` in dev mode if missing
  (consistent with `KjAriaDescribedby` policy).
- Each `KjButtonGroupItem` reuses `KjButton` so focus ring, 44×44 touch
  target, ARIA-disabled (not native `disabled`), and `aria-busy` semantics
  are inherited unchanged.
- Split-trigger `aria-expanded` is wired to the dropdown's `open()` signal
  through the `KJ_DROPDOWN_MENU` context token; we do not duplicate menu
  state in the group.
- WCAG criteria covered: **1.3.1** (radio/group structure), **2.1.1** /
  **2.1.2** (keyboard, no traps), **2.4.3** (focus order via roving),
  **4.1.2** (correct name/role/value for radio + toggle states), **2.5.5**
  (44×44 inherited from `KjButton`).

## Composition model

```
button-group/
  button-group.ts            ← KjButtonGroup (root)
  button-group-item.ts       ← KjButtonGroupItem (per child)
  button-group.context.ts    ← KjButtonGroupContext + KJ_BUTTON_GROUP token
  button-group.spec.ts
  button-group-item.spec.ts
  index.ts
```

**`KjButtonGroup`** (selector `[kjButtonGroup]`)
- Provides `KJ_BUTTON_GROUP` context.
- `hostDirectives`: `KjRovingTabindex` (conditionally enabled — see open
  questions), `KjVariant`, `KjSize` (forwarded to context, *not* to host
  styling; the group element itself has no presets).
- Host: `[attr.role]`, `[attr.aria-orientation]`, `[attr.data-mode]`,
  `[attr.data-orientation]` (last two are styling hooks for the wrapper
  package).
- Owns selection state for `mode="toggle"` via `kjValue` model.

**`KjButtonGroupItem`** (selector `[kjButtonGroupItem]`)
- Required `kjValue` input (any) — the value identifying this item in
  exclusive/inclusive selection. Optional in `actions` and `split` modes.
- `hostDirectives`: `KjButton` (so every item *is* a kouji button, with
  variant/size/disabled inherited; aliased inputs forwarded), and
  `KjRovingTabindexItem` when the parent group is in `toggle` mode.
- Host: `[attr.role]` resolves from group context (`radio` | `button`),
  `[attr.aria-checked]` for radio mode, `[attr.aria-pressed]` for inclusive
  toggle mode (delegated through `KjButton.kjPressed` so we don't duplicate
  the listener), `[attr.data-selected]` for styling.
- Listens for click + Space/Enter and calls `ctx.toggle(this.kjValue())`.

**Shared state — `KjButtonGroupContext`**
```ts
export interface KjButtonGroupContext {
  readonly mode: Signal<'actions' | 'toggle' | 'split'>;
  readonly exclusive: Signal<boolean>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly disabled: Signal<boolean>;
  readonly variant: Signal<KjVariantValue | undefined>;
  readonly size: Signal<KjSizeValue | undefined>;
  readonly value: Signal<unknown | unknown[] | null>;
  isSelected(value: unknown): boolean;
  toggle(value: unknown): void;
  registerSplitTrigger(item: KjButtonGroupItem): void;
}
export const KJ_BUTTON_GROUP = new InjectionToken<KjButtonGroupContext>('KjButtonGroup');
```

**Why a child directive instead of querying `[kjButton]` siblings?**
Items must opt into group semantics (a stray `[kjButton]` placed inside
the group for layout purposes — e.g. a "Cancel" escape hatch — should not
become a radio). An explicit `[kjButtonGroupItem]` makes participation
intentional. This matches Material (`<mat-button-toggle>` is its own
component) and diverges from shadcn (which auto-styles every child).

**Why not collapse Toggle/Split into separate directives?**
A `KjToggleGroup` + `KjSplitButton` split would duplicate variant/size
forwarding, disabled propagation, the layout role contract, and child
registration. The behavioural difference between modes lives entirely in
selection logic and child role mapping — both expressible as a single
discriminated state machine. The roadmap explicitly absorbs them; honour it.

## Inputs / Outputs / Models

`KjButtonGroup`:

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjMode` | `input` | `'actions' \| 'toggle' \| 'split'` | `'actions'` | Drives role + child-role mapping. |
| `kjExclusive` | `input` | `boolean` | `true` when `kjMode==='toggle'`, else `false` | Toggle mode only. |
| `kjOrientation` | `input` | `'horizontal' \| 'vertical'` | `'horizontal'` | Drives roving-tabindex arrow axis. |
| `kjValue` | `model` | `unknown \| unknown[] \| null` | `null` (exclusive) / `[]` (inclusive) | Two-way bound; emits `kjValueChange`. Ignored unless `kjMode==='toggle'`. |
| `kjDisabled` | `input` | `boolean` | `false` | OR-ed into each item. |
| `kjVariant` | `input` | `KjVariantValue` | `undefined` | Forwarded to children that don't set their own. |
| `kjSize` | `input` | `KjSizeValue` | `undefined` | Forwarded to children that don't set their own. |
| `kjAriaLabel` | `input` | `string` | `undefined` | Sets `aria-label` on host; required for `radiogroup`/`toolbar`. Aliases `aria-label`. |

`KjButtonGroupItem`:

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjValue` | `input` | `unknown` | `undefined` | Required in `toggle` mode. |
| `kjDisabled` | `input` | `boolean` | `false` | Forwarded to inner `KjButton`; OR-ed with group disabled. |
| `kjSplitTrigger` | `input` | `boolean` | `false` | Marks this item as the dropdown trigger in `split` mode. The dropdown wiring itself uses `kjDropdownMenuTriggerFor` (a separate directive from the dropdown-menu package), which the group does not duplicate. |
| `kjVariant` | `input` | `KjVariantValue` | `undefined` | Per-item override of group default. |
| `kjSize` | `input` | `KjSizeValue` | `undefined` | Per-item override of group default. |

No bespoke outputs — `kjValueChange` is auto-emitted by the `kjValue` model;
per-item click events are surfaced by the underlying `KjButton` host.

## Examples to ship

1. **Plain action group** — three buttons (Save / Cancel / Delete) joined
   visually; default `kjMode="actions"`. Demonstrates that no value/state is
   needed and Tab traversal is preserved.
2. **Single-press toggle** (absorbs PrimeNG `p-togglebutton`) — a single
   `[kjButton]` with `[(kjPressed)]`, *no* group. Shown to make clear that
   the group is unnecessary for one-button toggles.
3. **Exclusive segmented control** — `kjMode="toggle"`, `kjExclusive=true`,
   `[(kjValue)]` bound to view-state for "list / grid / kanban" view
   switcher. Shows `radiogroup` semantics + arrow-key navigation.
4. **Inclusive toolbar** (text formatting: Bold / Italic / Underline) —
   `kjMode="toggle"`, `kjExclusive=false`, `[(kjValue)]` as `string[]`,
   plus `role="toolbar"` override demonstrating the explicit-role escape
   hatch.
5. **Split button** — `kjMode="split"`: primary "Save" + chevron trigger
   that opens a `KjDropdownMenu` of "Save as draft / Save & publish".
   Cross-references the dropdown-menu doc for menu item details.
6. **Vertical orientation** — vertical exclusive segmented control to verify
   ↑/↓ keyboard navigation and styling hook.
7. **Disabled propagation** — group `[kjDisabled]="true"` greys out every
   child; per-item `[kjDisabled]` disables only one.
8. **Reactive forms binding** — segmented control bound through
   `[formControl]` to demonstrate the same `ControlValueAccessor` story
   Material's button-toggle ships. Requires the group to compose
   `KjFormControl` in toggle mode (see open questions).

Themed variants (`default` / `retro` / `finance`) shipped for examples
1, 3, and 5 — same selection theming pattern as `button.example.ts`.

## Open questions / risks

1. **`KjFormControl` composition** — `rules/architecture.md` mandates that
   "all form input directives must compose `KjFormControl` via
   `hostDirectives`". A toggle-mode group is functionally a form control
   (it owns a value and is a likely `[formControl]` target), but the
   `actions` and `split` modes are not. Two options:
   - **A.** Always compose `KjFormControl`; in non-toggle modes the value
     is permanently `null` and writes are ignored. Simpler, slightly
     wasteful.
   - **B.** Split into `KjButtonGroup` (no FormControl) and
     `KjToggleGroup extends KjButtonGroup` (with FormControl). Conflicts
     with the roadmap's "one component" stance.
   - **Recommendation:** Option A. The cost is one extra directive instance
     per group; the win is one published API and one mental model.
2. **Roving tabindex toggling between modes** — `hostDirectives` are
   resolved at directive-construction time and cannot be conditionally
   composed. Two options:
   - **A.** Always include `KjRovingTabindex` and have it expose a
     `[kjRovingTabindexEnabled]` input we drive from `kjMode`. Requires
     a small additive change to the existing primitive.
   - **B.** Always run roving-tabindex; in `actions` mode no item carries
     `[kjRovingTabindexItem]` so the directive is inert.
   - **Recommendation:** Option B — zero new surface area on the primitive.
     Validate that an "empty" roving-tabindex container truly has no
     side-effects (it currently scans `contentChildren`).
3. **Dropdown trigger coupling for split mode** — should `KjButtonGroup`
   have any awareness of `KjDropdownMenu`, or should `kjSplitTrigger` be a
   dumb marker that styles the chevron and the dropdown wiring be 100%
   the consumer's responsibility (via `[kjDropdownMenuTriggerFor]`)?
   Recommendation: dumb marker. Importing dropdown into the button-group
   package introduces a circular concern; let consumers compose.
   `aria-haspopup`/`aria-expanded` are then set by `KjDropdownMenuTrigger`
   on the same host element, not by the group — the group only contributes
   the visual "split" affordance.
4. **Single-item toggle redundancy** — recommendation #2 in examples shows
   we explicitly do *not* require a group for single-button toggles. Risk:
   docs must spell this out or PrimeNG migrants will reach for the wrong
   API.
5. **Mixed-content groups** — what happens if a consumer drops a
   non-`[kjButtonGroupItem]` child (e.g. a `<span>` separator or shadcn-style
   `ButtonGroupText`) in toggle mode? Skip it for selection but allow it in
   the visual flow. Decision: items register via the context token at
   `ngOnInit`; non-registering children are ignored by selection logic but
   the wrapper component's CSS still styles their joined edges.
6. **`aria-label` enforcement** — dev-mode warn-only is consistent with
   `KjAriaDescribedby` but weaker than throwing. Defer to project a11y
   policy review; the doc currently lands on warn.
7. **Variant override forwarding** — `KjVariant` is currently composed via
   `hostDirectives` on the *button*; making the group set a variant that
   the item reads requires a context-driven fallback inside
   `KjButtonGroupItem` (read group's `kjVariant` if its own is unset). Need
   to confirm this works with `KjVariant`'s presets-binding model in
   `presets/`.
