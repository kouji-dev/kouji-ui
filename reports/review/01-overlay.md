# Overlay System Review

> **Adversarially verified 2026-09-15.** Findings below marked *(severity corrected during verification)* were re-checked against the source; corrections are inline. Refuted findings are preserved in **Refuted during verification** at the end of the findings list, not deleted.

## Verdict

The overlay primitive is a genuinely well-shaped design: a strategy-bundle architecture (`mount` / `position` / `backdrop` / `focusTrap` / `scrollLock` / `liveAnnouncer` / `trigger`) behind DI tokens, a single state machine in `KjOverlayController`, a global `KjOverlayStack` that routes Escape and outside-click to the topmost overlay only, and a lazily-created singleton DOM container. The no-CDK policy in `rules/stack.md` is obeyed literally (zero `@angular/cdk` imports anywhere — verified by grep), and for the common cases the hand-rolled replacement is defensible. But the implementation has a set of **wiring gaps between layers that are individually small and collectively severe**: declarative overlays (popover, tooltip, select, combobox, dropdown-menu, tree/cascade-select, date-picker, color-picker, command-palette) **never call `KjOverlayController.dispose()`** — no `ngOnDestroy`, no `DestroyRef` — so destroying a host with an open overlay strands a stack entry, document-level listeners, portalled DOM, a `ResizeObserver` and (for the command palette) the body scroll lock until the next click or Escape anywhere on the page cleans them up. `closeOnEsc` / `closeOnOutside` are accepted at every public API level and silently dropped before reaching the stack, so `alert: true` dialogs are dismissible by outside click and Escape. Toasts register in the same stack as modals, so an open toast swallows the first Escape and the first outside click meant for the dialog under it. Per-component CSS `z-index` (100 … 1001) overrides the container's documented "last opened wins" sibling ordering, so a select inside a drawer paints *underneath* it. Focus restoration exists only where a focus-trap strategy was provided — which is popover, command palette and the three builder services — leaving dropdown-menu and menubar (which move real DOM focus into the panel) dropping focus to `<body>` on close.

**Grade: C-** — strong bones, but the seams between primitive and consumers leak in ways that are user-visible and, in two cases, accessibility-blocking.

*Post-verification: F-1 critical → high, F-3 high → medium, F-6 high → medium. No critical findings remain in this dimension; F-2, F-4 and F-5 were upheld at high.*

## What works

- **Real strategy separation.** `packages/core/src/primitives/overlay/tokens.ts:6-54` defines seven narrow strategy interfaces and their tokens; `controller.ts:74-80` attaches them in a fixed order and `controller.ts:103-112` detaches in exact reverse. That is the right shape and it is consistently applied.
- **Topmost-only Escape/outside routing is correctly implemented** in `stack.ts:99-112`, with listeners installed lazily on first registration and removed when the stack empties (`stack.ts:80-92`). `stack.spec.ts` covers `only the topmost receives Escape` and `respects closeOnEsc=false and closeOnOutside=false`.
- **Singleton container with pointer-events isolation.** `container.ts:21-28` re-creates the root if it was detached (`_root.isConnected` check), and `overlay.css:18-33` makes the container/wrapper `pointer-events: none` with children re-enabled — app content behind a non-modal overlay stays clickable.
- **Scroll-lock ref-counting is correct and leak-safe.** `strategies/scroll-lock/html-overflow.ts:7-34` ref-counts, saves/restores the original inline values, compensates for scrollbar width, and its `detach()` releases (`:42`) so a disposed overlay can't strand the lock.
- **Portal restore is careful**: `strategies/mount/body-portal.ts:64-78` restores the panel to its *original sibling position*, not just its parent, and validates the saved `nextSibling` is still a child before using it.
- **`display: contents` handling.** Both `anchored-to.ts:35-47` (`effectiveRect`) and `on-hover.ts:35-48` (`effectiveHoverTarget`) walk to the first laid-out descendant — a real-world problem (`<kj-button>` hosts) that most hand-rolled positioners get wrong.
- **Theme-scope propagation through the portal** (`body-portal.ts:13-21`, `:58-61`) — the portalled wrapper inherits the trigger's nearest `data-theme`. Nice detail that CDK does not give you.
- **Toast timer pause/resume is ref-counted by reason** (`toast/toast.service.ts:242-299`) for WCAG 2.2.1.

## Findings

### F-1 Declarative overlays are not disposed on host destroy — orphaned overlay state persists until the next click or Escape

**Severity:** high *(corrected during verification: was critical)* · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/controller.ts`, `packages/core/src/primitives/overlay/wrapper.ts:45-49`, `packages/core/src/menubar/menubar-item.ts:156-161`, all declarative consumers

`KjOverlayController` defines `dispose()` but has no `ngOnDestroy` and never injects `DestroyRef`. The only two call sites in the repo are the builder's wrapper component and one manual hook in menubar:

```ts
// wrapper.ts:45-49 — builder/service path only
constructor() {
  inject(DestroyRef).onDestroy(() => this.controller.dispose());
}
```
```ts
// menubar/menubar-item.ts:156-161 — the only consumer that remembered
this.destroyRef.onDestroy(() => {
  this.bar.unregisterItem(this);
  try { this.controller.dispose(); } catch { /* already disposed */ }
```

Every other declarative overlay provides `KjOverlayController` on a directive's element injector — `popover-trigger.ts:42`, `tooltip-trigger.ts:19`, `dropdown-menu-trigger.ts:75`, `command-palette-dialog.ts:51`, `select-root.ts:53`, `color-picker.ts:89` — and neither `KjOverlayTrigger` nor `KjOverlayPanel` registers a destroy hook. Destroying the host while the overlay is open therefore skips `close()` entirely: the `KjOverlayStack` entry stays registered, `anchoredTo`'s `window` resize/capture-scroll listeners and its `ResizeObserver` stay live (`anchored-to.ts:242`'s `detach()` only nulls `ctx`), the `body-portal` wrapper stays in `.kj-overlay-container` with the panel inside it, and `htmlOverflow` keeps its refcount.

**Impact, correctly scoped (verification correction).** This is **not permanent**. The orphaned stack entry is registered with `closeOnEsc`/`closeOnOutside` defaulting to `true` (`stack.ts:50-54`), so the next document-level `pointerdown` or Escape invokes the orphan's `onClose`, and `beginClose()` runs the whole teardown chain — `stackHandle.unregister()` plus `maybeRemoveListeners`, `scrollLock.onClose()` releasing the `html-overflow` refcount, `position.onClose()` removing the listeners and disconnecting the observer, and `body-portal.onClose()` returning the panel and removing the wrapper. The orphan also cannot steal Escape or outside-click from a live overlay: a later-opened overlay is pushed after it and wins `topmost()`, and when the orphan *is* topmost there is no live overlay the event would have reached.

The observable symptom is bounded but real: after routing away with a popover, dropdown or command palette open, the portalled panel stays painted over the new route — and for `kj-command-palette-dialog` the page stays scroll-locked — **until the user clicks or presses Escape**.

The backdrop is *not* part of this leak: `solidBackdrop` (`strategies/backdrop/solid.ts`) is a flag-only strategy whose `onOpen`/`onClose`/`detach` are empty; it creates no DOM and applies no `inert`. The real `<kj-backdrop>` component exists only on the builder path, which disposes correctly via the wrapper.

**Fix:** give `KjOverlayController` an `ngOnDestroy` that calls `dispose()` — Angular invokes it for providers on a destroyed node injector — which covers every declarative consumer at once and makes `menubar-item.ts:158`'s manual try/catch redundant. Add a spec asserting that destroying a host with an open declarative overlay empties the stack, removes the portal wrapper and releases the scroll lock; no current spec covers destroy-while-open (`controller.spec.ts:77` only checks `dispose()` detach ordering, `builder.spec.ts:36` only the service path).
**Effort:** S

---

### F-2 `closeOnEsc` / `closeOnOutside` are accepted everywhere and plumbed nowhere

**Severity:** high · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/builder.ts:27-31`, `packages/core/src/primitives/overlay/controller.ts:13-21,122`, `packages/core/src/dialog/dialog.service.ts:13-39`, `packages/core/src/drawer/drawer.service.ts:32,65`, `packages/core/src/sheet/sheet.service.ts:41,80`

The stack supports per-overlay opt-out and is tested for it (`stack.ts:50-54`, `stack.spec.ts` "respects closeOnEsc=false and closeOnOutside=false"). But the controller registers with only a callback:

```ts
// controller.ts:122
this.stackHandle = this.stack.register(this.id, { onClose: () => this.close('esc') });
```

so both flags fall back to `true` (`stack.ts:52-53`). Meanwhile `KjOverlayBuilderConfig` declares them:

```ts
// builder.ts:27-31
export interface KjOverlayBuilderConfig extends KjOverlayStrategies {
  panelRole: KjPanelRole;
  closeOnEsc?: boolean;
  closeOnOutside?: boolean;
}
```

and `builder.create()` (`:93-121`) never reads either one. `KjDialog.open` exposes `closeOnEsc` in its options (`dialog.service.ts:16`) and **never references it again**; `closeOnOutside` is routed only into the backdrop element's click handler (`:32`), which the stack's global `pointerdown` bypasses entirely.

Concrete consequences:
- `dialog.open(C, { closeOnEsc: false })` still closes on Escape.
- `dialog.open(C, { alert: true })` — an `alertdialog` that must not be casually dismissed — still closes on any pointerdown outside the panel, because `handlePointerDown` (`stack.ts:106-112`) only checks `contentEl`.
- `dialog.open(C, { closeOnOutside: false })` closes on outside click anyway.

Also note the reason is hard-coded: an outside click reports `'esc'` to `close()`.

**Fix:** thread `closeOnEsc` / `closeOnOutside` from `KjOverlayBuilderConfig` into the controller (a `configure({closeOnEsc, closeOnOutside})` setter, or a new `KJ_OVERLAY_CLOSE_POLICY` token so declarative consumers can set it too) and have `beginOpen` forward them to `stack.register`. Default both to `false` when `panelRole === 'alertdialog'`. Add dialog specs for `closeOnEsc:false` and `alert:true`.

**Verification corrections (finding upheld at high).**
- **Widen the file list.** `packages/core/src/drawer/drawer.service.ts:32,65` and `packages/core/src/sheet/sheet.service.ts:41,80` have the identical defect — their `closeOnOutside` also reaches only `solidBackdrop({closeOnClick})` and is overridden by the stack's default-true outside handling.
- **Root cause is single and narrow:** `KjOverlayStrategies` (`controller.ts:13-21`) carries no close flags, so neither `attachStrategies` nor `create` has a channel to pass them, and `controller.ts:122` registers with `onClose` alone. The declarative `panel.ts` path cannot supply them either.
- **`close('outside')` is unreachable today.** The stack's capture-phase `pointerdown` (`stack.ts:106-112`) always fires before `KjBackdrop`'s bubbled `click`, and the subsequent `KjBackdrop.onClick` early-returns at `controller.ts:92` because the state is already `'closing'`. Every outside dismissal is therefore reported to consumers as reason `'esc'`; the register callback should take the reason from the originating handler rather than hard-coding it.
- No guard, base class or test mitigates any of this: `dialog.spec.ts` only asserts `ref.controller` is truthy for `alert:true` and never exercises Escape or outside clicks, while `stack.spec.ts:46` confirms the stack *does* honour the flags when they are actually passed.
**Effort:** M

---

### F-3 Overlay toasts join the Esc/outside-click stack and swallow the first Escape meant for the dialog beneath

**Severity:** medium *(corrected during verification: was high)* · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/controller.ts:122`, `packages/core/src/toast/toast.service.ts:155-202`, `packages/core/src/primitives/overlay/stack.ts:50-54,110`

`KjOverlayController.beginOpen` registers **every** overlay with the stack's defaults (`closeOnEsc: true`, `closeOnOutside: true`, `stack.ts:52-53`) and never forwards `KjOverlayBuilderConfig.closeOnEsc` / `closeOnOutside` (`builder.ts:29-30`) — those two fields are dead across the whole repo, which also silently drops `KjDialogOpenOptions.closeOnEsc` (`dialog.service.ts:16`). See F-2.

`KjToastService.openOverlay` builds a real overlay and calls `handle.controller.open()`:

```ts
// toast.service.ts:158-167
const handle = this.builder.create({
  mount: inPlace(),
  position: corner({ position: opts.position ?? 'bottom-right' }),
  backdrop: null, focusTrap: null, scrollLock: null,
  liveAnnouncer: variant === 'destructive' ? assertive() : polite(),
  trigger: programmatic(),
  panelRole: variant === 'destructive' ? 'alert' : 'status',
});
```

so a toast becomes the **topmost stack entry** ahead of any dialog, drawer or sheet beneath it. The first Escape and the first outside `pointerdown` after a toast appears therefore go to the toast, not to the modal the user is working in.

For the common `toast.success({ message })` path (no `opts.component`) `attachComponent` never runs, so `bindPanel` never runs, `this._panel()` is `null`, and `markContentEl` is skipped at `controller.ts:123` — leaving `contentEl: null`, which makes `stack.ts:110` treat *every* pointerdown as "outside".

**Verification corrections (consequences were overstated).**
1. **The toast does not visibly disappear on the first click** on the dominant path. With no component the overlay renders nothing — the wrapper's `panelAnchor` stays empty. The visible toast is rendered by `KjToastViewport` from `svc.toasts()` (`toast.ts:322`), and a stack-driven `controller.close()` bypasses `KjToastService.dismiss()`, so the queue entry and its timer survive. The user sees no change; only an invisible phantom overlay closes. The "dies on the first click" symptom is real only for the rarer `opts.component` path, where `bindPanel` *does* run and `contentEl` is set — the inverse of what was originally claimed.
2. **The tooltip half is withdrawn.** WCAG 2.1 SC 1.4.13 (Content on Hover or Focus) and the APG both require Escape to dismiss a tooltip, and outside-pointerdown dismissal is equally expected. A tooltip taking Escape ahead of the dialog under it is the desired ordering, and tooltips bind their panel correctly through `KjOverlayPanel`, so their `contentEl` is set and outside-click detection works.

What is genuinely broken is narrower: while an overlay-based toast is alive it silently swallows the first Escape and the first pointerdown that should have reached the dialog/drawer beneath — one press each per toast, non-destructive and self-clearing once the phantom unregisters — plus the queue entry and timer for that toast are orphaned because the close path bypassed `dismiss()`. No spec covers it: `stack.spec.ts` tests the primitive in isolation and `toast.spec.ts` never exercises Escape or outside-click.

**Fix:** plumb `closeOnEsc`/`closeOnOutside` from the builder config through `attachStrategies` into `stack.register` (F-2), and have `KjToastService.openOverlay` pass `closeOnEsc: false, closeOnOutside: false` — a toast is a non-modal status surface. Optionally register nothing at all when the overlay has no panel. Add a spec asserting that with a dialog open and a toast showing, Escape closes the dialog.
**Effort:** M

---

### F-4 Per-component CSS `z-index` overrides the container's stacking contract — a select inside a drawer renders beneath it

**Severity:** high *(upheld during verification)* · **Confidence:** high (re-verified against source)
**Files:** `packages/core/src/primitives/overlay/overlay.css:18-33`, `packages/core/src/primitives/overlay/wrapper.ts:12-18`, `packages/components/src/*/*.css`

`wrapper.ts` documents the contract: *"Sibling order in the container resolves stacking among open overlays — last opened wins."* The CSS backs that up — `.kj-overlay-container` is the only element with a `z-index` (`overlay.css:21`), and `.kj-overlay-wrapper` is `position:absolute` with `z-index:auto`, so it does **not** create a stacking context. Every panel therefore competes directly inside the container's single stacking context, where an explicit `z-index` beats DOM order. And the styled layer hands out ad-hoc numbers:

```
select/select.css:63          z-index: 100;
combobox/combobox.css:48      z-index: 100;
date-picker/date-picker.css:42  z-index: 50;
speed-dial/speed-dial.css:24  z-index: 100;
cascade-select.css:46 / :64   z-index: 200 / 1001;
popover.css:28, dropdown-menu.css:28, dialog.css:9, drawer.css:16, sheet.css:26, confirm-popup.css:22, command-palette.css:18/33  z-index: 1000 / 1001;
drawer.css:56                 z-index: 999;
```

A `<kj-select-content>` (z-index 100) opened from inside an open `.kj-drawer` (z-index 1000) is portalled into a *later* wrapper but paints **below** the drawer. Same for combobox/date-picker inside a dialog, sheet or command palette. The "last opened wins" invariant only holds between panels that happen to share a number.

Two more symptoms in the same area: `dialog.css:2-10` styles `.kj-dialog-overlay` and `drawer.css:50-58` styles `[data-kj-drawer-container]::before` as scrims, but **neither selector is emitted by any TypeScript** (grep across `packages/*/src` finds zero producers) — dead hand-rolled backdrop CSS left over from a pre-primitive design. And `blurredBackdrop()` sets `class="kj-backdrop kj-backdrop--blur"` (`strategies/backdrop/blurred.ts:4`) but `kj-backdrop--blur` has **no rule anywhere** — the blurred backdrop is visually identical to the solid one.


**Verification corrections (finding upheld at high; split into two).**

**(a) Primary, high — per-component `z-index` breaks the container's DOM-order stacking contract.** Every cited fact reproduces. `.kj-overlay-container` is `position:fixed` + `z-index:var(--kj-overlay-z-index,1000)` (`overlay.css:18-23`) so it *is* the single stacking context; `.kj-overlay-wrapper` (`overlay.css:25-29`) is `position:absolute` with no z-index, transform, opacity or isolation, so it is *not* one, and `createOverlayWrapper()` (`container.ts:35-42`) and `builder.ts` set no inline z-index. Both panel kinds are positioned, so z-index applies to both: `anchored-to.ts:98,177` and `edge-sheet.ts:13` each set `panel.style.position = 'fixed'`. The full broken set (portalled panel → blocking panel): `select.css:63` (100), `combobox.css:48` (100), `tree-select.css:70` (100), `cascade-select.css:46` (200), `date-picker.css:42` (50), `datetime-picker.css:43` (50) versus `drawer.css:16`, `dialog.css:9`, `sheet.css:26`, `popover.css:28`, `dropdown-menu.css:28`, `tooltip.css:28`, `command-palette.css:18`, `color-picker.css:32`, `confirm-popup.css:22`, `toast.css:8` (all 1000). `KjOverlayStack` routes only Escape/outside-click by topmost — it never touches z-index or DOM order — and no spec anywhere asserts z-index or cross-overlay stacking. This is CSS-only with no runtime or data impact, but it is reachable with no opt-out across at least seven components.

**(b) Secondary, low — three pieces of dead overlay CSS**, each verified independently of (a):
- `[data-kj-drawer-container]::before` and its `:has()` override (`drawer.css:50-61`) never render; no TypeScript emits that attribute. `drawer.spec.ts:17,31` still queries it, so those helpers are stale too.
- `.kj-dialog-overlay` (`dialog.css:2-10`) matches nothing in any template or TS file.
- `.kj-backdrop--blur`, applied by `strategies/backdrop/blurred.ts:4`, has no rule anywhere in the repo, so `blurredBackdrop()` renders identically to `solidBackdrop()` — either add the `backdrop-filter` rule to `overlay.css` or delete the strategy.

**Fix:** drop `z-index` from every panel that mounts into the overlay container and let sibling order decide, or have `createOverlayWrapper()` stamp a monotonically increasing z-index on each wrapper. Add a nested-overlay spec asserting a select panel opened inside an open drawer stacks above it. Handle (b) separately.
**Effort:** M

---

### F-5 No focus restoration for dropdown-menu, tree-select, confirm-popup (and menubar's projected submenu) — focus drops to `<body>` on close

**Severity:** high *(upheld during verification; affected-component list corrected)* · **Confidence:** high
**Files:** `packages/core/src/dropdown-menu/dropdown-menu-content.ts:244-256`, `packages/core/src/menubar/menubar.ts:202-305`, `packages/core/src/tree-select/tree-select-content.ts:123`

`restoreFocus()` is only ever called from `controller.beginClose` → `s.focusTrap?.restoreFocus()` (`controller.ts:134`). Of the declarative consumers, **only `kj-popover-content` and `kj-command-palette-dialog` provide a `KJ_OVERLAY_FOCUS_TRAP_STRATEGY`**. dropdown-menu, menubar, select, combobox, cascade-select, tree-select, date-picker, color-picker, tooltip and confirm-popup provide none — so `focusTrap` is `null` and no restore happens.

For the listbox-style ones that keep DOM focus on the trigger and use `aria-activedescendant`, that is fine. For the menus it is not — they move **real DOM focus into the panel**:

```ts
// dropdown-menu-content.ts:247-256 — roving focus follow
effect(() => {
  const item = nav.activeItem();
  const host = item._host();
  if (host && document.activeElement !== host) untracked(() => host.focus());
});
```

On close, `body-portal.onClose` moves the panel out of the container and `beginClose` sets `hidden` on it (`controller.ts:144`) while `document.activeElement` is still inside it. The browser resets focus to `<body>`: the keyboard user loses their place entirely.

**Why it matters:** WCAG 2.1 **2.4.3 Focus Order** and **2.4.7 Focus Visible**; APG's menu-button pattern explicitly requires focus to return to the button on close. The repo targets AAA.


**Verification corrections (finding upheld at high; evidence corrected).**

1. **Remove date-picker** from the "provides none" list — `date-picker-calendar.ts:42-46` *does* provide `KJ_OVERLAY_FOCUS_TRAP_STRATEGY` with `tabCycle({ returnFocus: true })`.
2. **Remove select, combobox, cascade-select and tooltip.** `grep '\.focus('` across those folders finds nothing that moves focus into the panel; they keep focus on the trigger via `aria-activedescendant`, so there is nothing to restore. Their lack of a focus-trap strategy is correct, not a bug.
3. **Fix the menubar citations.** `menubar.ts:202/207/251/305` focus `nav.activeItem()?._host()`, i.e. the top-level `[kjMenubarItem]` buttons in the bar — that is the restore *target*, not panel content. Menubar's real exposure is (a) indirect, because the documented pattern in `packages/components/src/menubar/_examples/menubar.with-submenu.example.ts` composes `kjMenubarItem` + `kjDropdownMenuTrigger` with `<kj-dropdown-menu-content>` and inherits the dropdown-menu defect, and (b) direct at `menubar-item.ts`'s `_ensureStrategiesAttached()`, which calls `attachStrategies({ mount: bodyPortal(), position: anchoredTo(...) })` with no `focusTrap` for the template-projected `[kjDropdownMenu]` path.
4. **Add confirm-popup — the strongest case.** `confirm-popup-content.ts:71` does `requestAnimationFrame(() => this.focusDefault())` and `:108` `target.focus()` into the panel, with no focus-trap provider, so focus drops to `<body>` on close. Its own TSDoc at `confirm-popup-content.ts:20` advertises "outside-click and Escape close, focus restoration", which is untrue and must be corrected alongside the fix. `confirm-popup.spec.ts:300,332` assert focus lands in the panel on open but never assert where it goes on close.

**Corrected scope:** dropdown-menu, tree-select, confirm-popup, and menubar's projected submenu.

**Fix:** have these panels provide `KJ_OVERLAY_FOCUS_TRAP_STRATEGY` (`tabCycle({ returnFocus: true })`, or a restore-only variant that skips Tab cycling for non-modal menus), or make `KjOverlayPanel` default `focusTrap` to a restore-only strategy whenever the consumer provides none. Add a spec asserting `document.activeElement === trigger` after close for each.
**Effort:** M

---

### F-6 Re-opening during the close transition leaks the overlay's stack entry (and its document listeners)

**Severity:** medium *(corrected during verification: was high)* · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/controller.ts:82-128, 151-189`, `packages/core/src/primitives/overlay/stack.ts:44-92`

`close()` performs all of its teardown inside `beginClose`'s deferred `runTransition` callback (`controller.ts:133-148` — `stackHandle.unregister()`, `scrollLock.onClose()`, `position.onClose()`, `mount.onClose()`), while `beginOpen` acquires synchronously (`controller.ts:121-122`). `open()` while `'closing'` calls `cancelTransition()` (`controller.ts:85`), which kills the rAF, the `longest+50ms` safety timeout and the transitionend/animationend listeners (`controller.ts:180-189`), so that callback never runs:

```ts
// controller.ts:82-88
open(): void {
  const cur = this._state();
  if (cur === 'open' || cur === 'opening') return;
  if (cur === 'closing') this.cancelTransition();   // ← close's done() is discarded
  this._state.set('opening');
  this.beginOpen();
}
// controller.ts:122 — beginOpen then overwrites the handle
this.stackHandle = this.stack.register(this.id, { onClose: () => this.close('esc') });
```

Since `KjOverlayStack` entries are removed only through the handle closure (`stack.ts:63-67`), the old `StackEntry` stays in `_stack` for the life of the app, holding a reference to the controller and its panel element, and `maybeRemoveListeners` (`stack.ts:87`) can never remove the capture-phase document `keydown`/`pointerdown` listeners.

**Verification corrections — both original repros are wrong, and the headline scroll-lock consequence is effectively unreachable.**
- **Not via triggers.** Every trigger path goes through `KjOverlayTrigger` → `triggerStrategy.bindToggle(() => controller.toggle())` (`trigger.ts:58`), and `toggle()` (`controller.ts:98-101`) only calls `open()` when the state is exactly `'closed'`; during `'closing'` it calls `close()`, which returns early. **A trigger double-click can never re-open a closing overlay.**
- **Not via the services.** `KjDialog.open()` (`dialog.service.ts:26-61`) builds a brand-new handle, controller and `htmlOverflow()` instance on every call and calls `controller.open()` exactly once; the closing controller is never re-opened. Same for `drawer.service.ts:59-96`, `sheet.service.ts` and `toast.service.ts`. The service-based overlays — the only ones that use `htmlOverflow()` via the builder — are structurally immune.
- **The scroll-lock double-acquire is latent, not live.** `KJ_OVERLAY_SCROLL_LOCK_STRATEGY` is provided in exactly two places (`builder.ts:101` for one-shot service overlays, and `command-palette-dialog.ts:62`). The only component pairing a scroll lock with a reusable controller is `KjCommandPaletteDialog`, whose `onHotkey` trigger goes through `toggle()`. Every declarative overlay that *is* re-openable (popover, dropdown-menu, combobox, select, date-picker) has `scrollLock = null`. Treat it as a hazard for anyone adding a scroll lock to a declarative overlay, not as a live "body scroll never released" bug.

**Actual reachable path:** the components that call `controller.open()` directly, since `isOpen()` is false during `'closing'` (`controller.ts:46`). Best repro — in a combobox, pick an option (`_finishSelect` → `close('programmatic')`, `combobox-root.ts:253`) and type another character within the panel's 140 ms transition (`setQuery` → `controller.open()`, `combobox-root.ts:226`): a ~190 ms window. Same shape at `combobox-root.ts:267`, `tree-select-trigger.ts:75`, `date-picker-trigger.ts:154/178`, `cascade-select-root.ts:188`.

**Actual impact:** a memory + listener leak, one entry per interrupted toggle. Escape/outside-click routing to live overlays is **not** broken — new entries append above the stale one, and the stale entry's `onClose` is a no-op `close()` on an already-closed controller.

**Fix:** in `open()`, release the previous cycle's resources before `beginOpen` — have `cancelTransition()` (or a new `abortPendingClose()`) run `this.stackHandle?.unregister(); this.stackHandle = null; this.strategies?.scrollLock?.onClose?.()` when the interrupted state was `'closing'`; symmetrically, cancelling an `'opening'` transition must not double-release. Also clear `this.rafId = 0` inside the rAF callback (`:160`). Add a controller spec covering close→open within the transition window that asserts `stack.stackSize` returns to 0 after the final close.
**Effort:** M

---

### F-7 `anchoredTo` is RTL-blind, viewport-only, and repositions synchronously on every scroll event

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/strategies/position/anchored-to.ts:124-241`

Four distinct problems in the one positioner every anchored consumer uses:

1. **No RTL.** `align: 'start'` is hard-coded to the left edge:
```ts
// :162-170
if (align === 'start')  left = tRect.left;
if (align === 'end')    left = tRect.right - pRect.width;
```
`KjDirectionality` exists at `packages/core/src/primitives/directionality/directionality.ts:34` and is used elsewhere (e.g. `a11y/roving-tabindex.ts:157`), but the positioner never consults it. In an RTL document every select/menu/popover aligns to the wrong edge.

2. **Collision detection is viewport-only.** `flip`/`shift` compare against `window.innerWidth/innerHeight` (`:146`, `:150-175`) and ignore the nearest scrollable clipping ancestor. An anchored panel inside an `overflow:auto` container (a dialog body, a table cell, a drawer) is clipped rather than flipped. There is also no "detach/close when the anchor scrolls out of view" behaviour — no scroll strategy exists at all in the primitive.

3. **Unthrottled, non-passive, capture-phase scroll handler:**
```ts
// :213-216
onScroll = () => applyManual();
window.addEventListener('scroll', onScroll, true);
```
`applyManual` does `getBoundingClientRect()` on two elements and then writes inline styles — a forced synchronous layout per scroll event on *every* scroll container in the page (capture phase). No `{ passive: true }`, no `requestAnimationFrame` coalescing.

4. **First measurement can be of a hidden panel.** `beginOpen` sets `_state` to `'opening'` (a signal) and immediately calls `position.onOpen()` + `position.update()` (`controller.ts:118-119`), but the panel's `hidden` attribute is removed by a host binding (`panel.ts:45`) that only applies on the next change detection. Under zoneless CD the first `getBoundingClientRect()` therefore reads `0×0`, so the flip decision at `:150-153` is made on a zero-height panel. The `ResizeObserver` at `:219-223` papers over it with a second pass, which is also why panels visibly jump on open.

Also ~70 lines of the file are dead: `supportsCssAnchor()` hard-returns `false` (`:51-56`), so `applyCss`, `clearCss`, `positionAreaFor` and `_anchorIdCounter` (`:49-122`) are unreachable.

**Fix:** inject/accept `KjDirectionality` and mirror `start`/`end` in RTL; compute the clipping rect from the nearest scroll-clipping ancestor instead of the viewport; coalesce `resize`/`scroll` into one `requestAnimationFrame` and register scroll as `{ passive: true }`; have `beginOpen` await one frame (or un-hide the panel imperatively, as `beginClose` already hides it imperatively at `controller.ts:144`) before the first measurement. Delete the CSS-anchor branch or gate it behind a documented feature flag.
**Effort:** L

---

### F-8 No arrow/caret support, and `tabCycle`'s focusable query misses several focusable kinds

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/strategies/focus-trap/tab-cycle.ts:4`, `strategies/position/anchored-to.ts`

**(a)** There is no arrow/caret positioning anywhere in the system — no arrow element, no arrow-offset math, no `placement`-driven arrow transform. `placement` is exposed (`tokens.ts:20`) and set (`anchored-to.ts:180`), but nothing consumes it and no component ships a tooltip/popover arrow. This is a visible feature gap versus CDK/floating-ui that consumers cannot fill without reaching into the panel's inline styles.

**(b)** The focus-trap's focusable selector is incomplete and unfiltered:
```ts
// tab-cycle.ts:4
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
```
Missing: `[contenteditable]`, `audio[controls]`, `video[controls]`, `iframe`, `details > summary`, `area[href]`. And `querySelectorAll` returns elements that are `display:none`, `visibility:hidden`, inside a closed `<details>`, or inside an `inert` subtree — so `els[0]`/`els[els.length-1]` can be invisible, making Shift+Tab wrap to nothing. It also never looks into shadow roots.

**(c)** The trap listens on the panel only (`:49`), so it cannot recover focus that escaped the panel by any route other than Tab from the first/last element (programmatic focus, browser find-in-page, a click on background content that isn't inert). CDK solves this with sentinel anchor elements; this implementation has neither anchors nor a `focusin` guard.

**Fix:** extend the selector, filter with `offsetParent !== null || getClientRects().length` plus a `closest('[inert]')` check, and add focus sentinels or a document-level `focusin` guard for real modality. Add a first-class arrow: expose the resolved `placement` on the panel as `data-side`/`data-align` and accept an `arrowEl` in `anchoredTo` opts to position it along the cross axis.
**Effort:** M

---

### F-9 `inertBased` focus trap inerts the wrong siblings — it is a no-op for portalled overlays

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/strategies/focus-trap/inert-based.ts:11-29`

```ts
onOpen() {
  const panel = ctx.panelEl();
  if (!panel?.parentElement) return;
  for (const sibling of Array.from(panel.parentElement.children)) {
    if (sibling === panel) continue;
    ...el.setAttribute('inert', '');
```

It inerts the panel's **immediate DOM siblings**. But every overlay in this system lives inside a `.kj-overlay-wrapper` whose only other children are the backdrop and the panel — `body-portal.ts:62` (`w.appendChild(panel)`) and `builder.attachComponent` (`builder.ts:137-144`, backdrop + panel into the wrapper's two anchors). So the strategy inerts the backdrop and nothing else. The application root (`<app-root>`, the real background content) is a sibling of `.kj-overlay-container` under `<body>` and is never touched.

Nothing currently uses `inertBased()` (the three services all use `tabCycle`), so this is latent rather than live — but it is exported from `strategies/index.ts:17` as a supported strategy, and `solidBackdrop({ inert: true })` sets `isModal()` → `aria-modal="true"` on the panel (`panel.ts:43, 78`) *without* any actual inerting. Background content is never `inert` and never `aria-hidden` for any overlay in the library.

**Fix:** inert the siblings of the **overlay container**, not of the panel — i.e. walk `getOverlayContainer()!.parentElement.children` and skip the container. Restore on close (already correct). Keep `aria-modal` as the AT story but back it with real `inert` so pointer and keyboard modality match.
**Effort:** S

---

### F-10 Transition duration is measured from the pre-transition state, and only the first duration in a list

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/controller.ts:151-178`

```ts
const cs = panel ? getComputedStyle(panel) : null;
const transitionMs = cs ? parseFloat(cs.transitionDuration) * 1000 : 0;
const animationMs  = cs ? parseFloat(cs.animationDuration)  * 1000 : 0;
```

`runTransition` is called from `beginOpen`/`beginClose` immediately after `_state.set(...)`. `data-state` is a host binding (`panel.ts:44`) applied on the next change detection, so `getComputedStyle` reads the styles of the **previous** state. A stylesheet that defines the duration under `[data-state="open"]` or `[data-state="closing"]` (the normal pattern) measures `0s` on the opening/closing pass, falls into the `longest === 0` branch (`:159`) and resolves on the next rAF — cutting the animation off, since `done()` for close immediately sets `hidden` (`:144`) and un-portals.

Separately, `parseFloat('0.2s, 0.3s')` returns `0.2` — only the first duration of a comma-separated list is considered, so the 50 ms safety margin at `:177` can fire before a longer second property finishes.

There is also no cleanup of `transitionDeadline` / `transitionListener` in `dispose()` — `dispose()` (`:103-112`) calls `close()` (which arms a timeout) and then detaches every strategy synchronously, so the deferred `done()` runs against detached strategies. It happens to be survivable today (each strategy's `detach()` is defensive), but it is an unguarded ordering.

**Fix:** flip the order — set `data-state` imperatively on the panel before measuring (the codebase already does imperative attribute writes at `:144`), or measure on the next animation frame. Use `Math.max(...cs.transitionDuration.split(',').map(parseFloat))` including `transition-delay`. Call `cancelTransition()` at the top of `dispose()`.
**Effort:** S

---

### F-11 `kjMount` on `<kj-dropdown-menu-content>` is read in the constructor and therefore always `'portal'`

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/dropdown-menu/dropdown-menu-content.ts:212-226`

```ts
constructor() {
  const mount = inject(KJ_OVERLAY_MOUNT_STRATEGY) as KjDeferredMount;
  const trigDir = inject(KjDropdownMenuTrigger, { optional: true });
  const m = this.kjMount();          // ← signal input, not yet set
  if (m === 'inline') { ... }
  else if (m === 'point' && trigDir) { ... }
  else { mount.setDelegate(bodyPortal()); position.setDelegate(anchoredTo(...)); }
}
```

Signal inputs are not populated at construction time, so `this.kjMount()` always returns the declared default `'portal'` and the `'inline'` / `'point'` branches are unreachable from the content element. The documented API (`:98-102`, `KjDropdownMenuMount` at `dropdown-menu-trigger.ts:26`) does not work.

The trigger works around the same problem with a raw DOM attribute read in a factory — which is itself a smell and is case-sensitivity-fragile:
```ts
// dropdown-menu-trigger.ts:83-85
const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
const kind = el.getAttribute('kjTrigger') ?? el.getAttribute('kjtrigger');
```

Note the whole `deferredMount`/`deferredPosition` shell (`:52-94`) exists precisely to allow late delegate selection — it just isn't driven from an effect.

**Fix:** move the delegate selection into an `effect()` (the shells already handle `setDelegate` after `attach`/`onOpen` via their `attached`/`opened` flags), matching how `KjPopoverTrigger` drives `switchableTriggerEvent` (`popover-trigger.ts:72-86`). Then drop the `getAttribute` hack in the trigger factory and use `switchableTriggerEvent` there too.
**Effort:** S

---

### F-12 Declarative overlays cannot render a backdrop, so `solidBackdrop` on them is inert configuration

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/builder.ts:136-138`, `packages/core/src/command-palette/command-palette-dialog.ts:54-57`

`KjBackdrop` is instantiated in exactly one place:
```ts
// builder.ts:136-138
if (handle.config.backdrop) {
  wrapper.backdropAnchor().createComponent(KjBackdrop, { injector: handle.injector });
}
```
i.e. only on the service-launched path. `kj-command-palette-dialog` declares a full modal bundle including `solidBackdrop({ inert: true, closeOnClick: true })` — the strategy is injected by `KjOverlayPanel` (`panel.ts:69`) and drives `aria-modal="true"` (`panel.ts:78`), but **no scrim element is ever created**, so `closeOnClick` is dead and the page behind the palette has no visual or pointer barrier (only the global stack `pointerdown` accidentally closes it). Any future declarative modal has the same hole.

**Fix:** have `KjOverlayPanel`'s mount path create the backdrop into the portal wrapper when `KJ_OVERLAY_BACKDROP_STRATEGY` is non-null — e.g. `bodyPortal` returns the wrapper and the panel directive creates `KjBackdrop` as its first child via a `ViewContainerRef`/`createComponent`, torn down in the same place the wrapper is removed.
**Effort:** M

---

### F-13 Overlay container and `KjId` use module-global state and raw `document`, not `DOCUMENT` / `APP_ID`

**Severity:** medium · **Confidence:** medium
**Files:** `packages/core/src/primitives/overlay/container.ts:19-42`, `packages/core/src/primitives/overlay/id.ts:10-17`, `strategies/live-announcer/_announce.ts:15-28`

```ts
// container.ts:19-28
let _root: HTMLElement | null = null;
export function getOverlayContainer(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  ...
  document.body.appendChild(_root);
```

Three consequences:
- **SSR:** the guard is `typeof document === 'undefined'`, not Angular's `DOCUMENT` token / `isPlatformBrowser`. Every other file in the primitive uses `PLATFORM_ID` (`controller.ts:36-37`, `stack.ts:36-37`). In a server process where a DOM shim installs a global `document` (a common setup), `_root` becomes a **module-level singleton shared across requests** — cross-request DOM retention. The same applies to `_announce.ts`'s module-level `regions` map (`:15`) and both scroll locks' module-level `_count`/`_saved` (`html-overflow.ts:3-5`, `css-clip.ts:3-4`).
- **Multiple app instances on one page** share one container (arguably fine) but each gets its own root-injector `KjId`, so both mint `kj-panel-1`, `kj-overlay-1`, … → **duplicate DOM ids** and cross-app `aria-controls` collisions.
- **Id determinism:** `id.ts:7-8` claims stability "across SSR boundaries", but the counter is a single shared sequence consumed by overlays, panels and form fields in creation order. Any `@defer` block, lazy route, or overlay opened before hydration shifts every subsequent id, breaking `id`/`aria-controls` hydration matching. `menubar-item.ts:177` sidesteps `KjId` entirely with its own `_menubarPanelId` counter.

**Fix:** turn the container into an injectable (`providedIn: 'root'`) that takes `DOCUMENT` and `PLATFORM_ID`, so each app instance gets its own root and SSR never touches globals; do the same for the live-region registry and the scroll-lock counters. Seed `KjId` with `inject(APP_ID)` so parallel apps can't collide, and soften the TSDoc claim about SSR determinism (or make it real by deriving ids from a stable structural key).
**Effort:** M

---

### F-14 Consumers hand-write ARIA onto the panel, fighting the panel's own host bindings

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/confirm-popup/confirm-popup-content.ts:85-100`, `packages/core/src/menubar/menubar-item.ts:176-178`

`rules/architecture.md` is explicit: *"ARIA — Always in `host` object. Never via `Renderer2` or direct DOM manipulation."* Two consumers do exactly that, and one of them races the framework:

```ts
// confirm-popup-content.ts:85-90 (and repeated at :95-98)
private promoteRole(): void {
  const panel = this.findPanel();
  panel.setAttribute('role', 'alertdialog');
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('aria-describedby', this.ctx.messageId);
}
```

but `KjOverlayPanel` owns that attribute as a host binding:
```ts
// panel.ts:42-43
'[attr.role]':       'role()',
'[attr.aria-modal]': 'isModal() ? "true" : null',
```
`role()` is a `computed` over a constant (`panel.ts:74, 77`) so Angular will not usually re-write it — but any CD pass that re-evaluates the binding (or a future change making the role reactive) silently reverts `alertdialog` → `dialog`. The promotion is also scheduled in a `queueMicrotask` + `requestAnimationFrame` pair (`:70-73`), so there is a window where AT sees the wrong role. The right fix is a token: `{ provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'alertdialog' }` on the confirm-popup content — the mechanism already exists and every other consumer uses it.

`menubar-item.ts:176-178` similarly stamps `role="menu"` and an id by hand instead of going through `KJ_OVERLAY_PANEL_ROLE` / `KjId`.

**Fix:** confirm-popup provides `KJ_OVERLAY_PANEL_ROLE: 'alertdialog'` and an `aria-describedby` host binding on its own directive; menubar projects through `KjOverlayPanel` (or provides the role token) instead of `setAttribute`.
**Effort:** S

---

### F-15 Speed-dial bypasses the overlay system entirely

**Severity:** low · **Confidence:** high
**Files:** `packages/core/src/speed-dial/speed-dial.ts:89-126`, `packages/core/src/speed-dial/speed-dial-trigger.ts:29-54`

Speed-dial is documented as an overlay-family component (`packages/components/src/speed-dial/`) and advertises menu-button ARIA (`aria-haspopup="menu"`, `aria-expanded`, `aria-controls`) but owns its state with a plain `linkedSignal` and never touches `KjOverlayController`, `KjOverlayStack`, or any strategy. Consequences:

- **No outside-click dismissal at all** — the actions stay fanned out until the trigger is clicked again.
- **Escape only works while focus is on the trigger**: the handler is a host binding on the trigger element (`speed-dial-trigger.ts:36`), so pressing Escape while focus is on an action button does nothing.
- Not in the stack, so a speed-dial open over a dialog and the dialog both respond to the same Escape.

This is the clearest case of the "18 consumers, one primitive" claim not holding. (`time-picker` also appears in the overlay list but is genuinely an inline segmented input, not an overlay — no issue there.)

**Fix:** either register speed-dial with `KjOverlayStack` for Escape/outside-click (minimal change, keeps the inline DOM), or migrate it to `KjOverlayTrigger` + `inPlace()`/`inPlaceSibling()` like `kjMount="inline"` dropdown menus.
**Effort:** M

---

### F-16 Scroll lock is desktop-only: `overflow:hidden` on `<html>` does not lock iOS Safari, and `cssClip` compensates nothing

**Severity:** low · **Confidence:** medium
**Files:** `packages/core/src/primitives/overlay/strategies/scroll-lock/html-overflow.ts:10-20`, `strategies/scroll-lock/css-clip.ts:10-27`

`htmlOverflow` is well built for desktop — it ref-counts and compensates scrollbar width (`:12-19`). But iOS Safari ignores `overflow: hidden` on `<html>`/`<body>` for touch scrolling; the standard workaround is `position: fixed` + preserved `scrollTop` + restore. With a full-screen drawer or sheet open (both use `htmlOverflow`), the page behind still rubber-band scrolls on iPhone and the scroll position is lost on close.

`cssClip` sets `overflow: clip` (`:16`) with **no scrollbar-width compensation at all** — unlike its sibling — so the page shifts horizontally by the scrollbar width every time an overlay using it opens. It is currently unused by any consumer but is exported (`strategies/index.ts:21`).

**Fix:** add an iOS branch to `htmlOverflow` (detect coarse pointer + `maxTouchPoints`, or just always use the fixed-body technique, which is safe everywhere): save `window.scrollY`, set `position:fixed; top:-Ns; width:100%`, restore and `scrollTo` on release. Mirror the scrollbar compensation into `cssClip` or delete it.
**Effort:** M

---

### F-17 `aria-expanded` is stamped on every trigger, including tooltip triggers

**Severity:** low · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/trigger.ts:26-31`, `packages/core/src/tooltip/tooltip-trigger.ts:15-25`

```ts
// trigger.ts:27-30
'[attr.aria-haspopup]': 'ariaHasPopup() ?? null',
'[attr.aria-expanded]': 'isOpen()',
'[attr.aria-controls]': 'panelId() ?? null',
```

`aria-expanded` is unconditional. `KjTooltipTrigger` composes `KjOverlayTrigger` and its strategy reports `ariaHasPopup: null` (`on-hover.ts:121`), so a tooltip trigger ends up with `aria-expanded="false"` and `aria-controls="kj-panel-N"` and **no** `aria-describedby`. Per WAI-ARIA, a tooltip is associated to its trigger with `aria-describedby`; `aria-expanded` on a button that only shows a tooltip is meaningless-to-misleading (WCAG 4.1.2 *Name, Role, Value*), and `aria-controls` has weak AT support for this pattern.

**Fix:** make the ARIA shape strategy-driven — bind `aria-expanded` only when `ariaHasPopup() !== null` (or add an explicit `exposesExpanded` flag to `KjTriggerEventStrategy`), and have the tooltip trigger emit `aria-describedby` pointing at the panel id instead.
**Effort:** S

---

### F-18 A click on the trigger during the close animation is swallowed

**Severity:** low · **Confidence:** medium
**Files:** `packages/core/src/primitives/overlay/controller.ts:98-101`, `packages/core/src/primitives/overlay/stack.ts:106-112`

`pointerdown` (capture, document) fires before `click`. For an open select/popover, clicking the trigger runs `stack.handlePointerDown` → the trigger is outside `contentEl` → `onClose()` → state `'closing'`. Then the trigger's own `click` listener fires `toggle()`:

```ts
// controller.ts:98-101
toggle(): void {
  if (this._state() === 'closed') this.open();
  else this.close('programmatic');   // 'closing' → close() early-returns at :92
}
```

Closing-then-reopening is correctly suppressed, which is the desired behaviour — but the same path means a user who clicks the trigger *while a close animation from some other cause is still running* gets nothing at all. With a 200 ms panel transition this is a reachable dead zone.

**Fix:** let `toggle()` treat `'closing'` as "reopen": `if (state === 'closed' || state === 'closing') this.open(); else this.close(...)` — which requires F-6's cancel-cleanup fix first, otherwise it makes the stack leak easier to hit.
**Effort:** S

---

## Recommended work items

1. **[F-1]** Add an `ngOnDestroy` calling `dispose()` to `KjOverlayController`; add a regression spec asserting `stack.stackSize === 0` and no orphan `.kj-overlay-wrapper` after destroying a fixture with an open popover. *(high, S)*
2. **[F-6, F-18]** Make `cancelTransition()` flush the pending `done()` instead of discarding it; zero `rafId` in the rAF callback; then allow `toggle()` to reopen from `'closing'`. *(medium, M)*
3. **[F-2, F-3]** Introduce a close policy (`closeOnEsc`, `closeOnOutside`, `modal`) carried from `KjOverlayBuilderConfig` / a new DI token into `stack.register`; route the real `KjCloseReason` through `onClose`. Exclude `status`/`alert` roles from modal Escape routing (tooltips stay in the stack — WCAG 1.4.13 requires Escape dismissal). Specs: `alert:true` dialog survives outside click; toast does not steal Escape from a dialog. *(high for F-2 / medium for F-3, M)*
4. **[F-5]** Move focus capture/restore into `KjOverlayController` (or provide a restore-only trap on dropdown-menu, tree-select, confirm-popup and menubar's projected submenu). Spec: open menu → arrow to item 2 → Escape → `document.activeElement === trigger`. *(high, M)*
5. **[F-4]** Strip `z-index` from every overlay panel stylesheet; introduce a single `--kj-overlay-layer` set on the wrapper if layering classes are needed. Delete dead `.kj-dialog-overlay` / `[data-kj-drawer-container]::before` rules; add the missing `.kj-backdrop--blur`. *(high, M)*
6. **[F-7]** `anchoredTo` pass: RTL via `KjDirectionality`, clipping-ancestor collision rects, rAF-coalesced passive scroll/resize, measure after the panel is visible, delete the dead CSS-anchor branch. *(medium, L)*
7. **[F-12, F-9]** Let the declarative path render `KjBackdrop` into the portal wrapper, and fix `inertBased` to inert the container's siblings so `aria-modal` is backed by real inerting. *(medium, M)*
8. **[F-11]** Drive `deferredMount`/`deferredPosition` delegate selection from an `effect()`; replace the `getAttribute('kjTrigger')` hack with `switchableTriggerEvent`. *(medium, S)*
9. **[F-10]** Write `data-state` imperatively before measuring transition duration; parse the max of a comma-separated duration list incl. delay; `cancelTransition()` at the top of `dispose()`. *(medium, S)*
10. **[F-13]** Convert the container, live-region registry and scroll-lock counters to root-provided injectables over `DOCUMENT`/`PLATFORM_ID`; seed `KjId` from `APP_ID`; correct the SSR determinism claim in `id.ts`. *(medium, M)*
11. **[F-14]** Replace `setAttribute` ARIA in confirm-popup and menubar with `KJ_OVERLAY_PANEL_ROLE` + host bindings, per `rules/architecture.md`. *(medium, S)*
12. **[F-8]** Extend and filter the focusable selector; add focus sentinels or a `focusin` guard; ship first-class arrow support driven by the already-exposed `placement` signal. *(medium, M)*
13. **[F-17]** Gate `aria-expanded` on `ariaHasPopup !== null`; wire tooltip triggers with `aria-describedby`. *(low, S)*
14. **[F-15]** Register speed-dial with `KjOverlayStack` (or migrate it to the trigger/panel primitives) so it gets Escape and outside-click. *(low, M)*
15. **[F-16]** iOS-safe body scroll lock (`position:fixed` + scroll restore); scrollbar compensation in `cssClip` or delete it. *(low, M)*
16. **Docs drift:** `rules/architecture.md` still names a `KjOverlayService` that does not exist and prescribes `afterNextRender()` for SSR safety where the code uses `PLATFORM_ID`. Update the rule to describe the actual builder/controller/strategy architecture.

## Open questions

1. **Is stack participation meant to be universal?** `controller.ts:122` registers every overlay unconditionally. Was the intent "everything dismissible participates" (in which case F-3 needs a modal/non-modal split) or "only modals"? The `KjOverlayRegistration` interface already has the fields for either answer.
2. **Was `inertBased()` ever exercised?** Nothing consumes it and its semantics only make sense for the pre-portal, in-place design. Should it be fixed (F-9) or deleted?
3. **CSS Anchor Positioning** — `supportsCssAnchor()` is hard-disabled with a comment about Chrome `span-*` inconsistencies. Is the dead branch being kept for a near-term retry, or is manual math the permanent answer? If permanent, ~70 lines should go.
4. **Clipping-container collision** — is anchoring inside a scrollable container (select inside a dialog body, popover inside a table) a supported scenario? If yes, F-7(2) is higher than medium.
5. **`KjOverlayHandle.destroy()` vs. `queueMicrotask`** — all three services (`dialog.service.ts:56`, `drawer.service.ts:92`, `sheet.service.ts:108`) defer `handle.destroy()` by a microtask after the close transition already completed. Is the microtask load-bearing for `afterClosed$` ordering, or vestigial? It widens the window in which a disposed controller's deferred callbacks can still run.
6. **Multiple Angular apps / micro-frontends on one page** — is that a supported target? The answer decides whether F-13's `APP_ID` seeding and per-app container are required or merely nice.
7. **Is a `close-on-scroll` / `reposition` scroll strategy wanted?** CDK ships four; this system ships an implicit "always reposition". For a select anchored to a row in a virtualised table, "close on scroll" is usually the better default.
