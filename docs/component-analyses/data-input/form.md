# Form

Reference architecture for the kouji-ui Form — a thin coordination layer over
Angular's Reactive / Template-driven Forms that owns `<form>` element semantics:
`(ngSubmit)` interception, native-submission prevention, focus-on-first-error,
scroll-into-view, async-submission state, and an optional accessible error
summary. **Not a validation pattern** — Angular Forms (`Validators`,
`AbstractControl`, `FormGroup`) is the validation pattern, and this directive
defers to it entirely.

**Already shipped — but under a different shape.** The file
`packages/core/src/form/form.ts` currently exports
`KjFormField` / `KjFormLabel` / `KjFormError` — the per-field label-and-error
*wrapper*, not a `<form>`-level coordinator. The selector `[kjFormField]` is
attribute-based and lives on a `<div>` around each control. No directive
attaches to `<form>` today. The proposal in this document is a new
`KjForm` directive selected by `form[kjForm]` that lives alongside the
existing field directives and reuses none of their code (different
responsibility, different selector target, different consumers).

The naming collision is a real risk and is addressed below in **Naming &
file layout**: the existing `form.ts` should be renamed to `form-field.ts`
(folder stays as `form/` because the public-API surface here is the
form-handling family — field, label, error, *and* the new `<form>` directive),
the directives stay where they are, and the new directive ships as `form.ts`
inside the same folder. `KjForm` is the canonical short name for the
`<form>` directive; `KjFormField` keeps its current name.

## Source comparison

- **PrimeNG** — [primeng.org/forms](https://primeng.org/forms). PrimeNG ships
  no dedicated `<form>` directive. Its docs page on "Forms" is an integration
  guide for Reactive Forms and Template-Driven Forms across PrimeNG inputs.
  Each PrimeNG input is independently `ControlValueAccessor`-compatible; the
  form *element* is unowned. PrimeNG also ships an opinionated React-only
  `<Form>` component in PrimeReact, but the Angular flavor stops at "use
  Angular's `FormGroup`". Submit handling, focus-on-error, and scroll
  behaviour are entirely the consumer's job.
- **Angular Material** —
  [material.angular.dev/components/form-field](https://material.angular.dev/components/form-field).
  No "Form" component. Material owns the **field** wrapper
  (`<mat-form-field>`) — labels, hints, error messages, prefix/suffix slots —
  and lets Angular's stock `<form>` element + `[formGroup]` do everything
  else. Submit is just `(ngSubmit)`. Material does not focus the first invalid
  control on submit, does not scroll into view, and does not announce error
  count. There is also `MatFormFieldErrorStateMatcher`, which gates when
  `errorState` becomes true; that's where the touched-vs-submitted gating
  lives at the field level — not at the form level.
- **shadcn/ui** —
  [ui.shadcn.com/docs/components/form](https://ui.shadcn.com/docs/components/form).
  React-only and built directly on `react-hook-form` + `zod`. Their `<Form>`
  is a thin context provider over react-hook-form's `FormProvider`; it
  exposes `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`,
  `<FormDescription>`, `<FormMessage>` which together are roughly equivalent
  to kouji's `KjFormField` family. Submission, focus-on-error, and scroll
  are handled by `react-hook-form`'s `handleSubmit` plus its
  `setFocus`/`shouldFocusError` config. There is no separate "scroll into
  view" — react-hook-form's `setFocus` does both via the browser's
  `focus({ preventScroll: false })` default. For Angular this maps cleanly to
  Reactive Forms + a small directive that intercepts submit and walks the
  form's `controls` map looking for the first invalid one.
- **react-hook-form** (the actual reference, since shadcn defers to it) —
  `useForm({ shouldFocusError: true })` walks the form's registered refs in
  registration order on submit and calls `.focus()` on the first one whose
  validation failed. It does not scroll separately; the browser's
  `focus()` default scrolls the focused element into view (this is what we
  inherit on Angular too). The kouji equivalent has to walk
  `FormGroup.controls` plus a registered map of control IDs back to host
  elements, because Angular's `AbstractControl` does not own a DOM reference.

**Pattern picked up.** kouji takes the react-hook-form / shadcn shape — a
thin directive on `<form>` that intercepts `(ngSubmit)`, asks Angular's
`FormGroupDirective` (or `NgForm`) for the control tree, finds the first
invalid leaf control, and focuses it (with optional scroll). The
directive is a **coordinator**, not a state holder; the Angular Forms model
(`FormGroup` / `NgForm`) remains the source of truth. We add what
react-hook-form gets for free: a control-id → element registry, populated
from the existing `KjFormControl` primitive that every kouji input already
composes, so the focus-on-error step doesn't need a DOM crawl with
`querySelector`.

## Decision: needs a core directive?

**Yes.** Five contracts that don't belong at the field level and don't belong
in user-land:

1. **Submit interception.** `(ngSubmit)` on the form fires only when validity
   passes Angular's own gate by default — actually that's a misconception:
   `(ngSubmit)` fires regardless of validity, the consumer is supposed to
   check `form.invalid` themselves. Half of the bugs in production Angular
   forms are "I forgot to check `form.invalid` before posting". `KjForm`
   makes that check for you and exposes a clean `(kjSubmit)` output that
   only fires when valid (and a separate `(kjInvalidSubmit)` that fires when
   the user *tried* to submit an invalid form).
2. **Focus-on-first-error.** When the user submits an invalid form, the
   first invalid control receives focus. This requires (a) a registry of
   control name → host element, (b) deterministic order, (c) tolerance for
   nested `FormGroup` / `FormArray`. None of this is per-input behaviour —
   it's a tree walk.
3. **Scroll-into-view.** The focused control is scrolled into view with
   `block: 'center'` (better than `nearest` for forms — users want context
   above and below the field). Configurable via `kjScrollBehavior`.
4. **Async submission state.** While a submit handler is in flight,
   `aria-busy="true"` on the `<form>`, `data-submitting=""` for theme styling,
   and an exposed `submitting` signal that the wrapper can use to disable
   inputs and the submit button. Inputs are disabled via the existing
   `KjFormControl`.disabled signal — `KjForm` does not poke individual
   inputs, it pushes a `submitting` flag through the `KJ_FORM` context that
   each `KjFormControl` reads.
5. **Re-validate on submit.** Forms touched only via JS bindings (e.g. a
   prefilled `<kj-input [value]="…">` that the user never blurred) start
   life as `untouched` and Angular won't show errors. On submit, `KjForm`
   marks every nested control as `markAllAsTouched()` so each field's
   touched-gated `aria-invalid` and visible error message kicks in
   simultaneously.

Items 1–5 are cross-cutting form-element behaviour. None of it is theme
work, none of it is per-input behaviour, all of it is missing today, all of
it is what users hand-roll incorrectly. A single attribute directive on the
`<form>` element is exactly the right abstraction.

The optional **error summary** ("3 errors in this form: Email is required,
Password too short, Accept terms required") is also coordinated here — it
needs the full validity tree to count errors, the field labels to render
each line, and the focus-on-first-error logic to make summary entries
clickable. See **Error summary** below.

## Naming & file layout

The existing file `packages/core/src/form/form.ts` exports `KjFormField`,
`KjFormLabel`, `KjFormError`. Those directives wrap a single field and have
no relationship to the new `<form>`-level directive. The cleanest split:

```
packages/core/src/form/
  form.ts                   ← NEW: KjForm directive on <form>
  form.context.ts           ← NEW: KJ_FORM context + interface
  form.spec.ts              ← NEW
  form-field.ts             ← RENAMED from form.ts: KjFormField, KjFormLabel, KjFormError
  form-field.context.ts     ← RENAMED from form.context.ts: KJ_FORM_FIELD context
  form-field.spec.ts        ← RENAMED from form.spec.ts
  index.ts                  ← updated to re-export both
```

The existing `KJ_FORM_FIELD` token name stays. The file name moves so the
new `form.ts` can hold the new `KjForm` (the `<form>`-level directive). This
matches the rule in `rules/code_style.md` §"Class Names": when a collision
would exist, the **less primary** thing keeps a longer name. `KjForm` (on
the `<form>` element itself) is the more primary symbol, so it owns
`form.ts`; `KjFormField` keeps its full name and moves to `form-field.ts`.

This is a one-time rename inside `@kouji-ui/core`; consumers who import
`KjFormField` from the package barrel (`@kouji-ui/core`) see no breakage
because `index.ts` keeps re-exporting all four directives.

## Base features

- **Selector.** `form[kjForm]` — restricted to `<form>` elements only.
  Prevents accidentally attaching to a `<div>` (which would silently miss
  the native submit pipeline). Standalone, attribute selector with an
  element guard, same shape as `button[kjButton]` would be (kouji currently
  uses `[kjButton]` everywhere, but `<form>` is special: this directive's
  whole job is owning native `<form>` semantics).
- **Submit handling.** `(submit)` on the host is intercepted in capture
  phase, `event.preventDefault()` is called unconditionally (Angular forms
  *always* want client-side submission), and the directive then dispatches
  to `(kjSubmit)` (valid) or `(kjInvalidSubmit)` (invalid).
- **Async submit support.** When the consumer's `(kjSubmit)` handler returns
  a `Promise` or an `Observable`, the directive sets `submitting` to `true`
  for the lifetime of the async work, sets `aria-busy="true"`, and pushes
  `submitting=true` into `KJ_FORM` context so child `KjFormControl`s can
  disable themselves. Resolution / rejection / completion clears the flag.
  The handler signature is `(value: T) => void | Promise<void> | Observable<void>`.
- **Focus-on-error.** On invalid submit, walk `FormGroup.controls` (or
  `NgForm.form.controls`) depth-first, find the first invalid `FormControl`
  leaf, look up its DOM element via the `KJ_FORM` registry (populated by
  `KjFormControl`), call `.focus({ preventScroll: false })`. Configurable
  via `kjFocusOnError` (default `true`).
- **Scroll-into-view.** After focus, call `scrollIntoView({ block: 'center',
  behavior: 'smooth' })` on the focused element (or its closest
  `[kjFormField]` ancestor, whichever is broader). Configurable via
  `kjScrollOnError` (default `true`) and `kjScrollBehavior` (`'smooth' |
  'auto' | 'instant'`, default `'smooth'`). Honors
  `prefers-reduced-motion` automatically by switching to `'auto'`.
- **Mark-all-as-touched on submit.** Default `true`. Configurable via
  `kjMarkAllAsTouchedOnSubmit`. Calls `form.markAllAsTouched()` *before* the
  validity check so every field's `aria-invalid` flips on at the same
  instant.
- **Error summary.** Opt-in via `kjErrorSummary` (default `false`).
  When `true`, on invalid submit, `KjForm` populates a known
  `KjLiveRegion` (registered by an inner `[kjFormErrorSummary]` directive)
  with a count + list of invalid fields and points
  `aria-describedby` from the form to the summary's id. The summary
  receives focus *after* the live-region announces (see **Accessibility** for
  why both can be true simultaneously without double-announcement).
- **Submit-button coordination.** A submit button inside the form
  (`<kj-button kjType="submit">` or any `<button type="submit">`) is
  disabled while `submitting()` is true. This is reactive — the button
  reads `submitting` from `KJ_FORM` and disables itself. No special
  directive on the button is required because `KjButton` already injects
  `KJ_FORM, { optional: true }` (proposed addition; cross-reference
  `actions/button.md`'s "open questions").

## Accessibility (WCAG 2.1 AAA)

| Concern | Where | Mechanism |
|---|---|---|
| **Role** | DOM | Native `<form>` element. No explicit `role` — inherits the implicit form role. |
| **`aria-busy`** | core directive | `[attr.aria-busy]="submitting() ? 'true' : null"` — set during async submission so screen readers know the form is processing. WCAG 4.1.3 (Status Messages). |
| **`aria-describedby`** | core directive (when `kjErrorSummary` is on) | When the optional error summary is rendered, the form's `aria-describedby` points to the summary's id so AT users hear the error count when focus enters the form after a failed submit. |
| **Error announcement (live region)** | `KjLiveRegion` (composed) | The error summary uses `KjLiveRegion` with `kjPoliteness="assertive"` for the error count. Politeness is `assertive` rather than `polite` because the user just submitted — they're waiting for a response and the error count is the response. Per WCAG 4.1.3 the announcement must be programmatic; we use `KjLiveRegion.announce()`. |
| **Focus-on-error** | core directive | After an invalid submit, focus moves to the first invalid control. This satisfies the user expectation that submitting an invalid form lands them on the problem. WCAG 2.4.3 (Focus Order) and 3.3.1 (Error Identification). |
| **Scroll behaviour** | core directive | `scrollIntoView({ block: 'center' })` after focus. Honours `prefers-reduced-motion`. WCAG 2.3.3 (Animation from Interactions). |
| **`aria-invalid` per field** | `KjFormControl` (per-field) | The form does not set `aria-invalid` itself — each `KjFormControl` has its own touched-gated `aria-invalid`. `KjForm.markAllAsTouchedOnSubmit` is the trigger that flips all of them visible at once on submit. |
| **Error message wiring** | `KjFormField` / `KjFormError` (per-field) | Each field's error message is `role="alert" aria-live="polite"` from the existing `KjFormError`. The summary at the top is *additive*, not replacing. |
| **Submit button disabled state** | `KjFormControl` on the button (proposed) | The button reads `submitting` from `KJ_FORM` and reflects `aria-disabled="true"` (kouji's button stance is ARIA-disabled, focusable-but-blocked — see `actions/button.md`). The form does not directly disable the button; the button decides for itself. |
| **Inputs disabled state** | `KjFormControl` (per-field) | Similarly, each `KjFormControl` reads `submitting` from `KJ_FORM` and reflects `disabled`. The form pushes the flag, the inputs apply it. This means the existing native-`disabled` policy in `KjInput` (see `data-input/input.md`'s open questions) applies during submission too — focus *will* leave the form during `submitting=true` if the user tabs. Acceptable: a busy form is not interactive. |
| **No focus trap** | n/a | Forms are NOT modal. Tab leaves the form, exactly as native. Adding a focus trap would violate WCAG 2.1.2 (No Keyboard Trap). |
| **Keyboard contract** | native | `Enter` in any single-line text input submits the form (browser default — preserved). `Esc` does nothing (no native form-cancel; consumers wire their own). |
| **Touch target** | n/a | The `<form>` element is not interactive itself. Touch targets are owned by the controls inside it. |
| **`prefers-reduced-motion`** | core directive | Detected via `matchMedia('(prefers-reduced-motion: reduce)')` once in `afterNextRender`; if reduced, the smooth scroll downgrades to `'auto'`. WCAG 2.3.3. |
| **Re-validate on submit** | core directive | `markAllAsTouched()` before the validity check ensures the user sees every error simultaneously, not just the ones they have already blurred. WCAG 3.3.1 (Error Identification) — "errors in input are identified". |
| **Focus management on async resolution** | core directive | Default: focus stays where the user left it. If `kjFocusOnSuccess` (a future opt-in) is set to a selector or template ref, focus moves there on successful submit. Out of scope for v1; see **Open questions**. |

**Where it lives.** `aria-busy` and `aria-describedby` are on the `<form>`
element via the core directive's `host` bindings.
`aria-invalid` and `aria-describedby` for the *per-field* error message
linkage are on the field controls via `KjFormControl` and `KjFormField` (see
the proposed field-level wiring in `data-input/input.md`'s "Improvement
flagged below" — that improvement is a prerequisite for the error summary
because the summary needs to link summary entries → field ids → field
labels). Live region for the summary uses `KjLiveRegion` from the a11y
primitives (`packages/core/src/a11y/live-region.ts`). Focus and scroll
mechanics are entirely in the core directive — no a11y primitive owns
them at the form level today; we don't ship a `KjFocusFirstError` because
it's so coupled to `KJ_FORM` that splitting it would just be ceremony.

## Composition model

**Single root attribute directive (`KjForm`)** with one optional inner
directive (`KjFormErrorSummary`, attribute selector `[kjFormErrorSummary]`)
that the consumer places where they want the announced error summary
rendered. `KjFormErrorSummary` composes `KjLiveRegion` via `hostDirectives`.

```ts
@Directive({
  selector: 'form[kjForm]',
  standalone: true,
  exportAs: 'kjForm',
  providers: [{ provide: KJ_FORM, useExisting: KjForm }],
  host: {
    '[attr.aria-busy]': 'submitting() ? "true" : null',
    '[attr.aria-describedby]': 'errorSummaryId() ?? null',
    '[attr.data-submitting]': 'submitting() ? "" : null',
    '[attr.data-invalid]': 'invalid() ? "" : null',
    '(submit)': 'onNativeSubmit($event)',
  },
})
export class KjForm implements KjFormContext { … }
```

```ts
@Directive({
  selector: '[kjFormErrorSummary]',
  standalone: true,
  hostDirectives: [{
    directive: KjLiveRegion,
    inputs: ['kjPoliteness: kjPoliteness'],
  }],
  host: {
    '[id]': 'id()',
    '[attr.role]': '"status"',
    '[attr.data-visible]': 'visible() ? "" : null',
  },
})
export class KjFormErrorSummary { … }
```

`KjForm` injects `NgForm, { optional: true, self: true }` and
`FormGroupDirective, { optional: true, self: true }`. Exactly one of these
will be present on a real `<form>`; the directive normalises both into a
single `form: FormGroup` reference. Consumers using neither (a `<form>`
with no Angular forms binding) get a clear runtime error in dev mode and
a no-op in production — the directive needs a `FormGroup` or `NgForm` to
do anything useful.

`KJ_FORM` exposes:

```ts
export interface KjFormContext {
  /** The Angular FormGroup powering this form. */
  form: Signal<FormGroup>;
  /** True while an async submit is in flight. */
  submitting: Signal<boolean>;
  /** True when the user has submitted at least once. */
  submitted: Signal<boolean>;
  /** True when the most recent submit attempt was invalid. */
  invalid: Signal<boolean>;
  /** Register a control's host element so focus-on-error can target it. */
  registerControl(name: string, el: HTMLElement): () => void;
  /** Imperative submit — same as the user pressing Enter or Submit. */
  submit(): void;
}
```

`KjFormControl` is updated to inject `KJ_FORM, { optional: true }` and
register itself when present. Registration is keyed by the control's path
within the form group (`'address.street'` for nested groups), looked up via
the `NgControl` Angular forms exposes; the value is the host element. On
destroy, the registration is removed via a `DestroyRef` cleanup. This
keeps the registry in sync with the live form tree without manual
bookkeeping.

**Cross-component pointers:**

- **`data-input/field.md`** *(forward reference — sibling `field.md` is
  not yet shipped; placeholder existing-`KjFormField`-family doc lives in
  `packages/core/src/form/form-field.ts` after rename)*. The error
  summary's "Email is required" line items want the same human label that
  `<label kjFormLabel>` displays for each field. The cleanest wiring is
  for `KjFormField` to expose its label text via `KJ_FORM_FIELD` context
  and for `KjFormControl` to forward (control-name, label-text) tuples to
  `KJ_FORM` on registration. That requires a tiny addition to
  `KjFormField` (a `label` signal populated from the projected
  `<label kjFormLabel>` element's `textContent`). Document the dependency
  here; ship the `KjFormField` change as part of the Form work.
- **`data-input/input.md`** — the canonical control. The proposed
  `aria-required` derivation (open question in input.md), the
  bidirectional id wiring with `KjFormField`, and the `aria-describedby`
  improvement are all prerequisites for the error summary to render
  meaningful per-field links. Without them the summary still works (it can
  fall back to the control's path), but the UX is poorer.
- **`data-input/number-input.md`**, **`password-input.md`**,
  **`textarea.md`** (all sibling form controls). Each composes
  `KjFormControl`, which means each automatically participates in
  `KJ_FORM`'s registry. No per-control changes needed.
- **`data-input/checkbox.md`**, **`radio.md`**, **`select.md`**,
  **`toggle.md`**, **`combobox.md`**, **`autocomplete.md`** *(future)* —
  same story. Any directive that composes `KjFormControl` is
  automatically focus-on-error-eligible.
- **`actions/button.md`** — the submit button. `KjButton` should inject
  `KJ_FORM, { optional: true }` and reflect `submitting()` as
  `aria-disabled` when `kjType === 'submit'`. Cross-reference under
  Button's "open questions" — flag this as a follow-up there too.
  The cancel/reset path (`kjType === 'reset'`) is a separate story and
  is *not* coordinated by `KjForm` — native `<button type="reset">` already
  does the right thing.
- **`feedback/alert.md`** *(future)* — the error summary visual is closer
  to an alert than a toast. The styled wrapper for `KjFormErrorSummary`
  in `@kouji-ui/components` should reuse `<kj-alert kjVariant="destructive">`
  for the chrome and project the dynamic count + list inside it.
- **`a11y/live-region`** (primitive, already shipped at
  `packages/core/src/a11y/live-region.ts`) — the announcement engine for
  the error summary. `KjFormErrorSummary` composes it via `hostDirectives`.

## Inputs / Outputs / Models — `kj`-prefixed

### Core directive (`KjForm`, selector `form[kjForm]`)

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjFocusOnError` | `input(true)` | `true` | When `false`, the directive skips the focus step on invalid submit. Use when the form has a custom error-summary that handles focus. |
| `kjScrollOnError` | `input(true)` | `true` | When `false`, the directive does not scroll the focused control into view. Independent of `kjFocusOnError`. |
| `kjScrollBehavior` | `input<ScrollBehavior>('smooth')` | `'smooth'` | Forwarded to `scrollIntoView({ behavior })`. Auto-downgrades to `'auto'` when `prefers-reduced-motion: reduce` is detected. |
| `kjScrollBlock` | `input<ScrollLogicalPosition>('center')` | `'center'` | Forwarded to `scrollIntoView({ block })`. |
| `kjMarkAllAsTouchedOnSubmit` | `input(true)` | `true` | When `true`, calls `form.markAllAsTouched()` before validity check. Set `false` only if you want field errors to stay hidden until each field is individually blurred. |
| `kjErrorSummary` | `input(false)` | `false` | When `true`, expects a `[kjFormErrorSummary]` element somewhere inside the form and populates it on invalid submit. |
| `kjDisableInputsWhileSubmitting` | `input(true)` | `true` | When `true`, pushes `submitting=true` through `KJ_FORM` so child `KjFormControl`s disable themselves. Set `false` when the consumer wants to keep inputs enabled (e.g. optimistic UI). |
| `kjResetOnSuccess` | `input(false)` | `false` | When `true`, calls `form.reset()` after a successful async submit resolves. |

### Outputs

| Name | Type | Notes |
|---|---|---|
| `kjSubmit` | `output<unknown>()` | Emits the form's `value` when submitted *and* valid. Replaces the consumer's `(ngSubmit)` listener. The handler may return `void`, `Promise<void>`, or `Observable<void>`; the directive tracks the async lifecycle and toggles `submitting`. *Implementation note:* Angular `output()` is fire-and-forget — the directive cannot read a return value from a subscriber. The async-handler path uses an alternative shape: `kjSubmitHandler` (a `model<…>()` of a function) or, more idiomatically, the consumer wires `(kjSubmit)="onSubmit($event)"` and the parent component manually toggles a `submitting` signal. **Decision:** ship two outputs — `(kjSubmit)` (sync, fire-and-forget, always available) — and a separate **input** `kjAsyncSubmit` of type `(value: T) => Promise<void> \| Observable<void> \| void` that the directive *does* await. Consumers pick whichever ergonomics they prefer. |
| `kjInvalidSubmit` | `output<FormGroup>()` | Emits when the user submitted but the form was invalid. Payload is the form group itself so consumers can inspect errors. Useful for analytics ("track form abandonment"). |
| `kjSubmittingChange` | `output<boolean>()` | Mirrors the `submitting` signal as an event for non-signal consumers. Optional. |

### Models

| Name | Type | Notes |
|---|---|---|
| `kjSubmitting` | `model(false)` | Two-way bindable submitting flag. When the consumer manages async submission externally (their own `signal()` or RxJS), they bind `[(kjSubmitting)]="busy"` and the directive reads from + writes to it. When unbound, the directive owns the signal internally. |

### Inner directive (`KjFormErrorSummary`, selector `[kjFormErrorSummary]`)

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjPoliteness` | `input<KjLivePoliteness>('assertive')` | `'assertive'` | Forwarded to `KjLiveRegion`. `assertive` is correct for post-submit error announcements; users are waiting on the response. |
| `kjFocusOnPopulate` | `input(false)` | `false` | When `true`, the summary element receives focus after population. Pairs with `tabindex="-1"` on the summary host. Off by default because the focus-on-first-error path handles focus; the summary is for screen-reader users who get the announcement automatically. |

### Wrapper component (`KjFormComponent`, selector `kj-form`)

A wrapper component is **not strictly necessary** — `<form kjForm>` is the
idiomatic shape. But shipping `<kj-form>` in `@kouji-ui/components` is
useful for two reasons: (a) consumers can pass a typed `[kjFormGroup]` and
have the wrapper instantiate the `<form [formGroup]>` internally,
(b) the wrapper can project a structured `<kj-form-error-summary>`
companion that is rendered conditionally based on `[kjErrorSummary]`.

```ts
@Component({
  selector: 'kj-form',
  template: `
    <form kjForm
          [formGroup]="kjFormGroup()"
          [kjFocusOnError]="kjFocusOnError()"
          [kjScrollOnError]="kjScrollOnError()"
          [kjMarkAllAsTouchedOnSubmit]="kjMarkAllAsTouchedOnSubmit()"
          [kjErrorSummary]="kjErrorSummary()"
          [kjAsyncSubmit]="kjAsyncSubmit()"
          (kjSubmit)="kjSubmit.emit($event)"
          (kjInvalidSubmit)="kjInvalidSubmit.emit($event)">
      @if (kjErrorSummary()) {
        <kj-form-error-summary />
      }
      <ng-content />
    </form>
  `,
})
export class KjFormComponent { … }
```

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjFormGroup` | `input.required<FormGroup>()` | — | Required. The wrapper instantiates the `[formGroup]` binding internally. Consumers using `NgForm` (template-driven) skip the wrapper and use `<form kjForm>` directly. |
| `kjFocusOnError` | `input(true)` | forwarded | |
| `kjScrollOnError` | `input(true)` | forwarded | |
| `kjMarkAllAsTouchedOnSubmit` | `input(true)` | forwarded | |
| `kjErrorSummary` | `input(false)` | forwarded | When `true`, projects `<kj-form-error-summary>` automatically. |
| `kjAsyncSubmit` | `input<((v: unknown) => Promise<void> \| Observable<void> \| void) \| undefined>(undefined)` | `undefined` | Optional async handler. |
| `kjSubmit` | `output<unknown>()` | re-emitted | |
| `kjInvalidSubmit` | `output<FormGroup>()` | re-emitted | |

## Examples to ship

Match the structure under `packages/components/src/`:

1. **Default reactive form** — `form.example.ts` *(new)*. A `FormGroup` with
   email + password + submit button. Demonstrates `(kjSubmit)`,
   `(kjInvalidSubmit)`, focus-on-error, scroll-into-view.
2. **Template-driven form** — `form.ngmodel.example.ts` *(new)*. Same form
   shape with `<form #f="ngForm">` instead of `[formGroup]`. Proves the
   directive works with `NgForm` too.
3. **Async submit** — `form.async.example.ts` *(new)*. Submit handler
   returns a `Promise` that resolves after 2s; demonstrates `aria-busy`,
   inputs disabling, submit button disabling, `submitting` signal, and the
   `kjResetOnSuccess` flag.
4. **Error summary** — `form.error-summary.example.ts` *(new)*. Form with
   five required fields and an `<kj-form-error-summary>` at the top.
   Submit with all empty; verify the summary announces "5 errors" and lists
   each field by label.
5. **Nested groups** — `form.nested.example.ts` *(new)*. A `FormGroup`
   containing an `address: FormGroup` and a `phones: FormArray`.
   Demonstrates the focus-on-first-error tree walk into nested groups and
   array entries.
6. **Custom focus and scroll** — `form.scroll.example.ts` *(new)*.
   `kjScrollBehavior="instant"`, `kjScrollBlock="start"`, and
   `kjFocusOnError="false"` to demonstrate the configurability.
7. **Long form, reduced motion** — `form.reduced-motion.example.ts`
   *(new)*. Long form (~20 fields) with errors near the bottom; verifies
   `prefers-reduced-motion` downgrades the smooth scroll. Manual review
   only — Playwright can simulate the media query but axe doesn't check
   motion.
8. **No Angular forms** — `form.no-forms.example.ts` *(new — diagnostic)*.
   `<form kjForm>` with no `[formGroup]` and no `ngForm` — must show the
   dev-mode error and no-op safely in production.

## Open questions / risks

- **File rename collision.** The existing `form/form.ts` holds `KjFormField`
  /`KjFormLabel` /`KjFormError`. The new `KjForm` wants the same filename
  for the new `<form>`-element directive. Rename the existing file to
  `form-field.ts` (and `form.context.ts` to `form-field.context.ts`,
  `form.spec.ts` to `form-field.spec.ts`). The folder stays `form/` because
  the family is conceptually one feature. Update `form/index.ts` to
  re-export both. Consumers importing from `@kouji-ui/core` see no break.
  Internal imports inside the package update by mechanical find/replace.
- **`output()` cannot return a promise.** Angular's signal-output API is
  fire-and-forget; the directive cannot await a subscriber's return value.
  Options: (a) ship a separate `kjAsyncSubmit` *input* that takes a
  function; (b) use a `model<boolean>` `kjSubmitting` and let the consumer
  manage their own async lifecycle externally; (c) ship both. **Decision
  taken in this doc:** ship both. `(kjSubmit)` is the fire-and-forget
  output for sync handlers; `[kjAsyncSubmit]` is the function input for
  async handlers; `[(kjSubmitting)]` is the model for advanced cases. Most
  consumers use option (b) (their own signal) — that's the
  react-hook-form-style ergonomics.
- **Control-element registry source.** The cleanest source is
  `KjFormControl`, which knows its host `ElementRef` and its `NgControl`
  binding (when present). The wrinkle: `NgControl` is Angular's internal
  abstraction; `KjFormControl` doesn't currently inject it (it implements
  `ControlValueAccessor` but doesn't read its parent control). Adding
  `inject(NgControl, { optional: true, self: true })` to `KjFormControl`
  unlocks (control-name + form-path → element) registration and is also
  what `aria-required` derivation needs (cross-reference
  `data-input/input.md` open questions). Ship both behaviours together.
- **Native controls without `KjFormControl`.** A consumer writes
  `<input formControlName="x" />` *without* `kjInput` — the registry
  doesn't know about it, focus-on-error misses it. Mitigation: when no
  registration is found for an invalid control, fall back to a DOM crawl
  via `form.querySelector('[formcontrolname="x"], [ng-reflect-name="x"]')`.
  This is the react-hook-form "ref" path; it works, it's just slower and
  less reliable. Document the fallback and recommend `kjInput` for first-
  class behaviour.
- **`FormArray` ordering.** Depth-first walk treats array entries in index
  order, which matches user expectation (focus the first invalid row). But
  if the consumer dynamically reorders rows, the registered element-name
  map can lag the form tree. Mitigate by re-deriving the path on every
  invalid submit (cheap — Angular forms expose
  `AbstractControl.parent` walk).
- **Async submit error handling.** If the consumer's `kjAsyncSubmit`
  returns a rejected `Promise`, the directive should clear `submitting`
  but *not* show an error — that's the consumer's job (toast, inline
  alert, etc.). Document that the directive does not consume the error;
  it only manages the `submitting` flag. Pair with a `(kjSubmitError)`
  output? **Decision: skip for v1.** Consumers wrap their async work in
  try/catch and surface errors however they want. Ship `kjSubmitError`
  later if needed.
- **Imperative submit.** Forms sometimes need to submit from outside the
  form (an external "Save" button in a sticky footer). Expose
  `KjForm.submit()` on the directive (already in `KjFormContext`). The
  consumer grabs `#myForm="kjForm"` and calls `myForm.submit()`. This is
  equivalent to dispatching a `submit` event on the form element.
- **Double-submission.** While `submitting` is true, ignore subsequent
  submit events. The directive should guard this internally — even with
  `kjDisableInputsWhileSubmitting=true` and the submit button disabled,
  `Enter` in a non-disabled input could re-trigger submit. Default
  behaviour: drop submit events while `submitting()` is `true`. No input.
- **`kjFocusOnSuccess`.** A future input that lets the consumer specify
  where focus goes after a successful submit (a "Saved!" toast trigger,
  the next page's heading, etc.). Out of scope for v1 — consumers do
  this in their `(kjSubmit)` handler today.
- **Server-side validation.** Async validators that hit a server *before*
  submit interact badly with focus-on-error: the form might be `pending`
  rather than `valid`/`invalid` at the moment `(submit)` fires. The
  directive should treat `pending` as "wait" — it sets `submitting=true`,
  waits for the async validators to resolve via Angular's
  `statusChanges`, then re-evaluates. Add this in v1; without it,
  reactive forms with `asyncValidators` are unusable.
- **SSR.** All DOM-touching code (`scrollIntoView`, `matchMedia`,
  `.focus()`) runs inside `afterNextRender` or in a submit-handler
  callback (which is browser-only by definition). The directive itself
  has no SSR-unsafe construction work. Confirm via an SSR smoke test.
- **`form-field.ts` rename and the rule about file naming.** The rules
  in `rules/code_style.md` say "name files after what they contain or do,
  omitting the Angular type suffix unless two files in the same folder
  would otherwise share the same base name." Two directives in the same
  folder *do* now share the base "form" — `KjForm` (the new one) and
  `KjFormField` (the existing). The rule's collision-resolution
  recommendation is to keep the suffix on the less primary class. Less
  primary here is `KjFormField` (it's a wrapper around individual
  controls; `KjForm` is the parent). So the file name `form-field.ts`
  follows the rule. The class name `KjFormField` already encodes the
  distinction — no rename needed at the class level.
- **Cross-reference to a missing sibling.** `data-input/field.md` is
  referenced by `data-input/input.md` and is the natural home for the
  per-field id wiring story. It does not yet exist. This Form analysis
  references it as a forward dependency; the Field analysis when written
  must (a) reflect the rename of `form.ts` to `form-field.ts`, and
  (b) document the `KJ_FORM_FIELD` ↔ `KJ_FORM` interaction (label-text
  exposure for the error summary). Flag this for the author of the Field
  doc.
- **Tailwind / theming.** The `<form>` element is unstyled. Theming is
  handled at the field and control level. Only the
  `KjFormErrorSummary` needs theme-driven chrome — re-use
  `<kj-alert kjVariant="destructive">` (cross-reference future
  `feedback/alert.md`).
