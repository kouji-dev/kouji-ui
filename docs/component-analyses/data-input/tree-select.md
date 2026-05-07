# Tree Select

A **Tree Select** is a value-bearing dropdown whose panel contains a
**hierarchical tree** (with expand/collapse triangles per branch) rather than
a flat listbox. Activating the trigger opens a popover-anchored panel; the
panel renders a `role="tree"` of `role="treeitem"` nodes; selecting a node
writes that node (or, in multi mode, the set of selected nodes) into the
form model. Single- and multi-value selection are both first-class; multi
mode renders option-side checkboxes with optional **parent–child cascade
selection** (selecting a parent selects all descendants, and the parent's
checkbox flips to `mixed` when only some descendants are selected).

This document is the architectural pattern for hierarchical pick-from-set,
**not** for hierarchical *navigation* (that's Cascade Select — see below for
the firm split). Tree Select differs from Select / Multi Select only in the
*panel content's shape*: the trigger, anchor, form-control wiring, focus
restoration, and outer keyboard contract are largely lifted from Select; the
panel swaps from `role="listbox"` to `role="tree"` and trades flat option
navigation for the WAI-ARIA Tree pattern.

**Already shipped:** none. There is no `KjTree` directive in core today
(`packages/core/src/` ships `accordion`, `select`, `tabs`, etc., but no
tree). Tree Select therefore lands in two pieces: **(1)** a headless
`KjTree` family (root + node + branch + label + indicator + indent guides
slot) shared with the future `KjList`'s tree mode (per the roadmap, **List
absorbs Tree as a presentation mode** — see
[`../data-display/list.md`](../data-display/list.md)); **(2)** a thin
`KjTreeSelect` family that wraps a `KjTree` inside a Select-style panel
shell. The same `KjTree` powers a standalone tree (in a Drawer, in a
sidebar) and the dropdown panel here — composed differently, the directives
are the same.

This is also the canonical "panel content is *not* a flat listbox" pattern
in the Select family. **Cascade Select** ([`cascade-select.md`](./cascade-select.md))
solves an adjacent UX problem (drill into one path of a tree at a time
across stacked sub-panels — a "menu of menus"), and **Tree Select** solves
the "show me the entire tree, let me expand and pick" problem with a single
panel. The two share the value-bearing root and the trigger contract; they
diverge entirely in panel shape and keyboard pattern.

## Source comparison

### PrimeNG — `<p-treeSelect>` ([primeng.org/treeselect](https://primeng.org/treeselect))

PrimeNG's `TreeSelect` is the only one of the three references that ships
this component as a first-class element. A single component embeds a
`<p-tree>` instance inside a popover-anchored panel. The data API is
descriptor-driven: `[options]="treeNodes"` where each `TreeNode` has
`{ key, label, data, icon, children, selectable, leaf, expanded, ... }`.

Surface (PrimeNG 18, `<p-treeSelect>`):

| Input                          | Notes                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| `options`                      | `TreeNode[]` — recursive node graph (children carry the same shape).                  |
| `selectionMode`                | `'single' \| 'multiple' \| 'checkbox'` — radio-style (single), Ctrl-click multi, or per-row checkbox with cascade. |
| `propagateSelectionUp` / `propagateSelectionDown` | Default `true` for both. When `'checkbox'` mode, selecting a parent selects descendants (down) and clears all-children selection promotes the parent (up). |
| `metaKeySelection`             | Ctrl/Cmd-click required for `'multiple'` selection (default true). Toggle off to make single-click toggle in multi mode. |
| `display`                      | `'comma' \| 'chip'` — trigger label style.                                              |
| `filter` / `filterBy` / `filterMode` | Built-in tree filter; `filterMode` is `'lenient' \| 'strict'`. Strict requires every ancestor to also match; lenient matches descendants and shows ancestors as context. |
| `placeholder` / `emptyMessage` / `dropdownIcon` / `chipIcon` | UI knobs.                                              |
| `appendTo`                     | `'body' \| ElementRef \| string` — escape clipping containers.                        |
| `panelStyleClass` / `panelStyle` / `panelClass` | CSS hooks.                                                            |
| `scrollHeight`                 | Px string limiting panel height.                                                      |
| `virtualScroll` / `virtualScrollItemSize` / `virtualScrollOptions` | Long trees.                                            |
| `disabled` / `readonly` / `loading` | States.                                                                          |
| `tabindex`                     | Integer.                                                                              |
| `ariaLabel` / `ariaLabelledBy` | A11y name forwarded to the trigger.                                                  |
| `inputId`                      | Override the auto-minted id.                                                           |
| `clearIcon` / `showClear`      | Inline clear button.                                                                   |
| `resetFilterOnHide`            | Lifecycle of filter state.                                                             |

Outputs: `onShow`, `onHide`, `onChange`, `onNodeSelect`, `onNodeUnselect`,
`onNodeExpand`, `onNodeCollapse`, `onFilter`, `onFocus`, `onBlur`,
`onClear`.

Form integration: standard CVA — `[(ngModel)]` / `[formControl]` on
`<p-treeSelect>` itself. Value type depends on `selectionMode`:
- `'single'`: a single `TreeNode` reference.
- `'multiple'`: `TreeNode[]`.
- `'checkbox'`: a *map* `{ [key: string]: { checked: boolean; partialChecked: boolean } }`
  keyed by `TreeNode.key`. Distinguishes "fully checked" from "partial"
  (a parent whose only some children are checked). **This is the API
  footgun:** the consumer's form model becomes a key→state map, not an
  array of values, and equality comparisons break across re-fetches.

A11y: trigger renders as `role="combobox"` with `aria-haspopup="tree"`
(PrimeNG 18 — earlier versions used `'listbox'` incorrectly), `aria-expanded`,
`aria-controls`. Panel is `role="tree"` with `aria-multiselectable="true"`
in checkbox mode. Each node is `role="treeitem"` with `aria-expanded`
(branches), `aria-selected` (single/multi), `aria-checked` (checkbox mode,
including `'mixed'`), `aria-level`, `aria-posinset`, `aria-setsize`.
Keyboard inside the tree: Up/Down move focus, Right expands or moves to
first child, Left collapses or moves to parent, Enter/Space selects (or
toggles in checkbox mode), Home/End first/last visible node, type-ahead
matches by visible label.

Critique:
- **Descriptor-walk API.** `[options]="treeNodes"` plus stringly-typed
  `optionLabel` / `optionValue` is the same complaint as `<p-select>` /
  `<p-tree>`. Per-node templates (`<ng-template pTemplate="default">`) are
  slots, not sub-components — composing per-node behaviour (icon + badge
  + secondary line + drag handle) requires conditionals inside the
  template.
- **Checkbox mode's value shape is bespoke.** The `{ [key]:
  { checked, partialChecked } }` shape is a leaky abstraction — the
  partial-checked bit is *derived* from descendant state and shouldn't
  be in the form value at all. Reactive forms using the value as a
  source of truth across re-fetches break.
- **`metaKeySelection`'s default surprises.** Ctrl-click for multi-select
  in `'multiple'` mode (without checkboxes) is a desktop convention
  unknown to mobile / touch users and to keyboard-only users who didn't
  read the docs. The escape hatch exists, but the default is wrong.
- **Filter `'lenient'` vs `'strict'` distinction.** Worth lifting — see
  [Decision: filter mode](#decision-filter-mode). PrimeNG defaults to
  `'lenient'` (show ancestors of matches as context), which is the
  correct behaviour and the hard-to-implement one.
- **No `KjFormField`-equivalent integration.** Consumer wires
  `aria-labelledby` themselves.

### Angular Material — *gap* (no first-class TreeSelect)

Material has **no** Tree Select. It ships:

- `<mat-tree>` ([material.angular.dev/components/tree](https://material.angular.dev/components/tree))
  — a standalone tree component for sidebar / drawer presentations. CDK-based
  (`CdkTreeModule`) with flat-tree and nested-tree variants, levels accessor,
  toggle, expand/collapse, and `aria-level` / `aria-expanded` /
  `aria-posinset` / `aria-setsize` wiring. A11y is correct.
- `<mat-select>` — flat listbox only. No `[multiple]` mode for trees, no
  panel-replacement slot for hierarchical content, no nested option model.

To build a Tree Select in Material today, the consumer composes
`<mat-form-field>` + `<mat-select>` + custom panel template + manual
`<mat-tree>` inside, then wires the value glue by hand. The Material team
has consistently declined to ship this — see
[#15990](https://github.com/angular/components/issues/15990) (still open
since 2019). The reasons given: **(a)** the value contract for cascade
selection is genuinely contested (set of leaves? set of nodes including
parents? key→state map?); **(b)** filter semantics on a tree are non-trivial
("show ancestors of matches as context" requires a separate visibility
projection); **(c)** Material prefers users go to `<mat-tree>` standalone
or to a Combobox with flat data and let the consumer encode hierarchy in
the option labels.

**Pattern picked up.** kouji **does** ship Tree Select as a first-class
component — Material's gap is not a virtue. The consumer-side complexity
of "build it yourself with `<mat-tree>` inside `<mat-select>`" is exactly
the kind of recurring-by-hand reimplementation a component library exists
to prevent. We absorb the contested parts (value contract — see
[Decision: cascade value shape](#decision-cascade-value-shape); filter
semantics — see [Decision: filter mode](#decision-filter-mode); panel
composition — see [Decision: reuse Tree](#decision-reuse-tree)) and ship
opinionated defaults plus opt-outs.

### shadcn/ui — *gap* (no first-class TreeSelect)

shadcn ships:

- `Select` (Radix Select) — flat listbox, no nesting.
- `Combobox` — Command + Popover + flat list. No nesting.
- **No tree component at all.** The community recipes are
  [shadcn-tree-view](https://shadcn-extensions.vercel.app/) (a third-party
  extension) and various blog reimplementations. None integrate with the
  Select / Combobox primitives — they're standalone trees.

The reason given (Radix's stance, shadcn inherits): **trees are stateful
in ways listboxes aren't** (per-branch expand/collapse, recursive
selection propagation, virtualisation that respects the expand graph),
and a Radix-style "primitive composition" doesn't compose cleanly when
the content is recursive. Radix UI's roadmap has Tree as "open question"
since 2022.

**Pattern picked up.** None directly — shadcn / Radix provide no
Tree Select template to lift. The architectural lesson is that
**recursive content** (where a Branch contains more Branches) requires
its own primitive family rather than fitting into a flat-listbox compound.
That informs our [Decision: reuse Tree](#decision-reuse-tree) below: the
recursive directive set lives in a dedicated `KjTree` family that this
component composes.

### Cross-library summary

|                              | PrimeNG `<p-treeSelect>`  | Material        | shadcn (Radix)  | kouji direction                                          |
| ---------------------------- | ------------------------- | --------------- | --------------- | -------------------------------------------------------- |
| First-class component        | yes                       | **gap**         | **gap**         | **yes** — `KjTreeSelect` family + shared `KjTree` family |
| Composition                  | data-driven (`options`)   | n/a             | n/a             | **compound** (`KjTreeSelect` + Trigger + Content + reused `KjTree*`) |
| Single / multi / checkbox    | `selectionMode`           | n/a             | n/a             | **separate roots** — `KjTreeSelect` (single) and `KjMultiTreeSelect` (multi/checkbox) [decision below](#decision-single-vs-multi-roots) |
| Cascade selection (parents ↔ children) | `propagateSelectionDown/Up` | n/a       | n/a             | **on by default in multi**, opt-out via `kjTreeSelectCascade="none"` |
| Cascade value shape          | `{[key]:{checked,partialChecked}}` map | n/a   | n/a             | **`readonly T[]` of leaf values** by default; opt-in `'leaves-and-fully-checked-parents'` mode for "save space" payloads (see Decision) |
| Filter                       | built-in (`'lenient' \| 'strict'`) | n/a       | n/a             | **deferred to Combobox+Tree composition** in v1; lift the filter modes when shipping that combo |
| Trigger display              | `'comma' \| 'chip'`        | n/a             | n/a             | **chips by default in multi, single label in single** — reuses Multi Select's chip family |
| Panel role                   | `tree`                     | n/a             | n/a             | **`role="tree"`** (not `listbox` — single biggest a11y break in PrimeNG ≤17) |
| Per-node template            | `<ng-template>` slot       | n/a             | n/a             | **per-directive composition** — `[kjTreeNode]`, `[kjTreeNodeLabel]`, `[kjTreeNodeIndicator]`, `[kjTreeNodeIcon]` |
| Cascade selection algorithm  | down + up propagation      | n/a             | n/a             | same — implemented in `KjTreeSelectionModel` (lifted, generic) |
| Async / lazy children        | `lazy` flag, `onNodeExpand` event | n/a      | n/a             | **`kjTreeNodeChildrenLoad` callback + `loading` per branch** [open question](#open-questions--risks) |
| Virtual scroll               | `virtualScroll`            | n/a             | n/a             | **deferred to v1.1** — virtualising an expand-collapse tree is a separate primitive (windowed flat-projection); not blocking v1 |
| Touch / mobile               | tap-to-toggle              | n/a             | n/a             | tap-to-toggle; long-press never (gesture conflict)         |
| Native fallback              | n/a                        | n/a             | n/a             | **none** — there is no `<select>` equivalent for hierarchical pickers; document the gap explicitly |
| Form integration             | CVA                        | n/a             | n/a             | **CVA via `KjFormControl`** on the root                  |
| `compareWith`                | `dataKey` (string path)    | n/a             | n/a             | **`kjCompareWith`** (function) — mirrors Multi Select / Material |

## Decision — needs a core directive?

**Yes — two directive families.** Tree Select is not a flag on Select (panel
content is fundamentally a different ARIA pattern, the keyboard contract
differs, and selection mechanics with cascade are not a subset of flat
listbox selection). It is also not a single component with a `mode` flag
(see [Decision: single vs multi roots](#decision-single-vs-multi-roots)).
The two families are:

### 1. `KjTree` family (new — shared)

A standalone, headless tree primitive lives in
`packages/core/src/tree/`. Per the roadmap,
[`../data-display/list.md`](../data-display/list.md) absorbs the same
`KjTree` family as List's "tree mode" — i.e. **a List rendered with
hierarchical structure is the same directive set as a Tree**. The
directives are not Tree-Select-specific; they're the recursive cousin of
Listbox.

| Directive                       | Role                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `[kjTree]` (root)               | Owns the expand state map, registered nodes (in DOM order, with parent links), the active-descendant id, and the keyboard handler. Provides `KJ_TREE`. **No** value-bearing semantics — selection lives in a *separate* host (e.g. `KjTreeSelect` provides a `KjTreeSelectionModel`; a standalone tree consumer can wire their own). |
| `[kjTreeNode]`                  | One node. Self-registers with the tree on construction; computes its own `aria-level` / `aria-posinset` / `aria-setsize` from the registration tree. Carries `role="treeitem"`. Activation calls `host.activate(this)`. |
| `[kjTreeNodeLabel]`             | The node's clickable label region. Click activates; toggles expand on a branch (when `kjTreeNodeToggleOnLabelClick="true"`, default true for branches without an explicit indicator). |
| `[kjTreeNodeIndicator]`         | The expand/collapse triangle. `<button>` (or `<span role="button">`) inside a branch's label row that *only* toggles expand — never selects. Required separately so click-on-triangle doesn't change the selection. |
| `[kjTreeNodeChildren]`          | Container for the node's children. `role="group"`. Hidden when the node is collapsed (`[hidden]` toggled by tree state). |
| `[kjTreeNodeIndentGuide]`       | Optional vertical-line indent guide (one per ancestor depth). Pure presentation; `aria-hidden="true"`. Themes opt in. |

Recursive composition pattern (Angular needs an explicit recursion site):

```html
<ng-template #branch let-node>
  <div [kjTreeNode]="node">
    <span kjTreeNodeLabel>
      @if (node.children?.length) {
        <button kjTreeNodeIndicator [attr.aria-label]="node.expanded ? 'Collapse' : 'Expand'"></button>
      }
      {{ node.label }}
    </span>
    @if (node.expanded) {
      <div kjTreeNodeChildren>
        @for (child of node.children ?? []; track child.id) {
          <ng-container *ngTemplateOutlet="branch; context: { $implicit: child }"></ng-container>
        }
      </div>
    }
  </div>
</ng-template>

<div kjTree>
  @for (root of roots(); track root.id) {
    <ng-container *ngTemplateOutlet="branch; context: { $implicit: root }"></ng-container>
  }
</div>
```

This pattern — recursive `<ng-template>` reference — is the only idiomatic
Angular way to render arbitrary-depth trees without sacrificing the
"per-node directive" composition model. Material's `<mat-nested-tree-node>`
uses the same recursion. The data graph itself is consumer-supplied
(`roots()`, `children`, `expanded`, `id`); Tree only provides the
*directive contract*, not the data shape.

### 2. `KjTreeSelect` family (new — composes `KjTree`)

| Directive                       | Role                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `[kjTreeSelect]` (root)         | Value-bearing. Composes `KjFormControl`. Provides `KJ_TREE_SELECT`. Owns single-select selection model (`T \| null`), open state, and the bridge to the inner `KjTree`'s active-descendant. |
| `[kjMultiTreeSelect]` (root)    | Sibling root for multi / checkbox mode. Composes `KjFormControl`. Provides `KJ_MULTI_TREE_SELECT` and `KJ_TREE_SELECT_HOST` (shared). Owns multi-selection model with cascade. |
| `[kjTreeSelectTrigger]`         | The collapsed-state button. **Reused from Multi Select / Select via composition** — see [Decision: trigger reuse](#decision-trigger-reuse). `role="combobox"`, `aria-haspopup="tree"`, `aria-expanded`, `aria-controls`. |
| `[kjTreeSelectValue]`           | Slot inside the trigger that renders the selected node's label (single) or chips (multi). Default rendering reads the matched `KjTreeNode`'s `searchLabel`. |
| `[kjTreeSelectContent]`         | Panel host. `role="tree"` + `aria-multiselectable` (true in multi). Anchored via `KjAnchor` — same primitive as Select / Multi Select. **Hosts a `KjTree`** inside (the panel composes both `KjTreeSelectContent` and `[kjTree]` on the same element, since they share the host element semantically). |
| `[kjTreeSelectClear]`           | Optional clear button in the trigger trailing slot. Same shape as `[kjSelectClear]`. |

There is **no** `[kjTreeSelectOption]` directive — the option role is
played by `[kjTreeNode]` (with `role="treeitem"`, not `role="option"`).
This is the central architectural point: Select-family options are flat,
tree-family nodes are recursive, and the two have different ARIA roles
and different selection semantics. Pretending otherwise (e.g.
`[kjTreeOption]` aliasing `[kjSelectOption]`) hides the divergence and
guarantees a a11y bug at some point.

### Decision: reuse Tree

**`KjTree` is its own family**, not a fork of `KjSelectContent`. The two
share zero recursive logic with the existing Select panel; the panel-side
machinery they *do* share is keyboard plumbing (Home/End/type-ahead
buffer) and click-outside / escape handling, which are factored into
shared primitives:

- **`KjListNavigation`** (existing per Multi Select's
  `KjListboxNavigation` lift) — generalised slightly to operate on a
  *projected flat list* of nodes (the visible node sequence, computed
  from the tree by walking the expand graph in DOM order). Tree's
  ArrowDown/ArrowUp moves through the projected list; the projection
  itself is computed by `KjTree`. The primitive does not care whether
  the underlying structure is flat or tree; it just walks an indexed
  registration order it's given.
- **`KjAnchor`** (Popover anchor) — same as Select / Multi Select.
- **`KjOverlay`** — same as Select / Multi Select. Click-outside, body
  append, focus restoration on close.
- **`KjLiveRegion`** — selected-count + cascade-aware announcements.

The recursive parts (per-node `aria-level` / `aria-posinset` /
`aria-setsize` derivation, expand-graph maintenance, cascade propagation)
live entirely in `KjTree` / `KjTreeSelectionModel`. They are **not**
generalised to non-recursive lists; trying to make `KjListboxNavigation`
"also handle trees" would muddle both.

The cross-reference to [`../data-display/list.md`](../data-display/list.md)
is firm: List's "hierarchical mode" is the *same* `KjTree` family, used
*outside* a select panel (in a sidebar, in a drawer). The directives are
authored once in `packages/core/src/tree/` and re-exported / composed by
both List and Tree Select.

### Decision: single vs multi roots

**Two roots — `KjTreeSelect` (single) and `KjMultiTreeSelect` (multi /
checkbox).** Same rationale as Multi Select's
[Option C](./multi-select.md#option-c--separate-family--shared-selection-primitive-chosen):

1. **Value-type bifurcation.** Single's value is `T | null`; multi's value
   is `readonly T[]`. TypeScript can't express "depends on another input"
   at the model declaration site, so callers either get `T | T[] | null`
   (a footgun) or two separate inputs nominally inside one component (at
   which point the split is real).
2. **Behavioural divergence.** Single's panel closes on select; multi's
   doesn't. Single has no checkbox glyph; multi does. Single has no
   cascade; multi does. By the time the conditionals are written, the
   directive body is two implementations switched on `kjMultiple`.
3. **Cascade is multi-only.** Single-mode cascade selection is a
   contradiction (selecting a parent would select children, but the
   value model only holds one node). Cascade is a multi-mode-only
   concern.

Selection mechanics are factored into `KjTreeSelectionModel` (extends
the existing `KjSelectionModel` from Multi Select) with a generic
`mode: 'single' | 'multi-flat' | 'multi-cascade'` discriminator and a
`getDescendants(node)` accessor for the cascade pass. Both roots
construct an instance — no per-root duplication.

PrimeNG's `selectionMode="checkbox"` is a sub-mode of multi, distinguished
only by the checkbox glyph and the cascade default. We collapse that
into `KjMultiTreeSelect` with `kjTreeSelectCascade="full" | "down" |
"up" | "none"` (default `"full"`) — see
[Decision: cascade value shape](#decision-cascade-value-shape).

### Decision: cascade value shape

**The form value is `readonly T[]` — the leaf values of fully-selected
subtrees, in registered order.** PrimeNG's `{ [key]: { checked,
partialChecked } }` map shape is rejected for three reasons:

1. **`partialChecked` is derived state.** It's purely a function of
   which descendants are checked — keeping it in the form value
   denormalises the selection. Across a re-fetch with new node instances,
   the `partialChecked` flags become stale relative to the new tree
   shape.
2. **Map vs array breaks reactive-form ergonomics.** Validators like
   `Validators.required` and `minLength` apply to arrays; they don't
   apply to objects keyed by node. Equality checks across submissions
   become bespoke.
3. **Cascade selection's natural form value is "the leaves the user
   intended to pick."** When a user checks a parent, the *intent* is "I
   want all of these descendants". The form payload should reflect that
   intent as a flat list of leaves — that's what the consumer's API
   typically wants on submit anyway (a backend rarely takes a tree-state
   map; it takes a list of selected ids).

The default value shape is therefore **`readonly T[]` of leaf values
inferred from the cascade-aware selection model**. A non-leaf node is
"fully selected" iff every descendant leaf is in the value array; the
panel computes the parent's `aria-checked` accordingly (`'true'` when
all descendants are present, `'mixed'` when some, `'false'` when none).
The consumer never has to encode `partialChecked` themselves.

For the rare case where the consumer actively *wants* parents in the
value (e.g. "saving the user's selection compactly: prefer to store
'department X' than to enumerate every employee"), the opt-in shape is:

```ts
kjTreeSelectValueShape: input<'leaves' | 'leaves-and-fully-checked-parents' | 'all-checked'>('leaves')
```

- `'leaves'` (default) — value is leaves only; parents are derived.
- `'leaves-and-fully-checked-parents'` — when every descendant of a
  parent is selected, the parent replaces the descendants in the value.
  This is the "compact" representation. The selection model materialises
  this on every value emit; on `writeValue`, ancestors in the array are
  expanded back to their leaves before populating internal state.
- `'all-checked'` — every checked node, leaf or branch, is in the array.
  Closest to PrimeNG's checkbox-mode semantics minus the
  `partialChecked` denormalisation. Use when the consumer's domain
  model treats branches as first-class selectable entities (e.g. a tag
  taxonomy where selecting the parent tag is meaningful in itself).

The default `'leaves'` is the right choice for ~80% of consumers; the
other two modes ship for explicit advanced cases and are clearly
documented as escape hatches.

### Decision: cascade direction

**`kjTreeSelectCascade: input<'full' | 'down' | 'up' | 'none'>('full')`.**

- `'full'` (default) — selecting a parent selects all descendants
  (down propagation); checking the last unchecked sibling promotes the
  parent to fully checked (up propagation, only when every sibling is
  selected). PrimeNG's default and the user-intuitive one.
- `'down'` — only down propagation. A parent's selection state is
  computed from its descendants but never auto-set by them.
- `'up'` — only up propagation. Useful when the consumer's model
  represents leaves only and parents are derived display state.
- `'none'` — no propagation. Each node's selection is independent.
  Equivalent to `kjMultiSelect` rendered as a tree.

`'mixed'` (tri-state) `aria-checked` is computed in all four modes —
it's a presentation derivation, not a value mode.

### Decision: trigger reuse

**The trigger directive is a thin alias for `KjMultiSelectTrigger` /
`KjSelectTrigger`.** Both `KjTreeSelect` and `KjMultiTreeSelect`
implement the relevant host-context interface (`KJ_LISTBOX_HOST` extended
to `KJ_TREE_SELECT_HOST`); the trigger directive injects the host token
and treats it generically. `[kjTreeSelectTrigger]` is implemented as:

```ts
@Directive({
  selector: 'button[kjTreeSelectTrigger]',
  hostDirectives: [
    KjFocusRing,
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize, inputs: ['kjSize'] },
  ],
  host: {
    'role': 'combobox',
    'aria-haspopup': 'tree',
    '[attr.aria-expanded]': 'host.open()',
    '[attr.aria-controls]': 'host.panelId',
    /* …same handlers as Multi Select trigger… */
  },
})
export class KjTreeSelectTrigger { /* injects KJ_TREE_SELECT_HOST */ }
```

The single behavioural difference vs `KjMultiSelectTrigger` is
`aria-haspopup="tree"` (rather than `"listbox"`) — the panel role is
`tree`, and AT consumers benefit from the accurate popup-role hint.
PrimeNG ships this correctly in v18; we do the same.

The keyboard-to-open contract (Enter / Space / Down opens, etc.) is
identical. Type-ahead-while-closed *advances the value* in single mode
(matches `KjSelect`); in multi mode, type-ahead opens the panel and
lands `aria-activedescendant` on the matching node (no automatic
selection — multi-mode selection requires explicit commit). This
matches Multi Select's behaviour.

### Decision: filter mode

**Filtering is deferred to a future Combobox + Tree composition; v1
ships without an in-panel filter.** PrimeNG's `<p-treeSelect>` ships
`'lenient'` (show ancestors as context) and `'strict'` (every ancestor
must also match) modes; the lenient implementation is the hard one and
the right default.

Reasoning for v1 deferral:

1. **A tree filter is not a one-line addition.** Lenient filter requires
   computing the union of (matched node, all ancestors of matched node)
   for every match, then projecting visibility on the tree without
   collapsing the structural integrity (a parent shown as context
   shouldn't be selectable if the consumer's filter intent excludes it,
   but the user might still want to expand it for context — these
   trade-offs are non-obvious and consumer-app-specific).
2. **The right home for filtered trees is Combobox.** A Combobox
   (`packages/core/src/combobox/` — analysis at
   [`combobox.md`](./combobox.md)) is the textbox-driven filterable
   variant; in its multi mode with tree content, it becomes "filterable
   tree select". The split between Tree Select (no filter) and Combobox
   with a tree panel (with filter) mirrors the existing split between
   Select (no filter) and Combobox (with filter). Don't duplicate filter
   logic in Tree Select.
3. **The 80% use case is small-to-medium trees** (taxonomies, file
   browsers, organisation charts under ~500 nodes). For those, no filter
   is fine; expand-collapse plus type-ahead are sufficient. Trees in the
   thousands need virtualisation *and* filter, which is the future
   Combobox + virtual scroll story.

`KjTree` itself exposes the projected-flat-list signal (visible nodes
in DOM order); a future filter directive would mutate visibility on
that projection without touching `KjTree` internals. The hook is there;
the directive isn't shipped in v1.

### Decision: no native fallback

There is no native HTML element analogous to `<select>` that renders a
tree. `<select>` renders flat options; `<details><summary>` renders a
single collapse but doesn't compose into a value-bearing picker; native
file-pickers (`<input type="file" webkitdirectory>`) render a directory
tree but only for filesystem trees. Tree Select therefore has **no native
fallback** — the custom widget is the only option. Document this
explicitly in the family TSDoc so consumers don't expect a `KjNativeTreeSelect`
sibling.

For the dense-row "I just want a quick hierarchy picker in a filter bar"
case, recommend the consumer use a flat `KjSelect` with hierarchy
encoded in the option label (`"Engineering / Frontend / Web"`) —
common, accessible, and well-supported.

### Decision: single root ownership of the value contract

Per the Select-family pattern: form integration lives on the **root**, not
on the trigger.

- `KjTreeSelect` / `KjMultiTreeSelect` compose `KjFormControl` via
  `hostDirectives`.
- The trigger reflects `aria-disabled` from the form-control's disabled
  signal but does **not** itself implement CVA — it's a presentational
  combobox button.
- The root registers with the optional `KJ_FIELD` context (see
  [`field.md`](./field.md)) as a "composite control" — the labelled
  element is the **trigger**.

## Base features

- **Variants.** `KjVariant` host directive on `[kjTreeSelectTrigger]`
  (default / filled / ghost / destructive). The panel itself takes a
  `kjPanelClass` for consumer styling; no `KjVariant` on the panel.
  Same posture as Select.
- **Sizes.** `KjSize` on `[kjTreeSelectTrigger]` (sm / md / lg) and on
  each `[kjTreeNode]` (defaults to root's size via context).
- **States.**
  - `kjTreeSelectDisabled` on the root → flows to trigger via
    `KjDisabled`; suppresses panel open.
  - `kjTreeSelectReadonly` — trigger focusable but does not open;
    `data-readonly` reflects.
  - `kjTreeSelectInvalid` — reflects `aria-invalid` on the trigger when
    `formCtrl.touched()`.
  - Per-node `kjTreeNodeDisabled` — node is non-selectable (skipped by
    arrow nav and type-ahead) but still expandable; descendants remain
    individually selectable when cascade is `'none'`. With cascade
    `'down'` / `'full'`, a disabled parent's selection cannot be toggled
    but descendants can be (their cascaded effect on the disabled parent
    is suppressed — the parent's `aria-checked` is computed honestly,
    but the cascade doesn't write through it).
  - Per-node `kjTreeNodeSelectable: input<boolean>(true)` — separate
    from disabled. A non-selectable node renders without a checkbox and
    can be focused / expanded but not added to the value. Useful for
    "category headers" inside a tree taxonomy.
- **Anchored positioning.** Same as Select: `kjSide` (default
  `'bottom'`), `kjAlign` (default `'start'`), `kjOffset` (default `4`),
  `kjAvoidCollisions` (default `true`), `kjMatchTriggerWidth` (default
  `true`). Reflected as `data-side` / `data-align` /
  `--kj-tree-select-trigger-width` on `[kjTreeSelectContent]`. Uses the
  shared `KjAnchor` primitive defined in
  [`feedback/popover.md`](../feedback/popover.md).
- **Open / close.** Identical to Select: click trigger; Enter / Space
  / Alt+ArrowDown / F4 opens; Escape / Tab / outside-click / selection
  closes (single mode). In multi mode, `kjCloseOnSelect` defaults
  `false` — the panel stays open for multi-pick. `kjCloseOnSelect="true"`
  matches the rare PrimeNG `hideOnSelect` opt-in.
- **Type-ahead.** Multi-character buffer with debounce (default 200ms).
  Matches against each node's `searchLabel` signal. Type-ahead in
  multi-mode panel moves `aria-activedescendant` only; type-ahead in
  single-mode while closed advances the value (matches `KjSelect`).
  Type-ahead skips collapsed (hidden) descendants — only visible nodes
  match. This is the WAI-ARIA Tree pattern's recommendation.
- **Expand/collapse state.** Per-node, owned by `KjTree` as a `Map<NodeId,
  boolean>`. The consumer can pre-seed via `kjTreeExpanded:
  input<readonly NodeId[]>([])` (initial expanded set) and observe via
  `kjTreeExpandedChange`. Right-arrow on a collapsed branch expands;
  Left-arrow on an expanded branch collapses (per WAI-ARIA Tree).
- **Cascade selection.** See
  [Decision: cascade direction](#decision-cascade-direction). Default
  `'full'` in multi; `'none'` is the opt-out for "checkboxes are
  independent."
- **Compare-with.** `kjCompareWith: input<(a: T, b: T) => boolean>((a, b) => a === b)`.
  For object-valued nodes. Used by the selection model and by the
  trigger value-display lookup.
- **Clearable.** `kjTreeSelectClearable: input<boolean>(false)`. Renders
  a clear button in the trigger trailing slot.
- **Placeholder.** `kjTreeSelectPlaceholder: input<string>('')`. Rendered
  by `KjTreeSelectValue` when the value is empty.
- **Empty state.** When the projected tree is empty (zero roots), the
  panel renders a `*kjTreeSelectEmpty` projected template inside a
  `role="status"` host. Default message "No options available."
- **Lazy children.** `KjTreeNode` exposes a `kjTreeNodeChildrenLoad:
  input<((node: T) => Observable<T[]> | Promise<T[]>) | undefined>(undefined)`
  callback. When set on a branch and the branch is expanded for the
  first time, the callback fires; while pending, the branch reflects
  `data-loading="true"` and the panel announces "Loading children of
  X" via `KjLiveRegion`. See
  [open question 2](#open-questions--risks).
- **RTL.** Reflects `dir` from `KjDirectionality`. Right-arrow / Left-
  arrow swap semantics in RTL: in RTL, **Left** expands or moves to
  child, **Right** collapses or moves to parent. WAI-ARIA Tree pattern
  is explicit about this swap.

## Accessibility (WCAG 2.1 AAA)

### Roles + ARIA wiring

| Element                          | Role                  | Attributes                                                                                                       |
| -------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `[kjTreeSelect]` / `[kjMultiTreeSelect]` (root) | none   | State container.                                                                                                  |
| `[kjTreeSelectTrigger]`          | `combobox`            | `aria-haspopup="tree"`, `aria-expanded`, `aria-controls="<panel id>"`, `aria-activedescendant="<active node id>"` (only when panel is open), `aria-labelledby` (consumer or via `KjField`), `aria-describedby` (via `KjField` chain), `aria-required` (mirrored from validators), `aria-invalid` (touched + invalid), `aria-disabled` (from form-control), `tabindex="0"`. Host should be `<button type="button">`. |
| `[kjTreeSelectContent]` + `[kjTree]` (composed on same host) | `tree` | `id="<panel id>"`, `aria-orientation="vertical"`, `aria-labelledby="<trigger id>"`, `aria-multiselectable="true"` (multi only; absent or `"false"` in single), `tabindex="-1"` (focused on open), `data-side`, `data-align`, `data-state="open\|closed"`, `[hidden]` when closed. |
| `[kjTreeNode]`                   | `treeitem`            | `id` (auto-minted; the active-descendant target), `aria-level` (1-based, derived from registration depth), `aria-posinset` (1-based, position among siblings), `aria-setsize` (count of siblings), `aria-expanded="true\|false"` (only on branches; **omitted** on leaves), `aria-selected="true\|false"` (single mode), `aria-checked="true\|false\|mixed"` (multi mode), `aria-disabled` (when `kjTreeNodeDisabled`), `tabindex="-1"`, `data-active`, `data-selected`, `data-disabled`, `data-level`, `data-leaf`. |
| `[kjTreeNodeLabel]`              | none                  | The clickable label region. No interactive role of its own (the parent `treeitem` is the interactive). |
| `[kjTreeNodeIndicator]`          | `button`              | `aria-label="Expand"` / `"Collapse"` (locale-overridable via `kjTreeNodeIndicatorLabel`), `tabindex="-1"` (not in tab order; click handler only — keyboard expand/collapse is on the parent `treeitem` via Right/Left). |
| `[kjTreeNodeChildren]`           | `group`               | Implicit (rendered as a child container). `[hidden]` when the parent is collapsed. |
| `[kjTreeNodeIndentGuide]`        | none                  | `aria-hidden="true"`. Pure presentation. |
| `[kjTreeSelectValue]`            | none                  | Renders `displayValue()` (selected node label, or chips in multi). No ARIA — accessible name comes from the trigger's `aria-labelledby`. |

**`role="tree"` (not `listbox`).** This is the single most important
a11y decision in this family. PrimeNG ≤17 rendered the panel as
`role="listbox"` with `role="treeitem"` children, which validates as
broken (a `treeitem` outside a `tree`/`group` is not in the ARIA
parent-role allow-list). PrimeNG 18 fixed it to `role="tree"`.
We ship correct from v0.

`aria-haspopup="tree"` is supported by NVDA, JAWS, and VoiceOver as of
2022; older AT (NVDA pre-2021) falls back to "popup" generic
announcement, which is acceptable.

### Keyboard contract

Source: [WAI-ARIA APG Tree View Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/).

| Key                          | When focus is on…                  | Behaviour                                                                                       |
| ---------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Enter` / `Space` / `Alt+ArrowDown` | Trigger (closed)               | Open. Active node is currently-selected (single) or the first registered root (multi / no selection). |
| `ArrowDown`                  | Trigger (closed)                   | Open. Active node is selected, else first.                                                       |
| `ArrowUp` / `Alt+ArrowUp`    | Trigger (closed)                   | Open. Active node is selected, else last visible.                                                |
| `F4`                         | Trigger                            | Toggle open/close (per APG combobox).                                                             |
| Printable char               | Trigger (closed, single-mode)      | Advance value to next node whose `searchLabel` starts with the typed buffer (matches `KjSelect`). Multi mode: opens panel and lands active descendant on the match. |
| `ArrowDown` / `ArrowUp`      | Tree (panel)                       | Move active descendant to next / previous **visible** node (skipping collapsed descendants). Wraps if `kjLoop`; skips disabled, non-selectable. |
| `ArrowRight` (LTR) / `ArrowLeft` (RTL) | Tree (panel) on a collapsed branch | Expand. No focus movement.                                                                |
| `ArrowRight` (LTR) / `ArrowLeft` (RTL) | Tree (panel) on an expanded branch | Move active descendant to first visible child.                                            |
| `ArrowRight` (LTR) / `ArrowLeft` (RTL) | Tree (panel) on a leaf      | No-op.                                                                                          |
| `ArrowLeft` (LTR) / `ArrowRight` (RTL) | Tree (panel) on an expanded branch | Collapse. No focus movement.                                                              |
| `ArrowLeft` (LTR) / `ArrowRight` (RTL) | Tree (panel) on a collapsed branch or leaf with a parent | Move active descendant to parent.                                  |
| `ArrowLeft` (LTR) / `ArrowRight` (RTL) | Tree (panel) on a root leaf | No-op.                                                                                          |
| `Home`                       | Tree (panel)                       | First visible node.                                                                              |
| `End`                        | Tree (panel)                       | Last visible node (the deepest visible descendant of the last expanded branch).                  |
| `*` (asterisk)               | Tree (panel)                       | Expand all sibling branches at the current node's level. Per APG.                                |
| Printable char               | Tree (panel, open)                 | Move active descendant to next match (visible nodes only). Buffer shared with closed-state.       |
| `Enter` / `Space`            | Tree (panel, single mode)          | Confirm active node as new value, close, restore focus to trigger.                                |
| `Enter` / `Space`            | Tree (panel, multi mode)           | **Toggle** active node's selection. Cascade-aware: toggling a parent applies the cascade rule.    |
| `Tab` / `Shift+Tab`          | Tree (panel)                       | Close panel and let Tab continue natural focus. `kjClosed` emits `'tab'`. (Multi mode with toolbar: same Tab-cycles-toolbar logic as Multi Select — see [`multi-select.md` Q3](./multi-select.md#open-questions--risks).) |
| `Escape`                     | Tree (panel)                       | Close without changing value, restore focus to trigger.                                            |
| `Ctrl+A` / `Cmd+A`           | Tree (panel, multi mode)           | Select all selectable visible nodes (cascade-aware: equivalent to selecting each visible root).    |

The shift between `ArrowRight` / `ArrowLeft` semantics is RTL-aware: in
RTL the keys swap. The directional intent is "move toward children" and
"move toward parent"; the specific arrow that means each is locale-
dependent. Implementation reads `KjDirectionality.dir()`.

`*` (expand siblings) is a less-common APG affordance, but cheap to
implement and useful for power users. Skipping it is a defensible v1
decision; we ship it because the implementation is one extra branch in
the keydown handler.

### Focus management

- **Opening from the trigger** focuses `[kjTreeSelectContent]` (so SR
  announces the tree role and the active node), then sets the active
  descendant id to the selected node's id (single) / first selected
  node's id (multi) / first registered visible node (no selection).
- **Closing via Enter / Escape / item activation (single)** restores
  focus to the trigger. Captured at open-time — same pattern as Select.
- **Click outside**: close, no focus restoration.
- **Tab from inside**: close, do not consume the Tab — natural focus
  continues. `kjClosed` emits `'tab'`.
- **No focus trap by default.** Tree Select is non-modal. Optional
  `kjTreeSelectFocusTrap="true"` for full-screen / mobile drawer
  presentations (panel takes focus and traps it; close restores).

### Touch target ≥ 44×44 (WCAG 2.5.5)

- **Trigger.** `KjSize.md` preset on `[kjTreeSelectTrigger]` ≥ 44×44px.
- **Each node.** Likewise: the `data-size` reflection drives themed
  padding to clear 44px in `md`. **Critical for trees** because the
  expand-indicator + label + checkbox row at deep levels gets tight
  if the per-node row height drops below 44px. Themes that ship a
  `dense` size below 44px must declare it AA-only.
- **Indicator (expand triangle).** ≥ 24×24 visual; expand to 44×44 hit
  area via padding overlay (same trick as Multi Select chip remove
  buttons). Without this, deep trees become un-tappable on touch.
- **Checkbox glyph (multi mode).** Visual only — no separate hit area
  needed (the entire `treeitem` row is the click target; clicking the
  checkbox glyph is the same as clicking anywhere in the row, modulo
  the indicator's expand-only zone).

### Color / contrast

Theme concern. Trigger text vs background ≥ 7:1. Node text in default
state ≥ 7:1. Active-descendant focus ring outline ≥ 3:1 (WCAG 1.4.11).
Selected-state highlight (single) ≥ 3:1 against the row background;
checkbox-checked colour (multi) ≥ 3:1 against the row background.
Cascade `'mixed'` indicator (the half-checked glyph) ≥ 3:1 against the
row background **and** must be visually distinguishable from `'true'`
without colour alone (a different glyph shape, e.g. dash vs check —
WCAG 1.4.1 Use of Colour). Indent guides ≥ 3:1 against panel background
when shipped.

### Live region announcements

- **Selection changes (multi mode).** `KjLiveRegion` announces "{label}
  selected" / "{label} unselected" for direct user actions. For cascade
  actions on a parent: "{parentLabel} and {n} descendants selected" —
  one announcement, polite, debounced 100ms (same primitive as Multi
  Select's announcer).
- **Expand / collapse** is announced by AT automatically via
  `aria-expanded`'s state change; no live region needed.
- **Type-ahead while closed (single mode)** announces the new value via
  `aria-live="polite"` — same as `KjSelect`.
- **Lazy children loading** — "Loading children of {parentLabel}" on
  start; "Loaded {n} children" on resolve.

### Reduced motion

Wrapper concern. Core reflects `data-state="open\|closed"` on the panel
and `[attr.aria-expanded]` on each branch; wrapper guards transitions
with `@media (prefers-reduced-motion: reduce)`. Cascade-driven multiple
checkbox-state changes happen synchronously regardless of motion
preference (no animation on selection).

### `aria-required`, `aria-invalid`, `aria-describedby`

All three flow from the bound `NgControl` (when present) or `KjField`
context (when wrapped in a field). Reflect on the **trigger only** —
the panel does not receive `aria-describedby` (described-by lives on
the labelled control, the trigger). Same as Select.

## Composition model

```text
tree/
  tree.ts                       ← KjTree (root, expand state, keyboard owner)
  tree-node.ts                  ← KjTreeNode
  tree-node-label.ts            ← KjTreeNodeLabel
  tree-node-indicator.ts        ← KjTreeNodeIndicator
  tree-node-children.ts         ← KjTreeNodeChildren
  tree-node-indent-guide.ts     ← KjTreeNodeIndentGuide
  tree.context.ts               ← KJ_TREE + KjTreeContext + node registration helper
  tree-selection-model.ts       ← KjTreeSelectionModel (extends KjSelectionModel; cascade-aware)
  tree.example.ts
  tree.spec.ts
  index.ts

tree-select/
  tree-select.ts                ← KjTreeSelect (single root)
  multi-tree-select.ts          ← KjMultiTreeSelect (multi root)
  tree-select-trigger.ts        ← KjTreeSelectTrigger (alias / wrapper of MultiSelect trigger)
  tree-select-value.ts          ← KjTreeSelectValue (slot inside trigger)
  tree-select-content.ts        ← KjTreeSelectContent (panel host; composes KjTree)
  tree-select-clear.ts          ← KjTreeSelectClear (slot in trigger trailing)
  tree-select-empty.ts          ← *kjTreeSelectEmpty structural directive
  tree-select.context.ts        ← KJ_TREE_SELECT + KJ_MULTI_TREE_SELECT + KJ_TREE_SELECT_HOST tokens
  tree-select.example.ts
  tree-select.multi.example.ts
  tree-select.checkbox-cascade.example.ts
  tree-select.lazy-children.example.ts
  tree-select.field.example.ts
  tree-select.reactive.example.ts
  tree-select.compare-with.example.ts
  tree-select.clearable.example.ts
  tree-select.spec.ts
  multi-tree-select.spec.ts
  index.ts
```

…with these shared primitives reused (no new files):

```text
primitives/forms/
  selection-model.ts            ← KjSelectionModel (already lifted by Multi Select; KjTreeSelectionModel extends)
  form-control.ts               ← KjFormControl
primitives/interaction/
  listbox-navigation.ts         ← KjListNavigation (already lifted; consumed by KjTree on its visible-node projection)
overlay/
  anchor.ts                     ← KjAnchor (Popover anchor)
  overlay.ts                    ← KjOverlay
a11y/
  live-region.ts                ← KjLiveRegion
  directionality.ts             ← KjDirectionality
```

### Shared state — `KjTreeContext`

```ts
export interface KjTreeNodeRegistration<T = unknown> {
  /** Stable id of the node's host element (the active-descendant target). */
  readonly id: string;
  /** The node's value. */
  readonly value: Signal<T>;
  /** The label used for type-ahead and trigger display. */
  readonly searchLabel: Signal<string>;
  /** Whether the node is disabled (non-selectable, non-tab-targeted). */
  readonly disabled: Signal<boolean>;
  /** Whether the node can be selected at all (vs. expand-only "header" nodes). */
  readonly selectable: Signal<boolean>;
  /** Parent node id (null for roots). */
  readonly parentId: string | null;
  /** Depth (0-based for roots). */
  readonly level: Signal<number>;
  /** Whether the node has children (branch vs leaf). */
  readonly leaf: Signal<boolean>;
  /** The node's host element. */
  readonly element: HTMLElement;
}

export interface KjTreeContext<T = unknown> {
  /** All registered nodes in DOM (insertion) order. */
  readonly nodes: Signal<readonly KjTreeNodeRegistration<T>[]>;
  /** The **visible** node sequence (DOM order, filtered by the expand graph). */
  readonly visibleNodes: Signal<readonly KjTreeNodeRegistration<T>[]>;
  /** Per-node expand state. */
  readonly expanded: Signal<ReadonlySet<string>>;
  /** Currently active descendant (panel-open only). */
  readonly activeId: Signal<string | null>;

  /** Register a node on construction. */
  registerNode(node: KjTreeNodeRegistration<T>): { deregister: () => void };
  /** Toggle, expand, collapse a single branch. */
  toggleExpanded(id: string): void;
  expand(id: string): void;
  collapse(id: string): void;
  /** Set the active-descendant id. */
  setActive(id: string | null): void;
  /** Activate (= select / toggle) the active node, delegating to the host. */
  activateCurrent(): void;
}

export const KJ_TREE = new InjectionToken<KjTreeContext>('KjTree');
```

### Shared state — `KjTreeSelectHostContext`

The interface both `KjTreeSelect` and `KjMultiTreeSelect` satisfy. Lets
the trigger and content directives treat single and multi uniformly.

```ts
export interface KjTreeSelectHostContext<T = unknown> {
  readonly mode: 'single' | 'multi-flat' | 'multi-cascade';
  readonly value: Signal<readonly T[]>;   // Always an array; single-mode is length 0 or 1.
  readonly open: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly compareWith: Signal<(a: T, b: T) => boolean>;
  readonly panelId: string;
  readonly triggerId: Signal<string | null>;
  /** Tree state — exposed so the trigger and content can read activeId etc. */
  readonly tree: Signal<KjTreeContext<T> | null>;

  /** Trigger registers itself. */
  registerTrigger(el: HTMLElement): { triggerId: string; deregister: () => void };

  /** Open / close. */
  show(seedActive: 'selected' | 'first' | 'none'): void;
  hide(reason: KjTreeSelectCloseReason, restoreFocus: boolean): void;
  toggleOpen(): void;

  /** Activate the currently-active node (delegated by KjTree on Enter/Space). */
  activate(nodeValue: T): void;
  /** Toggle (multi only). */
  toggle?(nodeValue: T): void;
  /** Clear the value. */
  clear(): void;
}

export const KJ_TREE_SELECT_HOST = new InjectionToken<KjTreeSelectHostContext>('KjTreeSelectHost');
export const KJ_TREE_SELECT       = new InjectionToken<KjTreeSelectContext>('KjTreeSelect');
export const KJ_MULTI_TREE_SELECT = new InjectionToken<KjMultiTreeSelectContext>('KjMultiTreeSelect');

export type KjTreeSelectCloseReason =
  | 'select' | 'escape' | 'tab' | 'click-outside' | 'programmatic';
```

### `hostDirectives` composition

- `[kjTreeSelect]` (single root):
  - `KjFormControl` (CVA — value type `T \| null`, internally normalised
    to `T[]` of length 0 or 1 for the host-context bridge).
  - `KjDisabled` (input alias `kjTreeSelectDisabled`).
  - `KjLiveRegion` (selected-value announcer for closed-state type-ahead).
  - **No** `KjFocusRing` on the root — focus rings live on the trigger.
- `[kjMultiTreeSelect]` (multi root):
  - `KjFormControl` (CVA — value type `readonly T[]`).
  - `KjDisabled` (input alias `kjMultiTreeSelectDisabled`).
  - `KjLiveRegion` (selected-count + cascade announcer; same primitive
    as Multi Select).
- `[kjTreeSelectTrigger]`:
  - `KjVariant` (input alias `kjVariant`).
  - `KjSize` (input alias `kjSize`).
  - `KjFocusRing`.
  - `KjDisabled` (mirrors root).
  - `KjAriaDescribedBy` (consumed by `KjField`'s describedby chain).
  - Capture-phase click suppression on disabled (mirrors `KjButton`).
- `[kjTreeSelectContent]` + `[kjTree]` (composed on the same panel host):
  - `KjAnchor` (positioning math).
  - `KjOverlay` (click-outside, body-append optional).
  - **No** roving-tabindex primitive — `aria-activedescendant` model on
    the panel; nodes are always `tabindex="-1"`.
- `[kjTreeNode]`:
  - `KjVariant` (input alias `kjVariant`) — defaults from context.
  - `KjSize` (input alias `kjSize`) — defaults from context.
  - `KjDisabled` (input alias `kjTreeNodeDisabled`).
  - **No** `KjFocusRing` — nodes never receive DOM focus
    (`aria-activedescendant` model).
- `[kjTreeNodeIndicator]`:
  - `KjFocusRing` — but only for direct mouse-click focus; keyboard
    expand/collapse goes through the parent `treeitem`'s arrow handler,
    not through this button. The focus ring exists for the keyboard
    mouse-user case (Tab-into the indicator from outside the open panel
    is not possible — `tabindex="-1"`).

### `KJ_FIELD` integration

In its constructor, the Tree Select root reads
`inject(KJ_FIELD, { optional: true })` and, if present, calls
`field.registerControl(...)` passing the **trigger's** element ref
(once the trigger registers itself). The field's auto-minted id becomes
the trigger's id; the field's `for=` on the label points at the trigger;
the field's `describedByIds()` flow onto the trigger via
`KjAriaDescribedBy`. Same wiring as Select.

### Cross-component pointers

- **[`select.md`](./select.md)** — single-pick flat sibling. Tree Select's
  trigger, anchor, focus-restoration, type-ahead-while-closed, form
  integration are all the same patterns; the only divergence is panel
  shape (tree vs listbox). Tree Select reuses the trigger directive
  (renamed alias) and the anchor / overlay primitives. **Does not** reuse
  `KjSelectContent` or `KjSelectOption` — the panel role is `tree`,
  the option role is `treeitem`, and pretending otherwise breaks ARIA
  validity.
- **[`multi-select.md`](./multi-select.md)** — multi-pick flat sibling.
  Tree Select's multi root (`KjMultiTreeSelect`) shares the chip
  rendering pattern, the select-all toolbar (when shipped — see open
  question 6), the live-region announcer, and the `KjSelectionModel`
  base (extended by `KjTreeSelectionModel` with cascade). The chip
  rendering itself comes from `[../data-display/chip.md](../data-display/chip.md)`
  — same recipe as Multi Select's trigger.
- **[`cascade-select.md`](./cascade-select.md)** — **the firm sibling
  split**. Cascade Select solves "drill into one path of a tree at a
  time, across stacked sub-panels", visually like a multi-level
  dropdown menu where each level fans out to the right. Tree Select
  shows the **whole tree** in one panel with expand/collapse. Use
  Cascade Select when:
  (a) only one path is meaningful (geo: country → region → city; you
      pick one city, you don't browse the whole tree).
  (b) the tree is too wide / deep to render in one panel.
  (c) the consumer wants the menu-like UX of "hover into level N, the
      level N+1 panel appears next to it."
  Use Tree Select when:
  (a) multiple selection across the tree is wanted (Cascade Select is
      single-pick).
  (b) the user wants to see the structure at a glance (tax taxonomy,
      filesystem, organisation chart).
  (c) the tree is small enough to render fully or with reasonable
      expansion.
  The two share the value-bearing root pattern, the trigger contract,
  and the anchor primitive; they do **not** share panel directives.
- **[`combobox.md`](./combobox.md)** — filterable variant of Select /
  Multi Select. The future home for "filterable Tree Select" is
  Combobox-with-tree-content, not a `kjTreeSelectFilter` flag.
  Combobox composes the same `KjTree` family inside its panel, plus
  a `KjComboboxFilter` text input that mutates `KjTree`'s
  `visibleNodes` projection.
- **[`field.md`](./field.md)** — owns label-control association.
  Tree Select is a **composite control** from Field's perspective: the
  registered control element is the trigger. Field flows
  `aria-describedby` and the required mirror onto the trigger.
  `<label for>` on a `<button role="combobox">` is invalid HTML, so
  Field's auto-detection routes to `aria-labelledby` for the trigger
  case — same logic Multi Select uses.
- **[`form.md`](./form.md)** — higher-level form orchestrator. No
  direct coupling.
- **[`../data-display/list.md`](../data-display/list.md)** — **List
  absorbs `KjTree` as a presentation mode** (per the roadmap). The
  same `KjTree*` directives that power Tree Select's panel power List's
  hierarchical mode. Concretely: a `<ul kjList kjListMode="tree">` that
  internally composes `<li kjTreeNode>` produces a sidebar / drawer /
  in-page tree without any select-panel framing. The List analysis
  documents the standalone-tree composition; this analysis documents
  the Select-panel composition. Same directives, same a11y, two hosts.
- **[`../actions/dropdown-menu.md`](../actions/dropdown-menu.md)** —
  architectural cousin to Cascade Select (submenu pattern). Different
  ARIA from Tree Select (`role="menu"` / `role="menuitem"` vs.
  `role="tree"` / `role="treeitem"`). **Different semantics:** menu
  items are *actions*; tree nodes are *values*. Don't merge.
- **[`../feedback/popover.md`](../feedback/popover.md)** — defines the
  shared `KjAnchor` primitive that `[kjTreeSelectContent]` consumes for
  positioning, side / align resolution, collision avoidance.
- **[`../actions/button.md`](../actions/button.md)** — pattern for
  variant / size / focus-ring / disabled composition. The trigger
  follows it.
- **[`primitives/forms/form-control.ts`](../../packages/core/src/primitives/forms/form-control.ts)** —
  Tree Select root composes `KjFormControl` for CVA.
- **[`a11y/aria-describedby.ts`](../../packages/core/src/a11y/)** —
  `KjAriaDescribedBy` host directive on `[kjTreeSelectTrigger]`.
- **[`../data-display/chip.md`](../data-display/chip.md)** (forward
  reference) — chip family used by `KjMultiTreeSelect`'s trigger for
  selected-value chip rendering. Same `<kj-chip kjVariant="ghost">` recipe
  Multi Select uses.

## Inputs / Outputs / Models — `kj`-prefixed

### `[kjTreeSelect]` (single root)

| Member                          | Kind   | Type                                        | Default            | Notes                                                                                              |
| ------------------------------- | ------ | ------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| `kjTreeSelectValue`             | model  | `T \| null \| undefined`                    | `undefined`        | Two-way bindable. Single value (selected node).                                                    |
| `kjOpen`                        | model  | `boolean`                                   | `false`            | Programmatic open/close.                                                                            |
| `kjTreeSelectDisabled`          | input  | `boolean`                                   | `false`            | Forwarded via `KjDisabled`.                                                                         |
| `kjTreeSelectReadonly`          | input  | `boolean`                                   | `false`            | Trigger focusable, panel doesn't open.                                                              |
| `kjTreeSelectInvalid`           | input  | `boolean`                                   | `false`            | Reflects `aria-invalid` on trigger when `formCtrl.touched()`.                                       |
| `kjCompareWith`                 | input  | `(a: T, b: T) => boolean`                   | reference equality | For object-valued nodes.                                                                             |
| `kjTreeSelectClearable`         | input  | `boolean`                                   | `false`            | Renders a clear button in the trigger trailing slot.                                                 |
| `kjTreeSelectPlaceholder`       | input  | `string`                                    | `''`               | Rendered by `KjTreeSelectValue` when value is empty.                                                  |
| `kjName`                        | input  | `string \| undefined`                       | `undefined`        | Native `name` for hidden-input postback.                                                             |
| `kjSide`                        | input  | `'top' \| 'right' \| 'bottom' \| 'left'`    | `'bottom'`         | Reflected as `data-side` on content.                                                                  |
| `kjAlign`                       | input  | `'start' \| 'center' \| 'end'`              | `'start'`          | Reflected as `data-align` on content.                                                                 |
| `kjOffset`                      | input  | `number`                                    | `4`                | Px offset between trigger and panel.                                                                  |
| `kjAvoidCollisions`             | input  | `boolean`                                   | `true`             | Anchor primitive flips/shifts.                                                                        |
| `kjMatchTriggerWidth`           | input  | `boolean`                                   | `true`             | Panel `min-width` matches trigger width.                                                               |
| `kjLoop`                        | input  | `boolean`                                   | `false`            | Arrow-key wrap on the visible-node sequence.                                                           |
| `kjPageSize`                    | input  | `number`                                    | `10`               | PageUp / PageDown jump distance (over visible nodes).                                                 |
| `kjTypeaheadDebounceInterval`   | input  | `number`                                    | `200`              | Milliseconds.                                                                                          |
| `kjTreeExpanded`                | model  | `readonly NodeId[]`                         | `[]`               | Two-way bindable expand state. Initial render seeds the expand set.                                  |
| `kjTreeSelectFocusTrap`         | input  | `boolean`                                   | `false`            | Full-screen / drawer presentations: panel takes focus + traps.                                       |
| `kjAriaLabel`                   | input  | `string \| null`                            | `null`             | Forwarded to trigger when no `KjField` parent.                                                        |
| `kjAriaLabelledby`              | input  | `string \| null`                            | `null`             | Override of auto-resolved `aria-labelledby`.                                                          |

| Output                          | Kind   | Payload                            | Notes                                                                                          |
| ------------------------------- | ------ | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `kjTreeSelectValueChange`       | output | `T \| null`                        | Paired with `kjTreeSelectValue` model.                                                          |
| `kjOpenChange`                  | output | `boolean`                          |                                                                                                  |
| `kjOpened`                      | output | `void`                             | After panel finishes opening.                                                                   |
| `kjClosed`                      | output | `KjTreeSelectCloseReason`          | `'select' \| 'escape' \| 'tab' \| 'click-outside' \| 'programmatic'`.                            |
| `kjCleared`                     | output | `void`                             | When clear button activates.                                                                    |
| `kjTreeExpandedChange`          | output | `readonly NodeId[]`                | Paired with `kjTreeExpanded` model.                                                              |
| `kjTreeNodeExpand`              | output | `T`                                | A specific node was expanded.                                                                   |
| `kjTreeNodeCollapse`            | output | `T`                                | A specific node was collapsed.                                                                   |

### `[kjMultiTreeSelect]` (multi root)

| Member                          | Kind   | Type                                                              | Default                        | Notes                                                                                              |
| ------------------------------- | ------ | ----------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `kjMultiTreeSelectValue`        | model  | `readonly T[]`                                                    | `[]`                           | Two-way bindable. Shape governed by `kjTreeSelectValueShape`.                                        |
| `kjTreeSelectValueShape`        | input  | `'leaves' \| 'leaves-and-fully-checked-parents' \| 'all-checked'` | `'leaves'`                     | See [Decision: cascade value shape](#decision-cascade-value-shape).                                  |
| `kjTreeSelectCascade`           | input  | `'full' \| 'down' \| 'up' \| 'none'`                              | `'full'`                       | See [Decision: cascade direction](#decision-cascade-direction).                                       |
| `kjMultiTreeSelectDisplay`      | input  | `'chips' \| 'comma' \| 'custom'`                                  | `'chips'`                      | Mirrors `kjMultiSelectDisplay`.                                                                       |
| `kjMultiTreeSelectMaxChips`     | input  | `number`                                                          | `3`                            | Mirrors `kjMultiSelectMaxChips`.                                                                       |
| `kjMultiTreeSelectAnnounceItems`| input  | `boolean`                                                         | `false`                        | Per-item announcements (vs. count-only).                                                              |
| `kjMultiTreeSelectChipsTabbable`| input  | `boolean`                                                         | `false`                        | Mirrors `kjMultiSelectChipsTabbable`.                                                                  |
| `kjCloseOnSelect`               | input  | `boolean`                                                         | `false`                        | Default false (multi semantics). True for the rare PrimeNG-style "hideOnSelect".                      |
| ...all single-mode shared inputs (`kjCompareWith`, `kjOpen`, `kjSide`, `kjAlign`, `kjOffset`, `kjAvoidCollisions`, `kjMatchTriggerWidth`, `kjLoop`, `kjPageSize`, `kjTypeaheadDebounceInterval`, `kjTreeExpanded`, `kjAriaLabel`, `kjAriaLabelledby`, `kjMultiTreeSelectDisabled`, `kjMultiTreeSelectReadonly`, `kjMultiTreeSelectInvalid`, `kjName`, `kjMultiTreeSelectPlaceholder`, `kjMultiTreeSelectFocusTrap`) | | | | |

| Output                          | Kind   | Payload                            | Notes                                                                                          |
| ------------------------------- | ------ | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `kjMultiTreeSelectValueChange`  | output | `readonly T[]`                     |                                                                                                  |
| `kjTreeNodeSelect`              | output | `T`                                | A node was added to the selection (single-action, not cascade-derived).                          |
| `kjTreeNodeUnselect`            | output | `T`                                | A node was removed from the selection.                                                            |
| ...all shared outputs           |        |                                    |                                                                                                  |

### `[kjTreeSelectTrigger]`

No public inputs / outputs (combobox role + keyboard contract; reads
`KJ_TREE_SELECT_HOST`). Receives `kjVariant` / `kjSize` / `kjDisabled`
via composed host directives.

### `[kjTreeSelectValue]`

| Member                          | Kind   | Type                | Default | Notes                                                                                  |
| ------------------------------- | ------ | ------------------- | ------- | -------------------------------------------------------------------------------------- |
| `kjTreeSelectPlaceholder`       | input  | `string`            | `''`    | Falls back to root's `kjTreeSelectPlaceholder` / `kjMultiTreeSelectPlaceholder`.      |

Renders projected `<ng-content>` if any, else the selected node's
`searchLabel` (single) / chips (multi), else the placeholder.

### `[kjTreeSelectContent]`

No public inputs / outputs. Composes `[kjTree]` on the same host element.

### `[kjTree]` (root of the tree primitive)

| Member                          | Kind   | Type                                        | Default            | Notes                                                                                              |
| ------------------------------- | ------ | ------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| `kjTreeExpanded`                | model  | `readonly string[]`                         | `[]`               | Initial expand state. (When inside `KjTreeSelect`, the root mirrors this onto its own `kjTreeExpanded`.) |
| `kjLoop`                        | input  | `boolean`                                   | `false`            | Wrap-around on arrow nav.                                                                           |
| `kjAriaLabel` / `kjAriaLabelledby` | input | `string \| null`                          | `null`             | Used when `KjTree` is standalone (sidebar use); inside `KjTreeSelect` the host wires labelling.    |

| Output                          | Kind   | Payload                            | Notes                                                                                          |
| ------------------------------- | ------ | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `kjTreeNodeActivate`            | output | `KjTreeNodeRegistration`           | Enter / Space on the active node. Standalone consumers use this; inside `KjTreeSelect` the host intercepts and applies selection. |
| `kjTreeExpandedChange`          | output | `readonly string[]`                |                                                                                                  |

### `[kjTreeNode]`

| Member                          | Kind   | Type                                | Default     | Notes                                                                                  |
| ------------------------------- | ------ | ----------------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| `kjTreeNodeValue`               | input  | `T`                                 | required    | The node's value. Used by host's selection model.                                      |
| `kjTreeNodeId`                  | input  | `string \| undefined`               | `undefined` | Stable id (overrides auto-mint). Used by `kjTreeExpanded`.                              |
| `kjTreeNodeDisabled`            | input  | `boolean`                           | `false`     | Forwarded to `KjDisabled`.                                                              |
| `kjTreeNodeSelectable`          | input  | `boolean`                           | `true`      | Whether the node can be selected.                                                       |
| `kjTreeNodeLeaf`                | input  | `boolean \| undefined`              | `undefined` | Force leaf classification (default: derived from presence of `[kjTreeNodeChildren]` projected content). |
| `kjTreeNodeSearchLabel`         | input  | `string \| undefined`               | `undefined` | Override type-ahead matching text (default: `el.textContent?.trim()`).                  |
| `kjTreeNodeChildrenLoad`        | input  | `((value: T) => Observable<T[]> \| Promise<T[]>) \| undefined` | `undefined` | Lazy children fetcher. See open question 2. |
| `kjVariant`                     | input  | `KjVariant`                         | from ctx    |                                                                                        |
| `kjSize`                        | input  | `KjSize`                            | from ctx    |                                                                                        |

| Output                          | Kind   | Payload          | Notes                                                                                  |
| ------------------------------- | ------ | ---------------- | -------------------------------------------------------------------------------------- |
| `kjTreeNodeExpandChange`        | output | `boolean`        | Emitted when this branch's expand state flips.                                          |

### `[kjTreeNodeIndicator]`

| Member                          | Kind   | Type                | Default     | Notes                                                                                  |
| ------------------------------- | ------ | ------------------- | ----------- | -------------------------------------------------------------------------------------- |
| `kjTreeNodeIndicatorLabel`      | input  | `{ expand: string; collapse: string }` | `{ expand: 'Expand', collapse: 'Collapse' }` | Locale-overridable. |

No outputs. Click toggles the parent's expand state via the tree
context.

### `[kjTreeNodeLabel]`, `[kjTreeNodeChildren]`, `[kjTreeNodeIndentGuide]`

No public inputs / outputs. Pure structural / a11y wiring.

## Examples to ship

Match the structure under `packages/components/src/tree-select/` and
`packages/components/src/tree/`:

1. **Default (single)** — `tree-select.example.ts`. A three-level
   geo tree (Country → Region → City) with `kjTreeSelectValue`
   two-way-bound to a signal.
2. **Multi with chips and cascade** —
   `tree-select.multi.example.ts`. `<div kjMultiTreeSelect>` with
   `kjTreeSelectCascade="full"` (default), chip-mode trigger.
3. **Checkbox cascade tri-state** —
   `tree-select.checkbox-cascade.example.ts`. Demonstrates the
   `aria-checked="mixed"` parent state when only some descendants are
   selected.
4. **Cascade modes** —
   `tree-select.cascade-modes.example.ts`. Side-by-side `'full'` /
   `'down'` / `'up'` / `'none'` to show the difference.
5. **Value shape** —
   `tree-select.value-shape.example.ts`. Three trees bound to the same
   selection set rendered with `'leaves'`, `'leaves-and-fully-checked-parents'`,
   and `'all-checked'` — print the form value alongside.
6. **Object values + `compareWith`** —
   `tree-select.compare-with.example.ts`. Nodes whose values are
   `{ id, name }` objects; `kjCompareWith` matches on `id`. Demonstrates
   the re-fetch-with-new-instances scenario.
7. **Lazy children** —
   `tree-select.lazy-children.example.ts`. Branches with
   `kjTreeNodeChildrenLoad` returning an `Observable<T[]>`; demonstrates
   the loading state and live-region announcement.
8. **Pre-expanded** — `tree-select.expanded.example.ts`.
   `kjTreeExpanded` seeded with the path to a deep node so it's visible
   on open.
9. **Reactive form** —
   `tree-select.reactive.example.ts`. `[formControl]` bound to a
   `FormControl<string[]>([])` with `Validators.required`; error rendered
   via `KjFieldError`.
10. **Template-driven form** —
    `tree-select.ngmodel.example.ts`. `[(ngModel)]` against an object
    array.
11. **In a Field** — `tree-select.field.example.ts`. `<div kjField>`
    with `<label kjFieldLabel>` and `<span kjFieldError>`.
12. **Disabled control** — `tree-select.disabled.example.ts`.
    `kjMultiTreeSelectDisabled="true"` and form-side `.disable()`.
13. **Disabled nodes** —
    `tree-select.disabled-nodes.example.ts`. Specific branches
    `kjTreeNodeDisabled` to demonstrate cascade behaviour with disabled
    parents and disabled descendants.
14. **Non-selectable headers** —
    `tree-select.headers.example.ts`. Top-level "category" nodes
    `kjTreeNodeSelectable="false"` — expandable but not pickable.
15. **Readonly** — `tree-select.readonly.example.ts`.
    `kjMultiTreeSelectReadonly="true"`; chips visible but non-removable.
16. **Clearable** — `tree-select.clearable.example.ts`.
    `kjTreeSelectClearable="true"` (single mode).
17. **Custom node template** —
    `tree-select.custom-node.example.ts`. Per-node icons, secondary
    text, and a trailing badge.
18. **Standalone tree (no select panel)** —
    `tree.example.ts`, `tree.example-with-icons.example.ts` under
    `packages/components/src/tree/` and the core-side equivalents under
    `packages/core/src/tree/`. Demonstrates the `KjTree` family used
    outside `KjTreeSelect`.
19. **Themed (core-only)** —
    `tree-select.example.ts`, `tree-select.retro.example.ts`,
    `tree-select.finance.example.ts` under
    `packages/core/src/tree-select/`.

## Open questions / risks

1. **Tree primitive lift order.** `KjTree` ships before or alongside
   `KjTreeSelect`? **Recommendation: ship `KjTree` first as an
   independent unit** (it's also needed by List per the roadmap), with
   its own spec coverage and standalone examples; then build
   `KjTreeSelect` on top in a follow-up. The two-PR split lets the
   shared family soak in standalone use before the select-panel
   integration constrains it. Spec coverage for the standalone tree
   locks the keyboard / a11y contract before Tree Select's tests
   layer on the host-context bridging.

2. **Lazy children — async loading semantics.** Three sub-questions:
   (a) **Where does the loading state live?** Per-branch (`KjTreeNode`
       reflects `data-loading="true"`), not on the panel. The panel
       remains interactive; only the loading branch is in flight.
   (b) **What does the user see?** A spinner glyph in place of the
       expand indicator while loading; on resolve, replace with a
       triangle and render children. On reject, replace with an error
       glyph and an `aria-describedby` to a `role="alert"` message
       below the node.
   (c) **What does AT hear?** "Loading children of {label}" via
       `KjLiveRegion` polite, debounced 100ms (same primitive as Multi
       Select's announcer). On resolve: "Loaded {n} children". On
       reject: "Failed to load children of {label}: {error}".
   Implementation: `KjTreeNode` accepts `kjTreeNodeChildrenLoad` and
   manages its own per-instance loading signal. The fetched children
   are not stored by `KjTreeNode` — the consumer's data graph is the
   source of truth — so the consumer must update their own
   `roots()` / `children` signal in the load callback's tap. Document
   the pattern.

3. **Per-node `id` stability vs auto-mint.** `[kjTreeNodeId]` is
   optional (auto-minted via `inject(_IdGenerator).getId('kj-tree-node-')`).
   But `kjTreeExpanded` tracks expand state by id — if the consumer
   doesn't supply stable ids and the data graph re-renders, the expand
   state is lost. **Recommendation: dev-mode warning** when
   `kjTreeExpanded` is non-empty and any node lacks `kjTreeNodeId`,
   pointing the consumer at the stability requirement. Production
   builds silently auto-mint and accept the loss-on-rerender.

4. **`aria-posinset` / `aria-setsize` recomputation cost.** Every node
   computes its position among siblings on every registration change.
   For a 1000-node tree with many concurrent registrations during
   first render, the recomputation can be O(N²). **Recommendation:**
   compute on registration in O(N) by maintaining a
   parent→ordered-children map at the tree-context level, and let
   each node read its position from the map (not by querying its
   parent's children every time). Profile under `tree.spec.ts`'s
   1000-node fixture.

5. **`role="treeitem"` and selection in single mode.** APG says a single-
   selectable tree uses `aria-selected="true \| false"` on `treeitem`s
   (with at most one `true`); a multi-selectable tree sets
   `aria-multiselectable="true"` on the tree and `aria-selected` /
   `aria-checked` on the items. Some AT (older JAWS) prefer
   `aria-checked` even in single mode. **Recommendation: use
   `aria-selected` in single, `aria-checked` (with `'mixed'`) in multi**
   — matches APG and PrimeNG 18, modern AT support is strong.

6. **Select-all / clear-all toolbar in multi.** Multi Select ships
   `KjMultiSelectAllToggle`. Tree Select multi: does it ship the same?
   "Select all" on a tree is unambiguous (selects every selectable
   leaf, cascades up); "Clear all" likewise. **Recommendation: ship
   `KjMultiTreeSelectAllToggle`** alongside the panel toolbar, with
   tri-state `aria-checked` derived from the cascade-aware count of
   leaves. Same primitive design as Multi Select's; reuse the directive
   with a context-token swap.

7. **Cascade up + disabled descendants.** When cascade is `'full'` or
   `'up'` and a descendant is disabled (and therefore unselectable),
   does selecting all *other* descendants of a parent flip the parent
   to fully-checked? **Recommendation: yes — disabled descendants are
   excluded from the cascade-up parity check.** The parent flips to
   fully-checked when all *enabled* descendants are checked. This
   matches user intent ("I picked everything I could") and PrimeNG's
   behaviour. Document explicitly because it's surprising at first
   glance.

8. **Cascade down + per-leaf disabled.** When cascade is `'full'` or
   `'down'` and a parent is selected, does the cascade write to
   disabled descendants? **Recommendation: no — disabled descendants
   are skipped in down propagation.** Selecting a parent puts every
   *enabled* descendant in the value array. This matches the
   complement of the previous question and is the PrimeNG behaviour.

9. **Type-ahead across collapsed branches.** When the user types a
   prefix that matches a node *inside a collapsed branch*, does the
   tree auto-expand to reveal it? **Recommendation: no — type-ahead
   matches only visible nodes.** Auto-expanding on type-ahead changes
   the tree's structural state silently (a side effect of search) and
   is surprising to users. APG's tree pattern is silent on this; the
   listbox pattern's type-ahead is confined to visible items.
   Exception: when the panel opens and the seeded active descendant
   is inside a collapsed branch (e.g. the previously-selected single
   value), expand the path to reveal it on open. This is a one-time
   open-time projection, not a per-keystroke side effect.

10. **`aria-expanded` on leaves vs. branches.** APG: omit
    `aria-expanded` on leaves (any value implies "this is expandable").
    Some AT announce "collapsed" for `aria-expanded="false"` on what
    visually looks like a leaf, confusing users. **Recommendation:
    omit `aria-expanded` on leaves entirely** — only branches set it.
    `KjTreeNode` derives leaf-ness from presence of projected
    `[kjTreeNodeChildren]` content (or `kjTreeNodeLeaf="true"` override
    for lazy-loaded branches that have no children fetched yet but
    will).

11. **Lazy branch with no children fetched yet — leaf or branch?**
    A branch with `kjTreeNodeChildrenLoad` set but no children loaded
    *appears* leaf-like in the DOM (no `[kjTreeNodeChildren]` rendered
    yet) but is semantically a branch. **Recommendation:
    `kjTreeNodeLeaf="false"` is the explicit override** — the consumer
    declares the node is a branch even though no children are
    rendered. `aria-expanded="false"` is then set on it; expanding
    triggers the load. A branch that loaded zero children is then
    `kjTreeNodeLeaf` un-set (auto-derived to leaf-ness by the empty
    children container).

12. **Touched semantics.** When does `KjFormControl.touched()` flip
    for Tree Select? **Recommendation: panel close** (same as Multi
    Select Q12). The act of closing the panel — by selecting (single),
    by Escape, by outside-click, by Tab — is the primary "I'm done"
    gesture. Trigger blur after panel-close is redundant. If the user
    never opens the panel and tabs through, trigger blur fires
    `notifyTouched`. Both paths cover.

13. **Validation: minimum / maximum / shape constraints.** Out of
    scope for the directive. Use validators on the bound `FormControl`:
    minimum-leaves-selected, "must include at least one leaf from
    branch X", etc., are custom-validator territory. Document the
    recipe in the form-integration example.

14. **SSR.** Panel is hidden by `[attr.hidden]` until interaction.
    `KjAnchor` / `KjOverlay` run in browser only. `KjLiveRegion`
    is browser only. Tree node registration runs during constructor —
    safe in SSR (DOM-touch happens in `afterRenderEffect`, not the
    constructor). No expected hydration mismatches; verify with the
    SSR app once the family lands.

15. **Why `role="tree"` and not `role="listbox"` with hierarchical
    grouping?** APG explicitly defines Tree as a separate pattern
    from Listbox because the keyboard contract and selection
    semantics differ (expand/collapse, parent-child relationships).
    A "listbox with groups" doesn't model parent-child selection.
    Document the distinction in the family TSDoc — consumers
    coming from `KjSelect` will reasonably ask "why isn't this
    just `KjSelect` with nested options?"

16. **Virtual scroll.** Out of scope for v1. Virtualising a tree
    requires a windowed flat-projection (the `visibleNodes` signal,
    rendered through a viewport) plus a scroll-position-to-index
    mapping that respects expand/collapse state changes. Not blocking
    v1 — most consumer trees are < 500 nodes. Plan for v1.1 alongside
    the Combobox + virtual-scroll work.

17. **Filter / search.** Deferred entirely to a future Combobox + Tree
    composition. See [Decision: filter mode](#decision-filter-mode).
    The hooks (`visibleNodes` projection on `KjTree`) are present;
    the directive isn't shipped in v1.

18. **`role="combobox"` on a non-textbox `<button>`.** APG 1.2 explicitly
    permits `role="combobox"` on a button when no inline filtering
    is offered. NVDA, JAWS, VoiceOver all support it as of 2019. The
    `<p-treeSelect>` v18 implementation confirms this works in
    production for AT users. We follow the same pattern (matches the
    [APG combobox (Select Only) example](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/),
    extended to popup-role tree).

19. **Maintenance — refactor `KjListNavigation` as Tree's keyboard
    base.** Tree's arrow handler reuses `KjListNavigation` (lifted by
    Multi Select). The primitive's `mode: 'single' | 'multi'`
    discriminator extends with a `'tree'` mode that adds Right/Left
    arrow handling on top of Up/Down. The base navigator's contract
    (move active descendant through an indexed sequence) is unchanged;
    Tree just supplies a different "sequence" (the visible-nodes
    projection) and adds extra keys. Land both refactors in the same
    PR as the Tree primitive ships.

20. **Cascade-mixed and the value array's stability.** When cascade is
    `'full'` and the consumer toggles a parent, the value array gets
    every descendant leaf added. The order matters for reactive-form
    equality checks. **Recommendation: source order** (registration
    order — same as Multi Select Q7). The `KjTreeSelectionModel`
    materialises every emit by re-projecting the selected set onto the
    registered-leaves order. Selection-order mode is not shipped in
    v1; selection-order is meaningless under cascade because the order
    in which descendants get added is implementation-detail of the
    cascade walk.

21. **No native fallback — document the gap.** Per
    [Decision: no native fallback](#decision-no-native-fallback). The
    family TSDoc must call out that a `KjNativeTreeSelect` is not
    forthcoming and that for dense filter-bar use the consumer should
    encode hierarchy in flat `KjSelect` option labels.

22. **Cross-component coupling with List.** The roadmap absorbs `KjTree`
    into List as the "tree mode". The List analysis must be authored
    *after* this analysis or in coordination with it; the directive
    file paths and context tokens (`KJ_TREE`) are owned here. Sequence:
    Tree Select analysis (this) → List analysis (consumes `KjTree`
    family verbatim, documents standalone-tree composition) → Tree
    family ships → List ships in tree mode → Tree Select ships.
    Document the dependency in the List analysis when authored.
