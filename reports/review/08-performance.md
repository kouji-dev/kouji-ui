# Runtime Performance Review

Scope: `packages/core/src` (603 ts) + `packages/components/src` (765 ts), Angular 22 monorepo.
Method: static reading + grep. No builds, no test runs, no source edits.

## Verdict

The *structural* performance hygiene of this library is genuinely good: every shipped
directive and component is `OnPush`, all 79 `@for` blocks carry an explicit
identity-based `track`, there is no `NgZone`, no `markForCheck`, essentially no manual
change detection, no JS animation loop, and every RxJS subscription in a component is
`takeUntilDestroyed`-scoped. The overlay stack installs exactly two shared document
listeners for the whole app instead of one pair per overlay. That is the hard part, and
it is done.

What drags the grade down is a small number of **hot-path algorithms and per-cycle
allocations sitting under the heaviest widgets** — a DOM-sanitizer call inside an
`[innerHTML]` binding in the chat message, a scroll listener that forces two synchronous
layouts per scroll event for every open overlay, a `localStorage.setItem` on every table
row click, an O(N) key scan inside the selection model's tree shape, and a virtualizer
that never measures a row. None of these are visible on a demo page with ten rows; all of
them are the first thing a user hits at real data volume, which is exactly the audience a
table/combobox/chat kit is sold to. Virtualization also exists in precisely one place
(the table); option lists, chat threads, tree panels and accordions all render their full
content set.

**Grade: C+** — well-architected, with a handful of specific, fixable hot-path defects
that will dominate real-world profiles.

## What works

- **`OnPush` everywhere that ships.** Diffing `@Component` files against
  `ChangeDetectionStrategy.OnPush` leaves only `_examples/` / `*.example.ts` /
  `*.playground.ts` files plus four false positives where `@Component` appears inside a
  TSDoc block (`packages/core/src/checkbox/checkbox.ts:22`,
  `packages/core/src/input/input.ts:19`,
  `packages/core/src/input-mask/input-mask.presets.ts:12`,
  `packages/core/src/table/filter-params.ts:75`). No real component is missing `OnPush`.
- **`@for` tracking is flawless.** All 79 `@for` blocks declare `track`. Every one keyed
  on object data uses a stable identity (`r.id`, `h.id`, `m.id`, `f.id`, `col.id`,
  `tc.id`, `item.path`, `row.node.value`); `$index` / bare-value tracking only appears on
  stable primitive lists (`input-otp` cells, pagination tokens, page sizes). This is
  better than most Angular codebases and deserves a lint rule to keep it that way.
- **Shared, lifecycle-scoped global listeners.** `packages/core/src/primitives/overlay/stack.ts:80-92`
  installs one `keydown` + one `pointerdown` capture listener the first time *any* overlay
  registers, and removes them when the stack empties — instead of a pair per overlay
  instance. Only one component in the whole repo uses per-instance `(document:…)` host
  bindings (F-16).
- **No zone, no manual CD.** Repo-wide grep for `markForCheck|NgZone` returns zero hits.
  The only two `detectChanges()` calls are in dynamic-view mounting paths
  (`packages/core/src/primitives/overlay/builder.ts:117`,
  `packages/components/src/table/table-cell-editor-outlet.ts:100`), which is the correct
  place for them.
- **Table state updates are deduped.** `packages/core/src/table/table.ts:140-151` runs a
  structural `sliceEqual` before invalidating the state signal, and
  `packages/core/src/table/table.ts:106-113` deliberately keeps the transient
  `columnSizingInfo` out of `state` so a resize drag does not echo through
  `(stateChange)` or persistence. Both are considered decisions with the reasoning
  written down.
- **Observer discipline.** Every `ResizeObserver` / `MutationObserver` /
  `IntersectionObserver` in the repo has a matching `disconnect()` wired to `DestroyRef`
  or `ngOnDestroy`. The core chart even coalesces resize into a single rAF
  (`packages/core/src/chart/chart.ts:174-180`).
- **Subscriptions are scoped.** `packages/components/src/table/table-side-panel.ts:253`
  and `packages/components/src/table/table-filters/text-filter.ts:100` both pipe through
  `takeUntilDestroyed(this.destroyRef)`, and the text filter debounces before touching
  TanStack.
- **All motion is CSS.** Grep for `requestAnimationFrame` / `setInterval` turns up only a
  rAF-coalesced chart resize, a one-shot focus defer, carousel autoplay, and a
  number-stepper repeat timer. No JS tween loops, no `transition` on `transform`-avoidable
  properties outside the two cases in F-13.

## Findings

### F-1 Chat message runs `DomSanitizer.sanitize` on every change-detection cycle

**Severity:** high · **Confidence:** high · **Effort:** S

**Files:** `packages/components/src/chat/chat-message.ts:91`, `:155`, `:167-169`;
`packages/components/src/chat/chat-thread.ts:83-92`

```ts
// chat-message.ts:91  — template
<div class="kj-chat-md" [innerHTML]="safe(block.html)"></div>

// chat-message.ts:167
safe(html: string): SafeHtml {
  return this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '';
}
```

`safe()` is a plain method call inside a binding, so Angular re-invokes it for **every
prose block, of every message, on every CD cycle of this component**. `sanitize(HTML, …)`
is not a cheap string op — it builds an inert DOM from the string, walks it, and
re-serializes. Angular's `Object.is` check on the returned string only saves the *DOM
write*; the sanitization work itself runs unconditionally.

**Why it matters:** this compounds with two other facts. `chat-thread.ts:83` renders
`@for (m of store().messages())` with **no virtualization**, so a 200-turn transcript
holds 200 live `KjChatMessage` components. And during streaming, `store().messages()`
changes per token, dirtying the thread and every message component under it. The result is
*(messages × prose blocks × tokens/sec)* full HTML parse+serialize passes per second on
the main thread — the chat will visibly stutter mid-stream on any non-trivial transcript.
`blocks()` (`:155`) is at least a `computed`, so `renderMarkdown` is memoized per message;
`safe()` is the un-memoized leak in an otherwise correct design.

**Fix:** move sanitization into the memoized layer. Either have `renderMarkdown` return
prose blocks that already carry the sanitized string, or add
`readonly safeBlocks = computed(() => this.blocks().map(b => b.kind === 'prose' ? { ...b, safe: this.safe(b.html) } : b))`
and bind `[innerHTML]="block.safe"`. Then virtualize the thread (F-6) so offscreen turns
stop participating at all.

---

### F-2 Every open anchored overlay forces two synchronous layouts per scroll event

**Severity:** high · **Confidence:** high · **Effort:** M

**Files:** `packages/core/src/primitives/overlay/strategies/position/anchored-to.ts:136-180`, `:213-223`

```ts
// :213-216
onResize = () => applyManual();
onScroll = () => applyManual();
window.addEventListener('resize', onResize);
window.addEventListener('scroll', onScroll, true);   // capture: fires for EVERY scroller
```

```ts
// :136-145, :177-180  — inside applyManual(), write then read then write
const tRect = effectiveRect(trigger);                                       // read
if (matchWidth === 'fixed')    panel.style.width    = `${tRect.width}px`;   // write
else if (matchWidth === 'min') panel.style.minWidth = `${tRect.width}px`;   // write
const pRect = panel.getBoundingClientRect();                                // read → forced reflow
…
panel.style.position = 'fixed';                                             // write
panel.style.left = `${left}px`;
panel.style.top  = `${top}px`;
_placement.set({ side: resolvedSide, align });                              // signal write
```

Three problems stack here:

1. **Capture-phase `scroll` with no rAF throttle.** `capture: true` means this fires for
   scrolling of *any* element in the document — including the `.kj-table-body` scroller
   that the table virtualizer is already driving. Every scroll event runs the full
   reposition synchronously.
2. **Write-then-read inside the handler.** Setting `panel.style.width`/`minWidth` and then
   calling `panel.getBoundingClientRect()` invalidates and re-computes layout on the spot.
   Every consumer that opts into `matchTriggerWidth` pays this — which is every
   select / combobox / tree-select panel (e.g. `tree-select-content.ts:112` passes
   `matchTriggerWidth: 'min'`).
3. **A signal write per scroll event.** `_placement.set(...)` at `:180` dirties the
   strategy's `placement` computed on every single scroll tick.

**Why it matters:** this is the most-shared code path in the kit — tooltip, popover,
dropdown-menu, select, combobox, cascade-select, tree-select and date-picker all route
through `anchoredTo`. Scrolling a virtualized table with a tooltip open means the
virtualizer's own scroll work plus two forced layouts per event.

**Bonus defect in the same block:** `:220-222` observes **both** the trigger and the panel
with a `ResizeObserver` whose callback is `applyManual()` — which itself *writes the
panel's width*. With `matchTriggerWidth` set that is a self-feeding loop
(`ResizeObserver loop completed with undelivered notifications`), throttled only by the
browser's own loop guard.

**Fix:** coalesce into rAF
(`if (frame) return; frame = requestAnimationFrame(() => { frame = 0; applyManual(); })`),
register the scroll listener as `{ passive: true, capture: true }`, hoist the
width-matching write out of the per-scroll path (apply it once in `onOpen`, or measure the
panel before writing so reads and writes are not interleaved), and skip `_placement.set`
when the resolved placement is unchanged. Exclude the panel from the `ResizeObserver` when
`matchTriggerWidth !== 'none'`.

---

### F-3 Table persistence writes `localStorage` synchronously on every row click

**Severity:** high · **Confidence:** high · **Effort:** S

**Files:** `packages/components/src/table/table.ts:865-878`;
`packages/core/src/table/table-storage.ts:34-39`; `packages/core/src/table/table.ts:17-30`

```ts
// components/table.ts:865-873
// Persistence: watch state and write through. Reading `state()` once
// is enough — the single signal invalidates on any slice change.
effect(() => {
  const key = this.kjStorageKey();
  if (!key) return;
  const adapter = this.kjStorageAdapter() ?? this.tokenStorage;
  if (!adapter) return;
  adapter.write(key, this.t.state());
});

// components/table.ts:876-878
effect(() => {
  this.stateChange.emit(this.t.state());
});
```

```ts
// core/table-storage.ts:37
try { s.setItem(prefix + k, JSON.stringify(v)); } catch { /* quota / serialization */ }
```

`KjTableState` includes `rowSelection`, `expanded`, `columnSizing` and `columnFilters`
(`core/table.ts:17-30`). So *any* row click, checkbox toggle, group expand or filter
commit invalidates `state()`, and the effect immediately runs `JSON.stringify(wholeState)`
followed by a **synchronous** `localStorage.setItem`. Select-all on a 10 000-row table
produces a `rowSelection` map with 10 000 keys — a multi-hundred-KB stringify and a
blocking disk write, on the click handler's own frame.

The comment is accurate that "the single signal invalidates on any slice change" — that is
the problem here, not the solution. `(stateChange)` has the same shape: it re-emits the
whole state object on every selection tick to whatever the consumer wired up (typically a
`kjTableResource` loader). The `patch()` dedupe in `core/table.ts:140-151` stops
*content-equal* updates, but a real selection change is not content-equal.

**Fix:** trailing-debounce the persistence write (150-300 ms) and drop the volatile slices
from what is persisted — `rowSelection` and `expanded` are session state, not layout
preferences. `requestIdleCallback` is a good fit for the write itself. Give `(stateChange)`
the same debounce or a narrower payload.

---

### F-4 Selection model does linear key scans and per-item subtree recursion

**Severity:** high · **Confidence:** high · **Effort:** M

**Files:** `packages/core/src/primitives/list/selection.ts:129-151`, `:221-228`, `:248-266`;
`packages/core/src/primitives/list/item.ts:164-183`

```ts
// selection.ts:129-149 — the auto-derived tree shape
const findKey = (n: T): T | undefined => {
  for (const k of parentOf.keys()) {     // O(N) scan, per lookup
    if (eq(k, n)) return k;
  }
  return undefined;
};
return {
  getParent:   (n) => { const key = findKey(n); … },
  getChildren: (n) => { const key = findKey(n); … },
  isLeaf:      (n) => { const key = findKey(n); … },
};
```

```ts
// selection.ts:221-228
isSelected(target: T): boolean {
  const v = this._value();
  …
  if (mode === 'multi' || mode === 'leaf' || mode === 'cascade') {
    return Array.isArray(v) && v.some(x => this._compareBy(x, target));   // O(S)
  }
  …
}
```

```ts
// item.ts:178-183 — evaluated per item, per selection change
readonly ariaChecked = computed<'true' | 'false' | 'mixed' | null>(() => {
  if (!this.selection || this.selection.mode() !== 'cascade') return null;
  const v = this.value();
  if (v === undefined) return null;
  return this.selection.cascadeState(v);     // recursive walk of this node's whole subtree
});
```

Three multiplying costs:

- `isSelected` is O(S) in the selection size and is called from every item's
  `ariaSelected` computed (`item.ts:164-170`). N items × S selected = O(N·S) per toggle.
  1 000 options with 500 selected is roughly 500 000 comparisons per click.
- `cascadeState` (`:248-266`) recurses the full subtree of the node, calling
  `shape.isLeaf` / `shape.getChildren` at each step and `isSelected` at each leaf. Run once
  per item via `ariaChecked`, the tree as a whole costs O(Σ subtree sizes × S).
- When the consumer supplies no explicit `treeShape`, every one of those `isLeaf` /
  `getChildren` calls adds an O(N) `findKey` scan — so the cascade path degrades toward
  O(N² · depth · S).

`KjTreeSelect` dodges the worst of it by binding a Map-backed shape
(`packages/core/src/tree-select/tree-select-root.ts:176-193` — good), but `KjCascadeSelect`
falls back to `_autoShape` whenever `kjTreeShape` is null, as does any DOM-nested list
cluster composing `KjSelectionModel`.

**Fix:** (a) memoize `computed(() => new Set(values))` so `isSelected` is O(1) for the
default `Object.is` comparator; (b) in `_autoShape`, key the maps by the compare key
directly and reserve the scan for a custom `compareBy`; (c) compute the whole cascade
tri-state **once** in a model-level `computed` and have each item read its own entry
instead of re-walking its subtree.

---

### F-5 Table virtualization never measures a row — fixed estimate only

**Severity:** high · **Confidence:** high · **Effort:** M

**Files:** `packages/components/src/table/table-virtual.ts:101-108`, `:125-134`, `:160-177`;
`packages/components/src/table/table.ts:363-448`

```ts
// table-virtual.ts:101-107
v.setOptions({
  ...v.options,
  count,
  estimateSize: () => estimate,   // constant — never re-measured
  overscan,
});
```

Nothing in the directive calls `virtualizer.measureElement`, and the table's virtual `<tr>`
(`table.ts:375`) carries no `[attr.data-index]` and hands no element back to the
virtualizer. `@tanstack/virtual-core` supports dynamic measurement precisely through
`measureElement` + `data-index`; without it every row is assumed to be exactly
`kjEstimatedRowSize` (default 36 px, `table.ts:620`).

**Why it matters:** the moment a row differs from the estimate — wrapped text, a two-line
cell, an expanded master-detail row (`table.ts:417-428` renders one *inside* the virtual
loop), a `compact` → `comfortable` density switch — `paddingTop` / `paddingBottom` /
`totalSize` are wrong. The visible symptom is a scrollbar whose length does not match the
content and rows that drift or jump while scrolling. This is a correctness bug that
presents as a performance bug, and the `@doc-example Virtualized` claim of windowing a
"10k dataset" only holds for uniform rows.

**Secondary:** `sync()` (`:160-177`) is the virtualizer's `onChange` handler and
unconditionally does `this._virtualRows.set(items)` with a **fresh array on every scroll
event**, so the whole table body re-runs CD even when the visible window has not moved.

**Fix:** stamp `[attr.data-index]="vr.index"` on the virtual `<tr>` and register each row
element with `virtualizer.measureElement` (an attribute directive on the row is the
cleanest fit), and bail out of `sync()` when `items[0].index` and `items.at(-1).index` are
unchanged from the last emission.

---

### F-6 Virtualization exists only in the table; everything else renders its full content set

**Severity:** high · **Confidence:** high · **Effort:** L

**Files:** `packages/core/src/primitives/list/item.ts:35`;
`packages/core/src/primitives/list/filterable-list.ts:50-56`, `:107-124`;
`packages/components/src/chat/chat-thread.ts:83`;
`packages/components/src/accordion/accordion.css:41-62`

A repo-wide grep for `virtual-core|Virtualizer` returns exactly two files, both under
`packages/components/src/table/`. Consequences:

- **Option lists are not windowed, and filtered-out options are not even removed.**
  `item.ts:35` binds `'[hidden]': '!visible()'`, so a combobox / select / command-palette
  over 5 000 options keeps 5 000 DOM elements and 5 000 `KjListItem` instances alive
  permanently — each with ~8 live computeds and a host carrying 9 bindings — filtered or
  not.
- **The chat thread renders every turn** (`chat-thread.ts:83`), which is what turns F-1
  from wasteful into catastrophic.
- **Accordion panels are always in the DOM.** `accordion.css:41-56` keeps content mounted
  at `max-height: 0` so it can animate; closed panels still cost construction, layout and
  paint.
- **No containment anywhere.** `rg "content-visibility|contain:|will-change"` across all
  CSS in `packages/components/src` and `packages/core/src` returns **zero hits**. Table
  rows, list items and collapsed accordion panels are the textbook cases.

**Fix:** (a) short term, add `content-visibility: auto` + `contain-intrinsic-size` to table
rows, list items and collapsed accordion panels — no API change, large paint win;
(b) extract `KjTableVirtual` into a generic `kjVirtualFor`-style primitive and apply it to
the listbox panel and the chat log; (c) change `KjFilterableList` to project only the
visible set rather than toggling `[hidden]` across the full set.

---

### F-7 Filter effect writes three signals per item on every keystroke

**Severity:** medium · **Confidence:** high · **Effort:** S

**Files:** `packages/core/src/primitives/list/filterable-list.ts:6-10`, `:107-124`

```ts
// :6-10
const defaultSubstring: KjFilterFn = (q, hs) => {
  if (!q) return 1;
  const needle = q.toLowerCase();
  return hs.some(h => h.toLowerCase().includes(needle)) ? 1 : 0;   // allocates per haystack
};

// :107-124
effect(() => {
  const all = this._items();
  const visible = this.visibleItems() as readonly KjListItem<unknown>[];
  const visibleSet = new Set(visible.map(v => v.id));
  const total = visible.length;
  let i = 0;
  for (const item of all) {
    const isVisible = visibleSet.has(item.id);
    item.setVisible(isVisible);
    if (isVisible) { item.posInSet.set(++i); item.setSize.set(total); }
    else           { item.posInSet.set(null); item.setSize.set(null); }
  }
});
```

Per keystroke this allocates one lowercased string per haystack per item, builds a `Set`
plus an intermediate `map` array, then performs up to 3N signal writes — each wired to a
host attribute (`[hidden]`, `aria-posinset`, `aria-setsize`). Primitive equality spares the
unchanged ones, but `setSize` changes for *every visible item* whenever the match count
changes, i.e. on essentially every keystroke.

It is also the classic effect-writes-signals shape the code-style rules steer away from:
derived state pushed imperatively into N consumers.

**Fix:** cache a lowercased haystack alongside `haystacks()` (`item.ts:137`) so the filter
compares pre-normalised strings; drop the `Set`/`map` pair by tagging visibility during the
single filter pass; and consider exposing `visibleItems` as the render source so `hidden` /
`posInSet` / `setSize` become template-derived rather than effect-pushed.

---

### F-8 Table re-scans cell templates and allocates a fresh outlet context per cell, per cycle

**Severity:** medium · **Confidence:** high · **Effort:** S

**Files:** `packages/components/src/table/table.ts:665-671`, `:349`, `:409`, `:485`, `:527`,
`:350`, `:410`, `:486`, `:528`, `:882`

```ts
// :665-671
protected cellTpl(cell: Cell<TData, unknown>): TemplateRef<unknown> | null {
  for (const t of this.cellTemplates()) {
    if (t.kjCellTemplate() === cell.column.id) return t.template;
  }
  return null;
}
```

```html
<!-- :350 (also :410, :486, :528) -->
<ng-container [ngTemplateOutlet]="tpl"
  [ngTemplateOutletContext]="{ $implicit: r.original, row: r.original, value: c.getValue(), cell: c }" />
```

`cellTpl(c)` is a method call in the template, invoked once per rendered cell per CD cycle,
and each call linearly scans every registered `kjCellTemplate` *and* reads a signal per
entry. With 200 windowed rows × 10 columns × 8 templates that is roughly 16 000 signal
reads and string comparisons per cycle, for a lookup whose answer only changes when the
column set changes. The `ngTemplateOutletContext` object literal beside it allocates a
fresh object per cell per cycle, which `NgTemplateOutlet` must then key-diff into the
existing context. `isEditing(c)` (`:882`) is a second per-cell method call in the same
loops — cheap individually, but another N×M invocation per cycle where a `Set` lookup would
do.

**Fix:** replace `cellTpl` with a `computed<Map<string, TemplateRef>>` keyed by column id
and look up by `cell.column.id`; hoist the context object into a per-cell memo (a
`WeakMap<Cell, ctx>` works) so its identity is stable while the row lives.

---

### F-9 `KjTableRow.isSelectable` allocates the full selection key array per row

**Severity:** medium · **Confidence:** high · **Effort:** S

**Files:** `packages/core/src/table/table-row.ts:25`

```ts
readonly isSelectable = computed(() => Object.keys(this.table.state.rowSelection()).length >= 0); // always true if selection enabled
```

`Object.keys(...).length >= 0` is unconditionally `true` — the expression exists only to
create a reactive dependency. But it materialises an array of every selected row id, on
every row directive, on every selection change. With 200 windowed rows and 5 000 selected
rows that is 200 arrays of 5 000 strings per click, all immediately discarded. It is also
bound straight into a host attribute (`'[attr.aria-selected]': 'isSelectable() ? isSelected() : null'`,
`table-row.ts:13`), so it re-evaluates on every selection tick.

**Fix:** delete the computed and bind `aria-selected` on `isSelected()` alone. If a genuine
"selection enabled" signal is wanted, derive it from the table's selection configuration
rather than from the contents of the selection map.

---

### F-10 `cascade-select` sub-panel leaks window listeners and repositions unthrottled

**Severity:** medium · **Confidence:** high · **Effort:** S

**Files:** `packages/core/src/cascade-select/cascade-select-sub-panel.ts:105-133`

```ts
const reposition = () => {
  const optEl = this.parentOption?.item._host();
  if (!optEl) return;
  const rect = optEl.getBoundingClientRect();     // read
  const el = this.el.nativeElement;
  el.style.top  = `${rect.top}px`;                // write
  el.style.left = `${rect.right + 2}px`;
};

effect(() => {
  if (typeof window === 'undefined') return;
  const isOpen = this.open();
  if (isOpen) {
    reposition();
    onResize = reposition;
    onScroll = () => reposition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
  } else {
    if (onResize) window.removeEventListener('resize', onResize);
    if (onScroll) window.removeEventListener('scroll', onScroll, true);
    onResize = onScroll = null;
  }
});
```

Grepping this file for `DestroyRef|onDestroy|onCleanup` returns nothing. If the component
is destroyed while the sub-panel is open — closing the parent overlay usually tears the
whole subtree down — the `else` branch never runs, both window listeners stay attached
forever, and they retain `reposition` → the component → its element subtree. Every
open/destroy cycle adds another pair.

The handler is also a read-then-write on every scroll event with no rAF throttle, and it
duplicates `anchoredTo` rather than reusing it.

**Fix:** register cleanup with `inject(DestroyRef).onDestroy(...)` (or the effect's
`onCleanup` parameter), throttle through rAF, and ideally route the sub-panel through
`anchoredTo` so there is one positioning implementation to fix rather than two.

---

### F-11 Auto-resize textarea forces a style recalc plus two layouts per keystroke

**Severity:** medium · **Confidence:** high · **Effort:** S

**Files:** `packages/core/src/textarea/textarea.ts:198-234`;
`packages/components/src/chat/prompt-input.ts:236-239`

```ts
// textarea.ts:215-234
const cs = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
…
const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4 || 20;
const paddingY   = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
const borderY    = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
…
el.style.height = 'auto';          // write
const measured = el.scrollHeight;  // read → forced layout
el.style.height = `${clamped}px`;  // write
```

`measure()` runs from `onInput` (`:199-203`), so every keystroke triggers a
`getComputedStyle` (forced style recalculation up the ancestor chain) plus a
write → read → write layout thrash. `lineHeight`, padding and border are effectively static
for the element's lifetime; only `scrollHeight` genuinely needs re-reading.

`prompt-input.ts:238` repeats the same `height='auto'` → `scrollHeight` → `height=…` pattern
with a hard-coded 200 px cap, bypassing the core directive entirely — so the chat composer
pays the thrash without even the benefit of the min/max-rows clamping.

**Fix:** cache the computed-style-derived metrics (invalidate on a `ResizeObserver` or a
font-size change) and keep only the `scrollHeight` read per input. Have `prompt-input.ts`
delegate to `KjTextarea.measure()` instead of duplicating it.

---

### F-12 A new `Intl.DateTimeFormat` is constructed per calendar day cell

**Severity:** medium · **Confidence:** high · **Effort:** S

**Files:** `packages/core/src/calendar/calendar-day.ts:76`;
`packages/core/src/calendar/date-utils.ts:148-156`;
`packages/components/src/calendar/calendar.ts:127`

```ts
// calendar-day.ts:76
readonly ariaLabel = computed(() => formatDateLong(this.kjDate(), this.ctx.locale()));

// date-utils.ts:148-156
export function formatDateLong(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(date);
}
```

`Intl.DateTimeFormat` construction is one of the more expensive operations in the standard
library (locale data resolution, pattern compilation). A calendar grid is 42 cells and
`track d.getTime()` (`calendar.ts:127`) means those cells are recreated on every month
navigation — so arrowing through months constructs 42 fresh formatters each time, doubled
for a date-range picker showing two months, and the date-picker overlay pays it again on
every open.

`weekdayShortNames` / `weekdayLongNames` / `formatMonthYear` have the same shape but sit
behind locale-keyed `computed`s (`calendar-grid.ts:39-46`), so they are fine — this is the
one that escapes.

**Fix:** memoize formatters in a module-level `Map<string, Intl.DateTimeFormat>` keyed by
`locale + optionsKey`. `KjLocale.numberFormat` / `.dateTimeFormat`
(`packages/core/src/locale/locale.ts:134-139`) construct per call too and should adopt the
same cache.

---

### F-13 Layout-property transitions and zero style containment

**Severity:** medium · **Confidence:** medium · **Effort:** M

**Files:** `packages/components/src/accordion/accordion.css:41-62`;
`packages/components/src/table/table.css:287-294`

```css
/* accordion.css:48-62 */
transition:
  max-height var(--kj-transition, 0.2s ease),
  opacity    var(--kj-transition, 0.2s ease),
  padding    var(--kj-transition, 0.2s ease);
…
.kj-accordion-content[data-state="open"] {
  /* `1000px` is the conventional "tall enough" ceiling … */
  max-height: 1000px;
}
```

```css
/* table.css:287 — on the resize handle */
transition: border-color var(--kj-transition), background var(--kj-transition), width var(--kj-transition);
```

`max-height` and `padding` are layout-triggering, so the accordion relayouts its subtree —
and everything below it in flow — on every frame of the open/close animation. The `1000px`
ceiling additionally makes the perceived duration wrong for short panels. The table resize
handle animates `width` on hover (`:289-294` grows it 6 px → 8 px), forcing a layout pass on
hover of every column border; `transform: scaleX()` or a `border-right-width` change would
be cheaper.

Separately, `content-visibility`, `contain:` and `will-change` appear **nowhere** in any
stylesheet under `packages/components/src` or `packages/core/src` (verified by grep).

**Confidence is medium** on the accordion specifically: `max-height` is the conventional
workaround when `grid-template-rows: 0fr/1fr` or `interpolate-size` is not an option, and
the trade-off is acknowledged in the file's own comment. It is called out because the same
file already gates on `prefers-reduced-motion`, so the team clearly cares about this axis.

**Fix:** switch the accordion to `grid-template-rows: 0fr → 1fr` (one layout property,
correct duration, no magic ceiling) or `interpolate-size: allow-keywords` + `height: auto`
where support allows; animate the resize handle with `transform`; add
`content-visibility: auto; contain-intrinsic-size: <row-height>` to table rows and
collapsed accordion panels.

---

### F-14 One `MutationObserver` per `<kj-tag>`, with `subtree` and `characterData`

**Severity:** medium · **Confidence:** medium · **Effort:** S

**Files:** `packages/core/src/tag/tag.ts:151-171`

```ts
const observer = new MutationObserver(() => {
  this._textContent.set(this.el.nativeElement.textContent?.trim() ?? '');
});
observer.observe(this.el.nativeElement, {
  characterData: true,
  childList: true,
  subtree: true,
});
this.destroyRef.onDestroy(() => observer.disconnect());
```

Cleanup is correct, so this is not a leak — but tags are a *list* component
(`tag.list.example.ts`, `tag.overflow.example.ts`, and the table's filter chips), and one
observer per instance with `subtree: true` means a 300-tag list registers 300 observers
whose records all funnel through the same microtask checkpoint. Each callback then reads
`textContent`, forcing the tag's subtree to be flattened.

**Confidence medium** because realistic tag counts here are unknown; at 20 tags this is
irrelevant, at 300 it is not.

**Fix:** a single shared observer at the `kj-tag-list` level, or skip the observer entirely
when a `kjTagLabel` input is supplied — the observer only exists for the projected-text
fallback.

---

### F-15 Zoneless is implicit, and never exercised by the tests

**Severity:** medium · **Confidence:** medium · **Effort:** S

**Files:** `apps/docs/src/app/app.config.ts:24-53`; `package.json:94`;
`packages/core/src/test-setup.ts:5`; `packages/components/src/test-setup.ts:5`;
`apps/docs/src/test-setup.ts:5`

The docs app declares neither `provideZonelessChangeDetection()` nor
`provideZoneChangeDetection()`, and `angular.json` has no `polyfills` entry — so zone.js is
not shipped, even though `zone.js@^0.16.1` is still a root dependency (`package.json:94`).
Meanwhile all three packages test with:

```ts
setupTestBed({ zoneless: false });
```

**Why it matters:** the library's change-detection mode in production is decided by
omission rather than declaration, and every spec runs under the *opposite* mode from the
one the app ships. Any place where a signal write happens outside Angular's notification
path — a `MutationObserver` callback, a raw `addEventListener`, a `setTimeout`, a
virtualizer `onChange` — is masked in tests by zone.js and only surfaces as a "stale UI"
bug for consumers. The kit has plenty of those callbacks (`table-virtual.ts:133`,
`tag.ts:161`, `anchored-to.ts:220`, `carousel.ts:456`, `cascade-select-sub-panel.ts:122`).

**Confidence medium:** Angular 22's behaviour with no explicit provider and no zone.js
should be zoneless, but that is inferred from the configuration, not verified by running
the app (out of scope for this review).

**Fix:** add `provideZonelessChangeDetection()` explicitly to `appConfig`, flip the three
test setups to `zoneless: true`, and drop the `zone.js` dependency once the specs pass.

---

### F-16 Per-instance `document` listeners on `kj-tree-select-content`

**Severity:** low · **Confidence:** high · **Effort:** S

**Files:** `packages/core/src/tree-select/tree-select-content.ts:70-77`

```ts
host: {
  '(keydown)': 'onKeydown($event)',
  '(document:keydown.escape)': 'controller?.close("esc")',
  '(document:click)': 'onDocClick($event)',
  '(click)': '$event.stopPropagation()',
},
```

This is the only component in the repo using `(document:…)` host bindings — everywhere else
the shared `KjOverlayStack` (`stack.ts:80-92`) handles Escape and outside-click with two
listeners for the entire application. Here each tree-select instance adds its own pair,
active for the component's whole lifetime including while the panel is closed, and each one
marks the component dirty on every document click before `onDocClick`'s
`if (!ctrl?.isOpen()) return;` guard (`:129-130`) bails.

**Fix:** delete both bindings and let `KjOverlayStack` route Escape and outside-click, as
every other overlay consumer already does.

---

### F-17 Chat thread allocates a renderer input object per cycle and re-registers a render hook per token

**Severity:** low · **Confidence:** high · **Effort:** S

**Files:** `packages/components/src/chat/chat-thread.ts:84-88`, `:130-138`, `:178-190`

```html
<!-- :86 -->
*ngComponentOutlet="renderer; inputs: { item: itemFor(m), message: m }"
```

```ts
// :130-138
protected itemFor(message: KjChatMessageData): KjChatItemInput {
  return { id: message.id, type: message.type, role: message.role,
           data: message.data ?? message.content };
}

// :183-190
private scrollToBottom(): void {
  afterNextRender(() => {
    const el = this.logEl().nativeElement;
    el.scrollTop = el.scrollHeight;     // forced layout
  }, { injector: this.injector });
}
```

`itemFor(m)` returns a fresh object on every CD cycle, plus the literal
`{ item: …, message: m }` wrapper, so `NgComponentOutlet` re-applies both inputs to every
custom-rendered message every cycle. And `scrollToBottom()` is called from the streaming
effect (`:178`), so it registers a **new** `afterNextRender` hook per streamed token — each
one doing a `scrollHeight` read plus a `scrollTop` write.

**Fix:** memoize the item shape per message id, and hoist the scroll into a single
`afterRenderEffect` (or an "already scheduled" guard) rather than one hook per delta.

---

### F-18 Carousel observes only the initial slide set and leaves a timer running past destroy

**Severity:** low · **Confidence:** high · **Effort:** S

**Files:** `packages/core/src/carousel/carousel.ts:452-475`, `:492-495`, `:507-515`

```ts
// :459-461
// Defer slide observation to the next microtask so registered slides have host elements.
queueMicrotask(() => this.observeSlides());

// :492-495
observeSlides(): void {
  if (!this.observer) return;
  for (const slide of this.carousel.slides()) this.observer.observe(slide.el.nativeElement);
}

// :464-468
ngOnDestroy(): void {
  this.observer?.disconnect();
  this.observer = null;
  this.carousel.unregisterViewport(this);
}
```

`observeSlides()` runs exactly once. Slides added later by a dynamic `@for` are never
observed (so they never become "current"), and removed slides are never unobserved.
`this.settleTimer` (declared `:493`, set `:509`) is not cleared in `ngOnDestroy`, so a
pending debounce can fire after teardown and write `carousel.kjValue` on a destroyed tree.

**Fix:** make `observeSlides` reactive to `carousel.slides()` (an effect that `unobserve`s
the diff), and `clearTimeout(this.settleTimer)` in the destroy path.

---

### F-19 Shipped example components are not `OnPush`

**Severity:** low · **Confidence:** high · **Effort:** M

**Files:** ~300 files under `packages/components/src/*/_examples/*.example.ts`,
`packages/components/src/*/*.usage.example.ts`, `packages/core/src/*/_examples/*.example.ts`

These are exported through `packages/components/src/example-components.ts` and
`packages/core/src/example-components.ts` and rendered by the docs site, so they are real
runtime components — and every one of them runs default change detection. That makes the
docs pages (which host many examples per route) the slowest surface the project ships, and
it means the examples model the wrong pattern for anyone copying them into an app.

**Fix:** add `changeDetection: ChangeDetectionStrategy.OnPush` to the example components
(mechanical — a codemod over the `@Component({` block), and enable the
`@angular-eslint/prefer-on-push-component-change-detection` rule so new examples cannot
regress.

## Recommended work items

Ordered by expected real-world impact per unit of effort.

1. **Memoize chat sanitization** — move `safe()` behind the `blocks()` computed. *(F-1, S)*
2. **rAF-throttle `anchoredTo` and un-thrash `applyManual`** — coalesce the scroll/resize
   handler into a frame, mark the scroll listener passive, hoist the width-matching write
   out of the per-scroll path, and stop observing the panel with the `ResizeObserver` that
   resizes it. *(F-2, M)*
3. **Debounce table persistence and narrow what is persisted** — drop `rowSelection` /
   `expanded` from the localStorage payload; trailing-debounce the write and
   `(stateChange)`. *(F-3, S)*
4. **Make the selection model O(1) per lookup** — `Set`-backed `isSelected`, key-indexed
   `_autoShape` without `findKey`, and one memoized cascade-state map instead of per-item
   subtree recursion. *(F-4, M)*
5. **Wire `measureElement` into `KjTableVirtual`** and short-circuit `sync()` when the
   window has not moved; add a `table-virtual` spec covering variable row heights.
   *(F-5, M)*
6. **Add `content-visibility: auto` + `contain-intrinsic-size`** to table rows, list items
   and collapsed accordion panels — no API change, immediate paint/layout win.
   *(F-6, F-13, S)*
7. **Index the table's cell-template lookup** and stabilise the outlet context object.
   *(F-8, S)*
8. **Delete `KjTableRow.isSelectable`'s `Object.keys` allocation.** *(F-9, S)*
9. **Fix the two listener-lifecycle defects** — `DestroyRef` cleanup + rAF in
   `cascade-select-sub-panel`, and `clearTimeout` + reactive `observeSlides` in the
   carousel. *(F-10, F-18, S)*
10. **Cache textarea metrics and `Intl` formatters.** *(F-11, F-12, S)*
11. **Declare zoneless explicitly and flip the test setups to `zoneless: true`**, then fix
    whatever breaks — that fallout list is itself a useful performance audit.
    *(F-15, S→M)*
12. **Cut the filterable-list effect down to one pass** with cached lowercase haystacks,
    and route filtered-out options out of the DOM instead of `[hidden]`. *(F-7, F-6, M)*
13. **Move tree-select's outside-click / Escape onto `KjOverlayStack`.** *(F-16, S)*
14. **Memoize `itemFor` and collapse the per-token `afterNextRender`** in the chat thread.
    *(F-17, S)*
15. **Codemod `OnPush` onto the example components** and enable the ESLint rule.
    *(F-19, M)*
16. **Longer term: a shared `kjVirtualFor` primitive** extracted from `KjTableVirtual`,
    applied to the listbox panel, the chat log and the tree panel. *(F-6, L)*

## Open questions

- **What data volumes are actually targeted?** F-4, F-6, F-7 and F-9 are near-invisible at
  50 options / 100 rows and dominant at 5 000. If the library's contract is "up to a few
  hundred items, virtualize yourself above that", several of these drop a severity band —
  but that contract should then be written into the table and combobox TSDoc.
- **Is `KjCascadeSelect` ever used without an explicit `kjTreeShape`?** That is the only
  path reaching the O(N) `findKey` scan at `selection.ts:130-135`. If the answer is "never
  in practice", the fix shrinks to a dev-mode warning.
- **Was `zoneless: false` in the three test setups deliberate** (an Analog / vitest-angular
  limitation) or inherited from a scaffold? The answer decides whether F-15 is a one-line
  config change or a test-infrastructure project.
- **Does `KjTableVirtual` need to support variable row heights at all**, or is the intended
  contract "fixed-height rows only"? If the latter, F-5 becomes a documentation fix plus a
  dev-mode assertion instead of a `measureElement` integration — but the master-detail
  expansion row rendered *inside* the virtual loop (`table.ts:417-428`) argues that it does.
- **How many `<kj-tag>` instances appear in a realistic list?** That drives whether F-14 is
  worth the shared-observer refactor.
- No runtime profiling was performed (explicitly out of scope). Every cost above is reasoned
  from the code; the ranking would benefit from one Chrome performance trace of a
  10 000-row table scroll and one of a streaming chat with a 100-turn transcript.
