# Mobile-first interaction patterns — design spec

**Date:** 2026-07-07
**Roadmap:** `apps/docs/src/app/pages/roadmap/items/v0.2-mobile-patterns.md`
**Status:** MVP (this PR) + deferred follow-ups

## Purpose

Fill the mobile gap in the overlay suite. The drawer primitive already covers
edge-anchored panels (left/right/top/bottom) with drag-to-dismiss. This work
adds two **cohesive, mobile-first** patterns composed on the **existing overlay
primitive stack** — no new behavioural surface, just composition:

1. **Bottom sheet** — a bottom-anchored modal surface with a grab handle and
   drag-to-dismiss, tuned for thumb reach and small viewports.
2. **Action sheet** — a data-driven, iOS-style list of actions presented in a
   bottom sheet (default / destructive / cancel action roles).

Both reuse the overlay strategy stack (`edgeSheet` position, `solidBackdrop`,
`tabCycle` focus trap, `htmlOverflow` scroll lock, `programmatic` trigger) via
`KjOverlayBuilder` — the same engine behind `KjDialog` and `KjDrawer`. Nothing
in the overlay primitive is duplicated or forked.

## Scope

### Ships in THIS PR (MVP)

| Pattern | Package | Surface |
| --- | --- | --- |
| Bottom sheet | `@kouji-ui/core` (headless) + `@kouji-ui/components` (styled) | `KjSheetService.open()`, `KjSheetRef`, `KjSheet` panel body, `kj-sheet` CSS |
| Action sheet | `@kouji-ui/components` (built on the bottom sheet) | `KjActionSheetService.open()`, `KjActionSheetRef`, `KjActionSheet` render component |

### Deferred (YAGNI — justified)

- **Swipe-to-reveal list rows.** Requires a *new* list-row primitive plus a
  multi-directional gesture state machine (open/peek/snap-back thresholds,
  velocity, per-row action layout, RTL). That is a large, orthogonal surface
  with no overlay reuse — it belongs in its own PR against `kj-list`. Shipping
  it here would balloon scope and dilute review.
- **Generalized gesture-aware overlay abstraction.** The concrete gesture users
  need today (drag-to-dismiss) is already delivered by the drawer and by this
  bottom sheet. A reusable gesture layer is speculative until a third consumer
  exists. Extract later from real usage, not up front.
- **Multi-detent snapping** (drag between half/full snap points). MVP ships a
  single optional initial height (`detent: 'auto' | 'half' | 'full'`) plus
  drag-to-dismiss. A full snap-point state machine is a follow-up; the API is
  forward-compatible (the `detent` option can grow to accept an array).

## API surface

### Bottom sheet (core)

```ts
KjSheetService.open<T, R, D>(component: Type<T>, opts?: KjSheetOpenOptions<D>): KjSheetRef<T, R>

interface KjSheetOpenOptions<D> {
  data?: D;                                  // injected via SHEET_DATA
  detent?: 'auto' | 'half' | 'full';         // initial height. default 'auto'
  dismissible?: boolean;                      // grab-handle drag + backdrop close. default true
  closeOnOutside?: boolean;                   // backdrop click closes. default true
  ariaLabel?: string;                         // accessible name when no heading
}

class KjSheetRef<T, R> { close(result?): void; afterClosed$; result; state; isOpen; instance; }
```

- `KjSheet` — panel body component; composes `KjOverlayPanel` (inherits `role`,
  `data-state`, aria-modal, edge-sheet positioning). Renders a **grab handle**
  and hosts drag-to-dismiss (pointer logic mirrored from the proven drawer
  bottom-drag path: downward drag past 40% height or 600 px/s velocity closes).
- `SHEET_DATA`, `SHEET_DETENT`, `SHEET_DISMISSIBLE` injection tokens mirror the
  drawer's `DRAWER_*` tokens.

### Action sheet (components, built on the bottom sheet)

```ts
KjActionSheetService.open<V>(opts: KjActionSheetOptions<V>): KjActionSheetRef<V>

interface KjActionSheetOptions<V> {
  title?: string;
  description?: string;
  actions: KjActionSheetAction<V>[];
  cancelLabel?: string;                       // renders a separated cancel row. default 'Cancel'
}
interface KjActionSheetAction<V> {
  label: string;
  value: V;
  icon?: string;                              // lucide name
  role?: 'default' | 'destructive';           // destructive → danger styling
  disabled?: boolean;
}
class KjActionSheetRef<V> { afterClosed$: Observable<V | undefined>; result: Promise<V | undefined>; }
```

Selecting an action closes the sheet and resolves its `value`; Escape / backdrop
/ Cancel resolve `undefined`.

## Accessibility contract (WCAG 2.1 AAA target)

- **Role / name (4.1.2, 1.3.1):** bottom sheet panel is `role="dialog"`,
  `aria-modal="true"` while a backdrop is active. Accessible name via
  `aria-labelledby` (wired to the sheet title) or `ariaLabel`. Action sheet
  action list is `role="menu"` with `role="menuitem"` rows.
- **Keyboard (2.1.1):** focus trapped via `tabCycle({ returnFocus: true })`;
  Tab / Shift+Tab cycle; **Escape dismisses** (topmost overlay only, via the
  overlay stack coordinator). Grab handle is a real `<button>` — Enter/Space
  dismiss when `dismissible`.
- **Focus management (2.4.3):** focus moves into the sheet on open and is
  **restored to the trigger** on close. Siblings marked `inert` while modal.
- **Touch targets (2.5.5):** every action row and footer button is ≥ 44×44px.
  Grab handle hit-area ≥ 44px tall even though the visual pill is small.
- **Reduced motion (2.3.3 / 2.2.2):** slide/transform transitions gated behind
  `@media (prefers-reduced-motion: no-preference)`; reduced-motion falls back
  to an opacity fade. Drag never animates against the user.
- **Contrast (1.4.6 AAA):** surface uses theme tokens (`--kj-bg-elevated`,
  `--kj-fg-default`); destructive rows use `--kj-danger-*` which already meet
  AAA in both themes.
- **Live region:** not required — sheets are user-initiated modals, not status
  updates; announcer strategy is `silent()` like the drawer.

## Testing

- **Unit (vitest):** service returns a ref + controller; panel gets
  `role="dialog"`; `data` flows through `SHEET_DATA`; `detent` reflected on the
  host; Escape closes; result promise resolves; action sheet renders rows and
  resolves the selected value.
- **E2E (Playwright, mobile viewport):** open bottom sheet + action sheet from
  the docs examples, assert render, focus trap, Escape/backdrop dismiss.

## File layout

```
packages/core/src/sheet/
  sheet.ts              KjSheet panel body (composes KjOverlayPanel + grab-handle drag)
  sheet.service.ts      KjSheetService + tokens + options type
  sheet.ref.ts          KjSheetRef
  sheet.spec.ts
  index.ts
packages/components/src/sheet/
  sheet.ts              KjSheetComponent doc-wrapper + re-exports
  sheet.css
  index.ts
  _examples/…
packages/components/src/action-sheet/
  action-sheet.ts       KjActionSheet render component
  action-sheet.service.ts  KjActionSheetService + KjActionSheetRef + types
  action-sheet.css
  action-sheet.spec.ts
  index.ts
  _examples/…
```
