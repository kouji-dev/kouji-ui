# Bottom Sheet

A modal surface that enters from the bottom edge of the viewport, anchored to
the bottom while open. Conceptually a mobile-first sibling of
[`KjDialog`](./dialog.md): same lifecycle (mount, focus trap, scroll lock,
escape, restore-focus), same overlay primitives, but a different shape and a
different gesture vocabulary — drag-to-dismiss, optional snap points, optional
drag handle.

> Greenfield in kouji. Not yet implemented in `packages/core`. This analysis
> defines the shape before code lands.

For the side-anchored generic overlay (left / right / top / bottom, possibly
persistent) see [`drawer.md`](./drawer.md). For the centred modal see
[`dialog.md`](./dialog.md). For the assertive variant see
[`alert-dialog.md`](./alert-dialog.md). For the trigger-anchored confirmation
see [`confirm-popup.md`](./confirm-popup.md).

## Source comparison

| Concern | PrimeNG | Angular Material `MatBottomSheet` | shadcn/ui `Drawer` (Vaul) |
|---|---|---|---|
| First-class component | **No** — closest is `<p-sidebar position="bottom">`, which is a side-drawer with a `bottom` placement, no snap points, no drag-to-dismiss | Yes — `MatBottomSheet` service + `MatBottomSheetRef` | Yes — `Drawer` family wrapping Vaul; mobile-first bottom sheet, optional desktop fallback |
| Primary surface | n/a | Service-only (`bottomSheet.open(Cmp, config)`) | Compound components (`Drawer`, `DrawerTrigger`, `DrawerContent`, `DrawerHandle`) |
| Programmatic path | `DialogService.open(Cmp)` (treated as a generic dynamic dialog with a `position: 'bottom'` config) — no bottom-sheet-specific surface | The default and only path | Consumer manages `open` state; no service |
| Drag-to-dismiss | No | **No** | **Yes** — built into Vaul; downward swipe past a velocity threshold dismisses |
| Snap points | No | **No** | **Yes** — `snapPoints={['148px', '355px', 1]}`, `activeSnapPoint`, controlled or uncontrolled |
| Drag handle | No | No (consumer renders one in their template, no behaviour) | Yes — `DrawerHandle` is a focusable element, also drag origin |
| Backdrop | n/a (Sidebar has its own) | Built-in scrim | Built-in scrim, fades with drag distance |
| Auto fullscreen on small viewports | n/a | No (always bottom-anchored) | Mode `direction="bottom"` always bottom; `Drawer` has no built-in desktop fallback, but the shadcn idiom is to compose `<DrawerDialog>` that renders `<Dialog>` ≥ md and `<Drawer>` < md |
| Result payload | n/a | `afterDismissed(): Observable<R>` | Consumer state |
| Focus trap | n/a | CDK `FocusTrap` | Radix focus-scope |
| Scroll lock | n/a | `BlockScrollStrategy` | Yes; also locks page during drag |
| ARIA | n/a | `role="dialog"`, `aria-modal="true"`, label/describe left to consumer | `role="dialog"`, `aria-modal="true"`, optional label / describe |

**Read-off:**

- **PrimeNG has the gap.** A bottom sheet is not a `<p-sidebar position="bottom">`. The Sidebar lacks snap points, drag dismissal, and the "peek state" concept that defines the pattern. Mirroring PrimeNG here would just produce a bottom-placed Drawer — exactly what we want to keep separate.
- **Material is the closest existing Angular API.** Service-only, `MatBottomSheet.open(Cmp, config)` returns `MatBottomSheetRef<Cmp, R>`, modelled directly on `MatDialog`. Material chooses to ship *no* drag-to-dismiss and *no* snap points — they treat the bottom sheet as a positional variant of a modal sheet. We match Material's programmatic ergonomics, but go beyond Material on gestures and snap points (because mobile users expect them).
- **Vaul (shadcn) is the gesture reference.** Snap points + velocity-based dismissal + handle-as-drag-origin are all worth mirroring. We do not adopt Vaul's React-specific transform-based animation engine — the kouji core ships behaviour, the components package owns the CSS transitions.

## Decision

**Ship as its own family**, not as `<kj-drawer kjPlacement="bottom">`. Three concrete reasons:

1. **Different gestures, different state machine.** A drawer slides in/out
   between two states (open / closed). A bottom sheet slides between *N*
   states (closed + each snap point). The "active snap point" signal is
   load-bearing in the bottom-sheet API; it has no analogue in Drawer.
   Trying to bolt snap points onto Drawer pollutes Drawer's contract for the
   80 % of consumers who want a plain side panel.
2. **Different default a11y posture.** Drawer is often *persistent* (a
   navigation rail) and not always modal. Bottom sheet is always modal,
   always temporary, always traps focus. Hard-coding "modal: true" into a
   placement-driven Drawer is a footgun; making it a separate component
   makes the contract obvious.
3. **Different default fallback.** Bottom sheet on desktop is a UX
   anti-pattern (huge surface anchored to the bottom of a 1440 px monitor).
   The component owns a documented "fall back to centred dialog ≥ md
   breakpoint" path. Drawer never falls back — a left-anchored drawer at any
   viewport is fine.

**Composition: hostDirectives over `KjDialog`.** Bottom Sheet is a
specialisation of Dialog (same role, same focus trap, same escape, same
scroll lock, same overlay primitive). Three options were considered:

- **(A) Re-implement.** Rejected — duplicates the entire dialog lifecycle.
- **(B) Compose `KjDialog` via `hostDirectives` and override what differs.** Chosen. The bottom-sheet directive sets `data-kj-placement="bottom"`, exposes snap-point + drag-handle context tokens, and otherwise inherits `KjDialog`'s full a11y wiring. This is the same approach `KjAlertDialog` takes (see [`alert-dialog.md`](./alert-dialog.md)).
- **(C) Configuration on `KjDialog` itself.** Rejected — see Decision (1)–(3) above; pollutes the dialog contract.

**Snap points: in core (signal-only), CSS in wrapper.** The directive owns
the snap-point list, the active snap signal, and the `snapTo(index)` method.
The directive does **not** position the panel at any pixel offset — it
reflects the active snap as `data-kj-snap-index="2"` and a CSS custom
property `--kj-bottom-sheet-snap` (the percent or px value). The components
package's CSS uses these to drive `transform: translateY(...)`. This keeps
the headless promise (zero CSS in core) while still letting the directive
own the *behaviour* (which snap is active, when it changes, what dragging
should snap to).

**Drag-to-dismiss: in a separate `KjBottomSheetHandle` directive.** The
gesture is opt-in. A consumer who wants a non-draggable bottom sheet (e.g.
a fixed-height filter sheet that only dismisses via Escape or a Close
button) simply omits the handle directive. A consumer who wants the whole
panel to be drag-dismissable applies `[kjBottomSheetHandle]` to the panel
itself. This is more flexible than Vaul's "the whole panel is always
draggable" and matches Material's "no built-in drag" baseline-as-default.

**Mobile vs. desktop: opt-in dialog fallback, off by default.** The
directive accepts `kjFallbackBreakpoint` (CSS media-query string,
`undefined` by default = always bottom-anchored). When set (e.g. `'(min-width: 768px)'`), the *service path* opens the same component inside `KjDialog` instead, and the *declarative path* swaps `data-kj-fallback="dialog"` for the wrapper to restyle. Default is no fallback — explicit opt-in keeps the contract honest.

## Base features

- **Modes.** Always modal, always bottom-anchored. No "persistent" mode (use Drawer instead).
- **Open / close lifecycle.** Identical to Dialog. Mounts into `document.body` via `KjOverlayService.createFromTemplate`, traps focus, locks body scroll, restores focus on close.
- **Snap points.**
  - `kjSnapPoints: readonly (number | string)[]` — list of "open" heights, ordered closed → fullest. `0` is implicit and represents the closed state; consumers list only the visible snap stops. Numbers between 0 and 1 are interpreted as fraction of viewport height (e.g. `0.4` = 40 vh). Strings are passed through as CSS values (e.g. `'320px'`, `'70vh'`). The maximum sensible value is `1` / `'100vh'` (full sheet).
  - `kjActiveSnap: model<number>` — index into `kjSnapPoints`. Two-way bindable. Defaults to `kjSnapPoints.length - 1` (open at full extent) on first open. Setting to `-1` closes the sheet.
  - `snapTo(index: number): void` exposed on `KjBottomSheetContext` for handle / programmatic moves.
  - On open, the panel animates from the closed position to `kjSnapPoints[kjActiveSnap()]`. On drag-end, the directive picks the nearest snap by gesture position + velocity (Vaul-style); the wrapper handles the CSS transition.
  - When `kjSnapPoints` is empty, the sheet has a single open state at `100%` and behaves like Material's `MatBottomSheet`.
- **Drag-to-dismiss.** Owned by `[kjBottomSheetHandle]`. Listens for `pointerdown` → `pointermove` → `pointerup`/`pointercancel` on its host. Updates `KjBottomSheetContext.dragOffset` (a signal in CSS pixels, downward-positive). On release, the directive calls `KJ_BOTTOM_SHEET.commitDrag(offset, velocity)` which either snaps to the nearest snap point or dismisses (close) if the gesture crosses the dismiss threshold (default: 40 % of current snap height OR velocity > 600 px/s, mirrors Vaul defaults).
- **Drag handle visual.** The directive does not render anything. The wrapper component projects `<kj-bottom-sheet-handle>` (a styled grabber) and applies `[kjBottomSheetHandle]` to it. Consumers can also apply the directive to the entire panel header (or the whole panel) to drag from anywhere.
- **Escape & backdrop close.** Inherited from `KjDialog`. Same gating inputs (`kjBottomSheetCloseOnEscape`, `kjBottomSheetCloseOnBackdrop`, defaulting `true`).
- **Backdrop opacity follows drag.** Wrapper concern. The directive exposes `dragProgress` (0..1, 1 = fully open at top snap) on the context. Wrapper CSS multiplies the scrim opacity by this signal so the scrim fades as the user drags down.
- **Scroll lock.** Inherited from `KjDialog`'s `KjScrollLock` wiring (see [Open questions](./dialog.md#open-questions--risks) — same primitive). Additional concern: while dragging, body scroll must remain locked even though the panel is moving; this is automatic since scroll-lock is owned by Dialog and is on for the open lifetime.
- **Inner scrolling vs. drag.** When the user starts a downward gesture inside the *panel body* (not the handle), the directive prefers internal scrolling over panel drag if the body is not at scrollTop = 0. This matches iOS-native sheets and Vaul's behaviour. Implemented by the handle directive checking the gesture's first target's nearest scroll container.
- **Auto-fallback to dialog.** Optional, off by default. When `kjFallbackBreakpoint` matches (`window.matchMedia(...)`), the service path opens via `KjDialogService` instead. Declarative path reflects `data-kj-fallback="dialog"` so the wrapper can re-skin in CSS. Reactive: a `change` listener on the media query swaps live. *Open question on whether auto-swap mid-session is desirable — see Open questions.*
- **Stacking.** Same first-mount-wins ordering as Dialog. v1 disallows opening a second bottom sheet over an existing one (the second open call closes the first), matching Material's `MatBottomSheet` (which only ever has one open).
- **Result payload.** `kjBottomSheetClosed` output (declarative); `KjBottomSheetRef.afterDismissed(cb)` (service). Generic over `R` on the service.

## Accessibility

Target: **WCAG 2.1 AAA**. Mapping:

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.3.1 Info & Relationships | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` to title | Inherited from `KjDialog` host bindings via `hostDirectives`. |
| 1.4.13 Content on Hover/Focus (AA) | Sheet content stays open until user acts; no auto-dismiss on pointer-leave | By design — bottom sheet is modal, not hover-triggered. |
| 2.1.1 Keyboard | All open/close/snap-change actions reachable without a pointer | Escape closes; arrow keys on focused handle change snap; Tab cycles inside (focus trap). |
| 2.1.2 No Keyboard Trap | Focus trap releases on close | Inherited from `KjFocusTrap` via `KjDialog`. |
| 2.4.3 Focus Order | First focusable inside panel receives focus on open | Inherited from `KjDialog`. |
| 2.4.7 Focus Visible | `KjFocusRing` on handle and on focusable panel descendants | The handle directive composes `KjFocusRing`. |
| 2.5.1 Pointer Gestures | Multi-step / path-based gestures must have a single-pointer alternative | **Critical for the handle.** Snap-point changes via drag must also be reachable via keyboard on the handle (see Keyboard contract). Dismissing via swipe must also work via Escape and via a close button (consumer's responsibility — wrapper provides one by default). |
| 2.5.4 Motion Actuation | Sheet must not respond to device motion | N/A — pointer-driven only. |
| 2.5.5 Target Size (AAA) | Handle ≥ 44×44 CSS px | Components-package preset enforces this; the directive itself does not assert size. |
| 2.5.7 Dragging Movements (AA, WCAG 2.2) | All dragging operations have a pointer alternative that is not dragging | Snap-change and dismiss must both be operable without dragging — keyboard on the handle, plus Escape, plus a close button in the wrapper. |
| 4.1.2 Name, Role, Value | Handle exposes `role="slider"` with `aria-valuenow`/`aria-valuemin`/`aria-valuemax` reflecting the snap index | See `[kjBottomSheetHandle]` host bindings below. |

**Keyboard contract**

| Key | When focus is on… | Behaviour |
|---|---|---|
| `Tab` / `Shift+Tab` | Anywhere inside the panel | Cycle focusables; never escapes the modal (focus trap). |
| `Escape` | Anywhere inside | Close (gated by `kjBottomSheetCloseOnEscape`). |
| `ArrowUp` | Handle | Move to the next-larger snap (taller sheet). At `snapPoints.length - 1` it does nothing. |
| `ArrowDown` | Handle | Move to the next-smaller snap (shorter sheet). At index `0`, it dismisses (close). |
| `Home` | Handle | Snap to smallest open state (`index = 0`). |
| `End` | Handle | Snap to fullest open state (last index). |
| `Enter` / `Space` | Handle | No-op by default. (Avoid clashing with consumer click handlers; the handle is a slider, not a toggle button.) |

**Handle as `role="slider"`.** This is the load-bearing AAA decision.
A drag handle that snaps between discrete heights is, semantically, a
single-axis slider. Mapping:

- `role="slider"`
- `aria-orientation="vertical"`
- `aria-valuemin="0"`, `aria-valuemax="<snapPoints.length - 1>"`,
  `aria-valuenow="<active snap index>"`
- `aria-valuetext` is auto-computed from the snap label (e.g. "Half open",
  "Full") if the consumer provides `kjSnapLabels: readonly string[]`,
  otherwise `undefined`.
- `tabindex="0"` (the handle is focusable).
- `aria-label` is **required** when the handle has no visible text.
  Components-package preset ships `aria-label="Resize sheet"` as a default
  i18n key.

When `kjSnapPoints` is empty (single-state sheet), the handle degrades to
`role="button"` with `aria-label="Close sheet"` and Enter/Space close — the
slider semantics make no sense without multiple stops.

**Initial focus.** Documented order, identical to Dialog:
1. Element matching `kjBottomSheetAutoFocus` selector if provided.
2. Element with `[autofocus]` inside the panel.
3. First tabbable inside the panel.
4. The panel itself (`tabindex="-1"`) as fallback.

The handle is **not** the default initial-focus target. Initial focus
inside the body content is more useful than focus on the resize affordance;
keyboard users who want to resize Tab to it explicitly.

**Restore focus.** Inherited from `KjDialog` — focus returns to the
opener (the trigger or the element focused before `service.open(...)`).

**Reduced motion.** Wrapper concern. Core reflects `data-kj-snap-index`
and `data-kj-dragging`; the wrapper's transition rules guard with
`@media (prefers-reduced-motion: reduce)` and use instant snaps.

**Live region.** Not needed for snap changes — `aria-valuetext` on the
slider handle covers the announcement. Toast-style transient
announcements remain a [`feedback/toast.md`](../feedback/toast.md)
concern.

## Composition model

```
bottom-sheet/
  bottom-sheet.ts             ← KjBottomSheet (panel directive; hostDirectives KjDialog)
  bottom-sheet-handle.ts      ← KjBottomSheetHandle (drag origin + slider semantics)
  bottom-sheet-trigger.ts     ← KjBottomSheetTrigger (declarative open path; hostDirectives KjDialogTrigger)
  bottom-sheet.context.ts     ← KjBottomSheetContext + KJ_BOTTOM_SHEET token
  bottom-sheet.service.ts     ← KjBottomSheetService + KjBottomSheetRef
  bottom-sheet.example.ts
  bottom-sheet.snap-points.example.ts
  bottom-sheet.fallback.example.ts
  bottom-sheet.spec.ts
  index.ts
```

### Shared state (`KJ_BOTTOM_SHEET` context)

```ts
export interface KjBottomSheetContext extends KjDialogContext {
  /** Index into snapPoints; -1 == closed. */
  readonly activeSnap: Signal<number>;
  readonly snapPoints: Signal<readonly (number | string)[]>;
  /** Live drag offset in CSS px, downward-positive. 0 when not dragging. */
  readonly dragOffset: Signal<number>;
  /** 0..1 — current openness ratio for backdrop opacity etc. */
  readonly dragProgress: Signal<number>;
  /** True while pointer is down on a handle/draggable area. */
  readonly dragging: Signal<boolean>;

  snapTo(index: number): void;
  /** Called by KjBottomSheetHandle on pointerup; commits to a snap or dismisses. */
  commitDrag(offset: number, velocity: number): void;
}

export const KJ_BOTTOM_SHEET = new InjectionToken<KjBottomSheetContext>('KjBottomSheet');
```

`KjBottomSheet` provides both `KJ_DIALOG` (via `useExisting`, satisfying
the inherited dialog contract for `KjDialogTitle`, `KjDialogClose` etc.)
and `KJ_BOTTOM_SHEET`. The handle directive injects `KJ_BOTTOM_SHEET`.

### `hostDirectives` composition

- `KjBottomSheet` composes:
  - `KjDialog` — inherits `role="dialog"`, `aria-modal`, `aria-labelledby`
    wiring, focus trap, scroll lock, escape, restore-focus.
  - The directive overrides `KjDialog`'s host CSS data-attributes by
    setting `data-kj-placement="bottom"` and `data-kj-snap-index` /
    `data-kj-dragging`.
- `KjBottomSheetHandle` composes:
  - `KjFocusRing` — keyboard focus-visible ring on the handle.
  - `KjDisabled` — when disabled, neither drag nor keyboard slider keys do
    anything. (`aria-disabled` reflected on the host.)
- `KjBottomSheetTrigger` composes:
  - `KjDialogTrigger` — declarative open path, fully reused. The
    bottom-sheet trigger differs only in which context it provides
    (`KJ_BOTTOM_SHEET`).

### Service path

`KjBottomSheetService.open<C, D, R>(content: Type<C> | TemplateRef<C>, config?: KjBottomSheetOpenConfig<D>): KjBottomSheetRef<C, R>`

The service is a thin wrapper over `KjDialogService`:

1. Build a `KjDialogOpenConfig` from the bottom-sheet config (forwarding
   `data`, `panelClass`, `autoFocus`, `restoreFocus`, `disableClose`,
   `scrollLock`, `ariaLabelledBy`, `ariaDescribedBy`).
2. Wrap `content` in an internal `KjBottomSheetHostComponent` that applies
   `[kjBottomSheet]` and projects the user content via `<ng-content>` /
   `<ng-container *ngTemplateOutlet>`.
3. Call `dialog.open(KjBottomSheetHostComponent, dialogConfig)`.
4. If `kjFallbackBreakpoint` matches, **skip** the host wrapper and call
   `dialog.open(content, dialogConfig)` directly — the result is a centred
   `KjDialog`. The returned `KjBottomSheetRef` exposes the same surface;
   snap-point methods become no-ops with a one-time dev-mode warning.

`KjBottomSheetRef<C, R>` extends the contract of `KjDialogRef<R>` with:

| Member | Kind | Notes |
|---|---|---|
| `snapTo(index: number)` | method | Programmatic snap change. No-op (with dev warning) if running in dialog-fallback mode. |
| `activeSnap()` | `Signal<number>` | Read-only mirror of the directive's signal. |
| `afterDismissed(cb)` | method | Alias for `afterClosed` to match Material's vocabulary. Both are exposed. |

### Cross-component pointers

- **Dialog** ([`actions/dialog.md`](./dialog.md)) — base implementation;
  Bottom Sheet is a `hostDirectives` specialisation. All open
  questions/gaps in Dialog (focus trap wiring, scroll lock, service-path
  escape/backdrop) are *prerequisites* for Bottom Sheet — Bottom Sheet
  cannot ship until those land.
- **Drawer** ([`actions/drawer.md`](./drawer.md)) — sibling, not parent.
  Drawer owns the placement variant (`'left' | 'right' | 'top' | 'bottom'`) for non-modal / persistent surfaces. A consumer choosing between
  `<kj-drawer kjPlacement="bottom">` and `<kj-bottom-sheet>` should pick:
  Drawer if the panel is *navigation* / *secondary content* / could be
  persistent; Bottom Sheet if the panel is a *task* / *temporary modal*
  with snap points or drag-to-dismiss. Document this in both files.
- **Alert Dialog** ([`actions/alert-dialog.md`](./alert-dialog.md)) — same
  composition pattern (specialisation of `KjDialog` via `hostDirectives`).
  Lift any "common dialog specialisation" idioms into a shared note in
  Dialog's open questions if a third one shows up.
- **Confirm Popup** ([`actions/confirm-popup.md`](./confirm-popup.md)) —
  not related; non-modal trigger-anchored popover.
- **Speed Dial** ([`actions/speed-dial.md`](./speed-dial.md)) — also
  cross-references the "popup trigger" abstraction; Bottom Sheet does
  *not* feed into that work because its trigger is `KjDialogTrigger`-shaped (modal mount), not a connected-position popover.
- **Toast** ([`feedback/toast.md`](../feedback/toast.md)) — non-modal
  bottom-anchored surface; explicitly *not* a bottom sheet (no focus trap,
  no backdrop, transient, live-region driven).
- **`KjOverlayService`** (`packages/core/src/primitives/overlay/`) —
  reused indirectly through `KjDialog`. Bottom Sheet does not call it
  directly.
- **`KjFocusTrap`** (`packages/core/src/a11y/focus-trap.ts`) — reused via
  `KjDialog`'s `hostDirectives`.
- **`KjScrollLock`** (planned in
  `packages/core/src/primitives/interaction/`, see Dialog's open question
  #4) — reused via `KjDialog`. Bottom Sheet must keep body scroll locked
  during drag gestures; verify when scroll-lock primitive lands.
- **`KjLiveRegion`** (`packages/core/src/a11y/live-region.ts`) — not used.
  Snap-change announcements ride on `aria-valuetext` of the slider handle;
  Live Region is for transient notifications.
- **`KjRovingTabindex`** — not used. The bottom sheet has at most one
  focusable handle; multi-stop roving tabindex doesn't apply.

## Inputs / Outputs / Models

### `KjBottomSheet` (`[kjBottomSheet]`, `exportAs: 'kjBottomSheet'`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjSnapPoints` | `input` | `readonly (number \| string)[]` | `[]` | Empty = single open state at full extent. Numbers in (0, 1) are vh fractions; strings are CSS values. |
| `kjActiveSnap` | `model` | `number` | `snapPoints.length - 1` | Two-way bindable; `-1` closes. |
| `kjSnapLabels` | `input` | `readonly string[] \| undefined` | `undefined` | Drives `aria-valuetext` on the handle. Length must match `snapPoints` if provided. |
| `kjDismissThreshold` | `input` | `number` | `0.4` | Fraction of current snap height; downward drag past this dismisses on release. |
| `kjDismissVelocity` | `input` | `number` | `600` | px/s; flick velocity downward past this dismisses regardless of position. |
| `kjFallbackBreakpoint` | `input` | `string \| undefined` | `undefined` | CSS media-query string. When matches, replace with centred `KjDialog`. |
| `kjBottomSheetCloseOnEscape` | `input` | `boolean` | `true` | Forwarded to `KjDialog`. |
| `kjBottomSheetCloseOnBackdrop` | `input` | `boolean` | `true` | Forwarded to `KjDialog`. |
| `kjBottomSheetAutoFocus` | `input` | `boolean \| string` | `true` | Forwarded to `KjDialog`. |
| `kjBottomSheetRestoreFocus` | `input` | `boolean` | `true` | Forwarded to `KjDialog`. |
| `kjBottomSheetScrollLock` | `input` | `boolean` | `true` | Forwarded to `KjDialog`. |
| `kjBottomSheetClosed` | `output` | `unknown` | — | Emits the value passed to `close(result)`. |
| `kjActiveSnapChange` | `output` | `number` | — | Emitted alongside `kjActiveSnap` model writes (convenience for `[kjActiveSnap]` one-way users). |
| `open` | readonly `Signal<boolean>` | — | — | Inherited from `KjDialogContext` via `KJ_DIALOG`. |
| `activeSnap` | readonly `Signal<number>` | — | — | Public for templating. |
| `dragging` | readonly `Signal<boolean>` | — | — | True while a pointer drag is in progress. |
| `dragProgress` | readonly `Signal<number>` | — | — | 0..1, for backdrop opacity binding in the wrapper. |
| `close(result?)` | method | — | — | Inherited; sets `activeSnap` to `-1`, then unmounts. |
| `snapTo(index)` | method | — | — | Programmatic snap change. |

### `KjBottomSheetHandle` (`[kjBottomSheetHandle]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjDisabled` | `input` | `boolean` | `false` | Via `KjDisabled` host directive. Disables drag and slider keys. |

Host bindings:

- `role="slider"` (or `"button"` when `snapPoints.length <= 1`)
- `aria-orientation="vertical"`
- `[attr.aria-valuemin]="0"`
- `[attr.aria-valuemax]="snapPoints().length - 1"`
- `[attr.aria-valuenow]="activeSnap()"`
- `[attr.aria-valuetext]="snapLabels()?.[activeSnap()]"`
- `tabindex="0"` (unless `kjDisabled`)
- `(keydown)`, `(pointerdown)`, `(pointermove)`, `(pointerup)`,
  `(pointercancel)` listeners.
- `[style.touch-action]="'none'"` while in drag mode (prevents native
  scroll from competing with the gesture).

### `KjBottomSheetTrigger` (`[kjBottomSheetTrigger]`)

Mirrors `KjDialogTrigger` 1:1, but provides `KJ_BOTTOM_SHEET` instead of
plain `KJ_DIALOG`. All inputs are forwarded with the `kjBottomSheet`
prefix instead of `kjDialog`. (Naming is verbose but explicit; consumers
who want shorter trigger names will use the service path.)

### `KjBottomSheetService.open(content, config)`

`KjBottomSheetOpenConfig<D>` extends `KjDialogOpenConfig<D>` with:

| Field | Type | Default | Notes |
|---|---|---|---|
| `snapPoints` | `readonly (number \| string)[]` | `[]` | |
| `initialSnap` | `number` | `snapPoints.length - 1` | |
| `snapLabels` | `readonly string[]` | `undefined` | |
| `dismissThreshold` | `number` | `0.4` | |
| `dismissVelocity` | `number` | `600` | |
| `fallbackBreakpoint` | `string` | `undefined` | |

`KjBottomSheetRef<C, R>` extends `KjDialogRef<R>`:

| Member | Kind | Notes |
|---|---|---|
| `snapTo(index: number)` | method | No-op + dev-warn in dialog-fallback mode. |
| `activeSnap()` | `Signal<number>` | Mirror of directive signal. |
| `afterDismissed(cb)` | method | Alias for `afterClosed`. |

> All inputs/outputs/models above carry the `kj` prefix on the directive
> path; service config keys stay un-prefixed because they are TS object
> fields, not Angular bindings. Same convention as `KjDialogService`.

## Examples to ship

`@doc-example` groups in the directive's TSDoc:

1. **Bottom sheet — basic** (`bottom-sheet.example.ts`): trigger →
   single-state bottom sheet, no snap points, no drag handle. Default
   theme. Demonstrates open/close, escape, backdrop, focus restore.
2. **Snap points** (`bottom-sheet.snap-points.example.ts`): three snaps —
   `0.25`, `0.5`, `0.95` — with a visible handle at the top of the panel.
   Shows drag-to-snap, keyboard slider semantics on the handle, snap
   labels announced via `aria-valuetext`.
3. **Service-launched** (`bottom-sheet.service.example.ts`): a filter
   form opened via `bottomSheet.open(FilterCmp, { snapPoints: [0.4, 1] })`. Demonstrates `DIALOG_DATA` injection (inherited from Dialog),
   `afterDismissed` payload, programmatic `snapTo`.
4. **Desktop fallback** (`bottom-sheet.fallback.example.ts`): same
   component, `fallbackBreakpoint: '(min-width: 768px)'`. Resize the
   window and the same content renders as a centred dialog ≥ md.
5. **Drag-handle disabled** (`bottom-sheet.no-handle.example.ts`):
   single-state sheet with no `[kjBottomSheetHandle]` projected — closes
   only via Escape, backdrop, or an explicit close button. Demonstrates
   the opt-out path for non-draggable sheets.
6. **Themed** (`bottom-sheet.retro.example.ts`,
   `bottom-sheet.finance.example.ts`): variant + size composition
   under retro and finance themes. Mirrors the dialog and speed-dial doc
   structure.

## Open questions / risks

1. **Bottom Sheet depends on Dialog gaps closing first.** Dialog's open
   questions list focus-trap wiring, service-path Escape, scroll lock,
   and overlay-service unification as outstanding. All four are blockers
   for Bottom Sheet because the directive inherits them via
   `hostDirectives`. Sequence: ship Dialog v1 hardening → then start
   Bottom Sheet.

2. **Snap-point representation.** Mixing numbers (vh fractions) and
   strings (CSS values) in one array is ergonomic but typed loosely
   (`number | string`). Alternative considered: separate `kjSnapVh:
   number[]` and `kjSnapPx: string[]`. Rejected — consumers commonly
   want a mix (e.g. `['148px', 0.5, 1]` for "peek 148 px / half / full").
   Risk: a consumer passing `1` expecting "1 px" instead of "100 vh"
   will be surprised. Mitigation: dev-mode warning when a number `>= 1`
   is used (suggest `'100vh'` if literal pixels intended).

3. **Auto-fallback re-mount mid-session.** When the viewport crosses
   `kjFallbackBreakpoint` while open, do we (a) leave the open instance
   alone and only swap on next open, or (b) close + re-open as a dialog?
   Recommendation: (a) — silently swapping is jarring and the user is
   already mid-task. Document this. Consumers wanting (b) can subscribe
   to `matchMedia` themselves and call `ref.close()`.

4. **Drag inside a scrollable body.** Distinguishing "user is scrolling
   the inner list" from "user is dragging the sheet" is the hardest UX
   problem in this component. Vaul handles it by checking
   `scrollTop === 0` on the nearest scroll ancestor at `pointerdown`,
   then locking into one mode for the rest of the gesture. Mirror this.
   Edge case: rubber-band scrolling on iOS Safari produces negative
   `scrollTop` momentarily — clamp to `Math.max(0, scrollTop)` for the
   check.

5. **Pointer events on iOS Safari.** Pointer Events are supported, but
   `pointercancel` fires aggressively during scroll attempts. The handle
   directive must treat `pointercancel` as "release without commit" and
   snap back to the pre-drag position. Tested on iOS 17+; pre-17 quirks
   are out of scope (kouji's browser support floor is current/last 2
   versions).

6. **Double-mount race when `kjFallbackBreakpoint` flips during open.**
   If the breakpoint matches *during* `open()` resolution (rare, but
   possible on a slow tablet flipping orientation), we could end up
   creating both a bottom sheet and a dialog. Guard: latch the chosen
   path at `open()` call time, not at mount time.

7. **Stacking with toasts.** Toasts ride above modals in CSS. A snap
   change on a bottom sheet can collide visually with a bottom-anchored
   toast region. Toast docs should call out the conflict and offer
   `KJ_TOAST_POSITION` overrides; bottom-sheet docs reference that.

8. **Programmatic snap on a fallback dialog.** The service path
   degrades `snapTo` to a no-op + dev-mode warning when running in
   dialog-fallback mode. An alternative is to throw — rejected because
   it forces consumers to branch on viewport, which defeats the whole
   point of the fallback. Document the no-op behaviour clearly.

9. **`kjBottomSheetTrigger` naming verbosity.** Inputs become
   `kjBottomSheetCloseOnEscape`, `kjBottomSheetCloseOnBackdrop`, etc.
   Long but unambiguous. Considered shortening to `kjBsCloseOnEscape`;
   rejected — abbreviations break grep-ability and future-search. Keep
   the long names; service path is the ergonomic alternative.

10. **`role="slider"` on the handle is unusual.** Most bottom-sheet
    libraries use `role="button"` for the handle. Slider is more
    accurate (continuous-by-snap, has min/max/now), better for AT, and
    enables keyboard-driven snap changes which 2.5.7 (Dragging
    Movements) effectively requires. Risk: AT users may not expect a
    slider in this context. Mitigation: thorough `aria-label` ("Resize
    sheet, half open, 3 of 5 stops") plus `aria-valuetext` from
    `kjSnapLabels`.

11. **`kjActiveSnap = -1` semantics.** Closing via the model
    (`kjActiveSnap.set(-1)`) vs. closing via `close(result)` are two
    paths to the same end state. v1 makes them equivalent: setting the
    model to `-1` calls `close()` internally. Risk: consumers binding
    `[(kjActiveSnap)]` won't know about the result payload. Document
    that programmatic close with a payload requires `close(result)`,
    not the model write.

12. **Handle-as-only-drag-origin vs. panel-wide drag.** Vaul allows
    drag from anywhere on the panel. Material has no drag at all. We
    require `[kjBottomSheetHandle]` to opt in, and the consumer
    chooses the drag area by placement (just the handle UI, the whole
    header, the entire panel). This is more flexible than either prior
    art but adds one decision for the consumer. Document the three
    common placements in the snap-points example.

13. **Animation hooks.** Open/close/snap transitions are CSS-only in
    the wrapper. The directive does not wait for animations to finish
    before unmounting on close (matches `KjDialog`). If a wrapper
    needs "wait for slide-out before destroying", add an
    `animationsDisabled` injection token and `_afterAnimationStateChange` event later — track in Dialog's open questions, not
    here.

14. **Touch-action on the panel during drag.** While dragging, the
    panel has `touch-action: none` to prevent native scrolling
    fighting the gesture. While not dragging, `touch-action: auto` so
    inner scrolling works. Switch is signal-driven from
    `dragging()`. Verify on Android Chrome that this swap doesn't
    abort the gesture mid-drag (it shouldn't — the lock is set on
    `pointerdown`).

15. **SSR.** The directive must not touch `window` / `matchMedia` /
    `document` outside `afterNextRender`. The
    `kjFallbackBreakpoint` resolution defers to `afterNextRender`
    (matches the `KjOverlayService` pattern); on the server, the
    sheet renders as a normal dialog (no harm — content is identical;
    only animation/positioning differs and that is CSS).
