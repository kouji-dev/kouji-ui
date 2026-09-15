# Accessibility Review

> **Adversarially verified 2026-09-15.** Findings below marked *(severity corrected during verification)* were re-checked against the source; corrections are inline. Refuted findings are preserved in **Refuted during verification** at the end of the findings list, not deleted.

Scope: `packages/core/src/a11y/*`, `packages/core/src/primitives/*`, every interactive widget in `packages/core` + `packages/components`, `packages/themes`, plus reconciliation with the prior automated scan in `reports/a11y/`.
Method: static reading only (no builds, no test runs, no browser). Every finding cites `file:line` with the real code.

## Verdict

kouji-ui has an unusually **thoughtful a11y vocabulary** — a selection model that drives `aria-selected`/`aria-checked`, `aria-posinset`/`aria-setsize` stamping, an overlay stack that routes Escape to only the topmost layer, a reduced-motion signal, a focus-mode-aware list navigator, a genuinely complete slider and color-picker. But the **primitives are better than the assembly**: several widgets compose the right pieces and never connect the last wire, and the result is that some flagship components are *not operable by keyboard at all*. The three worst are select / cascade-select (the listbox panel owns the keyboard contract but never receives focus, and it is portalled to `<body>` so trigger keystrokes cannot even bubble to it), the data table (every cell is `tabindex="-1"` and nothing holds the grid's tab stop, so the whole `KjTableKeyboardNav` implementation is unreachable), and the tooltip (hover-only trigger, no `aria-describedby` — invisible to both keyboard and screen-reader users, while the docblock claims the opposite). A secondary claim originally made here was **refuted during verification**: `aria-modal="true"` on dialog/drawer/sheet/command-palette is backed by a real pointer-blocking backdrop, a working `tabCycle` Tab trap, topmost-only Escape routing and a scroll lock — the APG modal pattern — so the absent `inert` attribute is documentation drift (five docblocks claim it), not a conformance failure. Several docblocks assert behaviour the code does not implement, which is the most dangerous pattern here: consumers will trust `@doc-a11y` and ship inaccessible apps. AAA-specific items (7:1 contrast, 44px default targets, reduced motion in component CSS, timeouts) are inconsistently honoured — the team clearly knows the criteria (comments cite them by number) but enforcement stops at the components that got explicit attention.

**Grade: D+**

*Post-verification: F-1 upheld at critical (scope refined — Escape and open-from-trigger still work; everything after opening is dead). F-2 **refuted** and re-filed as a low doc-accuracy fix. One critical finding remains in this dimension.* — strong intent and strong primitives, undermined by broken keyboard paths in three high-traffic widgets, and documentation that overstates conformance. Recoverable: most fixes are small and local, and the primitives needed already exist in the repo.

## What works

- **Selection / ARIA state plumbing is genuinely good.** `packages/core/src/primitives/list/item.ts:39-43` binds `aria-selected`, `aria-checked` (tri-state `mixed` for cascade), `aria-posinset`, `aria-setsize`, `aria-keyshortcuts` — all *bound*, none static, all derived from the shared `KjSelectionModel`.
- **Slider is APG-complete.** `packages/core/src/slider/slider-thumb.ts:51-68` binds `role="slider"`, `aria-valuemin/max/now/text`, `aria-orientation`, `aria-readonly`; `onKeydown` covers Arrow/Page/Home/End plus RTL sign flipping and **Escape-to-cancel-drag**, and `slider-track.ts:34` gives a click-to-position alternative so the control is not drag-only.
- **Color picker** (`packages/core/src/color-picker/color-picker.ts:470-483`) models the saturation/value area as a real `role="slider"` with keyboard stepping and `aria-valuetext` — better than most commercial libraries.
- **Accordion content** does the hard thing correctly: `aria-hidden` **and** `inert` on the collapsed panel (`packages/core/src/accordion/accordion.ts:394-395`) plus a `prefers-reduced-motion` guard in `packages/components/src/accordion/accordion.css:65-67`.
- **Toast** has pause-on-hover/focus with ref-counted depth, an F6 entry hotkey, Escape dismissal and focus restore (`packages/core/src/toast/toast.ts:175-190, 299-390`) — more than Radix or Material ship.
- **Icon defaults to decorative**: `aria-hidden="true"` unless `kjIconLabel` is given, which then swaps in `role="img"` + `aria-label` (`packages/core/src/icon/icon.directive.ts:70-72`).
- **Field** auto-mints ids and maintains a real `aria-describedby` chain with help/error precedence (`packages/core/src/field/field-error.ts:33-59`, `field-help.ts:44`).
- **Overlay stack** correctly routes Escape and outside-pointer to the topmost overlay only (`packages/core/src/primitives/overlay/stack.ts:99-112`).
- **Reduced motion exists as a first-class signal** (`packages/core/src/motion/reduced-motion.ts`) and `motion.css:82-89` degrades to a 1ms fade.
- No positive `tabindex` anywhere in `packages/core` or `packages/components` (verified by grep).

## Findings

### F-1 Select and cascade-select listboxes are not keyboard operable

**Severity:** critical *(upheld during verification)* · **Confidence:** high · **Effort:** M
**Files:** `packages/core/src/select/select-content.ts:30-40`, `packages/core/src/select/select-trigger.ts:49-63`, `packages/components/src/select/select.ts:80-86`, `packages/core/src/cascade-select/cascade-select-panel.ts:38-60`

The keyboard contract lives on the **panel** (`KjListNavigator` composed onto `kj-select-content`), but nothing ever moves DOM focus into the panel, and the panel is portalled into `<body>`:

```ts
// select-content.ts
hostDirectives: [
  { directive: KjOverlayPanel, inputs: ['kjFor'] },
  KjListNavigator,                       // <- (keydown) host listener lives here
],
providers: [
  { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'listbox' as const },
  { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },   // <- moved to <body>
  ...
]
// NOTE: no KJ_OVERLAY_FOCUS_TRAP_STRATEGY provider anywhere in the select cluster
```

`KjOverlayController.beginOpen()` calls `s.focusTrap?.focusFirst()` (`controller.ts:126`) — `focusTrap` is `null` for select, so focus stays on the trigger `<button>`. Keydown from the trigger bubbles up the *trigger's* ancestor chain; the panel is a child of `<body>`, so it never sees the event. Result: after opening a select, **ArrowDown / ArrowUp / Home / End / Enter / type-ahead all do nothing**. The same holds for cascade-select, whose panel even declares `'tabindex': '-1'` (`cascade-select-panel.ts:55`) but is never `.focus()`ed — `grep '\.focus()'` over both clusters returns only `KjSelect.focus()`, which focuses the *trigger*.

Secondarily, `aria-activedescendant` is bound on the panel (`navigator.ts:42`) — an element that never holds focus, which is invalid per ARIA (the attribute must be on the focused element).

The only keyboard test dispatches the event straight at the panel (`select.spec.ts:134: panel.dispatchEvent(new KeyboardEvent('keydown', …))`), which is why this passes CI.

**Why it matters:** SC 2.1.1 Keyboard (A) — a core form control cannot be operated without a mouse. SC 4.1.2 Name, Role, Value (A) — `aria-activedescendant` on an unfocused element conveys no state to AT.

**Fix:** either (a) provide a focus strategy so the panel takes focus on open (cascade's panel already has `tabindex="-1"`; **select's `KjSelectContent` declares no `tabindex` at all**, so it needs one added before a programmatic `focus()` would even work) per APG listbox-popup, or (b) keep focus on the trigger, move `KjListNavigator` onto the **trigger** (as the combobox already does at `combobox-input.ts:50`) and bind `aria-activedescendant` there. Option (b) matches APG's select-only combobox and is the smaller change. The in-repo precedent for (a) is `dropdown-menu-content.ts:137,150` and `tree-select-content.ts:32,64`, which pin `kjFocusMode` to `'roving'` and get DOM focus-follow from `navigator.ts:105-111`. Either way, restore focus to the trigger on close.

**Verification notes (finding upheld at critical; every cited fact reproduced).**
- No `KJ_OVERLAY_FOCUS_TRAP_STRATEGY` is provided anywhere in the select or cascade-select cluster — repo-wide it exists only in `command-palette-dialog.ts`, `date-picker-calendar.ts` and `popover-content.ts`. `tokens.ts:50` declares the token with no factory and `panel.ts:70` injects it optional, so `controller.ts:126`'s `s.focusTrap?.focusFirst()` is a verified no-op.
- Options are not an alternative focus target: `item.ts:127-132` returns `tabindex="-1"` for every item unless `kjFocusMode` is `'roving'`, and both panels pin `'activedescendant'`.
- **Scope refinement — not literally every key is dead.** Escape still closes, because `KjOverlayStack.ensureListeners()` (`stack.ts:82`) installs a capture-phase `keydown` listener on `document` independent of focus, and opening works because the trigger is a native `<button>` (Enter/Space fire `click`). The accurate statement is: **everything after opening is dead** — ArrowUp/Down, Home/End, PageUp/Down, Enter/Space activation, type-ahead and cascade's ArrowRight — while Escape and open-from-trigger still work.
- **The docs are currently untrue.** The `@doc-keyboard` blocks at `components/src/select/select.ts:12-19` and `components/src/cascade-select/cascade-select.ts:48-61` advertise the full APG contract. `select.spec.ts:134` gives false confidence by dispatching `keydown` directly on the panel; `components/src/select/select.spec.ts` and `cascade-select.spec.ts` contain no keydown or focus assertions, and no e2e spec exercises select keyboard. The regression test must dispatch from `document.activeElement` after a real trigger click.

### F-2 Five TSDoc blocks claim modal content is marked `inert`; nothing ever sets the attribute

**Severity:** low *(corrected during verification: the original critical a11y finding was **refuted** — see "Refuted during verification"; this is the residual doc-accuracy issue)* · **Confidence:** high · **Effort:** S
**Files:** `packages/components/src/dialog/dialog.ts:33-35`, `packages/components/src/drawer/drawer.ts:67`, `packages/components/src/sheet/sheet.ts:67`, `packages/components/src/action-sheet/action-sheet.ts:116`, `packages/components/src/command-palette/command-palette.ts:124`

`inertBased()` (`strategies/focus-trap/inert-based.ts:20-22`) is the only code in the repo that sets the DOM `inert` attribute, and no service wires it — dialog/drawer/sheet all pass `focusTrap: tabCycle(...)`. But five docblocks tell consumers otherwise, e.g. *"Siblings outside the dialog are marked `inert` while it is open, so assistive tech sees only the dialog tree"* (`dialog.ts:31-35`).

**This is documentation drift, not a WCAG failure** — see the refuted entry for why. The correct wording is that outside content is excluded via `aria-modal="true"` plus a pointer-blocking backdrop and a Tab focus trap, not via the `inert` attribute.

**Optional hardening (not a conformance requirement).** AT support for `aria-modal` is imperfect on some older screen-reader/browser pairs, so a belt-and-braces layer applying `inert` (or `aria-hidden`) to the **application root** — every `<body>` child other than `.kj-overlay-container` — while a modal overlay is open would be an improvement. It must be a **new** mechanism, not `inertBased()`: that function only walks `panel.parentElement.children`, which for service-launched overlays is the per-overlay wrapper containing just `<kj-backdrop>`, so it would inert the backdrop and nothing else. It also must not displace `tabCycle` in the single `focusTrap` slot; it belongs on the backdrop strategy's currently-empty `onOpen`/`onClose` (`solid.ts:18-21`) or as a separate overlay-stack-level concern.

**Fix:** correct the five docblocks. Treat the hardening layer as a separate, optional item.

### F-3 Tooltips never open on keyboard focus and are not referenced by `aria-describedby`

**Severity:** high · **Confidence:** high · **Effort:** S
**Files:** `packages/core/src/tooltip/tooltip-trigger.ts:18-25`, `packages/core/src/primitives/overlay/strategies/trigger-event/on-hover.ts` (0 occurrences of `focus`), `packages/core/src/tooltip/tooltip-content.ts`

```ts
providers: [
  KjOverlayController,
  { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => onHover({ openDelay: 200, closeDelay: 0 }) },
  { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'tooltip' as const },
],
```

`onHover` binds only `pointerenter` / `pointerleave` (`on-hover.ts:91-117`); `grep -c focus on-hover.ts` → `0`. And `grep -rn aria-describedby packages/core/src/tooltip packages/core/src/primitives/overlay` → no matches; the trigger instead gets `aria-expanded` + `aria-controls` from `KjOverlayTrigger` (`trigger.ts:27-30`), which is wrong markup for a tooltip (a tooltip is not an expandable region).

The shipped documentation claims both behaviours exist — `packages/components/src/tooltip/tooltip.ts:56` *"Tab — Moves focus onto the trigger; opens the tooltip (no delay on focus)"* and `:62` *"aria-describedby — wired from the trigger to the content's id while open"*.

**Why it matters:** SC 2.1.1 (A) — tooltip content is unreachable without a pointer. SC 1.4.13 Content on Hover or Focus (AA) — the criterion presumes focus parity. SC 4.1.2 (A) — the tooltip text is never associated with its trigger, so screen readers announce nothing.
**Fix:** compose hover + focus trigger strategies (`strategies/trigger-event/compose.ts` and `on-focus.ts` already exist), and bind `[attr.aria-describedby]="isOpen() ? panelId() : null"` on the trigger for `role="tooltip"` panels while suppressing `aria-expanded` for that role.

### F-4 Data-grid keyboard navigation can never be entered

**Severity:** high · **Confidence:** high · **Effort:** S
**Files:** `packages/core/src/table/table-cell.ts:7-15`, `packages/core/src/table/table-keyboard.ts:25-32`, `packages/components/src/table/table.ts:332,391,455,526`

Every rendered cell is hard-coded to `tabindex="-1"`:

```html
<td kjTableCell [kjCell]="c" tabindex="-1" …>
```

and `KjTableCell` itself binds no tabindex (`role: 'gridcell'` + `aria-colindex` + `data-pin` only). `KjTableKeyboardNav.onKeyDown` bails on the first line unless the event already originated inside a cell:

```ts
const startEl = (event.target as HTMLElement).closest<HTMLElement>('[kjTableCell]');
if (!startEl) return;
```

Since no cell ever holds `tabindex="0"`, keyboard focus can never land in the grid body (only the sortable `<th>`s are reachable, via `table-header.ts:23`). The entire Arrow / Home / End / Ctrl+Home / PageUp / PageDown implementation is unreachable.

**Why it matters:** SC 2.1.1 (A) — grid content, row selection and inline editing are mouse-only.
**Fix:** make the grid a roving-tabindex composite — exactly one cell holds `tabindex="0"` (last-focused, defaulting to the first data cell), the rest `-1`; bind it from `KjTableCell` rather than the template so consumers cannot break the invariant.

### F-5 Column resizing is drag-only, with no keyboard path

**Severity:** high · **Confidence:** high · **Effort:** M
**Files:** `packages/components/src/table/table.ts:277-285`

```html
<span
  class="kj-table-resize-handle"
  role="separator"
  aria-orientation="vertical"
  aria-label="Resize column"
  (mousedown)="h.getResizeHandler()($event)"
  (touchstart)="h.getResizeHandler()($event)"
></span>
```

No `tabindex`, no `keydown`, no `aria-valuenow/min/max`. The only way to resize is a pointer drag along a path.

**Why it matters:** SC 2.1.1 (A) — functionality unavailable from the keyboard. SC 2.5.1 Pointer Gestures (A) — a path-based drag with no single-pointer alternative. (Also SC 2.5.7 Dragging Movements in WCAG 2.2.)
**Fix:** make the handle a focusable `role="separator"` with `tabindex="0"`, `aria-valuenow/min/max` (column width), ArrowLeft/ArrowRight ±1 step, Shift+Arrow ±10, Home/End for min/max, Enter/Escape to commit/cancel, and `aria-valuetext` for the announced width.

### F-6 `KjRovingTabindex` loses the tab stop and cannot be pointed at the selected item

**Severity:** high · **Confidence:** high · **Effort:** M
**Files:** `packages/core/src/a11y/roving-tabindex.ts:94,102-104,117-122`

```ts
private readonly activeIndex = signal(0);            // private, no setter, no public API
…
unregister(item) { this.registered.update(all => all.filter(i => i !== item)); }
…
effect(() => {
  const all = this.items();
  all.forEach((item, i) => item.active.set(i === this.activeIndex()));   // -> tabindex 0 / -1
});
```

Two distinct defects:

1. **Stale index after removal.** Close the *last* tab while it is active (`KjTab` ships `kjClosable` + Delete, `tabs.ts:302-307`): `activeIndex` stays at `N-1` while `items().length` drops to `N-1`, so no item satisfies `i === activeIndex()` and **every** item renders `tabindex="-1"`. The composite drops out of the tab sequence entirely, and the focused element was just removed so focus falls to `<body>`.
2. **No way to seed the active item.** `activeIndex` starts at `0` and only changes via `focusin` / arrow keys. A tab strip whose selected tab is the 3rd still puts the tab stop on the 1st tab, contradicting the APG tabs pattern (the *selected* tab is the one in the tab sequence). Same for `KjStepper`, `KjList`, `KjCarouselIndicators`, `KjDateRangePresets`.

`roving-tabindex.spec.ts` covers neither case (13 tests, all about arrow direction/orientation/RTL).

**Why it matters:** (1) SC 2.1.1 (A) — the widget becomes unreachable by Tab; SC 2.4.3 Focus Order (A) — focus is lost to `<body>` on DOM removal. (2) SC 2.4.3 / APG deviation.
**Fix:** clamp in the effect (`Math.min(activeIndex(), all.length - 1)`) and move focus to the clamped neighbour when the active item is destroyed; expose `setActiveItem(item)` publicly and have `KjTab` / `KjStep` / indicators sync it to the selected value.

### F-7 Calendar: `role="application"` root, inverted grid structure, natively `disabled` day cells

**Severity:** high · **Confidence:** high · **Effort:** M
**Files:** `packages/core/src/calendar/calendar.ts:69-73`, `packages/core/src/calendar/calendar-day.ts:36-45`, `packages/core/src/calendar/calendar-grid.ts:24`, `packages/components/src/calendar/calendar.ts:111-137`

```ts
// calendar.ts root
host: { 'role': 'application', 'aria-roledescription': 'calendar', … }
```
```ts
// calendar-day.ts — the role lands on the <button>, not on the <td>
host: { 'role': 'gridcell', 'type': 'button', …, '[attr.disabled]': 'isDisabled() ? "" : null' }
```
```html
<!-- components/calendar template -->
<table class="kj-calendar__grid" kjCalendarGrid>   <!-- role="grid" from calendar-grid.ts:24 -->
  <tr><td class="kj-calendar__cell"><button kjCalendarDay …></button></td></tr>
```

Three problems: (a) `role="application"` switches screen readers out of browse mode for the whole calendar — an APG last resort, unnecessary here because `grid` already owns the arrow keys; (b) the accessibility tree becomes `grid > row > cell > gridcell` — `gridcell` is not a permitted child of `cell`, and putting it on the `<button>` also *erases* the button role from the day control (axe `aria-required-parent`); (c) `[attr.disabled]` on the day `<button>` makes disabled dates unfocusable, so if `focusedDate()` resolves to a disabled date the grid's single tab stop cannot be reached.

**Why it matters:** SC 1.3.1 Info and Relationships (A), SC 4.1.2 Name, Role, Value (A), SC 2.1.1 (A) for the unreachable tab stop.
**Fix:** drop `role="application"` (keep `aria-roledescription`); put `role="gridcell"` on the `<td>` with the `<button>` as its only child (APG datepicker); replace native `disabled` with `aria-disabled="true"` + a click guard so disabled dates stay focusable and announced.

### F-8 `tabCycle` trap leaks: hidden elements count, and focus outside the panel is never recaptured

**Severity:** high · **Confidence:** high · **Effort:** S
**Files:** `packages/core/src/primitives/overlay/strategies/focus-trap/tab-cycle.ts:136,159-182,196-209`

```ts
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), …, [tabindex]:not([tabindex="-1"])';
const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));   // no visibility filter
…
keyListener = (e) => {
  if (e.key !== 'Tab') return;
  const els = focusables();
  if (els.length === 0) return;                       // <- Tab escapes the modal
  …
};
panel.addEventListener('keydown', keyListener);       // <- only fires while focus is INSIDE the panel
```

Three holes: (a) no `display:none` / `[hidden]` / `visibility` filter, so a collapsed accordion or hidden step inside the dialog can become the "first"/"last" focusable and `.focus()` silently no-ops, dumping focus on `<body>` (`KjFocusTrap` at `a11y/focus-trap.ts:45` *does* filter — the two implementations disagree); (b) when the panel has no focusables, `focusFirst()` focuses the panel itself at `tabindex="-1"` (good) but that element is not in `focusables()`, so `els.length === 0` returns early and Tab walks straight into the page behind the dialog — which F-2 has left fully interactive while `aria-modal="true"` hides it from AT; (c) the listener is on the panel, so once focus is outside for any reason it can never be pulled back.

**Why it matters:** SC 2.4.3 Focus Order (A) — focus leaves a modal into content the screen reader cannot see.
**Fix:** filter `focusables()` by visibility, treat the panel itself as the fallback stop when the list is empty, and attach the keydown listener on `document` (gated on `stack.isTopmost`) so out-of-panel focus is recaptured.

### F-9 `KjFocusTrap` (the documented public primitive) sets no initial focus and restores none

**Severity:** medium · **Confidence:** high · **Effort:** S
**Files:** `packages/core/src/a11y/focus-trap.ts:5-9,37-71`

The primitive `rules/accessibility.md` advertises as "Trap focus in container" only intercepts Tab. It never focuses anything on enable (`focusFirst()` exists at `:68` but nothing calls it), never records or restores the previously focused element, and installs its handler on `document` unconditionally — so two enabled traps on the page both act on every Tab. Its `FOCUSABLE` list also omits `[contenteditable]` without `="true"`, `audio[controls]`, `video[controls]`, `iframe`, `details/summary`, and it does not sort by tabindex.

**Why it matters:** SC 2.4.3 Focus Order (A) — opening and closing an overlay built on this primitive strands focus on `<body>`.
**Fix:** on enable → store `document.activeElement` and call `focusFirst()`; on disable/destroy → restore. Consolidate the four different "focusable" queries in the repo (`a11y/focus-trap.ts:5`, `tab-cycle.ts:136`, `inert-based.ts:61`, `toast.ts:306`) into one helper.

### F-10 `prefers-reduced-motion` is ignored by most component CSS

**Severity:** medium · **Confidence:** high · **Effort:** M
**Files:** `packages/components/src/toast/toast.css:75`, `packages/components/src/button/button.css:63-65,216`, `packages/components/src/tabs/tabs.css:69-84`, `packages/components/src/table/table.css:432`, `packages/components/src/stepper/stepper.css`, `packages/components/src/tag/tag.css`, `+ ~18 more`

`motion.css:82-89` guards only the opt-in `.kj-motion` class, and there is no global guard in `packages/themes/src/base.css` (grep for `prefers-reduced-motion` in `packages/themes` → no matches). Of the ~50 component stylesheets declaring `animation:`/`transition:`, only 20 contain a `prefers-reduced-motion` block. Unguarded examples with real movement:

```css
/* toast.css:75 */   animation: kj-toast-enter 0.35s cubic-bezier(0.21, 0.61, 0.35, 1);
/*                   keyframes: translateY(100%) scale(0.95) -> none */
/* button.css:216 */ transform: translateY(var(--kj-button-hover-translate, var(--kj-hover-translate, -2px)));
/* table.css:432 */  animation: kj-table-loading-pulse 1.4s ease-in-out infinite;
```

`KjReducedMotion` exists but is consumed by only four components (`spinner.ts`, `skeleton.ts`, `sheet.ts`, `progress-bar.ts`).

**Why it matters:** SC 2.3.3 Animation from Interactions (AAA) — the stated target. The infinite `kj-table-loading-pulse` also brushes SC 2.2.2 Pause, Stop, Hide (A) for moving content running longer than 5s.
**Fix:** add one shared guard in `packages/themes/src/base.css` (`@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }`), then keep per-component blocks only where a bespoke fallback is wanted. Already tracked in the team's own post-merge notes ("reuse KjReducedMotion everywhere").

### F-11 Focus indicator removed with no accessible replacement

**Severity:** medium · **Confidence:** high · **Effort:** S
**Files:** `packages/components/src/command-palette/command-palette.css:75,96`, `packages/components/src/time-picker/time-picker.css:75-77`, `packages/components/src/rich-text/rich-text-editor.css:213`

```css
/* command-palette.css — and no :focus / :focus-visible / :focus-within rule anywhere in the file */
.kj-command-palette__input { border: none; outline: none; … }
/* time-picker.css */
.kj-time-picker__segment:focus { outline: none; background: color-mix(in oklab, var(--kj-bg-primary) 12%, transparent); }
/* rich-text-editor.css — compensated only by a border-color change on the wrapper (:42-45) */
.kj-rte__content { outline: none; … }
```

A 12%-opacity tint cannot reach the 3:1 non-text contrast needed to read as a focus indicator, and the time-picker segment is the *only* focus target while editing hours/minutes.

**Why it matters:** SC 2.4.7 Focus Visible (AA), SC 1.4.11 Non-text Contrast (AA); against the AAA target, SC 2.4.13 Focus Appearance requires a ≥2px perimeter at ≥3:1 against both adjacent colours.
**Fix:** restore a 2px `outline`/`box-shadow` ring (`var(--kj-border-focus)`) with `outline-offset` on all three; for AAA, audit each theme's `--kj-border-focus` against both the control fill and the page background (e.g. `light.css:82` is `#1a1a1a`).

### F-12 RTL is not honoured outside slider and avatar-group

**Severity:** medium · **Confidence:** medium · **Effort:** M
**Files:** `packages/core/src/primitives/directionality/directionality.ts` (consumers: `slider.ts`, `avatar-group.ts` only), `packages/core/src/primitives/list/navigator.ts:194-203`, `packages/core/src/calendar/calendar-grid.ts:54-59`, `packages/core/src/a11y/roving-tabindex.ts:124-136`

`KjListNavigator` maps ArrowRight → `moveBy(+1)` unconditionally; `KjCalendarGrid` maps ArrowLeft → previous day unconditionally. Only `KjRovingTabindex` flips, and it does so with a bespoke `getComputedStyle` + `closest('[dir]')` helper rather than the `KjDirectionality` primitive — so the repo has two directionality mechanisms and neither is used by the list / menu / calendar clusters.

**Why it matters:** SC 1.3.2 Meaningful Sequence (A) / SC 2.4.3 Focus Order (A) — in an RTL locale the arrow keys move focus opposite to the visual order (menubar, cascade-select sub-panels, calendar, horizontal listboxes).
**Fix:** inject `KjDirectionality` in `KjListNavigator`, `KjCalendarGrid`, `KjMenubar` and `KjCarousel`; reduce `KjRovingTabindex.resolveRtl()` to a call into the same primitive. Confidence on user impact is *medium* — I did not run an RTL page — but the code paths take no direction input at all.

### F-13 Built-in UI/ARIA strings are hard-coded English despite an i18n package

**Severity:** medium · **Confidence:** high · **Effort:** M
**Files:** `packages/components/src/calendar/calendar.ts:99,107`, `packages/components/src/table/table.ts:282`, `packages/core/src/file-upload/file-upload.ts:258-319` + dropzone `kjLabel` default, `packages/core/src/color-picker/color-picker.ts:472,573,614,657`, `packages/components/src/chat/prompt-input.ts:87,96`

```html
<button … aria-label="Previous month">               <!-- calendar -->
<span role="separator" aria-label="Resize column">   <!-- table -->
```
```ts
this.announce(`${target.file.name} removed`);         // file-upload
'[attr.aria-label]': '"Color saturation and value"',  // color-picker
```

`packages/core/src/i18n` exists and `KjToastClose` already resolves its label through it (`toast.ts:424-453`), so the pattern is established but not applied.

**Why it matters:** SC 3.1.2 Language of Parts (AA) — an English accessible name inside a French page is read with French phonemes and is unintelligible; it also diverges from the consumer's localised visible label (SC 2.5.3 Label in Name).
**Fix:** route every default label and every `announce()` string through the i18n token bundle (same mechanism as `'toast.close'`), keeping English as the fallback.

### F-14 Overlays dismiss on `pointerdown`, not on the up-event

**Severity:** medium · **Confidence:** high · **Effort:** S
**Files:** `packages/core/src/primitives/overlay/stack.ts:83,106-112`

```ts
document.addEventListener('pointerdown', this._onPointerDown, true);
…
private handlePointerDown(e: PointerEvent): void {
  const top = this.topmost();
  if (!top || !top.opts.closeOnOutside) return;
  …
  top.opts.onClose();
}
```

A user who presses outside an open select / date-picker / dialog cannot abort by moving back onto the panel before releasing.

**Why it matters:** SC 2.5.2 Pointer Cancellation (A) — the function executes on the down-event with no abort or undo.
**Fix:** record the pointerdown target and close on the matching `pointerup`/`click` only when both down and up landed outside the panel (this also stops a text selection that starts inside the panel from dismissing it).

### F-15 Default control size is below the AAA touch target, and the docs claim otherwise

**Severity:** medium · **Confidence:** high · **Effort:** M
**Files:** `packages/components/src/button/button.css:164-186,249-256`, `packages/components/src/button/button.ts:28-30`

```css
&[data-size='sm'] { --kj-button-height: var(--kj-ctl-h-sm); }  /* 32px */
&[data-size='md'] { --kj-button-height: var(--kj-ctl-h-md); }  /* 36px  <- DEFAULT */
&[data-size='lg'] { --kj-button-height: var(--kj-ctl-h-lg); }  /* 44px (AAA touch target) */
/* Only data-size='icon' gets min-width/min-height: 2.75rem */
```
against the docblock: *"`sm`, `md`, `lg` — `md` is the default. `sm` keeps a 44px touch target via padding so it stays WCAG 2.5.5 compliant."* — `sm` is 32px tall with `padding-y: 0.25rem`; nothing brings it to 44px. The CSS comment at `:251-252` invokes an "equivalent-inline exception", which applies to targets inside a sentence of text, not standalone buttons.

**Why it matters:** SC 2.5.5 Target Size (AAA) — the stated project target; every default-size button fails, as do `xs` (28px) and `sm` (32px).
**Fix:** either raise `--kj-ctl-h-md` to 44px at default density (keeping smaller heights for the compact density mode, and say so in the docs), or add an invisible `::after` hit-area expansion to 44×44 for all sizes (the slider already does this via `--kj-slider-thumb-hit`). Correct the docblock now regardless.

### F-16 An open accordion panel is clipped at 1000px

**Severity:** medium · **Confidence:** high · **Effort:** S
**Files:** `packages/components/src/accordion/accordion.css:42-63`

```css
.kj-accordion-content { overflow: hidden; max-height: 0; … }
.kj-accordion-content[data-state="open"] { max-height: 1000px; … }
```

Content taller than 1000px — easily reached at 200% zoom or with an enlarged font — is clipped with no scrollbar (`overflow: hidden`), and the clipped region is unreachable.

**Why it matters:** SC 1.4.4 Resize Text (AA) and SC 1.4.10 Reflow (AA) — content is lost when text is enlarged.
**Fix:** animate `grid-template-rows: 0fr → 1fr` (or `interpolate-size: allow-keywords` / `calc-size(auto)`), and drop `overflow: hidden` once open.

### F-17 No status announcements for filtering, sorting or pagination

**Severity:** medium · **Confidence:** medium · **Effort:** M
**Files:** `packages/core/src/combobox/combobox-root.ts`, `packages/core/src/primitives/list/filterable-list.ts`, `packages/core/src/table/table.ts`, `packages/components/src/pagination/pagination.ts`

`grep -rln 'announce('` over both packages returns only carousel, chat, file-upload, input-otp, rich-text and the overlay live-announcer strategies. Combobox / command-palette announce *empty* results via `role="status"` (`packages/components/src/combobox/combobox.ts:179-180,210-211`) but never the non-zero count ("6 results available"), never the loading→loaded transition (`aria-busy` is bound on the input at `combobox-input.ts:63`, but `aria-busy` alone is not an announcement), and the table never announces a sort change or a page change.

**Why it matters:** SC 4.1.3 Status Messages (AA) — a screen-reader user typing in a combobox gets no feedback that the option list changed until they arrow into it.
**Fix:** reuse the existing helper (`strategies/live-announcer/_announce.ts`) — debounced result counts for `KjFilterableList`, "Sorted by Name ascending" on sort toggle, "Page 3 of 12" on page change.

### F-18 `KjTypeAhead` does not implement the APG same-letter cycle

**Severity:** low · **Confidence:** high · **Effort:** S
**Files:** `packages/core/src/primitives/list/type-ahead.ts:27-39`, `packages/core/src/primitives/list/navigator.ts:228-246`

```ts
const hit = items.find(i => !i.disabled() && i.label().toLowerCase().startsWith(needle));
```

The search always starts at index 0, never at the item after the active one, so pressing "a" repeatedly re-selects the same first "A…" item instead of cycling (APG: *"if the same character is typed in succession, focus moves to each item starting with that character in turn"*). Space is also consumed by `case ' '` in the navigator before it can extend a multi-word buffer ("New " + "York").

**Why it matters:** APG listbox/menu deviation — a keyboard-efficiency gap rather than a hard SC failure (2.1.1 is still met).
**Fix:** pass the active id into `match()`, scan from `activeIndex + 1` with wraparound, special-case a repeated single character, and append Space to a non-empty buffer when the target is not a text field.

### F-19 Tab panels have no tab stop; sortable headers have no interactive role

**Severity:** low · **Confidence:** high · **Effort:** S
**Files:** `packages/core/src/tabs/tabs.ts:331-336`, `packages/core/src/table/table-header.ts:21-28`

`KjTabPanel` binds `role`, `id`, `aria-labelledby`, `hidden` — but no `tabindex="0"`, so a panel whose content has no focusable element cannot be reached or scrolled by keyboard (APG explicitly calls for `tabindex="0"` in that case). `KjTableHeader` puts `tabindex="0"` + click/Enter/Space on the `<th>` itself, leaving the accessible role as `columnheader` with nothing conveying that it is operable.

**Why it matters:** SC 2.1.1 (A) for scroll-only panels; SC 4.1.2 (A) for the header — the role does not convey that the control is actionable.
**Fix:** bind `[attr.tabindex]="isActive() ? '0' : null"` on `KjTabPanel`; in the table, move the handler onto a `<button>` inside the `<th>` (keeping `aria-sort` on the `<th>`).

### F-20 Toast auto-dismiss is 4s with no user-adjustable timing

**Severity:** low · **Confidence:** high · **Effort:** S
**Files:** `packages/core/src/toast/toast.strategy.ts:45,60`, `packages/core/src/toast/toast.service.ts:269-297`

```ts
duration: 4000,   // default strategy
duration: 5000,   // plain list strategy
```

Pause-on-hover/focus and the F6 hotkey mitigate this well (`toast.ts:280-296`), but a screen-reader user who is not hovering has four seconds to reach the viewport with F6 before the message is gone, and there is no way to turn the timer off or extend it ×10.

**Why it matters:** SC 2.2.1 Timing Adjustable (A) — the accepted remedies are turn-off / adjust / extend; SC 2.2.6 Timeouts (AAA) if any toast carries data the user must act on.
**Fix:** support `duration: 0` (never auto-dismiss) through `provideKjToast`, honour an app-level "no timeouts" setting, and document that destructive/undo toasts must use `duration: 0`.

### F-21 `KjListNavigator` hijacks Home/End/PageUp/PageDown inside text fields

**Severity:** low · **Confidence:** high · **Effort:** S
**Files:** `packages/core/src/primitives/list/navigator.ts:204-219,265-273`

`case ' '` correctly defers to a text field via `isTextEntry(e.target)`, but `Home`, `End`, `PageUp` and `PageDown` call `e.preventDefault()` unconditionally. On the combobox — where the navigator is hosted on the `<input>` (`combobox-input.ts:50`) — the user can no longer move the caret to the start or end of their query.

**Why it matters:** APG combobox deviation; a text-editing convention every user relies on is silently removed (SC 3.2.2 / 2.1.1 expectations rather than a hard failure).
**Fix:** apply the same `isTextEntry(e.target)` guard to Home/End (and to the Page keys when the input has a non-empty value).

### F-22 `field-error` combines `role="alert"` with `aria-live="polite"`

**Severity:** low · **Confidence:** high · **Effort:** S
**Files:** `packages/core/src/field/field-error.ts:31-32`

```ts
role: 'alert',
'aria-live': 'polite',
```

`role="alert"` carries an implicit `aria-live="assertive"`; the explicit `polite` overrides it, producing a hybrid AT implementations handle inconsistently.

**Why it matters:** SC 4.1.3 Status Messages (AA) — validation errors may be delayed or dropped depending on the screen reader.
**Fix:** pick one — `role="alert"` alone for blocking errors, or `role="status"` + `aria-live="polite"` for advisory ones.

## Refuted during verification

### F-2 (original) "`aria-modal="true"` is emitted but nothing is ever made `inert`" — **REFUTED** (was: critical)

The mechanical observations are accurate (`solidBackdrop`'s hooks are no-ops, no service wires `inertBased()`, so no DOM `inert` attribute is ever set on app content), but the **a11y conclusion built on them does not follow**, and the implied remediation is provably wrong. Re-filed as **F-2 (low)**, a doc-accuracy fix.

1. **No SC 4.1.2 failure.** `aria-modal="true"` is an ARIA declaration of modality, not an assertion that the DOM `inert` attribute is present. Per ARIA 1.2 it tells AT to ignore content outside the element. These overlays genuinely **are** modal, so the announced state matches reality:
   - `overlay.css:35-41` — `.kj-backdrop { position:absolute; inset:0; pointer-events:auto }` inside `.kj-overlay-container { position:fixed; inset:0; z-index:1000 }` (`container.ts:24-27`) — a full-viewport scrim that blocks all pointer access to app content.
   - `tabCycle` (`tab-cycle.ts:41-49`) actively traps Tab/Shift+Tab, wrapping at first/last.
   - `KjOverlayStack` routes Escape and outside-click to the topmost overlay only (`stack.ts:20-23`).
   - `htmlOverflow()` locks background scroll.
   This is exactly the WAI-ARIA APG modal-dialog pattern (`aria-modal` + scripted focus trap); the APG's own `dialog-modal` reference implementation sets no `inert` on siblings either.
2. **The finding's own remedy would not work**, which undermines the "nothing is ever made inert" framing. `inertBased()` (`inert-based.ts:17-24`) iterates `panel.parentElement.children`. For every service-launched overlay the panel's parent is the per-overlay `<kj-overlay-wrapper>` (`builder.ts:111-118,137-148`; `wrapper.ts:30-33`), whose only other child is `<kj-backdrop>`. Wiring `inertBased()` into dialog/drawer/sheet would inert the backdrop (breaking click-outside close) and leave the entire application tree untouched — and, since there is a single `focusTrap` slot, it would also **replace** `tabCycle`, losing Tab wrapping, `returnFocus`, and the no-focusables panel fallback (`tab-cycle.ts:64-75`).
3. **`inertSiblings` is the modality flag, not an instruction to write `inert`.** It is declared on `KjBackdropStrategy` (`tokens.ts:24`) with exactly one consumer — `panel.ts:78` `isModal()`. It is consistent end to end and tested: `none.ts` sets it false and `drawer.spec.ts:213` asserts `aria-modal` is null for the non-modal drawer, while `drawer.spec.ts:94` asserts `"true"` for the modal one. Poor naming, not a contradiction.
4. **The SC 2.4.3 claim is not self-standing** — the finding itself conceded it only holds "combined with F-8". SC 2.4.3 concerns meaningful focus order, and the presence or absence of the `inert` attribute does not determine it; the Tab trap is functional in the ordinary case.

**Disposition.** Drop the SC 4.1.2 and SC 2.4.3 citations — neither is failed by the current code. The residual doc drift is tracked as F-2 (low) above.

<details>
<summary>Original F-2 text, preserved</summary>

**F-2 (original, refuted)** `aria-modal="true"` is emitted but nothing is ever made `inert`

**Severity as originally filed:** critical · **Confidence:** high · **Effort:** S
**Files:** `packages/core/src/primitives/overlay/strategies/backdrop/solid.ts:13-23`, `packages/core/src/primitives/overlay/panel.ts:78`, `packages/core/src/dialog/dialog.service.ts:30-34`, `packages/core/src/drawer/drawer.service.ts:64`, `packages/core/src/sheet/sheet.service.ts:79`, `packages/core/src/command-palette/command-palette-dialog.ts:56`

```ts
export function solidBackdrop(opts: KjSolidBackdropOpts = {}): KjSolidBackdropStrategy {
  return {
    inertSiblings: opts.inert ?? true,   // read by NOTHING except panel.isModal
    closeOnClick: opts.closeOnClick ?? true,
    className: opts.className ?? 'kj-backdrop',
    attach() {}, onOpen() {}, onClose() {}, detach() {},   // <- all no-ops
  };
}
```

```ts
// panel.ts:78
readonly isModal = computed(() => !!this.backdrop?.inertSiblings);  // -> [attr.aria-modal]
```

`inertBased()` (`strategies/focus-trap/inert-based.ts:20-22`) is the only code in the repo that sets `inert`, and **no service wires it** — dialog/drawer/sheet all pass `focusTrap: tabCycle(...)`. So background content stays in the tab order and in the DOM tree while the panel announces itself as modal. The dialog docblock states the opposite: *"Siblings outside the dialog are marked `inert` while it is open, so assistive tech sees only the dialog tree"* (`packages/components/src/dialog/dialog.ts:31-35`).

**Why it matters:** SC 4.1.2 (A) — the programmatic state (`aria-modal="true"`) contradicts reality. SC 2.4.3 Focus Order (A) — combined with F-8 the keyboard can leave the dialog into content that `aria-modal` has hidden from the screen reader, stranding the user in content AT will not read.
**Fix:** compose `inertBased()` alongside `tabCycle()` in the dialog/drawer/sheet/command-palette builders (or have `tabCycle` set `inert` on the panel's sibling elements when the backdrop reports `inertSiblings`), and add a spec asserting siblings carry `inert` while open. Correct the docblock either way.
</details>

---

## Reconciliation with `reports/a11y/`

**What the prior scan is:** an axe + Lighthouse + font-metrics sweep over **6 docs pages** (`home`, `getting-started`, `theme-generator`, `docs-button`, `docs-dialog`, `docs-tag`) × **13 themes**, captured 2026-05-13 (`reports/a11y/_summary.json`). It reports 0 axe violations everywhere except one `serious` in `mint`, with 38–43 passes per page.

**What it caught that is real:** the font heuristics. Every theme reports the same warnings (`reports/a11y/bauhaus/docs-button.json`):
```json
{ "selector": "h1", "issue": "line-height ratio 1.00 below 1.2 (WCAG 1.4.12)" },
{ "selector": "p",  "issue": "fontSize 10px below 12px minimum (WCAG 1.4.4)" }
```
The 10px sources are real and pixel-fixed: `apps/docs/src/app/components/docs-nav-tree/docs-nav-tree.css:53`, `docs-sidebar/docs-sidebar.css:70`, `navbar/navbar.css:62`, plus several `0.625rem` rules in the theme-generator panels. Worth fixing in the docs app, although "12px minimum" is the scan's own heuristic rather than a literal SC.

**What it structurally cannot catch — which is where every finding above lives:**
1. **Only the closed, idle state.** axe runs on load: the dialog is closed, the select panel unmounted, no tooltip open. F-1, F-2, F-3 and F-8 are all open-state defects.
2. **No keyboard simulation.** axe never presses Tab or ArrowDown, so F-1, F-4, F-5, F-6, F-18 and F-21 are invisible by construction.
3. **Six pages out of ~70 components.** No page covers table, calendar, combobox, cascade-select, menubar, carousel, slider, file-upload, stepper, rich-text, time-picker or color-picker.
4. **No reduced-motion / RTL / zoom profile.** F-10, F-12 and F-16 need `emulateMedia`, `dir="rtl"` and a 200%-zoom viewport respectively.
5. **Low-signal run.** Lighthouse performance scores of 0 (bauhaus) and 41 (mint) suggest the harness raced the dev server; treat the snapshot as inconclusive rather than as evidence of conformance.

The unit specs share defect (2): `select.spec.ts:134` dispatches the keydown directly onto the portalled panel, so it passes while the real user path (key pressed on the trigger) is dead. A11y specs must drive the element the **user** focuses.

## Recommended work items

1. **Restore keyboard operation of select + cascade-select** — F-1. Move `KjListNavigator` to the trigger (APG select-only combobox) or add a focus strategy; rewrite the spec to key off the trigger element.
2. **Correct the five `inert` docblocks** — F-2. Do **not** wire `inertBased()` next to `tabCycle()`: it walks `panel.parentElement.children`, which is the per-overlay wrapper, so it would inert the backdrop and nothing else while displacing `tabCycle` in the single `focusTrap` slot. If belt-and-braces inerting is wanted, build a separate app-root mechanism on the backdrop strategy's empty `onOpen`/`onClose`.
3. **Give the grid a tab stop** — F-4; and make the resize handle keyboard-operable — F-5.
4. **Fix the roving primitive** — F-6. Clamp the stale index, move focus on active-item removal, expose a public active-item setter and sync it from tabs / stepper / carousel indicators / list.
5. **Tooltip focus + `aria-describedby`** — F-3. Compose `onFocus` with `onHover`; suppress `aria-expanded` for `role="tooltip"` panels.
6. **Consolidate the two focus traps** — F-8, F-9. One focusable query, visibility filtering, document-level listener gated on `isTopmost`, initial focus + restore in `KjFocusTrap`.
7. **Calendar ARIA rebuild** — F-7. Drop `role="application"`, move `gridcell` to the `<td>`, swap native `disabled` for `aria-disabled`.
8. **One global reduced-motion guard in `themes/base.css`** — F-10, then delete redundant per-component blocks.
9. **Focus-visible audit** — F-11. Re-add rings to the command-palette input, time-picker segments and rich-text surface; verify `--kj-border-focus` contrast per theme against the AAA 2.4.13 shape.
10. **Announcements** — F-17, F-22. Result counts, sort changes, page changes through the existing `announce()` helper; settle `alert` vs `status` in `field-error`.
11. **Pointer / target / timing pass** — F-14 (close on up-event), F-15 (44px default or hit-area expansion + doc correction), F-20 (`duration: 0` support).
12. **i18n the built-in strings** — F-13, including the `announce()` messages in file-upload.
13. **RTL sweep** — F-12. One `KjDirectionality` consumed by every arrow-key handler.
14. **Polish** — F-16 (accordion clipping), F-18 (type-ahead cycle), F-19 (tabpanel tabindex, header button), F-21 (Home/End in text fields), plus the docs-app 10px type from the prior scan.
15. **Raise the a11y harness ceiling** — axe on *open* overlay states, a Playwright keyboard-contract suite per APG pattern (Tab in → arrows → Home/End → Escape → focus returned), and reduced-motion + RTL + 200%-zoom profiles.

## Open questions

- Is `role="application"` on the calendar deliberate (a specific screen-reader bug it works around) or inherited from an early draft? It changes the F-7 fix substantially.
- Was `inertSiblings` meant to be consumed by `KjOverlayPanel` (an `[attr.inert]` binding on siblings) rather than by a focus-trap strategy? That would be a smaller fix for F-2 than composing two strategies.
- For select: does the team want the APG *select-only combobox* (focus stays on the trigger, `aria-activedescendant` on it) or the *listbox-popup* pattern (focus moves into the panel)? The current code is half of each.
- Is the 36px default control height a deliberate density decision with a documented "use `lg` for touch" escape hatch, or should default density move to 44px? F-15's fix depends on the answer.
- `reports/a11y/` shows Lighthouse performance 0 on several runs — was that captured against a cold dev server, and should the snapshot be regenerated before being treated as a baseline?
- Should `KjRovingTabindex` and `KjListNavigator` be merged? They now implement overlapping — and divergent (RTL handling, wrap policy, disabled-skipping) — versions of the same contract.
