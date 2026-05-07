# Cascade Select

A **Cascade Select** is a hierarchical dropdown picker: the user picks a leaf
value by walking a chain of nested submenus. The collapsed state shows a
single trigger button with the current selection (or a placeholder); opening
reveals a root panel listing the top-level options, and any option that has
children opens a sibling sub-panel to the right (or left in `dir="rtl"`)
when activated by hover, click, or `ArrowRight`. Selection is **leaf-only**:
the value committed to the form model is the value of a node with no
`children`. The classic UX is *Country → State → City*.

This component is **not** a tree picker. The hierarchy is walked one level at
a time through a flyout chain — visually, behaviourally, and from a
keyboard-contract standpoint, it is **Dropdown Menu's submenu pattern grafted
onto Select's value-bearing root**. When the consumer wants the entire tree
visible at once with branch expand/collapse and group-selection semantics,
that is [`tree-select.md`](./tree-select.md) (a sibling, **not** a renaming of
this component — see [Cross-component pointers](#cross-component-pointers)).

The intent is **maximum reuse of the Select infrastructure**: the root
directive, the trigger, anchoring, form-control wiring, and `KjField`
integration are all reused verbatim. What is genuinely new is (a) the
hierarchical data model, (b) the per-level **sub-panel** directive that
re-implements Dropdown Menu's submenu chain semantics inside a listbox
context, and (c) the keyboard contract for moving along the chain
(`ArrowRight` to dive in, `ArrowLeft` to back out, plus the auto-close on
sibling-panel activation).

## Source comparison

### PrimeNG — `<p-cascadeSelect>` ([primeng.org/cascadeselect](https://primeng.org/cascadeselect))

The main reference. PrimeNG ships Cascade Select as a single data-driven
component fed a tree:

```html
<p-cascadeSelect
  [options]="countries"
  optionLabel="name"
  optionValue="code"
  optionGroupLabel="name"
  [optionGroupChildren]="['states', 'cities']"
  placeholder="Select a city"
  [(ngModel)]="selected" />
```

The `[optionGroupChildren]` input is an **array of stringly-typed paths**, one
per level of the tree (`states` is the children-key on a country,
`cities` is the children-key on a state). The same `optionLabel` /
`optionValue` paths are used at every level — heterogeneous trees (where the
label key changes per level) are not directly supported; consumers normalise
their data first.

Surface (PrimeNG 18, `<p-cascadeSelect>`):

| Input                          | Notes                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| `options`                      | Tree of nodes — heterogeneous shape across levels via `optionGroupChildren`.          |
| `optionLabel` / `optionValue`  | String paths into a node.                                                             |
| `optionGroupLabel`             | String path for non-leaf nodes' label.                                                |
| `optionGroupChildren`          | `string[]` — children-key per level (length = depth − 1).                              |
| `optionDisabled`               | String path or function — per-node.                                                   |
| `placeholder`                  | String shown when no value selected.                                                  |
| `disabled` / `readonly` / `loading` | States.                                                                          |
| `appendTo`                     | `'body' \| ElementRef \| string` — escape clipping containers.                        |
| `dropdownIcon` / `optionGroupIcon` | Icon overrides; `optionGroupIcon` renders the trailing chevron on parent rows.      |
| `showClear`                    | Inline clear button.                                                                  |
| `panelStyleClass` / `styleClass` | CSS hooks.                                                                          |
| `tabindex`                     | Integer.                                                                              |
| `ariaLabel` / `ariaLabelledBy` | A11y name forwarded to the trigger.                                                  |
| `inputId`                      | Trigger id.                                                                           |
| `autofocus`                    | Auto-focus the trigger on mount.                                                      |

Outputs: `onChange`, `onShow`, `onHide`, `onFocus`, `onBlur`,
`onGroupChange` (fires when the user crosses a level — useful for analytics
or lazy-loading children).

Slots (`ng-template`): `#option`, `#optiongroupicon`, `#dropdownicon`,
`#triggericon`, `#clearicon`, `#header`, `#footer`, `#emptymessage`. Every
slot is the same `ng-template` shape PrimeNG uses everywhere — per-row
composition is awkward (no per-option directive to compose `KjDisabled` /
`KjFocusRing` against).

ARIA / keyboard:
- Trigger: `role="combobox"` + `aria-haspopup="tree"`, `aria-expanded`,
  `aria-controls`.
- Root panel: PrimeNG uses `role="tree"` (nested),
  `aria-orientation="horizontal"` (because the *flyout chain* extends
  horizontally even though items inside each level stack vertically).
- Each row: `role="treeitem"` with `aria-level`, `aria-setsize`, `aria-posinset`,
  `aria-expanded` (only on rows that have children), `aria-selected`.
- Keyboard: `ArrowDown`/`ArrowUp` move within the current level; `ArrowRight`
  enters a child panel (or expands the row if it has children but is
  collapsed); `ArrowLeft` returns to the parent row; `Enter`/`Space` selects
  a leaf and closes; `Escape` closes the current panel (and only that panel,
  same as Dropdown Menu submenus); `Home`/`End` jump within the current
  level. Type-ahead matches the **current level only**.

Critique:
- **Tree semantics on a flyout chain is debatable.** APG's tree pattern
  ([WAI-ARIA APG Tree](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/))
  describes a *single visible tree* with siblings stacked vertically and
  children indented. A cascade-select's flyout chain is visually closer to a
  menubar/menu pattern: each level is its own listbox, and the user walks
  *across* panels. PrimeNG's choice of `tree` is justifiable (the data is a
  tree, branches are expandable, AT can announce level/setsize), but it
  forces SR users to mentally map "horizontal panel chain" onto a
  vertical-tree mental model. **kouji's choice — see Decision below — is to
  use `role="tree"` on the root panel only, with `aria-orientation="horizontal"`
  and per-level "branch" sub-panels rendered as descendants in the
  *accessibility tree* (via `aria-owns`, not DOM nesting), so SR levels and
  set-size announce correctly while the visual layout stays a flyout chain.**
- **Stringly-typed `optionGroupChildren`.** Same complaint as Select's
  `optionLabel`/`optionValue`: typo-prone, no compile-time checking,
  forces a normalised tree. The compound model below uses `KjCascadeOption`
  + projected sub-panels instead, which composes naturally with arbitrary
  per-level rendering.
- **No first-class "path" output.** `onChange` emits the leaf value only.
  Many consumers want the *path* (the chain of values from root to leaf —
  e.g. `['us', 'ca', 'sf']`) for breadcrumbs, analytics, persistence. The
  workaround is to scan the tree on every change. **kouji emits both** — see
  Outputs.

### Angular Material — no first-class cascade select

Material does **not** ship a cascade picker. Two community patterns dominate:

1. **Chained `<mat-select>`s.** A row of independent selects (`Country` →
   `State` → `City`), where each downstream select's `[options]` is filtered
   by the upstream selection. Consumer-owned wiring; three trips to the
   panel; three separate form controls. Trivial to ship but UX-crude — every
   level is a full popover with its own scroll, not a flyout chain, and the
   trigger doesn't show the cumulative path until the user finishes the last
   select.
2. **Nested `<mat-menu>` submenus** with `[matMenuTriggerFor]` between
   `<mat-menu>`s. Material's submenu chain is keyboard-correct (ArrowRight /
   ArrowLeft, hover-to-open, focus-restoration) but the menu is `role="menu"`
   with `role="menuitem"` rows — wrong semantics for a value-bearing
   selection. The bound state is whatever the consumer wires manually; no
   `MatFormFieldControl` integration.

The gap is real: a value-bearing hierarchical picker with a single trigger
and a submenu-style chain isn't in Material's component palette. (There's a
[long-standing GitHub
issue](https://github.com/angular/components/issues/9869) requesting it.)
Material consumers either roll their own from CDK Overlay + nested menus or
adopt PrimeNG.

**Pattern picked up.** Material's submenu chain inside `<mat-menu>` is the
keyboard contract we copy from — the kouji Dropdown Menu analysis already
documents it ([`actions/dropdown-menu.md`](../actions/dropdown-menu.md)
keyboard table). The form-control + composite-control labelling pattern
(trigger as `<button role="combobox">`, registered as the labelled element
with `KjField` via `aria-labelledby`) carries over from `KjSelect`.

### shadcn/ui — no first-class cascade select

shadcn does not ship a cascade picker. The community patterns are:

1. **`Command` palette** (cmdk-based) with a stacked or paged interface —
   the "k-bar" idiom. Each level is its own page; `Enter` on a parent row
   replaces the visible list. Reads more like a file-browser than a
   value-picker; doesn't match the flyout-chain UX of Country → State → City.
2. **Nested `DropdownMenu`s** with `<DropdownMenuSub>` / `<DropdownMenuSubTrigger>`
   / `<DropdownMenuSubContent>` (Radix's submenu primitives). Same shape as
   Material's, with the same role-mismatch — menus, not selectors.

shadcn explicitly punts to custom builds. The
[shadcn community examples gallery](https://ui.shadcn.com/examples) does not
include a cascade picker.

**Pattern picked up.** Radix's `DropdownMenuSub` / `SubTrigger` / `SubContent`
trio is the right shape for the **sub-panel** family below — the kouji
analogues are `KjCascadeSelectSubPanel` and the implicit "sub-trigger"
behaviour on `KjCascadeSelectOption` when it has children (it's both an
option *and* a sub-trigger). The naming follows kouji's existing
`KjMenuContent` / `[kjDropdownMenuTriggerFor]` shape.

### Cross-library summary

|                                   | PrimeNG `<p-cascadeSelect>` | Material               | shadcn                  | kouji direction                                                         |
| --------------------------------- | --------------------------- | ---------------------- | ----------------------- | ----------------------------------------------------------------------- |
| First-class cascade picker        | yes                         | **no** — gap           | **no** — gap            | **yes** — `KjCascadeSelect` family, reuses `KjSelect` root + trigger     |
| Composition                       | data-driven (`[options]`)   | n/a                    | n/a                     | **compound** (`KjCascadeSelect` + `Trigger` + `Panel` + `Option` + `SubPanel`) |
| Hierarchy data model              | tree of homogeneous nodes   | n/a                    | n/a                     | **`{ label, value, children?: Node[] }[]`** + projected sub-panels      |
| Sub-panel orientation             | horizontal flyout chain     | n/a                    | n/a                     | **horizontal flyout chain** (per-side flips on collision + RTL)         |
| Panel ARIA role                   | `tree` (nested)             | n/a                    | n/a                     | **`tree`** on root panel + `group` on each sub-panel; flat `treeitem` rows; `aria-owns` for nesting |
| Sub-trigger semantics             | row with children = expandable `treeitem` | n/a       | `menuitem` + `aria-haspopup="menu"` | **`treeitem` with `aria-haspopup="tree"` + `aria-expanded`**             |
| Keyboard: enter sub-level         | `ArrowRight` / `Enter`      | `ArrowRight`           | `ArrowRight`            | **`ArrowRight` / `Enter`** (RTL flips)                                  |
| Keyboard: leave sub-level         | `ArrowLeft`                 | `ArrowLeft`            | `ArrowLeft`             | **`ArrowLeft`** (RTL flips)                                             |
| Keyboard: type-ahead scope        | current level only          | n/a                    | n/a                     | **current level only**                                                  |
| Selection semantics               | leaf-only                   | n/a                    | n/a                     | **leaf-only** (parent rows are sub-triggers, not values)                |
| Path output                       | no — value only             | n/a                    | n/a                     | **path output** (`kjCascadePathChange` emits `T[]`) + value             |
| Form integration                  | CVA (leaf value)            | n/a                    | n/a                     | **CVA (leaf value)** via `KjFormControl`; path is a sibling output       |
| Trigger display                   | leaf label                  | n/a                    | n/a                     | **leaf label** by default; `[kjCascadeSelectValue]` slot for path / breadcrumb rendering |
| Sub-panel open trigger            | hover (delay) + click + arrow | hover + arrow         | hover + arrow           | **hover (delay) + click + arrow** (matches Dropdown Menu submenus)      |
| Auto-close sibling sub-panels     | yes (only one chain open)   | yes                    | yes                     | **yes** — entering a sibling at level N closes any open sub-panel at level N+1 |
| Anchored positioning              | CDK overlay                 | CDK overlay            | Floating UI             | **shared `KjAnchor` primitive** (per Popover) — root + each sub-panel    |
| Lazy children                     | not supported               | n/a                    | n/a                     | **`kjCascadeLazy`** input — emit `kjLevelExpand` and accept async children |
| `compareWith`                     | `dataKey`                   | n/a                    | n/a                     | **`kjCompareWith`** (mirrors `KjSelect`)                                |
| `clearable`                       | `showClear`                 | n/a                    | n/a                     | **`kjClearable`** input on root                                         |

## Decision — needs a core directive?

**Yes — a Cascade Select compound family** that **reuses `KjSelect` as
its root**. Three top-level decisions follow.

### 1. Reuse `KjSelect` as the root, not a new sibling

`KjCascadeSelect` is **not** a separate root directive. It is a structural
*configuration* of `KjSelect`: the consumer applies a single
`[kjCascadeSelect]` attribute alongside `[kjSelect]` (or, more practically,
`[kjCascadeSelect]` composes `KjSelect` via `hostDirectives` and provides a
sub-token `KJ_CASCADE_SELECT`). Why:

- **Same value contract.** A cascade picker commits a leaf value, exactly
  like a single-select. `KjFormControl`, `compareWith`, `clearable`,
  `kjValue` model, `kjOpen` model, `kjDisabled`, `kjReadonly`, `kjInvalid`,
  `kjPlaceholder`, `kjName` all carry over verbatim. Re-implementing them
  on a sibling root is bug-for-bug duplication of `KjSelect`.
- **Same anchored trigger.** `[kjSelectTrigger]` is the trigger.
  `KjCascadeSelect` does **not** ship its own trigger directive — it reuses
  `KjSelectTrigger` exactly as `KjMultiSelect` reuses `KjSelectContent`'s
  keyboard primitive. The accessible-name story (combobox role, `aria-controls`,
  `aria-expanded`, focus restoration) needs no changes.
- **`KjField` integration is already done.** Trigger registers as the
  composite control with `KJ_FIELD`, the field flows `aria-describedby` /
  `aria-required` / `aria-invalid` onto it. No re-wiring.

What changes is the **panel**: cascade replaces the flat `KjSelectContent`
listbox with a **tree-shaped panel composition** — a root panel
(`KjCascadeSelectPanel`, `role="tree"`) plus zero-or-more **sub-panels**
(`KjCascadeSelectSubPanel`, `role="group"` and a sibling `aria-owns` chain
to keep the accessibility-tree hierarchy correct), each containing
`KjCascadeSelectOption` rows.

The `KjCascadeSelect` root contributes:

- A new context (`KJ_CASCADE_SELECT`) for chain-state ownership: which
  sub-panel is open at each level, the active path, lazy-load wiring.
- The leaf-vs-branch determination (an option with projected children is a
  sub-trigger; an option without children is a leaf).
- The path tracking (`kjCascadePath` model — the chain of values from root
  to currently-active sub-trigger or selected leaf).

It does **not** re-own value, open, disabled, compareWith, or any of the
trigger contract.

### 2. Compound shape

| Directive                                 | Status          | Role                                                                                                                                  |
| ----------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `[kjCascadeSelect]` (root configurator)   | **new**         | Composes `KjSelect` via `hostDirectives`. Provides `KJ_CASCADE_SELECT`. Owns chain state, lazy-load wiring, path output. **Does not** re-own value/open/trigger. |
| `[kjSelectTrigger]` (reused)              | exists          | Unchanged. The Cascade Select trigger is **the same trigger** — `<button kjSelectTrigger>`. The `KjSelectValue` slot renders the leaf label by default; consumers can override to render a breadcrumb path (see `[kjCascadeSelectValue]`). |
| `[kjCascadeSelectPanel]`                  | **new**         | Root panel. `role="tree"`, `aria-orientation="horizontal"`, `aria-multiselectable="false"`, anchored to the trigger via `KjAnchor`. Owns the level-0 keyboard handler. Replaces `[kjSelectContent]` for cascade. |
| `[kjCascadeSelectOption]`                 | **new**         | One row at any level. `role="treeitem"`. When projected children exist, doubles as a sub-trigger: `aria-haspopup="tree"`, `aria-expanded`, opens a `KjCascadeSelectSubPanel`. When no children, behaves as a leaf: activation calls `ctx.selectLeaf(value, path)` and closes the chain. |
| `[kjCascadeSelectSubPanel]`               | **new**         | Sub-flyout panel for level ≥ 1. `role="group"`, `aria-orientation="horizontal"`, anchored to its parent option via `KjAnchor` (side `'right'`, align `'start'`). Owns its own keyboard handler delegating to a shared chain controller. |
| `[kjCascadeSelectValue]` (slot, optional) | **new**         | Slot directive used inside the trigger to render *path-aware* trigger content (e.g. `"USA / California / San Francisco"`). Defaults to the **leaf label** when not used. Mirrors `[kjSelectValue]`. |
| `[kjCascadeSelectItemIndicator]`          | **new**         | Slot inside an option. Shown only when the option's value is the *current selected leaf* (or, for sub-triggers, when its descendant chain contains the leaf). `aria-hidden="true"`. Optional; consumer-driven. |
| `[kjCascadeSelectChevron]` (slot)         | **new**         | Slot inside a sub-trigger option for the trailing `›` glyph. `aria-hidden="true"`. Themes own the icon. |

The directives `[kjSelectGroup]`, `[kjSelectLabel]`, `[kjSelectSeparator]`
**do not apply** to cascade — the hierarchy *is* the grouping. Within a
single sub-panel (a single level), separators are theoretically valid but
were not requested by the source comparison; defer to v1.1 with a
`[kjCascadeSelectSeparator]` directive that mirrors `[kjSelectSeparator]`.

### 3. Why `role="tree"` on the panel and not nested `role="menu"`

PrimeNG uses tree, the WAI-ARIA APG tree pattern is explicitly designed for
hierarchical selection (**not** for action lists), and screen-reader output
is dramatically better for hierarchical-data picking when AT can announce
"level 2 of 3, expanded, San Francisco". Three considerations:

1. **Semantic match.** The data *is* a tree; the user is *picking from a
   tree*. `role="menu"` is for **action invocation** (menu items are commands;
   `role="menuitem"` semantics are "click to do something"). A cascade-select
   row is **a value** — semantically equivalent to a `role="option"` in a
   listbox or a `role="treeitem"` in a tree. Using `role="menuitem"` for a
   value-bearing row is the same mistake PrimeNG's `<p-menu>` makes; we
   reject it for the same reason.
2. **APG support.** [APG's tree pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)
   covers expanded/collapsed branches, level/setsize/posinset announcement,
   and the ArrowRight-to-expand / ArrowLeft-to-collapse keyboard contract —
   exactly what cascade needs. APG's combobox-with-tree variant
   ([combobox + tree popup](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/))
   is the exact pattern for a cascade picker behind a combobox trigger.
3. **`role="combobox"` on trigger + `aria-haspopup="tree"`.** APG sanctions
   `aria-haspopup="tree"` on a combobox trigger explicitly. The trigger keeps
   its existing `role="combobox"` (no change to `KjSelectTrigger`); the
   `aria-haspopup` value is overridden to `"tree"` when `KJ_CASCADE_SELECT`
   is in scope (the trigger reads the parent context to pick the popup
   role).

The tradeoff: tree's keyboard contract has more surface area than listbox's
(ArrowRight/ArrowLeft for expand/collapse, plus `*` to expand all siblings).
We follow APG fully — including `*` (asterisk) to expand all sub-panels at
the current level (Q: useful? defer to consumer feedback; ship it because
APG mandates it for tree). See [Keyboard contract](#keyboard-contract).

### 4. Why a flat `treeitem` chain instead of DOM-nested treeitems

APG tree examples typically nest `treeitem`s in DOM (`<ul role="tree"><li
role="treeitem"><ul role="group"><li role="treeitem">…</li></ul></li></ul>`).
Cascade renders each level as a **separate sub-panel anchored to its parent
option**, not as a DOM child of the parent option. The accessibility-tree
nesting is reconstructed via `aria-owns`:

- `KjCascadeSelectPanel` (`role="tree"`) — DOM child of the trigger's
  popover slot.
- Each `KjCascadeSelectOption` (`role="treeitem"`) at level 0 — DOM child of
  the root panel.
- When an option opens its sub-panel, the parent `treeitem` reflects
  `aria-owns="<sub-panel id>"` and `aria-expanded="true"`. The sub-panel
  itself is a sibling DOM node (anchored absolutely off the parent option),
  but in the accessibility tree it is the parent option's descendant via
  `aria-owns`. Same pattern at every level.
- The sub-panel uses `role="group"` (not `role="tree"` again) because APG
  forbids nested `tree` roles; subsequent levels are descendant groups
  inside the single tree.

The key invariant: **only the root panel is `role="tree"`**. All sub-panels
are `role="group"`, and **all rows at every level are `role="treeitem"`**
with the correct `aria-level` (1-indexed: root level is `aria-level="1"`).

This matches PrimeNG's chosen ARIA shape and is what works correctly in
NVDA / JAWS / VoiceOver per their respective bug-tracker confirmations.

### 5. Path tracking and lazy children

The chain state — *which sub-panels are currently open and which option is
active in each* — is owned by `KJ_CASCADE_SELECT` as a `chain: Signal<Level[]>`
where each `Level` records `{ panelId, ownerOptionId, activeOptionId,
options: KjCascadeSelectOption[], isLazyLoading: boolean }`. A new chain
controller primitive (`KjCascadeChainController`, internal) coordinates open/close
across levels:

- **Opening a sub-panel at level N** auto-closes any sub-panel at level
  ≥ N+1 (entering a sibling resets the descendants).
- **Closing the root panel** flushes the chain to length 0.
- **Active descendant per level** is independent; only the current level's
  active option drives the panel's `aria-activedescendant`.

For lazy children, the sub-trigger option exposes a
`kjCascadeChildren: input<readonly KjCascadeNode<T>[] | (() => Promise<readonly KjCascadeNode<T>[]>)>(...)`
overload — synchronous array or a function returning a Promise (or a Signal,
or an Observable; resolved via `toSignal`). When the function shape is
detected, opening the sub-panel emits `kjLevelExpand` on the root with
`{ path: T[], parent: KjCascadeOption<T> }` and renders an empty sub-panel
with `aria-busy="true"` until the Promise resolves; on resolve, the sub-panel
populates and the keyboard handler resumes.

The `kjCascadeLazy` flag at the root is a simpler alternative: when `true`,
all sub-panels are assumed lazy and the consumer must wire `kjLevelExpand`
to populate `[kjCascadeChildren]` per option. **Decision:** ship both — the
function-overload is the per-option opt-in; `kjCascadeLazy=true` is the
"all levels are async" shortcut.

## Base features

- **Variants.** Inherited from `KjSelect`. Trigger `KjVariant` (default /
  filled / ghost). Panels (root + sub) take `kjPanelClass` for theming, no
  variant. Each `[kjCascadeSelectOption]` composes `KjVariant`/`KjSize`
  defaulting from the root's signals via `KJ_CASCADE_SELECT`.
- **Sizes.** `KjSize` on the trigger and on each option (`sm`/`md`/`lg`).
  Default option size flows from the trigger's size.
- **States.** `kjDisabled` on root → trigger disabled, panel does not open.
  `kjReadonly` mirrors `KjSelect`. `kjInvalid` mirrors. Per-option
  `kjDisabled` skips that option in keyboard nav and prevents sub-panel open
  (same as Dropdown Menu).
- **Anchored positioning.** Root panel: same as `KjSelect` — `kjSide`,
  `kjAlign`, `kjOffset`, `kjAvoidCollisions`, `kjMatchTriggerWidth`. **Sub-panels**:
  default `side='right'`, `align='start'`, `offset=0`. On collision (sub-panel
  would extend past the viewport), flip to `side='left'` (same Anchor
  primitive). RTL: defaults flip — root remains `side='bottom'`; sub-panels
  default `side='left'`. Same Anchor primitive consumes `dir` from
  `KjDirectionality`.
- **Open/close behaviour.** Root open: same as `KjSelect`. Sub-panel open:
  - Hover after `kjSubPanelOpenDelayMs` (default `100`) — matches
    `kjSubmenuOpenDelayMs` from Dropdown Menu.
  - Click on a sub-trigger option (when it has children).
  - `ArrowRight` on a focused/active sub-trigger option (RTL: ArrowLeft).
  - `Enter` / `Space` on a sub-trigger option.
  - Sub-panel close: ArrowLeft (RTL: ArrowRight), Escape (closes only the
    deepest sub-panel), focus crossing into a sibling at the parent level
    (auto-closes the previously-open sub-panel), root panel close.
- **Type-ahead.** Per-level buffer. Multi-character debounced (`kjTypeaheadDebounceInterval`,
  default `200ms` — same value as `KjSelect`). Buffer **resets on level
  crossing** (entering or leaving a sub-panel) — matches Dropdown Menu's
  "buffer resets on focus crossing scope boundary". When the trigger is
  focused (panel closed), type-ahead **does not advance the value** (unlike
  `KjSelect`) — there is no obvious target value when the user hasn't
  navigated to a leaf yet, and partially-matched leaf paths would mislead.
  Document explicitly.
- **`compareWith`.** `kjCompareWith` from `KjSelect` is reused. Used for
  selected-leaf comparison and for the path-tracking equality checks
  (when a parent option's children contain the selected leaf, the parent
  reflects `data-active-path="true"`).
- **Path tracking.** `kjCascadePath: model<readonly T[]>([])` — two-way
  bindable. Setting `kjCascadePath` programmatically opens the sub-panels
  along the path and sets the active descendant at each level. Reading
  `kjCascadePath` after a leaf selection yields the chain `[rootValue,
  level1Value, ..., leafValue]`. Independent of `kjValue` (which is the
  leaf-only value).
- **`clearable`.** Inherited. Clearing resets `kjValue` to `null` and
  `kjCascadePath` to `[]`.
- **Placeholder.** Inherited from `KjSelect`. `[kjCascadeSelectValue]`
  slot resolves to the leaf label by default; when `kjValue == null`, the
  placeholder renders.
- **Native form participation (`kjName`).** Inherited. Object-valued leaf
  values are still skipped silently (same caveat as `KjSelect`).
- **Lazy children.** As above (Decision 5). `kjLevelExpand: output<{ path:
  readonly T[], parent: KjCascadeOption<T> | null }>` fires whenever a
  sub-panel is about to open with no pre-loaded children. Root level fires
  with `parent: null`.
- **Sub-panel hover delay.** `kjSubPanelOpenDelayMs: input<number>(100)` and
  `kjSubPanelCloseDelayMs: input<number>(300)` — close delay prevents the
  flyout from snapping shut when the user's pointer briefly leaves a
  sub-panel en route to its child sub-panel. Material's submenu uses the
  same numbers.
- **RTL.** Inherited. Sub-panel default side flips (`'right'` → `'left'`)
  via `KjDirectionality`. Keyboard ArrowRight/ArrowLeft *swap roles* in RTL —
  this is the only directionally-sensitive keyboard behaviour, and it is
  resolved at the chain controller, not at each option's keydown handler.

## Accessibility (WCAG 2.1 AAA)

### Roles + ARIA wiring

| Element                                | Role                                | Attributes                                                                                                                                                                                                                                                          |
| -------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[kjCascadeSelect]` (root configurator) | none                                | none — state container.                                                                                                                                                                                                                                              |
| `[kjSelectTrigger]` (reused, in cascade context) | `combobox`                | `aria-haspopup="tree"` (overridden from `"listbox"` when `KJ_CASCADE_SELECT` in scope), `aria-expanded`, `aria-controls="<root panel id>"`, `aria-activedescendant="<deepest active option id>"` (only when a panel in the chain is open). All other trigger ARIA inherited from `KjSelectTrigger`. |
| `[kjCascadeSelectPanel]` (root panel)  | `tree`                              | `id="<root panel id>"`, `aria-orientation="horizontal"`, `aria-multiselectable="false"`, `aria-labelledby="<trigger id>"`, `tabindex="-1"`, `data-side`, `data-align`, `data-state="open|closed"`, `[hidden]` when closed.                                            |
| `[kjCascadeSelectSubPanel]`            | `group`                             | `id="<sub panel id>"`, `aria-orientation="horizontal"`, `aria-labelledby="<owner option id>"`, `tabindex="-1"`, `data-side`, `data-align`, `data-state="open|closed"`, `data-level="N"` (1-indexed), `[hidden]` when closed, `aria-busy="true"` while lazy-loading.    |
| `[kjCascadeSelectOption]` (leaf)       | `treeitem`                          | `id` (auto-minted), `aria-level="N"`, `aria-setsize="M"`, `aria-posinset="K"`, `aria-selected="true|false"` (true when the option is the selected leaf and `compareWith` matches), `aria-disabled`, `tabindex="-1"`, `data-active`, `data-selected`, `data-disabled`, `data-leaf="true"`. |
| `[kjCascadeSelectOption]` (sub-trigger / branch) | `treeitem`                | All of the leaf attributes, plus: `aria-haspopup="tree"`, `aria-expanded="true|false"` (mirrors whether its sub-panel is open), `aria-owns="<sub panel id>"` (only when sub-panel is open — APG allows omitting when collapsed), `data-leaf="false"`, `data-active-path="true|false"` (theme hook for highlighting the path-to-selection). |
| `[kjCascadeSelectItemIndicator]`       | none                                | `aria-hidden="true"`, `[hidden]` when option is not the selected leaf (or, optionally, when the option is not on the active path — see `kjIndicatorMode` input).                                                                                                       |
| `[kjCascadeSelectChevron]`             | none                                | `aria-hidden="true"`, `[hidden]` when option has no children (i.e. is a leaf).                                                                                                                                                                                       |
| `[kjCascadeSelectValue]` (in trigger)  | none                                | Renders the leaf label, the path, or projected content. No ARIA — accessible name is on the trigger.                                                                                                                                                                 |

The trigger's `aria-haspopup="tree"` resolution is dynamic: the existing
`[kjSelectTrigger]` queries the optional `KJ_CASCADE_SELECT` token and, when
present, swaps the host binding. Same pattern as `KjMultiSelectContent`'s
`aria-multiselectable` swap.

### Keyboard contract

Source: [WAI-ARIA APG Tree Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) +
[Combobox-with-tree-popup variant](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) +
the kouji Dropdown Menu submenu chain
([`actions/dropdown-menu.md`](../actions/dropdown-menu.md) keyboard table).

| Key                          | When focus is on…                  | Behaviour                                                                                                                                |
| ---------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Enter` / `Space` / `Alt+ArrowDown` / `ArrowDown` | Trigger (closed)            | Open root panel. Active treeitem at level 1: the root option on the active path (if any), else the first focusable.                       |
| `ArrowUp`                    | Trigger (closed)                   | Open root panel. Active: last focusable at level 1.                                                                                       |
| `F4`                         | Trigger                            | Toggle open/close (per APG combobox).                                                                                                     |
| Printable char               | Trigger (closed)                   | **No-op for cascade** (unlike `KjSelect` — there is no obvious target leaf without a navigated path; documented divergence).                |
| `ArrowDown` / `ArrowUp`      | Option at any level                | Move active treeitem within the *current level*. Wraps if `kjLoop` (default `false`); skips disabled.                                       |
| `Home` / `End`               | Option at any level                | First / last focusable option in the current level.                                                                                        |
| `PageUp` / `PageDown`        | Option at any level                | Jump 10 options up/down in the current level.                                                                                              |
| `ArrowRight` (LTR) / `ArrowLeft` (RTL) | Sub-trigger option (collapsed) | Expand: open its sub-panel + move active to first focusable in the new sub-panel.                                                  |
| `ArrowRight` (LTR) / `ArrowLeft` (RTL) | Sub-trigger option (expanded)  | Move active to first focusable in its sub-panel.                                                                                  |
| `ArrowRight` (LTR) / `ArrowLeft` (RTL) | Leaf option                | No-op (per APG tree).                                                                                                                  |
| `ArrowLeft` (LTR) / `ArrowRight` (RTL) | Option at level ≥ 2        | Close the current sub-panel, return active to the parent sub-trigger option in the level above.                                     |
| `ArrowLeft` (LTR) / `ArrowRight` (RTL) | Option at level 1 (sub-trigger, collapsed) | No-op (already at level 1, parent is the trigger).                                                                  |
| `ArrowLeft` (LTR) / `ArrowRight` (RTL) | Option at level 1 (sub-trigger, expanded) | Collapse: close its sub-panel, keep active on the option.                                                            |
| `Enter` / `Space`            | Sub-trigger option                 | Same as `ArrowRight` (LTR). Toggling open/close on `Enter`/`Space` for a sub-trigger matches APG and the Dropdown Menu sub-trigger contract. |
| `Enter` / `Space`            | Leaf option                        | Confirm: commit value, set `kjCascadePath`, close the entire chain, restore focus to trigger. **Space does not insert a space** (per APG). |
| `*` (asterisk)               | Option at any level                | Expand all sub-trigger options at the current level (per APG tree). Each newly-opened sub-panel does **not** auto-focus — only the originating option keeps active. (This is a power-user shortcut; usefulness in cascade is debatable. Ship for APG conformance.) |
| Printable char               | Option at any level                | Move active to next match within the current level. Buffer resets on level crossing.                                                       |
| `Escape`                     | Option at level ≥ 2                | Close the current sub-panel only, return active to parent sub-trigger.                                                                     |
| `Escape`                     | Option at level 1                  | Close the entire chain (root panel + all sub-panels), restore focus to trigger.                                                            |
| `Tab` / `Shift+Tab`          | Option at any level                | Close the entire chain, do not commit selection (active option is not the same as selected leaf), let Tab continue. `kjClosed` emits `'tab'`. |
| `Alt+ArrowUp`                | Option at any level                | Same as `Escape` at level 1 — close entire chain.                                                                                          |

The keyboard handler lives in a shared `KjCascadeChainController` (internal)
that the panel and each sub-panel delegate into. The controller owns:

- the chain state (`Level[]`),
- the active descendant per level,
- focus restoration on close,
- the typeahead buffer (per-level, reset on level crossing),
- the RTL flip resolution (called once per keydown: "is this the
  enter-sub direction or the exit-sub direction in current `dir`?").

Per-level focus uses `aria-activedescendant` (not roving tabindex).
**Only the deepest open panel** has DOM focus at any time; its
`aria-activedescendant` points at that level's active option. When
`ArrowLeft` (LTR) collapses a level, DOM focus moves to the parent panel
(the one above) and that panel's `aria-activedescendant` updates. Implemented
via `el.focus()` calls on panel elements only — never on options. Same
trade-off as `KjSelect`: matches Material/PrimeNG and the APG combobox
example, mismatches Radix's roving-tabindex stance.

### Focus management

- **Opening from the trigger** focuses `[kjCascadeSelectPanel]` (the root
  panel takes DOM focus); `_activeIdLevel0` is set to the path's level-0
  option (when `kjCascadePath` is non-empty) or the first focusable.
- **Auto-restore the path on open.** When `kjCascadePath` is non-empty, all
  sub-panels along the path open immediately and DOM focus moves to the
  *deepest* panel. This preserves "where I left off" UX for users who
  reopen the picker after a partial selection.
- **Leaf activation** closes the chain, commits the value (`kjValueChange`
  emits) and the path (`kjCascadePathChange` emits), restores focus to the
  trigger.
- **Sub-trigger activation** moves DOM focus to the newly-opened sub-panel
  and updates its `aria-activedescendant`. The previously-focused panel's
  `aria-activedescendant` is *not cleared* — it retains the sub-trigger
  option as active, so `ArrowLeft` returns the user there.
- **Click outside** closes the chain. Selection is not committed; path is
  not updated. Focus is not restored (matches `KjSelect` and Dropdown Menu).
- **No focus trap** — cascade is non-modal. Modal cascade is out of scope.

### Touch target ≥ 44×44 (WCAG 2.5.5)

- **Trigger:** `KjSize.md` ≥ 44×44, inherited from `KjSelect`.
- **Each option:** ≥ 44×44 at `md`. Sub-trigger options carry a trailing
  chevron — the chevron is decorative (not a separate focusable button), so
  the entire option row is the hit area; padding handles the 44px floor.
- **Sub-panel mounts:** sub-panels themselves are not interactive surfaces
  (rows inside them are); no min-size constraint on the panel.

### Color / contrast

Wrapper / theme concern. The cascade introduces one new contrast contract
**beyond `KjSelect`**: the **active-path highlight** on sub-trigger options
along the chain to the current selection (`data-active-path="true"`). Themes
must hit ≥ 3:1 against the option background (WCAG 1.4.11). Themes also own
the chevron contrast (≥ 3:1 against background) and the sub-panel's own
border/shadow contrast against the underlying surface.

### Live region announcements

- **Leaf selection.** Announce the full path on commit: `"<level 1 label>,
  <level 2 label>, …, <leaf label> selected"`. Single concatenated polite
  announcement via `KjLiveRegion`. Without this, AT only re-announces the
  trigger's text content (the leaf label), losing the user's *path* —
  which is the cascade-specific information.
- **Sub-panel open** announces the parent option's label plus level info:
  `"<parent label>, level <N>, expanded"`. APG-aligned.
- **Lazy-load wait** announces `"Loading…"` when `aria-busy="true"` flips
  on, and `"<N> options loaded"` (assertive but debounced) when content
  resolves.

### Reduced motion

Wrapper concern. Sub-panels animate in by default (slide-from-left, fade);
under `prefers-reduced-motion: reduce` themes drop to instant show/hide.
Core only reflects `data-state="open|closed"`.

### `aria-required`, `aria-invalid`, `aria-describedby`

All three flow through `KjFormControl` + `KJ_FIELD` exactly as on `KjSelect`.
Trigger receives the chain; root panel and sub-panels do not. Same rationale
("describedby lives on the labelled control, not the popup") applies.

## Composition model

```text
cascade-select/
  cascade-select.ts                 ← KjCascadeSelect (root configurator; composes KjSelect via hostDirectives)
  cascade-select-panel.ts           ← KjCascadeSelectPanel (root panel, role="tree")
  cascade-select-sub-panel.ts       ← KjCascadeSelectSubPanel (level ≥ 1 panel, role="group")
  cascade-select-option.ts          ← KjCascadeSelectOption (treeitem; leaf or sub-trigger)
  cascade-select-value.ts           ← KjCascadeSelectValue (slot in trigger; default leaf-label, optional path renderer)
  cascade-select-item-indicator.ts  ← KjCascadeSelectItemIndicator (slot in option)
  cascade-select-chevron.ts         ← KjCascadeSelectChevron (slot in sub-trigger option)
  cascade-select.context.ts         ← KJ_CASCADE_SELECT + KjCascadeSelectContext
  cascade-chain-controller.ts       ← internal chain state + keyboard delegate
  cascade-select.example.ts
  cascade-select.lazy.example.ts
  cascade-select.path-trigger.example.ts
  cascade-select.field.example.ts
  cascade-select.reactive.example.ts
  cascade-select.spec.ts
  index.ts
```

The folder is a peer of `select/`, not a child — it depends on `select/` via
`hostDirectives` composition but does not subclass it.

### Shared state — `KjCascadeSelectContext`

```ts
export interface KjCascadeNode<T = unknown> {
  /** The node's value. Leaves commit this; branches use it for path tracking. */
  readonly value: T;
  /** The node's display label (used by typeahead and trigger fallback). */
  readonly label: string;
  /** Whether the node is disabled. */
  readonly disabled?: boolean;
  /** Children. Empty/undefined → leaf. Function → lazy children. */
  readonly children?: readonly KjCascadeNode<T>[] | (() => Promise<readonly KjCascadeNode<T>[]>);
}

export interface KjCascadeChainLevel<T = unknown> {
  /** Stable id of this level's panel (root panel for level 0, sub-panel otherwise). */
  readonly panelId: string;
  /** The id of the parent option that owns this sub-panel (null for root level). */
  readonly ownerOptionId: string | null;
  /** The currently active-descendant option id at this level. */
  readonly activeOptionId: Signal<string | null>;
  /** Options registered at this level, in DOM (registration) order. */
  readonly options: Signal<readonly KjCascadeOption<T>[]>;
  /** True while lazy children are being resolved. */
  readonly isLazyLoading: Signal<boolean>;
  /** The path of values from root down to (and excluding) this level. */
  readonly pathPrefix: Signal<readonly T[]>;
}

export interface KjCascadeSelectContext<T = unknown> {
  /** Re-export of KjSelect's value contract for ergonomics. */
  readonly value: Signal<T | null | undefined>;
  /** The path of values from root to selected leaf (inclusive). */
  readonly path: Signal<readonly T[]>;
  /** All currently-open levels (length 1+ when root is open). */
  readonly chain: Signal<readonly KjCascadeChainLevel<T>[]>;
  /** compareWith from the parent KJ_SELECT. */
  readonly compareWith: Signal<(a: T, b: T) => boolean>;
  /** Sub-panel hover open delay (ms). */
  readonly subPanelOpenDelayMs: Signal<number>;
  /** Sub-panel hover close delay (ms). */
  readonly subPanelCloseDelayMs: Signal<number>;
  /** Lazy mode flag. */
  readonly lazy: Signal<boolean>;
  /** Resolved direction. */
  readonly dir: Signal<'ltr' | 'rtl'>;

  /** A panel registers itself on construction. */
  registerPanel(args: {
    panelId: string;
    ownerOptionId: string | null;
    levelIndex: number;
  }): { deregister: () => void };

  /** An option registers itself on construction with its level + parent. */
  registerOption(opt: KjCascadeOption<T>): { deregister: () => void };

  /** Open the sub-panel owned by the given option. */
  openSubPanel(ownerOptionId: string, opts?: { focus?: boolean }): void;
  /** Close the sub-panel owned by the given option (and any descendants). */
  closeSubPanel(ownerOptionId: string): void;
  /** Close all panels at level ≥ N (i.e. trim the chain). */
  trimChain(toLevel: number): void;

  /** Commit a leaf selection. Closes the chain, restores focus. */
  selectLeaf(value: T, path: readonly T[]): void;
  /** Set active descendant for a given level. */
  setActive(levelIndex: number, optionId: string | null): void;
  /** Notify lazy load started/completed for a level. */
  setLazyLoading(levelIndex: number, loading: boolean): void;
  /** Replace a level's options (after lazy-load resolves). */
  setLevelOptions(levelIndex: number, options: readonly KjCascadeNode<T>[]): void;
}

export const KJ_CASCADE_SELECT = new InjectionToken<KjCascadeSelectContext>('KjCascadeSelect');
```

`KjCascadeSelect` itself implements both `KJ_CASCADE_SELECT` and (via
composed `KjSelect`) `KJ_SELECT`. Options at any level inject `KJ_CASCADE_SELECT`
(required) and ignore `KJ_SELECT` (the cascade's option directive supersedes
`[kjSelectOption]`).

### `hostDirectives` composition

- `[kjCascadeSelect]` (root configurator):
  - `KjSelect` (composed — re-exposes value, open, disabled, readonly,
    invalid, compareWith, clearable, name, placeholder, side, align, offset,
    matchTriggerWidth, ariaLabel, ariaLabelledby).
  - **Adds** the cascade-only inputs (`kjCascadePath`, `kjCascadeLazy`,
    `kjSubPanelOpenDelayMs`, `kjSubPanelCloseDelayMs`, indicator-mode).
- `[kjSelectTrigger]` (reused, unchanged):
  - All host directives from `KjSelect`'s analysis (KjVariant, KjSize,
    KjFocusRing, KjDisabled, KjAriaDescribedBy).
  - Reads `KJ_CASCADE_SELECT` optionally; when present, switches
    `aria-haspopup` to `"tree"` and the open seed to "deepest active
    option in path or first option at level 0".
- `[kjCascadeSelectPanel]`:
  - `KjAnchor` (shared anchor primitive — same one `KjSelectContent` uses).
  - **No** `KjFocusTrap` (non-modal).
  - Inline keyboard handler delegating to `KjCascadeChainController`.
- `[kjCascadeSelectSubPanel]`:
  - `KjAnchor` (anchored to its owner option, default side `'right'`).
  - Inline keyboard handler delegating to the same chain controller.
- `[kjCascadeSelectOption]`:
  - `KjVariant` (default from cascade context → from KJ_SELECT).
  - `KjSize` (same).
  - `KjDisabled` (input alias `kjDisabled`).
  - **No** `KjFocusRing` — options never receive DOM focus
    (`aria-activedescendant` model). Themes draw the active state via
    `data-active`.
  - Hover-listener-helper to coordinate with the chain controller's
    `subPanelOpenDelayMs` / `closeDelayMs` timers.
- `[kjCascadeSelectValue]`, `[kjCascadeSelectItemIndicator]`,
  `[kjCascadeSelectChevron]`:
  - No host directives. Pure ARIA + signal wiring.

### `KJ_FIELD` integration

Same as `KjSelect`. `KjCascadeSelect` does not register with `KJ_FIELD`
itself — the composed `KjSelect` already does. The trigger is the labelled
element; the field's `for=` resolves to `aria-labelledby` (the trigger is a
`<button>`, not an `<input>`); `aria-describedby` flows onto the trigger
from `KjAriaDescribedBy`.

### Cross-component pointers

- **[`data-input/select.md`](./select.md)** — Cascade Select **is a
  configuration of `KjSelect`**, not a sibling root. The trigger, value
  contract, anchor, form-control wiring, clearable, placeholder, compareWith,
  name (native postback), and field integration are inherited verbatim. The
  rename of `[kjOption]` → `[kjSelectOption]` (Select Open Question 2) does
  **not** cascade here — `[kjCascadeSelectOption]` is a parallel directive
  with its own selector. The wrapper rename pass (Open Question 3) applies
  identically: `<kj-cascade-select>` and `<kj-cascade-option>` ship with
  `kj`-prefixed inputs from day one.
- **[`data-input/multi-select.md`](./multi-select.md)** — Multi Select shares
  the *array-valued root* and the *select-all* idiom. Cascade Select is
  **single-leaf** — there is no multi-cascade in scope for v1
  (PrimeNG ships `<p-cascadeSelect>` only in single mode; multi-leaf cascade
  with cumulative selection across levels is its own design problem).
  The shared selection-model primitive (`KjSelectionModel`) is **not**
  consumed by Cascade Select — leaf selection is a single `T | null` set
  directly on the composed `KjSelect`.
- **[`data-input/combobox.md`](./combobox.md)** — Combobox is the
  *filterable* cousin of Select. A *filterable cascade* (typing narrows
  visible nodes at each level) is a real but out-of-scope use case for v1;
  defer to a future `KjCascadeCombobox` that composes `KjCascadeSelect` +
  `KjComboboxInput`. Document the gap; do not pre-build.
- **[`data-input/tree-select.md`](./tree-select.md)** — Tree Select is a
  **sibling** that shares the data shape (`{ label, value, children? }[]`)
  but with a fundamentally different UX: the entire tree is visible at once
  with branch expand/collapse inline (single panel, vertical layout,
  indented), and selection can be on any node (not leaf-only) with optional
  cascading children-select semantics. Tree Select uses `role="tree"` on
  the panel like Cascade Select does, but the `treeitem` rows are
  DOM-nested under their parent (no `aria-owns` flyout chain). The two
  share **the data type** (`KjTreeNode<T>` and `KjCascadeNode<T>` should be
  the same interface, defined once in `packages/core/src/primitives/tree/node.ts`)
  and **the lazy-load contract** (`kjLevelExpand` output shape). The two do
  **not** share panel/option directives — flyout-chain rendering and
  inline-tree rendering are too different to merge.
- **[`actions/dropdown-menu.md`](../actions/dropdown-menu.md)** — Dropdown
  Menu's submenu chain (`[kjDropdownMenuTriggerFor]` nested in
  `[kjMenuContent]`, ArrowRight/ArrowLeft, hover delays, `kjSubmenuOpenDelayMs`)
  is the **direct keyboard-and-focus model**. Cascade Select copies the
  shape — same delay defaults (100ms open, 300ms close), same focus-restoration
  contract (deepest sub-panel owns DOM focus, parent panels retain
  `aria-activedescendant` for back-out), same chain auto-close on sibling
  activation. The two implementations should share an internal *submenu
  chain primitive* — `KjFlyoutChainController` — extracted from the current
  Dropdown Menu code and reused here. (Implementation note: this primitive
  does not yet exist; both analyses assume its extraction. Track as a
  cross-cutting blocker.) ARIA roles differ — menu uses `role="menu"` /
  `role="menuitem"`, cascade uses `role="tree"` / `role="treeitem"` — but
  the *flyout-chain mechanics* are identical.
- **[`actions/popover.md`](../actions/popover.md)** — `KjAnchor` primitive.
  The root panel + every sub-panel each consume an independent
  `KjAnchor` instance (root anchored to trigger; each sub-panel anchored to
  its owner option). Same blocker as Select's: until `KjAnchor` lands, ship
  `data-side` / `data-align` reflection only and rely on theme CSS.
- **[`data-input/field.md`](./field.md)** — Field integration is inherited
  from `KjSelect`. Cascade Select is a composite control from Field's
  perspective; Field flows describedby / required / invalid onto the trigger.
- **[`primitives/forms/form-control.ts`](../../packages/core/src/primitives/forms/form-control.ts)** —
  Reused from `KjSelect`. Touch fires on trigger blur. Setting the value
  programmatically (via `formCtrl.setValue(leafValue)`) auto-resolves the
  path: the cascade scans the registered tree for the matching leaf
  (`compareWith`-aware) and sets `kjCascadePath` accordingly. If the leaf
  is not found in the registered tree (lazy-loaded sub-trees not yet
  hydrated), the path is set to `[leafValue]` and the trigger displays the
  leaf label only; opening the panel triggers lazy-loads along the
  consumer-supplied initial path (out of scope for v1 — document as Open
  Question).
- **[`feedback/live-region.md`](../feedback/)** — `KjLiveRegion` for path
  announcements on commit and lazy-load status.
- **[`primitives/tree/node.ts`](../../packages/core/src/primitives/tree/)** —
  *Proposed.* Shared `KjTreeNode<T>` interface used by both Cascade Select
  and Tree Select. Defines the `{ value, label, disabled?, children? }`
  shape and the lazy-children function overload.

## Inputs / Outputs / Models — `kj`-prefixed

### `[kjCascadeSelect]` (root configurator — composes `KjSelect`)

The composed `KjSelect` re-exposes its full surface (see
[`select.md`](./select.md)). The cascade-only additions:

| Member                       | Kind   | Type                                                                                                       | Default     | Notes                                                                                                                                                                  |
| ---------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kjCascadePath`              | model  | `readonly T[]`                                                                                             | `[]`        | Two-way bindable. Setting it programmatically opens sub-panels along the path on next open. Reading after a leaf selection returns `[level0Value, ..., leafValue]`.    |
| `kjCascadeLazy`              | input  | `boolean`                                                                                                  | `false`     | When `true`, all levels except the root are assumed lazy unless an option ships its own resolved `[kjCascadeChildren]`.                                                |
| `kjSubPanelOpenDelayMs`      | input  | `number`                                                                                                   | `100`       | Hover-to-open delay on sub-trigger options. `0` for click-only. Matches `kjSubmenuOpenDelayMs` from Dropdown Menu.                                                      |
| `kjSubPanelCloseDelayMs`     | input  | `number`                                                                                                   | `300`       | Hover-out-to-close delay; prevents flicker when traversing the flyout chain.                                                                                            |
| `kjIndicatorMode`            | input  | `'leaf' \| 'path' \| 'none'`                                                                               | `'leaf'`    | Controls which options render `[kjCascadeSelectItemIndicator]`: `'leaf'` only on the selected leaf, `'path'` on every option along the active path, `'none'` never.    |
| `kjLoop`                     | input  | `boolean`                                                                                                  | `false`     | Per-level wrap-around. Inherited semantics from Select but applies *per level*.                                                                                          |

| Output                       | Kind   | Payload                                                                                          | Notes                                                                                                                                |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `kjCascadePathChange`        | output | `readonly T[]`                                                                                   | Paired with `kjCascadePath` model. Emits on leaf commit only — *not* on every sub-panel open (which is panel-state, not selection).   |
| `kjLevelExpand`              | output | `{ levelIndex: number, path: readonly T[], parent: KjCascadeOption<T> \| null }`                | Fires when a sub-panel is about to open with no pre-loaded children. Consumer's hook for lazy children.                              |
| `kjLevelChange`              | output | `{ levelIndex: number, activeValue: T \| null }`                                                 | Fires when active descendant moves *across* level changes (entering/leaving sub-panels). PrimeNG calls this `onGroupChange`.          |

The composed `kjValueChange` from `KjSelect` continues to emit the **leaf
value only** on commit. Consumers wanting the path bind `kjCascadePathChange`.

### `[kjCascadeSelectPanel]`

No public inputs/outputs. Reads `KJ_CASCADE_SELECT`. Owns the root panel
ARIA, anchored positioning, and the level-0 keyboard handler delegating to
the chain controller.

### `[kjCascadeSelectSubPanel]`

| Member                       | Kind   | Type                                                                | Default      | Notes                                                                                                |
| ---------------------------- | ------ | ------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| `kjSide`                     | input  | `'top' \| 'right' \| 'bottom' \| 'left'`                            | from context | Override per-instance side. Default `'right'` (LTR) / `'left'` (RTL) is resolved by the controller.   |
| `kjAlign`                    | input  | `'start' \| 'center' \| 'end'`                                      | `'start'`    |                                                                                                      |
| `kjOffset`                   | input  | `number`                                                            | `0`          | Sub-panels typically have zero offset (their visual border meets the parent panel's).                 |

No outputs. The sub-panel is a structural projection target; consumers
populate it with `[kjCascadeSelectOption]` rows.

### `[kjCascadeSelectOption]`

| Member                       | Kind   | Type                                                                                                                         | Default     | Notes                                                                                                                                                                                                                              |
| ---------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kjValue`                    | input  | `T`                                                                                                                          | required    | The node's value. For sub-trigger options (with children), this is used for path tracking. For leaves, this is the value committed on selection.                                                                                    |
| `kjLabel`                    | input  | `string`                                                                                                                     | from text   | Display label used by typeahead and by `[kjCascadeSelectValue]`'s default leaf-label rendering. Defaults to `el.textContent?.trim()`.                                                                                              |
| `kjDisabled`                 | input  | `boolean`                                                                                                                    | `false`     | Forwarded to `KjDisabled`.                                                                                                                                                                                                        |
| `kjVariant`                  | input  | `KjVariant`                                                                                                                  | from ctx    |                                                                                                                                                                                                                                    |
| `kjSize`                     | input  | `KjSize`                                                                                                                     | from ctx    |                                                                                                                                                                                                                                    |
| `kjCascadeChildren`          | input  | `readonly KjCascadeNode<T>[] \| (() => Promise<readonly KjCascadeNode<T>[]>) \| undefined`                                  | `undefined` | When provided, the option becomes a sub-trigger. Promise-returning functions trigger lazy-loading. **Alternative:** declare children as projected `[kjCascadeSelectOption]` rows inside an inline `[kjCascadeSelectSubPanel]`.       |

| Output                       | Kind   | Payload                            | Notes                                                                                                                |
| ---------------------------- | ------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `kjSelect`                   | output | `T`                                | Convenience event on leaf activation. Consumers usually bind `(kjValueChange)` on the root.                           |

The directive determines leaf-vs-branch by checking, in order:
1. `kjCascadeChildren` input (if set, branch).
2. Projected `[kjCascadeSelectSubPanel]` content child (if present, branch).
3. Otherwise, leaf.

Two authoring modes:

```html
<!-- Mode 1: declarative — children projected as <kj-cascade-option> rows -->
<kj-cascade-option [kjValue]="us" kjLabel="USA">
  <kj-cascade-sub-panel>
    <kj-cascade-option [kjValue]="ca" kjLabel="California">
      <kj-cascade-sub-panel>
        <kj-cascade-option [kjValue]="sf" kjLabel="San Francisco" />
        <kj-cascade-option [kjValue]="la" kjLabel="Los Angeles" />
      </kj-cascade-sub-panel>
    </kj-cascade-option>
  </kj-cascade-sub-panel>
</kj-cascade-option>

<!-- Mode 2: data-driven — children as input -->
<kj-cascade-option
  *ngFor="let country of countries"
  [kjValue]="country.code"
  [kjLabel]="country.name"
  [kjCascadeChildren]="country.states" />
```

Mode 2 internally creates the sub-panel and child options on demand
(equivalent to the declarative form). Both modes coexist; the data-driven
form is sugar over the declarative one.

### `[kjCascadeSelectValue]` (slot in trigger)

| Member                       | Kind   | Type                                                          | Default     | Notes                                                                                                       |
| ---------------------------- | ------ | ------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `kjCascadePlaceholder`       | input  | `string`                                                      | `''`        | Falls back to `KjSelect.kjPlaceholder` when not set.                                                         |
| `kjCascadePathSeparator`     | input  | `string`                                                      | `' / '`     | When the slot has no projected content, the default rendering is `path.map(label).join(separator)` — when `kjIndicatorMode='leaf'`, just the leaf label; otherwise the full path. |

When the consumer projects `<ng-content>`, that content takes over (with
the `KjCascadeSelectContext.path()` available via DI for breadcrumb-style
rendering). When the consumer doesn't project, the default renders the leaf
label (matches `KjSelect`).

### `[kjCascadeSelectItemIndicator]`

No public inputs/outputs. `[hidden]="!shouldShow()"` where `shouldShow`
depends on `KJ_CASCADE_SELECT.kjIndicatorMode()`:
- `'leaf'`: shown only when the option is the selected leaf.
- `'path'`: shown when the option is anywhere on the active path.
- `'none'`: never.

### `[kjCascadeSelectChevron]`

No public inputs/outputs. `[hidden]="parentOption.isLeaf()"`.

### Wrapper components (`@kouji-ui/components`)

- **`<kj-cascade-select>`** — host-directive composes `KjCascadeSelect`.
  Re-exposes the inherited `KjSelect` inputs (`kjValue`, `kjOpen`,
  `kjDisabled`, `kjReadonly`, `kjInvalid`, `kjPlaceholder`, `kjVariant`,
  `kjSize`, `kjClearable`, `kjName`, `kjCompareWith`, `kjAriaLabel`) plus
  the cascade-only additions (`kjCascadePath`, `kjCascadeLazy`,
  `kjSubPanelOpenDelayMs`, `kjSubPanelCloseDelayMs`, `kjIndicatorMode`,
  `kjLoop`). Renders the trigger button + caret + (when `kjClearable`) clear
  button, plus the root panel via projected `<ng-content>`.
- **`<kj-cascade-option>`** — host-directive composes `KjCascadeSelectOption`.
  Inputs: `kjValue` (required), `kjLabel`, `kjDisabled`, `kjCascadeChildren`.
  Renders projected text + a `<kj-icon kjCascadeSelectItemIndicator>` checkmark
  + a `<kj-icon kjCascadeSelectChevron>` `›` glyph (auto-hidden when leaf).
- **`<kj-cascade-sub-panel>`** — host-directive composes
  `KjCascadeSelectSubPanel`. No extra inputs.
- **No data-driven wrapper.** The data-driven authoring mode (Mode 2 above)
  uses the same `<kj-cascade-option>` element with `[kjCascadeChildren]`;
  no separate `<kj-cascade-data-source>` component is shipped.

## Examples to ship

1. **Default** — `cascade-select.example.ts`. Country → State → City (three
   levels), declarative mode. Two-way bound to `kjValue` (a city code).
2. **Path output** — `cascade-select.path.example.ts`. Same data, binds
   `(kjCascadePathChange)` and renders a breadcrumb above the trigger
   showing the path.
3. **Path-rendered trigger** — `cascade-select.path-trigger.example.ts`.
   Same data, projects a custom `<span kjCascadeSelectValue>` that renders
   `"USA / CA / San Francisco"` instead of just `"San Francisco"`.
4. **Lazy children** — `cascade-select.lazy.example.ts`. Top-level
   countries pre-loaded; states + cities loaded on `kjLevelExpand` from a
   mock API. Demonstrates `aria-busy` rendering during the wait.
5. **Data-driven** — `cascade-select.data-driven.example.ts`. Same data
   as #1 but using `[kjCascadeChildren]` in `<kj-cascade-option>` rather
   than projected `<kj-cascade-sub-panel>`. Same output, smaller markup.
6. **Reactive form** — `cascade-select.reactive.example.ts`. Bound via
   `[formControl]` with `Validators.required`, error message via
   `<kj-field-error>`, touched-gated `aria-invalid`. Demonstrates that
   programmatic `formCtrl.setValue('sf')` auto-resolves the path.
7. **Inside a Field** — `cascade-select.field.example.ts`. Wrapped in
   `<div kjField>` with `<label kjFieldLabel>` and a hint. Demonstrates
   the composite-control id flow (label → trigger via `aria-labelledby`).
8. **Disabled options** — `cascade-select.disabled.example.ts`. Per-option
   `kjDisabled` (e.g. "Antarctica" is shown but disabled at level 0). Whole
   cascade disabled.
9. **`compareWith`** — `cascade-select.compare-with.example.ts`. Object-valued
   nodes (`{ id, name }`) with `[kjCompareWith]="(a, b) => a?.id === b?.id"`.
10. **Clearable** — `cascade-select.clearable.example.ts`. `kjClearable`
    showing the inline clear button and the path reset on clear.
11. **RTL** — `cascade-select.rtl.example.ts`. `dir="rtl"` ancestor; sub-panels
    flow leftward; ArrowLeft/ArrowRight roles swap.
12. **Path indicator mode** — `cascade-select.indicator-path.example.ts`.
    `kjIndicatorMode="path"` showing checkmarks on every option along the
    active path (vs the default leaf-only).
13. **Variants + sizes** — `cascade-select.variants.example.ts`. `default`
    / `filled` / `ghost` triggers in `sm` / `md` / `lg`.

## Open questions / risks

1. **Flyout chain primitive extraction.** The Dropdown Menu submenu chain
   logic (hover-open delay, hover-out-close delay, sibling auto-close,
   focus restoration on chain pop) is currently inline in
   `KjMenuContent`. Cascade Select needs the same logic verbatim. Extract a
   shared `KjFlyoutChainController` (internal, shared between
   `actions/dropdown-menu/` and `data-input/cascade-select/`). **Blocker
   on Cascade Select v0.** Fallback: copy-paste the logic; revisit when the
   second consumer (this) lands.

2. **Anchor primitive availability.** Same blocker as `KjSelect` Open
   Question 1 and Dropdown Menu Open Question 1. Each sub-panel needs its
   own `KjAnchor` instance with collision-aware flipping. Until `KjAnchor`
   lands, ship `data-side` / `data-align` reflection on each sub-panel and
   rely on theme CSS / Tailwind anchor utilities for the math.

3. **`role="tree"` vs nested `role="listbox"`.** Decision recorded above
   (use `role="tree"`). Risk: some screen readers (older NVDA) handle
   `combobox` + `aria-haspopup="tree"` worse than `combobox` +
   `aria-haspopup="listbox"`. Listbox-with-flyouts is not a real ARIA
   pattern though — picking listbox would require flattening the
   hierarchy or inventing a non-APG combination. **Stick with tree;
   monitor; fall back to a `[kjCascadeAriaPattern]="'menu' | 'tree'"`
   escape-hatch input if AT support proves unworkable.**

4. **Multi-level path resolution from external value.** When
   `formCtrl.setValue(leafValue)` runs and the cascade tree is fully
   in-memory, the path can be resolved synchronously (DFS through the
   registered nodes). When the tree is *partially lazy-loaded* (only level
   0 is hydrated, the leaf belongs to a sub-tree not yet loaded), we
   cannot resolve the full path without firing N `kjLevelExpand` events
   and waiting on each. **Decision for v1:** when the leaf is unfound in
   the registered tree, set `kjCascadePath = [leafValue]` (single-element
   path), trigger render shows the leaf label only, opening the panel
   does not auto-expand to the path. **Defer** the multi-step
   path-resolution-with-async-loads to v1.1; document.

5. **The `*` (asterisk) shortcut.** APG tree mandates "expand all sibling
   branches at the current level" on `*`. In a flyout chain, this means
   opening the sub-panels of *every* sibling sub-trigger at once — visually
   a cascade of overlapping panels off the current panel. Layout chaos.
   **Decision:** ship the keyboard handler (APG conformance) but document
   that the visual result is a UX hazard; default theming hides
   non-active sibling sub-panels via `data-active="false"` on the
   sub-panel root, with a `kjCascadeShowAllOnAsterisk` opt-in for the rare
   consumer who wants it. This is a corner case; spec it minimally and
   move on.

6. **Type-ahead at the trigger when closed.** `KjSelect` advances the
   selection on type-ahead while closed. For cascade, there is no obvious
   single-step target — typing `"S"` could mean "San Francisco", "Sacramento",
   "Seattle", or any of dozens of leaves at any level. **Decision:** type-ahead
   is a no-op when the trigger is focused and the panel is closed
   (documented divergence from `KjSelect`).

7. **Deep tree performance.** Trees with hundreds of nodes per level (city
   pickers with all 30k US ZIP codes at level 3) need virtualisation. Out
   of scope for v1. The shared `KjListboxNavigation` primitive (from Multi
   Select) does not virtualise. Document the limit (~500 options per
   level) and recommend `KjCombobox` (filterable) for large flat lists.

8. **Heterogeneous label keys per level.** PrimeNG's
   `optionGroupChildren: string[]` allows different children-keys per level
   (level 0's children-key is `'states'`, level 1's is `'cities'`). The
   compound model (projected `<kj-cascade-option>` rows) supports this
   trivially — each level is its own template with its own bindings. The
   data-driven `[kjCascadeChildren]` overload assumes a uniform
   `KjCascadeNode` shape; consumers with heterogeneous trees normalise
   first or use the projected mode.

9. **Sub-panel scrolling.** Each sub-panel has its own scroll container
   (independent of the root panel). Long sub-panels scroll vertically;
   `PageUp`/`PageDown` jump within the *current panel only*. No cross-panel
   scrolling.

10. **Mobile UX.** A flyout chain on a 320px-wide phone is broken — sub-panels
    don't fit. PrimeNG's mobile fallback is to render each level as a full-screen
    page-replace inside the same overlay (the "Command Palette" / cmdk
    pattern shadcn uses). **Decision:** v1 ships flyout-chain only.
    Consumers on mobile-first projects use chained `<kj-select>`s instead.
    Track a `kjMobileMode="full-screen"` opt-in for v1.1 that swaps the
    sub-panel rendering to a stack of pages.

11. **Initial open with non-empty `kjCascadePath`.** When the consumer
    pre-sets `kjCascadePath = ['us', 'ca', 'sf']` and opens the panel, the
    chain controller must open all three levels and focus the deepest
    (level 3, on `'sf'`). Animation timing: open all panels simultaneously
    (single transition), or stagger (level 0 → 1 → 2)? **Decision:** all
    simultaneously; no perceptible chain animation; theme can opt-in to
    stagger via `data-state` transition delays, but core core fires all
    `data-state="open"` flips in the same change detection pass.

12. **Sub-panel collision-flip and the chain.** When level 3's sub-panel
    would extend past the right viewport edge and the anchor flips to
    `side='left'`, level 4 then opens to the left of level 3 — but
    physically *inside* the area of level 1/2/3 on the right. The visual
    result is panels stacking back over the chain in reverse direction.
    PrimeNG handles this poorly (just lets it happen). **Decision:** once
    a sub-panel collision-flips, all deeper sub-panels in the same chain
    inherit the flipped side. The chain controller tracks
    `flippedFromLevel: number | null`; sub-panels at level ≥ flippedFromLevel
    use the inverted side. Document.

13. **Disabled sub-trigger and the chain.** A disabled option that has
    children: do we render the chevron? Open the sub-panel? **Decision:**
    chevron renders (the affordance is visible — the user knows there's
    more behind), `aria-haspopup` and `aria-expanded` reflect, but
    activation is suppressed (no hover-open, no click, no ArrowRight).
    Matches Dropdown Menu's disabled-sub-trigger behaviour.

14. **Path-aware trigger value rendering.** The default trigger renders the
    leaf label only. PrimeNG and Material both default to the same.
    Breadcrumb rendering ("USA / CA / SF") is a consumer opt-in via
    `[kjCascadeSelectValue]` slot. Bikeshed: should the *default* be the
    full path? **Decision:** keep leaf-only as default — it matches both
    references and avoids the path-overflows-the-trigger layout problem.

15. **Empty state.** When a sub-panel resolves to empty children
    (`kjCascadeChildren: []`), the sub-panel renders empty. Need a
    `[kjCascadeSelectEmpty]` slot like Multi Select's `*kjMultiSelectEmpty`.
    Defer to v1.1 unless consumers ask.

16. **`kjLevelExpand` and double-fire.** When the same sub-panel opens twice
    (user opens, closes, reopens), should `kjLevelExpand` fire both times,
    or only on first open? Caching the resolved children on the option
    avoids redundant fetches. **Decision:** fire once per option lifetime
    (cached after first resolve). Consumers needing re-fetch (server data
    that may have changed) can call a `ctx.invalidate(option)` method —
    add to `KjCascadeSelectContext` if asked.

17. **SSR.** Anchor primitive runs client-only (same as `KjSelect`).
    `kjCascadePath` model is SSR-stable. Lazy-load functions are
    Promise-based — they don't auto-fire on render; verified safe.

18. **Bundle locality.** Consumers using `[kjSelect]` should not pay for
    cascade. The cascade folder imports `KjSelect` directly (composes via
    `hostDirectives`), not the other way around — `select/` has no
    knowledge of cascade. Tree-shaking handles a Select-only app. Verify
    with the apps bundle-analyzer test.

19. **Multi-leaf cascade.** Out of scope for v1. PrimeNG ships
    `<p-cascadeSelect>` single-leaf only; multi-cascade is an open design
    question (do you select multiple leaves? entire branches with
    cascading children? PrimeNG's `<p-treeSelect>` covers branch-select
    via tree-checkbox semantics). Defer to a future
    `KjMultiCascadeSelect` if requested.

20. **Filterable cascade.** Out of scope for v1. The intersection of
    cascade and combobox is a real but rare UX (typing narrows visible
    nodes at each level, with auto-expand of branches containing matches).
    A future `KjCascadeCombobox` would compose both. Document the gap.

## Accessibility Review

WCAG 2.1 considerations against the proposed shape (no current
implementation to audit):

- **1.3.1 Info and Relationships:** Hierarchy must be conveyed through
  `aria-level`, `aria-setsize`, `aria-posinset` on every `treeitem`, and
  through `aria-owns` from each expanded sub-trigger to its sub-panel
  (so AT-tree nesting matches the data hierarchy despite the visual
  flyout chain). **Required: every option computes its `aria-level` /
  `aria-setsize` / `aria-posinset` from its registration with
  `KjCascadeSelectContext`.**
- **1.3.2 Meaningful Sequence:** With `aria-orientation="horizontal"` on
  the root tree, AT understands the cascade as a horizontally-flowing
  hierarchy. Within each level, the sequence is vertical (the sub-panel
  itself is `aria-orientation="horizontal"` for chain-level navigation,
  but rows within it stack vertically). Confirm with NVDA / JAWS /
  VoiceOver. APG's tree-with-horizontal-orientation pattern is rare;
  fall back to `aria-orientation="vertical"` if AT support is poor.
- **2.1.1 Keyboard:** The full tree keyboard contract (ArrowDown / ArrowUp
  within level, ArrowRight / ArrowLeft for expand/collapse, Home / End,
  PageUp / PageDown, Enter / Space, Escape, type-ahead, asterisk,
  Tab) must be wired in `KjCascadeChainController`. Trigger-side: same as
  Select except no closed-state type-ahead.
- **2.4.3 Focus Order:** Only the deepest open panel has DOM focus at any
  time. `aria-activedescendant` per level keeps the visual cursor across
  the chain consistent. Closing a sub-panel returns DOM focus to the
  parent panel; closing the root panel restores focus to the trigger.
- **2.4.7 Focus Visible:** Each option reflects `data-active` for theme-
  driven active-descendant ring. Sub-trigger options additionally reflect
  `data-active-path` for the highlight on the chain to the current
  selection. Trigger composes `KjFocusRing` (via `KjSelectTrigger`).
- **2.5.5 Target Size (AAA):** Trigger ≥ 44×44 in `md` (inherited).
  Each option ≥ 44×44 in `md` (chevron is included in the option's hit
  area, not a separate target). Sub-panel mounts are not interactive; no
  target-size constraint.
- **3.3.1 / 3.3.2 / 3.3.3 (Errors / Labels / Suggestions):** Inherited
  through `KjField` — the trigger is the labelled control.
- **4.1.2 Name, Role, Value:** Trigger `role="combobox"` (inherited),
  `aria-haspopup="tree"` (overridden when in cascade context),
  `aria-controls` (root panel id), `aria-expanded`. Root panel
  `role="tree"` + `aria-orientation="horizontal"` + `aria-multiselectable="false"`
  + `aria-labelledby` (trigger id). Sub-panels `role="group"` +
  `aria-labelledby` (owner option id). Each option `role="treeitem"` +
  `aria-level` + `aria-setsize` + `aria-posinset` + (sub-trigger only)
  `aria-haspopup="tree"` + `aria-expanded` + `aria-owns`.
- **4.1.3 Status Messages:** Live-region announcements on leaf commit
  (full path), sub-panel open (parent label + level), and lazy-load
  start/finish.
- **1.4.11 Non-text Contrast (AA → AAA):** Active-descendant focus
  outline ≥ 3:1; selected-state checkmark ≥ 3:1; chevron ≥ 3:1;
  active-path highlight ≥ 3:1. Theme concern.

Status: **proposed shape — no current implementation to audit.** The
analysis above defines the AAA-target contract; ship `[kjCascadeSelect]` /
`[kjCascadeSelectPanel]` / `[kjCascadeSelectSubPanel]` / `[kjCascadeSelectOption]`
+ slots in line with this spec, with the open questions above tracked as
follow-up issues during implementation.
