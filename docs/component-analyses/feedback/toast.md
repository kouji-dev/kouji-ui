# Toast

Transient notifications surfaced from a corner of the viewport: "Saved",
"Couldn't fetch data", "Undo?". Toasts auto-dismiss after a delay,
stack on top of each other, must announce themselves to assistive
tech without stealing focus, and must pause when the user is
interacting with them. They are the canonical "state of the page
is changing without an explicit user action" pattern.

> Already shipped in core at `packages/core/src/toast/` and wrapped in
> `packages/components/src/toast/`. This analysis documents the existing
> shape, contrasts it with peer libraries, and lists the concrete gaps to
> close before declaring v1.

For the persistent inline counterpart that lives in document flow and
does *not* auto-dismiss, see [`alert.md`](./alert.md). For pointer-
anchored hover/focus tips see [`tooltip.md`](./tooltip.md). For the
underlying announcement primitive see `KjLiveRegion` at
`packages/core/src/a11y/live-region.ts`. Toast is the deliberate
opposite of [`actions/dialog.md`](../actions/dialog.md) on focus
management — Dialog *takes* focus and traps it; Toast *never* takes
focus and only allows the user to opt in.

## Source comparison

| Concern | PrimeNG `p-toast` | Angular Material `MatSnackBar` | shadcn/ui `Sonner` |
|---|---|---|---|
| Primary surface | Component (`<p-toast>`) reading from `MessageService` | Service (`MatSnackBar.open(...)`) — programmatic only | `<Toaster />` viewport + imperative `toast(...)` function |
| Programmatic path | `MessageService.add({severity, summary, detail})` | The default — every snackbar opens through the service | The default — `toast()`, `toast.success()`, `toast.promise()` |
| Markup ownership | Library renders chrome (icon, summary, detail, close) | Library renders the bar; consumer can pass a component for the body | Consumer owns the toast template; Sonner renders the host + chrome by default |
| Concurrency | Multiple stacked, capped by `[showTransitionOptions]`/queue | One at a time; new opens replace previous | Stacked with a soft visible cap, full queue surfaces as space frees |
| Position | `position` input (`top-right`, `bottom-center`, …) | `horizontalPosition` × `verticalPosition` config | `position` prop (`top-right`, …) |
| Auto-dismiss | `life` per message | `duration` per open | `duration` per call, default global |
| Pause-on-hover | No | No | Yes (timer pauses while hovered/focused, resumes on leave) |
| Action button | `[showAcceptIcon]`/buttons inside template | `openFromComponent` or `open(msg, action)` returns ref to read action click | `action: { label, onClick }` per call |
| Variants | `severity: success | info | warn | error` | None built-in (consumer styles) | `success` / `error` / `warning` / `info` / `promise` / `loading` |
| Promise / loading | No | No | `toast.promise(p, { loading, success, error })` |
| ARIA | `role="alert"` (always assertive) | `role="status"` polite by default, `politeness` config | Single `aria-live="polite"` region; `error` / `loading` flip to assertive |
| Focus | Focus stays put; F6 not provided | Focus stays put; `MatSnackBarRef.afterOpened()` does not move focus | F6 jumps focus into the toast region; reverse F6 returns |
| Stacking math | DOM order, fixed offsets | One-at-a-time, no math | Per-toast `--y-offset`, `--scale`, `--z-index` driven by index in the live queue |
| Hover expansion | No | No | Stack collapses by default, fans out (`expand`) on hover/focus |

**Read-off:** Material picks up where Bootstrap left off — one snackbar
at a time, polite by default, no stacking story. PrimeNG ships stacking
but defaults to `role="alert"` for everything, which over-announces
non-error toasts. Sonner is the only library that actually solves
*all* of "stack, pause, F6, promise, expand-on-hover" together. The
existing kouji core implementation already follows the Sonner shape
(`KjToastViewport` + `KjToast` + `KjToastService` + a strategy token
that defaults to a Sonner-flavoured config).

## Decision

**Yes, this needs core.** Toast is heavy state (a queue, per-toast
timers, paused-on-hover bookkeeping, ResizeObserver-driven layout) plus
non-trivial a11y (live region politeness keyed off variant, role
flipping, no-focus-steal, F6 focus shortcut). All of that belongs in
core, behind directives, so the components package is purely
presentational.

**Ship a service *and* a viewport directive — not one or the other.**
Material's service-only API forces every consumer to care about how
the snackbar is rendered. Sonner's "drop a `<Toaster />` once" pattern
is the right ergonomics for Angular too: one declarative
`<kj-toast-viewport>` (or `[kjToastViewport]`) mounted in the app
shell, and a `KjToastService` injected anywhere with `success()`,
`error()`, `warning()`, `info()`, `show(template, options)`,
`promise()`, `dismiss(id)`, `dismissAll()`. The service writes to a
signal; the viewport reads from it. No imperative DOM mounting from
the service — that keeps the service SSR-safe, testable without a
DOM, and lets multiple viewports coexist (e.g. a per-region
notification feed).

**Composition: three directives + one service + one strategy token.**

- `KjToastViewport` (`[kjToastViewport]`) — the fixed-position region
  that hosts the live area, manages hover/focus pause, exposes layout
  state as CSS variables, and (new for v1) owns the F6 focus shortcut.
- `KjToast` (`[kjToast]`) — one rendered toast item; sets
  `role="status"` (polite variants) or `role="alert"` (destructive),
  exposes `--kj-toast-index`, `--kj-toast-before`, `--kj-toast-after`,
  `--kj-toast-height`, `data-front`.
- `KjToastClose` (`[kjToastClose]`) — convenience dismiss button when
  the consumer doesn't want to write `(click)="ctx.dismiss()"`.
- `KjToastService` (suffix kept — `KjToast` already names the
  directive; matches the [class-naming rule](../../../CLAUDE.md#class-naming-rule)
  and mirrors `KjDialogService`).
- `KJ_TOAST_STRATEGY` token — Sonner-style defaults
  (`KJ_TOAST_SONNER_STRATEGY`) and a flat-list alternative
  (`KJ_TOAST_LIST_STRATEGY`), provided via
  `provideKjToastSonnerStrategy({...})` etc.

**Reuse `KjLiveRegion` semantics, not the directive itself.** The
viewport host already binds `aria-live="polite"`,
`aria-atomic="false"`, and `aria-relevant="additions removals"`
directly. That's the right call: `KjLiveRegion` is a
`textContent`-driven announcer for *imperative* messages; the toast
viewport announces by *adding/removing children*, which is a different
mode (`aria-relevant="additions removals"` vs. atomic re-render).
Document the divergence so consumers don't mix them up — and add a
single hidden `[kjLiveRegion]` strip *inside* the viewport for
non-rendered urgent messages (e.g. `toast.error('...', { announceOnly:
true })` for cases where the visual toast is shown but a screen-reader
phrasing of it is desirable, or for promise-toast state transitions).

**No chrome in core.** The directive set ships behaviour and ARIA;
icons, padding, animation, "swipe to dismiss" gestures, progress bar
under the message — all live in the components package or in consumer
templates. The components package wrappers (`KjToastViewportComponent`,
`KjToastComponent`, `KjToastCloseComponent`) already follow this
split.

## What exists today

`packages/core/src/toast/`:

- `toast.ts` — three directives: `KjToast`, `KjToastViewport`,
  `KjToastClose`. Stack math, ResizeObserver-driven `--kj-toast-height`
  / `--kj-toast-front-height`, hover-driven `data-expanded`.
- `toast.service.ts` — `KjToastService` with `show`,
  `success`/`error`/`warning`/`info` shorthands, `dismiss`,
  `dismissAll`, `contextFor`. Per-toast `setTimeout` for auto-dismiss.
- `toast.strategy.ts` — `KjToastStrategy` interface,
  `KJ_TOAST_SONNER_STRATEGY` (3 visible, 14 px gap, bottom-end, 4 s,
  expand-on-hover), `KJ_TOAST_LIST_STRATEGY` (unlimited, no expansion,
  5 s), `provideKjToastSonnerStrategy`,
  `provideKjToastListStrategy`, `provideKjToastStrategy`.
- `toast.types.ts` — `KjToastPositionX` (`'start' | 'center' | 'end'`),
  `KjToastPositionY` (`'top' | 'bottom'`).
- `toast.spec.ts` — covers role flipping, `data-variant`, viewport
  `aria-live`/`role`, service queue mutations, axe audit.
- Examples: `toast.example.ts`, `toast.retro.example.ts`,
  `toast.finance.example.ts`.

`packages/components/src/toast/`:

- `toast.ts` — `KjToastViewportComponent` (`<kj-toast-viewport>`),
  `KjToastComponent` (`<kj-toast>`), `KjToastCloseComponent`
  (`<kj-toast-close>`). All `display: contents` wrappers around the
  core directives.
- `toast.css` — viewport positioning, stack offsets, expand-on-hover
  transforms.
- Examples: `toast.default.example.ts`, `toast.variants.example.ts`,
  `toast.with-action.example.ts`, `toast.dismissible.example.ts`.

## Base features

| Feature | Where it lives | Notes |
|---|---|---|
| Show string | `KjToastService.show(message, options)` | Renders via the viewport's `[kjToastDefaultTemplate]`. |
| Show template | `KjToastService.show(template, options)` | Per-call template; the viewport's default template is ignored for that toast. |
| Variants | `KjToastService` `variant` option, mirrored on `[kjToast]` `[kjToastVariant]` | `'default' \| 'success' \| 'destructive' \| 'warning'`. Names match daisyUI/shadcn (`destructive`, not `error`). |
| Auto-dismiss | `options.duration` (ms); strategy default | `0` = persistent. Per-toast `setTimeout`. |
| Manual dismiss | `ctx.dismiss()` (template), `[kjToastClose]="id"` button, `service.dismiss(id)` | All three converge on `KjToastService.dismiss`. |
| Pause on hover/focus | `KjToastViewport` `mouseenter`/`focusin` listeners | **Currently only flips `data-expanded`. Timers do not pause — gap.** See Open questions. |
| Stacking | `KjToastViewport.renderable()` slices by `kjToastMaxVisible` | Newest at the front (`data-front="true"`). |
| Stack math (CSS) | `--kj-toast-index`, `--kj-toast-before`, `--kj-toast-after`, `--kj-toast-height`, `--kj-toast-front-height`, `--kj-toast-gap`, `--kj-toast-z-index`, `--kj-toasts-count` | Driven from `KjToast` and `KjToastViewport`. CSS owns transform / scale / opacity per index. |
| Position | `kjToastPositionX` / `kjToastPositionY` inputs, defaulted from strategy | Written as `data-position-x` / `data-position-y` for CSS. |
| Expand on hover | `KjToastViewport.expanded()` computed | `kjToastExpand` input overrides; otherwise driven by hover when `strategy.expandOnHover`. |
| Live announcement | Viewport `aria-live="polite"` + per-toast `role="status"`/`role="alert"` | Variant flips role: `destructive` → `alert` (assertive); everything else → `status` (polite). |
| Action button | Pure composition — consumer drops a `<button kjButton>` inside the per-call template | No dedicated directive needed; closing on action is `(click)="ctx.dismiss(); doUndo()"`. |
| Promise / loading | **Missing — gap.** `toast.promise(p, { loading, success, error })` should mutate a single toast through three states rather than dismissing+re-creating. |
| Custom data | `options.data` typed via the `TemplateRef` generic; reachable as `ctx.data` | Already wired through `KjToastTemplateContext<TData>`. |
| Strategy override | `provideKjToastSonnerStrategy(overrides)` etc. | Both viewport and service inject `KJ_TOAST_STRATEGY`. |

## Accessibility

Target: **WCAG 2.1 AAA**. Mapping:

| Criterion | Requirement | Where it lives |
|---|---|---|
| 1.3.1 Info & Relationships | Viewport is `role="region"` with `aria-label="Notifications"`; each toast is `role="status"` or `role="alert"`; toasts are `aria-atomic="true"` | Viewport host bindings; `KjToast.role()` computed from variant. |
| 1.4.13 Content on Hover or Focus | Toast must be **dismissible**, **hoverable** (no disappearance on hover), and **persistent** (until explicitly dismissed or no longer relevant) | Hover/focus on the viewport must pause the auto-dismiss timer — see Open questions #1. |
| 2.1.1 Keyboard | Action button + close button must be reachable by Tab; Tab does not auto-stop in the toast — F6 jumps in | F6 cycles into the viewport (new); inside, Tab visits each focusable in order. |
| 2.1.2 No Keyboard Trap | F6 enters the toast region; another F6 (or `Escape`) returns focus to the previously focused element | Viewport tracks `previouslyFocused` while it has focus, restores on Escape. |
| 2.2.1 Timing Adjustable (AAA) | Auto-dismiss must pause/extend on user interaction; user can disable timing (`duration: 0`) | Pause-on-hover/focus + `0` for persistent. |
| 2.2.2 Pause, Stop, Hide | Same: user can pause/stop/hide moving content | Same mechanisms; explicit close also satisfies. |
| 2.4.3 Focus Order | Toast does **not** auto-focus; explicit F6 only | Viewport never calls `.focus()` on its children automatically. Asserted by spec. |
| 2.4.7 Focus Visible | Inherited via `KjFocusRing` on focusable descendants (`KjButton`, `KjToastClose` button) | Components-package responsibility. |
| 2.5.5 Target Size (AAA) | Close button + action button ≥ 44×44 CSS px | Components-package button sizing presets. |
| 4.1.2 Name, Role, Value | Close button needs `aria-label` (`'Dismiss notification'` default); action button uses its own visible text | Wrapper `<kj-toast-close>` should default `aria-label` if `<ng-content>` is empty — currently relies on consumer. Gap. |
| 4.1.3 Status Messages | The whole component category is the canonical example. Polite by default, assertive only for `destructive`. | `aria-live="polite"` on viewport; `role="alert"` on destructive items. |

**Politeness model.** The viewport itself stays `aria-live="polite"`,
`aria-relevant="additions removals"`, `aria-atomic="false"`. Each toast
sets its own role:

- `default` / `success` / `warning` → `role="status"` (implicit polite)
- `destructive` → `role="alert"` (implicit assertive — interrupts)

This matches WAI-ARIA APG's Alert pattern guidance: use `role="alert"`
when the announcement should preempt, and the gentler
`role="status"`/`aria-live="polite"` for routine confirmations.
Browsers consistently let an assertive child announcement preempt a
polite parent region.

**No-focus-steal contract.** The service never focuses anything.
Verified by a spec: open ten toasts, assert `document.activeElement`
is unchanged. Rendering an action button inside a toast does **not**
move focus to the button — the user must Tab or F6 in.

**F6 focus shortcut (new for v1).**

| Key | Behaviour |
|---|---|
| `F6` (when toasts present) | Focus enters the front-most toast's first focusable, or the toast itself (`tabindex="-1"`). Viewport stores `previouslyFocused`. |
| `F6` (while focus is inside the viewport) | Returns focus to `previouslyFocused`. |
| `Escape` (while focus is inside the viewport) | Returns focus to `previouslyFocused` and dismisses the toast that has focus (or the front-most if focus is on the viewport itself). |
| `Tab` / `Shift+Tab` (while focus inside) | Cycles within the viewport between toasts' focusables; falling off either end returns focus to `previouslyFocused`. |

The shortcut is registered as a `document:keydown.f6` listener gated on
`toasts().length > 0`. That's the same pattern Sonner uses on the web
and it is the WAI-ARIA APG-recommended way to reach a complementary
landmark by keyboard.

**Reduced motion.** Stack expand/collapse, swipe-out animations, and
slide-in transforms must respect `prefers-reduced-motion: reduce` —
opacity-only, no transform or duration. Components-package CSS
responsibility; flag in the CSS file.

**Touch.** Swipe-to-dismiss is a v1.x candidate, not v1. When added,
it must coexist with the close button (touch users get *two* affordances)
to satisfy 2.5.1 (Pointer Gestures: simple alternative).

## Composition model

**Three core directives, all standalone**, sharing state through
`KjToastService` (signals) rather than a context token. No `KJ_TOAST`
injection token is needed because the queue is a service singleton —
this differs from Dialog, where each open is a separate instance.

```
KjToastService                      (programmatic API; signal-backed queue)
  │
  ▼
KjToastViewport       (selector: [kjToastViewport], exportAs: 'kjToastViewport')
  │   ├── reads svc.toasts() → renderable()
  │   ├── owns hover/focus pause, F6 shortcut, position attrs
  │   └── exposes layout CSS variables on its host
  │
  └── for each renderable:
        KjToast       (selector: [kjToast])
          │   ├── role = computed(() => variant === 'destructive' ? 'alert' : 'status')
          │   ├── kjToastId binds the live queue position
          │   └── exposes per-item CSS variables
          │
          └── KjToastClose (selector: [kjToastClose]) — optional dismiss button
```

**Reused primitives**

- `KjLiveRegion` (`packages/core/src/a11y/live-region.ts`) — *not*
  wrapped on the viewport host (the viewport's announcement model is
  add/remove children, not text-replacement), but a hidden
  `[kjLiveRegion]` strip is added inside the viewport to support an
  `announceOnly`/promise-toast state transition phrasing without
  re-rendering the toast item itself.
- `KjFocusRing` — applied by the components package on focusable
  descendants of the toast (close button, action button); core toast
  directives stay layout-only.
- `KjVariant` / `KjSize` — *not* applied at the core level. `KjToastVariant`
  is a domain-specific union (`default | success | destructive | warning`)
  driven by ARIA-role flipping, not by the generic visual `KjVariant`
  primitive. The components-package wrapper may map between them.
- `KjButton` (components package) — used inside per-call templates for
  action buttons. No special integration; consumer just nests it.
- `KjFocusTrap` is **not** used. Toasts must not trap focus — that's
  the deliberate contrast with Dialog (see
  [`actions/dialog.md`](../actions/dialog.md)).
- `KjVisuallyHidden` — used inside `<kj-toast-close>` when the close
  button has only an icon, to render the accessible name.

**Wrapper composition (components package)**

`<kj-toast-viewport>` mounts the `[kjToastViewport]` directive once.
`<kj-toast>` wraps `[kjToast]` for use inside per-call templates.
`<kj-toast-close>` wraps `[kjToastClose]` and renders a `<button>` with
sensible default `aria-label`. Per-call templates (`toast.show(tplRef,
…)`) do all the layout — the wrappers exist so consumers don't have to
hand-write the directive bindings.

**Cross-component pointers**

- [`alert.md`](./alert.md) — persistent inline counterpart. Same
  variant set, same role-flipping (`status`/`alert`), but lives in
  document flow with no auto-dismiss, no queue, no live region. Toast
  imports nothing from Alert; the two share **only** the variant
  vocabulary.
- [`tooltip.md`](./tooltip.md) — also a transient feedback surface,
  but anchor-positioned, hover/focus driven, and **never** uses
  `aria-live`. Tooltip uses `aria-describedby`; Toast uses an
  add/remove live region. Different mental model.
- [`actions/dialog.md`](../actions/dialog.md) — direct contrast on
  focus management: Dialog traps and auto-focuses; Toast does
  neither. Both use `KjOverlayService` only loosely (Toast manages
  its own viewport — no overlay container is needed because the
  viewport is a long-lived sibling of the app root, not a per-open
  detachable view).
- `KjLiveRegion` (`packages/core/src/a11y/live-region.ts`) — used
  *inside* the viewport for promise-toast phrasing; not used as the
  viewport's own announcement mechanism.
- [`actions/button.md`](../actions/button.md) — action buttons inside
  toasts are plain `KjButton` instances. Nothing toast-specific.

## Inputs / Outputs / Models

### `KjToastViewport` (`[kjToastViewport]`, `exportAs: 'kjToastViewport'`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjToastDefaultTemplate` | `input` | `TemplateRef<KjToastTemplateContext> \| null` | `null` | Used for `service.show(message, …)` calls. Per-call templates override. |
| `kjToastMaxVisible` | `input` | `number` | strategy `maxVisible` | Excess stays queued and surfaces as space frees. `Number.POSITIVE_INFINITY` disables capping. |
| `kjToastGap` | `input` | `number` | strategy `gap` | Pixel gap exposed as `--kj-toast-gap`. |
| `kjToastBaseZIndex` | `input` | `number` | strategy `baseZIndex` | `--kj-toast-z-index`. |
| `kjToastPositionX` | `input` | `KjToastPositionX` | strategy `positionX` | `'start' \| 'center' \| 'end'` → `data-position-x`. |
| `kjToastPositionY` | `input` | `KjToastPositionY` | strategy `positionY` | `'top' \| 'bottom'` → `data-position-y`. |
| `kjToastExpand` | `input` | `boolean \| undefined` | `undefined` | Manual override; `undefined` = follow strategy + hover. |
| `kjToastPauseOnHover` | `input` (**new for v1**) | `boolean` | `true` | Wires hover/focus to a service-level pause for auto-dismiss timers. |
| `toasts` | readonly signal | `Signal<KjToastItem[]>` | — | Re-export of `svc.toasts`. |
| `renderable` | readonly signal | `Signal<KjToastRenderable[]>` | — | Capped + paired with template + bound context. |
| `expanded` | readonly signal | `Signal<boolean>` | — | Resolved expand state. |

Host: `role="region"`, `aria-live="polite"`,
`aria-atomic="false"`, `aria-relevant="additions removals"`,
`data-position-x`, `data-position-y`, `data-expanded`. Add (new):
`tabindex="-1"` on the viewport itself so F6 has a fallback target.

### `KjToast` (`[kjToast]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjToastVariant` | `input` | `KjToastVariant` | `'default'` | `'default' \| 'success' \| 'destructive' \| 'warning'`. Drives `role`. |
| `kjToastId` | `input` | `string \| null` | `null` | Bound from `ctx.id` so the directive can look up its position in the queue. |

Host: `[attr.role]`, `aria-atomic="true"`, `data-variant`,
`data-front`, plus `--kj-toast-index`, `--kj-toast-before`,
`--kj-toast-after`, `--kj-toast-height`.

### `KjToastClose` (`[kjToastClose]`)

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjToastClose` | `input.required` | `string` | — | Toast id to dismiss. |

Host: `(click)` → `KjToastService.dismiss(id)`. The components-package
wrapper renders a `<button type="button">` with default
`aria-label="Dismiss notification"`.

### `KjToastService`

`KjToastOptions<TData>`:

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | `string` | auto (`crypto.randomUUID()`) | Override to address the toast later (replace, dismiss). |
| `title` | `string` | — | Optional title rendered above the message. |
| `variant` | `KjToastVariant` | `'default'` | Drives role + chrome. |
| `duration` | `number` | strategy `duration` | ms; `0` = persistent. |
| `data` | `TData` | — | Typed via `TemplateRef<KjToastTemplateContext<T>>` generic. |
| `announceOnly` | `boolean` | `false` | **New for v1.** When `true`, push the message through the inner `[kjLiveRegion]` strip without rendering a visible toast. Useful for lightweight confirmations and promise-state phrasing. |

`KjToastTemplateContext<TData>` (extends `KjToastContext<TData>`):

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Unique. |
| `variant` | `KjToastVariant` | |
| `message` | `string \| undefined` | Set when shown via the string-based API. |
| `title` | `string \| undefined` | |
| `data` | `TData \| undefined` | Strongly typed via the template generic. |
| `dismiss` | `() => void` | Bound to the service. |
| `update` | `(patch: Partial<KjToastItem<TData>>) => void` | **New for v1.** In-place mutation, used by `promise()` to morph a loading toast into a success or error toast without re-rendering. |
| `$implicit` | `KjToastContext<TData>` | For `<ng-template let-ctx>`. |

Methods:

| Member | Signature | Notes |
|---|---|---|
| `show` | `show(template, options?) \| show(message, options?)` | Returns the toast id. |
| `success` | `(message, options?) => string` | Variant shortcut. |
| `error` | `(message, options?) => string` | Variant shortcut (`destructive`). |
| `warning` | `(message, options?) => string` | Variant shortcut. |
| `info` | `(message, options?) => string` | Variant shortcut (`default`). |
| `dismiss` | `(id) => void` | Cancels the timer + removes from queue. |
| `dismissAll` | `() => void` | Clears every timer + the queue. |
| `update` (**new**) | `(id, patch) => void` | Patch an existing toast without changing its id; used by `promise()`. |
| `promise` (**new**) | `<T>(p: PromiseLike<T>, msgs: { loading: string \| TplRef; success: string \| ((v: T) => string \| TplRef); error: string \| ((e: unknown) => string \| TplRef) }, options?) => string` | Shows a loading toast (variant `default`, persistent), morphs it into success or destructive on settle, then auto-dismisses. Returns the toast id. |
| `pause` (**new, internal**) | `(reason: 'hover' \| 'focus' \| 'manual') => void` | Marks all in-flight timers as paused; ref-counted by reason. |
| `resume` (**new, internal**) | `(reason: 'hover' \| 'focus' \| 'manual') => void` | Decrements; on zero, recomputes remaining duration and re-arms timers. |
| `contextFor` | `(toast) => KjToastTemplateContext` | Used by viewport when rendering. |

`KJ_TOAST_STRATEGY` (`KjToastStrategy`):

| Field | Type | Notes |
|---|---|---|
| `maxVisible` | `number` | Cap on rendered toasts. |
| `gap` | `number` | px gap. |
| `baseZIndex` | `number` | Stacking root. |
| `positionX` | `KjToastPositionX` | `'start' \| 'center' \| 'end'`. |
| `positionY` | `KjToastPositionY` | `'top' \| 'bottom'`. |
| `duration` | `number` | Default ms. |
| `expandOnHover` | `boolean` | Spread out on hover/focus. |
| `pauseOnHover` (**new for v1**) | `boolean` | Pause auto-dismiss timers on hover/focus. Distinct from visual expansion. |

Provided via `provideKjToastSonnerStrategy(overrides?)`,
`provideKjToastListStrategy(overrides?)`, or
`provideKjToastStrategy(strategy)`.

> All directive-level inputs carry the `kj` prefix; service options
> stay un-prefixed because they are TS object fields, not Angular
> bindings — same convention as `KjDialogOpenConfig`.

## Examples to ship

Already on disk under `packages/core/src/toast/`:

- `toast.example.ts` — basic show/success/error against a per-call
  template (default theme).
- `toast.retro.example.ts`, `toast.finance.example.ts` — themed
  variants of the basic example.

Already on disk under `packages/components/src/toast/`:

- `toast.default.example.ts` — `<kj-toast-viewport>` + service injection.
- `toast.variants.example.ts` — one button per variant.
- `toast.with-action.example.ts` — `Undo` action inside the per-call
  template.
- `toast.dismissible.example.ts` — manual close button via
  `<kj-toast-close>`.

**To add for v1:**

1. **Pause on hover / focus** — open a 2-second toast, hover for 5 s,
   show that the dismiss timer waits. Same for focus via Tab.
2. **F6 focus shortcut** — visible instructions ("Press F6 to manage
   notifications"); demonstrate F6-in / Escape-out / F6-out.
3. **Promise toast** — `toast.promise(fetch(...), { loading: 'Saving',
   success: 'Saved!', error: e => 'Failed: ' + e })`. Single toast
   morphs through three states.
4. **Position grid** — a 3 × 2 picker (top/bottom × start/center/end)
   re-providing the strategy at the demo level.
5. **Persistent + manual dismiss** — `duration: 0` with a required
   action button (the canonical "Undo" prompt).
6. **Multiple viewports** — two `<kj-toast-viewport>` instances, one
   filtered to `variant === 'destructive'`. Validates that the
   service is the single source of truth and viewports are pure
   readers.
7. **Announce-only** — `toast.show('Auto-saved', { announceOnly:
   true })` for cases where a visible toast would be noise but the
   AT confirmation is wanted.
8. **Custom-template with typed data** — strongly-typed `data` payload
   driving icon + colour, demonstrating the `TData` generic on
   `KjToastTemplateContext`.

## Open questions / risks

1. **Pause-on-hover is half-implemented.** `KjToastViewport` already
   listens for `mouseenter`/`focusin` and flips `data-expanded`, but
   it does **not** pause the per-toast `setTimeout` in the service.
   Plan: add `KjToastService.pause(reason)`/`resume(reason)`,
   ref-counted; the viewport calls
   `pause('hover')`/`resume('hover')` on the existing host listeners
   when `kjToastPauseOnHover` is `true` (default). On `pause`, store
   `remainingMs = duration - elapsed`; on `resume`, re-arm with the
   remaining. WCAG 2.2.1 (AAA) and 1.4.13 both depend on this — it's
   the highest-priority gap.

2. **F6 focus shortcut is missing.** Sonner ships it; APG recommends
   it for complementary landmarks; without it, keyboard users have
   no way to reach a toast's action button before it auto-dismisses.
   Plan: a `document:keydown.f6` listener on the viewport (gated on
   `toasts().length > 0` and `event.target` not already inside the
   viewport), plus `Escape` to leave + dismiss the focused toast.
   Add a spec.

3. **No explicit no-focus-steal contract test.** The service does not
   focus anything today, but nothing in the spec proves it. Add: open
   ten toasts, assert `document.activeElement` is unchanged.

4. **Promise toast (`toast.promise`) and `toast.update` are missing.**
   Sonner pattern; needs a `service.update(id, patch)` mutation that
   preserves the toast's queue position. Without `update`, promise
   toasts have to dismiss + re-create, which causes a flash and a
   redundant AT announcement.

5. **`announceOnly` is missing.** Promise-toast state transitions
   ("Saving…" → "Saved!") want to push a phrasing through a live
   region without re-announcing the visual toast. A hidden
   `[kjLiveRegion]` strip inside the viewport, written by
   `service.show(msg, { announceOnly: true })` and by `update`'s
   delta when the variant changes, covers this.

6. **Default `aria-label` on `<kj-toast-close>` is missing.**
   Components-package wrapper renders `<button type="button">` but
   relies on the consumer to provide a label. When `<ng-content>` is
   empty (icon-only close), there is no accessible name. Plan: bind
   `[attr.aria-label]="ariaLabel() ?? 'Dismiss notification'"` on the
   wrapper, with an `ariaLabel` input override.

7. **Variant naming: `destructive` vs. `error`.** Matches shadcn and
   the existing `KjButtonVariant`, but PrimeNG/Material/Sonner all
   use `error`. Keep `destructive` for vocabulary alignment with the
   rest of kouji; document that the **service** still exposes
   `service.error(...)` as the shorthand so the imperative API reads
   naturally.

8. **`kjToastViewport` is `aria-live="polite"` but per-toast `role`
   flips to `alert`.** Some screen-reader/browser combos
   double-announce: once for the polite parent's mutation and once
   for the alert child. Verified workaround: when a toast renders
   with `role="alert"`, the viewport could temporarily set
   `aria-relevant="additions"` only (no `removals`) for that one
   toast, but the cleaner fix is to leave it and accept that
   destructive toasts may be slightly "louder" — that's the
   *intent*. Document and move on.

9. **Stack height is measured per-toast via `ResizeObserver`.** Works
   well, but on very long messages the front toast's measurement
   races the entrance animation, briefly showing the wrong stacked
   offset. Plan: measure with `getBoundingClientRect` after
   `transitionend` rather than on first paint. Low-priority polish.

10. **Multiple viewports double-announce.** If a consumer mounts two
    `<kj-toast-viewport>` and both render the same toast, the same
    addition fires two AT announcements. Plan: when more than one
    viewport is present, the service warns and the second viewport
    sets `aria-live="off"` by default (override-able). Or document
    that multi-viewport is a "read-only filtered view" pattern and
    consumers are expected to filter. The latter is simpler.

11. **SSR.** `crypto.randomUUID()` is fine in modern Node; the
    `setTimeout`/`ResizeObserver` paths short-circuit on the server
    because directives don't `afterNextRender` there. The service's
    `_toasts` signal is safe. Add a token-level note in the strategy
    file.

12. **Swipe-to-dismiss** (touch). Out of scope for v1. When added,
    must coexist with the close button (WCAG 2.5.1). File as v1.x.

13. **Stacking order vs. queue order.** Today the *newest* toast is
    the front. Some consumers expect the *oldest* persistent toast to
    stay in front and new ones to push it down. Add a `stackOrder:
    'newest-front' | 'newest-back'` strategy field if a consumer asks;
    not v1.

14. **Action button focus on auto-dismiss.** If the user has Tabbed
    onto a toast's action button and the timer fires (because
    pause-on-focus wasn't yet wired), focus is lost to `<body>`. The
    pause-on-focus fix in #1 prevents this; until it lands, document
    as a known issue.

15. **Variant→role mapping is hard-coded.** Some teams want `warning`
    to be assertive too. Plan: expose
    `KjToastStrategy.assertiveVariants: KjToastVariant[]`
    (default `['destructive']`) so they can flip without re-implementing
    the directive. Low priority; nobody has asked yet.
