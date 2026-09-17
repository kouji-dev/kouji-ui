# Accessibility Review

Scope: `packages/core/src/a11y/*`, `packages/core/src/primitives/*`, every interactive widget in `@kouji-ui/core` + `@kouji-ui/components`, `packages/core/src/motion`, `packages/themes`, reconciled against `reports/a11y/_summary.json`.
Method: static read of the source at HEAD (`9aee150a`), tracing every keydown listener back to the element that actually holds DOM focus in real usage. Target per `CLAUDE.md` / `rules/accessibility.md`: **WCAG 2.1 AAA**.

## Verdict

The primitive layer is genuinely well built — `KjSliderThumb`, `KjStepper`, `KjInputOtpCell`, `KjAccordion`, `KjTabs`, `KjCarousel`, `KjToast` and `KjFileUpload` each carry a complete, *bound* ARIA surface and a real keyboard contract, and `packages/core/src/motion` is one of the cleanest reduced-motion implementations I have read. But the overlay-backed list family is broken at the level that matters most: `KjSelect`, `KjTreeSelect` and `KjCascadeSelect` mount `KjListNavigator` — the directive that owns Arrow/Home/End/type-ahead/Enter — on a body-portalled panel that **nothing ever focuses**. Those three widgets open and close by keyboard but cannot be *navigated* by one, so choosing an option needs a pointer, while their `@doc-keyboard` blocks advertise a full APG contract. The data grid has the same shape of defect (no roving tabindex, so the default configuration has no tab stop in the body), and the tooltip has no focus trigger and no `aria-describedby` at all. These are Level-A failures on flagship components of a library whose stated target is AAA, and the specs do not catch them because they dispatch `KeyboardEvent`s directly onto the unfocusable panel. `KjInputOtp` is the inverse shape: its completion branch is dead code (`!val.includes('')` is always `false`), so `(kjComplete)` never emits and the completion announcement never happens — which is the only reason a genuinely destructive `KjLiveRegion` host composition has not yet detonated.

**Grade: D.**

## What works

- **Motion / 2.3.3** — `packages/core/src/motion/motion.css:78+` collapses every preset to a 1 ms opacity fade under `prefers-reduced-motion`, and `KjReducedMotion` (`packages/core/src/motion/reduced-motion.ts`) is SSR-safe and live. `KjOverlayController.runTransition` (`packages/core/src/primitives/overlay/controller.ts:169`) reads the media query before waiting on `animationend`. Spinner, progress-bar, carousel, drawer and sheet all honour it.
- **Slider** — `packages/core/src/slider/slider-thumb.ts:50-71`: `role="slider"`, bound `aria-valuemin/max/now/text`, `aria-orientation`, `aria-readonly`, per-thumb `tabindex`, full Arrow/Page/Home/End contract, `touch-action: none` and pointer capture (2.5.7 satisfied — arrows are a non-drag path).
- **Stepper** — `packages/core/src/stepper/stepper.ts:268-280, 443-451`: `aria-current="step"`, `aria-controls`/`aria-labelledby` pairing, `inert` + `hidden` on inactive content, and a deliberate, documented decision *not* to force roles onto `<ol>`/`<li>`.
- **Command palette** — `packages/core/src/command-palette/command-input.ts:28-44` hosts the navigator on the **input**, which is where focus actually is; `command-palette-dialog.ts:55-66` adds `tabCycle({initialFocus:'first'})`, a backdrop and `aria-label="Command palette"`. This is the pattern the select family should copy.
- **Combobox** — `packages/core/src/combobox/combobox-input.ts:41-72`: navigator on the input, `role="combobox"`, `aria-autocomplete`, `aria-busy`, Alt+ArrowDown/Up, Escape, Tab-closes.
- **Input OTP** (ARIA surface) — `packages/core/src/input-otp/input-otp.ts:60-65, 305-326`: bound `aria-invalid` gated on `touched`, per-cell `aria-label`, roving `tabindex`, `autocomplete="one-time-code"` on cell 0 only, paste/copy handling.
- **Toast** — `packages/core/src/toast/toast.ts:175-190` and `:250-300`: pause-on-hover **and** pause-on-focus, F6 to enter the viewport, Escape to leave with focus restore, `role="alert"` for destructive / `role="status"` otherwise. A real 2.2.1 answer, not a token one.
- **Icons** — `packages/core/src/icon/icon.directive.ts:97-103`: decorative by default (`aria-hidden="true"`), `role="img"` + `aria-label` only when `kjIconLabel` is set. No unlabelled informative icons found.
- **List scoping** — `ownListItems()` (`packages/core/src/primitives/list/scope.ts:35-43`) correctly stops a nested composite's rows being stolen, renumbered (`aria-posinset`) or activated by an outer container.

## Findings

### F-1 Select, tree-select and cascade-select cannot be navigated by keyboard once open: the list navigator listens on a panel that never receives focus

**Severity:** critical *(upheld during verification; title and scope corrected)* · **Confidence:** high
**Files:** `packages/core/src/select/select-content.ts:30-38`, `packages/components/src/select/select.ts:80-86`, `packages/core/src/primitives/list/navigator.ts:41-44`, `packages/core/src/primitives/list/item.ts:127-132`, `packages/core/src/primitives/overlay/controller.ts:139`, `packages/core/src/primitives/overlay/strategies/mount/body-portal.ts:62`, `packages/core/src/tree-select/tree-select-content.ts:73, 119-125`, `packages/core/src/cascade-select/cascade-select-panel.ts:55`

**What actually breaks.** The trigger is a native `<button>`, so Enter/Space fire a synthetic click and the panel **does** open by keyboard; `KjOverlayStack` installs a document-level capture keydown listener (`stack.ts:185, 203`) independent of focus, so Escape **does** still close it. Between those two points the widget is dead to the keyboard. The panel is physically `appendChild`ed into the overlay wrapper under `document.body` when it opens:

```ts
// packages/core/src/primitives/overlay/strategies/mount/body-portal.ts:62
      wrapper.appendChild(el);
```

while DOM focus stays on the trigger. The whole keyboard contract is bound to the panel’s own host:

```ts
// packages/core/src/primitives/list/navigator.ts:41-44
  host: {
    '[attr.aria-activedescendant]': 'kjFocusMode() === "activedescendant" ? activeId() : null',
    '(keydown)': '_onKeydown($event)',
  },
```

The trigger’s keydown cannot bubble to a `<body>` child, so **ArrowUp/ArrowDown, Home/End, PageUp/PageDown, type-ahead and Enter/Space-to-activate are all unreachable** — the user cannot choose an option without a pointer. Every item is `tabindex="-1"` outside roving mode (`item.ts:127-132`), and `listboxClickTrigger()` wraps `onClick()`, which registers only a `click` listener (`on-click.ts:26`), so there is no alternative entry point.

**Root cause per component**

- **`kj-select-content`** provides no `KJ_OVERLAY_FOCUS_TRAP_STRATEGY` (a repo-wide grep shows only command-palette, date-picker, popover and the builder provide that token), so `panel.ts:70` injects `null` and `controller.ts:139`’s `s.focusTrap?.focusFirst()` is a no-op. It also carries **no `tabindex` at all** — so adding a focus-trap strategy alone would not fix it; the panel could not take focus even if something tried.
- **`kj-tree-select-content`** binds `(keydown)` on the panel (`:73`) and re-implements the roving focus-**follow** effect (`:119-125`), but nothing ever puts DOM focus in the panel and every item reads `tabindex="-1"` (`item.ts:127-132`) until an active item exists. (The seed effect at `navigator.ts:93-98` is gated on `kjFocusMode() === 'roving'`, which stays `'activedescendant'` because host-directive inputs cannot be defaulted — see F-15 — but that is **not** the blocker: `moveBy()` at `navigator.ts:141-145` explicitly handles a null active by starting at `-1`. The missing DOM focus is the blocker.)
- **`kjCascadeSelectPanel`** has `'tabindex': '-1'` (`:55`) but nothing ever calls `.focus()` on it.

**Why it matters** SC 2.1.1 Keyboard (A) — the library’s flagship data-input widgets can be opened but not operated without a pointer. SC 4.1.2 — `aria-activedescendant` is published on an element that never holds focus, so AT has nothing to follow. The `@doc-keyboard` blocks in `packages/components/src/select/select.ts:11-19`, `packages/components/src/cascade-select/cascade-select.ts:48-54` and `packages/components/src/tree-select/tree-select.ts:173-179` document a contract the code cannot deliver, and `cascade-select.ts:61` additionally claims `aria-activedescendant` sits on the *trigger* — it is bound on the panel.

**Fix** Mirror what `packages/core/src/dropdown-menu/dropdown-menu-content.ts:244-270` already does deliberately for exactly this reason — seed the navigator **and** move focus on open — or, for the activedescendant components, add `tabindex="-1"` to the panel *plus* a focus strategy that focuses the panel on open and restores the trigger on close. The combobox shows the other valid answer: it hosts the navigator on the focused `<input>` (`combobox-input.ts:41-72`). Select, tree-select and cascade-select got neither treatment.

**Test gap** `packages/core/src/select/select.spec.ts:134` passes only because it dispatches the keydown **directly at the panel element**, which masks the bug rather than covering it. The regression test must drive focus from the trigger (see F-14).

**Effort:** L

---

### F-2 `KjInputOtp` completion is dead code — `!val.includes('')` is always false; the `KjLiveRegion` host composition is a latent DOM-wipe behind it

**Severity:** medium *(corrected during verification: filed as critical; the critical consequence is unreachable at HEAD)* · **Confidence:** high
**Files:** `packages/core/src/input-otp/input-otp.ts:52-56, 259, 262`, `packages/core/src/a11y/live-region.ts:41, 46`, `packages/components/src/input-otp/input-otp.ts:108-128`, `packages/core/src/input-otp/input-otp.spec.ts`

Two coupled defects, not one critical break.

**(1) The present-tense bug — completion never fires.**

```ts
// packages/core/src/input-otp/input-otp.ts:259
    const complete = val.length >= this.kjLength() && !val.includes('');
```

Every JavaScript string contains the empty string, so `!val.includes('')` is a constant `false` and the `complete` branch is **unreachable**. Verified: `'123456'.length >= 6 && !'123456'.includes('')` → `false`. Consequence: `(kjComplete)` never emits, `kjAutoSubmit` is inert, the documented "Code complete" announcement at `:262` never happens, and `input-otp.autosubmit.example.ts` demonstrates a feature that does not work.

The a11y angle is **SC 4.1.3 Status Messages** (no status announcement on completion), not SC 2.4.3 Focus Order.

**Fix** Drop the `!val.includes('')` clause and test emptiness per cell instead — e.g. `val.length === this.kjLength() && !val.split('').some(c => c === '')`, or simply `val.length === this.kjLength()`, since `value` is built by joining the char array and short cells contribute nothing to length. Add spec coverage in `packages/core/src/input-otp/input-otp.spec.ts`, which currently has **none** for completion (grep for `complete|announce` hits only an `autocomplete` attribute test) — which is why the dead branch survived.

**(2) The latent bug it masks — announcing would delete the widget.**

```ts
// packages/core/src/a11y/live-region.ts:41,46
    el.textContent = '';
    // Brief timeout lets screen readers detect the content change.
    setTimeout(() => { el.textContent = message; …
```

```ts
// packages/core/src/input-otp/input-otp.ts:52-56
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFormControl,
    KjLiveRegion,
  ],
```

`packages/components/src/input-otp/input-otp.ts:109-128` renders the `@for` cells as children of that same `<div kjInputOtp>` host. So fixing (1) would make the first announcement delete every `<input kjInputOtpCell>` and the `@for` anchor comments, destroying the focused element. This is the **only** `KjLiveRegion` host directive in the repo on an element that owns rendered children.

**Fix** Fix (1) and (2) together: give the OTP its own visually-hidden live-region *child* — the pattern `carousel.ts`, `rich-text-editor.ts` and `textarea.ts` already use via `viewChild` — instead of the host directive; and harden `KjLiveRegion.announce()` to write into a dedicated owned text node rather than clobbering host `textContent`. The hardening is worth doing at the primitive level regardless, since `KjLiveRegion` is public API and nothing stops a consumer applying it to a host with children.

**Effort:** S

---

### F-3 The data grid implements no roving tabindex, so its body has no tab stop

**Severity:** high *(upheld during verification; wording narrowed)* · **Confidence:** high
**Files:** `packages/components/src/table/table.ts:332, 391, 455, 526`, `packages/core/src/table/table-cell.ts:7-15`, `packages/core/src/table/table-keyboard.ts:25-27, 67-70`, `packages/core/src/a11y/roving-tabindex.ts`

**Evidence**

```html
<!-- packages/components/src/table/table.ts:332 (and 391, 455, 526 — every cell template) -->
<td kjTableCell [kjCell]="c" tabindex="-1"
```

A grep for `tabindex` across `packages/components/src/table` and `packages/core/src/table` returns only those four lines plus `table-header.ts:23` (`canSort() ? "0" : null`) and a spec assertion — **no cell ever receives `tabindex="0"`**, statically or reactively. `KjTableCell` sets only `role="gridcell"`, `aria-colindex` and `data-pin`. The grid host (`table.ts:239-243`) is `<table kjTableKeyboardNav role="grid" …>` with no `tabindex`, and there is no `focus()` call, `focusin` handler or roving-tabindex logic anywhere in `packages/components/src/table/table.ts`. The navigation directive both enters and exits through cell focus:

```ts
// packages/core/src/table/table-keyboard.ts:25-27
  onKeyDown(event: KeyboardEvent): void {
    const startEl = (event.target as HTMLElement).closest<HTMLElement>('[kjTableCell]');
    if (!startEl) return;
```

**The precise claim** The grid implements no roving tabindex, so **in the default configuration the `<tbody>` contains zero tab stops**: Tab goes header row → past the whole body. Two exceptions worth naming, neither of which rescues it:

- With `kjSelectionMode` set, each row's `kj-checkbox` *is* a tab stop — but it lives in a bare `<td class="kj-table-select-cell">` carrying no `kjTableCell`, so `table-keyboard.ts:25-27` still returns and the arrow keys do nothing from there.
- A custom `cellTpl` containing a link or button is also a tab stop, and from it arrow navigation **does** work, because `closest('[kjTableCell]')` resolves to the enclosing `<td>`.

**Why it matters** SC 2.1.1 Keyboard (A). Sortable headers do get `tabindex="0"` (`table-header.ts:23`), so a keyboard user reaches the header row and then arrows into nothing — ArrowDown from a `<th>` hits the null guard and returns. The affected surface is not just navigation: `onCellKeydown` (`table.ts:897`) gates **F2 inline edit, Space row-selection and Ctrl/Cmd+A select-all** on a focused `kjTableCell`, so all three are keyboard-inoperable. The library's own example documents mouse-only entry ("Click into the grid and try the keys", `_examples/table.keyboard.example.ts:13`).

**Fix** The primitive already ships: `KjRovingTabindex` at `packages/core/src/a11y/roving-tabindex.ts`, used by list, carousel, stepper and date-range-presets. `KjTableKeyboardNav` should adopt it — or bind `[attr.tabindex]` on `KjTableCell` to an active-cell signal with the first rendered cell defaulting to `0` — so exactly one cell is tabbable and focus moves with the arrow handler. Delete the hard-coded `tabindex="-1"` from the four templates so consumers cannot break the invariant.

**Test gap** `table-keyboard.spec.ts` only ever focuses cells programmatically (`cells[0].focus()`), so it passes with no tab stop in existence, and the axe check at `table.spec.ts:65` cannot test tab reachability.

**Effort:** M

---

### F-4 Tooltips never open on keyboard focus and are never linked with `aria-describedby`

**Severity:** high *(upheld during verification; failing criteria corrected)* · **Confidence:** high
**Files:** `packages/core/src/tooltip/tooltip-trigger.ts:19-25, 31`, `packages/core/src/primitives/overlay/strategies/trigger-event/on-hover.ts:116-117`, `packages/core/src/primitives/overlay/trigger.ts:26-31`, `packages/components/src/tooltip/tooltip.ts:56, 62`, `packages/core/src/popover/popover-trigger.ts:70-85`

**Evidence**

```ts
// packages/core/src/tooltip/tooltip-trigger.ts:19-25
    {
      provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
      useFactory: () => onHover({ openDelay: 200, closeDelay: 0 }),
    },
```

```ts
// packages/core/src/primitives/overlay/strategies/trigger-event/on-hover.ts:116-117
    listenTarget.addEventListener('pointerenter', onEnter);
    listenTarget.addEventListener('pointerleave', onLeave);
```

`onHover` wires `pointerenter`/`pointerleave` only — there is no `focus`/`focusin`/`blur` path anywhere in the file. (`onFocus()` exists as a sibling strategy; the tooltip does not compose it.) And the trigger primitive publishes no description relationship:

```ts
// packages/core/src/primitives/overlay/trigger.ts:26-31
  host: {
    '[attr.aria-haspopup]':  'ariaHasPopup() ?? null',
    '[attr.aria-expanded]':  'isOpen()',
    '[attr.aria-controls]':  'panelId() ?? null',
    '[attr.data-state]':     'state()',
  },
```

A repo-wide grep for `describedby` returns **zero** hits in any tooltip file. `controller.ts` sets no ARIA attributes (its only `setAttribute` is `hidden`, line 159); `panel.ts:40-46` binds only id/role/aria-modal/data-state/hidden; `tooltip-content.ts` adds nothing; `tooltip-group.ts` is an explicit no-op. `tooltip.spec.ts` asserts only `aria-expanded === "false"` and `role="tooltip"` + `hidden` — nothing covers focus or description wiring.

The consequence is concrete, not theoretical: the content is body-portalled (`bodyPortal()` in `tooltip-content.ts:21`), so it is not a DOM descendant of the trigger, and with no `aria-describedby` there is **no accessible relationship at all** — a screen-reader user hovering *or* focusing the trigger gets nothing.

**Why it matters** SC 2.1.1 Keyboard (A) — keyboard users can never surface the tooltip. SC 4.1.2 Name, Role, Value (A) — the `role="tooltip"` panel is never linked to its trigger, so it is never announced even for mouse users.

> **Correction:** SC 1.4.13 Content on Hover or Focus does **not** apply here. 1.4.13 governs content that *does* appear on hover/focus and requires it be dismissible / hoverable / persistent; it does not mandate that hover content also be focus-triggerable. Its Dismissible leg is in fact satisfied — `stack.ts:203` routes Escape to the topmost registered overlay.

**Documentation mismatch** `packages/components/src/tooltip/tooltip.ts:56` documents "Tab — Moves focus onto the trigger; opens the tooltip (no delay on focus)" and `:62` documents "aria-describedby — wired from the trigger to the content's id while open". Neither exists. The docs must be corrected alongside the code, or consumers ship the defect believing it handled.

**Fix** The primitive already exists one directory over — `popover-trigger.ts:70-85` composes `composeTriggerEvents(onHover({…, interactive: true}), onFocus(), onClick({openOnly: true}))`. `KjTooltipTrigger` should provide `composeTriggerEvents(onHover({ openDelay, closeDelay }), onFocus())`, and `KjOverlayTrigger` should bind `[attr.aria-describedby]="panelId()"` (in place of `aria-expanded`/`aria-controls`) when the panel role is `'tooltip'`.

**Split out of this finding** — `trigger.ts:28` binds `[attr.aria-expanded]="isOpen()"` **unconditionally** on `KjOverlayTrigger`, so every tooltip trigger reports expanded/collapsed state that the APG tooltip pattern does not use. Real, confirmed, but a separate lower-severity defect: it should be suppressed when `KJ_OVERLAY_PANEL_ROLE` is `'tooltip'` (or when the strategy reports `ariaHasPopup: null`). In passing: `kjDisabled` on `KjTooltipTrigger` (`tooltip-trigger.ts:31`) is declared but never read by any strategy, so the documented `[kjDisabled]="true"` example is also inert — another separate defect.

**Effort:** M

---

### F-5 Roving focus-follow steals focus on mount (menubar, and any inline roving list)

**Severity:** medium *(corrected during verification: filed as high)* · **Confidence:** high *(raised from medium — the path was traced hop by hop)*
**Files:** `packages/core/src/menubar/menubar.ts:299-306, 311-320`, `packages/core/src/primitives/list/navigator.ts:98-107`

**Evidence**

```ts
// packages/core/src/menubar/menubar.ts:299-320
    effect(() => {
      const nav = this._nav();
      if (!nav) return;
      const list = this.items();
      if (nav.activeId() !== null) return;
      const first = list.find((i) => !i.disabled());
      if (first) untracked(() => nav.setActive(first.id));
    });

    // Roving focus follow: mirror the navigator's `activeItem()` into DOM
    // focus. Same rationale as the seed — `KjListNavigator`'s built-in
    // focus-follow gates on its own `kjFocusMode()`.
    effect(() => {
      const nav = this._nav();
      if (!nav) return;
      const item = nav.activeItem();
      if (!item) return;
      const host = item._host();
      if (host && typeof document !== 'undefined' && document.activeElement !== host) {
        untracked(() => host.focus());
      }
    });
```

`menubar.ts:311-320` mirrors the navigator's active item into DOM focus **with no gate on whether the user has interacted**. Paired with the seed at `:299-306`, which sets the active id to the first non-disabled item as soon as `items()` resolves, the first `<button kjMenubarItem>` is focused on first render — on a fresh page `document.activeElement` is `<body>`, so the `!== host` check passes. Bar items are real `<button kjMenubarItem>` hosts (`KjMenubarItem` composes `KjListItem` on the same element), so they are natively focusable and `.focus()` cannot silently no-op. Nothing guards it: no `interacted` flag, no open-state gate, no platform or `afterNextRender` gate, and nothing in `packages/components/src/menubar/menubar.ts` (styling only).

**This is a primitive-level gap, not a menubar quirk.** `KjListNavigator` carries the same unguarded focus-follow:

```ts
// packages/core/src/primitives/list/navigator.ts:98-107
      if (this.kjFocusMode() !== 'roving') return;
      …
      if (host && document.activeElement !== host) host.focus();
```

so **any** list that opts into `kjFocusMode="roving"` while rendered inline steals focus on mount too. `KjDropdownMenuContent:248-269` carries the identical pair of effects and is correctly unaffected, because the overlay service only instantiates that component when the menu opens — focusing there is the intended APG behaviour.

**Why it matters** SC 2.4.3 Focus Order (A) / 3.2.1 On Focus — the page moves focus (and scroll position) to the first menu item on load, before any interaction. It does not block use (one Tab or click recovers), loses no state, and is a one-line guard — hence medium.

> **Correction:** drop the "two menubars would fight over it" claim. `document.activeElement` is not reactive and is read outside `untracked`, so neither effect re-runs on focus loss; the last bar to flush simply wins. There is no ping-pong.

**Fix** Fix it once in the primitive (`navigator.ts:98-107`): only follow focus when the active id changed in response to a keyboard/pointer interaction or an overlay open, not on the seeding transition from `null` — then delete the menubar's duplicate. The seed effects must stay; they are what makes `tabindex="0"` reachable by Tab.

**Test gap** No spec covers initial render (`menubar.spec.ts` only asserts focus after an explicit `items[n].focus()`). Add one asserting `document.activeElement` is still `document.body` after `fixture.detectChanges()` on a freshly rendered menubar.

**Effort:** S

---

### F-6 A calendar with no selected value gives the grid no tab stop when today is out of range

**Severity:** medium *(corrected during verification: filed as high; the total-lockout case has a different root cause, split out below)* · **Confidence:** high
**Files:** `packages/core/src/calendar/calendar.ts:131-132, 135-138, 166-167`, `packages/core/src/calendar/calendar-day.ts:43-44, 81-94`, `packages/components/src/calendar/calendar.ts:96-110, 129-134`

**Evidence**

```ts
// packages/core/src/calendar/calendar.ts:130-132
    // Seed focusedDate from kjStartAt or kjValue or today.
    const seed = this.kjStartAt() ?? this.kjValue() ?? new Date();
    this.kjFocusedDate.set(startOfDay(seed));
```

Nothing clamps this against `kjMin` / `kjMax` / `kjDisabledDates`. Note that `kjStartAt()` and `kjValue()` read in the constructor always return their defaults — input bindings are not applied yet — so the constructor seed is *always* `new Date()`, and `kjStartAt` is not even exposed on `KjCalendarComponent`. The day cell then reflects that state as a **native** `disabled` attribute while holding the grid's only `tabindex="0"`:

```ts
// packages/core/src/calendar/calendar-day.ts:43-44
    '[attr.tabindex]': 'isFocused() ? "0" : "-1"',
    '[attr.disabled]': 'isDisabled() ? "" : null',
```

A disabled `<button>` is not focusable, so the roving effect at `calendar-day.ts:85-92` no-ops and Tab skips the grid: every other cell is `-1`.

**Scope** This only fires when `kjValue` is **null** — `calendar.ts:135-138` re-seeds `kjFocusedDate` from any selected value, which is in range by definition. And focus still reaches the grid *indirectly*: the themed component renders real prev/next buttons (`packages/components/src/calendar/calendar.ts:96-110`) that are ordinary tab stops, and one Next press moves `focusedDate` onto an enabled cell, after which the roving effect pulls DOM focus into the grid. So for the common near-bound and weekday-only configurations this is a **degraded tab order, not a lockout**.

**Why it matters** SC 2.1.1 Keyboard (A) / SC 2.4.3 Focus Order (A), and an APG date-picker-grid deviation — a `role="grid"` whose single roving cell is also `disabled` has no reachable tab stop.

**Fix** Clamp the seed to the first selectable date (or compute the roving cell as the nearest enabled date), and **never emit `tabindex="0"` on a cell that also gets `disabled`**. Separately, swap the native `disabled` attribute for `aria-disabled="true"` plus a click guard so a disabled cell stays focusable, per the APG date-picker pattern.

**Effort:** M

**Secondary defect, and the genuinely high-impact case — should be filed separately.** The skip loop's bound guards break as soon as the candidate is outside the bound, rather than only when it steps *past* the bound in the direction of travel:

```ts
// packages/core/src/calendar/calendar.ts:166-167
```

With `kjMin` more than a month in the future, `moveFocus('month', 1)` breaks on iteration 0 and **Next becomes a permanent no-op**, so no day is reachable by keyboard at all. `kjMax` more than a month in the past is the mirror case, and the same guard makes Prev unable to return to a partially-bounded earlier month (from Oct 15 with `kjMin` = Sep 20, Sep 20–30 are unreachable). Add specs for: `kjMin` = today + 3 months with no value, `kjMax` = today − 3 months, and a prev/next round trip across a partially-bounded month.

---

### F-7 Service-launched dialogs, drawers and sheets have no accessible name, and the documented way to give one does not exist

**Severity:** medium · **Confidence:** high
**Files:** `packages/components/src/dialog/dialog.ts:22-38`, `packages/core/src/dialog/dialog.ts:15-26`, `packages/core/src/primitives/overlay/builder.ts:129-150`, `packages/components/src/dialog/_examples/*.ts`

**Evidence**

The doc block tells consumers to point at a component that is not in the repo:

```
// packages/components/src/dialog/dialog.ts:24
 *   aria-labelledby — wire to the id of your `<kj-dialog-title>` so the dialog has an accessible name
```

`grep -rn "dialog-title|DialogTitle" packages/` returns only that line and an unrelated comment in `popover-title.ts`. `KjDialog` (the body component) binds nothing but a class:

```ts
// packages/core/src/dialog/dialog.ts:15-22
@Component({
  selector: 'kj-dialog',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayPanel }],
  …
  host: { class: 'kj-dialog' },
```

and every shipped example produces a nameless dialog — e.g. `dialog.default.example.ts:11-14` renders `<kj-dialog><h2>Hello</h2><p>Dialog body</p></kj-dialog>` with no `aria-label`/`aria-labelledby`. `grep aria-label packages/components/src/{dialog,drawer,sheet}/_examples` returns no matches.

**Why it matters** SC 4.1.2 Name, Role, Value (A) and SC 2.4.6 Headings and Labels (AA): a `role="dialog"` with no accessible name is announced as just "dialog", with no indication of what opened. Every consumer copying an example inherits the defect.

**Fix** Ship `KjDialogTitle` (`[kjDialogTitle]` + `<kj-dialog-title>`) that mints an id, and have `KjDialog`/`KjOverlayPanel` bind `[attr.aria-labelledby]` to the registered title id (mirror `KjAccordionItem`'s `headerId`/`contentId` pairing). Add an `aria-label` passthrough on `KjDialogOpenOptions` for title-less dialogs, warn in dev mode when a panel opens with neither, and update all six examples.

**Effort:** M

---

### F-8 `solidBackdrop({ inert: true })` never applies `inert`, yet the panel asserts `aria-modal="true"`

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/strategies/backdrop/solid.ts:13-23`, `packages/core/src/primitives/overlay/panel.ts:43, 78`, `packages/core/src/dialog/dialog.service.ts:30-33`

**Evidence**

```ts
// packages/core/src/primitives/overlay/strategies/backdrop/solid.ts:13-23
export function solidBackdrop(opts: KjSolidBackdropOpts = {}): KjSolidBackdropStrategy {
  return {
    inertSiblings: opts.inert ?? true,
    closeOnClick: opts.closeOnClick ?? true,
    className: opts.className ?? 'kj-backdrop',
    attach() {},
    onOpen() {},
    onClose() {},
    detach() {},
  };
}
```

Every lifecycle hook is empty. The only consumer of the flag is:

```ts
// packages/core/src/primitives/overlay/panel.ts:78
  readonly isModal = computed(() => !!this.backdrop?.inertSiblings);
```

which feeds `'[attr.aria-modal]': 'isModal() ? "true" : null'` (`panel.ts:43`). The working `inertBased()` strategy (`packages/core/src/primitives/overlay/strategies/focus-trap/inert-based.ts:44-52`) is exported but used by nothing outside its own spec.

**Why it matters** SC 4.1.2 / 2.4.3: the dialog claims modality it does not enforce. `tabCycle` keeps Tab inside the panel, but nothing else does — a screen-reader virtual cursor, browser find, a programmatic `.focus()` from app code, or mobile swipe navigation all still reach background content, while `aria-modal="true"` tells AT they cannot. For dialogs opened through the builder the "siblings" of the panel are other overlay wrappers, not the app root, so even wiring `inertBased()` in unchanged would inert the wrong subtree.

**Fix** Make `solidBackdrop.onOpen/onClose` apply `inert` to the *application* root siblings of `.kj-overlay-container` (and to sibling wrappers below this overlay's stack level), removing it on close and on `detach`. `KjOverlayStack` already tracks levels and content elements (`packages/core/src/primitives/overlay/stack.ts`), so drive it from there so nested overlays un-inert correctly.

**Effort:** M

---

### F-9 `kj-field` does not put `aria-invalid`, `aria-required` or `aria-describedby` on the control, although `@doc-aria` says it does

**Severity:** medium · **Confidence:** high
**Files:** `packages/components/src/field/field.ts:55-57, 65-70`, `packages/core/src/field/field.ts:39-50`, `packages/core/src/field/field-label.ts:20-26`, `packages/core/src/input/input.ts:61-67`

**Evidence**

```
// packages/components/src/field/field.ts:55-57
 *   aria-describedby — Auto-composed from any kj-field-help / kj-field-error siblings via controlId / describedByIds
 *   aria-invalid     — Reflected on the projected control when [kjInvalid] is true
 *   aria-required    — Reflected on the projected control when [kjRequired] is true
```

None of the three happens. `KjField`'s host block writes only `data-*` (`field.ts:44-49`). `KjInput` never injects `KJ_FIELD`; its `aria-invalid` comes from its **own** input:

```ts
// packages/core/src/input/input.ts:62
    '[attr.aria-invalid]': 'formCtrl.touched() && kjInvalid() ? "true" : null',
```

`grep -rn "aria-required" packages/core/src packages/components/src` finds no binding at all — only doc prose plus one manual `[attr.aria-required]` inside `field.required.example.ts:39`. The label meanwhile always publishes a `for`:

```ts
// packages/core/src/field/field-label.ts:22
    '[attr.for]': 'ctx.controlId()',
```

so a consumer who omits `[id]="f.controlId()"` gets a `<label for="kj-field-3">` pointing at nothing, silently and with no dev warning.

**Why it matters** SC 3.3.1 Error Identification (A) — `<kj-field [kjInvalid]="true">` paints the error tone and shows the message but leaves the control without `aria-invalid`, so AT users get no programmatic error state. SC 1.3.1 / 4.1.2 for the dangling `for`; SC 3.3.2 for the missing `aria-required`.

**Fix** Add a `KjFieldControl` directive (or extend `KjInput`/`KjTextarea`/`KjSelectTrigger` to inject `KJ_FIELD` optionally) that binds `[attr.id]`, `[attr.aria-describedby]`, `[attr.aria-invalid]` (OR of the field's state and the control's own) and `[attr.aria-required]` from the field context, and apply it inside the themed wrappers so the default path needs no manual plumbing. Until then, correct the `@doc-aria`/`@doc-a11y` blocks so they describe the manual contract.

**Effort:** M

---

### F-10 Calendar day buttons declare `role="gridcell"` inside a `<td>` that is already a gridcell, under a `role="application"` root

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/calendar/calendar-day.ts:36-38`, `packages/components/src/calendar/calendar.ts:128-134`, `packages/core/src/calendar/calendar.ts:69-75`

**Evidence**

```ts
// packages/core/src/calendar/calendar-day.ts:36-38
  host: {
    'role': 'gridcell',
    'type': 'button',
```

```html
<!-- packages/components/src/calendar/calendar.ts:128-134 -->
<td class="kj-calendar__cell">
  <button class="kj-calendar__day" kjCalendarDay [kjDate]="d">{{ d.getDate() }}</button>
</td>
```

Inside `<table role="grid">` (`calendar-grid.ts:24`) the `<td>` already maps to `gridcell`, so the markup nests `gridcell > gridcell` — a `gridcell` whose owning element is another cell, not a `row`. The button's native `button` role is also overwritten, so the control loses its role while keeping `aria-disabled`/`aria-selected`. Separately the root is:

```ts
// packages/core/src/calendar/calendar.ts:70-71
    'role': 'application',
    'aria-roledescription': 'calendar',
```

**Why it matters** SC 1.3.1 Info and Relationships (A) and SC 4.1.2 — the grid structure is invalid (axe `aria-required-parent` / `aria-required-children` territory) and the interactive role is lost. `role="application"` additionally forces NVDA/JAWS out of browse mode for the whole subtree, which is exactly the mode a `role="grid"` is meant to be read in.

**Fix** Put `role="gridcell"` on the `<td>` (or `role="presentation"` on the `<td>` and leave the `<button>` a button) and drop the role override from `KjCalendarDay`; move `tabindex` to whichever element owns the gridcell role. Remove `role="application"` from `KjCalendar` — `role="grid"` plus the existing key handling already gives the right interaction model, and `aria-roledescription="calendar"` can move to the grid.

**Effort:** M

---

### F-11 The date-picker popup traps Tab while declaring `aria-modal="false"`

**Severity:** medium · **Confidence:** medium
**Files:** `packages/core/src/date-picker/date-picker-calendar.ts:39-51`, `packages/core/src/primitives/overlay/strategies/focus-trap/tab-cycle.ts:173-181`

**Evidence**

```ts
// packages/core/src/date-picker/date-picker-calendar.ts:43-51
    {
      provide: KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
      useFactory: () => tabCycle({ returnFocus: true }),
    },
  ],
  host: {
    '[attr.aria-modal]': '"false"',
    '[attr.aria-label]': '"Choose date"',
  },
```

```ts
// packages/core/src/primitives/overlay/strategies/focus-trap/tab-cycle.ts:177-179
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
```

There is no backdrop and no `enabled` gate — unlike `packages/core/src/popover/popover-content.ts:33,39`, which exposes `kjTrap` defaulting to `false` — so Tab cycles forever inside a popup that tells AT it is non-modal.

**Why it matters** SC 2.1.2 No Keyboard Trap (A) — the only escape is Escape, and the widget's own ARIA says it should not be trapping. Users who Tab expecting to leave the popup (the behaviour `aria-modal="false"` promises) are stuck.

**Fix** Either make the popup genuinely modal (add `solidBackdrop`, set `aria-modal="true"`) or, preferably for a date picker, expose the same `kjTrap` opt-in as the popover and default it to `false`, letting Tab move out and close the popup — matching `KjCascadeSelectPanel`'s `Tab` → `hide()` behaviour.

**Effort:** S

---

### F-12 `KjRovingTabindex` moves focus onto disabled items

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/a11y/roving-tabindex.ts:148-183`; consumers `packages/core/src/tabs/tabs.ts:250`, `packages/core/src/stepper/stepper.ts:376`, `packages/core/src/carousel/carousel.ts:21`, `packages/core/src/list/list.ts:12`

**Evidence**

```ts
// packages/core/src/a11y/roving-tabindex.ts:164-182
    if (horizontalActive && event.key === forwardKey) {
      next = (next + 1) % all.length;
    } …
    event.preventDefault();
    this.activeIndex.set(next);
    all[next].el.nativeElement.focus();
```

`all` is every registered item (`:86-93`); there is no disabled filter anywhere in the directive, and `KjRovingTabindexItemDirective` has no disabled input. `KjTab` publishes `aria-disabled` (`tabs.ts:250`) and `KjStepLabel` publishes a native `[attr.disabled]` (`stepper.ts:376`) — in the latter case `.focus()` silently does nothing, so `activeIndex` advances while focus does not and the next arrow press moves two positions. Contrast `KjListNavigator.navigable` (`packages/core/src/primitives/list/navigator.ts:80-83`), which does filter.

**Why it matters** SC 2.4.3 Focus Order (A) and an APG deviation: composite-widget arrow navigation should skip disabled items, and focus must never be left on an element that cannot take it. A disabled tab in the middle of a strip becomes a dead stop.

**Fix** Give `KjRovingTabindexItemDirective` a `disabled` signal (fed from an input or from `aria-disabled`), filter it out of the navigable set in `onKeydown`, and clamp `activeIndex` to a navigable item in the sync effect at `:118-121`.

**Effort:** S

---

### F-13 Sortable table headers are focusable `<th>` elements with no control role or name

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/table/table-header.ts:21-29`

**Evidence**

```ts
// packages/core/src/table/table-header.ts:21-29
  host: {
    '[style.cursor]':   'canSort() ? "pointer" : null',
    '[attr.tabindex]':  'canSort() ? "0" : null',
    '[attr.aria-sort]': 'canSort() ? ariaSort() : null',
    '[attr.data-sort]': 'canSort() ? sortDir() : null',
    '(click)':          'onHeaderClick()',
    '(keydown.enter)':  'onHeaderClick()',
    '(keydown.space)':  '$event.preventDefault(); onHeaderClick()',
  },
```

The element keeps its `columnheader` role. AT announces "Column name, column header, sorted ascending" with no hint that Enter/Space does anything and no name for the action.

**Why it matters** SC 4.1.2 Name, Role, Value (A) — an interactive control with no control role or accessible action name. (`aria-sort` is correctly bound, which is the good half.)

**Fix** Follow the APG sortable-grid pattern: render a real `<button>` inside the `<th>` for the sort affordance, keeping `aria-sort` on the `<th>` and moving `tabindex` to the button. If the `<th>` must stay the target, add a visually-hidden "Sort by {column}" label wired via `aria-describedby`.

**Effort:** M

---

### F-14 Keyboard specs dispatch events on elements a user can never focus, so they pass while the feature is broken

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/select/select.spec.ts:126-136`, `packages/core/src/tree-select/tree-select.spec.ts:403-413`, `packages/core/src/primitives/overlay/strategies/focus-trap/tab-cycle.spec.ts:123-128`

**Evidence**

```ts
// packages/core/src/select/select.spec.ts:130-136
    let panel = document.querySelector('kj-select-content') as HTMLElement | null;
    if (!panel) panel = container.querySelector('kj-select-content') as HTMLElement;
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(panel.getAttribute('aria-activedescendant')).toMatch(/^kj-list-item-\d+$/);
```

```ts
// packages/core/src/tree-select/tree-select.spec.ts:403-412
  it('ArrowDown on the panel moves focus to the first node', async () => {
    …
    const panel = q('kj-tree-select-content')!;
    fireEvent.keyDown(panel, { key: 'ArrowDown' });
```

Both dispatch directly on the panel. As F-1 establishes, nothing ever focuses that panel, so these assertions describe a path no user can take — and they are the only keyboard coverage those two widgets have. `tab-cycle.spec.ts:126-127` is honest about the same class of gap ("jsdom doesn't move focus on the synthetic event") but then asserts a tautology (`activeElement === a || activeElement === b`).

**Why it matters** This is why F-1 shipped. Green keyboard specs that skip the focus step give false assurance on the exact criterion (2.1.1) the library claims to meet at AAA.

**Fix** Adopt a house rule for keyboard specs: begin every keyboard test by asserting where focus is (`expect(document.activeElement).toBe(trigger)`), dispatch from `document.activeElement`, and assert the focus move as well as the ARIA change. Add a shared `pressKey(el, key)` helper that throws when `el !== document.activeElement`, then re-audit every `dispatchEvent(new KeyboardEvent(` / `fireEvent.keyDown(` call site under `packages/` against that rule.

**Effort:** M

---

### F-15 Roving menus still publish `aria-activedescendant`, and a code comment claims a mechanism Angular does not provide

**Severity:** low · **Confidence:** medium
**Files:** `packages/core/src/primitives/list/navigator.ts:41-44`, `packages/core/src/dropdown-menu/dropdown-menu-content.ts:144-153`, `packages/core/src/menubar/menubar.ts:44-47`

**Evidence**

```ts
// packages/core/src/dropdown-menu/dropdown-menu-content.ts:146-151
    // The KjListNavigator host directive reads `kjOrientation` and
    // `kjFocusMode` as signal inputs; setting the matching static
    // attributes here seeds their initial values for the menu pattern
    // (vertical orientation + roving DOM focus per WAI-ARIA APG).
    'kjOrientation': 'vertical',
    'kjFocusMode': 'roving',
```

Static attributes in a component's own `host` metadata are applied as DOM attributes; they do not bind host-directive inputs. `KjMenubar:44-47` and `dropdown-menu-content.ts:244-248` state the opposite ("host-directive inputs cannot be defaulted from a composing directive — same workaround"), which is exactly why both re-implement the seed and focus-follow effects. The consequence is that `kjFocusMode()` stays `'activedescendant'`, so the navigator keeps publishing:

```ts
// packages/core/src/primitives/list/navigator.ts:42
    '[attr.aria-activedescendant]': 'kjFocusMode() === "activedescendant" ? activeId() : null',
```

on the `role="menu"` / `role="menubar"` host while DOM focus is on the child `menuitem`.

**Why it matters** SC 4.1.2 — two competing focus signals on one widget. AT follows DOM focus so the practical impact is small (hence low), but it is a latent trap: anyone who later "fixes" the input wiring will also silently flip `KjListItem.tabIndex` for every item.

**Fix** Delete the two misleading static attributes, correct the comment, and make `KjListNavigator` read `KJ_LIST_FOCUS_MODE` (the token both consumers already override) instead of its own input when the token is provided. That single change retires the duplicated seed/focus effects in `KjMenubar`, `KjDropdownMenuContent` and `KjTreeSelectContent` and makes the `aria-activedescendant` binding correct everywhere.

**Effort:** S

---

### F-16 Tab panels are never focusable

**Severity:** low · **Confidence:** high
**Files:** `packages/core/src/tabs/tabs.ts:332-338`

**Evidence**

```ts
// packages/core/src/tabs/tabs.ts:332-338
  host: {
    '[attr.role]': '"tabpanel"',
    '[attr.id]': 'tabs.panelId(kjPanelValue())',
    '[attr.aria-labelledby]': 'tabs.tabId(kjPanelValue())',
    '[attr.hidden]': 'isActive() ? null : ""',
    '[attr.data-state]': 'isActive() ? "active" : "inactive"',
  },
```

No `tabindex`. Per APG, a tabpanel containing no focusable element (or one that scrolls) needs `tabindex="0"` so Tab from the tab strip lands in the panel content.

**Why it matters** SC 2.1.1 (A) for scrollable panels — a keyboard user cannot scroll a text-only panel — and SC 2.4.3, since Tab from the active tab jumps past the panel entirely.

**Fix** Bind `'[attr.tabindex]': 'isActive() ? "0" : null'` on `KjTabPanel`. (APG allows an unconditional `0`; gating on active keeps hidden panels out of the order regardless of `hidden` support.)

**Effort:** S

---

### F-17 AAA gaps: a sub-7:1 text token, sub-44px default controls, three unguarded animations

**Severity:** low · **Confidence:** high
**Files:** `packages/themes/src/themes/light.css:30,59`, `packages/themes/src/themes/mint.css:29,56`, `packages/themes/src/themes/nord.css:25,50`, `packages/components/src/button/button.css:173,179,289`, `packages/components/src/toast/toast.css:75`, `packages/components/src/table/table.css:432`, `packages/components/src/select/select.ts:36-37`

**Evidence**

*1.4.6 Contrast (Enhanced, AAA — 7:1).* Computed from the shipped tokens, `--kj-fg-subtle` on `--kj-bg-surface` gives **5.41:1** in `light` (`#6a6a6a` on `#ffffff`), **6.00:1** in `mint` (`#4a6a5a` on `#ffffff`) and **5.49:1** in `nord` (`#b8c0cd` on `#3b4252`). `sakura` (7.05) and `corporate` (7.53) pass. `--kj-fg-muted` passes everywhere (8.86 / 9.86 / 7.45).

*2.5.5 Target Size (AAA — 44×44).* `--kj-button-height: var(--kj-ctl-h-md)` is 36px at the default size (`button.css:173`); only `lg` reaches 44px (`button.css:179`). The select documents the same default explicitly:

```
// packages/components/src/select/select.ts:37
 *   Default trigger height is 36px. Apply `data-size="lg"` on `<kj-select>` to bump the trigger to 2.75rem (44px)…
```

*2.3.3 / 2.2.2.* The three loudest offenders:

```css
/* packages/components/src/toast/toast.css:75 */    animation: kj-toast-enter 0.35s cubic-bezier(0.21, 0.61, 0.35, 1);
/* packages/components/src/table/table.css:432 */   animation: kj-table-loading-pulse 1.4s ease-in-out infinite;
/* packages/components/src/button/button.css:289 */ animation: kj-button-spinner-rotate 0.6s linear infinite;
```

> **Correction (carried back from the 2026-09-06 pass, which was right and this pass understated).** "Everything else animated does guard" is false. Re-counted at HEAD: **61** stylesheets under `packages/components/src` + `packages/core/src` declare `animation:` or `transition:`, and only **23** contain a `prefers-reduced-motion` block. The 24 animated-and-unguarded files are alert, breadcrumb, button, card, checkbox, field, input, input-group, input-otp, link, list, number-input, pagination, password-input, radio, spinner, stepper, table, tabs, tag, textarea, time-picker, toast, tree-select (plus `core/src/styles/docs-themes.css`). There is also **no global guard in `packages/themes`** (`grep prefers-reduced-motion packages/themes/src` → no matches), and `motion.css:82` guards only the opt-in `.kj-motion` class. `spinner.css:128-133` is not a counter-example: it keys off a `data-reduced-motion="true"` attribute set by the `KjReducedMotion` directive, a JS mechanism, not a media query — a good pattern, but one only four components use.

**Why it matters** The repo's stated target is AAA; these are the remaining systematic AAA gaps. The infinite `kj-table-loading-pulse` also engages SC 2.2.2 Pause, Stop, Hide (A) for content that animates for more than 5 s.

**Fix** Darken/lighten `--kj-fg-subtle` per theme until it clears 7:1 against `--kj-bg-surface`, and add that check to the theme-generation script so new themes cannot regress. For motion, do not patch three files — add **one** shared guard in `packages/themes/src/base.css` (`@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }`) and keep per-component blocks only where a bespoke fallback is wanted (the `data-reduced-motion` pattern at `spinner.css:128-133` is the model). Already tracked in the team's own post-merge notes ("reuse `KjReducedMotion` everywhere"). For 2.5.5, either raise `--kj-ctl-h-md` to 44px or document the 36px default as an explicit, tested AA-only mode rather than per-component prose.

**Effort:** M

---

### F-18 The toast viewport is a `role="region"` live region wrapping `role="status"` live regions

**Severity:** low · **Confidence:** medium
**Files:** `packages/core/src/toast/toast.ts:174-181, 77-79`

**Evidence**

```ts
// packages/core/src/toast/toast.ts:175-180
    'role': 'region',
    'tabindex': '-1',
    '[attr.aria-live]': '"polite"',
    '[attr.aria-atomic]': '"false"',
    '[attr.aria-relevant]': '"additions removals"',
```

while each toast inside it is itself a live region:

```ts
// packages/core/src/toast/toast.ts:77-79
  readonly role = computed(() =>
    this.kjToastVariant() === 'destructive' ? 'alert' : 'status',
  );
```

**Why it matters** SC 4.1.3 Status Messages (AA): nested live regions are a known double-announcement source — the inner `status`/`alert` fires, and the outer region's `additions` relevance fires for the same node. The themed wrapper does supply `aria-label="Notifications"` (`packages/components/src/toast/toast.ts:94`), so the bare-core viewport is also an unnamed landmark.

**Fix** Keep the live region on exactly one level. Simplest: drop `aria-live`/`aria-atomic`/`aria-relevant` from `KjToastViewport` and let each `[kjToast]`'s `status`/`alert` role announce; keep `role="region"` plus the required `aria-label` for the F6 landmark behaviour. Verify with NVDA and VoiceOver that a single announcement results.

## Recommended work items

1. **F-1** — Fix the select / tree-select / cascade-select focus model (panel `tabindex="-1"` + panel focus on open + seeded active item + trigger key handling + focus restore). This is the blocking item; nothing else in this report changes the fact that three flagship widgets cannot be navigated without a pointer.
2. **F-2** — Fix the `!val.includes('')` completion guard (`(kjComplete)` / `kjAutoSubmit` are inert today) **and**, in the same change, move `KjInputOtp` off the host-composed live region and make `KjLiveRegion.announce()` non-destructive — otherwise the first fix detonates the second defect.
3. **F-3** — Adopt the existing `KjRovingTabindex` (or an equivalent active-cell binding) on grid cells so the data grid body has a tab stop at all.
4. **F-14** — Adopt the "dispatch from `document.activeElement`" spec rule and add the `pressKey` helper *before* landing F-1/F-3, so the fixes are actually verified.
5. **F-4** — Tooltip: compose `onFocus`, add `aria-describedby`, suppress `aria-expanded` for the tooltip role.
6. **F-6** and **F-10** — Calendar: clamp the seeded focus date, swap native `disabled` for `aria-disabled`, fix the nested-gridcell structure, drop `role="application"`.
7. **F-5** — Gate the roving focus-follow so it does not fire on the seeding transition — fix it in `navigator.ts:98-107` (the primitive), then delete the menubar's duplicate.
8. **F-7** and **F-8** — Overlay modality: ship `KjDialogTitle` + `aria-labelledby` wiring, and make `inert` real (or stop claiming `aria-modal`).
9. **F-9** — `KjFieldControl` so `id` / `aria-describedby` / `aria-invalid` / `aria-required` are automatic; then correct the `@doc-aria` blocks.
10. **F-12**, **F-13**, **F-11**, **F-16** — Roving skips disabled; sortable header becomes a real control; date-picker trap becomes opt-in; tabpanel gets `tabindex`.
11. **F-17** — AAA sweep: `--kj-fg-subtle` ≥ 7:1 per theme (with a generator-side check), three missing reduced-motion guards, and a decision on the 36px default control height.
12. **F-15**, **F-18** — Cleanups: retire the duplicated seed/focus effects by having `KjListNavigator` read `KJ_LIST_FOCUS_MODE`; de-nest the toast live regions.

### Reconciliation with `reports/a11y/_summary.json`

The stored scan (timestamped `2026-05-13`, four months stale relative to HEAD) reports one `serious` axe violation and 29 font warnings for `mint`, and carries **no data at all for the other 13 themes** — `themes` holds a single `mint` key even though `reports/a11y/` contains per-page JSON for 14 themes. Structurally it cannot see any finding in this report:

- It audits six static docs pages (`home`, `getting-started`, `docs-button`, `docs-dialog`, `docs-tag`, `theme-generator`). No select, combobox, tree-select, cascade-select, table, calendar, menubar, tooltip or OTP page is scanned.
- It is a snapshot scan: nothing is opened, focused or typed into. Every finding above except F-10, F-13, F-16 and F-17 only exists *after* an interaction, so axe never reaches the DOM state that fails.
- axe tests contrast at the **AA** thresholds (4.5:1 / 3:1). The 7:1 AAA target this repo sets is never evaluated — hence 5.41:1 body text passing silently (F-17).
- axe cannot detect "the keydown handler is on an element that never receives focus" (F-1, F-3), "focus is stolen on mount" (F-5), "`aria-modal` is asserted without inert" (F-8), or "`announce()` deletes the widget" (F-2). These are behavioural, not static-DOM, defects.
- `lighthouseAvg` records only `performance: 41`; the Lighthouse *accessibility* category is not captured at all.

Treat the scan as a regression net for static markup on docs pages, not as coverage. The gap it leaves is precisely the set of Level-A keyboard failures above.

## Open questions

1. `KjCalendar`'s `role="application"` looks deliberate (`aria-roledescription: 'calendar'` sits alongside it). Was it added to work around a specific AT behaviour, or inherited from an earlier non-grid implementation? That determines whether F-10's second half is a straight removal.
2. Is the 36px default control height a settled product decision (AA default, AAA opt-in via `data-size="lg"`), or should `--kj-ctl-h-md` become 44px? Several `@doc-touch` blocks already document the opt-in, so it may be intentional — but it conflicts with the stated AAA target.
3. `inertBased()` exists, is exported, and is used by nothing. Was it superseded by `tabCycle`, or is wiring it into `solidBackdrop` (F-8) the intended path?
4. For `<kj-select>`, should the fix follow APG *listbox* (focus moves into the panel) or *combobox 1.2* (focus stays on the trigger, `aria-activedescendant` on the trigger)? The `@doc-a11y` block at `packages/components/src/select/select.ts:40` says "combobox/listbox pattern" without committing, and the choice changes where the trigger's `aria-activedescendant` and `aria-controls` must live.
5. `KjFieldError` carries `role="alert"` **and** `aria-live="polite"` (`packages/core/src/field/field-error.ts:31-32`) and is toggled via `hidden`. Was the polite override deliberate (to avoid interrupting typing)? If so, `role="status"` would express it without the contradiction.

---

## Carried forward from the 2026-09-06 review

The five findings below were filed in the previous pass (commit `9aee150a`, auditing `fd6dd34e`), were **not** re-filed by this pass, and I re-verified each of them at HEAD. They are still true. They are restored here with their prior-pass ids noted so nothing is lost; see the reconciliation section for the full accounting.

### F-19 `KjRovingTabindex` loses the tab stop on removal and cannot be seeded to the selected item *(prior pass F-6)*

**Severity:** high · **Confidence:** high
**Files:** `packages/core/src/a11y/roving-tabindex.ts:94, 102-104, 117-121`; consumers `tabs.ts`, `stepper.ts`, `carousel.ts`, `list.ts`, `date-range-presets.ts`

**Verified at HEAD** — unchanged since the prior pass; `git log fd6dd34e..HEAD -- packages/core/src/a11y` is empty.

```ts
// packages/core/src/a11y/roving-tabindex.ts:94
  private readonly activeIndex = signal(0);            // private, no setter, no public API

// :102-104
  unregister(item: KjRovingTabindexItemDirective): void {
    this.registered.update((all) => all.filter((i) => i !== item));
  }

// :117-121
    effect(() => {
      const all = this.items();
      all.forEach((item, i) => item.active.set(i === this.activeIndex()));
    });
```

Two defects. **(1) Stale index after removal.** Close the *last* tab while it is active (`KjTab` ships `kjClosable` + Delete): `activeIndex` stays at `N-1` while `items().length` drops to `N-1`, so no item satisfies `i === activeIndex()` and **every** item renders `tabindex="-1"` — the composite drops out of the tab sequence entirely, and the focused element was just removed so focus falls to `<body>`. **(2) No way to seed the active item.** `activeIndex` starts at `0` and only changes via `focusin` / arrow keys, so a tab strip whose selected tab is the 3rd still puts the tab stop on the 1st — contrary to the APG tabs pattern. `roving-tabindex.spec.ts` covers neither (its tests are all arrow direction / orientation / RTL).

This is distinct from **F-12** (which covers the missing *disabled* filter in the same directive); all three want the same refactor.

**Why it matters** SC 2.1.1 Keyboard (A) — the widget becomes unreachable by Tab; SC 2.4.3 Focus Order (A) — focus lost to `<body>` on DOM removal.

**Fix** Clamp in the effect (`Math.min(activeIndex(), all.length - 1)`) and move focus to the clamped neighbour when the active item is destroyed; expose `setActiveItem(item)` publicly and have `KjTab` / `KjStep` / indicators sync it to the selected value. **Effort:** M

### F-20 `tabCycle` trap leaks: hidden elements count, an empty panel lets Tab escape, and outside focus is never recaptured *(prior pass F-8)*

**Severity:** high · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/strategies/focus-trap/tab-cycle.ts:4, 30, 44`

**Verified at HEAD** — unchanged:

```ts
// tab-cycle.ts:4
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
// :30
    return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
// :44
        if (els.length === 0) return;
```

Three holes: **(a)** no `display:none` / `[hidden]` / `visibility` filter, so a collapsed accordion or hidden step inside the dialog can become the "first"/"last" focusable and `.focus()` silently no-ops, dumping focus on `<body>` — note `packages/core/src/a11y/focus-trap.ts:45` *does* filter, so the two implementations disagree; **(b)** when the panel has no focusables, `focusFirst()` focuses the panel itself at `tabindex="-1"`, but that element is not in `focusables()`, so `els.length === 0` returns early and Tab walks straight into the page behind a dialog that asserts `aria-modal="true"` (see F-8); **(c)** the listener is attached to the panel, so once focus is outside for any reason it can never be pulled back.

**Why it matters** SC 2.4.3 Focus Order (A) — focus leaves a modal into content the screen reader has been told to ignore.

**Fix** Filter `focusables()` by visibility, treat the panel itself as the fallback stop when the list is empty, and attach the keydown listener on `document` gated on `stack.isTopmost` so out-of-panel focus is recaptured. Consolidate the four different "focusable" queries in the repo (`a11y/focus-trap.ts:5`, `tab-cycle.ts:4`, `inert-based.ts:61`, `toast.ts:306`) into one helper. **Effort:** S

### F-21 Column resizing is drag-only, with no keyboard path *(prior pass F-5)*

**Severity:** high · **Confidence:** high
**Files:** `packages/components/src/table/table.ts:277-285`

**Verified at HEAD** — unchanged:

```html
<!-- packages/components/src/table/table.ts:279-285 -->
<span
  class="kj-table-resize-handle"
  role="separator"
  aria-orientation="vertical"
  aria-label="Resize column"
  (mousedown)="h.getResizeHandler()($event)"
  (touchstart)="h.getResizeHandler()($event)"
></span>
```

No `tabindex`, no `keydown`, no `aria-valuenow`/`min`/`max`. The only way to resize a column is a pointer drag along a path.

**Why it matters** SC 2.1.1 Keyboard (A) — functionality unavailable from the keyboard. SC 2.5.1 Pointer Gestures (A) — a path-based drag with no single-pointer alternative. (Also SC 2.5.7 Dragging Movements in WCAG 2.2.)

**Fix** Make the handle a focusable `role="separator"` with `tabindex="0"`, `aria-valuenow/min/max` (column width), ArrowLeft/ArrowRight ±1 step, Shift+Arrow ±10, Home/End for min/max, Enter/Escape to commit/cancel, and `aria-valuetext` for the announced width. **Effort:** M

### F-22 An open accordion panel is clipped at 1000px *(prior pass F-16)*

**Severity:** medium · **Confidence:** high
**Files:** `packages/components/src/accordion/accordion.css:46, 60`

**Verified at HEAD** — unchanged: `.kj-accordion-content { overflow: hidden; max-height: 0; }` at `:46` and `[data-state="open"] { max-height: 1000px; }` at `:60`.

Content taller than 1000px — easily reached at 200% zoom or with an enlarged font — is clipped with no scrollbar, and the clipped region is unreachable.

**Why it matters** SC 1.4.4 Resize Text (AA) and SC 1.4.10 Reflow (AA) — content is lost when text is enlarged.

**Fix** Animate `grid-template-rows: 0fr → 1fr` (or `interpolate-size: allow-keywords` / `calc-size(auto)`), and drop `overflow: hidden` once open. **Effort:** S

### F-23 `KjFocusTrap` — the documented public primitive — is dead code that sets no initial focus and restores none *(prior pass F-9)*

**Severity:** low *(lowered from the prior pass's medium: verification for `05-micro-frontends.md` established the directive has zero consumers, so no shipped component is affected)* · **Confidence:** high
**Files:** `packages/core/src/a11y/focus-trap.ts:26-45`, `packages/core/src/a11y/index.ts:3`

**Verified at HEAD** — a repo-wide grep for `kjFocusTrap` / `KjFocusTrap` returns only `focus-trap.ts` itself, its spec, and the barrel export at `a11y/index.ts:3`. No shipped component applies it; every real overlay uses `tabCycle()`.

The primitive `rules/accessibility.md` advertises as "Trap focus in container" only intercepts Tab (`:42`). It never focuses anything on enable (`focusFirst()` exists but nothing calls it), never records or restores the previously focused element, and installs its handler on `document` unconditionally — so two enabled traps would both act on every Tab. Its `FOCUSABLE` list also omits `[contenteditable]` without `="true"`, `audio[controls]`, `video[controls]`, `iframe`, `details`/`summary`, and does not sort by tabindex.

**Why it matters** A public, documented a11y primitive that does not do what the docs say. Any consumer who builds an overlay on it strands focus on `<body>` at open and at close (SC 2.4.3). Low only because nothing in the library uses it.

**Fix** Either wire it properly — on enable store `document.activeElement` and call `focusFirst()`; on disable/destroy restore — or delete it and point the docs at `tabCycle`. Either way, consolidate it with F-20's focusable-query cleanup. **Effort:** S


## Changed since the 2026-09-06 review

Previous review: commit `9aee150a`, auditing `fd6dd34e`. Main has since advanced 8 commits. Every "fixed" claim below was checked against the code at HEAD, not taken from either report.

### Fixed

- **Prior F-14 — "Overlays dismiss on `pointerdown`, not on the up-event" — fixed for the backdrop path only.** `e6aa28a5` ("a backdrop dismisses only a press that began on it") added `packages/core/src/primitives/overlay/dismiss-press.ts`. `KjBackdrop` now arms on `(pointerdown)`/`(mousedown)` and dismisses on `(click)` only if the press began on the scrim (`backdrop.ts:18-20, 41-52`; `KjDismissPress.owns()` at `dismiss-press.ts:41-51`, which also lets `detail === 0` keyboard-synthesised clicks through). Verified at HEAD. **SC 2.5.2 Pointer Cancellation is now satisfied for backdrop-bearing overlays** — a press that starts on the scrim and releases on the panel produces a `click` on a common ancestor, so the backdrop handler never fires.
  **Residual, still open:** `KjOverlayStack.handlePointerDown` (`stack.ts:209-219`) still calls `top.opts.onClose()` on the **down** event for outside presses, which is the path every backdrop-less overlay takes — select, popover, tooltip, dropdown-menu, date-picker. Those still cannot be aborted before release. The same commit did add `if (target && !target.isConnected) return;` at `stack.ts:217`, which fixes a separate retarget bug but not the down-vs-up semantics.

No other prior accessibility finding was fixed in `fd6dd34e..HEAD`. `git log` over `packages/core/src/a11y`, `packages/core/src/calendar`, `packages/core/src/table`, `packages/core/src/tooltip` and `packages/components/src/table` is empty for the range.

### Still open

| Prior | Current | Note |
|---|---|---|
| F-1 Select/cascade-select not keyboard operable (critical) | **F-1** | Broadened to include tree-select; title corrected in this pass to "cannot be navigated once open" (the widget does open and close by keyboard). |
| F-3 Tooltip: no focus trigger, no `aria-describedby` (high) | **F-4** | Unchanged code; this pass drops the SC 1.4.13 citation and splits out the `aria-expanded` sub-claim. |
| F-4 Data grid cannot be entered (high) | **F-3** | Unchanged code; wording narrowed to "no roving tabindex → no tab stop in the default configuration". |
| F-7 Calendar: `role="application"`, inverted grid, `disabled` day cells (high) | **F-6** + **F-10** | Split: F-6 takes the unreachable-tab-stop half, F-10 the role/structure half. Both verified unchanged (`calendar.ts:70`, `calendar-day.ts:43-44`). |
| F-2 Five TSDoc blocks claim `inert` (low) | **F-8** | Re-filed from the doc angle to the mechanism angle (`solidBackdrop`'s hooks are still empty; `inertBased()` still has no consumer). |
| F-15 Default control size below the AAA touch target (medium) | **F-17** | Folded into the AAA-gaps finding. |
| F-19 Tab panels no tab stop; sortable headers no role (low) | **F-16** + **F-13** | Split into two findings. |
| F-6 `KjRovingTabindex` (high) | **F-19** *(restored)* + **F-12** | This pass filed only the missing disabled-filter (F-12) and missed the stale-index and no-seed defects. Re-verified and restored as F-19. |
| F-8 `tabCycle` trap leaks (high) | **F-20** *(restored)* | Missed by this pass. Re-verified at HEAD and restored. |
| F-5 Column resize is drag-only (high) | **F-21** *(restored)* | Missed by this pass. Re-verified at HEAD and restored. |
| F-16 Accordion clipped at 1000px (medium) | **F-22** *(restored)* | Missed by this pass. Re-verified at HEAD and restored. |
| F-9 `KjFocusTrap` sets no initial focus (medium) | **F-23** *(restored, lowered to low)* | Missed by this pass. Re-verified; lowered because the directive has zero consumers. |
| F-10 `prefers-reduced-motion` ignored by most component CSS (medium) | **F-17** *(corrected in place)* | **The prior pass was right and this pass understated it.** F-17 originally claimed only three files were unguarded and that "everything else does guard"; the real count at HEAD is 24 animated stylesheets with no guard out of 61, plus no global guard in `packages/themes`. F-17 now carries that correction and the shared-guard fix. |
| F-22 `field-error` combines `role="alert"` with `aria-live="polite"` (low) | — | Demoted by this pass to **Open question 5** rather than a finding. The code is unchanged (`field-error.ts:31-32`); it should be a finding again, or the open question should be closed with a decision. |

### Not reproduced

Honest accounting of prior findings this pass neither re-filed nor verified:

- **Out of this pass's scope, not re-checked** — F-11 (focus indicator removed in command-palette / time-picker / rich-text), F-12 (RTL honoured only by slider and avatar-group), F-13 (hard-coded English UI/ARIA strings), F-17 (no status announcements for filter/sort/pagination), F-18 (`KjTypeAhead` has no APG same-letter cycle), F-20 (toast auto-dismiss fixed at 4 s), F-21 (`KjListNavigator` hijacks Home/End/PageUp/PageDown inside text fields). This pass traced keyboard/focus ownership and ARIA wiring; it did not re-audit CSS focus indicators, directionality, i18n, live-region coverage or type-ahead semantics. None of the corresponding files changed in `fd6dd34e..HEAD`, so **assume all seven are still open** until someone checks. They are not "dropped".
- **Correctly not re-filed** — the prior pass's refuted original F-2 ("`aria-modal="true"` with nothing made `inert`", filed critical, refuted to a doc-accuracy issue). This pass reached the same place independently via F-8, which reports the mechanism at medium without the SC 4.1.2 / 2.4.3 claims the verification rejected.

### New since then

- **F-2** `KjInputOtp` completion is dead code (`!val.includes('')` is always `false`), with a latent `KjLiveRegion` DOM-wipe behind it. Not seen by the prior pass at all.
- **F-5** Roving focus-follow steals focus on mount — menubar, and the same unguarded effect in the `KjListNavigator` primitive.
- **F-7** Service-launched dialogs / drawers / sheets have no accessible name, and the documented `<kj-dialog-title>` does not exist in the repo.
- **F-9** `kj-field` does not put `aria-invalid` / `aria-required` / `aria-describedby` on the control despite `@doc-aria` saying it does.
- **F-14** Keyboard specs dispatch events on elements a user can never focus — the methodological reason F-1 and F-3 shipped.
- **F-15** Roving menus still publish `aria-activedescendant`, and a code comment claims a host-directive-input mechanism Angular does not provide.
- **F-18** The toast viewport is a `role="region"` live region wrapping `role="status"` live regions.
- **F-17** now carries two items the prior pass did not quantify: the sub-7:1 `--kj-fg-subtle` token in `light` / `mint` / `nord`, computed per theme.
