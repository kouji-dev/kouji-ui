# Input

Reference architecture for the kouji-ui Input — the foundational text-entry control.
**Already shipped:** headless `KjInput` directive
(`packages/core/src/input/input.ts`) and styled wrapper `KjInputComponent`
(`packages/components/src/input/input.ts`). This document captures the existing
shape, flags concrete improvements informed by the source comparison, and acts
as the reference architecture every other text-shaped form control
(`KjNumberInput`, `KjPasswordInput`, `KjSearchInput`, `KjMaskInput`, `KjOtpInput`,
`KjTextarea`) should mirror.

## Source comparison

- **PrimeNG** — [primeng.org/inputtext](https://primeng.org/inputtext). A single
  attribute directive `pInputText` applied to a native `<input type="text">`.
  No flat prop surface — styling is opt-in via `pSize` (`small` / `large`),
  `[invalid]` (boolean), `[fluid]` (full width), and the `variant` token
  (`outlined` / `filled`) consumed from a global theme config. Form integration
  is delegated entirely to Angular's native `[(ngModel)]` / `[formControl]` on
  the underlying `<input>` — `pInputText` itself has no CVA. Errors,
  prefix/suffix, helper text, floating label, and clear-button live in
  **separate** companion components: `IconField` + `InputIcon`, `InputGroup` +
  `InputGroupAddon`, `IftaLabel`, `FloatLabel`, `Message`. PrimeNG ships
  `Password`, `InputNumber`, `InputMask`, `InputOtp`, `KeyFilter`, `Knob`,
  `Textarea`, `AutoComplete` as separate components — `InputText` is the
  type=text base only.
- **Angular Material** — [material.angular.dev/components/input](https://material.angular.dev/components/input).
  Two pieces: `matInput` (attribute directive on `<input>` or `<textarea>`)
  *must* be wrapped in `<mat-form-field>`, which owns label / outline /
  underline / hint / error display and `floatLabel`. `matInput` itself wires
  `errorState`, `aria-invalid`, `aria-describedby` to the form-field's hint
  ids, and `aria-required`. Disabled state respects both the native `disabled`
  attribute and the reactive-form disabled flag (via `setDisabledState`).
  Type variants (`text`, `email`, `password`, `number`, `tel`, `url`, `search`,
  `date`, `datetime-local`, `month`, `time`, `week`) are all valid on `matInput`
  except `file`, `radio`, `checkbox`, `submit`, `reset`, `image`, `button`.
  Material does not offer prefix/suffix on the input directive itself —
  `<mat-form-field>` projects `matPrefix` / `matSuffix` slots.
- **shadcn/ui** — [ui.shadcn.com/docs/components/input](https://ui.shadcn.com/docs/components/input).
  A thin React component over `<input>` with Tailwind classes. No variants, no
  sizes, no built-in error / label / icon. Composition is the user's job:
  pair it with `<Label>`, `<FormMessage>` (from `react-hook-form`), or wrap in
  a div with leading/trailing icons. This is intentional — the recipe is "just
  styled native input" and everything else is a sibling component the consumer
  composes.

**Pattern picked up.** kouji's existing `KjInput` is closest to PrimeNG's
`pInputText` shape (attribute directive on a native `<input>`), but with
PrimeNG-style separation of error / label / wrapper concerns into sibling
directives (`KjFormField`, future `KjInputGroup`). Form integration is
hand-wired via the shared `KjFormControl` primitive — same role Material's
`MatFormFieldControl` plays, but lifted into a generic `ControlValueAccessor`
host directive so the same machinery powers checkbox / radio / select / toggle
without per-control duplication.

## Decision: needs a core directive?

**Yes — already shipped, and this is the canonical example for every text-shaped
form control.** The directive owns five contracts worth sharing across themes
and across siblings (`KjNumberInput`, `KjPasswordInput`, `KjSearchInput`,
`KjMaskInput`, `KjOtpInput`, `KjTextarea`):

1. **`ControlValueAccessor` plumbing** via composed `KjFormControl`. One place
   implements `writeValue` / `registerOnChange` / `registerOnTouched` /
   `setDisabledState` for *every* form input in the library. `KjInput` only
   wires the two host events that bridge native DOM to the CVA (`(input)` →
   `notifyChange`, `(blur)` → `notifyTouched`).
2. **Touched-aware invalid state.** `aria-invalid` is *only* set when both
   `kjInvalid()` is true **and** the control has been touched. This matches
   Material's `errorState` semantics and avoids the "screams red on first
   render" anti-pattern.
3. **ARIA-disabled, not native `disabled`.** Same WCAG 2.1 AAA stance as
   `KjButton` — the directive reflects `disabled` via the
   `KjFormControl.disabled()` signal, but it currently writes the native
   `disabled` attribute (see `host: '[attr.disabled]'`). **Improvement flagged
   below** — the kouji house style is ARIA-disabled with the element kept
   focusable.
4. **Value reflection from form model → DOM.** When a `[formControl]` /
   `[(ngModel)]` is wired, the `effect()` in `KjInput` writes the latest
   form value back to the native `<input>.value`. The skip-when-null guard
   preserves any template-bound `[value]="…"` when no Angular form binding is
   present — important for the wrapper (`<kj-input [value]="…">`) and for
   uncontrolled usage.
5. **Focus-visible signal** via composed `KjFocusRing` — keyboard-only focus
   ring, no mouse-click halo.

Items 1, 2, 4, 5 are cross-cutting form-input behavior; item 3 is policy. None
of this is theme-specific styling, so a directive is correct, and every sibling
text input should compose `KjInput` rather than re-implement the wiring.

## Base features

- **Variants** — *not yet integrated.* The wrapper today exposes only
  `type` / `value` / `placeholder` / `invalid` / `disabled`. Improvement
  below: integrate `KjVariant` (e.g. `default`, `filled`, `ghost`,
  `destructive`) via `hostDirectives`, with preset binding via a new
  `KJ_INPUT_CONFIG` token following the `KjButton` pattern exactly.
- **Sizes** — *not yet integrated.* Same story: integrate `KjSize`
  (e.g. `sm`, `md`, `lg`) via `hostDirectives` and `bindPresets(KJ_INPUT_CONFIG)`.
  WCAG 2.5.5 (44×44 touch target) drives the `md` minimum.
- **Type variants (single component)** — `text`, `email`, `url`, `tel`,
  `search`, `color` are all owned by `KjInput` / `KjInputComponent`. The
  `KjInputType` union in the wrapper currently also lists `password` and
  `number` for convenience, but per the roadmap those ship as **separate
  sibling components** (`KjPasswordInput`, `KjNumberInput`) because their
  full feature set (visibility toggle, strength meter, step controls,
  decimal locale handling) goes beyond `[type=password]` / `[type=number]`.
  See **Open questions** for the recommended split.
- **States** — `kjInvalid` (touched-gated), `kjDisabled` (forwarded to
  `KjDisabled` primitive + reflected via `KjFormControl.disabled()`),
  `kjReadonly` (improvement — not yet present).
- **Slots** — none on the directive itself. Prefix / suffix / leading icon /
  trailing icon / clear button live in the future
  **`KjInputGroup`** sibling (cross-reference `data-input/input-group.md`).
  This matches PrimeNG's split (`InputGroup` is its own component) and keeps
  `KjInput` as a leaf attribute directive.
- **Label & error** — never owned by `KjInput`. The wrapper component
  (`KjFormField` + `KjFormLabel` + `KjFormError`) provides those slots; see
  cross-reference to **`data-input/field.md`**.

## Accessibility (WCAG 2.1 AAA)

| Concern | Where | Mechanism |
|---|---|---|
| **Role** | DOM | Native `<input>` element. No explicit `role` — rely on the underlying element's implicit role. |
| **Label association** | consumer / `KjFormField` | `<label for="id">` to the input's `id`, **or** wrap in `<div kjFormField>` with `<label kjFormLabel for="…">`. The directive does not auto-generate ids — it requires the caller (or the `KjFormField` wrapper) to provide one. **Improvement:** auto-mint an id when missing and wire `aria-labelledby` from the field's label. See **Open questions**. |
| **`aria-invalid`** | core directive | `[attr.aria-invalid]="formCtrl.touched() && kjInvalid() ? 'true' : null"`. Only after blur — matches Material's `errorState`. |
| **`data-invalid`** | core directive | Hook for CSS state styling. |
| **`aria-describedby`** | (gap) | Currently the directive does **not** wire `aria-describedby` to error or hint text. `KjFormField` / `KjFormError` would need to register their ids with the directive (signal-context). **Improvement flagged below.** |
| **`aria-required`** | (gap) | Not auto-derived from the `Validators.required` reactive validator. Material does this; we should too. **Improvement.** |
| **`aria-disabled` vs native `disabled`** | core directive | Today writes native `disabled` (`[attr.disabled]`) — this *removes the input from the tab order*, which conflicts with the kouji AAA stance used by `KjButton` (always focusable). **Improvement:** switch to `aria-disabled` + `data-disabled` and intercept input/keydown in the capture phase, mirroring Button. Or — **explicit policy split**: text inputs honor native `disabled` because there's no equivalent of "discoverable but blocked" for free-text entry (a focused disabled input is just confusing). Pick one and document; current code lands halfway. |
| **`aria-readonly`** | (gap) | No `kjReadonly` input today. `<input readonly>` already does the right thing semantically; the wrapper should expose it for completeness and `data-readonly` for styling. |
| **Keyboard contract** | native | Inherited from `<input>`: all printable keys, navigation keys, copy/paste/cut, IME composition. No custom handlers — correct. Browser handles everything. |
| **Focus-visible** | core directive (host) | `KjFocusRing` composed via `hostDirectives`; `data-focus-visible` attribute on keyboard focus. CSS targets `:focus-visible` for the outline (see `input.css`). |
| **Focus management** | n/a | Inputs don't move focus — they receive it. Nothing to manage. |
| **Touch target ≥ 44×44** | wrapper CSS | `md` size must produce ≥ 2.75rem block-size after padding. Today the wrapper's CSS uses `--kj-space-sm` vertical padding which at `--kj-text-sm` line-height yields ~2.4rem — **borderline**. After the `KjSize` integration, the `md` preset must be tuned to clear 44px. |
| **Color/contrast** | themes layer | `--kj-color-base-100` / `--kj-color-base-content` token pairs are theme-tuned for ≥7:1; placeholder uses `--kj-color-neutral` which themes guarantee at ≥ 4.5:1 (placeholders are non-essential per WCAG 1.4.3). |
| **`type=color` swatch a11y** | wrapper CSS | The `[type="color"]` block in `input.css` reduces the input to a 44×32 swatch. **44×32 violates 2.5.5 (AAA target ≥ 44×44).** **Improvement:** bump `block-size` to 44px or document an opt-out. |
| **Error announcement** | `KjFormError` | The error wrapper sets `role="alert"` and `aria-live="polite"` so screen readers announce when a message becomes visible. The input itself does not need to announce — `aria-describedby` linkage is enough once wired. |

**Where it lives.** `aria-invalid` / `data-invalid` is on the **core directive**.
Label association, `aria-describedby` linkage, and error-message rendering are
on the **`KjFormField`** wrapper. `aria-required` derivation is **proposed** to
live on the directive (it can `inject(NgControl, { optional: true })` to read
the validator). The wrapper component (`<kj-input>`) only forwards inputs and
sets `data-type`.

## Composition model

**Single root attribute directive (`KjInput`).** No children — Input is a leaf
control. Existing primitives are composed through `hostDirectives`:

```ts
hostDirectives: [
  { directive: KjDisabled,    inputs: ['kjDisabled'] },
  KjFocusRing,
  KjFormControl,
],
```

- `KjDisabled` — reflects `aria-disabled` / `data-disabled` from the
  `kjDisabled` input. Note: `KjInput` *also* writes native `[attr.disabled]`
  from `formCtrl.disabled()`, so the two paths coexist today (one for input
  binding, one for forms). See **Open questions** for unifying these.
- `KjFocusRing` — keyboard-only `data-focus-visible` signal.
- `KjFormControl` — the shared `ControlValueAccessor` primitive that wires
  Angular reactive / template-driven forms. Provides the `value()`,
  `disabled()`, `touched()` signals consumed by the host bindings.

**Proposed additions** (mirroring `KjButton`):

```ts
hostDirectives: [
  { directive: KjVariant, inputs: ['kjVariant'] },
  { directive: KjSize,    inputs: ['kjSize'] },
  { directive: KjDisabled, inputs: ['kjDisabled'] },
  KjFocusRing,
  KjFormControl,
],
providers: [...bindPresets(KJ_INPUT_CONFIG)],
```

…with a new `KJ_INPUT_CONFIG` token + `provideKjInput()` helper exactly mirroring
`KJ_BUTTON_CONFIG` / `provideKjButton()`. Default presets:

```ts
KJ_INPUT_DEFAULTS = {
  variants: ['default', 'filled', 'ghost', 'destructive'],
  sizes:    ['sm', 'md', 'lg'],
  defaults: { variant: 'default', size: 'md' },
}
```

**No injection-token context on `KjInput` itself.** Input is a leaf — no
parent/child relationship to mediate. `KjFormField` *does* expose a context
(`KJ_FORM_FIELD`) that `KjFormLabel` / `KjFormError` consume, and a future
improvement is for `KjInput` to optionally inject `KJ_FORM_FIELD` to register
its own id (so the field can drive `for=` / `aria-describedby` from the input
side rather than requiring callers to wire ids by hand).

**Cross-component pointers:**

- **`data-input/field.md`** (`KjFormField` / `KjFormLabel` / `KjFormError`) —
  the label + error wrapper. `KjInput` is meant to slot inside it. Already
  shipped at `packages/core/src/form/form.ts`. The bidirectional id wiring
  improvement (input registers its id with the field, field provides
  `aria-describedby` ids back) is the most important cross-cut.
- **`data-input/input-group.md`** (proposed `KjInputGroup`) — owns prefix /
  suffix / leading icon / trailing icon / clear button slots. `KjInput` does
  *not* render slots itself; consumers compose by placing `KjInput` inside an
  `<div kjInputGroup>`. Mirrors PrimeNG's `InputGroup` + `InputGroupAddon`
  split.
- **`data-input/number-input.md`** — separate component (`KjNumberInput`),
  but its core directive should compose `KjInput` (or share the same primitives
  set) so form wiring, focus ring, and disabled handling are identical.
  Adds: `min` / `max` / `step` / locale-aware decimal handling / spin buttons.
- **`data-input/password-input.md`** — separate component. Composes `KjInput`
  for the underlying field; adds visibility-toggle button and (optional)
  strength meter. The toggle is a `KjButton kjVariant="ghost" kjSize="icon"`
  inside an `KjInputGroup` suffix slot.
- **`data-input/mask-input.md`** — separate component (`KjMaskInput`).
  Composes `KjInput`; adds masking logic (date / phone / credit card formats).
  Same form wiring, same a11y.
- **`data-input/otp-input.md`** — separate component (`KjOtpInput`). Multi-cell
  one-time-code entry; each cell is a `KjInput` with `inputmode="numeric"`,
  coordinated by a parent context. Auto-advance + paste-distribute logic
  belongs in the parent.
- **`data-input/textarea.md`** — sibling component (`KjTextarea`). Identical
  composition (`KjFormControl` + `KjFocusRing` + `KjDisabled` + `KjVariant` +
  `KjSize`), just on a `<textarea>` element. The current `KjInput` selector
  `[kjInput]` is `<input>`-shaped (the value-reflection effect writes to
  `el.nativeElement.value` which works for both, but the docstring example
  hard-codes `<input>`); a sibling `[kjTextarea]` with the same body is
  cleaner than overloading the same selector.
- **`data-input/search-input.md`** — *not* a separate component; just
  `<kj-input type="search">` with an `KjInputGroup` providing a leading magnifier
  icon and a trailing clear button. Documented as a recipe, not a component.
- **`actions/button.md`** — `KjInput`'s a11y improvements (capture-phase
  intercept of disabled interactions, ARIA-disabled stance, `KjVariant` /
  `KjSize` integration, preset config token + `provide…` helper) are
  copy-paste-from-Button. Use `actions/button.md` as the implementation
  reference.

## Inputs / Outputs / Models — `kj`-prefixed

### Core directive (`KjInput`, selector `[kjInput]`)

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjInvalid` | `input<boolean>(false)` | `false` | Reflects `aria-invalid` / `data-invalid` only when `formCtrl.touched()` is true. |
| `kjDisabled` | forwarded via `hostDirectives` to `KjDisabled` | `false` | Reflects `aria-disabled` / `data-disabled`. Today *also* triggers native `disabled` via `formCtrl.disabled()` — see **Open questions**. |
| `kjVariant` | *(proposed)* forwarded to `KjVariant` | `'default'` (from `KJ_INPUT_CONFIG`) | Validated against preset list. |
| `kjSize` | *(proposed)* forwarded to `KjSize` | `'md'` (from `KJ_INPUT_CONFIG`) | Validated against preset list. |
| `kjReadonly` | *(proposed)* `input<boolean>(false)` | `false` | Reflects native `readonly` + `data-readonly`. |

Bidirectional value flow goes through `KjFormControl`'s
`value` / `notifyChange` / `notifyTouched` — there is **no `kjValue` / `kjValueChange`
on the directive**. Callers use `[(ngModel)]` or `[formControl]` exactly as they
would for a native `<input>`. This is intentional and matches PrimeNG /
Material — it preserves the full Angular forms surface (validators, async
validators, value transformers, status changes) without re-inventing it.

### Wrapper component (`KjInputComponent`, selector `kj-input`)

Re-exposes the directive's surface plus structural props:

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjType` | `input<KjInputType>('text')` *(currently `type` — improvement: rename to `kjType`)* | `'text'` | Bound to native `<input [type]>`. Today the wrapper also lists `'password'` and `'number'` in its union — recommend dropping those once dedicated components ship. |
| `kjValue` | `input<string>('')` *(currently `value`)* | `''` | Forwarded to native `[value]`. Use `[(ngModel)]` / `[formControl]` for bidirectional. |
| `kjPlaceholder` | `input<string>('')` *(currently `placeholder`)* | `''` | Forwarded. |
| `kjInvalid` | `input(false)` *(currently `invalid`)* | `false` | Forwarded to `KjInput.kjInvalid`. |
| `kjDisabled` | `input(false)` *(currently `disabled`)* | `false` | Forwarded to `KjInput`'s `KjDisabled`. |
| `kjVariant` | *(proposed)* | `'default'` | Forwarded. |
| `kjSize` | *(proposed)* | `'md'` | Forwarded. |
| `kjReadonly` | *(proposed)* `input(false)` | `false` | Forwarded. |
| `kjAriaLabel` | *(proposed)* `input<string \| undefined>(undefined)` | `undefined` | For when there is no associated `<label>` — required when no `KjFormField` parent and no external `aria-labelledby`. |

**Existing wrapper inputs are NOT `kj`-prefixed** (`type`, `value`, `placeholder`,
`invalid`, `disabled`). Per `rules/code_style.md` §"Inputs, Outputs, and Models —
`kj` prefix is mandatory", these names violate the rule. Renaming them is a
breaking change (they are exercised by the existing spec at
`packages/components/src/input/input.spec.ts`). **Improvement flagged.**

All `kj`-prefixed names follow shape (A) — property name carries the prefix —
since the directive selector already starts with `kj`.

## Examples to ship

Match the structure under `packages/components/src/button/`:

1. **Default** — `input.example.ts` *(exists)*. One input, all defaults.
2. **Variants** — `input.variants.example.ts` *(new)*. `default`, `filled`,
   `ghost`, `destructive` side-by-side. Depends on `KjVariant` integration.
3. **Sizes** — `input.sizes.example.ts` *(new)*. `sm`, `md`, `lg`.
4. **Reactive form** — `input.reactive.example.ts` *(new — promote the
   inline reactive-form example from the directive's `@doc` block to a real
   file)*. Email validator, error message via `KjFormError`, touched-gated
   invalid styling.
5. **Template-driven form** — `input.ngmodel.example.ts` *(new)*. Same as
   above with `[(ngModel)]` and template `#name="ngModel"`.
6. **Disabled / readonly** — `input.disabled.example.ts` *(new)*. Both
   `kjDisabled` (input prop) and `formCtrl.disable()` (forms-driven) shown.
7. **Color** — `input.color.example.ts` *(exists)*. `<kj-input type="color">`
   with bound signal.
8. **In a field** — `input.field.example.ts` *(new)*. Input wrapped in
   `<div kjFormField>` with `<label kjFormLabel>` and `<span kjFormError>` —
   demonstrates the canonical label + error composition.
9. **In an input group (recipe)** — `input.group.example.ts` *(new, gated on
   `KjInputGroup` shipping)*. Leading icon + trailing clear button.
10. **Configured presets** — `input.configured.example.ts` *(new)*. Extends
    the variant list with `brand` via `provideKjInput`.

## Open questions / risks

- **`kj` prefix on the wrapper inputs.** Currently `type`, `value`,
  `placeholder`, `invalid`, `disabled` — should be `kjType`, `kjValue`,
  `kjPlaceholder`, `kjInvalid`, `kjDisabled` per `rules/code_style.md`.
  This is a breaking change but the rule is clear; do it before more sibling
  inputs (`KjPasswordInput`, `KjNumberInput`, …) crystallize the wrong shape.
- **`KjVariant` + `KjSize` integration.** The headless directive does not
  compose them yet, so themes can't drive variant/size from `data-variant` /
  `data-size`. Add via `hostDirectives` and `bindPresets(KJ_INPUT_CONFIG)`,
  copy-paste-from-`KjButton`. Decide variant set: PrimeNG ships `outlined` /
  `filled`; Material ships `outline` / `fill` (form-field-level); shadcn ships
  one. Recommend `default` / `filled` / `ghost` / `destructive` to align with
  Button.
- **ARIA-disabled vs native `disabled` policy.** Button uses ARIA-disabled
  with focus retained; Input today uses native `disabled` (which removes from
  tab order). The codebase is inconsistent. Recommendation: **keep native
  `disabled` for free-text inputs** — a focused-but-blocked text field has no
  meaningful affordance — but document the policy split explicitly so future
  contributors don't "fix" it the wrong way. Update the directive to *not*
  also set `aria-disabled` (the `KjDisabled` host directive does), or to set
  one consistently with which path was used.
- **`aria-required` derivation.** Material auto-derives it from
  `Validators.required`. We can do the same by injecting
  `NgControl, { optional: true, self: true }` and reading
  `control?.hasValidator(Validators.required)` in an `effect`. Cheap, removes
  a class of "I added required but forgot the aria" bugs.
- **`aria-describedby` wiring with `KjFormField` / `KjFormError`.** Today
  errors render but the input doesn't reference them. The clean fix is for
  `KjFormError` to `inject(KJ_FORM_FIELD)` and *register* its host id with the
  field's context, and `KjInput` to *also* inject `KJ_FORM_FIELD` (optional)
  and reflect a computed `aria-describedby` from the field's registered ids.
  Belongs in the **Field** analysis (`data-input/field.md`).
- **Auto id minting.** When neither `id` nor `aria-label` nor
  `aria-labelledby` is set, the directive should mint an id (using
  Angular's `_IdGenerator` or a simple counter), assign it to the host,
  and surface it on `KJ_FORM_FIELD` so the label can use it as `for=`.
  Material does this — it removes the easiest-to-miss a11y bug.
- **Type variants vs separate components.** `KjInputType` currently includes
  `'password'` and `'number'`. The roadmap says those are separate components
  with extra UI (visibility toggle, spin controls). **Recommendation:** drop
  `'password'` and `'number'` from the `KjInputType` union once
  `KjPasswordInput` / `KjNumberInput` ship. Keep `'text'`, `'email'`, `'url'`,
  `'tel'`, `'search'`, `'color'` — they're behaviourally indistinguishable
  from `text` modulo browser keyboard / autocomplete hints, and don't warrant
  separate components.
- **`type=color` 44×32 swatch.** Below WCAG 2.5.5 AAA target (44×44). Either
  bump `block-size` to 44px or split `KjColorInput` into its own component
  with a richer picker. Cheap fix: 44×44.
- **`KjFormControl` value type is `unknown`.** `KjInput` casts it to a string
  via the effect (`String(val)`). For `type=number` this loses precision /
  meaning — but `type=number` is a separate component anyway. For
  `type=date` / `type=time`, native `<input>.value` is always a string
  formatted per the spec, so the cast is correct. Document the contract:
  `KjInput.formCtrl.value` is treated as `string | null | undefined`.
- **Selector overload for `<textarea>`.** The current
  `[kjInput]` directive technically attaches to `<textarea>` too (the value
  reflection still works — `el.nativeElement.value` is on
  `HTMLInputElement | HTMLTextAreaElement`). Still: ship a separate
  `[kjTextarea]` directive with the same body for clarity, type narrowing,
  and so the docstring's `<input>` example doesn't lie. Or generalize: rename
  the union of behaviour to `KjTextField` and have `[kjInput]` /
  `[kjTextarea]` as thin selectors over the same class. Mirrors Material's
  `matInput` (works on both) — but Material also lies in its docs. Pick a
  side and document.
- **IME composition events.** `(input)` fires on every IME composition
  intermediate value, which can spam `notifyChange` and pollute reactive-form
  histories. Consider switching to `compositionend` + `input` with a
  composition guard, or making it configurable. Material handles this
  (see `MAT_INPUT_VALUE_ACCESSOR`). Low priority — most validators don't
  care — but worth a follow-up.
- **`(change)` vs `(input)`.** We listen to `(input)` for live updates. This
  is correct for reactive forms with `updateOn: 'change'` (default), but
  callers using `updateOn: 'blur'` will only see updates on blur from the
  CVA layer anyway, so this is fine. Document.
- **SSR.** `KjFocusRing` already gates on `isPlatformBrowser`. `KjInput`'s
  `effect()` writes to `el.nativeElement.value` — safe under SSR because
  `effect` runs in the browser only after hydration. Confirm with an SSR
  smoke test in the apps workspace.
- **Loading state.** PrimeNG ships `[loading]` on `pInputText` (renders an
  inline spinner). We don't, and it's not obviously useful for a text input
  (where would you put it?). Defer until `KjInputGroup` lands — at that
  point a loading spinner is just a `KjSpinner` in the suffix slot.
