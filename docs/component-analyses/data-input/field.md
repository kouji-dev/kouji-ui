# Field / Form Field

The **Field** is the wrapper that brings a label, control, hint, and error
message together. It owns three contracts no individual control can satisfy
on its own:

1. **Label-control association** — the `<label for>` ↔ control `id` link, the
   `aria-required` mirror, and (optionally) `aria-labelledby` when the label
   isn't a `<label>` element.
2. **`aria-describedby` chain** — collects all hint and error element ids
   inside the field and applies them as a deduplicated, ordered set onto the
   inner control. This is the single biggest cross-cut between Field and
   every Data Input component (Input, Textarea, Number Input, Password
   Input, Select, Combobox, Date Picker, …).
3. **Error visibility gating** — listens to the bound form control's
   `touched && invalid` state, drives `aria-invalid` on the inner control,
   and shows / hides `KjFieldError` blocks accordingly. Matches Material's
   `errorState` semantics and removes the "screams red on first render"
   anti-pattern.

A bare-bones `KjFormField` already exists at
`packages/core/src/form/form.ts` (root + `KjFormLabel` + `KjFormError`), but
its current shape is too thin: it does not auto-mint ids, does not wire
`aria-describedby`, does not own `aria-required` or auto-`aria-invalid`,
and does not separate hint vs error. This analysis specifies the proper
shape and renames the directives to the `KjField*` family for clarity (the
existing `KjFormField` directives are deprecated aliases).

Cross-references (every Data Input depends on Field):
- [`input.md`](./input.md) — the canonical leaf control. Field auto-mints
  its id and registers it for `for=` / `aria-describedby`.
- [`textarea.md`](./textarea.md) — same wiring; Field also composes the
  textarea's optional character counter id into the describedby chain.
- [`number-input.md`](./number-input.md) — Field wraps the composite
  (input + stepper buttons); the **inner `<input>`** is the labelled
  element, not the wrapper.
- [`password-input.md`](./password-input.md) — strength meter + Caps Lock
  warning ids each register with Field's describedby chain via
  `KjAriaDescribedBy`. Toggle button is a sibling inside the field, not
  the labelled element.
- [`input-mask.md`](./input-mask.md), [`input-otp.md`](./input-otp.md),
  [`input-group.md`](./input-group.md) — same Field shell. OTP labels the
  *group* (cell array), not any single cell — see
  [Open questions](#open-questions--risks).
- [`checkbox.md`](./checkbox.md), [`radio.md`](./radio.md),
  [`toggle.md`](./toggle.md) — Field accepts any element marked with
  `KjFormControl` host directive as the labelled control. For Radio,
  the *group* is the labelled control (`role="radiogroup"`), not each
  radio; Field detects via the registration call.
- [`select.md`](./select.md), [`multi-select.md`](./multi-select.md),
  [`combobox.md`](./combobox.md), [`cascade-select.md`](./cascade-select.md),
  [`tree-select.md`](./tree-select.md) — overlays. The combobox/listbox
  trigger is the labelled element; Field's describedby flows onto the
  trigger, not the panel.
- [`slider.md`](./slider.md), [`date-picker.md`](./date-picker.md),
  [`time-picker.md`](./time-picker.md), [`color-picker.md`](./color-picker.md),
  [`file-upload.md`](./file-upload.md) — same shell. File-upload's drop-zone
  needs the field's describedby for the "drag a file here" instructional
  text.
- [`form.md`](./form.md) — the higher-level form orchestration (cross-field
  validators, summary errors). Form does **not** subsume Field; Field
  remains the per-control wrapper.

## Source comparison

### PrimeNG — split into floatlabel / iftalabel / message

PrimeNG deliberately does **not** ship a single "form field" component.
Field assembly is the consumer's job, and the library provides a kit of
small companions:

- **`<p-floatLabel>`** ([primeng.org/floatlabel](https://primeng.org/floatlabel))
  — wraps an input + label. Labels animate from inside-the-input to
  above-it on focus / value-present. `variant` input takes
  `'over' | 'in' | 'on'` for the three motion styles. No id minting; the
  consumer wires `<label for>` themselves. No describedby. No error.
- **`<p-iftaLabel>`** ([primeng.org/iftalabel](https://primeng.org/iftalabel))
  — "Inset Top-Aligned": label is inside the input control border at the
  top, value below it. Static (no animation). Same lack of id minting.
- **`<p-message>`** — separate. Renders helper / error text with a `severity`
  variant (`'success' | 'info' | 'warn' | 'error'`) and a `role="alert"` /
  `aria-live` posture. Not auto-wired to any input — the consumer is
  responsible for setting `aria-describedby` on the input that points to
  the message's id.

The PrimeNG model is **flat**: the consumer composes a wrapper `<div>`,
an `<input pInputText id="…">`, a `<label for="…">`, a `<p-message>` with
some id, and binds `aria-describedby` by hand. This is closer to shadcn
than to Material. It scales poorly: every form re-derives label-control
association, describedby wiring, and required-mirror logic. PrimeNG's docs
even acknowledge this with a "Best Practices" section that reads as a
list of things the consumer must remember.

### Angular Material — `<mat-form-field>` (the flagship)

Material's [`<mat-form-field>`](https://material.angular.dev/components/form-field)
is the canonical "wrapper that does it all" pattern. It's the one to
study closely, and the one this analysis takes the most cues from.

- **Composition.** `<mat-form-field>` projects `<mat-label>`,
  `<mat-hint>` (any number, with `align="start" | "end"`), `<mat-error>`
  (any number, shown only when the form control is invalid + touched),
  `<mat-prefix>` / `<mat-suffix>` slots, and the input directive itself
  (`matInput`, `matSelect`, `matChipGrid`, `matDatepickerInput`, etc.).
  The input is the **only required projected child**.
- **Variants.** `appearance` input takes `'fill' | 'outline'` (Material 3
  dropped `'legacy'` and `'standard'`). `floatLabel` takes
  `'auto' | 'always'` (and the deprecated `'never'`). `subscriptSizing`
  takes `'fixed' | 'dynamic'` — fixed reserves a stable line-height for
  hint/error to avoid layout shift, dynamic collapses when empty.
- **Control contract.** The labelled child must implement
  `MatFormFieldControl<T>`, an abstract class declaring:
  `value`, `stateChanges` (Subject), `id`, `placeholder`, `ngControl`,
  `focused`, `empty`, `shouldLabelFloat`, `required`, `disabled`,
  `errorState`, `controlType`, `autofilled`, `userAriaDescribedBy`,
  `setDescribedByIds(ids: string[])`, `onContainerClick(event)`. The form
  field provides the ids; the control accepts them. **This is the key
  abstraction** — the form field owns the ids, the control owns where to
  attach them.
- **Id minting.** Material auto-mints input ids via its `_IdGenerator`
  service when missing. The form field's `<label>` gets `for={control.id}`.
- **`aria-describedby` flow.**
  `setDescribedByIds([...hintIds, ...errorIds, ...userIds])` is called by
  the form field whenever its hint / error children change. The control
  then does whatever is right for *its* element type (for inputs, it
  reflects `[attr.aria-describedby]`; for chip grids, the chip-grid host
  carries it).
- **Error state.** The `_ErrorStateMatcher` injection token decides when
  to show errors. The default matcher fires on `touched && invalid` (or
  the parent form is submitted). Apps override the token globally for
  e.g. "show errors as the user types after the first blur".
- **Required mirror.** Form field reads
  `ngControl?.control?.hasValidator(Validators.required)` and reflects the
  visual `*` indicator next to the label. The control itself sets
  `aria-required` from the same source.
- **Disabled propagation.** Reading the *control's* `disabled` — does not
  itself drive disabled. Form field is a presentational wrapper for
  disabled, not the source of truth.
- **Floating label.** Label position is animated from "inside the field
  at rest" to "above the field on focus / value-present". `floatLabel`
  controls whether it ever rests inside.

The Material model is the most accessible and the most powerful, but it
requires every supported control to implement `MatFormFieldControl`.
The boilerplate cost is real (Material's docs walk through ~150 lines
of setup for a custom control). kouji's `KjFormControl` host directive
already plays the same role (a single shared CVA primitive); Field can
read from it and any other control that registers with the field's
context.

### shadcn/ui — Field + FormField + Label

shadcn ships **two** patterns, which is itself instructive:

- **`<Field>`** ([ui.shadcn.com/docs/components/field](https://ui.shadcn.com/docs/components/field))
  — a thin layout primitive. `<FieldLabel>`, `<FieldDescription>` (hint),
  `<FieldError>`, `<FieldGroup>` (multi-control). No id minting. No
  describedby wiring. The consumer is responsible for both. Pure
  styling + layout.
- **`<FormField>`** (under [ui.shadcn.com/docs/components/form](https://ui.shadcn.com/docs/components/form))
  — the react-hook-form integration. `<FormItem>`, `<FormLabel>`,
  `<FormControl>`, `<FormDescription>`, `<FormMessage>`. Uses React
  context to thread the field's id (auto-generated via `useId()`),
  description id, and message id to whichever child needs them.
  `<FormControl>` is a slot wrapper that *does* set `id`,
  `aria-describedby`, `aria-invalid` on the projected control via React
  cloneElement-style prop spreading. **This is the closest analogue to
  what we want** — minus the React-specific cloneElement trick, which
  Angular replaces with `hostDirectives` + `KjAriaDescribedBy`.

The shadcn split acknowledges that "layout" and "form integration" are
separable. We **don't** ship them as separate components in kouji —
`KjField` does both — but the source comparison is worth flagging because
it rationalises a single-component answer (Material's) over a kit
(PrimeNG's, shadcn's split).

**Pattern picked up.** Material's `<mat-form-field>` shape: a single
wrapper directive that projects label / hint / error and owns the
describedby chain, label-for, error gating, and required mirror. We
replace `MatFormFieldControl` with the existing `KjFormControl` host
directive plus a `KJ_FIELD` context that any non-`KjFormControl` control
can opt into. Floating-label animation is **split into a separate
`KjFloatLabel` directive** (PrimeNG's split) — see
[Decision: floating label](#2-floating-label-where-does-it-live).

## Decision: needs a core directive?

**Yes — the Field family.** Five directives (one root + four children),
plus an optional sixth (`KjFloatLabel`). The current
`packages/core/src/form/form.ts` is too thin and gets renamed.

### 1. The Field family

```text
KjField              ← root, on a wrapper element (commonly <div>)
KjFieldLabel         ← <label> inside the field, auto-wires `for=`
KjFieldHint          ← non-error helper text; id auto-registered for describedby
KjFieldError         ← error text; only visible when control is in error state, id auto-registered
KjFieldRequired      ← visually-hidden "required" marker (optional extra; see below)
```

The split exists because each child sits at a different DOM location
relative to the control (label above / inside, hint below, error below
the hint, prefix/suffix beside) and a single component would force a
rigid layout. This matches Material's projection model and shadcn's
split, and is consistent with how kouji factors Tabs, Accordion, and
Dialog.

The current names (`KjFormField` / `KjFormLabel` / `KjFormError`) are
**renamed** to `KjField*` for two reasons:
- The word "Form" already names something else in the roadmap
  (`data-input/form.md` is the higher-level form orchestrator). Two
  things named "Form…" in the same package is a maintenance footgun.
- Material uses "form-field" for the same concept, which is what their
  `MatFormField` is. We are deliberately picking the shorter name. The
  daisyUI category and the roadmap entry are both "Field / Form Field" —
  the shorter primary name is `KjField`.

The existing `KjFormField` / `KjFormLabel` / `KjFormError` selectors
are kept as **deprecated aliases** in `index.ts` until v1.0; the
implementation re-exports the `KjField*` classes under both selectors.
Spec at `packages/core/src/form/form.spec.ts` already exercises the
old selectors — keep that spec passing.

### 2. Floating label — where does it live?

**Separate directive: `KjFloatLabel` in
`packages/core/src/form/float-label.ts`.** Three reasons:

1. **Single responsibility.** `KjField` owns layout + a11y wiring.
   Floating-label is *animation* — reading the control's `value()` and
   `focused()` signals and toggling a CSS class / `data-floating`
   attribute. Mixing the two means every form field carries dead motion
   code, and means consumers who don't want floating labels still pay
   the bytes.
2. **PrimeNG's split has merit.** PrimeNG ships `<p-floatLabel>` as a
   separate wrapper specifically to keep the motion concern out of the
   field. Material packs floating into the form field, but the cost is
   visible in the form-field source (and in the bug tracker — floating
   label has the most field-related issues by a wide margin).
3. **The styles for "rest inside, float above" are non-trivial** and
   theme-specific. Themes opt in to the directive when they want the
   motion. Default theme uses static label-on-top.

The directive is a marker that adds `data-float-label` (with values
`'rest' | 'floating'`) to the field root, computed from
`(focused() || !empty())`. Consumers wire CSS transitions against the
attribute. No animation logic in the directive itself.

```html
<!-- static label (default) -->
<div kjField>
  <label kjFieldLabel>Email</label>
  <input kjInput type="email" [formControl]="email" />
</div>

<!-- floating label opt-in -->
<div kjField kjFloatLabel>
  <label kjFieldLabel>Email</label>
  <input kjInput type="email" [formControl]="email" />
</div>
```

`KjIftaLabel` (PrimeNG's "inset top-aligned" label) is **not** shipped as
a separate directive — it's just CSS positioning that themes apply to a
`KjFieldLabel` when the consumer adds `data-position="inset-top"`.

### 3. Why a directive at all?

Five contracts that have to live in code, not CSS:

1. **Auto-id minting** for the inner control when missing — drives
   `for=` on the label. Trivially mis-implemented by consumers (every
   library that ships a Field component does this; no consumer ever
   does it correctly themselves).
2. **`aria-describedby` chain** — collect all `KjFieldHint` and
   `KjFieldError` ids, dedupe (the same id could appear via consumer's
   own `aria-describedby` and via the field), apply to the control via
   `KjAriaDescribedBy`. Pure code.
3. **Error gating** — read `control.touched && control.invalid` (or
   defer to a pluggable matcher), reflect `data-invalid` on the field,
   and toggle `[hidden]` on each `KjFieldError`. Pure code.
4. **Required mirror** — read `control.hasValidator(Validators.required)`,
   reflect `data-required` on the field and (visual) `*` next to the
   label. Pure code.
5. **`aria-invalid` and `aria-required` propagation** to the inner
   control without the consumer having to wire them. Pure code.

There is no plausible "just CSS + a wrapper `<div>`" recipe that
delivers any of these. PrimeNG's flat approach pushes all five onto
consumers and gets it wrong everywhere.

## Base features

### Slots / projected children

| Slot | Cardinality | Purpose |
|---|---|---|
| Control | exactly 1 | Any element with `KjFormControl` host directive (`<input kjInput>`, `<textarea kjInput>`, `<kj-select>`, `<kj-checkbox>`, …) **or** any element marked `[kjFieldControl]` (escape hatch for non-`KjFormControl` controls — see below). |
| `KjFieldLabel` | 0 or 1 | The visible label. `<label kjFieldLabel>` for `<input>`-type controls; `<span kjFieldLabel>` allowed for composite controls (e.g. radio group) where `<label for>` doesn't make sense. |
| `KjFieldHint` | 0..n | Helper text. Each gets a unique id; all are appended to the control's `aria-describedby`. |
| `KjFieldError` | 0..n | Error text. Each gets a unique id; appended to `aria-describedby` only **when visible** (i.e. when error state is active). Hidden via `[hidden]` otherwise. |
| Prefix / suffix | 0..n | Cross-reference [`input-group.md`](./input-group.md). `KjInputGroup` provides leading/trailing slots; Field accepts an `<div kjInputGroup>` as the projected control wrapper. Field does **not** ship its own prefix/suffix slots — that's `KjInputGroup`'s job. |

### Inputs (on `KjField`)

- **`kjFieldDisabled`** — group-level disabled. PrimeNG supports this on
  some wrappers; Material doesn't. **We do** — when set, the field forwards
  `disabled` to the registered control via the context. Less common usage,
  but it makes form-row scaffolding cleaner ("disable the whole field"
  rather than "find the inner control and disable it"). **Default `false`.**
- **`kjFieldErrorMatcher`** — pluggable matcher, mirrors Material's
  `_ErrorStateMatcher`. Default returns `control.touched && control.invalid`.
  Apps providing a different matcher (e.g. "show errors after submit") set
  `KJ_FIELD_ERROR_MATCHER` token globally; the per-field input is the
  override. **Default: built-in touched-and-invalid matcher.**
- **`kjFieldOrientation`** — `'vertical' | 'horizontal'`. Vertical (default)
  stacks label on top, control below, hint/error below. Horizontal places
  label to the start of the control on a single row (form-row layouts).
  Reflected as `data-orientation` for theme CSS to consume. Does **not**
  change a11y semantics — only layout.
- **`kjFieldLabelPosition`** — `'top' | 'start' | 'end' | 'inside'`. The
  positional version of orientation; `'inside'` is shorthand for "use the
  `KjFloatLabel` directive". Implementing as a separate input keeps the
  layout choice explicit when consumers don't add `KjFloatLabel`. The
  `'inside'` value sets `data-label-position="inside"` so themes can
  position the label inside the input border (PrimeNG's iftalabel pattern).

### State signals (on the `KjField` context)

| Signal | Purpose |
|---|---|
| `controlId` | The id (existing or auto-minted) of the registered inner control. |
| `controlRequired` | Mirrored from the control's `Validators.required` (when an Angular form is bound) or the directive's own `kjRequired` input. |
| `controlDisabled` | Mirrored from the control's `KjFormControl.disabled()` OR-ed with the field's `kjFieldDisabled` input. |
| `controlInvalid` | The matcher's verdict — typically `touched && invalid`. |
| `describedByIds` | The ordered, deduplicated list of hint + error ids currently attached. |

### State the field does *not* own

- **Value.** That's the control's. Field never reads or writes form
  values.
- **Focus management beyond click-on-label.** Labels do that natively
  (`<label for>` propagation). Field forwards click-on-self to the
  control via Material's `onContainerClick` pattern (clicking the
  field background focuses the control), but only when explicitly opted
  in via `kjClickToFocus="true"`. Default off — surprising to fire
  focus from clicking on whitespace.

## Accessibility (WCAG 2.1 AAA)

| Concern | Where | Mechanism |
|---|---|---|
| **Label association** | `KjField` + `KjFieldLabel` | When the control has an `id` (existing or auto-minted), `KjFieldLabel` reflects `[attr.for]="ctx.controlId()"`. WCAG 1.3.1 / 3.3.2 / 4.1.2. |
| **`aria-labelledby` (for composites)** | `KjField` + `KjFieldLabel` | When the control isn't `<input>` / `<select>` / `<textarea>` (e.g. a radio group `role="radiogroup"`, a custom combobox host), `<label for>` doesn't apply. The label sets `id` on itself, and the control reads `ctx.labelId` and reflects `[attr.aria-labelledby]`. Detected automatically by `KjFieldLabel` checking the registered control's `tagName` (and via the explicit `kjFieldLabelMode="aria-labelledby"` override). |
| **`aria-describedby` chain** | `KjField` (collects) + `KjAriaDescribedBy` (applies) | `KjFieldHint` and `KjFieldError` register their host ids on construction, deregister on destroy. Field maintains an ordered list (hints first, errors next, in source order). When error state is inactive, error ids are filtered out. The control's `KjAriaDescribedBy` reflects the final set. WCAG 1.3.1 / 4.1.2. |
| **`aria-invalid`** | `KjInput` / `KjFormControl`-bearing control (already) | Already correct on `KjInput`: `formCtrl.touched() && kjInvalid()`. Field's matcher computes the same boolean and forwards it via the context's `controlInvalid` signal — `KjInput` consumes either the local `kjInvalid` input or the field's `controlInvalid` (whichever is set). |
| **`aria-required`** | inner control | Field detects `Validators.required` on the bound `NgControl` (when present) and forwards a boolean to the control via context. The control reflects `[attr.aria-required]="ctx.controlRequired()"` only when `true`. WCAG 3.3.2. |
| **Visual required indicator (`*`)** | `KjFieldLabel` | Reflects `data-required` on the label when `ctx.controlRequired()` is true; theme CSS draws the `*`. The `*` is **announced visually only** — `aria-required` carries the semantics. The `*` itself is `aria-hidden="true"`. WCAG 3.3.2 + 1.1.1 (don't double-announce). |
| **Error announcement** | `KjFieldError` | `role="alert"` + `aria-live="polite"`. SR announces the message once it becomes visible (i.e. once `[hidden]` flips off). `polite` (not `assertive`) — errors aren't life-or-death; assertive interrupts mid-typing. WCAG 4.1.3. |
| **Hint announcement** | `KjFieldHint` | No `role`/`aria-live`. Hints are static helper text; they're announced via `aria-describedby` on focus. WCAG 1.3.1. |
| **Touch target ≥ 44×44** | inner control | Field doesn't add interactive surface (unless `kjClickToFocus`). The control's own size primitive provides the floor (see `KjSize` integration in the input analyses). |
| **Color/contrast for the `*`** | themes layer | Required-indicator colour must hit ≥ 7:1 against the field background. Themes own the colour token; doc this in the field-token spec. |
| **Click-to-focus pad** | `KjField` (opt-in) | When `kjClickToFocus`, clicking anywhere in the field background calls `control.focus()`. Mirrors Material's container click. The control inside still controls its own click semantics; this only triggers on clicks not handled by a child. WCAG 2.5.5 (effectively enlarges the touch target). |
| **Disabled propagation** | `KjField` → control via context | When `kjFieldDisabled`, the field forwards `disabled` to the control's `KjFormControl` (which already implements the policy). Visually, label takes `data-disabled` for theme-side dimming. WCAG 4.1.2. |
| **Floating-label contrast** | `KjFloatLabel` + themes layer | At rest (label inside the field), the label sits over the placeholder area and **must** maintain ≥ 7:1 against the field background. At floating (above the field), normal label contrast applies. Themes own both states; doc in the float-label token spec. WCAG 1.4.6. |
| **Label motion (vestibular)** | `KjFloatLabel` | Floating-label motion is opt-in already. Themes must respect `prefers-reduced-motion: reduce` and skip the transition (snap rest ↔ floating). WCAG 2.3.3. |
| **`for=` vs `aria-labelledby` precedence** | `KjFieldLabel` | When the consumer sets both an `id` on the control *and* `aria-labelledby` on the control directly, the field does **not** override — it skips the `for=` minting. Documented in TSDoc. WCAG 4.1.2. |

**Where each piece lives:**
- Label-side ARIA (`for`, label `id`) → `KjFieldLabel`.
- Hint/error ids → those directives' host bindings.
- The composed `aria-describedby` → on the **control** via
  `KjAriaDescribedBy` (Field tells the control which ids; the control
  reflects).
- `aria-invalid` / `aria-required` / `aria-disabled` → on the **control**
  (already by `KjInput` / `KjFormControl` / `KjDisabled`); Field feeds the
  inputs.
- Layout / motion `data-*` (`data-orientation`, `data-required`,
  `data-invalid`, `data-floating`, `data-label-position`) → on the
  `KjField` host. Themes consume.

## Composition model

```text
form/
  field.ts                ← KjField (root)
  field-label.ts          ← KjFieldLabel
  field-hint.ts           ← KjFieldHint
  field-error.ts          ← KjFieldError
  field-required.ts       ← KjFieldRequired (visually-hidden "(required)" text — optional)
  float-label.ts          ← KjFloatLabel (optional motion directive)
  field.context.ts        ← KjFieldContext + KJ_FIELD token + KJ_FIELD_ERROR_MATCHER token
  field.spec.ts
  index.ts

  // deprecated aliases — keep until v1.0
  form.ts                 ← re-exports KjField as KjFormField, KjFieldLabel as KjFormLabel, KjFieldError as KjFormError; not new code
```

### Shared state — `KjFieldContext`

```ts
export interface KjFieldErrorMatcherFn {
  (
    control: AbstractControl | null,
    parent: FormGroupDirective | NgForm | null,
  ): boolean;
}

export interface KjFieldContext {
  /** The id of the labelled control. Auto-minted when missing. */
  readonly controlId: Signal<string>;
  /** The id of the field's `<label>` element. Useful for `aria-labelledby` on composite controls. */
  readonly labelId: Signal<string | null>;
  /** Whether the registered control's validators include `required`, OR `kjRequired` is set on the field. */
  readonly controlRequired: Signal<boolean>;
  /** Whether the field is currently treated as disabled (control-side OR field-side). */
  readonly controlDisabled: Signal<boolean>;
  /** Whether the registered control is in error state (per the matcher). */
  readonly controlInvalid: Signal<boolean>;
  /** Ordered, deduplicated ids of all visible hints + errors. Re-computed when children register / deregister, when error state changes, when ids change. */
  readonly describedByIds: Signal<readonly string[]>;

  /** Called by the inner control on attach. Provides the control's id (or accepts a minted one), the control's `NgControl`, and the control's `KjFormControl` (when present). Returns the id the control should use. */
  registerControl(args: {
    id: string | null;
    ngControl: NgControl | null;
    formCtrl: KjFormControl | null;
    elementRef: ElementRef<HTMLElement>;
  }): { controlId: Signal<string>; deregister: () => void };

  /** Called by KjFieldHint / KjFieldError on attach. */
  registerDescribedBy(id: string, kind: 'hint' | 'error'): () => void;
}

export const KJ_FIELD = new InjectionToken<KjFieldContext>('KjField');
export const KJ_FIELD_ERROR_MATCHER =
  new InjectionToken<KjFieldErrorMatcherFn>('KjFieldErrorMatcher', {
    factory: () => (ctrl) =>
      !!(ctrl?.invalid && (ctrl?.touched || ctrl?.dirty)),
  });
```

### `KjField` (root, selector `[kjField]`)

```ts
@Directive({
  selector: '[kjField]',
  standalone: true,
  providers: [{ provide: KJ_FIELD, useExisting: KjField }],
  host: {
    '[attr.data-orientation]': 'kjFieldOrientation()',
    '[attr.data-label-position]': 'kjFieldLabelPosition()',
    '[attr.data-required]': 'controlRequired() ? "" : null',
    '[attr.data-invalid]': 'controlInvalid() ? "" : null',
    '[attr.data-disabled]': 'controlDisabled() ? "" : null',
    '(click)': 'onContainerClick($event)',  // no-op unless kjClickToFocus
  },
})
export class KjField implements KjFieldContext { /* … */ }
```

Inputs:

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjFieldOrientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Layout only; reflected as `data-orientation`. |
| `kjFieldLabelPosition` | `'top' \| 'start' \| 'end' \| 'inside'` | `'top'` | Reflected as `data-label-position`. `'inside'` is meaningful only with `KjFloatLabel`. |
| `kjFieldDisabled` | `boolean` | `false` | OR-ed with the inner control's disabled state. |
| `kjFieldRequired` | `boolean \| undefined` | `undefined` | Manual override when there's no `Validators.required` on the bound control (e.g. a custom validator that effectively requires the field). When `undefined`, the field reads from the bound `NgControl`. |
| `kjFieldErrorMatcher` | `KjFieldErrorMatcherFn \| undefined` | `undefined` (uses the `KJ_FIELD_ERROR_MATCHER` token's value) | Per-field override of the global matcher. |
| `kjClickToFocus` | `boolean` | `false` | When `true`, clicks on the field background focus the registered control. |

No outputs. No models — Field doesn't own value.

### `KjFieldLabel` (selector `[kjFieldLabel]`)

```ts
@Directive({
  selector: '[kjFieldLabel]',
  standalone: true,
  host: {
    '[attr.id]': 'labelId()',
    '[attr.for]': 'forAttr()',                   // null when label uses aria-labelledby strategy
    '[attr.data-required]': 'ctx.controlRequired() ? "" : null',
    '[attr.data-disabled]': 'ctx.controlDisabled() ? "" : null',
    '[attr.data-invalid]': 'ctx.controlInvalid() ? "" : null',
  },
})
export class KjFieldLabel { /* … */ }
```

- `labelId` is auto-minted on construction if not set; reflected as
  `[attr.id]`.
- `forAttr` is `ctx.controlId()` when the registered control accepts
  `for=` (native `<input>` / `<select>` / `<textarea>`), else `null`
  (composite controls fall back to `aria-labelledby` from the control
  side).
- The "required" `*` is purely a CSS pseudo-element (`::after`)
  triggered by `[data-required]`; the label string itself is not modified.
  Theme CSS owns the visual.

Input:

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjFieldLabelMode` | `'for' \| 'aria-labelledby' \| 'auto'` | `'auto'` | Force the association strategy when the auto-detection (`<input>`/`<select>`/`<textarea>` → `for=`, else `aria-labelledby`) is wrong. |

### `KjFieldHint` (selector `[kjFieldHint]`)

```ts
@Directive({
  selector: '[kjFieldHint]',
  standalone: true,
  host: {
    '[attr.id]': 'id()',
    '[attr.data-disabled]': 'ctx.controlDisabled() ? "" : null',
    '[attr.data-align]': 'kjFieldHintAlign()',
  },
})
export class KjFieldHint { /* … */ }
```

- Auto-mints `id` on construction.
- Calls `ctx.registerDescribedBy(id, 'hint')` in the constructor;
  deregister via `DestroyRef`.
- No `role`, no `aria-live` — hints are static.

Input:

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjFieldHintAlign` | `'start' \| 'end'` | `'start'` | Mirrors Material's `mat-hint align`; reflected as `data-align` for theme CSS (e.g. character counter on the right). |

### `KjFieldError` (selector `[kjFieldError]`)

```ts
@Directive({
  selector: '[kjFieldError]',
  standalone: true,
  host: {
    'role': 'alert',
    'aria-live': 'polite',
    '[attr.id]': 'id()',
    '[attr.hidden]': '!ctx.controlInvalid() ? "" : null',
    '[attr.data-when]': 'kjFieldErrorWhen()',
  },
})
export class KjFieldError { /* … */ }
```

- Auto-mints `id` on construction.
- Calls `ctx.registerDescribedBy(id, 'error')` in the constructor;
  deregister via `DestroyRef`.
- The `register*` call returns the visibility predicate — when not
  visible, the field's describedby chain filters this id out (so SR
  doesn't read the error message on focus when there's nothing to read).
- `[hidden]` toggles via `ctx.controlInvalid()` AND optionally a
  per-error predicate `kjFieldErrorWhen` (e.g. `'required'`,
  `'pattern'`, or a function `(control) => boolean`).

Input:

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjFieldErrorWhen` | `string \| ((c: AbstractControl) => boolean) \| undefined` | `undefined` | When set to a string, shows only when `control.hasError(name)`. When a function, the function decides. When undefined, shows whenever the matcher reports invalid. Mirrors Material's `<mat-error>`-per-error-name pattern (which Material doesn't have natively — consumers @if it; we make it a built-in input). |

### `KjFieldRequired` (selector `[kjFieldRequired]`)

A purely-textual marker for screen readers — visually hidden. Useful
when a theme wants the visual `*` *and* an audible "(required)" suffix
that's stable across locales. Optional — not always rendered.

```ts
@Directive({
  selector: '[kjFieldRequired]',
  standalone: true,
  hostDirectives: [KjVisuallyHidden],
  host: {
    '[attr.hidden]': '!ctx.controlRequired() ? "" : null',
  },
})
export class KjFieldRequired { /* content is projected, e.g. "(required)" */ }
```

No inputs. Content is projected.

### `KjFloatLabel` (selector `[kjField][kjFloatLabel]`)

```ts
@Directive({
  selector: '[kjField][kjFloatLabel]',
  standalone: true,
  host: {
    '[attr.data-float-label]': 'mode()',  // 'rest' | 'floating'
  },
})
export class KjFloatLabel {
  private ctx = inject(KJ_FIELD);
  // mode = computed(() => ctx.controlFocused() || !ctx.controlEmpty() ? 'floating' : 'rest');
}
```

Adds `data-float-label="rest" | "floating"` to the field root. Themes
do the rest. The directive needs two extra signals on the context —
`controlFocused` and `controlEmpty` — supplied by `KjFormControl` (and
already trivially derivable: `focused` from a focus listener,
`empty` from `value() == null || value() === ''`). Add to
`KjFormControl` as a follow-up.

Input:

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjFloatLabel` | `'auto' \| 'always'` | `'auto'` | `'always'` keeps the label floating regardless of focus / value. Mirrors Material's `floatLabel`. |

### Cross-component pointers

- **`data-input/input.md`** — provides the canonical pattern for the
  inner-control side. The `KjInput` improvements flagged there
  ("auto-mint id", "wire `aria-describedby`", "`aria-required`
  derivation") are **delivered by the Field family in this analysis**.
  Once Field ships, Input's open questions for those items close.
- **`data-input/textarea.md`** — defers `aria-describedby` for hint /
  error to Field. Textarea's character counter id is registered as a
  `KjFieldHint` (with `kjFieldHintAlign="end"`) when the consumer
  composes them; otherwise the wrapper's own counter id participates via
  `KjAriaDescribedBy` directly.
- **`data-input/number-input.md`** — Field wraps the composite. The
  inner `<input>` is the registered control (carries the id). The
  stepper buttons are siblings inside the field, not labelled
  separately. Number Input's analysis should call this out.
- **`data-input/password-input.md`** — strength meter and Caps Lock
  warning each register with the field's describedby chain via their
  own `KjAriaDescribedBy` integration. Password Input's open question
  #9 ("cross-component pointer for `KjField`") closes against this
  analysis.
- **`data-input/input-otp.md`** — open question: which element is the
  registered control? Each cell? The first cell? A wrapping container
  with `role="group"`? **Recommendation:** the wrapping `[kjOtpInput]`
  group registers as the control (so the label `for=` points to the
  group via `aria-labelledby`, not to a single cell). Document in the
  Input OTP analysis when written.
- **`data-input/checkbox.md`, `data-input/radio.md`,
  `data-input/toggle.md`** — Field works unchanged. Radio's *group*
  registers (the `role="radiogroup"` host), not individual radios. Each
  radio's own `<label>` is independent of the field's label.
- **`data-input/select.md`, `data-input/multi-select.md`,
  `data-input/combobox.md`, `data-input/cascade-select.md`,
  `data-input/tree-select.md`** — the trigger registers (the
  `role="combobox"` element). Field's describedby flows onto the
  trigger; the panel is anchored separately and doesn't carry the
  field's describedby.
- **`data-input/slider.md`, `data-input/date-picker.md`,
  `data-input/time-picker.md`, `data-input/color-picker.md`** — same
  pattern as Select. The visible trigger registers; the popout panel
  is anchored separately.
- **`data-input/file-upload.md`** — the drop-zone or the native
  `<input type="file">` registers. Field's hint slot carries the
  "drag a file here, or click to select" instructional text — labels
  that file-upload UIs typically miscode as part of the drop zone.
- **`data-input/form.md`** — Form is a higher-level orchestrator
  (cross-field validators, submit handling, summary errors). Field
  is the per-control wrapper. Form does not subsume Field; Field does
  not subsume Form. Both compose with each other (a Form contains many
  Fields). Form's analysis should document the composition.
- **`a11y/aria-describedby.ts`** — Field uses `KjAriaDescribedBy`
  on the control to apply the composed id list. Field calls
  `kjDescribedBy.set(...)` (or feeds it via `[kjDescribedBy]` from the
  registered control's host) — the directive is reused unchanged.
- **`primitives/forms/form-control.ts`** — Field reads the control's
  `KjFormControl` signals (`disabled`, `value`, `touched`). Field also
  needs two new signals (`focused`, `empty`) for `KjFloatLabel` —
  documented as a follow-up under `KjFormControl`'s open questions.

## Inputs / Outputs / Models — `kj`-prefixed

### `KjField`

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjFieldOrientation` | `input` | `'vertical' \| 'horizontal'` | `'vertical'` | |
| `kjFieldLabelPosition` | `input` | `'top' \| 'start' \| 'end' \| 'inside'` | `'top'` | |
| `kjFieldDisabled` | `input` | `boolean` | `false` | |
| `kjFieldRequired` | `input` | `boolean \| undefined` | `undefined` | Manual override when `Validators.required` isn't used. |
| `kjFieldErrorMatcher` | `input` | `KjFieldErrorMatcherFn \| undefined` | `undefined` | Per-field override of the global `KJ_FIELD_ERROR_MATCHER` token. |
| `kjClickToFocus` | `input` | `boolean` | `false` | |

No outputs, no models.

### `KjFieldLabel`

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjFieldLabelMode` | `input` | `'for' \| 'aria-labelledby' \| 'auto'` | `'auto'` | Forces the association strategy when auto-detection picks the wrong one. |

### `KjFieldHint`

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjFieldHintAlign` | `input` | `'start' \| 'end'` | `'start'` | |

### `KjFieldError`

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjFieldErrorWhen` | `input` | `string \| ((c: AbstractControl) => boolean) \| undefined` | `undefined` | |

### `KjFieldRequired`

No inputs. Content is projected.

### `KjFloatLabel`

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjFloatLabel` | `input` | `'auto' \| 'always'` | `'auto'` | |

All names are `kj`-prefixed per `rules/code_style.md`.

## Examples to ship

Files under `packages/components/src/field/` (styled wrapper) and
core-only equivalents under `packages/core/src/form/` (re-using
existing path while the rename lands).

1. **Default (Input)** — `field.example.ts`. Label + input + hint + one
   error (touched-and-invalid). The canonical "form row" demo.
2. **Multiple errors** — `field.errors.example.ts`. Required and
   pattern errors with `kjFieldErrorWhen="required"` and
   `kjFieldErrorWhen="pattern"`, only one shown at a time.
3. **Hint with counter** — `field.counter.example.ts`. Textarea inside
   the field with a `<span kjFieldHint kjFieldHintAlign="end">` driving
   `{{ value().length }} / 200`.
4. **Floating label** — `field.float-label.example.ts`. Same as
   default but with `[kjFloatLabel]` on the field root. Shows
   rest ↔ floating motion.
5. **Inset top-aligned label** — `field.inset-label.example.ts`.
   `kjFieldLabelPosition="inside"` plus a theme CSS opt-in. Static
   layout, no motion.
6. **Horizontal layout** — `field.horizontal.example.ts`.
   `kjFieldOrientation="horizontal"` for a label-on-the-left form row.
7. **Field with Select** — `field.select.example.ts`. Demonstrates the
   `aria-labelledby` strategy (Select's combobox trigger uses the
   field's label id).
8. **Field with Radio Group** — `field.radio.example.ts`. The
   `role="radiogroup"` host registers as the control; per-radio
   labels remain independent.
9. **Field with Password Input** — `field.password.example.ts`.
   Label + password input + strength meter (registered as a hint) +
   Caps Lock warning + one error. Demonstrates the full describedby
   chain.
10. **Field-level disabled** — `field.disabled.example.ts`.
    `[kjFieldDisabled]="true"` propagating to the control. Compares
    to control-side `kjDisabled`.
11. **Custom error matcher** — `field.matcher.example.ts`. Per-field
    `kjFieldErrorMatcher` showing errors immediately on `dirty`
    instead of `touched`.
12. **Themed (core-only)** — `field.example.ts`,
    `field.retro.example.ts`, `field.finance.example.ts` under
    `packages/core/src/form/`. Demonstrates the headless directives
    work under arbitrary theme CSS.

## Open questions / risks

1. **Renaming `KjFormField` → `KjField`.** Existing spec covers the old
   names; the rename ships with deprecated aliases that re-export the
   new classes under the old selectors. Risk: consumers of the alpha
   API need a migration note. Recommendation: ship aliases with a
   `@deprecated` TSDoc note + console.warn in dev-mode when the old
   selector is used; remove at v1.0.

2. **Detecting the inner control.** Field needs to know which projected
   child is the control. Three options:
   (a) `inject(KJ_FORM_CONTROL_HOST_TOKEN)` — every control providing
       `KjFormControl` also registers itself with the field via a
       host directive that calls `KjField.registerControl(...)`.
   (b) Content-children query: `contentChildren(KjFormControl, ...)` on
       Field, take the first.
   (c) Explicit marker: consumers add `[kjFieldControl]` to the
       control element.
   **Recommendation: (a) plus (c) as escape hatch.** The host
   directive pattern is already how `KjInput` composes `KjFormControl`;
   add a registration call in `KjFormControl`'s constructor that
   walks up to the optional `KJ_FIELD` and registers itself. (b) is
   fragile (queries fire late, and they don't catch directive-only
   controls inside ng-template). (c) covers controls that don't use
   `KjFormControl` (e.g. a third-party CDK control wrapped in a
   field).

3. **Auto-id minting strategy.** Angular's private
   `_IdGenerator` (used by Material) isn't a stable public API. Two
   options:
   (a) Roll our own counter in the field package: `getId('kj-field')`
       returns `'kj-field-1'`, `'kj-field-2'`, ….
   (b) Use `crypto.randomUUID()` on the browser, fall back to a
       counter on SSR.
   **Recommendation: (a)** — Material's approach, deterministic,
   SSR-safe, doesn't fight hydration. Deterministic ids matter for
   SSR id stability between server and client renders.

4. **Order of describedby ids: hints before errors, or errors before
   hints?** Material puts hints first, errors after. Some screen
   readers read describedby in attribute order. Hint-first lets
   sighted users get the hint first when reading; error-first lets
   SR users hear the error first when focusing an invalid field.
   **Recommendation: hints first, errors second.** Matches Material;
   error-first risks the error being read before the user even
   attempts input (which we want for invalid state, but the matcher
   only fires after touch — so by the time errors are visible, the
   user has already engaged the field and the hint is redundant
   anyway). Document explicitly.

5. **`aria-describedby` and SR pacing.** Multi-id describedby chains
   can be long ("First name. Required field. Letters only. Up to
   50 characters."). Some users find this exhausting. Material
   doesn't truncate; we don't either. Document as a guideline:
   keep hints short.

6. **Group-level `kjFieldDisabled` and `Validators.required`.** When
   the field is disabled, the control's `Validators.required` still
   runs (Angular forms don't validate disabled controls — but our
   `kjFieldDisabled` doesn't propagate to the form layer, only to
   the control's display). Recommendation: when `kjFieldDisabled`
   is `true`, also call `control?.disable({ emitEvent: false })` if
   a bound form is present, OR document that `kjFieldDisabled` is
   visual-only and consumers should `.disable()` the form control
   themselves. **Decision: visual-only.** Fighting Angular's forms
   is a losing game. Document.

7. **`KjFloatLabel` requires extra `KjFormControl` signals.**
   `controlFocused` and `controlEmpty` aren't on `KjFormControl`
   today. Adding `focused` is straightforward (focus / blur
   listeners). `empty` is `value() == null || value() === ''` — but
   "empty" means different things for different controls (a Select
   with a placeholder option chosen, a Date Picker with `null`, a
   Number Input with `0`). Make `empty` overridable on the control
   side: `KjFormControl` exposes a `customEmpty?: () => boolean`
   slot the host directive can fill. Default is the simple
   string/null check.

8. **Multiple labels.** PrimeNG's `<p-floatLabel>` allows one
   label; Material allows one `<mat-label>`. Should `KjField` allow
   more than one? **Recommendation: no.** A single label is the
   accessibility contract; multiple labels create ambiguity for SR.
   Throw a dev-mode warning if `>1` is detected.

9. **Multiple controls in a single field (e.g. range slider with
   two thumbs, date range with start + end).** Material puts both
   inputs inside one `<mat-form-field>` and labels them collectively.
   Recommendation: same — first registered control receives `for=`,
   subsequent controls fall back to `aria-labelledby` from the
   field's label id. Each can carry its own additional `aria-label`
   ("Start date", "End date") for SR distinction. Document under
   Slider / Date Range Picker analyses.

10. **Click-to-focus and composite controls.** When `kjClickToFocus`
    is on and the inner control is a Select trigger, clicking the
    field's whitespace should open the dropdown? Or just focus the
    trigger? **Recommendation: focus only.** Opening on whitespace
    click is surprising. Document.

11. **Theming the required `*`.** The visual indicator is rendered
    via theme CSS `::after` against `[data-required]` on the label.
    Themes that want `(required)` text instead of `*` should compose
    `<span kjFieldRequired>(required)</span>` and CSS-hide the
    pseudo-element. Document in the field-token spec.

12. **`prefers-reduced-motion` and floating label.** The motion is
    implemented in theme CSS via transitions on `data-float-label`
    state changes. Themes must add a `@media (prefers-reduced-motion:
    reduce) { transition: none; }` guard. Document as a hard
    requirement in the float-label token spec; lint rule if
    feasible.

13. **`KJ_FIELD_ERROR_MATCHER` token's default and Angular's
    `FormGroupDirective` / `NgForm` for "submitted" awareness.**
    Material's matcher takes the parent form as the second arg so
    consumers can match on `submitted`. Our default doesn't —
    `(ctrl) => ctrl?.invalid && (ctrl?.touched || ctrl?.dirty)`.
    Make the matcher take both args (`(ctrl, parent)`) and have the
    field inject the optional parent (`FormGroupDirective` /
    `NgForm`) for forwarding. Recommendation: yes, ship the
    two-arg signature even though the default doesn't use the
    second arg — it's the right shape and matches Material exactly.
    Already reflected in the type above.

14. **SSR.** Field's `data-*` reflections are signal-driven — safe.
    Id minting via a counter is stable across server / client
    given a single-pass render. `KjFloatLabel` reads `controlFocused`
    which is `false` until hydration — at-rest is the SSR-stable
    state, no flicker if the theme's CSS transitions only kick in
    on `data-float-label` state changes (i.e. transition:
    `data-float-label` → `transform`, not `:focus` → `transform`).
    Verify in the SSR app.

15. **What happens when no Angular form is bound?** The control may
    have no `NgControl` — just a static `[value]` and no validators.
    In that case `controlRequired` falls back to `kjFieldRequired`
    (the manual input), `controlInvalid` falls back to the inner
    control's `kjInvalid` input via context, and the matcher
    receives `null` (matchers must handle null). Document and
    guard in the matcher's default.

16. **"Required" without `Validators.required`.** Some validators
    are conceptually "required" without using `Validators.required`
    (e.g. a custom validator that fails on blank input). Field
    can't auto-detect that. The `kjFieldRequired` manual override
    exists exactly for this. Document as the primary use-case for
    the override.
