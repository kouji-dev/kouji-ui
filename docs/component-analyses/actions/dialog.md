# Dialog

A modal overlay that interrupts the workflow to gather input or surface
information. Renders into `document.body`, traps focus, and dismisses on
Escape, backdrop click, or explicit close. Supports both an inline
declarative path (template + `[kjDialogTrigger]`) and a programmatic path
(`KjDialogService.open(...)`).

> Already shipped in core at `packages/core/src/dialog/` and wrapped in
> `packages/components/src/dialog/`. This analysis documents the existing
> shape, contrasts it with peer libraries, and lists the concrete gaps to
> close before declaring v1.

For the assertive sibling that uses `role="alertdialog"` and refuses
backdrop dismissal, see [`alert-dialog.md`](./alert-dialog.md). For
side-anchored variants see [`drawer.md`](./drawer.md) and
[`bottom-sheet.md`](./bottom-sheet.md). For the lightweight
trigger-anchored confirmation pattern see
[`confirm-popup.md`](./confirm-popup.md).

## Source comparison

| Concern | PrimeNG `p-dialog` | Angular Material `MatDialog` | shadcn/ui `Dialog` |
|---|---|---|---|
| Primary surface | Component (`<p-dialog [(visible)]>`) — declarative-first | Service (`MatDialog.open(Cmp)`) — programmatic-first | Compound components (`Dialog`, `DialogTrigger`, `DialogContent`) — declarative-first |
| Programmatic path | `DynamicDialogService` (separate API) | The default — every dialog goes through the service | None built-in; consumers manage `open` state with a signal/store |
| Markup ownership | Library renders chrome (header, close icon, content slot) | App template owns everything inside the panel | App template owns everything; primitives only wire roles + behaviour |
| Backdrop | Built-in `[modal]` flag, `[dismissableMask]` | Built-in scrim, `disableClose` to suppress | Separate `DialogOverlay` element styled by consumer |
| Focus trap | Custom internal trap | CDK `FocusTrap` + `FocusMonitor` | Radix focus-scope under the hood |
| Scroll lock | Yes, while open | Yes via `BlockScrollStrategy` | Yes via Radix |
| Resize / draggable | Yes (built-in) | No | No |
| Maximize / fullscreen | Yes (`[maximizable]`) | App-level concern | App-level concern |
| Position | `position` input (`top`, `bottomleft`, …) | `position` config + global vs. connected | Centred only (consumer can override) |
| Result | `(onHide)` event, no payload | `afterClosed(): Observable<R>` typed result | Consumer state |
| Stacking | Internal Z-index manager | Overlay container handles stacking | CSS-only |
| ARIA | `role="dialog"`, `aria-modal`, `aria-labelledby`/`describedby` left to consumer | Same; service auto-wires labelled-by when given a heading id | Same; primitives auto-wire labelled-by/described-by via context |

**Read-off:** PrimeNG buys feature breadth at the cost of opinionation
(chrome, draggable, maximize). Material is API-clean but service-only,
which forces a component-per-dialog pattern. shadcn is the closest
spiritual match for kouji — compound directives, headless, consumer owns
markup — but it leaves programmatic launching to the consumer.

## Decision

**Ship both paths.** Keep the existing compound directive set
(`KjDialogTrigger` + `KjDialog` + `KjDialogOverlay` + `KjDialogTitle` +
`KjDialogClose`) as the declarative entry point, and keep
`KjDialogService` for programmatic opens. Both paths share the same
context shape (`KjDialogContext`, exposed via the `KJ_DIALOG` token) so
that nested directives (`KjDialogClose`, `KjDialogTitle`) work
identically regardless of how the dialog was launched.

**No chrome, no draggable, no maximize, no resize.** kouji core ships
behaviour, not opinion. Resize/maximize/draggable are out of scope for
v1; revisit only if a real consumer surfaces a need.

**Centred only in core.** Side-anchored variants are
[`KjDrawer`](./drawer.md) and [`KjBottomSheet`](./bottom-sheet.md), not
configuration on `KjDialog`. The components package may apply alternate
positioning via CSS data attributes, but the directive contract stays
centred.

**Reuse `KjFocusTrap` and `KjOverlayService`.** Both already exist in
`packages/core/src/a11y/focus-trap.ts` and
`packages/core/src/primitives/overlay/overlay.ts`. The current
`KjDialogTrigger` open path duplicates the overlay container/lifecycle
logic that `KjOverlayService.createFromTemplate` already implements —
that is the first concrete gap to close.

## What exists today

`packages/core/src/dialog/`:

- `dialog.ts` — five directives: `KjDialogTrigger`, `KjDialog`,
  `KjDialogOverlay`, `KjDialogTitle`, `KjDialogClose`.
- `dialog.context.ts` — `KjDialogContext` interface and `KJ_DIALOG`
  token. Exposes `open`, `dialogId`, `closeOnEscape`, `closeOnBackdrop`,
  `close(result?)`.
- `dialog.service.ts` — `KjDialogService` with `open(Cmp | TemplateRef,
  config)`, returns `KjDialogRef` with `close(result?)` and
  `afterClosed(cb)`. Provides `DIALOG_DATA` token and
  `KjDialogOpenConfig`.
- `dialog.spec.ts` — covers trigger ARIA, mount on open, backdrop close,
  Escape close, axe audit.

`packages/components/src/dialog/`:

- `dialog.ts` — six wrapper components: `KjDialogComponent` (panel),
  `KjDialogOverlayComponent`, `KjDialogTitleComponent`,
  `KjDialogHeaderComponent` (chrome band, `align`),
  `KjDialogBodyComponent` (`padded`, `scroll`),
  `KjDialogFooterComponent` (`align`).
- `dialog.css` — fixed-overlay scrim + flex centring + panel chrome.

## Base features

| Feature | Where it lives | Notes |
|---|---|---|
| Open / close lifecycle | `KjDialogTrigger` (declarative) and `KjDialogRef` (service) | Both signal `open` state; both detach view + remove container on close. |
| Escape to close | `KjDialogTrigger.onEscape()` host listener | Gated by `kjDialogCloseOnEscape` (default `true`). Service path needs equivalent — see Open questions. |
| Backdrop click to close | `KjDialogOverlay.onOverlayClick()` | Gated by `kjDialogOverlayCloseOnClick` (per-instance) AND `KjDialogContext.closeOnBackdrop` (per-trigger). |
| Title wiring | `KjDialogTitle` sets `id`; `KjDialog` reads it for `aria-labelledby` | Computed id `${dialogId}-title`. |
| Result payload | `kjDialogClosed` output (declarative); `KjDialogRef.afterClosed(cb)` (service) | `unknown` payload by default; service is generic over `R`. |
| Component & template content | Service supports both `Type<C>` and `TemplateRef<C>` | Trigger directive is template-only by design. |
| Programmatic data injection | `DIALOG_DATA` token | Available inside the rendered component. |
| Stacking | None today | First-open-wins ordering; CSS `z-index` in components package. Native `<dialog>` top-layer not used. |
| Scroll lock | **Missing** | See Open questions. |
| Focus trap | **Missing in directive path; partial in service path** | Service auto-focuses first focusable but does not trap. See Accessibility. |
| Focus restore | **Missing in directive path; present in service path** | `KjDialogRef` restores `previouslyFocused`. Trigger directive must mirror this. |

## Accessibility

Target: **WCAG 2.1 AAA**. Mapping:

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.3.1 Info & Relationships | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` to title | `KjDialog` host bindings; `KjDialogTitle` provides id. |
| 2.1.1 Keyboard | Tab cycles within panel; Escape closes (when allowed) | `KjFocusTrap` (to be wired); `KjDialogTrigger.onEscape` document listener. |
| 2.1.2 No Keyboard Trap | Focus trap must release on close | Trap directive bound to `open()` signal; close detaches view. |
| 2.4.3 Focus Order | First focusable inside panel receives focus on open | Service does this; directive path does not — gap. |
| 2.4.7 Focus Visible | Inherited from `KjFocusRing` on focusable descendants | App-side controls keep their own focus rings. |
| 2.5.5 Target Size (AAA) | Close button ≥ 44×44 CSS px | Components package responsibility (button sizing presets). |
| 4.1.2 Name, Role, Value | Trigger announces `aria-haspopup="dialog"` and `aria-expanded` | `KjDialogTrigger` host bindings (already present). |
| 4.1.3 Status Messages | Result announcements when consumers want them | Optional: consumer composes `KjLiveRegion` inside the dialog body. |

**Keyboard contract**

| Key | Behaviour |
|---|---|
| `Tab` / `Shift+Tab` | Cycle through focusables inside the panel; never escapes the modal. |
| `Escape` | Close (unless `kjDialogCloseOnEscape="false"` / `disableClose: true`). |
| `Enter` / `Space` on close button | Standard button activation; closes with no payload. |

**Initial focus.** Documented order:
1. Element matching `kjDialogAutoFocus` selector if provided.
2. Element with the `[autofocus]` attribute inside the panel.
3. First tabbable element matching the standard focusable selector.
4. The panel itself (`tabindex="-1"`) as fallback so screen readers
   anchor inside the modal rather than on the body.

**Restore focus.** On close, focus returns to the element that was
focused immediately before opening (the trigger in 99 % of cases).
`KjDialogRef` does this today; `KjDialogTrigger` must do the same.

**Live region.** Not needed for the dialog itself — `aria-modal` plus
`aria-labelledby` is enough for AT to announce the heading on open.
Toast-style transient announcements remain a [`feedback/toast.md`](../feedback/toast.md)
concern.

## Composition model

**Five core directives, all standalone**, communicating through a single
`KJ_DIALOG` injection token.

```
KjDialogTrigger          (selector: [kjDialogTrigger])
  └── opens the TemplateRef into document.body
      provides KJ_DIALOG (useExisting: KjDialogTrigger)

  template projects:
    KjDialogOverlay      (selector: [kjDialogOverlay])
      └── KjDialog       (selector: [kjDialog], exportAs: 'kjDialog')
            ├── KjDialogTitle  (selector: [kjDialogTitle])
            └── KjDialogClose  (selector: [kjDialogClose])
```

**Service path** uses the same `KJ_DIALOG` contract: when the service
mounts a component, it provides a synthesised `KjDialogContext` bound to
the `KjDialogRef`, so a component rendered through `dialog.open(Cmp)`
can still use `[kjDialogClose]` and `[kjDialogTitle]` exactly as in the
declarative path. **(Gap today — see Open questions.)**

**Reused primitives**

- `KjFocusTrap` — applied as a `hostDirective` on `KjDialog`, bound to
  `KJ_DIALOG.open()`. Replaces any need for ad-hoc keydown handling.
- `KjOverlayService.createFromTemplate(...)` — already builds the
  hidden-by-default container in `document.body` and owns view
  detachment. `KjDialogTrigger.openDialog()` should delegate here
  instead of duplicating the container/`appendChild` logic.
- `KjDialogTitleId` (small new helper, optional) — generated id can stay
  inline; not worth a separate primitive.

**Wrapper composition (components package)**

`<kj-dialog>` applies `KjDialog` via `hostDirectives`, exposing the
`exportAs: 'kjDialog'` so consumers still write
`<kj-dialog #d="kjDialog">` and call `d.close('value')`. Header / Body /
Footer are content-projection slots, not structural directives — order
is declarative.

**Cross-component pointers**

- [`alert-dialog.md`](./alert-dialog.md) — same machinery, swap
  `role="dialog"` → `role="alertdialog"`, force `closeOnBackdrop=false`,
  require an `aria-describedby`-wired body. Will likely
  `hostDirective`-compose `KjDialog` rather than re-implement.
- [`drawer.md`](./drawer.md) and [`bottom-sheet.md`](./bottom-sheet.md)
  — same lifecycle (open/close, focus trap, scroll lock, escape) but
  different positioning. They should share `KjOverlayService` plus a
  small `KjOverlayDismissable` mixin (escape + backdrop). Worth
  extracting after Drawer ships.
- [`confirm-popup.md`](./confirm-popup.md) — uses `KjPopover` anchored
  to a trigger, not modal; explicitly does **not** use this directive
  set.
- [`toast.md`](../feedback/toast.md) — non-modal, live-region driven;
  shares `KjOverlayService` only.

## Inputs / Outputs / Models

### `KjDialogTrigger` (`[kjDialogTrigger]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjDialogTrigger` | `input.required` | `TemplateRef<unknown>` | — | The template projected into `document.body`. |
| `kjDialogCloseOnEscape` | `input` | `boolean` | `true` | Document-level keydown listener. |
| `kjDialogCloseOnBackdrop` | `input` | `boolean` | `true` | Read by `KjDialogOverlay`. |
| `kjDialogAutoFocus` | `input` | `boolean \| string` | `true` | **New.** `false` to skip; string = CSS selector inside panel. Mirrors service config. |
| `kjDialogRestoreFocus` | `input` | `boolean` | `true` | **New.** Focus the previously-focused element on close. |
| `kjDialogScrollLock` | `input` | `boolean` | `true` | **New.** Toggle `document.body` scroll while open. |
| `kjDialogClosed` | `output` | `unknown` | — | Emits the value passed to `close(result)`. |
| `open` | readonly `Signal<boolean>` | — | — | Public read-only state for trigger animations etc. |

### `KjDialog` (`[kjDialog]`, `exportAs: 'kjDialog'`)

No public inputs. Public method `close(result?: unknown): void`. Host
bindings set `role`, `aria-modal`, `aria-labelledby`, and
`(click)="$event.stopPropagation()"` so backdrop click does not bubble
through the panel.

### `KjDialogOverlay` (`[kjDialogOverlay]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjDialogOverlayCloseOnClick` | `input` | `boolean` | `true` | Per-instance override; ANDed with the trigger's `closeOnBackdrop`. |

### `KjDialogTitle` (`[kjDialogTitle]`)

No inputs. Sets `[attr.id]="ctx.dialogId + '-title'"`.

### `KjDialogClose` (`[kjDialogClose]`)

No inputs. `(click)` calls `ctx.close()` with no payload. For payloads
use `#d="kjDialog"` and `(click)="d.close(value)"`.

### `KjDialogService.open(content, config)`

`KjDialogOpenConfig<D>`:

| Field | Type | Default | Notes |
|---|---|---|---|
| `data` | `D` | `undefined` | Injected via `DIALOG_DATA`. |
| `panelClass` | `string \| string[]` | `undefined` | Applied to the dialog panel host. |
| `autoFocus` | `boolean \| string` | `true` | `false` = skip; string = selector. |
| `restoreFocus` | `boolean` | `true` | |
| `disableClose` | `boolean` | `false` | Disables both Escape and backdrop. |
| `width`, `maxWidth`, `height` | `string` | — | CSS values applied to panel. |
| `scrollLock` | `boolean` | `true` | **New.** Aligns service with directive path. |
| `ariaLabelledBy` / `ariaDescribedBy` | `string` | — | **New.** When the rendered component does not host a `[kjDialogTitle]`. |

`KjDialogRef<R>`:

| Member | Kind | Notes |
|---|---|---|
| `close(result?: R)` | method | Detaches view, removes container, restores focus, fires callbacks. |
| `afterClosed(cb)` | method | Multi-subscriber; today the array is cleared after firing — keep that to avoid leaks. |
| `disableClose` | `signal<boolean>` | **New.** Mutable so the open dialog can lock itself during async work. |
| `keydownEvents()` / `backdropClick()` | observables / signals | **Future.** Material parity if consumers ask. |

> All inputs/outputs/configs above carry the `kj` prefix on the directive
> path; service config keys stay un-prefixed because they are TS object
> fields, not Angular bindings.

## Examples to ship

Already on disk under `packages/core/src/dialog/`:

- `dialog.example.ts` — basic open + close (default theme)
- `dialog.retro.example.ts`, `dialog.finance.example.ts` — themed
  variants of the basic example
- `dialog.confirm.example.ts` — confirmation flow with `kjDialogClosed`
  payload

Already on disk under `packages/components/src/dialog/`:

- `dialog.default.example.ts` — wrapper-component composition
- `dialog.with-form.example.ts` — embeds a reactive form, validates
  before close
- `dialog.scrollable.example.ts` — long body with `[scroll]="true"` on
  `<kj-dialog-body>`
- `dialog.confirmation.example.ts` — `kjDialogClosed` to a signal

**To add for v1:**

1. **Service-launched component** — demonstrates
   `KjDialogService.open(MyDialogCmp, { data })`, including `DIALOG_DATA`
   injection and `afterClosed()`.
2. **Service-launched template** — `dialog.open(tplRef, { data })` for
   teams that want the service ergonomics without a dedicated
   component.
3. **Disable close while saving** — async save handler flips
   `disableClose` until the request resolves; demonstrates the
   newly-mutable signal.
4. **Nested dialog** — opening a confirmation dialog from inside an
   editor dialog. Validates focus-restore ordering across the stack.

## Open questions / risks

1. **Focus trap is not wired.** `KjFocusTrap` exists but neither the
   trigger nor the service applies it. Highest-priority gap; without it
   `aria-modal="true"` is a lie. Plan: add `KjFocusTrap` as a
   `hostDirective` of `KjDialog`, bound to `KJ_DIALOG.open()`.

2. **Auto-focus and focus-restore are missing on the directive path.**
   Service has them; trigger does not. Same code can move into a shared
   helper or onto `KjDialog` itself (which already injects the context).

3. **Service path does not handle Escape or backdrop.** Today
   `KjDialogService` mounts the component but does not register a
   document `keydown` listener and does not paint a backdrop. Either
   require the rendered component to use `[kjDialogOverlay]` /
   `[kjDialog]` itself, or move scrim + escape into a shared
   `mountDialog(...)` helper used by both paths. Pick one and document
   it; the current half-state is a footgun.

4. **Scroll lock is missing.** Body scroll continues underneath the
   modal. Plan: a tiny `KjScrollLock` primitive in
   `packages/core/src/primitives/interaction/` that toggles
   `document.body { overflow: hidden; padding-right: <scrollbar-w>px }`
   and is reused by Dialog, Drawer, Bottom Sheet.

5. **`KjOverlayService` duplication.** `KjDialogTrigger.openDialog()`
   creates and disposes its own `<div data-kj-dialog-container>` rather
   than calling `KjOverlayService.createFromTemplate`. Refactor target
   — but only after the service grows a `mount: 'body'` option (today
   `KjOverlayService` is template-only and assumes a `vcr.injector`).

6. **Stacking.** No z-index manager; relies on document order. Two
   modals at once collide visually. Acceptable for v1, revisit when a
   real consumer needs nested dialogs (the planned nested-dialog
   example will surface this).

7. **`@HostListener('document:keydown.escape')` runs even when the
   dialog is closed.** It guards on `_open()`, so the work is gated,
   but the listener still attaches for the lifetime of every trigger.
   Consider attaching only while `open` and detaching on close.

8. **`appRef.components[0]?.injector.get(ViewContainerRef, null)` in
   `KjDialogService.open` is fragile** — assumes the first bootstrapped
   component exposes a `ViewContainerRef`, which is true for the CLI
   default but not guaranteed. Switch to creating the embedded view via
   `tpl.createEmbeddedView(undefined, this.injector)` and attaching
   directly through `ApplicationRef.attachView`, the same pattern the
   trigger directive uses.

9. **`KjDialogRef.viewRef` is patched in via cast after construction.**
   Works, but reads as a smell. Prefer a two-step factory (`new
   KjDialogRef(...)` → `ref.attach(viewRef)`) or pass the view through
   the constructor by inverting creation order.

10. **`stopPropagation()` on `KjDialog` host click swallows legitimate
    panel-click events for consumers who want them.** Keep, but
    document.

11. **`KjDialogOverlay` swallows clicks even when the click started on
    the panel and ended on the backdrop (drag-out).** Pointer-down
    target tracking is the standard fix; not urgent but worth filing.

12. **Top-layer / native `<dialog>`.** Not used. Considered but skipped
    — Safari and SSR support are still uneven for the top-layer-only
    behaviours kouji would want, and the focus-trap story is identical
    either way.

13. **`aria-describedby` wiring for body content.** The current
    directive set has `KjDialogTitle` for labelledby but no
    `KjDialogDescription` counterpart. Add `[kjDialogDescription]`
    (sets id, wired via `KjDialogContext.descriptionId` signal) so
    longer-form modals can describe themselves to AT without manual
    id-juggling.

14. **Result type in declarative path is `unknown`.** Cannot be made
    generic from a directive (Angular directives are not generic over
    their `output<T>()`). Document the cast pattern in the example, or
    rely on consumers using the service path when they need typed
    results.

15. **No animation hooks.** Open/close are synchronous attach/detach.
    Components-package CSS handles entrance via CSS only. If we ever
    need an `animationsDisabled` injection or a "wait for animation
    before destroying" hook, model it on Material's
    `_afterAnimationStateChange` rather than inventing something
    custom.
