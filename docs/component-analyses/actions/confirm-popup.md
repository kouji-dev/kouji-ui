# Confirm Popup

> **Roadmap:** Actions — *sugar / helper directive*. Anchored, **non-modal**,
> trigger-attached confirmation. The "are you sure?" bubble that appears
> right next to the delete button.
> **Builds on:** [Popover](../feedback/popover.md) (anchored positioning + outside-click + Escape contract), [Button](./button.md) (confirm/cancel actions, destructive variant).
> **Cross-refs:** [Alert Dialog](./alert-dialog.md) — the **centred, modal** sibling for high-stakes confirmations. [Tooltip](../feedback/tooltip.md) and [Dropdown Menu](./dropdown-menu.md) — share the same anchored-trigger primitives. [Toast](../feedback/toast.md) — for fire-and-forget feedback (no acknowledgement).

---

## 1. Source comparison

### PrimeNG — `p-confirmPopup` + `ConfirmationService`

- Mounted once in the app shell as `<p-confirmPopup>`. Triggered through the
  *same* `ConfirmationService.confirm(...)` API as `p-confirmDialog`, but with
  a `target` (the trigger HTMLElement) included in the call so the popup
  knows what to anchor to.
  ```ts
  this.confirmation.confirm({
    target: event.currentTarget as HTMLElement,
    message: 'Delete this row?',
    icon: 'pi pi-exclamation-triangle',
    accept: () => …,
    reject: () => …,
  });
  ```
- Anchors to the trigger (auto-flips above/below based on viewport space).
  Click-outside or Escape rejects. There is no backdrop / scrim — pages
  underneath stay interactive.
- `role` choice: PrimeNG sets `role="alertdialog"` on the popup *with*
  `aria-modal="false"`. They explicitly want assertive announcement (the
  destructive intent) but make clear the surrounding page is not blocked.
- Initial focus goes to the **accept** button by default. `defaultFocus`
  override exists.
- Pros: same service powers both popup and centred dialog — one mental
  model. Cons: routing the same `confirm()` call to two different visual
  treatments via the presence of `target` is implicit and easy to misuse.
  Calling `confirm()` from a non-event-handler call site silently degrades
  to the centred dialog behaviour if `<p-confirmPopup>` isn't mounted.

### Angular Material — *no first-class equivalent*

- Material has no anchored confirm primitive. Teams reach for one of:
  - `MatMenu` — wrong semantics (`role="menu"`, items are `menuitem`s, not
    actions/buttons in the sense of "confirm a destructive operation").
  - `MatDialog` — but that's centred + modal, the *Alert Dialog* shape.
  - A bespoke `cdkOverlay` + custom component with their own a11y wiring.
- Real-world consequence: confirmation UX in Material apps is inconsistent.
  Many "delete" flows use `confirm()` browser dialogs or a `MatSnackBar`
  with an action button (which is *fire-and-forget* and unsafe for
  destructive ops). **This is the gap kouji's confirm popup fills.**

### shadcn/ui — *no first-class equivalent*

- shadcn has `AlertDialog` (centred, modal) and `Popover` (anchored,
  presentation-only — no opinionated confirm/cancel slots). Teams compose:
  ```tsx
  <Popover>
    <PopoverTrigger asChild><Button variant="destructive">Delete</Button></PopoverTrigger>
    <PopoverContent>
      <p>Are you sure?</p>
      <Button onClick={onConfirm}>Yes, delete</Button>
      <Button variant="outline" onClick={close}>Cancel</Button>
    </PopoverContent>
  </Popover>
  ```
- Radix's underlying `Popover` primitive uses `role="dialog"` (not
  `alertdialog`) and `aria-modal="false"`. Outside-click and Escape close.
  There is no shadcn-blessed *confirm popup* recipe — every team writes
  their own. **Same gap as Material.**

### Synthesis

| Aspect                          | PrimeNG                         | Material                | shadcn                  | Decision for kouji |
|---------------------------------|---------------------------------|-------------------------|-------------------------|--------------------|
| First-class anchored confirm    | yes                             | **no**                  | **no**                  | **yes**            |
| Programmatic API                | yes (shared with confirm dialog)| —                       | —                       | **yes** (separate from `KjAlertDialogService`) |
| Declarative directive form      | no (popup is invisible chrome)  | —                       | composable popover hack | **yes** (headless directives) |
| `role`                          | `alertdialog` + `aria-modal=false` | —                    | `dialog` (`aria-modal=false`) | **`alertdialog`** + `aria-modal="false"` |
| Outside-click closes (rejects)  | yes                             | —                       | yes                     | **yes** (default; configurable) |
| Escape closes (rejects)         | yes                             | —                       | yes                     | **yes**            |
| Default focus                   | accept                          | —                       | first focusable         | **cancel** (consistency with `KjAlertDialog`; safer default) |
| Backdrop                        | none                            | —                       | none                    | **none**           |

We take PrimeNG's anchored placement and assertive role, shadcn's
composability, and pair it with kouji's defensible "default focus = cancel"
position from `KjAlertDialog`. Crucially, we keep the **service surface
separate** from `KjAlertDialogService` so that "show a popup" vs. "show a
modal" isn't an implicit behaviour determined by the presence of a
`target` field — it's an explicit choice at the call site.

---

## 2. Decision — does it need a core directive?

**Yes**, but it is intentionally thin. Confirm Popup is *almost entirely*
the composition of two existing primitives:

- `KjPopover` (the anchored, non-modal overlay primitive — separate analysis
  in [`feedback/popover.md`](../feedback/popover.md)) provides anchor /
  flip / shift positioning, outside-click dismissal, Escape close, focus
  return, and the trigger contract shared with `KjTooltip` and
  `KjDropdownMenu`.
- `KjButton` provides the action buttons + destructive styling.

What `KjConfirmPopup` *adds* that those two cannot supply on their own:

1. **`role="alertdialog"` (not `dialog`)** with `aria-modal="false"` and
   *required* `aria-describedby`. This is the WAI-ARIA semantic that turns
   a generic anchored panel into a confirmation surface. `KjPopover` itself
   uses `role="dialog"` (or no role, in tooltip mode) — promoting it to
   `alertdialog` is the whole point of this directive.
2. **Confirm / Cancel slot directives** with the resolution contract
   (`true` / `false`) and the default-focus-to-cancel behaviour, mirroring
   `KjAlertDialog`. Keeps "destructive default" semantics consistent
   whether the surface is modal or anchored.
3. **`destructive` flag** that flows to the confirm `KjButton`'s
   `kjVariant`, so a one-line API change picks the right colour token /
   focus ring.
4. **A service surface (`KjConfirmPopupService`)** for the canonical case:
   "open a confirmation anchored to the element the user just clicked, then
   give me back a `Promise<boolean>`."

So: **slim directive set + service**, both built on `KjPopover` (which is
itself a sibling of `KjTooltip` / `KjDropdownMenu`'s anchored-panel core).

| Layer                          | What it provides |
|--------------------------------|------------------|
| `KjPopover*` (existing/sibling)| Anchor, flip/shift, outside-click, Escape, focus-return, portal mount. |
| `KjConfirmPopup*` (new, core)  | `role="alertdialog"` + `aria-modal="false"`, mandatory description wiring, confirm/cancel slots with `Promise<boolean>` resolution, default-focus = cancel, destructive flag. |
| `KjConfirmPopupService` (new)  | Imperative `confirm(target, options)` returning `KjConfirmPopupRef` with `result: Promise<boolean>` + `result$: Observable<boolean>`. |
| `@kouji-ui/components` wrapper | Styled `<kj-confirm-popup>` + default `kj-button` action chrome, destructive tokens, arrow / pointer affordance. |

We deliberately **do not** reuse `KJ_DIALOG` or `KJ_ALERT_DIALOG` context.
A confirm popup is not a dialog mounted in `body` with a focus trap — it
is a non-modal anchored panel. Cross-injecting between confirm-popup and
alert-dialog scopes should be a type error.

---

## 3. Base features

- **Trigger modes**
  - **Programmatic:** `service.confirm(target, options)` →
    `KjConfirmPopupRef`. The 90 % case — wire it directly to a
    `(click)="onDeleteClick($event)"` handler that calls
    `service.confirm($event.currentTarget, …)`.
  - **Declarative directive:** `[kjConfirmPopupTrigger]="tplRef"` on the
    trigger element (anchor is the host). Mirrors the `KjPopover` trigger
    pattern. Used when the consumer wants full template control over the
    panel.
- **Anchoring** — handled entirely by the underlying `KjPopover`
  positioning primitive: placement (`'top' | 'bottom' | 'left' | 'right'`
  with start/end variants), `offset`, automatic flip on viewport
  collision, shift to keep within boundary. **Default placement: `'top'`**
  (cancellation muscle-memory: the popup appears above the trigger so the
  finger / cursor doesn't accidentally land on the confirm button while
  moving down).
- **Content slots** (declarative form): message (required for
  `aria-describedby`), confirm action, cancel action, optional icon,
  optional title (rare — most confirm popups are one-line).
- **Variants**
  - `kjVariant`: `'default' | 'destructive'` — flows to the confirm
    button. The popup itself is variant-neutral. (Same shape as
    `KjAlertDialog`.)
  - No size variants. Confirm popups are intentionally one size: small,
    inline, anchored. If a consumer needs sizing they want `KjPopover`
    with their own buttons.
- **Default labels** (i18n via `KJ_CONFIRM_POPUP_DEFAULTS` token):
  `confirmLabel: 'Confirm'`, `cancelLabel: 'Cancel'`.
- **Default focus:** `'cancel'`. Override via
  `kjConfirmPopupDefaultFocus: 'confirm' | 'cancel'`. Rationale identical
  to `KjAlertDialog`: WCAG 3.3.4 *Error Prevention* — destructive
  confirmations should default to the safe action.
- **Dismissal contract**
  - Escape → resolves `false` (cancel).
  - Outside click (anywhere outside the popup) → resolves `false` by
    default. Override with `kjConfirmPopupDismissOnClickOutside: false`
    only if the consumer wants forced explicit interaction (rare — almost
    always the right behaviour for an anchored confirm).
  - Confirm button → resolves `true`.
  - Cancel button → resolves `false`.
  - Programmatic `ref.close(value)` for advanced use.
  - Trigger element click while open → toggle close (resolves `false`).
- **State model:** single boolean result. Same `Promise<boolean>` +
  `Observable<boolean>` dual surface as `KjAlertDialogRef`.

---

## 4. Accessibility (WCAG 2.1 AAA)

WAI-ARIA APG references:
- [Alert Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/) — for the role and labelling expectations.
- [Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) — for what we deliberately *don't* do (focus trap, modality).

### Role choice — why `alertdialog` with `aria-modal="false"`

This is the load-bearing accessibility decision in this file. Three
candidates were considered:

1. **`role="dialog"` + `aria-modal="false"`** — the shadcn / Radix popover
   default. *Rejected.* A generic dialog role tells assistive tech "here's
   a dialog" but doesn't communicate the "important alert needing a
   response" semantic. Screen readers don't interrupt the user's current
   reading position; the popup may go unnoticed if the user is mid-line.
2. **`role="alertdialog"` + `aria-modal="false"`** — PrimeNG's choice.
   *Selected.* The `alertdialog` role causes assistive tech to announce
   the panel assertively (interrupts the screen reader's current output),
   which is exactly the right semantic for a confirmation prompt that the
   user must answer before their last action takes effect. The
   `aria-modal="false"` correctly tells AT that the rest of the page is
   *not* blocked — Tab still moves out of the popup, and surrounding
   content remains focusable / interactive. The WAI-ARIA `alertdialog`
   pattern does not require modality; it requires (a) a description and
   (b) at least one focusable element. Both satisfied here.
3. **No role; rely on focus + visual** — *rejected.* Fails 4.1.2 *Name,
   Role, Value*.

We hard-code `role="alertdialog"` and `aria-modal="false"` on the panel.
Not overrideable. Consumers who want a non-assertive anchored panel
should use `KjPopover` directly.

### Full a11y matrix

| Concern                  | Implementation |
|--------------------------|----------------|
| `role`                   | `alertdialog` on the panel (hard-coded). |
| `aria-modal`             | `"false"`. The page is not blocked; Tab moves out. |
| `aria-labelledby`        | Optional — wired to `[kjConfirmPopupTitle]` if present. Most confirm popups omit a title and rely on the description alone, which is allowed for `alertdialog` per APG. |
| `aria-describedby`       | **Required.** Wired to `[kjConfirmPopupMessage]`. Dev-mode warning if the panel mounts without a message in scope. |
| Trigger: `aria-haspopup` | `"dialog"` (per APG, this is the correct value for `alertdialog` triggers — there is no `"alertdialog"` value for `aria-haspopup`). |
| Trigger: `aria-expanded` | `"true"` while popup open, `"false"` otherwise. |
| Trigger: `aria-controls` | The popup panel id. |
| Initial focus            | The **cancel** button (`[kjConfirmPopupCancel]`). Reuses the popover's focus-on-open mechanism but overrides the entry point. WCAG 3.3.4 *Error Prevention*. |
| Focus trap               | **None.** Non-modal — Tab from the last focusable in the popup moves to the next focusable in the page. Tab from outside the popup moves into it in normal DOM order. (This is the key behavioural difference from `KjAlertDialog`.) |
| Focus restoration        | On close, focus returns to the trigger element. Inherited from `KjPopover`. |
| Keyboard contract        | `Escape` resolves cancel (resolves even when focus is outside the popup, as long as the popup is open — same as `KjPopover`). `Enter` activates the focused button (native). `Tab` / `Shift+Tab` moves focus naturally — out of the popup if at the boundary. |
| Announcement             | Open: `role="alertdialog"` causes assistive tech to interrupt and announce. We do **not** also use `KjLiveRegion` — that would double-announce. |
| Touch targets            | Action buttons inherit `KjButton`'s 44×44 minimum (WCAG 2.5.5). |
| Colour & contrast        | Destructive variant must hit 7:1 (AAA). Headless core sets no colour. Styled wrapper uses `--kj-destructive` / `--kj-destructive-foreground` tokens. |
| Outside-click dismiss    | Enabled by default — anchored confirms are typically discoverable inline; clicking elsewhere is a clear "I changed my mind" signal. Treated as cancel. |
| Reduced motion           | No motion in the headless core. Styled wrapper honours `prefers-reduced-motion: reduce` for the open/close transition. |
| Forced colours           | Border + outline survive Windows High Contrast; styled wrapper uses system colours. |
| Position / occlusion     | The underlying `KjPopover` flips and shifts to keep the panel within the viewport. WCAG 1.4.10 *Reflow* — popup width caps at the viewport width minus padding. |
| Pointer scope            | The popup must not capture pointer events outside its bounds (no invisible overlay). Ensures users can still interact with the page; only outside-click *dismissal* is wired. |

**Where each piece lives:**
- Role / labelling / required-description / default-focus → **core directives**.
- Anchor / flip / outside-click / Escape / focus restoration → **`KjPopover`** (reused, not reimplemented).
- Destructive button styling → **styled wrapper** (`@kouji-ui/components`).

### Accessibility Review (against rules/accessibility.md)

- ✓ 4.1.2 *Name, Role, Value* — `alertdialog` role, `aria-describedby`
  required, `aria-labelledby` optional.
- ✓ 2.1.1 *Keyboard* — Escape closes, Tab navigates naturally, Enter
  activates focused button. No keyboard trap (intentional — non-modal).
- ✓ 2.4.3 *Focus Order* — opening moves focus to cancel; closing returns
  focus to trigger.
- ✓ 2.5.5 *Target Size* — action buttons inherit `KjButton`'s 44×44.
- ✓ 1.4.6 *Contrast (Enhanced)* — destructive tokens documented at 7:1.
- ✓ 3.3.4 *Error Prevention* — default focus = cancel; explicit confirm
  required.
- ✓ 1.3.1 *Info and Relationships* — `aria-describedby` wires the message
  to the panel programmatically.

---

## 5. Composition model

Six small directives + one service + one default component. All in
`packages/core/src/confirm-popup/`.

```
packages/core/src/confirm-popup/
  confirm-popup.context.ts          // KJ_CONFIRM_POPUP token, KjConfirmPopupContext
  confirm-popup.ts                  // Trigger + panel + slot directives
  confirm-popup.service.ts          // KjConfirmPopupService + KjConfirmPopupRef
  confirm-popup.defaults.ts         // KJ_CONFIRM_POPUP_DEFAULTS injection token
  confirm-popup-default.ts          // Built-in component the service renders
  confirm-popup.spec.ts
  confirm-popup.example.ts
  index.ts
```

### Directives

| Directive                        | Selector                          | Role |
|----------------------------------|-----------------------------------|------|
| `KjConfirmPopupTrigger`          | `[kjConfirmPopupTrigger]`         | Reuses `KjPopover`'s trigger via `hostDirectives`, overrides `aria-haspopup="dialog"`. Hosts `aria-controls` / `aria-expanded`. Toggles on click. |
| `KjConfirmPopup`                 | `[kjConfirmPopup]`                | Panel. Sets `role="alertdialog"`, `aria-modal="false"`, `aria-labelledby` (optional), `aria-describedby` (required). Reads context, owns default-focus = cancel logic. Exports as `kjConfirmPopup`. |
| `KjConfirmPopupTitle`            | `[kjConfirmPopupTitle]`           | Optional. Sets id used by `aria-labelledby`. |
| `KjConfirmPopupMessage`          | `[kjConfirmPopupMessage]`         | **Required.** Sets id used by `aria-describedby`. Dev-warns if `KjConfirmPopup` mounts without a message in scope. |
| `KjConfirmPopupConfirm`          | `[kjConfirmPopupConfirm]`         | Confirm button slot. `(click)` resolves `true`. Auto-applies `kjVariant="destructive"` when the panel has `[kjConfirmPopupDestructive]`. |
| `KjConfirmPopupCancel`           | `[kjConfirmPopupCancel]`          | Cancel button slot. `(click)` resolves `false`. **Receives initial focus** by default. |

### Shared-state mechanism

- New context interface `KjConfirmPopupContext` (does **not** extend
  `KjDialogContext` — confirm popup is not a dialog).
  ```ts
  export interface KjConfirmPopupContext {
    readonly open: Signal<boolean>;
    readonly destructive: Signal<boolean>;
    readonly defaultFocus: Signal<'confirm' | 'cancel'>;
    readonly titleId: string | null;        // null when no title
    readonly messageId: string;             // always present (required)
    readonly close: (result: boolean) => void;
  }
  ```
- `KJ_CONFIRM_POPUP` injection token. Trigger and panel share the context
  via `provide: KJ_CONFIRM_POPUP, useExisting: …` — same pattern as
  `KjDialog` / `KjAlertDialog`.
- The popover layer (`KjPopover`) provides its own `KJ_POPOVER` context;
  `KjConfirmPopup` reads from it for open/close mechanics but does not
  re-export it. Consumers see only `KJ_CONFIRM_POPUP`.

### Reuse of existing primitives

| Primitive            | Reused for |
|----------------------|------------|
| `KjPopover` family   | Anchor positioning, flip/shift, outside-click, Escape, focus restoration, portal mount. **The whole transport layer.** |
| `KjFocusRing`        | Visible focus on confirm/cancel buttons (in the styled wrapper). |
| `KjVariant`          | `default` / `destructive` on confirm button. |
| `KjDisabled`         | Disable confirm while async work is in flight (e.g. `loading` signal). |
| `KjAriaDescribedby`  | Wires `aria-describedby` from `[kjConfirmPopup]` to `[kjConfirmPopupMessage]`. |
| `KjFocusTrap`        | **Not used.** Non-modal — Tab moves out by design. |
| `KjLiveRegion`       | **Not used.** `role="alertdialog"` is self-announcing. |
| `KjRovingTabindex`   | Not used. Two action buttons in normal tab order is correct. |
| `KjSize`             | Not used. One size by design. |

### Service

```ts
@Injectable({ providedIn: 'root' })
export class KjConfirmPopupService {
  private readonly popover = inject(KjPopoverService);
  private readonly defaults = inject(KJ_CONFIRM_POPUP_DEFAULTS, { optional: true });

  /**
   * Open an anchored confirmation popup attached to `target`.
   * @param target - The HTMLElement the popup anchors to (typically the trigger).
   * @param options - Message, labels, destructive flag, placement, etc.
   * @returns A ref whose `result` resolves true/false.
   */
  confirm(target: HTMLElement, options: KjConfirmPopupOptions): KjConfirmPopupRef;

  /** Sugar for `{ ...options, destructive: true }`. */
  confirmDestructive(target: HTMLElement, options: Omit<KjConfirmPopupOptions, 'destructive'>): KjConfirmPopupRef;
}
```

Internally `confirm()` calls
`KjPopoverService.open(KjConfirmPopupDefault, { anchor: target, data: options, role: 'alertdialog' })`
and wraps the returned `KjPopoverRef<boolean>` in a `KjConfirmPopupRef`.
Single mount path, single focus/restore implementation.

### Cross-component pointers

- **[Popover](../feedback/popover.md)** — base. `KjConfirmPopup` is
  structurally a thin specialisation of `KjPopover`, the way
  `KjAlertDialog` is to `KjDialog`. Do **not** duplicate anchor logic
  here.
- **[Alert Dialog](./alert-dialog.md)** — the modal sibling. **Choice
  criteria:**
  - Use **Confirm Popup** when: the action is reversible-ish or low-stakes,
    the user is mid-flow on a list/grid (anchoring keeps context), the
    confirmation is one-line, and blocking the page would be heavy-handed.
  - Use **Alert Dialog** when: the action is irreversible (delete account,
    discard unsaved changes), the consequence touches data outside the
    immediate context, or the confirmation needs explanation longer than a
    single sentence.
  - Document this matrix in *both* files (already noted as an open question
    in `alert-dialog.md` §8.9 — this file resolves it).
- **[Tooltip](../feedback/tooltip.md)** and **[Dropdown Menu](./dropdown-menu.md)** —
  share the same anchored-trigger primitives provided by `KjPopover`. The
  trigger contract (click vs. hover, escape-to-close, click-outside-to-close)
  must be consistent across these three.
- **[Button](./button.md)** — `kjVariant="destructive"` on the confirm
  action. Reused for cancel as the default variant.
- **[Toast](../feedback/toast.md)** — for non-blocking *fire-and-forget*
  feedback. Never use a toast where the user must explicitly acknowledge
  before the destructive action takes effect.

---

## 6. Service API & directive inputs

### 6.1 `KjConfirmPopupOptions`

```ts
export interface KjConfirmPopupOptions {
  /** Body text. Wired into aria-describedby. Required (a11y). */
  message: string;
  /** Optional heading. Wired into aria-labelledby when present. */
  title?: string;
  /** Confirm button label. Default: 'Confirm' (or KJ_CONFIRM_POPUP_DEFAULTS.confirmLabel). */
  confirmLabel?: string;
  /** Cancel button label. Default: 'Cancel'. */
  cancelLabel?: string;
  /** Apply destructive visual treatment to the confirm button. Default: false. */
  destructive?: boolean;
  /** Where to place initial focus. Default: 'cancel'. */
  defaultFocus?: 'confirm' | 'cancel';
  /** Anchor placement. Default: 'top'. Underlying KjPopover handles flip/shift. */
  placement?: 'top' | 'bottom' | 'left' | 'right'
            | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'
            | 'left-start' | 'left-end' | 'right-start' | 'right-end';
  /** Pixel offset between trigger and popup. Default: 8. */
  offset?: number;
  /** When false, outside-click does not dismiss. Default: true. */
  dismissOnClickOutside?: boolean;
  /** When false, Escape does not dismiss. Default: true. */
  closeOnEscape?: boolean;
  /** Optional CSS class on the panel. */
  panelClass?: string | string[];
  /** Optional icon name (resolved by the styled wrapper; ignored by core). */
  icon?: string;
}
```

### 6.2 `KjConfirmPopupService.confirm`

```ts
confirm(target: HTMLElement, options: KjConfirmPopupOptions): KjConfirmPopupRef;
```

Returns:

```ts
export class KjConfirmPopupRef {
  /** Promise that resolves true (confirm) or false (cancel/escape/outside-click). */
  readonly result: Promise<boolean>;
  /** Same value as an Observable for RxJS-first call sites. */
  readonly result$: Observable<boolean>;
  /** Programmatic close. Rare — usually buttons drive this. */
  close(result: boolean): void;
  /** Subscribe to closure (does not double-close). */
  afterClosed(cb: (result: boolean) => void): this;
}
```

Symmetry with `KjAlertDialogRef` is intentional — call sites should be
able to swap `KjAlertDialogService.confirm(...)` for
`KjConfirmPopupService.confirm($event.currentTarget, ...)` with no other
code changes.

**Why a separate service from `KjAlertDialogService`?** Three reasons:

1. **Explicit shape choice at the call site.** PrimeNG's
   `ConfirmationService.confirm({ target, ... })` overloads anchored vs.
   centred behaviour by the *presence* of `target`. That's implicit and
   error-prone — forget the target and you silently get a centred dialog.
   We make the choice explicit: `confirmService` is centred, `popupService`
   is anchored, both return the same shape of ref.
2. **Different defaults.** `confirm` defaults to no-dismiss-on-backdrop;
   confirm popup defaults to dismiss-on-outside-click. Merging the APIs
   means picking one default and confusing half the users.
3. **Tree-shaking.** Apps that only use one shape don't pay for the other.

### 6.3 Directive inputs / outputs (declarative form)

`KjConfirmPopupTrigger`:

| Input                                      | Type                                   | Default     | Notes |
|--------------------------------------------|----------------------------------------|-------------|-------|
| `kjConfirmPopupTrigger`                    | `TemplateRef<unknown>`                 | —           | Required. The popup template. |
| `kjConfirmPopupPlacement`                  | `KjPopoverPlacement`                   | `'top'`     | Forwarded to `KjPopover`. |
| `kjConfirmPopupOffset`                     | `number`                               | `8`         | |
| `kjConfirmPopupDestructive`                | `boolean`                              | `false`     | Flows to `KjConfirmPopupContext.destructive`. |
| `kjConfirmPopupDefaultFocus`               | `'confirm' \| 'cancel'`                | `'cancel'`  | |
| `kjConfirmPopupDismissOnClickOutside`      | `boolean`                              | `true`      | |
| `kjConfirmPopupCloseOnEscape`              | `boolean`                              | `true`      | |

| Output                  | Type        | Notes |
|-------------------------|-------------|-------|
| `kjConfirmPopupOpened`  | `void`      | Emits when the popup has finished opening. |
| `kjConfirmPopupClosed`  | `boolean`   | Emits `true` on confirm, `false` on cancel/escape/outside-click. |

`KjConfirmPopup`: no inputs (reads context). Exports `kjConfirmPopup`.

`KjConfirmPopupConfirm`, `KjConfirmPopupCancel`: no inputs. `(click)`
calls `ctx.close(true | false)`.

`KjConfirmPopupTitle`, `KjConfirmPopupMessage`: no inputs (auto-id'd).

### 6.4 Defaults token

```ts
export interface KjConfirmPopupDefaults {
  confirmLabel?: string;
  cancelLabel?: string;
  defaultFocus?: 'confirm' | 'cancel';
  placement?: KjPopoverPlacement;
  offset?: number;
}
export const KJ_CONFIRM_POPUP_DEFAULTS = new InjectionToken<KjConfirmPopupDefaults>('KjConfirmPopupDefaults');
```

For i18n / brand-wide overrides without touching every call site. Mirrors
`KJ_ALERT_DIALOG_DEFAULTS`.

---

## 7. Examples to ship

`@doc-example` groups for the docs site:

1. **Basic** — `service.confirm($event.currentTarget, { message })` from a
   button click. Canonical Promise flow with a `<button>` trigger.
2. **Destructive** — `confirmDestructive(target, { message: 'Delete this row?', confirmLabel: 'Delete' })`
   inline in a row's "delete" button. Demonstrates AAA-contrast destructive
   button + anchoring above the trigger.
3. **Async confirm** — Confirm button shows loading state while a backend
   call resolves; uses `KjDisabled` to keep the button focusable but
   inert. Cancel becomes disabled during the in-flight period (or stays
   live to allow abort — open question §8.4).
4. **Declarative** — `[kjConfirmPopupTrigger]` template form, fully custom
   layout with explicit `[kjConfirmPopupCancel]` / `[kjConfirmPopupConfirm]`.
5. **Placement override** — explicit `placement: 'right-start'` for a row
   inside a long table where above/below would be obscured.
6. **Choice matrix demo** — same delete action implemented twice on the
   same page: as `KjConfirmPopup` (light-weight, anchored) and as
   `KjAlertDialog` (centred, modal). Side-by-side comparison page that
   teaches consumers when to pick which.
7. **Themes** — default / retro / finance variants of the destructive
   case (matches the existing `dialog.confirm.example.ts` style).

---

## 8. Open questions / risks

1. **Trigger element lifetime.** The service takes an `HTMLElement` as
   anchor. If the trigger is destroyed before the popup closes (e.g. row
   removed by a sibling action mid-confirmation), the anchor disappears
   and the popup floats. **Decision (provisional):** subscribe to the
   anchor's `connectedCallback` via a `MutationObserver` on the parent;
   if the anchor leaves the DOM, auto-resolve `false` and close. Verify
   no race with the confirm-click resolution.
2. **Multiple stacked confirm popups.** Realistic? Not really — a confirm
   popup represents an open question and clicking elsewhere dismisses it
   (resolving false), so opening a second one would close the first.
   **Decision:** treat as not-supported. If a second `service.confirm(...)`
   is invoked while one is open, auto-resolve the first as `false` and
   open the new one. Document this; add a spec test.
3. **Default focus on `'confirm'` for non-destructive popups?** Same
   debate as `KjAlertDialog` §8.2. For confirm popups specifically, the
   anchored placement *and* the smaller surface area make accidental
   activation slightly more plausible (the user's pointer is already near
   the buttons). Holding the line at `defaultFocus: 'cancel'`. Push teams
   to override per-call when justified.
4. **Cancel button during async confirm.** If `confirm` triggers a
   long-running operation, should the cancel button remain live (allowing
   abort) or go disabled? Implementation choice in the styled wrapper —
   the headless directive doesn't enforce either way. Leaning toward
   *keep cancel live and emit an explicit `cancel` signal* so consumers
   can wire abort logic. Open for review.
5. **Outside-click dismiss as cancel — is that always safe?** A misclick
   on the page silently dismisses. Counter: the popup is *next to* the
   trigger, the user just clicked it deliberately, and "click elsewhere"
   is a near-universal "I changed my mind" gesture. Consistent with
   PrimeNG, Radix Popover, and shadcn's `Popover`. Keeping default `true`,
   with `dismissOnClickOutside: false` available for the rare exceptions.
6. **What if the message text is too long?** Anchored panels have less
   real estate than centred dialogs. **Heuristic in the docs:** if your
   message is more than two lines on mobile, you want `KjAlertDialog`,
   not `KjConfirmPopup`. Don't enforce a character limit in code — that
   leaks into i18n problems.
7. **Server-side rendering.** `KjPopover` already guards with
   `isPlatformBrowser`. The service must do the same; `confirm()` on the
   server should resolve `false` immediately. Consistent with
   `KjAlertDialogService` open question §8.10.
8. **Naming: `KjConfirmPopup` vs. `KjConfirmPopover` vs. `KjInlineConfirm`.**
   Going with `ConfirmPopup` to match PrimeNG's `p-confirmPopup` and
   match the roadmap's labelled intent. `Popover` is the primitive name
   in our system; reserving it for the generic positioning surface keeps
   the naming hierarchy clear (`KjPopover` is the transport,
   `KjConfirmPopup` is the opinionated specialisation).
9. **`KjPopover` doesn't exist yet.** This analysis depends on the
   popover primitive landing first. Sequencing: implement `KjPopover` →
   confirm `KjTooltip` and `KjDropdownMenu` work on top of it →
   *then* land `KjConfirmPopup`. If `KjPopover` design changes
   (specifically the `KJ_POPOVER` context shape or the
   `KjPopoverService.open` signature), this file must be updated.
10. **i18n of default labels.** `KJ_CONFIRM_POPUP_DEFAULTS` is the chosen
    mechanism, mirroring `KJ_ALERT_DIALOG_DEFAULTS`. Same open question
    re: explicit-labels-everywhere for translation discipline. Resolve
    this consistently across both surfaces in one go.
11. **Animation hooks.** Headless core has none. The styled wrapper
    should animate the open/close (scale + fade from the anchor edge) but
    must honour `prefers-reduced-motion`. Not blocking v1; revisit when
    `KjPopover` gets animation hooks.
12. **`role="alertdialog"` on a non-modal panel — is screen-reader
    behaviour consistent across NVDA / JAWS / VoiceOver?** PrimeNG ships
    this, so there is real-world data, but worth verifying in our own
    a11y test suite. Add to spec coverage: "popup opens, NVDA announces
    description assertively, focus is on cancel, Escape returns focus to
    trigger, virtual cursor is *not* trapped inside the popup."
