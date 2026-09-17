# Runtime Performance Review

> **Ranking is code-derived, not measured.** No profiler, no trace, no
> benchmark was run for this audit — the environment offers none and the brief
> forbids running builds or dev servers. Every severity below is a *reasoned
> expected impact* from reading the source: algorithmic complexity, how often a
> code path runs, and whether it forces synchronous layout or re-serialisation.
> Where I say "per keystroke" or "per change-detection cycle" that is derived
> from the wiring (`effect` dependency sets, `afterEveryRender`, host bindings),
> not observed. Treat the ordering as a **profiling worklist**, not a verdict on
> milliseconds.

## Verdict

The reactive architecture is fundamentally sound: OnPush is universal across
every `@Component` in both packages, there is not a single `@Input()`/`@Output()`
decorator or `BehaviorSubject` left, no impure pipes exist anywhere, virtually
every `@for` carries a real identity `track`, and the overlay stack installs its
document listeners **once, lazily, shared** (`stack.ts:183-195`) rather than per
instance. That baseline is better than most Angular component libraries. What
drags the grade down is a small number of hot paths that do expensive work
unconditionally: the chart re-applies its full ECharts option on **every
application change-detection cycle** (`core/chart/chart.ts:208-210`), and the
rich-text editor does **four full-document tree walks per committed update**,
two of them avoidable (`rich-text/engine.ts:237-246, 262-289`). Layered on top is
a structural gap: `KjTableVirtual` is the only virtualizer in the repo, so a
combobox or command palette with thousands of declared options keeps every one of
them in the DOM. None of this makes the library broken today at the sizes its
examples use; all of it will bite a consumer who puts a chart on a dashboard,
types in a long rich-text field, or feeds 5 000 options to a combobox.

**Grade: B−** — revised from C+ after verification. All four findings originally
rated high (F-1–F-4) were mis-sized: F-1 and F-2 are medium, F-4 is medium and
applies to two components rather than four, and F-3 — the anchored-overlay
"forced-reflow per wheel tick" — is **low**, because its compounding factor
(`matchTriggerWidth: 'fixed'`) is dead code in this library and its capture-phase
listener is a correctness requirement, not a defect. **No finding in this report is
now rated high**, and none of the ranking is measured (see the banner above).

## What works

- **OnPush everywhere.** A sweep of every `@Component` in `packages/core/src`
  and `packages/components/src` found zero components without
  `ChangeDetectionStrategy.OnPush`. The four files that matched `@Component`
  without it (`core/src/checkbox/checkbox.ts`, `core/src/input/input.ts`,
  `core/src/input-mask/input-mask.presets.ts`, `core/src/table/filter-params.ts`)
  are `@Directive`s whose only `@Component` hit is inside a TSDoc example block.
- **Zoneless-ready.** No `NgZone`, no `ApplicationRef.tick()`, no manual
  `markForCheck()` / `detectChanges()` anywhere in either package. State is
  signal-driven end to end, so change detection is driven by signal-graph
  invalidation rather than zone patching.
- **Shared overlay listeners.** `KjOverlayStack.ensureListeners()`
  (`core/src/primitives/overlay/stack.ts:183-195`) installs exactly one
  `keydown` and one `pointerdown` capture listener for the whole stack, and
  `maybeRemoveListeners()` tears them down when the stack empties. This is the
  right pattern and the rest of the library should copy it.
- **No impure pipes.** `grep "pure: false"` across both packages: zero hits.
- **Strong `@for` tracking.** Almost every `@for` uses a real identity key
  (`track h.id`, `track r.id`, `track c.id`, `track row.node.value`,
  `track vr.key`, `track tc.id`). The handful of `track $index` uses are on
  fixed-shape arrays (calendar weekdays, skeleton line widths).
- **TanStack state dedupe.** `KjTable.patch()` + `sliceEqual()`
  (`core/src/table/table.ts:133-146, 253-292`) stop TanStack's fresh-object-
  literal `on*Change` calls from invalidating the state signal, which is what
  prevents an infinite loader loop in resource mode. `columnSizingInfo` is
  deliberately kept out of `state` so a drag-resize does not echo through
  `(stateChange)` or persistence.
- **The core chart coalesces its ResizeObserver via rAF**
  (`core/src/chart/chart.ts:170-183`) — a burst of entries collapses to one
  `chart.resize()`, with the pending frame cancelled on destroy.
- **Root-level `KjReducedMotion` service exists** (`core/src/motion/reduced-motion.ts`)
  with a single `providedIn: 'root'` `matchMedia` subscription — the right shape,
  just under-used (F-15).
- **Effect cleanup discipline is generally good.** `DestroyRef.onDestroy` is
  wired for the chart RO/MO, the toast RO/MO, the carousel IO, the tag MO, the
  command-palette hotkey listener, and the textarea resize listener.
- **Observers are shared, not per-item.** The carousel uses one
  `IntersectionObserver` per viewport observing all slides
  (`core/src/carousel/carousel.ts:455-462, 476-481`), not one per slide.

---

## Findings

### F-1 `KjChart` re-applies the full ECharts option on every application change-detection cycle

**Severity:** medium &nbsp;·&nbsp; **Confidence:** high &nbsp;·&nbsp; **Effort:** S

**Files:** `packages/core/src/chart/chart.ts:208-210,285,289,191,215-228`, `packages/core/src/chart/chart-tokens.ts:9,18`

> **Verification (2026-09-15).** Quoted evidence re-verified verbatim at HEAD; the
> mechanism holds and nothing guards, memoises or fixes it. **Downgraded high → medium**:
> two supporting claims did not survive (see *Withdrawn* below), no measurement was taken,
> and the impact scales entirely with tick frequency.

**Evidence**

```ts
// packages/core/src/chart/chart.ts:208-210
afterEveryRender(() => {
  this.chart()?.setOption(this.resolveOption());
});
```

```ts
// packages/core/src/chart/chart.ts:285 — resolveOption()
private resolveOption(): EChartsOption {
  const base = this.kjChartOption();
  const animate = this.kjChartAnimate() && !this.prefersReducedMotion();
  const explicit = this.kjChartPalette();
  const color = explicit ?? resolveChartPalette(this.el.nativeElement);   // :289
  return { ...base, color: /* … */, animation: animate, /* … */ };
}
```

```ts
// packages/core/src/chart/chart-tokens.ts:9
export function resolveChartPalette(host: HTMLElement): string[] {
  const cs = getComputedStyle(host);          // forced style recalculation
  // :18 — loop of 6 `--kj-chart-N` reads plus up to 5 fallback reads (11 max)
}
```

**Why it matters**

Angular runs `afterEveryRender` after **every application change-detection cycle**, not
only when this directive's view is checked. In a zoneless app that is every tick: a hover
that flips a `data-*` attribute, a keystroke in an unrelated input, an overlay opening, a
table row selection. Each fire calls `resolveOption()`, which invokes
`resolveChartPalette` — a `getComputedStyle` on the host plus up to 11 custom-property
reads, forcing a style recalculation in the after-render phase — and then runs ECharts'
full option-merge and component-update pipeline. On an interactive dashboard every chart
repeats that work on every tick, regardless of whether any input changed.

`KjChart` is shipped public API (`packages/core/src/public-api.ts:80`,
`@kouji-ui/core` 0.8.4). The last commit touching `packages/core/src/chart/` is
`b1729083`, well before `fd6dd34e..HEAD`, so nothing in the recent range addresses it.
`chart.spec.ts` only asserts that `setOption` was called — never how often.

Note the contrast with the *same file's* `effect`-driven `kjChartOn` / `kjChartLoading`
handlers (`chart.ts:215-228`), which correctly run only on dependency change.

**Withdrawn (did not survive verification)**

- *"Allocates a brand-new option object, so ECharts can never short-circuit on identity."*
  ECharts `setOption` has **no** option-identity short-circuit to defeat. The fresh
  allocation is a symptom, not the cost driver.
- *"A dashboard with three charts and a hoverable table will run this nine times per
  hover."* Unexplained arithmetic — three charts on one tick is three calls, not nine.
  The multiplier is not established.

Also worth stating plainly: the `afterEveryRender` hook is currently the **only** path
that pushes `kjChartOption` changes to the live instance (no effect reads that input), so
it cannot simply be deleted. And no measurement backs this finding — the cost is
invisible on a page with one chart and light interaction, and meaningful only on the
hover-heavy dashboard the scenario constructs.

**Fix**

Replace the hook with an `effect()` reading `resolveOption()`, matching the handlers three
lines below at `chart.ts:215-228`:

```ts
effect(() => {
  const chart = this.chart();
  if (!chart) return;
  chart.setOption(this.resolveOption());
});
```

This is equivalent because `kjChartOption`, `kjChartAnimate`, `kjChartPalette` and
`prefersReducedMotion` are all signals, and the one non-reactive dependency — the themed
palette read — is already re-applied by the `<html>` `MutationObserver` at
`chart.ts:191`. Optionally memoise `resolveChartPalette` per host and invalidate it from
that same observer.

Add a spec asserting `setOption` is **not** called again after an unrelated
change-detection cycle; no current test covers re-application frequency.

---

### F-2 Rich-text does four full-document tree walks per update, two of them avoidable

**Severity:** medium &nbsp;·&nbsp; **Confidence:** high &nbsp;·&nbsp; **Effort:** M

**Files:** `packages/core/src/rich-text/engine.ts:237-246,257-260,262-289`, `packages/core/src/rich-text/rich-text-editor.ts:113,257-264,374-385`, `packages/components/src/rich-text/rich-text-editor.ts:137-139`

> **Verification (2026-09-15).** Quoted evidence verbatim-accurate at HEAD; the mechanism
> is real and unguarded. **Downgraded high → medium** and retitled: the walk count was
> *under*-stated (four, not three), but the headline "O(n²) over a session" framing is not
> removable by the implied fix, and the cost is unmeasured.

**Evidence**

```ts
// packages/core/src/rich-text/engine.ts:237-246
this.teardowns.push(
  this.editor.registerUpdateListener(({ editorState }) => {
    editorState.read(() => {
      const html = $generateHtmlFromNodes(this.editor, null);   // walk 1 — full doc → HTML
      const text = $getRoot().getTextContent();                 // walk 2 — full tree walk
      this.callbacks.onValue({ html, text, json: editorState.toJSON() }); // walk 3 — full doc → JSON
    });
    this.emitState();                                           // :257-260 → readState()
  }),
);
```

`emitState()` (`engine.ts:257-260`) → `readState()` (`engine.ts:262-289`) then does
`root.getTextContent().length === 0` to compute `empty` — **walk 4**.

*(The original draft cited `readState` at `:258-275`; the correct range is `:262-289`,
with `emitState` at `:257-260`.)*

`rich-text-editor.ts:257-264` (`emitValue`) gates only on `applyingExternal`, never on
payload cost. A grep for `debounce` / `requestAnimationFrame` / `setTimeout` /
`queueMicrotask` across `packages/core/src/rich-text` returns nothing. Nothing in
`fd6dd34e..HEAD` touches this directory — its only two commits are `593c15a5` (the
original feature) and `b959ab3e` (a contenteditable fix). Both spec files stub
`onValue: () => {}` and assert nothing about emission cost.

**Why it matters**

It is **four** full-document walks per committed update, not three. And
`registerUpdateListener` fires on every committed update **including selection-only
ones**, so arrow-key navigation and clicks re-serialise the whole document too, not just
character input.

**Scope the claim honestly.** One full HTML serialisation per change is **inherent**: the
directive is a `ControlValueAccessor` whose form value *is* the HTML string
(`rich-text-editor.ts:113`, `:257-264`, `:374-385`), so the linear-per-change cost cannot
be removed without a public-API change. What is genuinely wasteful is:

- **(a)** the duplicate `getTextContent()` in `readState` — `emitState` should accept the
  already-computed text, or `readState` should use a short-circuiting emptiness check
  instead of materialising the whole string; and
- **(b)** computing `text` and `json` eagerly when only `valueChange` / the form model is
  consumed.

Fixing both cuts roughly half the constant factor. The linear-per-keystroke *shape*
survives.

**Withdrawn / requalified**

- *"None gated on whether `valueChange`/`textChange`/`jsonChange` actually have
  subscribers."* Not actionable as written: Angular's `output()` / `OutputEmitterRef`
  exposes no subscriber count, and the components-layer wrapper at
  `packages/components/src/rich-text/rich-text-editor.ts:137-139` unconditionally
  re-emits all three from its template, so every consumer of the **component** — the
  normal entry point — always has all three subscribed. Subscriber-gating would help only
  direct-directive users.
- *"Classic O(n²)-over-a-session shape"* and *"a user writing a 30 KB article"*: dropped
  unless a measurement backs them. Per-keystroke cost is sub-millisecond to low-single-
  digit ms for the form-field-sized content this component is used with in the repo's own
  examples; the 30 KB-article scenario is a plausible but unmeasured extrapolation, with
  no benchmark, profile, or user report in evidence.

**Fix**

The tractable wins, in order:

1. Remove the duplicate text walk — pass the already-computed `text` into `emitState` /
   `readState`, or replace the `empty` computation with a short-circuiting check.
2. Make `json` lazy or opt-in (a thunk, or a flag on the directive), since the JSON
   payload is the one most consumers never read.
3. Coalesce emissions for the **non-form** outputs (`textChange`, `jsonChange`) to an
   animation frame, keeping the form value (`valueChange` / `onChange`) synchronous so
   `ControlValueAccessor` semantics are unchanged.

Add a spec that counts `onValue` invocations and asserts the payload composition; today
both spec files stub `onValue` and assert nothing.

---

### F-3 Anchored-overlay repositioning is not rAF-coalesced

**Severity:** low &nbsp;·&nbsp; **Confidence:** high &nbsp;·&nbsp; **Effort:** S

**Files:** `packages/core/src/primitives/overlay/strategies/position/anchored-to.ts:136,145,177-179,202-237`, `packages/core/src/cascade-select/cascade-select-sub-panel.ts:121-125`

> **Verification (2026-09-15).** **Downgraded high → low** and rewritten. The listener and
> the missing rAF coalescing are real. The *forced-reflow* compounding factor — the stated
> reason for the high rating — largely collapses, two of three line citations were wrong,
> and the capture-phase complaint describes the DOM incorrectly.

**Evidence**

```ts
// anchored-to.ts:211-216
applyManual();
if (!ctx?.platform.isBrowser) return;
onResize = () => applyManual();
onScroll = () => applyManual();
window.addEventListener('resize', onResize);
window.addEventListener('scroll', onScroll, true);
```

```ts
// anchored-to.ts:136 / :145 — reads
const tRect = effectiveRect(trigger);
const pRect = panel.getBoundingClientRect();
// anchored-to.ts:177-179 — writes
panel.style.position = 'fixed';
panel.style.left = `${left}px`;
panel.style.top  = `${top}px`;
```

*(Corrected citations: the style writes are at `:177-179`, not `:167-170` — `:167-170` is
the left/right-side align branch. The listener block is `:213-216`, not `:211-216` —
`:211` is the initial `applyManual()`.)*

`cascade-select-sub-panel.ts:121-125` repeats the pattern. A grep for
`requestAnimationFrame` under `packages/core/src/primitives/overlay` finds only
`controller.ts:175` and `_announce.ts:34`, neither on this path — so there is no throttle
anywhere.

**Why it matters (scoped)**

Each invocation reads `effectiveRect(trigger)` and `panel.getBoundingClientRect()`
(`:136`, `:145`) *after* the previous invocation wrote `panel.style.left/top` (`:177-179`),
so each call forces one synchronous layout. Without rAF coalescing, macOS momentum
scrolling can dispatch `scroll` faster than the paint rate, running `applyManual` more than
once per painted frame.

The scope is narrow: the listener is installed only while an overlay is **open**
(`onOpen` `:202-224` / `onClose` `:225-237`), so one or two are live at a time — not
"every tooltip, popover, dropdown, select and combobox" simultaneously. Scroll is
frame-coalesced in current engines, and the forced flush is one the browser would perform
for that frame regardless. The realistic overstatement is roughly **one extra layout per
frame while an overlay is open**, not "a full document re-layout per wheel tick".

**Withdrawn (did not survive verification)**

- *The width-write reflow claim.* `matchTriggerWidth: 'fixed'` is used **nowhere** in the
  library — only `'min'` (`select-content.ts:66`, `combobox-listbox.ts:47`,
  `tree-select-content.ts:112`, `cascade-select-panel.ts:75`). The cited
  `panel.style.width` branch (`:140`) is dead in practice. The `'min'` branch (`:142`)
  writes `${tRect.width}px`, and the trigger's width does not change while scrolling, so
  it sets a byte-identical inline value every tick — which Blink, WebKit and Gecko all
  short-circuit without dirtying style or layout. Cost is one reflow on first open, not
  one per wheel tick.
- *The capture-phase complaint.* "Capture-phase `scroll` on `window` fires for every
  scrollable element in the document" misdescribes the DOM: a capture listener receives an
  event only from an element that actually scrolled, normally one at a time. Capture here
  is the **correctness requirement** — without it an overlay anchored to a trigger inside a
  scrolling container drifts off its trigger. Angular CDK's `ScrollDispatcher` does the
  same, and its `RepositionScrollStrategy` defaults to a 0 ms throttle.

No profile or trace evidence was offered. `anchored-to.spec.ts` covers only the placement
signal, the CSS-anchor branch and style clearing, so no test bears on this either way.

**Fix**

Coalesce `onScroll` / `onResize` through a single pending `requestAnimationFrame` — skip
the call if one is already scheduled, cancel it in `onClose()` — as CDK's
`RepositionScrollStrategy` and Floating UI's `autoUpdate` do. Optionally hoist the
trigger-width read out of the per-tick path. Passing `{ passive: true, capture: true }` is
a free extra (the handler never calls `preventDefault`). Low priority, low risk.

---

### F-4 No virtualization for list-style components (combobox / command palette)

**Severity:** medium &nbsp;·&nbsp; **Confidence:** high &nbsp;·&nbsp; **Effort:** L

**Files:** `packages/core/src/primitives/list/filterable-list.ts:50-56,107-124`, `packages/core/src/primitives/list/item.ts:35-46`, `packages/core/src/combobox/combobox-root.ts:77,126`, `packages/core/src/command-palette/command-palette.ts:63-108,194`, `packages/components/src/table/table-virtual.ts`

> **Verification (2026-09-15).** **Downgraded high → medium** and rescoped. The missing
> list virtualizer is real. But the blast radius was wrong by half, the documented
> large-dataset escape hatch was omitted, and the "15 000 signal writes per keystroke"
> arithmetic does not hold.

**Evidence**

`grep -l virtual` across both packages confirms a virtualizer exists **only** for the
table (`packages/components/src/table/table-virtual.ts`). There is no list virtualizer.

```ts
// filterable-list.ts:50-56
readonly visibleItems = computed<readonly KjListItem<T>[]>(() => {
  const all = this._items();
  if (!this._shouldFilter()) return all;   // :52 — short-circuits BEFORE the query read
  const q = this._query();                 // :53
  const fn = this._filterFn();
  return all.filter(i => fn(q, i.haystacks()) > 0);
});
```

```ts
// filterable-list.ts:107-124 — the visibility effect (cited as :104-124 in the first draft)
for (const item of all) {
  const isVisible = visibleSet.has(item.id);
  item.setVisible(isVisible);              // :115
  if (isVisible) { item.posInSet.set(++i); item.setSize.set(total); }   // :117-118
  else           { item.posInSet.set(null); item.setSize.set(null); }   // :120-121
}
```

**Scope — two components, not four.** `grep -rln KjFilterableList` over both packages
returns only `combobox-root.ts`, `command-palette.ts`, the primitive, its spec, its barrel
and `inject-helpers.ts`. `KjCombobox` and `KjCommandPalette` are the sole providers
(`combobox-root.ts:77,126`; `command-palette.ts:65,106`). **`KjSelect` and `KjTreeSelect`
never provide or inject `KjFilterableList`** — they have no query and run no filter effect
at all, so the original claim that this "applies to `KjCombobox`, `KjCommandPalette`,
`KjSelect` and `KjTreeSelect` alike" is false.

**Why it matters — the real cost is up-front render and memory.** Every declared
`<kj-option>` / `<kj-command-item>` carries a `KjListItem` host directive with **eight**
host attribute/property bindings plus three listeners (`item.ts:35-46` — the first draft
said five) and its own element injector, and stays in the DOM permanently, hidden only via
`[hidden]` (`item.ts:35`). Thousands of declared options means thousands of live elements
to style and hit-test, whether or not they match.

**Withdrawn — the per-keystroke write storm.** Angular drops an `Object.is`-equal
`signal.set`, so `setVisible` and `posInSet` are no-ops for every item that did not cross
the filter boundary or shift position, and `setSize` is written only on **visible** items
(hidden ones get `null`) — after the first narrowing keystroke that is the match count, not
thousands. The "up to 15 000 signal writes" and "`aria-setsize` re-stamped on thousands of
host elements per keypress" framings are dropped. The genuine per-keystroke cost is one
O(n) loop plus one O(n) lowercase pass — sub-millisecond at any plausible *n*. (Caching a
lowercased haystack on the item is still a cheap, worthwhile win.)

**Existing mitigation, previously omitted.** The large-dataset escape hatch already exists
and short-circuits *before* the query is read: `visibleItems` returns early at
`filterable-list.ts:52`, ahead of `this._query()` at `:53`. With
`[kjShouldFilter]="false"` a keystroke does not invalidate the computed and the effect
never re-runs — **zero** per-keystroke work. That is the documented server-filtered path,
paired with `[kjItems]` + `kjCommandPaletteItemTemplate`
(`command-palette.ts:63-108`, `@for` at `:194`).

**Fix**

1. **Offer an opt-in windowing strategy for the list primitive.** The table already has
   one (`packages/components/src/table/table-virtual.ts`); extract the
   `@tanstack/virtual-core` wiring out of `KjTableVirtual` into a reusable
   `KjVirtualFor`-style primitive the list clusters can consume. A data-driven option list
   (`[kjOptions]`) rather than content projection is a prerequisite; that is a public-API
   change and should be scoped separately.
2. **Document the supported answer for large option sets today** —
   `[kjShouldFilter]="false"` plus `[kjItems]` and remote paging — in the combobox and
   command-palette TSDoc, so consumers do not discover it by reading the primitive.
3. **Cheap independent win:** precompute a lowercased haystack as a `computed` on
   `KjListItem`, and hoist `aria-setsize` to a single container-level signal the item
   reads.

---

### F-5 `KjFocusRing` installs two document-level capture listeners per instance

**Severity:** medium &nbsp;·&nbsp; **Confidence:** high &nbsp;·&nbsp; **Effort:** S

**Files:** `packages/core/src/primitives/interaction/focus-ring.ts:36-58`

**Evidence**

```ts
// focus-ring.ts:36
afterNextRender(() => {
  if (!isPlatformBrowser(this.platformId)) return;
  const onKeydown     = () => { this._lastWasPointer = false; };
  const onPointerdown = () => { this._lastWasPointer = true; };
  // …
  document.addEventListener('keydown', onKeydown, true);
  document.addEventListener('pointerdown', onPointerdown, true);
  // …
});
```

`KjFocusRing` is composed via `hostDirectives` by `KjButton`, `KjLink`,
`KjInput`, `KjCheckbox`, `KjNumberInput`, `KjComboboxInput`,
`KjDatePickerTrigger`, `KjInputOtpSlot`, `KjBreadcrumbEllipsis`, every
`KjPagination*` control, four `KjColorPicker` sub-directives and four carousel
sub-directives.

**Why it matters**

`_lastWasPointer` is inherently **global** state — "was the last input a pointer
or a key?" — yet every focusable element keeps its own copy and its own pair of
document listeners to maintain it. A non-virtualized table of 200 rows with a
checkbox and an action button per row mounts 400 `KjFocusRing` instances →
**800 document-level capture listeners**. Every keypress and every pointerdown
on the page is then dispatched through 400 handlers (the capture phase walks
from `document` down, so every one of them runs). Each handler body is trivial,
so this is dispatch overhead rather than per-handler cost, but it also means
800 closures retaining 400 `ElementRef`s, plus add/remove churn on every virtual
scroll tick or filter change.

The library already demonstrates the right pattern one directory over:
`KjOverlayStack.ensureListeners()` (`stack.ts:183-195`) installs one shared pair
lazily and removes them when nothing needs them.

**Fix**

Extract the global half into a `providedIn: 'root'` service — e.g.
`KjLastInputModality` — holding one `keydown` + one `pointerdown` capture
listener and exposing a `Signal<'keyboard' | 'pointer'>`. `KjFocusRing` then
injects it and keeps only the two *element-scoped* `focus`/`blur` listeners
(which are correctly per-instance). This is a pure refactor: no public API
change, identical behaviour, and it collapses 2N document listeners to 2.

---

### F-6 Selection membership is O(selected) per item, so a multi-select toggle is O(n·m)

**Severity:** medium &nbsp;·&nbsp; **Confidence:** medium &nbsp;·&nbsp; **Effort:** M

**Files:** `packages/core/src/primitives/list/selection.ts:222-229, 296-304`, `packages/core/src/primitives/list/item.ts:180-186`

**Evidence**

```ts
// selection.ts:222
isSelected(target: T): boolean {
  const v = this._value();
  if (v === null) return false;
  const mode = this._mode();
  if (mode === 'multi' || mode === 'leaf' || mode === 'cascade') {
    return Array.isArray(v) && v.some(x => this._compareBy(x, target));  // O(|selected|)
  }
  return this._compareBy(v as T, target);
}
```

```ts
// item.ts:180 — one computed per rendered item, bound to [attr.aria-selected]
readonly ariaSelected = computed<'true' | 'false' | null>(() => {
  if (!this.selection) return null;
  if (this.selection.mode() === 'cascade') return null;
  const v = this.value();
  if (v === undefined) return null;
  return this.selection.isSelected(v) ? 'true' : 'false';   // reads _value()
});
```

```ts
// selection.ts:296
private _multiToggle(target: T): { closeRequested: boolean } {
  const current = this._value();
  const arr = Array.isArray(current) ? [...current] : [];    // O(m) copy
  const idx = arr.findIndex(x => this._compareBy(x, target)); // O(m)
  // …
  this._value.set(arr);                                      // invalidates every ariaSelected
}
```

**Why it matters**

Selection is stored as an **array** and membership is a linear `some()`. Every
rendered item's `ariaSelected` computed depends on `_value()`, so a single
toggle invalidates all n item computeds; each one then scans the m-element
selection array. Cost per click is **O(n · m)**.

At the sizes the library's examples use (tens of options) this is invisible. At
a 5 000-option multi-select with 2 000 selected it is 10 million comparisons per
click, on the main thread, inside change detection. The array shape also makes
"select all" quadratic on its own.

**Fix**

Keep the public `value` as an array (it is the bound model and must stay), but
maintain a derived `computed<Set<T> | null>` membership index inside
`KjSelectionModel` — non-null only when `_compareBy` is `Object.is`, which is
the default and covers primitives and stable object references. `isSelected`
then does `set.has(target)` in O(1) and falls back to the current `some()` scan
only for a custom comparator. `_multiToggle` similarly rebuilds from the Set.
This is internal-only and does not change any public signature.

---

### F-7 Auto-derived tree shape does a full linear key scan on every topology query

**Severity:** medium &nbsp;·&nbsp; **Confidence:** medium &nbsp;·&nbsp; **Effort:** S

**Files:** `packages/core/src/primitives/list/selection.ts:104-146, 240-259`

**Evidence**

```ts
// selection.ts:129 — inside _autoShape
const eq = this._compareBy;
const findKey = (n: T): T | undefined => {
  for (const k of parentOf.keys()) {     // O(nodes) — on EVERY query
    if (eq(k, n)) return k;
  }
  return undefined;
};
return {
  getParent:   (n: T) => { const key = findKey(n); /* … */ },
  getChildren: (n: T) => { const key = findKey(n); /* … */ },
  isLeaf:      (n: T) => { const key = findKey(n); /* … */ },
};
```

```ts
// selection.ts:247 — _cascadeState recursion, one findKey per call
private _cascadeState(node: T, shape: KjTreeShape<T>): 'true' | 'false' | 'mixed' {
  if (shape.isLeaf(node)) { /* … */ }
  const children = shape.getChildren(node);
  for (const c of children) {
    const s = this._cascadeState(c, shape);   // recurses; each level pays findKey
  }
}
```

**Why it matters**

The auto-derived shape (used when the consumer does not supply `treeShape` —
i.e. DOM-nested clusters like `cascade-select` and nested menus) resolves every
`getParent` / `getChildren` / `isLeaf` by scanning **all** map keys. Because
`_cascadeState` recurses over a subtree and calls `isLeaf` + `getChildren` at
every node, evaluating one branch's tri-state is O(subtree × total nodes). And
`KjListItem.ariaChecked` (`item.ts:194-199`) calls `cascadeState` **per item**,
so a full cascade render is worse still.

The scan exists because `_compareBy` may be a custom comparator that `Map.get`
cannot honour. But the default is `Object.is`, which `Map` uses natively.
Contrast `KjTreeSelect._nodeShape` (`core/src/tree-select/tree-select-root.ts:172-190`),
which builds the same maps and queries them with plain `Map.get` — O(1), and is
the path most real tree-selects take. The auto-shape is the slow one.

Severity held at medium (not high) because DOM-nested cascades are small by
construction — nobody hand-writes 5 000 nested `<kj-cascade-select-option>`
elements. The complexity is nonetheless latent.

**Fix**

Short-circuit on the common case: `const key = parentOf.has(n) ? n : findKey(n)`.
That makes every query O(1) whenever the comparator is identity-compatible and
preserves the scan as a correctness fallback. Additionally memoise
`_cascadeState` per `(node, value-version)` so sibling items rendering the same
branch do not each re-walk it.

---

### F-8 Table persists full state to storage on every state change, including per-row selection

**Severity:** medium &nbsp;·&nbsp; **Confidence:** medium &nbsp;·&nbsp; **Effort:** S

**Files:** `packages/components/src/table/table.ts:865-873`, `packages/core/src/table/table.ts:18-32`

**Evidence**

```ts
// components/table/table.ts:865
// Persistence: watch state and write through. Reading `state()` once
// is enough — the single signal invalidates on any slice change.
effect(() => {
  const key = this.kjStorageKey();
  if (!key) return;
  const adapter = this.kjStorageAdapter() ?? this.tokenStorage;
  if (!adapter) return;
  adapter.write(key, this.t.state());
});
```

`KjTableState` (`core/table/table.ts:18-32`) includes `rowSelection: {}` and
`expanded: {}`.

**Why it matters**

`state()` is a single signal that invalidates on *any* slice change, and
`rowSelection` / `expanded` are slices. So clicking a row checkbox on a
persisted table triggers a synchronous `adapter.write(key, <entire state>)` —
which for the documented `localStorage` adapter means a `JSON.stringify` of the
whole state object plus a blocking storage write, on the main thread, in the
click handler. Shift-selecting a 1 000-row range writes a 1 000-key
`rowSelection` record. Ctrl+A on a 10 000-row table
(`table.ts:824-830` → `toggleAllRowsSelected(true)`) serialises 10 000 keys.

Row selection is also arguably the wrong thing to persist at all — a reload
restoring "these 4 000 rows were selected" is rarely the desired behaviour, and
it is not listed in the component's own persistence doc-example, which promises
"sort / filter / pinning / visibility / density".

**Fix**

Persist a narrowed projection rather than the whole state — sorting,
columnFilters, columnSizing, columnVisibility, columnOrder, columnPinning,
density, pagination — and drop `rowSelection` / `expanded` / `globalFilter` from
the written payload (or make the set configurable via an input). Debounce the
write (trailing ~300 ms) so a drag-resize or a rapid multi-select coalesces into
one storage round-trip.

---

### F-9 Table virtualization uses a fixed row estimate with no measurement, and expansion rows are not accounted for

**Severity:** medium &nbsp;·&nbsp; **Confidence:** high &nbsp;·&nbsp; **Effort:** M

**Files:** `packages/components/src/table/table-virtual.ts:96-108, 120-140`, `packages/components/src/table/table.ts:356-437`

**Evidence**

```ts
// table-virtual.ts:96
effect(() => {
  const count = this.kjCount();
  const estimate = this.kjEstimateSize();
  const overscan = this.kjOverscan();
  const v = this.virtualizer;
  if (!v) return;
  v.setOptions({ ...v.options, count, estimateSize: () => estimate, overscan });
  this.sync();          // writes 4 signals from inside an effect
});
```

There is no `measureElement` option passed to the `Virtualizer`, and no
`ResizeObserver`-backed dynamic measurement anywhere in the file — the
virtualizer's `getTotalSize()` is therefore always `count × estimate`.

Meanwhile the virtualized branch renders an **extra** expansion row per expanded
row that the virtualizer knows nothing about:

```html
<!-- components/table/table.ts:415 — inside the kjTableVirtual tbody -->
@if (kjRowExpansionTpl() && r.getIsExpanded?.()) {
  <tr class="kj-table-expansion-row">
    <td [attr.colspan]="aria.colCount()"> … </td>
  </tr>
}
```

**Why it matters — the 10 000-row estimate**

The windowing itself is correct and will hold up: `centerRows()` returns all
10 000 `Row` objects (cheap — TanStack memoises the row model) but only the
overscan window renders, so DOM node count stays at roughly
`(viewport / 36 + 10) × columns`. That part is fine.

What breaks is **scroll fidelity**:

- Every row is assumed to be exactly `kjEstimatedRowSize` (default `36`).
  `kjDensity="comfortable"` rows, any wrapped cell text, any custom
  `kjCellTemplate` with a two-line body — all make real height diverge from the
  estimate. The spacer `<tr>` heights (`v.paddingTop()` / `v.paddingBottom()`)
  are then wrong, and the mismatch accumulates over 10 000 rows into scrollbar
  drift and content that jumps as you scroll.
- An expanded master/detail row adds arbitrary unmeasured height inside the
  window, immediately desynchronising the offsets for everything below it.

`@tanstack/virtual-core` supports this directly via the `measureElement` option
plus `item.measureElement` refs; the wiring is simply absent.

Secondary note: `sync()` writes four signals from inside an `effect`
(`table-virtual.ts:102-106` → `sync()` at `:158-173`), which works but is the
pattern `rules/code_style.md` steers away from; the `onChange` callback path is
the legitimate one.

**Fix**

- Pass `measureElement` to the `Virtualizer` and attach a `#measure` ref-callback
  on each rendered `<tr>` so real heights feed back. Keep `kjEstimatedRowSize` as
  the pre-measurement estimate only.
- Either exclude expansion rows from virtualization (render them outside the
  windowed range) or fold them into the measured row height by making the
  expansion `<tr>` part of the measured element.
- Document the current constraint in the `@doc-example Virtualized` block until
  measurement lands: "virtualized mode assumes uniform row height".

---

### F-10 Chat re-sanitises every markdown block on every change-detection pass

**Severity:** medium &nbsp;·&nbsp; **Confidence:** medium &nbsp;·&nbsp; **Effort:** S

**Files:** `packages/components/src/chat/chat-message.ts:91, 155, 160-169`

**Evidence**

```html
<!-- chat-message.ts:91 -->
<div class="kj-chat-md" [innerHTML]="safe(block.html)"></div>
```

```ts
// chat-message.ts:167
safe(html: string): SafeHtml {
  return this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '';
}
```

```ts
// chat-message.ts:155
readonly blocks = computed<KjMdBlock[]>(() => renderMarkdown(this.message().content));
```

**Why it matters**

`safe()` is a **method call in a template binding** — the thing the check-list
explicitly flags. `DomSanitizer.sanitize(SecurityContext.HTML, …)` is not a
lookup: it parses the string into a detached DOM tree, walks it against the
allow-list, and re-serialises. It runs once per block per change-detection pass
of that component.

OnPush + signal inputs limits the blast radius — only the message whose
`message()` input changed gets dirty-checked — but that is precisely the
streaming message, which is dirty on **every token**. So a 4 KB assistant reply
streaming at 30 tokens/s re-parses and re-serialises ~4 KB of HTML thirty times
a second, on top of F-11.

Note the sanitisation itself is correct and worth keeping — `markdown.ts`
already escapes raw HTML at the parse layer and the double-layer posture is
deliberate and well-argued in the TSDoc. The problem is purely that the result
is never cached.

**Fix**

Move sanitisation into the `blocks` computed so each block carries a pre-
sanitised `SafeHtml` alongside its raw `html`, and bind
`[innerHTML]="block.safeHtml"` directly. One sanitise per block per content
change instead of per render.

---

### F-11 Streaming re-lexes the entire message on every token

**Severity:** medium &nbsp;·&nbsp; **Confidence:** medium &nbsp;·&nbsp; **Effort:** M

**Files:** `packages/components/src/chat/chat-message.ts:155`, `packages/components/src/chat/markdown.ts:69-100`, `packages/core/src/chat/chat-stream.ts`

**Evidence**

```ts
// chat-message.ts:155
readonly blocks = computed<KjMdBlock[]>(() => renderMarkdown(this.message().content));
```

```ts
// markdown.ts:69
export function renderMarkdown(src: string): KjMdBlock[] {
  const tokens = marked.lexer(src);          // full re-lex of the whole message
  // …
  blocks.push({ kind: 'prose', html: marked.parser(list) });   // full re-parse
}
```

**Why it matters**

`KjChatStore.pushChunk()` appends a token and replaces the message object, so
`message()` changes per token, so `blocks` recomputes per token, so
`marked.lexer` + `marked.parser` run over the **entire accumulated content**
each time. Total work over a reply of length n is `O(n²)`. For a short reply
this is free; for a long code-heavy answer the last tokens arrive visibly slower
than the first, which reads to a user as the model slowing down.

The TSDoc in `markdown.ts` explicitly designs for partial streams
("`pedantic` off so the parser stays forgiving of the half-formed markdown a
model emits mid-stream"), so incremental parsing was considered — just not
implemented.

**Fix**

Two options, cheapest first:

1. **Throttle the render, not the data.** Keep `content` updating per token
   (the typing indicator and the live-region announcer need it) but drive
   `blocks` off a `linkedSignal`/rAF-throttled snapshot so markdown re-renders
   at most once per frame rather than once per token. This alone caps the cost
   at 60 Hz regardless of token rate.
2. **Incremental parse.** Split the content at the last "stable" boundary (the
   last blank line outside an open fence), memoise the blocks before it, and
   only re-lex the trailing fragment. More work, but turns the total into O(n).

---

### F-12 Cascade sub-panel leaks its window listeners when destroyed while open, and repositions unthrottled

**Severity:** medium &nbsp;·&nbsp; **Confidence:** medium &nbsp;·&nbsp; **Effort:** S

**Files:** `packages/core/src/cascade-select/cascade-select-sub-panel.ts:104-131`

**Evidence**

```ts
// cascade-select-sub-panel.ts:108
const reposition = () => {
  const optEl = this.parentOption?.item._host();
  if (!optEl) return;
  const rect = optEl.getBoundingClientRect();   // READ
  const el = this.el.nativeElement;
  el.style.top  = `${rect.top}px`;              // WRITE
  el.style.left = `${rect.right + 2}px`;        // WRITE
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

`grep DestroyRef|onCleanup|onDestroy` on this file: **no match** — removal only
ever happens through the `else` branch.

**Why it matters**

Two problems:

1. **Leak.** The listeners are removed only when `open()` transitions to `false`
   *while the directive is still alive*. If the sub-panel's view is destroyed
   while open — the root overlay closing and tearing down its embedded view, a
   route change, `*ngIf` on the cascade root — the effect is destroyed and the
   `else` branch never runs. Two `window` listeners survive, holding closures
   over the detached `ElementRef` and the parent option. Repeated open/destroy
   cycles accumulate them, and each one keeps calling `getBoundingClientRect` on
   a detached node for the life of the page.
2. **Unthrottled capture-phase scroll again.** Same shape as F-3: a read
   (`getBoundingClientRect`) followed by two style writes, per scroll event,
   from any scroller in the document.

**Fix**

Register the teardown with `DestroyRef.onDestroy` (or use the effect's
`onCleanup` parameter, which runs both on re-run *and* on destroy) rather than
hand-rolling the removal in the `else` branch:

```ts
effect((onCleanup) => {
  if (typeof window === 'undefined' || !this.open()) return;
  const schedule = rafThrottle(reposition);
  reposition();
  window.addEventListener('resize', schedule);
  window.addEventListener('scroll', schedule, { capture: true, passive: true });
  onCleanup(() => {
    schedule.cancel();
    window.removeEventListener('resize', schedule);
    window.removeEventListener('scroll', schedule, true);
  });
});
```

Better still: route this through `KjOverlayService` / `anchoredTo` as
`rules/architecture.md` requires ("All overlays share `KjOverlayService`. Never
reimplement per component") — the sub-panel is currently a hand-rolled second
positioner, so it will need F-3's fix applied twice otherwise.

---

### F-13 `<kj-table>` calls per-cell methods from the template on every render

**Severity:** medium &nbsp;·&nbsp; **Confidence:** medium &nbsp;·&nbsp; **Effort:** S

**Files:** `packages/components/src/table/table.ts:344-352, 396-404, 452-460, 665-670`

**Evidence**

```ts
// table.ts:665
protected cellTpl(cell: Cell<TData, unknown>): TemplateRef<unknown> | null {
  for (const t of this.cellTemplates()) {              // linear scan, per cell, per render
    if (t.kjCellTemplate() === cell.column.id) return t.template;
  }
  return null;
}
```

```html
<!-- table.ts:346, repeated in all four tbody branches -->
<td kjTableCell [kjCell]="c" tabindex="-1"
    [class.kj-table-cell--editing]="isEditing(c)"
    [style.width.px]="kjEnableResize() ? c.column.getSize() : null"
    …>
  @if (isEditing(c)) { … }
  @else { @if (cellTpl(c); as tpl) { … } }
</td>
```

**Why it matters**

`isEditing(c)` and `cellTpl(c)` are plain methods invoked from bindings, so they
re-execute for **every rendered cell on every change-detection pass** of the
table. `cellTpl` additionally does a linear scan of the `contentChildren`
template list and reads a signal per candidate.

With virtualization on (~40 rows × 12 columns) that is ~480 `isEditing` calls
plus ~480 scans of the template list per pass — each `isEditing` allocating
nothing but reading `editingCell()`, each `cellTpl` iterating the templates.
Without virtualization on a 200-row page it is 2 400 of each. The table is
dirty-checked on every sort, filter, resize-drag frame, hover and selection
change, so this compounds with F-8.

`isEditing` is true for at most one cell ever, and `cellTpl` depends only on
`(column.id, cellTemplates)` — both are trivially memoisable.

**Fix**

- Replace the `cellTemplates` scan with a `computed<Map<string, TemplateRef>>`
  built once from `cellTemplates()`; `cellTpl` becomes `map.get(cell.column.id)`.
- For `isEditing`, hoist a row-level check so 11 of 12 cells short-circuit on a
  single comparison, or push the flag down into `KjTableCell` as an input
  derived once per row.
- The four near-identical `<tbody>` branches (pinned-top, virtual, plain,
  pinned-bottom) each duplicate this markup — extracting the `<tr>` body into a
  single `ng-template` would make the fix land once instead of four times.

---

### F-14 `<kj-tree-select>` renders the entire tree and calls `isRowHidden()` per row per render

**Severity:** medium &nbsp;·&nbsp; **Confidence:** high &nbsp;·&nbsp; **Effort:** M

**Files:** `packages/components/src/tree-select/tree-select.ts:245-258, 298-315`, `packages/core/src/tree-select/tree-select-root.ts:207-212`

**Evidence**

```html
<!-- tree-select.ts:245 -->
@for (row of flatNodes(); track row.node.value) {
  <kj-tree-select-node
    …
    [multiMode]="ts.selectionMode() === 'multiple'"
    [hidden]="isRowHidden(row)"
  >{{ row.node.label }}</kj-tree-select-node>
}
```

```ts
// tree-select.ts:307
isRowHidden(row: FlatNode): boolean {
  if (row.ancestorValues.length === 0) return false;
  const expanded = this.ts.expandedValues();     // computed that allocates `new Set(...)`
  for (const ancestorValue of row.ancestorValues) {
    if (!expanded.has(ancestorValue)) return true;
  }
  return false;
}
```

```ts
// tree-select-root.ts:207
readonly expandedValues = computed(() =>
  new Set(this._expandedValues()) as ReadonlySet<unknown>,   // defensive copy
);
```

**Why it matters**

`flattenTree` (`tree-select.ts:38-61`) emits **every** node, expanded or not, and
the template renders all of them; collapse is `[hidden]` only. That is a
deliberate, documented a11y trade-off (`@doc-a11y`: "All nodes stay in the DOM
… so the ARIA tree structure is stable across collapse/expand") and it is a
defensible choice — but it means a 5 000-node tree mounts 5 000
`KjTreeSelectNodeComponent` instances plus 5 000 `KjTreeSelectNode` +
`KjListItem` directive pairs the moment the panel opens, regardless of how many
are visible.

On top of that, `isRowHidden(row)` is a method binding evaluated per row per
render, walking the ancestor chain each time, and
`ts.selectionMode() === 'multiple'` is re-evaluated per row as well. The
`expandedValues` computed allocates a defensive `new Set` copy on every
expansion change.

Expanding one branch therefore re-evaluates `isRowHidden` for all 5 000 rows.

**Fix**

- Turn `isRowHidden` into per-row derived state: precompute, in the `flatNodes`
  computed, each row's ancestor list as a frozen array, and expose a single
  `computed<Set<unknown>>` of *visible* row values that the `[hidden]` binding
  reads with one `has()` — no per-row loop, no method call.
- Hoist `ts.selectionMode() === 'multiple'` into a component-level `computed`
  and bind that signal instead of re-comparing per row.
- Drop the defensive copy in `expandedValues` (the backing signal is already
  replaced wholesale on every mutation, so the copy buys nothing).
- Longer term: render only the *visible* subset and keep ARIA tree semantics via
  `aria-setsize` / `aria-posinset` on the rendered rows, which is what the ARIA
  Tree pattern actually requires — the "all nodes in DOM" rationale is stronger
  than it needs to be.

---

### F-15 Five directives duplicate the root `KjReducedMotion` matchMedia subscription per instance

**Severity:** low &nbsp;·&nbsp; **Confidence:** high &nbsp;·&nbsp; **Effort:** S

**Files:** `packages/core/src/spinner/spinner.ts:118-126`, `packages/core/src/progress-bar/progress-bar.ts:169-180`, `packages/core/src/chart/chart.ts:141-151`, `packages/core/src/carousel/carousel.ts:199-205`, `packages/components/src/editor/editor.ts:104-110` — versus `packages/core/src/motion/reduced-motion.ts:38-72`

**Evidence**

```ts
// core/src/spinner/spinner.ts:120 — one of five near-identical copies
const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
this.reducedMotion.set(mql.matches);
const onChange = (e: MediaQueryListEvent) => this.reducedMotion.set(e.matches);
mql.addEventListener('change', onChange);
destroyRef.onDestroy(() => mql.removeEventListener('change', onChange));
```

```ts
// core/src/motion/reduced-motion.ts:38 — the shared service that already does this
@Injectable({ providedIn: 'root' })
export class KjReducedMotion { /* one matchMedia for the whole app */ }
```

**Why it matters**

`prefers-reduced-motion` is an application-wide OS setting, but each spinner,
progress bar, chart, carousel and editor creates its own `MediaQueryList` and
its own `change` listener. A loading screen with twenty skeletons/spinners
creates twenty of each. The per-instance cost is small — this is not a hot path
— but it is redundant retained state on every instance and duplicates a service
that already exists and is documented for exactly this purpose. (This matches a
follow-up already noted in project memory: "reuse `KjReducedMotion` everywhere".)

**Fix**

Replace each local block with `private readonly motion = inject(KjReducedMotion)`
and read `motion.prefersReducedMotion()`. Purely mechanical; removes ~60 lines
and 5 duplicate subscriptions per component instance.

---

### F-16 `KjTag` installs a subtree MutationObserver per tag

**Severity:** low &nbsp;·&nbsp; **Confidence:** high &nbsp;·&nbsp; **Effort:** S

**Files:** `packages/core/src/tag/tag.ts:153-170`

**Evidence**

```ts
// tag.ts:161
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

**Why it matters**

Every `KjTag` instance gets its own `MutationObserver` with `subtree: true` and
`characterData: true` — the broadest configuration available — purely to keep an
accessible-name fallback in sync with projected text. Tags appear in bulk by
design (`kj-tag-list` with overflow, tags inside table cells, filter chips). A
table with a status tag per row across 200 rows mounts 200 subtree observers.
The cleanup is correct and each callback is trivial, so this is registration and
retention overhead rather than a hot path — hence low.

**Fix**

Seed `_textContent` once in `afterNextRender` (already done at `tag.ts:155`) and
make the observer opt-in behind an input for the rare case of tag text that
mutates after first render, defaulting to off. Alternatively accept the label via
an input (`kjTagLabel`) and drop the DOM observation entirely for callers that
can provide it.

---

### F-17 Textarea auto-resize forces two synchronous reflows per keystroke, twice

**Severity:** low &nbsp;·&nbsp; **Confidence:** medium &nbsp;·&nbsp; **Effort:** S

**Files:** `packages/core/src/textarea/textarea.ts:180-195, 199-204, 210-234`

**Evidence**

```ts
// textarea.ts:180 — effect re-measures whenever the form value changes
effect(() => {
  this.kjAutoresize(); this.kjMinRows(); this.kjMaxRows();
  this.formCtrl.value();
  this.measure();
});

// textarea.ts:199 — host input handler ALSO measures
onInput(value: string): void {
  this.formCtrl.notifyChange(value);
  if (this.kjAutoresize() === 'auto') this.measure();
}
```

```ts
// textarea.ts:215 — inside measure()
const cs = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;  // style recalc
// … parseFloat of lineHeight, fontSize, paddingTop/Bottom, borderTop/BottomWidth
el.style.height = 'auto';               // WRITE
const measured = el.scrollHeight;       // READ → forced layout
el.style.height = `${clamped}px`;       // WRITE
el.style.overflowY = measured > maxHeight ? 'auto' : 'hidden';  // WRITE
```

**Why it matters**

`onInput` calls `measure()` *and* `notifyChange` updates `formCtrl.value()`,
which the effect tracks and which triggers a second `measure()`. Each `measure()`
does a `getComputedStyle` (forced style recalculation) plus a
write→read→write sequence that forces synchronous layout. So a keystroke costs
**two style recalcs and two forced layouts**. Six `parseFloat` calls per measure
re-derive metrics (line-height, padding, border) that only change when the
element's CSS changes — essentially never during typing.

Low severity because a textarea is a single element and modern browsers handle
this at typing speed, but it is avoidable work on the most latency-sensitive
interaction in a form.

**Fix**

- Drop the `measure()` call in `onInput` and let the effect be the single
  trigger (or vice-versa) — not both.
- Cache the `lineHeight` / `paddingY` / `borderY` metrics, recomputing only when
  `kjMinRows` / `kjMaxRows` change or on a font-loading / resize event.
- Consider `field-sizing: content` with the JS path as the fallback; it removes
  the reflow entirely on supporting browsers.

---

### F-18 `KjRovingTabindex` re-sorts with `compareDocumentPosition` and reads computed style on every arrow key

**Severity:** low &nbsp;·&nbsp; **Confidence:** medium &nbsp;·&nbsp; **Effort:** S

**Files:** `packages/core/src/a11y/roving-tabindex.ts:84-93, 96-104, 118-133`

**Evidence**

```ts
// roving-tabindex.ts:86
private readonly items = computed(() =>
  [...this.registered()].sort((a, b) =>
    a.el.nativeElement.compareDocumentPosition(b.el.nativeElement) &
    Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  ),
);

// roving-tabindex.ts:97
register(item: KjRovingTabindexItemDirective): void {
  this.registered.update((all) => [...all, item]);     // O(n) copy → O(n²) to mount n items
}
```

```ts
// roving-tabindex.ts:126 — called from onKeydown when horizontal arrows are active
if (typeof getComputedStyle === 'function') {
  const direction = getComputedStyle(el).direction;    // forced style recalc, per keypress
```

**Why it matters**

- `register`/`unregister` copy the whole array each time, so mounting n items is
  O(n²) array allocation. For a toolbar or a sidebar nav (the documented uses)
  n is small; for a long roving list it is not.
- `items` sorts using `compareDocumentPosition`, which is a DOM tree-walk per
  comparison — O(n log n) DOM calls, recomputed whenever the registration set
  changes.
- `resolveRtl()` calls `getComputedStyle(el).direction` on **every keydown** when
  the orientation allows horizontal arrows — a forced style recalculation on the
  keyboard hot path, to answer a question whose answer essentially never changes
  during a session.

**Fix**

- Cache the resolved direction (invalidate on a `dir` MutationObserver on
  `document.documentElement`, or reuse the existing
  `core/src/primitives/directionality/directionality.ts` service, which already
  runs exactly one such observer at `directionality.ts:59`).
- Batch registration (accumulate into a plain array, flush once per microtask)
  and cache the sorted order, invalidating it only on register/unregister rather
  than re-sorting from scratch.

---

### F-19 Wrapper `<kj-chart>` resizes on every ResizeObserver entry, unlike the core directive

**Severity:** low &nbsp;·&nbsp; **Confidence:** high &nbsp;·&nbsp; **Effort:** S

**Files:** `packages/components/src/chart/chart.ts:152-153` — versus `packages/core/src/chart/chart.ts:170-183`

**Evidence**

```ts
// components/src/chart/chart.ts:152
this.observer = new ResizeObserver(() => this.chart?.resize());
this.observer.observe(this.host);
```

```ts
// core/src/chart/chart.ts:172 — the same concern, done right
let pendingRaf = 0;
const ro = new ResizeObserver(() => {
  if (pendingRaf) return;
  pendingRaf = requestAnimationFrame(() => { pendingRaf = 0; chart.resize(); });
});
```

**Why it matters**

`ECharts.resize()` is a full relayout + redraw of the canvas. Dragging a window
edge or animating a container width fires the ResizeObserver every frame (and
sometimes more than once per frame for multiple boxes), and the wrapper runs a
full resize for each. The core directive in the *same repo* already documents and
implements the rAF coalescing fix — the wrapper just never got it.

Also in the same file: `this.chart.setOption(option, { notMerge: true })`
(`components/src/chart/chart.ts:148`, `:137`) discards the previous option
wholesale on every `option()` change, so a live-updating series rebuilds the
entire chart rather than merging the changed series. And `this.theme()` is read
once at `init()` (`:146`) and never re-applied, so the theme input is silently
non-reactive.

**Fix**

Copy the rAF-coalesced ResizeObserver from `core/src/chart/chart.ts:172-186`
verbatim, including the `cancelAnimationFrame` on destroy. Separately, consider
whether `notMerge: true` is the right default — `notMerge: false` is the normal
choice for incremental updates and would let ECharts diff.

---

### F-20 `<kj-chat-thread>` allocates a fresh inputs object per render for custom renderers

**Severity:** low &nbsp;·&nbsp; **Confidence:** medium &nbsp;·&nbsp; **Effort:** S

**Files:** `packages/components/src/chat/chat-thread.ts:84-90, 130-137`

**Evidence**

```html
<!-- chat-thread.ts:84 -->
@if (rendererFor(m); as renderer) {
  <ng-container *ngComponentOutlet="renderer; inputs: { item: itemFor(m), message: m }"></ng-container>
}
```

```ts
// chat-thread.ts:130
protected itemFor(message: KjChatMessageData): KjChatItemInput {
  return { id: message.id, type: message.type, role: message.role,
           data: message.data ?? message.content };            // new object every call
}
```

**Why it matters**

Both `rendererFor(m)` and `itemFor(m)` are method calls in bindings, and
`itemFor` returns a **new object literal** every invocation, nested inside
another object literal passed to `NgComponentOutlet.inputs`. `NgComponentOutlet`
compares the inputs record and re-sets any input whose value is not identical, so
the custom renderer's `item` input is written on **every** change-detection pass
of the thread, waking that component each time regardless of whether anything
changed. The thread is dirty-checked on every streamed token.

Only affects threads that register custom renderers via `provideKjChat`; the
common path (`<kj-chat-message>`) is unaffected — hence low.

**Fix**

Precompute the renderer and item in a `computed` keyed by message id (a
`Map<string, {renderer, item}>` rebuilt only when `store().messages()` changes),
and bind the memoised object. Alternatively give custom renderers the message
signal directly and let them derive `item` themselves.

---

## Recommended work items

Ordered by expected impact per unit of effort. All estimates are code-derived —
step 0 is to confirm them.

0. **Establish a measurement baseline before changing anything.** Three
   Playwright + `performance.measure` scenarios, checked into the repo: (a) a
   dashboard with two `<kj-chart>` + a hover-active table, (b) typing 200
   characters into `<kj-rich-text>` with a 20 KB pre-seeded document, (c) an
   open `<kj-select>` over a scrolling table body. Without these, every item
   below is a hypothesis. → validates **F-1, F-2, F-3**

1. **F-1** — replace `afterEveryRender` with a dependency-tracked `effect` in
   `core/src/chart/chart.ts`, and memoise `resolveChartPalette`. Single smallest
   change with the largest expected win. *(S)*

2. **F-3** — rAF-coalesce `applyManual`, mark the scroll listener passive, and
   hoist the `matchTriggerWidth` write out of the measure path in `anchored-to.ts`.
   Benefits every overlay in the library. *(M)*

3. **F-2** — debounce and lazify rich-text serialisation; stop the double
   `getTextContent` walk. *(M)*

4. **F-5** — extract the global input-modality half of `KjFocusRing` into a
   root service. Pure refactor, no API change, removes 2N document listeners. *(S)*

5. **F-12** — fix the cascade sub-panel listener leak with `onCleanup`, and
   fold its hand-rolled positioner into `anchoredTo` so it inherits item 2's
   fix. *(S)*

6. **F-13 + F-8** — table template hygiene: `cellTpl` → `Map` lookup, hoist
   `isEditing`, extract the four duplicated `<tbody>` bodies into one template;
   and narrow + debounce the persistence write. *(S each)*

7. **F-10 + F-11** — chat: move sanitisation into the `blocks` computed, then
   throttle markdown re-render to one frame. Do F-10 first; it may make F-11
   feel acceptable on its own. *(S, then M)*

8. **F-4 tier 1+2** — cached lowercased haystacks, container-level `aria-setsize`,
   and converting the `KjFilterableList` visibility effect into per-item derived
   `computed`s. Ships real gains for combobox/palette without any API change. *(M)*

9. **F-6 + F-7** — selection-model indexing: a `Set`-backed membership index
   when the comparator is `Object.is`, and a `Map.has` fast path in `_autoShape`'s
   `findKey`. Both internal-only. *(M, S)*

10. **F-9** — wire `measureElement` into `KjTableVirtual` and decide how
    expansion rows participate; update the `@doc-example Virtualized` copy in the
    meantime. *(M)*

11. **F-14** — tree-select: derived visible-row set instead of per-row
    `isRowHidden`, hoisted `multiMode`, drop the defensive `Set` copy. *(M)*

12. **Consistency sweep** — **F-19** (copy the rAF RO into the chart wrapper),
    **F-15** (five call sites → `inject(KjReducedMotion)`), **F-18** (cached
    direction via the existing `KjDirectionality`), **F-17** (single measure per
    keystroke, cached metrics), **F-16** (opt-in tag observer), **F-20**
    (memoised `ngComponentOutlet` inputs). Each is small and independent; batch
    them into one PR. *(S)*

13. **F-4 tier 3 — the strategic item.** Extract a reusable virtual-scroll
    primitive from `KjTableVirtual` and design a data-driven option API for the
    list clusters. This is the only finding that requires a public-API decision,
    and it is the difference between "handles a few hundred options" and "handles
    a few thousand". Scope it as its own RFC.

## Open questions

1. **What is the supported scale?** The brief asked me to estimate 10 000 rows
   and 5 000 options; nothing in `CLAUDE.md`, `rules/*.md` or the component
   TSDoc states a target. Several findings (F-4, F-6, F-9, F-14) are severe at
   5 000 and invisible at 50. A documented ceiling — even "we support up to N,
   virtualize above it yourself" — would settle their real priority and belongs
   in the docs either way.

2. **Was `afterEveryRender` in `KjChart` (F-1) deliberate?** It has no explanatory
   comment, unlike almost everything else in that file. If it exists to catch
   theme-token changes that no signal reflects, the `MutationObserver` at
   `chart.ts:191` already covers that and the hook is redundant; if it guards
   something else, that case needs a test before it is removed.

3. **Is persisting `rowSelection` intentional (F-8)?** The
   `@doc-example Persistence` block promises "sort / filter / pinning /
   visibility / density" round-tripping and does not mention selection, but
   `KjTableState` includes it and the write effect serialises everything. Is
   restoring a selection across reloads a feature or an accident?

4. **Does `matchTriggerWidth` cause a ResizeObserver feedback loop in practice?**
   `anchored-to.ts:219-222` observes the panel, and `applyManual` (the observer's
   callback) writes `panel.style.width` / `minWidth` when
   `matchTriggerWidth !== 'none'`. The written value is derived from the trigger
   and should be stable, so it ought to settle after one extra pass — but it is
   exactly the shape that produces "ResizeObserver loop completed with undelivered
   notifications". Worth a console check with a `<kj-select>` on a resizing
   trigger before deciding whether F-3's fix needs to also stop observing the
   panel.

5. **What does the virtualized table actually do with `kjDensity="comfortable"`
   today (F-9)?** `kjEstimatedRowSize` defaults to `36`, which looks tuned for
   `compact`/`standard`. If comfortable rows are materially taller the default is
   wrong for that density and should at minimum be derived from it.

6. **Does the tree-select "all nodes in the DOM" rule (F-14) have a specific AT
   failure behind it?** The `@doc-a11y` block asserts the ARIA tree structure
   must stay stable across collapse/expand, but the ARIA Tree pattern permits
   removing collapsed descendants entirely. If there was a concrete
   NVDA/JAWS/VoiceOver bug driving the decision it should be recorded, because
   it is the main thing blocking tree virtualization.

---

## Changed since the 2026-09-06 review

Previous review: `reports/review/08-performance.md` at commit `9aee150a`, auditing
`fd6dd34e`. `main` has since advanced 8 commits. Every claim below was verified against the
code at HEAD.

### Fixed

**None.** `git diff --stat fd6dd34e..HEAD -- packages apps` touches overlay stacking
(`stack.ts`, `controller.ts`, `backdrop.ts`, `dismiss-press.ts`), list scoping
(`primitives/list/scope.ts`, `item.ts`), confirm-popup, and CSS/packaging. Not one of the 19
previous performance findings is addressed by that range, and each of the ones re-checked
below reproduces verbatim at HEAD.

One adjacent note, for accuracy rather than credit: `fb1d1956` added
`primitives/list/scope.ts` and changed `primitives/list/item.ts`, which is the same file as
prev F-7 / current F-4. The change is about *correctness* (scoping items to their own
container), not about the per-keystroke write pattern, which is unchanged.

### Still open

| prev | current | note |
| --- | --- | --- |
| prev F-1 — chat message runs `DomSanitizer.sanitize` per CD cycle | **F-10** | Same defect, re-derived independently. Prev high, this pass medium. |
| prev F-2 — every open anchored overlay forces two synchronous layouts per scroll event | **F-3** | Same code path (`anchored-to.ts`). **This pass downgrades it high → low** after verification: `matchTriggerWidth: 'fixed'` is dead in this library, the `'min'` write is byte-identical on every tick (browsers short-circuit it), and capture-phase is a correctness requirement. Both reviews independently overstated this one; the residual real issue is the missing rAF coalescing. |
| prev F-3 — table persistence writes `localStorage` synchronously on every row click | **F-8** | Unchanged. Prev high, this pass medium. |
| prev F-4 — selection model does linear key scans and per-item subtree recursion | **F-6** + **F-7** | Split across two findings by this pass (membership cost; auto-derived tree topology scan). |
| prev F-5 — table virtualization never measures a row | **F-9** | Unchanged; this pass adds that expansion rows are not accounted for either. |
| prev F-6 — virtualization exists only in the table | **F-4** | Unchanged, but **rescoped**: prev and this pass's first draft both claimed it hits select and tree-select. It does not — `grep -rln KjFilterableList` shows only combobox and command palette provide it. Prev was wrong about the blast radius in the same way this pass's first draft was. |
| prev F-7 — filter effect writes three signals per item per keystroke | **F-4** (merged) | Mechanism confirmed at `filterable-list.ts:107-124`; the *cost* framing is withdrawn — Angular drops `Object.is`-equal `signal.set`, so most writes are no-ops. |
| prev F-8 — table re-scans cell templates, fresh outlet context per cell | **F-13** | Unchanged. |
| prev F-9 — `KjTableRow.isSelectable` allocates the full selection key array per row | **F-6** / **F-13** | Absorbed into this pass's selection-cost and per-cell-template findings rather than filed separately. |
| prev F-10 — cascade-select sub-panel leaks window listeners, repositions unthrottled | **F-12** | Unchanged (`cascade-select-sub-panel.ts:121-125`). |
| prev F-11 — auto-resize textarea forces a style recalc plus two layouts per keystroke | **F-17** | Unchanged; prev medium, this pass low. |
| prev F-14 — one `MutationObserver` per `<kj-tag>`, with `subtree` and `characterData` | **F-16** | Unchanged; prev medium, this pass low. |
| prev F-17 — chat thread allocates a renderer input object per cycle, re-registers a render hook per token | **F-20** + **F-11** | Split: the per-cycle allocation is F-20, the per-token re-lex is F-11. |

### Not reproduced

Six previous findings have no counterpart in this pass. **All six were re-checked at HEAD and
all six are still true** — this is a scope/attention gap in the new audit, not evidence that
they were fixed or wrong. Five are re-filed below; the sixth is explained.

- **prev F-12 — a new `Intl.DateTimeFormat` per calendar day cell.** Still true:
  `date-utils.ts:144-145` (`formatMonthYear`), `:149-156` (`formatDateLong`) and `:158-165`
  (`formatDateShort`) each construct a fresh formatter per call, and
  `calendar-day.ts:76` calls `formatDateLong` per cell. Re-filed as **F-21**. *(Partial
  mitigation the previous review did not credit: `ariaLabel` is a `computed`, so the cost is
  per date/locale change, not per render.)*
- **prev F-13 — layout-property transitions and zero style containment.** Still true:
  `grep -rn "contain:" packages/components/src --include=*.css` → **0 matches**. Re-filed as
  **F-22**.
- **prev F-15 — zoneless is implicit and never exercised by the tests.** Still true:
  `grep -rn "provideZonelessChangeDetection"` across `packages` and `apps` → no matches, and
  `zone.js` is still a root dependency (`package.json:94`). Re-filed as **F-23** — and note
  it is load-bearing for this report: F-1's entire severity argument rests on "in a zoneless
  app that is every tick", which no test in the repo exercises.
- **prev F-16 — per-instance `document` listeners on `kj-tree-select-content`.** Still true,
  verbatim: `tree-select-content.ts:73-74` still carries
  `'(document:keydown.escape)'` and `'(document:click)'`. Re-filed as **F-24**.
- **prev F-18 — carousel observes only the initial slide set and leaves a timer running past
  destroy.** Half-true and worth re-filing precisely: `observeSlides()` is called from exactly
  one place (`carousel.ts:460`, a `queueMicrotask` in `ngOnInit`), so slides added later are
  never observed — **still true**. The *autoplay* interval **is** cleared on destroy
  (`clearTimer()` in `ngOnDestroy`, `:875-887`) — that half of prev's claim no longer holds, if
  it ever did. But the viewport's `settleTimer` (`:492`, `:510-511`) is never cleared on
  destroy (`ngOnDestroy` at `:464-468` only disconnects the observer and unregisters). Re-filed,
  corrected, as **F-25**.
- **prev F-19 — shipped example components are not `OnPush`.** Still true and larger than prev
  stated: 313 of 348 `*.example.ts` files under `packages/components/src/*/_examples/` carry no
  `ChangeDetectionStrategy.OnPush`. **Not re-filed as a finding** — examples are dev-only
  (absent from `public-api.ts` and from both `ng-package.json` files, reachable solely through
  the `@kouji-ui/*/examples` tsconfig aliases), so this is a docs-site cost and a
  bad-example-to-copy problem rather than a library performance defect. It belongs with the
  architecture report's example-hygiene findings, not here. Flagging it explicitly so it is not
  lost.

### New since then

- **F-1** — `KjChart` re-applies the full ECharts option on every CD cycle. No prev
  counterpart; the chart directive was not examined in the previous pass.
- **F-2** — rich-text does four full-document tree walks per update. No prev counterpart.
- **F-5** — `KjFocusRing` installs two document-level capture listeners per instance.
  Same *class* as prev F-16 (per-instance document listeners) but a different directive.
- **F-11** — streaming re-lexes the entire message on every token (split out of prev F-17).
- **F-14** — `<kj-tree-select>` renders the entire tree and calls `isRowHidden()` per row per
  render.
- **F-15** — five directives duplicate the root `KjReducedMotion` matchMedia subscription.
- **F-18** — `KjRovingTabindex` re-sorts with `compareDocumentPosition` and reads computed
  style on every arrow key.
- **F-19** — wrapper `<kj-chart>` resizes on every `ResizeObserver` entry, unlike the core
  directive.

### Re-filed from the previous review

Correct at `fd6dd34e`, still correct at HEAD, missed by this pass. Ids continue this report's
sequence.

#### F-21 A new `Intl.DateTimeFormat` is constructed per formatted date *(carried over from prev F-12)*

**Severity:** low · **Confidence:** high · **Effort:** S
**Files:** `packages/core/src/calendar/date-utils.ts:122,134,144-145,149-156,158-165,214`,
`packages/core/src/calendar/calendar-day.ts:76`

Every formatter helper constructs its `Intl.DateTimeFormat` inline, and `calendar-day.ts:76`
calls `formatDateLong` once per cell for the `aria-label` — 42 constructions per rendered
month, plus the weekday-header helpers. `Intl.DateTimeFormat` construction is the expensive
part of the Intl API; `format()` on a cached instance is cheap.

**Mitigation prev did not credit:** `ariaLabel` is a `computed`, so it recomputes on
date/locale change rather than on every render. The cost is per month navigation, not per CD
cycle — which is why this is low, not medium.

**Fix.** Memoise formatters by `(locale, optionsKey)` in a module-scope `Map` inside
`date-utils.ts`. Purely internal; no API change.

#### F-22 Zero style containment anywhere in the component stylesheets *(carried over from prev F-13)*

**Severity:** low · **Confidence:** medium · **Effort:** M
**Files:** `packages/components/src/**/*.css` (0 occurrences of `contain:`),
`packages/components/src/accordion/accordion.css:41-62`,
`packages/components/src/table/table.css:287-294`

`grep -rn "contain:" packages/components/src --include=*.css` returns **zero** matches, so no
component scopes its layout/paint work from the rest of the document. Combined with
transitions on layout properties (`max-height` on the accordion content, with the conventional
`1000px` "tall enough" ceiling), a single open/close animates layout for the whole subtree.

**Fix.** Add `contain: layout style` (or `content` where safe) to the self-contained surfaces —
overlay panels, table body, accordion content, carousel viewport. Replace the `max-height`
transition with `grid-template-rows: 0fr → 1fr` or `interpolate-size: allow-keywords`, both of
which avoid the magic ceiling. Confidence is medium because containment interacts with overlay
positioning and needs visual verification per component.

#### F-23 Zoneless is implicit and no test exercises it *(carried over from prev F-15)*

**Severity:** medium · **Confidence:** high · **Effort:** S
**Files:** `apps/docs/src/app/app.config.ts`, `package.json:94`, every `*.spec.ts`

`grep -rn "provideZonelessChangeDetection"` across `packages` and `apps` returns **no matches**,
and `zone.js` remains a root dependency. Nothing in the repo asserts that the library works
without Zone.js.

**Why this matters for this report specifically:** F-1's severity argument is "in a zoneless app
`afterEveryRender` fires on every tick". F-4's mitigation argument depends on signal-graph
invalidation semantics. Neither is exercised by a test. A zoneless test harness is the cheapest
way to make every timing claim in this document falsifiable.

**Fix.** Add `provideZonelessChangeDetection()` to the shared test providers (or a dedicated
zoneless spec project), and state the supported change-detection mode in the published README.

#### F-24 Per-instance `document` listeners on `kj-tree-select-content` *(carried over from prev F-16)*

**Severity:** low · **Confidence:** high · **Effort:** S
**Files:** `packages/core/src/tree-select/tree-select-content.ts:70-77`

Verbatim at HEAD:

```ts
  host: {
    '[attr.aria-multiselectable]': '…',
    '(keydown)': 'onKeydown($event)',
    '(document:keydown.escape)': 'controller?.close("esc")',
    '(document:click)': 'onDocClick($event)',
    '(click)': '$event.stopPropagation()',
  },
```

This is the only component in the repo using `(document:…)` host bindings. Everywhere else the
shared `KjOverlayStack` handles Escape and outside-click with **one** pair of listeners for the
whole application — and `stack.ts` was substantially reworked in `fd6dd34e..HEAD` (`2948c5b5`,
`e6aa28a5`) without this holdout being migrated. Each tree-select instance adds its own pair,
live for the component's whole lifetime including while the panel is closed, and each marks the
component dirty on every document click before `onDocClick`'s `isOpen()` guard bails.

**Fix.** Delete both `document:` bindings and let `KjOverlayStack` route Escape and
outside-click, as every other overlay consumer already does.

#### F-25 Carousel observes only the initial slide set, and the viewport settle timer outlives destroy *(carried over from prev F-18, corrected)*

**Severity:** low · **Confidence:** high · **Effort:** S
**Files:** `packages/core/src/carousel/carousel.ts:455-471,492,510-511,464-468`

Two separate issues, one of which prev got wrong:

- **Still true — only the initial slide set is observed.** `observeSlides()` (`:471`) has
  exactly one caller: a `queueMicrotask` in `ngOnInit` (`:460`). Slides registered after that
  microtask are never passed to `this.observer.observe(...)`, so a dynamically-added slide never
  updates `currentValue`.
- **Still true — the settle timer is not cleared on destroy.** `settleTimer` (`:492`) is set at
  `:510-511` with a 
  `setTimeout`, and `ngOnDestroy` (`:464-468`) disconnects the observer and unregisters the
  viewport but never calls `clearTimeout(this.settleTimer)`. The callback then runs against a
  destroyed component and writes `this.carousel.kjValue.set(value)`.
- **Corrected — the autoplay interval *is* cleaned up.** Prev's "leaves a timer running past
  destroy" reads as if the autoplay `setInterval` leaks. It does not: `KjCarouselAutoplay`
  clears it in `ngOnDestroy` via `clearTimer()` (`:875-887`).

**Fix.** Call `observeSlides()` from `registerSlide()` (guarding for a null observer), and clear
`settleTimer` in the viewport's `ngOnDestroy`.
