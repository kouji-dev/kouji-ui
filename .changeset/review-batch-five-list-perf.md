---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

review batch 5 (lists): selection membership is indexed, the tree renders only what is visible, and the combobox / command palette can window 5 000 rows

**Selection membership is O(1) (perf F-6).** `KjSelectionModel` keeps `value`
as the array it always was, but multi-style membership now answers from a `Set`
index rebuilt once per value change instead of a linear `some()` scan run once
per rendered item. A click in a 5 000-option multi-select cost O(n × m)
comparisons — every item's `aria-selected` computed rescanned the whole
selection — and now costs one O(m) rebuild plus O(1) per item. `_multiToggle`
and the cascade branch toggle use the same index. A custom `compareBy` keeps the
scan, because no hash structure can honour it; `-0` falls back too, so the
indexed answer is bit-for-bit what `Object.is` would have said.

**Auto-derived tree topology is O(1) per query (perf F-7).** The shape derived
from DOM-nested `KjListItem` parents resolved every `getParent` / `getChildren`
/ `isLeaf` by scanning all map keys. It now probes the map first — which is the
default `Object.is` comparator, natively — and keeps the scan only as the
custom-comparator fallback. `cascadeState()` is memoised per (value, shape,
mode) version, so the siblings rendering one branch walk it once between them
instead of once each.

**`<kj-tree-select>` renders only the visible rows (perf F-14).** A collapsed
branch's descendants leave the DOM instead of staying behind `[hidden]`: a
5 100-node tree with one branch open now mounts 150 rows, not 5 100. Visibility
is one pass over the flattened tree per expansion change (depth-based, so a
collapsed subtree is skipped whole) rather than a method binding re-evaluated
per row per render, and `selectionMode() === 'multiple'` is hoisted out of the
row loop. `KjTreeSelect.expandedIds` / `expandedValues` no longer hand out a
defensive `new Set` copy on every read.

*Behaviour note:* the documented "all nodes stay in the DOM" posture is gone.
`aria-level` / `aria-posinset` / `aria-setsize` are unchanged and still correct
— they describe a node's position among its siblings, and siblings are always
shown or hidden together — but code that queried collapsed rows through
`document.querySelector` will no longer find them.

**Windowed lists for combobox and command palette (perf F-4).** New core
primitive `KjListVirtual` (`[kjListVirtual]`, no new dependency) windows a
uniform-row popup list: it exposes the rendered range plus the spacer sizes,
measures a rendered row for its height, seeds the first rows on the server, and
scrolls a row into the window on demand.

- `<kj-command-palette [kjVirtual]>` windows its `[kjItems]` rows.
- `<kj-combobox [options]>` is a new data-driven option list, and `[virtual]`
  windows it. `<ng-template kjComboboxOptionTemplate>` supplies a custom row.

Keyboard navigation still walks the whole dataset: `KjListNavigatorConfig`
gained an optional `virtual` cursor (`KjListVirtualSource`), and when a
container exposes one, `KjListNavigator` moves by dataset index — wrap, clamp
and skip-disabled included — and the container scrolls the row into the window
before it becomes `aria-activedescendant`. `aria-posinset` / `aria-setsize`
report the dataset, not the window, via `KjFilterableList.setWindow()`.

**Fixed while wiring the above: `<kj-combobox-option>` never registered.** It
composed `KjComboboxOption` on an inner `<button>` inside its own view, and
`KjCombobox.items` is a content query — which never crosses into a child
component's view. Projected options were therefore never filtered, never
numbered, never navigable and never announced their selected state. The
directive now sits on the `<kj-combobox-option>` host, the same fix (and the
same reasoning) the menubar item got in batch 4.

*Behaviour note:* the rendered option is now `<kj-combobox-option role="option"
class="kj-combobox-option">` with no inner `<button>`. `[value]`, `[disabled]`
and projected content are unchanged; `[disabled]` now reaches the listbox as
`aria-disabled` rather than the native attribute. `KjCombobox` also gained an
`@internal` `_setViewItems()` so a wrapper that stamps rows in its own view can
register them.

`[kjDisabled]` is now forwarded by `[kjComboboxOption]`.

**Fixed for the same reason: `<kj-tree-select>` had no keyboard access.** Its
rows are painted by the wrapper's own template, which the root's content query
cannot see, so the tree registered zero items: every node rendered
`tabindex="-1"`, the panel had no roving tab stop, and neither arrow keys,
Home / End nor type-ahead could reach a node (WCAG 2.1.1 Keyboard, 2.4.3 Focus
Order). Each `<kj-tree-select-node>` now registers its row with the wrapper,
which hands them to `KjTreeSelect` in tree order. `ownListItems()` gained an
optional third argument for this, and `KjTreeSelect` an `@internal`
`_setViewItems()`.

*Behaviour note:* opening the styled tree now moves focus onto the selected —
else first — node, which is what `KjListPanelFocus` always intended and what
the APG tree pattern asks for; it simply had no items to focus before.

**And, for the third time, `<kj-select>`.** `<kj-option>` composed the core
`KjOption` directive on a `<div>` inside its own view, so `KjSelect.items` —
also a content query — was empty: the listbox had no roving tab stop (every row
rendered `tabindex="-1"`), no ArrowUp / ArrowDown / Home / End, no type-ahead
and no `aria-posinset` / `aria-setsize` (WCAG 2.1.1, 2.4.3, 1.3.1). `KjListItem`
now sits on the `<kj-option>` host.

*Behaviour note:* the rendered option is `<kj-option role="option"
class="kj-option">` with no inner `<div>`, and the host is a block rather than
`display: contents`. `[value]`, `[kjLabel]` and projected content are
unchanged, and `<kj-option>` gained a `[disabled]` input that reaches the
listbox as `aria-disabled`.
