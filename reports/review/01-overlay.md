# Overlay System Review

## Verdict

The overlay primitive is well factored — a strategy-per-concern design (`mount` / `position` / `backdrop` / `focusTrap` / `scrollLock` / `liveAnnouncer` / `trigger`), a single `KjOverlayStack` that owns Escape routing, outside-click routing and z-index assignment, one lazily created body-level container, and a per-overlay wrapper that is its own stacking context. The recent work (`--kj-overlay-z` + `applyOverlayZIndex`, `KjDismissPress`, the `isConnected` guard in `handlePointerDown`) genuinely fixed nested stacking and the retargeted-click dismissal bug; those paths are correct now and well tested. But the strategy bus is wired incompletely: `KjOverlayController.beginOpen()` never calls `focusTrap.onOpen()`, and `tabCycle()` puts *all* of its behaviour there — so every modal in the kit (dialog, drawer, sheet, action-sheet, command-palette-dialog) ships with no Tab containment and no focus restoration, while its own docs and `aria-modal="true"` promise both. Close policy has the same shape of gap: `closeOnEsc` / `closeOnOutside` are accepted at three public API levels and never reach `stack.register`. And the controller has a `dispose()` that only two of ~20 call sites invoke, so a declarative overlay destroyed while open strands its stack entry, its scroll lock and its scroll/resize listeners until the user's next click cleans them up. The engine is sound; the wiring between the engine and its consumers is where the defects are. **Grade: C−.**

> **Verification pass applied.** F-1 was corrected critical → high; F-2, F-3 and F-4 high → medium. Each correction is folded into the finding under "Verification correction", with the withdrawn claims named explicitly. Nothing was refuted outright in this dimension.

## What works

- **Nested stacking is correct.** `KjOverlayStack.nextZIndex` (`packages/core/src/primitives/overlay/stack.ts:175-181`) takes `max(zIndex) + 1` over all open entries, never the count, so a middle overlay closing cannot make a later one sink below an earlier one. `applyOverlayZIndex` (`stack.ts:59-68`) stamps both the panel (`--kj-overlay-z`) and its `.kj-overlay-wrapper` (inline `z-index`), turning each wrapper into a per-overlay stacking context. Traced end-to-end: a drawer (builder → `<kj-overlay-wrapper>` at 1000) with a select opened inside it (`bodyPortal` → `createOverlayWrapper()` sibling at 1001) paints the select above the drawer. Covered by `stack.spec.ts:75-132` and `controller.spec.ts:89-130`.
- **Ordering around the z-stamp is right.** `beginOpen` runs `mount.onOpen()` (which portals the panel into the wrapper) *before* `applyOverlayZIndex` (`controller.ts:126` vs `:136`), and `beginClose` runs `clearOverlayZIndex` *before* `mount.onClose()` un-portals (`controller.ts:148` vs `:161`), so `panel.parentElement` is the wrapper in both directions.
- **Escape is routed to the topmost only** — `stack.ts:202-207` reads `topmost()` and nothing else. Tested at `stack.spec.ts:14-26`.
- **The retargeted-click dismissal fix is real and well reasoned.** `KjDismissPress` (`dismiss-press.ts`) plus the `target.isConnected` guard in `stack.ts:209-219` correctly distinguish "the press began here" from "the click landed here because its original target was re-rendered away". 10 tests in `dismiss-press.spec.ts`.
- **Scroll-lock refcounting is sound.** `html-overflow.ts:7-34` refcounts globally, saves/restores the previous `overflow` and `padding-right`, compensates the scrollbar width, and the per-instance `released` flag makes double-release a no-op. `detach()` releases too (`:42`).
- **No-CDK policy is honoured and justified.** `rules/stack.md:8-11` forbids CDK / floating-ui; nothing in `packages/core/src/primitives/overlay/**` imports either. The hand-rolled replacement is a genuine equivalent in structure (strategy tokens, portal container, stack coordinator), not a stub — the gaps below are wiring bugs, not "we should have used CDK".
- **SSR guards are consistent**: `container.ts:27`, `stack.ts:119/149/166`, `controller.ts:167`, every strategy's `ctx.platform.isBrowser` check, `_announce.ts:31`.

## Findings

### F-1 Overlay controller never invokes `focusTrap.onOpen` / `onClose` — Tab escapes every modal and focus is never returned

**Severity:** high *(corrected during verification: was critical)* · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/controller.ts`, `packages/core/src/primitives/overlay/strategies/focus-trap/tab-cycle.ts`, `packages/core/src/primitives/overlay/strategies/focus-trap/inert-based.ts`, `packages/core/src/primitives/overlay/panel.ts`

`beginOpen` (`controller.ts:123-141`) drives `mount` / `position` / `backdrop` / `scrollLock` and nothing else; `beginClose` (`:143-164`) is the mirror image. `s.focusTrap?.onOpen?.()` and `s.focusTrap?.onClose?.()` are called **nowhere in the repo** — a grep across `packages/core` and `packages/components` finds no other call site (`panel.ts` only *attaches* the strategy; `popover-content.ts:38` only calls `configure()`).

```ts
// controller.ts:123-141
  private beginOpen(): void {
    if (!this.strategies) return;
    const s = this.strategies;
    s.mount.onOpen?.();
    s.position.onOpen?.();
    s.position.update();
    s.backdrop?.onOpen?.();
    s.scrollLock?.onOpen?.();
    this.stackHandle = this.stack.register(this.id, { onClose: () => this.close('esc') });
    ...
    this.runTransition('open', () => {
      this._state.set('open');
      s.focusTrap?.focusFirst();      // ← :139, wired
    });
  }
```

Stated precisely, because the shape of the bug matters for the fix:

1. **Initial focus DOES work.** `focusFirst()` is called at `controller.ts:139` and `restoreFocus()` at `controller.ts:147`. Only the two lifecycle hooks are dead.
2. **`tabCycle` puts *all* of its stateful work in `onOpen`**, so the dead hook takes both behaviours with it:

```ts
// tab-cycle.ts:35-50
    onOpen() {
      if (!isEnabled()) return;
      if (!ctx?.platform.isBrowser) return;
      const panel = ctx.panelEl();
      if (!panel) return;
      returnTarget = (document.activeElement as HTMLElement) ?? null;   // ← only assignment
      keyListener = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        ...
      };
      panel.addEventListener('keydown', keyListener);                    // ← only registration
    },
```

   The Tab `keydown` listener is never installed, so Tab from the last control inside a modal walks straight into the page behind it. And `returnTarget` has exactly one assignment site (`tab-cycle.ts:40`), so it stays `null` and the `restoreFocus()` the controller *does* call at `:147` is a permanent no-op:

```ts
// tab-cycle.ts:77-80
    restoreFocus() {
      if (!isEnabled()) return;
      if (opts.returnFocus !== false) returnTarget?.focus();
    },
```

**Affected:** every consumer that configures a `tabCycle(...)` bundle — `dialog.service.ts:34`, `drawer.service.ts:67`, `sheet.service.ts:82` (hence `KjActionSheetService`), `command-palette-dialog.ts:59-61`, and also `popover-content.ts:22` (the `kjTrap` path) and `date-picker-calendar.ts:45`, which the original write-up omitted.

**Separate, co-located gap — nothing ever applies `inert` to siblings.** `solidBackdrop({ inert: true })` reaches `panel.ts:78` only to emit `aria-modal="true"`; `backdrop.inertSiblings` has no other consumer, and `inertBased()` is referenced nowhere outside its own spec. Wiring the two lifecycle hooks does **not** make `aria-modal="true"` honest, because `tabCycle` contains no inert logic at all. Track it as its own item (or an explicit sub-item of this one): modal panels currently advertise modality over a non-inert, non-trapping container, which actively misleads AT — the screen reader hides the background while the keyboard does not.

**Docs promising what the code does not deliver:** `packages/components/src/dialog/dialog.ts:18` and `:32-33` ("Tab — Cycles focus within the dialog", "returned to the triggering element on close (`returnFocus: true`)", "Siblings outside the dialog are marked `inert`"), plus `drawer.ts:42` and `sheet.ts:40`.

**Why it matters:** WCAG 2.1 AAA is the stated target (`CLAUDE.md`). This breaks 2.4.3 Focus Order and the WAI-ARIA APG dialog pattern for every modal surface in the kit.

**Verification correction (critical → high).** Every quoted line was re-checked at HEAD and reproduces; nothing in `fd6dd34e..HEAD` touches it. The specs miss it by construction — `tab-cycle.spec.ts` invokes `s.onOpen!()` by hand, and `controller.spec.ts`'s stub strategy bundle omits `focusTrap` entirely. Two framing errors in the original write-up resize the finding rather than refute it: `focusFirst()` *is* wired so initial focus works, and the missing inert-siblings behaviour is a separate defect rather than a consequence of the dead hooks. The impact is keyboard and AT semantics across every modal, with no crash, no data loss and no loss of basic operability — Escape still closes via the stack. That is high, not critical.

**Fix:**
- `beginOpen`: add `s.focusTrap?.onOpen?.()` alongside `s.scrollLock?.onOpen?.()`; `beginClose`: add `s.focusTrap?.onClose?.()` in the close chain, *before* `restoreFocus()` so the Tab listener is off first. One line each.
- Give `controller.spec.ts` a stub bundle that includes a `focusTrap` so the hook ordering is pinned by a test, and add a dialog-level test asserting focus returns to the trigger.
- Separately, wire real inerting (fix `inertBased()` to inert the *overlay container's* siblings rather than `panel.parentElement.children`, or fold inert-setting into `tabCycle`) so `solidBackdrop({ inert: true })` and `aria-modal="true"` mean something.
- Also add `s.liveAnnouncer?.onOpen/onClose` and `s.trigger?.onOpen/onClose`, which are skipped by the same omission.

**Effort:** M

---

### F-2 `closeOnEsc` / `closeOnOutside` are declared on the builder and service APIs but never reach `KjOverlayStack`

**Severity:** medium *(corrected during verification: was high)* · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/controller.ts`, `packages/core/src/primitives/overlay/builder.ts`, `packages/core/src/primitives/overlay/wrapper.ts`, `packages/core/src/primitives/overlay/backdrop.ts`, `packages/core/src/dialog/dialog.service.ts`, `packages/core/src/drawer/drawer.service.ts`, `packages/core/src/sheet/sheet.service.ts`

`KjOverlayStack` supports the policy and is tested for it (`stack.spec.ts:46-54`), but `KjOverlayController.beginOpen` registers with only a callback, so both flags fall back to `true` for **every** overlay built through `KjOverlayBuilder`:

```ts
// controller.ts:131
    this.stackHandle = this.stack.register(this.id, { onClose: () => this.close('esc') });
```

```ts
// stack.ts:124-128
      opts: {
        onClose: opts.onClose,
        closeOnEsc: opts.closeOnEsc ?? true,
        closeOnOutside: opts.closeOnOutside ?? true,
      },
```

`KjOverlayBuilderConfig` declares both (`builder.ts:29-30`) and `create()` (`builder.ts:93-121`) never reads either. `KjDialogOpenOptions.closeOnEsc` (`dialog.service.ts:16`) is declared and referenced nowhere else in the repo (grep-confirmed across `packages/`). The only option that *is* consumed is `closeOnOutside`, and only as the backdrop's `closeOnClick`:

```ts
// dialog.service.ts:30-33
      backdrop: solidBackdrop({
        inert: true,
        closeOnClick: !alert && (opts.closeOnOutside ?? true),
      }),
```

The identical one-way mapping exists at `drawer.service.ts:65` and `sheet.service.ts:80`.

That mapping does not hold either. `wrapper.ts:30-33` makes the `<kj-backdrop>` a **sibling** of the panel while `markContentEl` is given the *panel* (`controller.ts:133`), so a backdrop press fails `top.contentEl.contains(target)` at `stack.ts:218`; and the stack's document-level capture `pointerdown` listener (`stack.ts:186`) runs before `KjBackdrop.onClick` (`backdrop.ts:48-51`), so `closeOnClick: false` is defeated before the backdrop's own handler can honour it. `KjDismissPress` / commit `e6aa28a5` (#73) fixed the *retargeted-click* case and does not guard this path.

Net effect at HEAD. The defaults (`true` / `true`) are the intended behaviour, so ordinary dialogs, drawers and sheets behave correctly. Every explicit **opt-out** is silently ignored:
- `KjDialog.open(Cmp, { alert: true })` — an `alertdialog`, whose whole point is that it must be answered — still closes on Escape *and* on a backdrop press.
- `KjDialog.open(Cmp, { closeOnOutside: false })` still closes on a backdrop press; same for drawer and sheet.
- `KjDialog.open(Cmp, { closeOnEsc: false })` has no effect whatsoever.

The same line also mislabels the close reason: stack-driven dismissals always report `'esc'`, even for an outside press (F-11).

**Why it matters:** a destructive-confirmation `alertdialog` that Escape dismisses is a data-loss footgun, and it is the documented behaviour of the option that it should not be.

**Verification correction (high → medium).** The mechanism reproduces line-for-line at HEAD, and nothing covers it: `dialog.spec.ts` has no Escape or outside-press test, and `stack.spec.ts:46` exercises the flags only on a hand-made registration. Severity drops because the *defaults* are what the library wants, so no default-configured overlay misbehaves; only opt-outs no-op, and the fix is one line at `controller.ts:131`. Two corrections to the original text: the scope was under-reported (drawer and sheet have the identical gap, now listed above), and the claim that this is why `<kj-command-palette>` "forked the primitive" is **withdrawn** — the palette never uses `KjOverlayController` or `KjOverlayBuilder` at all. It is a template-declared component that registers with the stack for ordering / z-index only and keeps its own Escape and outside handlers by design, as the comment in its `portalIn()` states. F-6 stands on its own evidence.

**Fix:** carry the policy on the controller. Add `closeOnEsc` / `closeOnOutside` to `KjOverlayStrategies` (or a `configureClosePolicy()` the panel directive can call), have `builder.create()` forward `config.closeOnEsc` / `config.closeOnOutside`, and pass them at `controller.ts:131`. Derive the close reason from the originating stack handler rather than hard-coding `'esc'`. Then pick one owner for outside-press — the stack *or* the backdrop, not both, since today the stack always pre-empts `KjBackdrop`'s press-ownership logic. Tests: an `alert: true` dialog survives Escape and a backdrop press; a drawer opened with `closeOnOutside: false` survives a backdrop press.

**Effort:** M

---

### F-3 Declarative overlays never dispose their controller on host destroy, leaving an orphan stack entry until the next user gesture

**Severity:** medium *(corrected during verification: was high)* · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/controller.ts`, `packages/core/src/primitives/overlay/wrapper.ts`, `packages/core/src/menubar/menubar-item.ts`, `packages/core/src/primitives/overlay/strategies/position/anchored-to.ts`, `packages/core/src/primitives/overlay/strategies/trigger/on-hover.ts`, `packages/core/src/command-palette/command-palette-dialog.ts`

`KjOverlayController.dispose()` (`controller.ts:112-121`) is the only teardown path, and it is *not* an `ngOnDestroy` — Angular will never call it for a provider on an element injector, and the class injects no `DestroyRef`. Repo-wide there are exactly two callers:

```
packages/core/src/primitives/overlay/wrapper.ts:48:    inject(DestroyRef).onDestroy(() => this.controller.dispose());
packages/core/src/menubar/menubar-item.ts:158:      try { this.controller.dispose(); } catch { /* already disposed */ }
```

`wrapper.ts` covers only builder-launched overlays (dialog / drawer / sheet / toast). The ~13 declarative consumers that provide `KjOverlayController` on their own host directive — `popover-trigger.ts:42`, `tooltip-trigger.ts:19`, `dropdown-menu-trigger.ts:75`, `select-root.ts:54`, `combobox-root.ts`, `cascade-select-root.ts`, `tree-select-root.ts`, `date-picker-trigger.ts`, `confirm-popup.ts`, `color-picker.ts`, `command-palette-dialog.ts:51` — hook nothing. `KjOverlayPanel` and `KjOverlayTrigger` have no destroy hook either (`grep DestroyRef packages/core/src/primitives/overlay/` returns only `wrapper.ts`). No guard, base class or test covers destroy-while-open, and nothing in `fd6dd34e..HEAD` addresses it.

Destroying a host while its overlay is open (route change, `@if` flipping, a list row removed) therefore skips the whole strategy detach chain. What actually happens next:

- The orphaned stack entry was registered with `closeOnOutside` / `closeOnEsc` defaulting to `true` (`stack.ts:126-127`, and see F-2), and its `contentEl` now contains nothing. So **the next document `pointerdown` anywhere — or Escape — closes it**, and `beginClose` runs the full `onClose` chain with the strategies still non-null: the `html-overflow` refcount is released, `anchoredTo.onClose` removes the `window` scroll/resize listeners and disconnects the `ResizeObserver`, `bodyPortal.onClose` removes the orphan wrapper, and `stackHandle.unregister()` pops the entry and uninstalls the document listeners. (`runTransition` still completes against the detached panel because `parseFloat('')` is `NaN`, so the safety `setTimeout(NaN)` fires immediately.)
- Until that gesture: the page stays scroll-locked if the destroyed overlay held a lock (`KjCommandPaletteDialog` provides `htmlOverflow()` at `command-palette-dialog.ts:62`), the global capture `keydown` / `pointerdown` listeners stay installed, and the orphan `<div class="kj-overlay-wrapper">` stays painted over the new route.
- That next gesture is **swallowed by the dead overlay** instead of reaching the app.

**The strongest case is the one the original write-up buried.** `on-hover.ts:139-140` clears `openTimer` / `closeTimer` only in `detach()`. Destroying a tooltip trigger with a pending `openDelay` fires `toggle()` on the dead controller, and `bodyPortal.onOpen` re-attaches the Angular-destroyed panel element into a live wrapper — a visible ghost tooltip that nothing owns.

**Why it matters:** in any app that mounts overlays inside routed views, routing away with a popover, dropdown or command palette open leaves a stale panel over the new page, eats the user's next click, and — for the command palette — leaves the page unscrollable until that click.

**Verification correction (high → medium).** Every quoted line checks out verbatim at HEAD: `dispose()` has no `ngOnDestroy` / `DestroyRef`, the two callers are the only ones repo-wide, all 13 declarative controller-providers have zero destroy hooks, `anchored-to.ts:242` is `detach() { ctx = null; }` with listeners and the `ResizeObserver` torn down only in `onClose` (`:232-236`), and `command-palette-dialog.ts:51`/`:62` provide both the controller and `htmlOverflow()`, whose refcount (`html-overflow.ts:3`) releases only in `onClose` / `detach`. The gap is real. But two consequences claimed originally are **withdrawn**: "permanently unscrollable page … for the rest of the session", and "re-running `applyManual` on every page scroll for the rest of the session". Both end at the user's very next click, not at the end of the session, because the orphan's own default-`true` dismiss flags make it self-clean. Severity drops accordingly.

**Fix:** give `KjOverlayController` an `ngOnDestroy` that calls `dispose()` — providers on an element injector get it for free — which covers all 13 consumers at once and lets `menubar-item.ts:156-158` drop its manual hook. Then fix the ordering inside it: `dispose()` currently calls `close()`, whose cleanup runs in `runTransition`'s deferred callback, *after* the synchronous `detach()` loop; make the destroy path tear down synchronously (`cancelTransition()`, unregister the handle, `scrollLock.onClose()`, `mount.onClose()`). Optionally make `anchoredTo.detach()` and `onHover.detach()` idempotently run their own `onClose` teardown. Test: open a declarative overlay, destroy the fixture, assert `stack.stackSize === 0`, no orphan `.kj-overlay-wrapper`, and `document.documentElement.style.overflow === ''` — **without** an intervening click.

**Effort:** M

---

### F-4 Overlay-based toasts register as ordinary dismissible stack entries; the builder's `closeOnEsc` / `closeOnOutside` are never forwarded

**Severity:** medium *(corrected during verification: was high)* · **Confidence:** high
**Files:** `packages/core/src/toast/toast.service.ts`, `packages/core/src/primitives/overlay/controller.ts`, `packages/core/src/primitives/overlay/stack.ts`, `packages/core/src/primitives/overlay/builder.ts`, `packages/core/src/primitives/overlay/backdrop.ts`

`beginOpen` registers unconditionally and with the stack's permissive defaults (`controller.ts:131` → `stack.ts:126-127`) — there is no notion of a transient or non-dismissible overlay posture — and `KjOverlayBuilderConfig.closeOnEsc` / `closeOnOutside` (`builder.ts:29-30`) are accepted but never passed to `stack.register` (F-2). Toasts go through the builder like any modal:

```ts
// toast.service.ts:158-167
    const handle = this.builder.create({
      mount: inPlace(),
      position: corner({ position: opts.position ?? 'bottom-right' }),
      backdrop: null,
      focusTrap: null,
      scrollLock: null,
      ...
    });
```
```ts
// toast.service.ts:169-171
    if (opts.component) {
      this.builder.attachComponent(handle, opts.component, { data: opts.data });
    }
```
```ts
// toast.service.ts:201
    handle.controller.open();
```

**Scope — this is the overlay toast API only.** `show(opts)` and the `success` / `info` / `warn` / `error` sugar take the `openOverlay` path. The string / template queue API (`toast.show('…', …)` → `enqueue()`) never opens an overlay at all, and all three shipped examples (`toast.example.ts:215-236`, `toast.finance.example.ts:141-157`, `toast.retro.example.ts:131-138`) use that path. Nothing outside `toast.spec.ts` exercises the overlay path.

Consequences, for up to the toast's lifetime (4000 ms default, `KJ_TOAST_SONNER_STRATEGY`):

1. **Escape goes to the toast.** The toast is the newest stack entry, so `stack.handleKeydown` (`stack.ts:202-207`) routes Escape to it. With a dialog open, one Escape press dismisses the invisible toast overlay and leaves the dialog up.
2. **The dialog's backdrop swallows one press.** `KjBackdrop.onPress` bails when the overlay is not topmost:
   ```ts
   // backdrop.ts:44
       if (this.controller && !this.controller.isTopmost()) return;
   ```
3. **A panel-less toast entry is dismissed by any pointerdown — and that heals the stack.** `toast.success({ message })` has no `opts.component`, so `attachComponent` is skipped, `bindPanel` (`builder.ts:148`) never runs, `markContentEl` is skipped (`controller.ts:133`), and the entry keeps `contentEl: null` — which makes `stack.ts:218` fall through to `onClose()` for *every* pointerdown on the page. Because closing also unregisters the entry, the stack self-heals after that first press: only the first Escape and the first outside press are lost, not the ones that follow.

`stack.ts:96-97` claims "Toasts are not part of the stack — they live in their own layer above it (`--kj-toast-z-index`, default `2000`)". For the overlay path that is false twice over: they *are* registered, and their panel's `z-index: var(--kj-toast-z-index, 2000)` (`toast.css:8`) is confined inside the wrapper's inline stack level, so a dialog opened after a toast paints over it (see F-10).

**Verification correction (high → medium), with two claims withdrawn.**

- **"A toast dies on the first click anywhere" is wrong on the dominant path.** With no `opts.component` the overlay wrapper renders nothing; the toast the user sees is rendered by `<kj-toast-viewport>` from `toasts()` (pushed at `toast.service.ts:185` on both paths). The stack closing the overlay never calls `KjToastService.dismiss`, so the visible toast and its timer are untouched. What closes is invisible.
- **The tooltip half is withdrawn entirely.** WAI-ARIA APG and WCAG 1.4.13 both require Escape to dismiss a tooltip, so a tooltip taking Escape ahead of the dialog under it is the *correct* ordering; tooltips bind their panel through `KjOverlayPanel`, so their `contentEl` is set and outside-click routing is right; and `onHover` uses `closeDelay: 0` with `pointerleave` (`on-hover.ts:112-117`), so the tooltip is already closing before a pointer that left the trigger can reach a dialog scrim.
- **Blast radius is narrower than "a toast is on screen is a normal state".** No example or doc in the repo uses the overlay toast path. Default duration is 4000 ms, not ~5 s.

What remains is real but transient and self-healing: one swallowed Escape and one swallowed scrim press inside a ≤4 s window, on an API path nothing currently exercises. Medium.

**Fix:** plumb `closeOnEsc` / `closeOnOutside` from `KjOverlayBuilderConfig` through `controller.open` into `stack.register` (F-2), and have `KjToastService.openOverlay` pass `false` for both — a toast should consume neither Escape nor outside clicks. Separately, either skip stack registration entirely for panel-less overlays or treat `contentEl: null` as "not dismissible by outside click" in `stack.handlePointerDown`; and route `success` / `info` / `warn` / `error` calls with no `opts.component` to `enqueue()` rather than building an empty overlay. Add a stack/toast spec asserting that with a dialog open and a toast showing, Escape closes the dialog and a scrim press dismisses it.

**Effort:** M

---

### F-5 `data-side` is never written, so every popover / tooltip arrow is unpositioned

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/panel.ts`, `packages/core/src/primitives/overlay/strategies/position/anchored-to.ts`, `packages/components/src/popover/popover.css`, `packages/components/src/tooltip/tooltip.css`

`anchoredTo` computes the resolved placement and exposes it as a signal (`anchored-to.ts:180` `_placement.set({ side: resolvedSide, align })`, surfaced as `placement` at `:200`), but nothing reads it. `KjOverlayPanel`'s host bindings are:

```ts
// panel.ts:40-46
  host: {
    '[id]':                  'panelId',
    '[attr.role]':           'role()',
    '[attr.aria-modal]':     'isModal() ? "true" : null',
    '[attr.data-state]':     'state()',
    '[attr.hidden]':         'state() === "closed" ? "" : null',
  },
```

No `data-side`. `grep -rn "data-side" packages/core/src packages/components/src` finds only comments and the CSS consumers. The arrow rules are all side-scoped:

```css
/* packages/components/src/popover/popover.css:52 */
  .kj-popover-content[data-side="top"]    .kj-popover-arrow { bottom: calc(var(--kj-popover-arrow-size) / -2); left: 50%; ... }
```

None of them can ever match, so `.kj-popover-arrow` keeps only the base rule (`popover.css:43-50`: `position: absolute` with no offsets) and renders at the panel's static position instead of on the anchored edge. Same for `.kj-tooltip-arrow` (`tooltip.css:49-52`). `packages/components/src/tooltip/tooltip.ts:64` documents `data-side — Mirrors the resolved placement for theme/arrow hooks`.

**Fix:** have `KjOverlayPanel` read `KJ_OVERLAY_POSITION_STRATEGY.placement` and bind `'[attr.data-side]': 'placement()?.side ?? null'` and `'[attr.data-align]': 'placement()?.align ?? null'`. Test: open a popover with `kjSide="right"`, assert the host carries `data-side="right"` and flips to `"left"` when the strategy flips.

**Effort:** S

---

### F-6 The styled `<kj-command-palette>` bypasses the overlay primitive and is not an accessible modal

**Severity:** medium · **Confidence:** high
**Files:** `packages/components/src/command-palette/command-palette.ts`

There are two command palettes. `KjCommandPaletteDialog` (core) composes the primitive properly. The styled component that every documented example uses does not: it renders its own shell + scrim, portals itself, and talks to `KjOverlayStack` directly — no `KjOverlayController`, no focus-trap strategy, no scroll-lock strategy:

```ts
// command-palette.ts:376-382
    this.stackHandle = this.stack.register(this.stackId, {
      onClose: () => this.close(),
      closeOnEsc: false,
      closeOnOutside: false,
    });
    this.stack.markContentEl(this.stackId, this.dialog()?.nativeElement ?? shell);
    applyOverlayZIndex(shell, this.stackHandle.zIndex);
```

`grep -n "Tab\|focusTrap\|inert" packages/components/src/command-palette/command-palette.ts` matches exactly one line — a doc comment (`:134`). The template hard-codes `role="dialog" aria-modal="true"` (`:169-170`) over a background that is neither `inert` nor `aria-hidden`, Tab is uncontained, the page scrolls behind the modal, and focus is not restored to the trigger on close. `@doc-a11y` at `:133-139` asserts the opposite ("an inert siblings posture while open", "restores focus to the trigger").

Initial focus is also resolved globally rather than within the instance:

```ts
// command-palette.ts:306-308
      queueMicrotask(() => {
        document.querySelector<HTMLInputElement>('.kj-command-palette__dialog .kj-command-palette__input')?.focus();
      });
```

Two palettes on a page and the wrong one gets focus.

(*Corrected during verification:* the earlier framing — that the palette forked the primitive *because* it is the only consumer needing `closeOnEsc: false` — does not hold. The component never touches `KjOverlayController` or `KjOverlayBuilder` at all; it registers with the stack purely for ordering and z-index, as the comment in its `portalIn()` says, and owns its Escape / outside handling by design. Fixing F-2 makes a rebuild on the primitive *possible*; it is not what caused the fork.)

**Fix:** after F-1 and F-2 land, rebuild `<kj-command-palette>` on `KjOverlayController` + `KjCommandPaletteDialog`'s strategy bundle (portal mount, `tabCycle({ initialFocus: 'first', returnFocus: true })`, `htmlOverflow()`), and replace the global `querySelector` with `viewChild('searchInput')`. If the fork must stay short-term, at minimum add a Tab handler scoped to `this.dialog()` and a scroll lock.

**Effort:** L

---

### F-7 Unthrottled, non-passive scroll repositioning with a forced synchronous layout per event

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/strategies/position/anchored-to.ts`

```ts
// anchored-to.ts:213-223
      onResize = () => applyManual();
      onScroll = () => applyManual();
      window.addEventListener('resize', onResize);
      window.addEventListener('scroll', onScroll, true);
      const trigger = opts.trigger ? opts.trigger() : ctx.triggerEl();
      const panel = ctx.panelEl();
      if (typeof ResizeObserver !== 'undefined' && trigger && panel) {
        resizeObserver = new ResizeObserver(() => applyManual());
        resizeObserver.observe(trigger);
        resizeObserver.observe(panel);
      }
```

`applyManual` writes `panel.style.width` / `minWidth` and then immediately reads `panel.getBoundingClientRect()` (`anchored-to.ts:139-145`), forcing a synchronous layout on every one of those events. The listener is registered in capture on `window`, so it fires for scrolls in *every* scroll container on the page, not just ancestors of the trigger, and it is not `{ passive: true }`. Every open select / combobox / date-picker / tooltip adds one of these.

There is also no clipping-ancestor handling: `shift` clamps only to the viewport (`anchored-to.ts:172-175`), so a panel anchored to a trigger inside a scrolled `overflow: hidden` container keeps rendering at the trigger's last viewport position after the container scrolls it out of view, instead of detaching or repositioning.

**Fix:** coalesce into one `requestAnimationFrame` (drop duplicate invalidations within a frame), register the scroll listener as `{ capture: true, passive: true }`, and split `applyManual` into a measure phase and a write phase so the rect read happens before any style write. Longer term, only listen on the trigger's actual scrollable ancestors (`overflow` walk) and add a `hide`/`detach` behaviour when the anchor leaves its clipping ancestor.

**Effort:** M

---

### F-8 The panel is measured while `[hidden]` is still applied on first open

**Severity:** medium · **Confidence:** medium
**Files:** `packages/core/src/primitives/overlay/controller.ts`, `packages/core/src/primitives/overlay/panel.ts`

`open()` sets `_state` to `'opening'` and calls `beginOpen()` synchronously; `beginOpen` positions immediately:

```ts
// controller.ts:126-128
    s.mount.onOpen?.();
    s.position.onOpen?.();
    s.position.update();
```

The `hidden` attribute is only a host binding, cleared on the next change detection pass:

```ts
// panel.ts:45
    '[attr.hidden]':         'state() === "closed" ? "" : null',
```

So `applyManual()`'s `panel.getBoundingClientRect()` (`anchored-to.ts:145`) runs against a `display: none` element and reads `0 × 0`. `flip` then never triggers (`:150-153` compare against a zero height/width), and `align: 'center'` puts the panel's left edge at the trigger's centre (`:164`). It self-corrects because `resizeObserver.observe(panel)` fires when the panel gains a box, but the first computed position is wrong and the correction depends on `ResizeObserver` being present and on the panel actually changing size.

**Why it matters:** a select or popover near the bottom of the viewport does not flip on first open (it flips on the RO callback instead), and the initial paint can land at the wrong offset.

**Fix:** either reposition after the state flip (call `s.position.update()` inside `runTransition`'s `done` callback as well), or have `mount.onOpen` remove `hidden` imperatively before measuring (the same trick `beginClose` already uses in reverse at `controller.ts:158-159`). A test asserting `flip` picks `top` for a trigger 20px from the viewport bottom would have caught this.

**Effort:** S

---

### F-9 `anchoredTo` has no RTL awareness

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/strategies/position/anchored-to.ts`

`align` is resolved purely physically:

```ts
// anchored-to.ts:162-170
    if (resolvedSide === 'top' || resolvedSide === 'bottom') {
      if (align === 'start')  left = tRect.left;
      if (align === 'center') left = tRect.left + (tRect.width - pRect.width) / 2;
      if (align === 'end')    left = tRect.right - pRect.width;
    }
```

`grep -rni "rtl|direction|dir=" packages/core/src/primitives/overlay --include=*.ts` returns nothing. In an RTL document, `align="start"` — the default for `kj-select-content` (`select-content.ts:53`) and the natural reading for a dropdown — still pins the panel's *left* edge to the trigger's left edge, i.e. it aligns to the visual end. Flipping `side: 'left' | 'right'` is likewise not mirrored.

**Fix:** read the computed `direction` of the trigger once per `applyManual()` and swap `start`/`end` (and `left`/`right` sides) when it is `rtl`. Consider exposing logical `inline-start` / `inline-end` names on `KjAlign`.

**Effort:** S

---

### F-10 Two z-index escapes from the stack: a hard-coded sub-panel level and wrapper-clamped toasts

**Severity:** medium · **Confidence:** medium
**Files:** `packages/components/src/cascade-select/cascade-select.css`, `packages/components/src/toast/toast.css`, `packages/core/src/primitives/overlay/stack.ts`

The `--kj-overlay-z` migration missed the cascade-select sub-panel, which is hand-positioned (`cascade-select-sub-panel.ts:111` reads the parent option's rect) and hard-codes its level while the root panel next to it reads the variable:

```css
/* packages/components/src/cascade-select/cascade-select.css:46 */
    z-index: var(--kj-overlay-z, 200);
/* packages/components/src/cascade-select/cascade-select.css:64 */
    z-index: 1001;
```

A cascade-select opened inside a dialog gets a stack level of 1001+; its sub-panel is stuck at a literal 1001 and can land behind the panel it belongs to.

Separately, `stack.ts:96-97` states toasts "live in their own layer above [the stack] (`--kj-toast-z-index`, default `2000`)". That holds for the `<kj-toast-viewport>` queue path, which renders in the app tree. It does not hold for the `KjOverlayBuilder` path: the toast panel is inside a `.kj-overlay-wrapper` whose inline `z-index` the stack sets to its own level (`stack.ts:66`), which makes the wrapper a stacking context — `z-index: var(--kj-toast-z-index, 2000)` on the panel (`toast.css:8`) cannot lift it out. A dialog opened after a toast gets a higher wrapper level and paints over it, scrim included.

**Fix:** switch the sub-panel to `z-index: var(--kj-overlay-z, 1001)` (it inherits the custom property from the root panel's wrapper). For toasts, either give the toast layer a wrapper outside the stack's numbering (a dedicated `.kj-overlay-container--toast` at `--kj-toast-z-index`) or drop the claim from the `KjOverlayStack` TSDoc — but do not leave the doc and the code disagreeing.

**Effort:** S

---

### F-11 `KjCloseReason` is public API that carries no information

**Severity:** low · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/controller.ts`, `packages/core/src/primitives/overlay/stack.ts`

The stack hard-codes one reason for both of its dismissal paths:

```ts
// controller.ts:131
    this.stackHandle = this.stack.register(this.id, { onClose: () => this.close('esc') });
```

so an outside-click close reports `'esc'`. And the reason is dropped on arrival anyway:

```ts
// controller.ts:143
  private beginClose(_reason?: KjCloseReason): void {
```

Nothing downstream can distinguish esc / outside / programmatic, even though `KjCloseReason` is exported from `types.ts:24` and `KjDropdownMenuCloseReason` (`dropdown-menu-trigger.ts:29-34`) advertises a richer set it has to synthesise itself.

**Fix:** pass the real reason from `stack.handleKeydown` / `handlePointerDown` through `KjOverlayRegistration.onClose(reason)`, store it on the controller, and expose `readonly closeReason: Signal<KjCloseReason | null>` so `KjDialogRef.afterClosed$` and `kjMenuClosed` can report it.

**Effort:** S

---

### F-12 Multiple Angular apps on one page share the container but not the id counter or the z-stack

**Severity:** low · **Confidence:** medium
**Files:** `packages/core/src/primitives/overlay/container.ts`, `packages/core/src/primitives/overlay/id.ts`, `packages/core/src/primitives/overlay/stack.ts`

`_root` is module scope:

```ts
// container.ts:24-33
let _root: HTMLElement | null = null;

export function getOverlayContainer(): HTMLElement | null {
  ...
```

while `KjId` (`id.ts:10`) and `KjOverlayStack` (`stack.ts:107`) are `providedIn: 'root'` — one instance *per application injector*. Two Angular apps sharing a bundle on one page therefore share the container DOM but each mint `kj-overlay-1` / `kj-panel-1` (duplicate DOM ids, and `aria-controls` can resolve to the other app's panel) and each start their z-stack at `KJ_OVERLAY_Z_BASE_DEFAULT = 1000`, so wrapper levels collide and ordering falls back to DOM insertion order. The same split means Escape routing is per-app: app A's dialog does not know app B's dialog is on top of it.

If each app bundles its own copy of `@kouji-ui/core`, `_root` also splits and two containers appear.

**Fix:** seed `KjId` from a per-app prefix (an injectable `KJ_ID_NAMESPACE` token, defaulting to a random 4-char suffix) so ids cannot collide, and move the container handle behind a DI-provided holder so the container, the stack and the id minter all share one scope. Document the micro-frontend posture in `rules/architecture.md`.

**Effort:** M

---

### F-13 Dead scroll-lock CSS referencing a removed service

**Severity:** low · **Confidence:** high
**Files:** `packages/components/src/popover/popover.css`

```css
/* packages/components/src/popover/popover.css:57-60 */
  /* Modal-mode body scroll lock. Multiple stacked modals coordinate via
     a counter in KjOverlayService; this just hides body overflow when the
     attribute is present. */
  body[data-kj-scroll-lock="true"] {
```

There is no `KjOverlayService` in the repo, and nothing writes `data-kj-scroll-lock` — the current lock sets `documentElement.style.overflow` (`html-overflow.ts:15`). Stale rule + stale comment in a published stylesheet.

**Fix:** delete the rule and its comment.

**Effort:** S

## Carried forward from the 2026-09-06 review

The findings below were filed in the previous pass (report at commit `9aee150a`, audited against
`fd6dd34e`), were **not** re-filed by this audit, and were re-verified as still true at HEAD. They are
restored here with their prior ids noted. Ids F-1…F-13 above are unchanged.

### F-14 No focus restoration for dropdown-menu, tree-select, confirm-popup (and menubar's projected submenu)

**Severity:** high · **Confidence:** high · *(carried forward — prev F-5)*
**Files:** `packages/core/src/dropdown-menu/dropdown-menu-content.ts`, `packages/core/src/confirm-popup/confirm-popup-content.ts`, `packages/core/src/tree-select/tree-select-content.ts`, `packages/core/src/menubar/menubar-item.ts`

Re-verified at HEAD: `grep KJ_OVERLAY_FOCUS_TRAP_STRATEGY packages/core/src packages/components/src` finds providers in exactly **three** components — `popover-content.ts:22`, `date-picker-calendar.ts:44` and `command-palette-dialog.ts:59` (plus the token definition, `builder.ts:100` and `panel.ts:70`). dropdown-menu, menubar's projected `[kjDropdownMenu]` path, tree-select and confirm-popup provide none, so `focusTrap` is `null` and `restoreFocus()` is never even reached. These are the panels that move **real DOM focus into the panel** (`dropdown-menu-content.ts` roving-focus effect; `confirm-popup-content.ts:71` `requestAnimationFrame(() => this.focusDefault())`), so on close the browser drops focus to `<body>` and a keyboard user loses their place. `confirm-popup-content.ts:20`'s own TSDoc advertises "focus restoration".

This is **distinct from F-1**: F-1 is that the controller never invokes the hooks of a trap that *was* provided; F-14 is that four consumers provide no trap at all. Fixing F-1 alone leaves F-14 open.

**Fix:** have these panels provide `tabCycle({ returnFocus: true })` (or a restore-only variant that skips Tab cycling for non-modal menus), or default `focusTrap` on `KjOverlayPanel` to a restore-only strategy when the consumer supplies none. Spec per component: open → arrow to item 2 → Escape → `document.activeElement === trigger`. **Effort:** M

---

### F-15 Re-opening during the close transition leaks the overlay's stack entry and its document listeners

**Severity:** medium · **Confidence:** high · *(carried forward — prev F-6)*
**Files:** `packages/core/src/primitives/overlay/controller.ts:91-96,123-164,186-200`

Still exact at HEAD. `close()` does all teardown inside `beginClose`'s deferred `runTransition` callback (`controller.ts:143-164`), while `open()` acquires synchronously. `open()` during `'closing'` calls `cancelTransition()` (`:95`), which clears the rAF, the `longest+50 ms` safety timeout and the transition listeners (`:186-200`) — so that pending `done()` never runs — and `beginOpen` then overwrites `this.stackHandle` at `:131`. Because stack entries are removed only through the handle closure, the old `StackEntry` stays in `_stack` for the life of the app and `maybeRemoveListeners` can never uninstall the capture-phase document `keydown` / `pointerdown` listeners.

Not reachable through triggers (`toggle()` at `:106-109` only opens from `'closed'`) or the services (each builds a fresh controller). Reachable through the components that call `controller.open()` directly — e.g. a combobox: pick an option (`combobox-root.ts:253` → `close('programmatic')`) and type another character within the panel's ~140 ms transition. Same shape at `combobox-root.ts:267`, `tree-select-trigger.ts:75`, `date-picker-trigger.ts:154/178`, `cascade-select-root.ts:188`.

**Fix:** have `cancelTransition()` (or a new `abortPendingClose()`) release the previous cycle's resources when the interrupted state was `'closing'` — unregister the handle, `scrollLock.onClose()` — rather than discarding the callback; do not double-release when cancelling an `'opening'` transition. **Effort:** M

---

### F-16 Transition duration is measured from the pre-transition state, and only the first duration in a list

**Severity:** medium · **Confidence:** high · *(carried forward — prev F-10)*
**Files:** `packages/core/src/primitives/overlay/controller.ts:165-184`, `packages/core/src/primitives/overlay/panel.ts:44`

`runTransition` is called from `beginOpen` / `beginClose` immediately after `_state.set(...)`, but `data-state` is a host binding applied on the next change detection (`panel.ts:44`), so `getComputedStyle(panel)` reads the **previous** state's styles. A stylesheet that defines its duration under `[data-state="open"]` / `[data-state="closing"]` — the normal pattern — measures `0 s`, falls into the `longest === 0` branch and resolves on the next rAF, cutting the animation off (for close, `done()` immediately sets `hidden` and un-portals). Separately, `parseFloat('0.2s, 0.3s')` is `0.2`, so only the first duration of a comma-separated list is honoured and the 50 ms safety margin can fire early. And `dispose()` (`:112-121`) never calls `cancelTransition()`, so a deferred `done()` runs against already-detached strategies.

**Fix:** write `data-state` imperatively on the panel before measuring (the code already does imperative attribute writes in `beginClose`), or measure on the next frame; take `Math.max` over the split duration list including `transition-delay`; call `cancelTransition()` at the top of `dispose()`. **Effort:** S

---

### F-17 `kjMount` on `<kj-dropdown-menu-content>` is read in the constructor and is therefore always `'portal'`

**Severity:** medium · **Confidence:** high · *(carried forward — prev F-11)*
**Files:** `packages/core/src/dropdown-menu/dropdown-menu-content.ts:226-240`, `packages/core/src/dropdown-menu/dropdown-menu-trigger.ts:83-85`

Still exact at HEAD — `const m = this.kjMount();` sits at `dropdown-menu-content.ts:229`, inside the constructor. Signal inputs are not populated at construction, so `kjMount()` always returns the declared default and the `'inline'` / `'point'` branches are unreachable from the content element; the documented `KjDropdownMenuMount` API does not work. The trigger works around the same problem by reading a raw DOM attribute in a factory (`dropdown-menu-trigger.ts:83-85`, case-sensitivity-fragile). The whole `deferredMount` / `deferredPosition` shell exists to allow late delegate selection — it just is not driven from an effect.

**Fix:** move delegate selection into an `effect()` (the shells already handle `setDelegate` after `attach` / `onOpen`), then drop the `getAttribute('kjTrigger')` hack in favour of `switchableTriggerEvent`. **Effort:** S

---

### F-18 Declarative overlays cannot render a backdrop, so `solidBackdrop` on them is inert configuration

**Severity:** medium · **Confidence:** high · *(carried forward — prev F-12)*
**Files:** `packages/core/src/primitives/overlay/builder.ts:137`, `packages/core/src/command-palette/command-palette-dialog.ts:54-57`

`KjBackdrop` is instantiated in exactly one place repo-wide — `builder.ts:137`, `wrapper.backdropAnchor().createComponent(KjBackdrop, …)` — i.e. only on the service-launched path (grep for `KjBackdrop` outside specs returns the class, that one `createComponent`, the barrel export, and type imports). `kj-command-palette-dialog` declares a full modal bundle including `solidBackdrop({ inert: true, closeOnClick: true })`: the strategy is injected by `KjOverlayPanel` and drives `aria-modal="true"` (`panel.ts:78`), but **no scrim element is ever created**, so `closeOnClick` is dead and the page behind the palette has no visual or pointer barrier. Any future declarative modal has the same hole.

**Fix:** have `KjOverlayPanel`'s mount path create `KjBackdrop` into the portal wrapper when `KJ_OVERLAY_BACKDROP_STRATEGY` is non-null, torn down where the wrapper is removed. **Effort:** M

---

### F-19 Consumers hand-write ARIA onto the panel, fighting the panel's own host bindings

**Severity:** medium · **Confidence:** high · *(carried forward — prev F-14)*
**Files:** `packages/core/src/confirm-popup/confirm-popup-content.ts:96-98,104-106`, `packages/core/src/menubar/menubar-item.ts:177`

`rules/architecture.md` is explicit — "ARIA — Always in `host` object. Never via `Renderer2` or direct DOM manipulation." Still violated at HEAD: `confirm-popup-content.ts` calls `panel.setAttribute('role', 'alertdialog')`, `setAttribute('aria-modal', 'false')` and `setAttribute('aria-describedby', …)` twice (`:96-98` and `:104-106`) over attributes `KjOverlayPanel` owns as host bindings (`panel.ts:42-43`), scheduled behind a `queueMicrotask` + `requestAnimationFrame` pair so AT can observe the wrong role first. `menubar-item.ts:177` stamps `role="menu"` by hand.

**Fix:** confirm-popup provides `{ provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'alertdialog' }` plus an `aria-describedby` host binding on its own directive; menubar projects through `KjOverlayPanel` or provides the role token. The mechanism already exists and every other consumer uses it. **Effort:** S

---

### F-20 `tabCycle`'s focusable query is incomplete and unfiltered, and there are no focus sentinels

**Severity:** medium · **Confidence:** high · *(carried forward — prev F-8b)*
**Files:** `packages/core/src/primitives/overlay/strategies/focus-trap/tab-cycle.ts:4,49`

Unchanged at HEAD:

```ts
// tab-cycle.ts:4
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
```

Missing `[contenteditable]`, `audio[controls]`, `video[controls]`, `iframe`, `details > summary`, `area[href]`; and `querySelectorAll` returns elements that are `display:none`, `visibility:hidden`, inside a closed `<details>` or inside an `inert` subtree, so `els[0]` / `els[els.length-1]` can be invisible and Shift+Tab wraps to nothing. It never looks into shadow roots, and the listener is on the panel only, so focus that escaped by any route other than Tab (programmatic focus, find-in-page, a click on non-inert background) is never recovered.

Latent today only because F-1 means the listener is never installed at all — it becomes live the moment F-1 is fixed, which is why it belongs in the same changeset.

**Fix:** extend the selector, filter on `offsetParent !== null || getClientRects().length` plus a `closest('[inert]')` check, and add focus sentinels or a document-level `focusin` guard. **Effort:** M

---

### F-21 Speed-dial bypasses the overlay system entirely

**Severity:** low · **Confidence:** high · *(carried forward — prev F-15)*
**Files:** `packages/core/src/speed-dial/speed-dial.ts:65`, `packages/core/src/speed-dial/speed-dial-trigger.ts:36,49`

Re-verified: `grep "KjOverlayController\|KjOverlayStack" packages/core/src/speed-dial/*.ts` returns **nothing**. Speed-dial is documented as an overlay-family component and advertises menu-button ARIA, but owns its state with a plain `linkedSignal` (`speed-dial.ts:65`). Consequences: no outside-click dismissal at all; Escape only works while focus is on the trigger, because the handler is a host binding on the trigger element (`speed-dial-trigger.ts:36`), so Escape from an action button does nothing; and it is not in the stack, so a speed-dial open over a dialog and the dialog both answer the same Escape.

**Fix:** register it with `KjOverlayStack` for Escape / outside-click (minimal, keeps the inline DOM), or migrate it to `KjOverlayTrigger` + `inPlace()`. **Effort:** M

---

### F-22 A click on the trigger during the close animation is swallowed

**Severity:** low · **Confidence:** medium · *(carried forward — prev F-18)*
**Files:** `packages/core/src/primitives/overlay/controller.ts:106-109`

```ts
  toggle(): void {
    if (this._state() === 'closed') this.open();
    else this.close('programmatic');   // during 'closing', close() early-returns
  }
```

Suppressing close-then-reopen on the same press is correct, but the same path means a user who clicks the trigger while a close animation from *some other* cause is still running gets nothing at all. With a 200 ms panel transition that is a reachable dead zone.

**Fix:** let `toggle()` treat `'closing'` as "reopen" — but only after F-15, otherwise it makes the stack leak easier to hit. **Effort:** S

---

### F-23 Three more pieces of dead overlay CSS

**Severity:** low · **Confidence:** high · *(carried forward — prev F-4b; complements F-13)*
**Files:** `packages/components/src/dialog/dialog.css:2-10`, `packages/components/src/drawer/drawer.css:51-61`, `packages/core/src/primitives/overlay/strategies/backdrop/blurred.ts:4`

- `.kj-dialog-overlay` (`dialog.css:2`) matches nothing: the only reference to that class name anywhere in `packages/` is `overlay-stacking.spec.ts:273`, which asserts its `z-index` — a test pinning a rule nothing renders.
- `[data-kj-drawer-container]::before` and its `:has()` override (`drawer.css:51`, `:59`) never render; no TypeScript emits that attribute. `drawer.spec.ts:17,31` still query it, so those helpers are stale too.
- `.kj-backdrop--blur` is applied by `blurredBackdrop()` (`blurred.ts:4`) and has **no rule anywhere** in the repo, so `blurredBackdrop()` renders identically to `solidBackdrop()`.

**Fix:** delete the two dead rules and their stale spec helpers; either add the `backdrop-filter` rule for `.kj-backdrop--blur` to `packages/core/src/primitives/overlay/overlay.css` or delete the strategy. **Effort:** S

---

## Changed since the 2026-09-06 review

Previous report: `git show 9aee150a:reports/review/01-overlay.md`, audited at `fd6dd34e`. Range since:
`fd6dd34e..HEAD` (8 commits). Every "Fixed" claim below was verified against the code at HEAD, not
taken from either report.

### Fixed

- **prev F-4(a) — "Per-component CSS `z-index` overrides the container's stacking contract — a select inside a drawer renders beneath it."** Fixed by `2948c5b5` *fix(overlay): nested overlays always stack above their opener (#69)*. Verified at HEAD: `applyOverlayZIndex` (`packages/core/src/primitives/overlay/stack.ts:59-68`) writes `--kj-overlay-z` on the panel and both `--kj-overlay-z` **and an inline `z-index`** on its `.kj-overlay-wrapper`, so each wrapper becomes its own stacking context; `nextZIndex` (`stack.ts:175-181`) is `max(zIndex) + 1` over open entries, not the count; `clearOverlayZIndex` (`stack.ts:71-80`) reverses it before the panel leaves the wrapper. All 17 overlay panel stylesheets now read the variable — `select.css:63`, `combobox.css:48`, `tree-select.css:70`, `cascade-select.css:46`, `date-picker.css:42`, `datetime-picker.css:43`, `dialog.css:9`, `drawer.css:16` and `:56`, `sheet.css:26`, `popover.css:28`, `dropdown-menu.css:28`, `tooltip.css:28`, `command-palette.css:18` and `:33`, `color-picker.css:32`, `confirm-popup.css:22` — and `packages/components/src/overlay/overlay-stacking.spec.ts` is a real regression test over the flattened cascade. The prev review's traced repro (a select opened inside an open drawer) now paints correctly. **One escape survives** and is re-filed as current **F-10**: `cascade-select.css:64` still hard-codes `z-index: 1001`.

No other previous overlay finding is fixed. For the record, the other two behavioural commits in the range fixed things the previous review did not flag: `e6aa28a5` (#73) made a backdrop dismiss only a press that *began* on it, and `415123ad` (#67) stopped a confirm-popup inside a dialog from closing the dialog. `fb1d1956` (#71) fixed the *styles* dimension's prev F-1 (unshipped overlay CSS), not an overlay-dimension finding.

### Still open

| prev id | prev title (abbreviated) | current id |
|---|---|---|
| F-1 | Declarative overlays are not disposed on host destroy | **F-3** (same defect, same "orphan until next gesture" scoping) |
| F-2 | `closeOnEsc` / `closeOnOutside` accepted everywhere, plumbed nowhere | **F-2** |
| F-3 | Overlay toasts join the Esc/outside-click stack | **F-4** |
| F-4(b) | Three pieces of dead overlay CSS | **F-23** (carried forward above) |
| F-5 | No focus restoration for dropdown-menu / tree-select / confirm-popup / menubar | **F-14** (carried forward above) |
| F-6 | Re-opening during the close transition leaks the stack entry | **F-15** (carried forward above) |
| F-7 | `anchoredTo` RTL-blind, viewport-only, synchronous scroll reposition | split across **F-7** (scroll cost + clipping ancestor), **F-8** (measures a hidden panel), **F-9** (RTL); the dead CSS-anchor branch is Open question 4 |
| F-8(a) | No arrow/caret support; resolved `placement` consumed by nothing | **F-5** (`data-side` / `data-align` never bound) |
| F-8(b) | `tabCycle` focusable query incomplete/unfiltered, no sentinels | **F-20** (carried forward above) |
| F-9 | `inertBased` inerts the wrong siblings | folded into **F-1**'s "separate, co-located gap" sub-item and Open question 2 |
| F-10 | Transition duration measured from the pre-transition state | **F-16** (carried forward above) |
| F-11 | `kjMount` read in the constructor | **F-17** (carried forward above) |
| F-12 | Declarative overlays cannot render a backdrop | **F-18** (carried forward above) |
| F-13 | Container / `KjId` module-global state, raw `document` | **F-12**, partially — current F-12 covers only the duplicate-id and per-app z-stack half. The SSR module-global half (`_root`, `_announce.ts`'s region map, the scroll-lock counters, `typeof document` instead of `DOCUMENT`/`PLATFORM_ID`) is **still open, not re-filed here**; it belongs to `06-ssr.md`. |
| F-14 | Hand-written ARIA on the panel | **F-19** (carried forward above) |
| F-15 | Speed-dial bypasses the overlay system | **F-21** (carried forward above) |
| F-16 | Scroll lock is desktop-only; `cssClip` compensates nothing | still open, **not re-filed** — this pass demoted it to Open question 5. The prev pass was right that `overflow:hidden` on `<html>` does not lock iOS Safari and that `cssClip` has no scrollbar compensation; it deserves a finding, not a question. |
| F-17 | `aria-expanded` stamped on every trigger, tooltips included | still open, **not re-filed** — demoted to Open question 3 this pass. Verified unchanged at HEAD (`trigger.ts:27-31` binds `aria-expanded` unconditionally; `on-hover.ts` reports `ariaHasPopup: null`). The prev pass was right; it is a WCAG 4.1.2 issue and should be a low finding. |
| F-18 | Trigger click during the close animation is swallowed | **F-22** (carried forward above) |

### Not reproduced

Every previous finding was accounted for above — none of them was silently dropped. Specifically:

- **Fixed:** prev F-4(a) only.
- **Missed by this pass and now restored** (the previous review was right and this audit did not look): prev F-5, F-6, F-8(b), F-10, F-11, F-12, F-14, F-15, F-18, and prev F-4(b). All ten were re-verified true at HEAD and re-filed above as F-14…F-23. Being honest about the cause: this pass concentrated on the strategy-bus wiring (F-1–F-4) and the positioner, and simply did not re-walk the per-consumer surface (dropdown-menu, menubar, confirm-popup, speed-dial) or the transition machinery.
- **Deliberately demoted rather than dropped:** prev F-16 and F-17, now Open questions 5 and 3. Both are still true at HEAD; the demotion is a judgment call this reconciliation does not endorse.
- **Out of this dimension's scope:** the SSR half of prev F-13, tracked in `06-ssr.md`.
- **Wrong in the previous pass:** nothing. No prior overlay finding was refuted by this audit's evidence.

### New since then

- **F-1 — the controller never invokes `focusTrap.onOpen` / `onClose`.** Genuinely new. The previous pass circled it from two sides (prev F-5 on consumers that provide no trap, prev F-9 on `inertBased` inerting the wrong siblings) but never identified that the controller drops the lifecycle hooks for the traps that *are* provided — which is why popover, date-picker and the command palette also have no Tab containment and no focus restoration despite configuring `tabCycle({ returnFocus: true })`.
- **F-6 — the styled `<kj-command-palette>` bypasses the overlay primitive.** New. The prior review treated the palette only as a *consumer* of the primitive (prev F-1 lists `command-palette-dialog.ts:51` among the leaking providers); it never noticed that the component every documented example uses is a second, hand-rolled palette with `role="dialog" aria-modal="true"` over a non-inert background, no scroll lock, and a global `document.querySelector` for initial focus.
- **F-10 — the residual z-index escapes.** New, and partly a consequence of the `#69` fix: `cascade-select.css:64`'s hard-coded `1001` was missed by the `--kj-overlay-z` migration, and making each wrapper a stacking context is precisely what now clamps a toast panel's `--kj-toast-z-index` inside its wrapper level, contradicting the `KjOverlayStack` TSDoc at `stack.ts:96-97`.
- **F-11 — `KjCloseReason` carries no information.** Promoted to a first-class finding; the prior pass noted the hard-coded `'esc'` only as a bullet inside prev F-2.
- **F-13 — dead `body[data-kj-scroll-lock="true"]` rule in `popover.css:57-60`,** referencing a `KjOverlayService` that does not exist. New.

## Recommended work items

1. **Wire the missing strategy lifecycle hooks** (F-1) — add `focusTrap` / `liveAnnouncer` / `trigger` `onOpen` to `beginOpen` and `onClose` to `beginClose`, and make `inertBased()` actually reachable so `aria-modal="true"` is backed by an inert background. Ship with a controller test that asserts every configured strategy gets both hooks, and a dialog test that asserts focus returns to the trigger.
2. **Deliver the close policy to the stack** (F-2) — thread `closeOnEsc` / `closeOnOutside` from `KjOverlayBuilderConfig` and `KjDialogOpenOptions` through the controller into `stack.register`; pick one owner for outside-press (stack *or* backdrop, not both). Regression test: `alert: true` survives Escape and a scrim click.
3. **Make the controller destroy-safe** (F-3) — `ngOnDestroy` on `KjOverlayController` with synchronous teardown (cancel transition, unregister, release scroll lock, un-portal). Test that destroying a fixture with an open command palette leaves `stackSize === 0` and the page scrollable.
4. **Introduce a non-modal overlay posture** (F-4) — `modal: false` for toast and tooltip so they neither take Escape nor become `topmost`; stop `KjToastService.openOverlay` building a panel-less overlay for the sugar methods.
5. **Bind `data-side` / `data-align` on `KjOverlayPanel`** (F-5) — one host binding restores arrows across popover and tooltip.
6. **Fold `<kj-command-palette>` back onto the primitive** (F-6) — (2) makes this possible rather than unblocking it (the palette never used the primitive in the first place); delete the hand-rolled portal/stack code and the global `querySelector` focus.
7. **Positioning pass** (F-7, F-8, F-9) — rAF-coalesce and make passive, measure after the panel is visible, mirror `align` in RTL.
8. **Z-index cleanup** (F-10) — cascade sub-panel onto `--kj-overlay-z`; decide whether toasts really are above the stack and make the code and the `KjOverlayStack` TSDoc agree.
9. **Housekeeping** (F-11, F-12, F-13) — real close reasons, namespaced ids, delete the dead `data-kj-scroll-lock` rule.

## Open questions

- Is the `KjBackdrop` + `KjDismissPress` click path meant to be the *only* outside-dismiss mechanism, with `KjOverlayStack.handlePointerDown` reserved for overlays that have no backdrop (popover, select, dropdown)? Today both run for modals and the stack's `pointerdown` always pre-empts the backdrop's `click`, which makes the careful press-ownership logic unreachable for dialog / drawer / sheet.
- Was `inertBased()` intended for the portalled case? As written it inerts `panel.parentElement.children`, which for a portalled panel is the overlay wrapper's own children — it would need to target `document.body`'s children outside `.kj-overlay-container` to do anything useful.
- Should `KjOverlayTrigger` keep emitting `aria-expanded` / `aria-controls` for `role="tooltip"` panels (`trigger.ts:27-31`)? The APG tooltip pattern wants `aria-describedby` on the trigger and no expanded state.
- `supportsCssAnchor()` is hard-coded to `return false` (`anchored-to.ts:51-56`) and `applyCss` / `clearCss` / `positionAreaFor` are ~60 lines of unreachable code. Keep as a staged path behind a flag, or delete until CSS Anchor Positioning stabilises?
- Is iOS body-scroll behaviour in scope? `htmlOverflow()` sets `overflow: hidden` on `<html>`, which iOS Safari historically ignores for `position: fixed` overlays (the usual fix is `position: fixed` + `top: -scrollY` on `<body>` with restore). No consumer currently opts into `cssClip()`, which has the same limitation.
