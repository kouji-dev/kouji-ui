# Alert Dialog

> **Roadmap:** Actions / #5 — *service-based, not a component*.
> **Builds on:** [Dialog](./dialog.md). Alert Dialog is a constrained, opinionated specialisation of `KjDialog` for **destructive / blocking confirmations**.
> **Cross-refs:** [Confirm Popup](./confirm-popup.md) (lighter, anchored variant), [Toast](../feedback/toast.md) (non-blocking), [Dialog](./dialog.md) (general modal).

---

## 1. Source comparison

### PrimeNG — `ConfirmDialog` + `ConfirmationService`

- Imperative service `ConfirmationService.confirm({ message, header, icon, accept, reject, acceptLabel, rejectLabel, acceptButtonStyleClass, rejectButtonStyleClass, defaultFocus })`.
- A single `<p-confirmDialog>` element must be placed once in the app shell; the service broadcasts confirmation requests through a `Subject` to any mounted dialog.
- `defaultFocus: 'accept' | 'reject' | 'none'`. Defaults to `'accept'` — debatable from an a11y/safety standpoint.
- Supports `key` to route confirms to a specific dialog instance (multiple `<p-confirmDialog [key]="…">` listeners).
- Uses `role="alertdialog"`, sets `aria-labelledby` to the header and `aria-describedby` to the message.
- Pros: declarative element, full template projection (footer / header / icon / message templates), strongly i18n-friendly. Cons: requires app-shell wiring, double indirection (service → element).

### Angular Material — *no separate alert dialog*

- Material ships only `MatDialog`. The recommended pattern for confirmations is to author a `ConfirmDialogComponent` and call `dialog.open(ConfirmDialogComponent, { data: {...} })`.
- `MatDialogConfig` exposes `role: 'dialog' | 'alertdialog'`, but the convention is rarely set; most consumer apps end up with `role="dialog"` even for destructive confirms — a real-world a11y miss.
- No first-party "destructive variant" semantics: button styling is the consumer's job.
- Pros: one well-tested overlay path, fully typed result (`afterClosed(): Observable<R>`), no global element to wire. Cons: no opinionated confirmation API; every team rebuilds the same `{title, message, confirmLabel, cancelLabel}` interface.

### shadcn/ui — `AlertDialog` family

- Compositional primitives, no service: `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogAction`, `AlertDialogCancel`.
- Wraps Radix UI's `AlertDialog` primitive: `role="alertdialog"`, `aria-describedby` automatically wired to `AlertDialogDescription`, focus default = the **Cancel** button (Radix: `AlertDialogCancel` is the default-focused element), Escape closes through Cancel, **outside-click does NOT dismiss** (the strict difference from regular `Dialog`).
- No imperative `confirm()` — declarative only. Pros: composable, themable, every part overrideable. Cons: verbose for the canonical "delete this row" case; teams build their own `confirm()` wrapper anyway.

### Synthesis

| Aspect                       | PrimeNG       | Material      | shadcn/ui     | Decision for kouji |
|-----------------------------:|---------------|---------------|---------------|--------------------|
| Programmatic API             | yes (service) | via MatDialog | no            | **yes** (service)  |
| Declarative element form     | yes           | no            | yes           | **yes** (optional, headless) |
| Distinct `role="alertdialog"`| yes           | opt-in        | yes           | **yes** (always)   |
| Outside-click dismiss        | configurable  | configurable  | **disabled**  | **disabled** (a11y default) |
| Default focus                | accept        | first focusable | cancel      | **cancel** (safer) |
| Destructive variant in API   | no (style)    | no            | no            | **yes** (`destructive` flag) |

We take PrimeNG's service ergonomics, shadcn's a11y defaults, and add a kouji-typical headless directive form for users who want template control.

---

## 2. Decision — does it need a core directive?

**Yes, but minimally.** The primary surface is a service (`KjAlertDialogService`). The directive layer is a **thin specialisation of the existing `KjDialog` family** — it exists for two reasons:

1. **A11y semantics differ** — `role="alertdialog"` (not `dialog`), `aria-describedby` is *required* (not optional), default focus = the *cancel* action, outside-click *cannot* dismiss. These cannot be achieved by passing config to `KjDialog` without contorting its API.
2. **Programmatic-only is insufficient** — there are real cases (form-embedded confirmations, fully bespoke layouts) where a developer wants the alert-dialog *semantics* with their own template. We expose `[kjAlertDialog]` for those, and the service uses the same directives internally so there is exactly one a11y implementation.

So: **service + slim directive set, both built on top of `KjDialog`**.

| Layer                         | What it provides |
|-------------------------------|------------------|
| `KjDialog*` (existing)        | Overlay, focus trap, Escape close, backdrop, title, container.   |
| `KjAlertDialog*` (new, core)  | `role="alertdialog"` override, mandatory description wiring, action/cancel slots, default-focus to cancel, backdrop **non-dismiss** by default. |
| `KjAlertDialogService` (new)  | Imperative `confirm(...)` returning a `Promise<boolean>` (and `Observable` accessor), backed by a built-in default component that uses the directives above. |
| `@kouji-ui/components` wrapper| Styled `<kj-alert-dialog>` plus `kj-button`-driven `confirm`/`cancel` defaults, destructive variant tokens. |

---

## 3. Base features

- **Trigger modes**
  - **Programmatic:** `service.confirm(opts)` → `Promise<boolean>`. The 90 % case.
  - **Declarative directive:** `[kjAlertDialogTrigger]="tplRef"` (mirrors `[kjDialogTrigger]`) for full-template control.
- **Content slots** (declarative form): title, description (required for `aria-describedby`), confirm action, cancel action, optional icon.
- **Variants**
  - `kjVariant`: `'default' | 'destructive'` — affects the *confirm* button styling and (in the styled wrapper) the leading icon. The dialog itself is variant-neutral; the variant flows down to the action button.
  - No size variants. Alert dialogs are intentionally one size: small, centred, blocking. (If sizing is needed, the user wants `KjDialog`, not `KjAlertDialog`.)
- **Default labels** (i18n via `KJ_ALERT_DIALOG_DEFAULTS` token): `confirmLabel: 'Confirm'`, `cancelLabel: 'Cancel'`.
- **Default focus:** `'cancel'`. Override via `defaultFocus: 'confirm' | 'cancel'`.
- **Dismissal contract**
  - Escape → resolves `false` (cancel).
  - Backdrop click → **no-op by default**. Override with `dismissOnBackdrop: true` only when product copy explicitly invites it.
  - Confirm → resolves `true`.
  - Cancel → resolves `false`.
  - Programmatic `ref.close(value)` for advanced use.
- **State model:** single boolean result by default. `confirm<T>()` overload exists for tri-state ("Save" / "Don't save" / "Cancel") returning `T | undefined`, but the canonical signature is `Promise<boolean>`.

---

## 4. Accessibility (WCAG 2.1 AAA)

WAI-ARIA APG: [Alert Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/).

| Concern                  | Implementation |
|--------------------------|----------------|
| `role`                   | `alertdialog` on the panel (NOT `dialog`). Hard-coded — not overrideable; if a consumer wants `dialog` they should use `KjDialog`. |
| `aria-modal`             | `"true"`. |
| `aria-labelledby`        | Wired to the `[kjAlertDialogTitle]` element's id (reuses `KjDialog`'s id-generation pattern). |
| `aria-describedby`       | **Required.** Wired to `[kjAlertDialogDescription]`. If absent in the declarative form, emit a dev-mode warning — the alert-dialog pattern mandates a description. |
| Initial focus            | The **cancel** button (`[kjAlertDialogCancel]`). Reuses `KjFocusTrap` from `KjDialog` for trap mechanics, but overrides the trap's "first focusable" entry point with the cancel ref. Rationale: WCAG 3.3.4 *Error Prevention* — destructive confirmations should default to the safe action; a stray Enter must not destroy data. |
| Focus trap               | `KjFocusTrap` (existing primitive). Inherited from `KjDialog`. |
| Focus restoration        | On close, focus returns to the previously focused element (the trigger). Inherited from `KjDialog` mechanics. |
| Keyboard contract        | `Tab` / `Shift+Tab` cycle within trap. `Escape` resolves cancel. `Enter` activates the focused button (native). No global Enter/Space shortcuts — pressing Enter must NOT auto-confirm from anywhere else in the panel; it only fires when the action button is focused. |
| Announcement             | Open: the role itself causes assistive tech to interrupt and announce the dialog. We do *not* additionally use `KjLiveRegion` here — that would double-announce on every screen reader. |
| Touch targets            | Both action buttons inherit `KjButton`'s 44×44 minimum (WCAG 2.5.5). |
| Colour & contrast        | Destructive variant must hit 7:1 (AAA). The headless core sets no colour. The styled wrapper uses `--kj-destructive` / `--kj-destructive-foreground` tokens; theme tokens are required to satisfy AAA. |
| Outside-click dismiss    | Disabled by default — protects users from a misclick wiping data. WCAG 3.3.4 again. |
| Reduced motion           | No motion in the headless core. The styled wrapper honours `prefers-reduced-motion: reduce` for fade/scale. |
| Forced colours           | Border + outline survive Windows High Contrast (use system colours in the styled wrapper). |

**Where each piece lives:**
- Role / labelling / focus-trap wiring → core directives.
- Default-focus-to-cancel logic → `KjAlertDialog` directive (not the service — must work in declarative form too).
- Action-button visual destructive styling → styled wrapper (`@kouji-ui/components`).

---

## 5. Composition model

Five small directives + one service + one default component. All in `packages/core/src/alert-dialog/`.

```
packages/core/src/alert-dialog/
  alert-dialog.context.ts          // KJ_ALERT_DIALOG token, KjAlertDialogContext (extends KjDialogContext)
  alert-dialog.ts                  // Trigger + panel + overlay + slot directives
  alert-dialog.service.ts          // KjAlertDialogService + KjAlertDialogRef
  alert-dialog.defaults.ts         // KJ_ALERT_DIALOG_DEFAULTS injection token
  alert-dialog-default.ts          // Built-in component the service renders
  alert-dialog.spec.ts
  alert-dialog.example.ts
  index.ts
```

### Directives

| Directive                        | Selector                          | Role |
|----------------------------------|-----------------------------------|------|
| `KjAlertDialogTrigger`           | `[kjAlertDialogTrigger]`          | Like `KjDialogTrigger`. Adds `aria-haspopup="dialog"` (per APG, `dialog` is correct here even though role is `alertdialog`). |
| `KjAlertDialog`                  | `[kjAlertDialog]`                 | Panel. Sets `role="alertdialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`. Hosts focus-trap, owns default-focus = cancel. Exports as `kjAlertDialog`. |
| `KjAlertDialogOverlay`           | `[kjAlertDialogOverlay]`          | Backdrop. Default `closeOnClick = false`. |
| `KjAlertDialogTitle`             | `[kjAlertDialogTitle]`            | Sets id used by `aria-labelledby`. |
| `KjAlertDialogDescription`       | `[kjAlertDialogDescription]`      | **Required.** Sets id used by `aria-describedby`. Dev-warns if `KjAlertDialog` mounts without a description in scope. |
| `KjAlertDialogConfirm`           | `[kjAlertDialogConfirm]`          | Action button slot. `(click)` resolves `true`. Auto-applies `kjVariant="destructive"` if the panel has `[kjDestructive]`. |
| `KjAlertDialogCancel`            | `[kjAlertDialogCancel]`           | Cancel slot. `(click)` resolves `false`. **Receives initial focus.** |

### Shared-state mechanism

- New context interface `KjAlertDialogContext extends KjDialogContext` with extra `destructive: Signal<boolean>` and `descriptionId: string`.
- `KJ_ALERT_DIALOG` injection token. The trigger and panel `provide: KJ_ALERT_DIALOG, useExisting: ...` — same pattern as `KjDialog`.
- We deliberately do NOT reuse `KJ_DIALOG`. Cross-injecting between alert-dialog and dialog scopes should be a type error.

### Reuse of existing primitives

| Primitive            | Reused for |
|----------------------|------------|
| `KjFocusTrap`        | Trap inside the panel. |
| `KjFocusRing`        | Visible focus on confirm/cancel buttons (in the styled wrapper). |
| `KjVariant`          | `default` / `destructive` on confirm button. |
| `KjDisabled`         | Disable confirm while async work is in flight (e.g. `loading: signal(true)`). |
| `KjAriaDescribedby`  | Wires `aria-describedby` from `[kjAlertDialog]` to `[kjAlertDialogDescription]`. |
| `KjLiveRegion`       | **Not used.** `role="alertdialog"` is self-announcing. |
| `KjRovingTabindex`   | Not used. |
| `KjSize`             | Not used. Alert dialogs are one size by design. |

### Service

```ts
@Injectable({ providedIn: 'root' })
export class KjAlertDialogService {
  private readonly dialog = inject(KjDialogService);
  private readonly defaults = inject(KJ_ALERT_DIALOG_DEFAULTS, { optional: true });

  confirm(options: KjAlertDialogOptions): KjAlertDialogRef;
}
```

Internally `confirm()` calls `KjDialogService.open(KjAlertDialogDefault, { data: options, disableClose: true, autoFocus: '[kjAlertDialogCancel]' })` and returns a `KjAlertDialogRef` that wraps the returned `KjDialogRef<boolean>`. So we get one focus/restore implementation, one mounting code path. The default component is just a thin Angular template using the alert-dialog directives.

### Cross-component pointers

- **[Dialog](./dialog.md)** — base. `KjAlertDialog` is structurally a sibling of `KjDialog` and reuses focus-trap, restoration, mounting via `KjDialogService`.
- **[Confirm Popup](./confirm-popup.md)** — for *non-blocking, anchored, non-modal* confirmations (e.g. inline "Delete this row?" near the trigger). Distinct: alert dialog is modal, confirm popup is a popover with confirm/cancel.
- **[Toast](../feedback/toast.md)** — for fire-and-forget feedback. Never use a toast where the user must acknowledge before continuing; use alert dialog.
- **[Button](./button.md)** — `kjVariant="destructive"` on confirm action.

---

## 6. Service API & directive inputs

### 6.1 `KjAlertDialogOptions`

```ts
export interface KjAlertDialogOptions {
  /** Heading text. Wired into aria-labelledby. */
  title: string;
  /** Body text. Wired into aria-describedby. Required (a11y). */
  message: string;
  /** Confirm button label. Default: 'Confirm' (or KJ_ALERT_DIALOG_DEFAULTS.confirmLabel). */
  confirmLabel?: string;
  /** Cancel button label. Default: 'Cancel'. */
  cancelLabel?: string;
  /** When true, applies the destructive visual treatment to the confirm button. Default: false. */
  destructive?: boolean;
  /** Where to place initial focus. Default: 'cancel'. */
  defaultFocus?: 'confirm' | 'cancel';
  /**
   * When true, backdrop click dismisses (resolves false).
   * Default: false. Set true ONLY when there is no destructive consequence.
   */
  dismissOnBackdrop?: boolean;
  /** When false, Escape does not dismiss. Default: true. */
  closeOnEscape?: boolean;
  /** Optional CSS class on the panel. */
  panelClass?: string | string[];
  /** Optional icon name (resolved by the styled wrapper; ignored by core). */
  icon?: string;
}
```

### 6.2 `KjAlertDialogService.confirm`

```ts
confirm(options: KjAlertDialogOptions): KjAlertDialogRef;
```

Returns:

```ts
export class KjAlertDialogRef {
  /** Promise that resolves true (confirm) or false (cancel/escape/backdrop-when-enabled). */
  readonly result: Promise<boolean>;
  /** Same value as an Observable for RxJS-first call sites. */
  readonly result$: Observable<boolean>;
  /** Programmatic close. Rare — usually buttons drive this. */
  close(result: boolean): void;
  /** Subscribe to closure (does not double-close). */
  afterClosed(cb: (result: boolean) => void): this;
}
```

Why both promise and observable? Confirmations are inherently one-shot, which suits a Promise. But our codebase is Rx-heavy and many call sites compose this into pipelines (`switchMap(() => ref.result$)`). Exposing both costs nothing.

**Rejected alternatives:**
- `confirm(...): Promise<void>` resolving only on confirm and rejecting on cancel — looks neat, but `try/catch` is the wrong control-flow shape for "the user clicked Cancel". Cancel is not exceptional.
- `confirm(...): Observable<boolean>` only — forces a `firstValueFrom` everywhere a Promise is fine.

### 6.3 Static helper

```ts
KjAlertDialogService.confirmDestructive(options: Omit<KjAlertDialogOptions, 'destructive'>)
// Sugar for { ...options, destructive: true }. Encourages the right pattern at call sites.
```

### 6.4 Directive inputs / outputs (declarative form)

`KjAlertDialogTrigger`:

| Input                              | Type                  | Default | Notes |
|-------------------------------------|-----------------------|---------|-------|
| `kjAlertDialogTrigger`              | `TemplateRef<unknown>`| —       | Required. The overlay/panel template. |
| `kjAlertDialogCloseOnEscape`        | `boolean`             | `true`  | |
| `kjAlertDialogDismissOnBackdrop`    | `boolean`             | `false` | Distinct default from `KjDialog`. |
| `kjAlertDialogDestructive`          | `boolean`             | `false` | Flows to `KjAlertDialogContext.destructive`. |
| `kjAlertDialogDefaultFocus`         | `'confirm' \| 'cancel'`| `'cancel'` | |

| Output              | Type                | Notes |
|---------------------|---------------------|-------|
| `kjAlertDialogClosed` | `boolean`         | Emits `true` on confirm, `false` on cancel/escape. |

`KjAlertDialog`: no inputs (reads context). Exports `kjAlertDialog`.

`KjAlertDialogConfirm`, `KjAlertDialogCancel`: no inputs. Wire `(click)` to `ctx.close(true | false)`.

### 6.5 Defaults token

```ts
export interface KjAlertDialogDefaults {
  confirmLabel?: string;
  cancelLabel?: string;
  defaultFocus?: 'confirm' | 'cancel';
}
export const KJ_ALERT_DIALOG_DEFAULTS = new InjectionToken<KjAlertDialogDefaults>('KjAlertDialogDefaults');
```

For i18n / brand-wide overrides without touching every call site.

---

## 7. Examples to ship

`@doc-example` groups for the docs site:

1. **Basic** — `service.confirm({ title, message })` from a button click. Shows the canonical Promise flow.
2. **Destructive** — `confirmDestructive({ title: 'Delete account?', message: '…', confirmLabel: 'Delete' })`. Demonstrates AAA-contrast destructive button.
3. **Async confirm** — Confirm button shows loading state while a backend call resolves; uses `KjDisabled` on the dialog ref's confirm slot.
4. **Declarative** — `[kjAlertDialogTrigger]` template form, fully custom layout with explicit `[kjAlertDialogCancel]` / `[kjAlertDialogConfirm]`.
5. **Custom focus** — `defaultFocus: 'confirm'` with an inline justification ("low-stakes positive confirmation") to teach when overriding cancel-default is acceptable.
6. **Themes** — default / retro / finance variants of the destructive case (matches the existing `dialog.confirm.example.ts` style).

---

## 8. Open questions / risks

1. **Multiple stacked alert dialogs.** APG is silent on stacking. PrimeNG and Material both *allow* it; shadcn implicitly does via Radix. Risk: focus restoration order can break with two open dialogs. **Decision (provisional):** allow stacking, maintain an internal LIFO of `KjAlertDialogRef`s, and on close restore focus to whatever was active *before that specific ref opened*. Needs a spec test.
2. **`defaultFocus: 'confirm'` for non-destructive confirms?** Some product copy ("Save your changes?") feels weird with Cancel pre-focused. Counter-argument: Enter on a focused-cancel cancels (safe), Enter on a focused-confirm saves prematurely (e.g. with a typo). I'm leaving the default as `'cancel'` and pushing teams to override per-call when justified. **Validate with a11y review.**
3. **Should `dismissOnBackdrop` even be exposed?** Every "yes" makes the API less safe; every "no" forces consumers to use `KjDialog` for friendlier modals. Keeping it, default `false`, with TSDoc that explicitly discourages enabling it for destructive cases.
4. **Form submission inside an alert dialog.** Should `KjAlertDialogConfirm` integrate with reactive forms (e.g. only resolve `true` if the form is valid)? Provisional answer: out of scope — that's a regular `KjDialog`. Alert dialogs ask one yes/no question.
5. **i18n of default labels.** `KJ_ALERT_DIALOG_DEFAULTS` is the chosen mechanism, but should we instead require labels per call (no defaults) to force translation discipline? Defaults are convenient for prototypes; explicit labels are safer for production. Open for review.
6. **Animation hooks.** Headless core has none. Should we expose `[kjAlertDialogState]` (`'opening' | 'open' | 'closing'`) for consumers to drive animations? Not blocking v1; revisit when we land animations on `KjDialog`.
7. **Programmatic-only vs. directive form.** Spec said service-based. We are shipping both. If review wants service-only, the directive layer is dead code — but the service still needs *some* directives internally to render its default component, so the cost of also exporting them is near-zero. Recommend keeping both.
8. **Naming: `KjAlertDialog` vs. `KjConfirmDialog`.** Going with `AlertDialog` to match the WAI-ARIA role and the broader ecosystem (shadcn, Radix). PrimeNG calls it `ConfirmDialog`, which is fine but conflates the role with the most-common use case.
9. **Cross-ref: what does `KjConfirmPopup` provide that this doesn't?** Anchored, non-modal, no backdrop, lighter visual weight. Document the choice criteria *in both files* so consumers pick correctly.
10. **Server-side rendering.** `KjDialogTrigger` already guards with `isPlatformBrowser`. The service must do the same; `confirm()` on the server should resolve `false` immediately (or throw — TBD).
