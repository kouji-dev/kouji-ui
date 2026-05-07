# Number Input

A **Number Input** is a stepped numeric entry: a text field paired with
increment / decrement buttons, bounded by `min` / `max` / `step`, with
optional locale-aware display formatting (thousands separator, decimal
separator, currency / percent / unit prefixes).

This file resolves four design questions that thread through every design
decision:

1. **Composition.** One root directive on the input, or a directive family
   (`KjNumberInput` on the field plus `[kjNumberStepper]` directives on the
   buttons)? — see [Decision](#decision-core-directive).
2. **Native `type="number"` vs. `type="text"` with masked input.** —
   see [Base features → Underlying input mode](#underlying-input-mode).
3. **Locale formatting.** `Intl.NumberFormat` for thousands separators and
   decimal point per locale, with display-vs-edit format swap on focus.
4. **Auto-repeat on long-press.** The stepper buttons must accelerate when
   held — the canonical native-input gap shadcn and Material both leave to
   the consumer.

## Source comparison

### PrimeNG — `<p-inputNumber>`

PrimeNG's `<p-inputNumber>` (<https://primeng.org/inputnumber>) is the
fullest first-class number input in the three reference libraries. It is a
**single component** that renders an internal `<input type="text">` plus
optional stepper buttons; the value model is `number | null` while the
display value is a formatted string driven by `Intl.NumberFormat`.

Public API surface (PrimeNG 17/18):

| Input                       | Notes                                                                           |
| --------------------------- | ------------------------------------------------------------------------------- |
| `mode`                      | `'decimal' \| 'currency'`. `'currency'` enables `currency` / `currencyDisplay`. |
| `locale`                    | BCP-47 tag (`'en-US'`, `'de-DE'`, …). Drives `Intl.NumberFormat`.               |
| `localeMatcher`             | `'best fit' \| 'lookup'`. Forwarded to `Intl.NumberFormat`.                     |
| `currency` / `currencyDisplay` | Currency mode only. ISO 4217 + `'symbol' \| 'code' \| 'name'`.               |
| `useGrouping`               | Thousands separator on/off.                                                      |
| `minFractionDigits` / `maxFractionDigits` | Decimal precision.                                                  |
| `prefix` / `suffix`         | Static strings rendered inside the input (e.g. `'$'`, `' kg'`).                  |
| `min` / `max`               | Numeric bounds. PrimeNG clamps on commit (blur), not on type.                    |
| `step`                      | Increment value (default `1`). Decimal-aware (`0.1`, `0.01`).                    |
| `showButtons`               | Render the stepper buttons.                                                      |
| `buttonLayout`              | `'stacked' \| 'horizontal' \| 'vertical'`. Layout of the two buttons.            |
| `incrementButtonClass` / `decrementButtonClass` / `incrementButtonIcon` / `decrementButtonIcon` | Styling escape hatches. |
| `allowEmpty`                | Whether empty input commits as `null` (vs. snapping to `min`).                   |
| `inputId` / `name`          | Forwarded to the internal `<input>`.                                              |
| `inputStyle` / `inputStyleClass` / `style` / `styleClass` | Per-DOM-target styling. (PrimeNG flat-prop pattern.) |
| `placeholder`               | Forwarded to the internal `<input>`.                                              |
| `size` / `maxlength` / `tabindex` | HTML attribute pass-through.                                                |
| `readonly` / `disabled`     | State.                                                                            |
| `required` / `autofocus`    | Form / focus.                                                                     |
| `ariaLabel` / `ariaLabelledBy` | Accessible name for the internal `<input>`.                                  |

| Output / model              | Notes                                                                            |
| --------------------------- | -------------------------------------------------------------------------------- |
| `ngModel` / `formControl`   | `number \| null`.                                                                 |
| `onInput`                   | Emits each keystroke `{ originalEvent, value }`.                                 |
| `onBlur` / `onFocus` / `onKeyDown` | DOM passthroughs.                                                          |
| `onClear`                   | Fires when the field is cleared.                                                  |

Behaviour worth lifting:

- **Single component, internal masking.** The component owns the
  text-mask: it intercepts `keydown` / `paste` / `input` to enforce digits,
  separators, sign, and decimal points before the formatted string ever
  reaches the model. The public model stays a clean `number | null`.
- **Display-vs-edit format swap.** On focus, PrimeNG strips group
  separators and currency symbols so the user types raw digits; on blur,
  it re-applies `Intl.NumberFormat`. This is the right default — typing
  `"1,234"` in the field is hostile in `de-DE` where the same string means
  `1.234`.
- **`min` / `max` clamping policy.** PrimeNG clamps on commit (blur and
  stepper press), not while typing. Lets users type `"-"` and `"5"` and
  arrive at `-5` without the input snapping to `min` mid-typing.
- **`allowEmpty`.** Differentiates "user cleared the field" (`null`) from
  "user wants 0" — matches Angular's `FormControl<number | null>` shape.
- **Stepper buttons inside the field.** PrimeNG renders the two buttons as
  part of the same component, with `buttonLayout` controlling whether they
  stack vertically (default — common for spinboxes), or sit horizontally on
  either side (`horizontal`).

Critique:

- **Flat prop surface (~30 inputs on one component).** Currency, locale,
  buttons, layout, prefix/suffix, formatting limits, ARIA, native HTML
  attributes are all on the same component. Same complaint we level at
  PrimeNG elsewhere — kouji prefers directive composition over wide flat
  surfaces, and the field naturally splits along input vs. stepper-buttons
  vs. layout shell.
- **No `role="spinbutton"`.** PrimeNG sticks to the implicit
  `role="textbox"` of `<input type="text">`. The WAI-ARIA Spinbutton
  pattern (<https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/>) is the
  correct reference and prescribes `role="spinbutton"` plus
  `aria-valuemin` / `aria-valuemax` / `aria-valuenow` / `aria-valuetext`
  on the input — PrimeNG sets none of these. AT users get "edit" instead
  of "spinbutton, 5, minimum 0, maximum 10". This is the most concrete a11y
  improvement kouji should ship.
- **No long-press auto-repeat acceleration.** PrimeNG repeats on hold but at
  a constant rate; spinboxes typically accelerate after ~500ms. Minor.
- **No `PageUp` / `PageDown` for larger steps.** APG Spinbutton recommends
  Page-keys for a "big step" (10× by default). PrimeNG ignores them.
- **Increment button `type` defaults to `<button>` without `type="button"`**
  in some templates, which means a stepper press inside a `<form>` can
  submit the form. Easy bug to ship and easy to miss. We bake
  `type="button"` into the stepper directive.

### Angular Material — **no first-class number input**

Material does not ship a number-input component
(<https://material.angular.dev/components/input>). Consumers do:

```html
<mat-form-field>
  <mat-label>Quantity</mat-label>
  <input matInput type="number" [(ngModel)]="qty" min="0" max="100" step="1" />
</mat-form-field>
```

i.e. the native `<input type="number">` inside `MatInput`, with the
browser's built-in spinner. Pros: zero JS, native keyboard contract
(ArrowUp / ArrowDown move by `step`). Cons / gaps:

- **No locale formatting.** `<input type="number">` accepts a numeric
  string in the browser's locale (typically the user's), but
  `inputElement.value` is **always** in `'.'`-decimal form, and grouping
  separators are not displayed. Display-only formatting is impossible
  without switching to `type="text"`.
- **No `aria-valuemin/max/now/text` set automatically.** The browser
  computes them from `min` / `max` / `value`, but assistive tech inconsistency
  here is well documented. APG explicitly recommends explicit ARIA on
  `role="spinbutton"`.
- **Step + min interaction is buggy.** With `min="0.5" step="0.1"`, typing
  `0.3` is "not a valid value" but `inputElement.value` returns the empty
  string — surprising for forms.
- **Browser-native spinners are tiny.** Mobile Safari hides them entirely;
  Chrome/Firefox show ~14px buttons that violate WCAG 2.5.5 (44×44).
  Consumers therefore add their own buttons — at which point Material's
  guidance ends.
- **No long-press auto-repeat** (browser-native; varies by browser).
- **No prefix / suffix slot integrated with the input affordance.**
  `<mat-form-field>`'s prefix/suffix slots exist but are decorative; they
  are not aware of the formatted display value.

In short, Material treats number entry as "use the platform" and stops.
This is fine for trivial forms; it falls short for any spinbox where you
want a 44×44 stepper, locale-aware display, or a full ARIA contract.

### shadcn/ui — **no first-class number input**

shadcn (<https://ui.shadcn.com/docs/components/input>) ships only a generic
`<Input />`; number inputs are an open recipe in the docs and community.
The standard pattern (e.g.
<https://ui.shadcn.com/docs/components/input> "Numeric input" example, the
many community blog posts) is:

```tsx
<div className="flex items-center">
  <Button variant="outline" size="icon" onClick={() => setValue((v) => v - 1)}>
    <MinusIcon />
  </Button>
  <Input
    type="number"
    value={value}
    onChange={(e) => setValue(+e.target.value)}
    className="text-center"
  />
  <Button variant="outline" size="icon" onClick={() => setValue((v) => v + 1)}>
    <PlusIcon />
  </Button>
</div>
```

Surface that does generalise:

- **Buttons + input are siblings, not nested.** This is the right structural
  shape — the input is the value-bearing element with a `role="spinbutton"`,
  the buttons are siblings that mutate it. kouji follows this layout.
- **`<Input type="number">` directly.** shadcn does not mask the input; it
  relies on the browser. Inherits all the Material gaps.
- **No locale formatting.** Out of scope for shadcn.
- **No long-press auto-repeat, no PageUp/PageDown, no ARIA wiring.** All
  consumer responsibility.

Critique: shadcn's "compose two Buttons + one Input + a flex wrapper" is
the right *visual* recipe but skips every interesting behaviour
(formatting, clamping, long-press repeat, ARIA). kouji's directives can
ship the missing behaviour while keeping the same DOM shape.

### Cross-library summary

|                          | PrimeNG `<p-inputNumber>` | Angular Material         | shadcn (Radix-ish)  | kouji direction                                              |
| ------------------------ | ------------------------- | ------------------------ | ------------------- | ------------------------------------------------------------ |
| First-class component    | yes                       | **no — gap**             | **no — gap**         | **yes** — `KjNumberInput` directive family                   |
| Underlying input         | `type="text"` + mask      | `type="number"` (native) | `type="number"`     | **`type="text"` + mask** by default, `type="number"` opt-in   |
| Locale formatting        | `Intl.NumberFormat`       | none                     | none                | `Intl.NumberFormat` via `kjLocale` + `kjFormat` inputs       |
| Currency / percent / unit| `mode="currency"`         | none                     | none                | `kjFormat` style: `'decimal' \| 'currency' \| 'percent' \| 'unit'` |
| `min` / `max` / `step`   | yes (clamp on commit)     | native                   | native              | yes, **clamp on commit**                                      |
| Stepper buttons          | built-in (`showButtons`)  | none                     | sibling `<Button>`s | **sibling `[kjNumberStepper]` directives on consumer buttons** |
| Long-press auto-repeat   | yes (constant rate)        | no                       | no                  | yes, **accelerating** (500 ms initial → 50 ms repeat)        |
| `PageUp` / `PageDown`    | no                        | no                       | no                  | **yes** — `step * 10` (configurable)                          |
| `Home` / `End`           | no                        | no                       | no                  | **yes** — go to `min` / `max`                                  |
| `role="spinbutton"`      | no                        | no (browser-implicit)    | no                  | **yes**, with full `aria-valuemin/max/now/text`               |
| Display-vs-edit swap     | yes (formatted ↔ raw)     | n/a                      | n/a                 | yes (mirrors PrimeNG)                                         |
| Prefix / suffix          | inline strings            | `<mat-form-field>` slots | manual              | **slots** (reuse `[kjInputGroup]` — see input-group cross-ref) |
| Form integration         | CVA                        | CVA                      | controlled React     | **`KjFormControl`** via host directive                        |

## Decision (core directive?)

**Yes — and as a directive *family* of three.** The composition is:

| Directive                      | Element                                | Role                                                                                                  |
| ------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `[kjNumberInput]`              | `<input>` (typically `type="text"`)    | Owns the numeric model, masking, formatting, clamping, ARIA `spinbutton` wiring, keyboard contract, and `KjFormControl` integration. **Single value-bearing element.** |
| `[kjNumberStepper kjStep="up"]` / `[kjNumberStepper kjStep="down"]` | sibling `<button>` (typically `kjButton`) | Increment / decrement trigger. Owns long-press auto-repeat, `aria-controls` to the input, click suppression on disabled, keyboard activation. |
| `[kjNumberInputGroup]` (optional) | `<div>` wrapping input + steppers   | Pure scope: provides the `KJ_NUMBER_INPUT` context so `[kjNumberStepper]`s can find their input without an explicit reference. Also a reasonable place for layout state if a wrapper wants `data-stepper-layout`. |

The `[kjNumberStepper]` directive is **the** way to wire stepper buttons.
We do not ship a "render the buttons for me" `showButtons`-style input on
the root, because (a) consumers compose their own buttons via
`<button kjButton>` and we don't want to fight that, (b) the layout (stacked
vs. flanking, icons used, button variant) is squarely a wrapper concern,
and (c) requiring the consumer to project the stepper directive on their
buttons keeps the directive headless and theme-agnostic.

### Why a directive family rather than one root directive

Three reasons matter:

1. **Different ARIA contracts on different elements.** The input element
   needs `role="spinbutton"` + `aria-valuemin/max/now/text`; the stepper
   buttons need `aria-label="Increase"` / `"Decrease"` *and*
   `aria-controls="<input id>"`. A single root directive cannot reflect
   these to two different host elements without ugly `Renderer2` reaches.
2. **Click suppression boundary.** The increment button needs the same
   capture-phase click suppression contract as `KjButton` (when the field
   is at `max`, the increment button is `aria-disabled` and intercepted
   pointer / Enter / Space activations). The stepper directive owns this
   per-button; the root directive cannot.
3. **Long-press auto-repeat is per-button state.** Each stepper button has
   its own pointerdown timer, accelerating-interval, and pointer-up
   teardown. Encapsulating that on the button directive matches its DOM
   lifecycle.

### Why a context (`KJ_NUMBER_INPUT`) and an optional `[kjNumberInputGroup]`

The stepper directive needs to mutate the value the input owns. Options:

1. **Template ref:** `<button [kjNumberStepperFor]="qty" kjStep="up">` —
   explicit, but redundant in 95 % of cases (the input is right there
   anyway).
2. **Injected context.** A wrapper `[kjNumberInputGroup]` provides the
   `KJ_NUMBER_INPUT` context that the input's directive registers itself
   into; steppers inject the context. Zero template wiring.
3. **Closest ancestor sniff.** Stepper walks up the DOM until it finds the
   nearest `[kjNumberInput]`. Magical and brittle.

We choose **(2) with a fallback to (1)**: if the consumer wraps the field
in `[kjNumberInputGroup]`, the steppers find the input via the context
automatically. If they don't (e.g. the buttons sit far from the input in
some elaborate layout), `[kjNumberStepper]` accepts an optional
`[kjNumberStepperFor]` template-ref input. The context is the canonical
path; the template-ref is the escape hatch. This mirrors how
[Dropdown Menu](../actions/dropdown-menu.md) keeps the trigger directive
strict (`[kjDropdownMenuTriggerFor]`) and how the dialog uses an injected
context for siblings.

### Why not extend `[kjInput]`?

`[kjInput]` is for arbitrary text inputs and exposes a `formCtrl: KjFormControl`
keyed on `string | null`. Number Input has a richer model:

- The CVA value is `number | null` (not `string | null`).
- `kjInput` does no masking, formatting, or clamping.
- The keyboard contract differs: `[kjInput]` uses native typing only,
  `[kjNumberInput]` adds Arrow / Page / Home / End semantics.
- `aria-invalid` semantics differ (number inputs are invalid when
  out-of-range or NaN-on-commit, not just on `FormControl.invalid`).

`[kjNumberInput]` is therefore a **sibling** to `[kjInput]`, not a
sub-directive. They share `KjDisabled`, `KjFocusRing`, and `KjFormControl`
via `hostDirectives` (same primitives). They are mutually exclusive on the
same element — applying both is undefined behaviour, lint-discouraged.

## Base features

### Underlying input mode

The directive uses **`type="text"` with a mask by default** and exposes
`kjUseNativeNumber: input<boolean>(false)` to opt into `type="number"` for
the rare case where native mobile-keyboard semantics outweigh the
trade-offs. Trade-off matrix:

|                          | `type="text"` + mask (default)                                                  | `type="number"` (opt-in)                            |
| ------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------- |
| Locale formatting        | yes — display formatted, edit raw                                                | no — value is always raw `'.'`-decimal             |
| Mobile keyboard          | text keyboard; we set `inputmode="decimal"` (or `"numeric"`) to get the numpad | numeric keypad guaranteed                            |
| `step` keyboard          | we own ArrowUp/Down — works                                                      | browser-native ArrowUp/Down                          |
| `pattern` validation     | we own validation                                                                 | browser-native — but rejects valid locale strings   |
| Negative / decimal       | controlled by directive's allowed-character set                                   | browser handles `'-'` and `'.'` per locale            |
| Pasting                  | we sanitise paste                                                                 | browser sanitises but inconsistent across UAs        |
| Scroll-wheel changes value| we don't listen by default — opt-in                                              | yes (often unwanted; consumers blur or call `prevent`)|
| Form submission          | submits formatted string to back-end (could surprise)                             | submits unformatted number string                     |

The `inputmode` attribute is the headline mitigation for the mobile-keyboard
loss. We set it from `kjFormat`:

- `kjFormat="decimal"` with `kjAllowDecimals=false` → `inputmode="numeric"`.
- `kjFormat="decimal"` with `kjAllowDecimals=true` → `inputmode="decimal"`.
- `kjFormat="currency" | "percent" | "unit"` → `inputmode="decimal"`.

### Value model

- **Public model (CVA):** `number | null`.
- **`null`** = field is empty. Distinct from `0`.
- **NaN never escapes.** The directive coerces `NaN` to `null` on commit.
- **Internal display string** is what the `<input>.value` holds. The
  directive owns the bidirectional mapping `{ display ↔ number }` via
  `Intl.NumberFormat` + a paired `parse()` helper.

### Locale formatting

`Intl.NumberFormat(locale, options)` drives display. The directive accepts:

- `kjLocale: input<string | undefined>(undefined)` — falls back to the
  injected `LOCALE_ID` (`@angular/core`), then to the runtime default.
- `kjFormat: input<'decimal' | 'currency' | 'percent' | 'unit'>('decimal')`.
- `kjCurrency: input<string | undefined>(undefined)` — ISO 4217.
- `kjCurrencyDisplay: input<'symbol' | 'narrowSymbol' | 'code' | 'name'>('symbol')`.
- `kjUnit: input<string | undefined>(undefined)` — e.g. `'kilometer'`.
- `kjUnitDisplay: input<'short' | 'long' | 'narrow'>('short')`.
- `kjUseGrouping: input<boolean>(true)`.
- `kjMinimumFractionDigits: input<number | undefined>(undefined)`.
- `kjMaximumFractionDigits: input<number | undefined>(undefined)`.
- `kjMinimumIntegerDigits: input<number | undefined>(undefined)`.
- `kjMinimumSignificantDigits` / `kjMaximumSignificantDigits` — full
  `Intl.NumberFormat` parity for power users.

**Display-vs-edit swap.** On focus, the input switches to a "raw editable"
representation: the locale's decimal separator, optional sign, and digits;
no group separators, no currency symbol. On blur, the formatted display
returns. Implementation: track `editing` signal, `inputValue =
formatter.format(value)` when not editing, `editingFormatter.format(value)`
(grouping off, no currency / unit / percent prefix) when editing.

### Bounds and step

- `kjMin: input<number | undefined>(undefined)` — defaults to `-Infinity`.
- `kjMax: input<number | undefined>(undefined)` — defaults to `+Infinity`.
- `kjStep: input<number>(1)` — increment unit.
- `kjPageStep: input<number | undefined>(undefined)` — defaults to
  `kjStep * 10` if undefined. PageUp / PageDown amount.
- `kjAllowEmpty: input<boolean>(true)` — when `false`, blur on empty
  snaps to `clamp(0, kjMin, kjMax)`.
- `kjAllowDecimals: input<boolean>(true)` — when `false`, the decimal
  separator is rejected during typing and `step` must be an integer.
- **Clamp policy:** clamp on commit (blur, stepper press, programmatic
  set), not while typing. Mirrors PrimeNG. Typing `"-1"` in a field with
  `kjMin=0` is allowed mid-typing and snaps to `0` on blur. (Open question
  for stricter UX — see Open Questions.)
- **Step alignment:** when `kjStepBase` is set (defaults to `kjMin` if
  defined, else `0`), stepper actions snap the value to
  `kjStepBase + n * kjStep`. So a field with `kjMin=5 kjStep=0.1` keeps
  values on the `5.0, 5.1, 5.2…` lattice. If the user types a value off
  the lattice (`5.13`), it is preserved through typing and snapped on the
  next stepper press.

### Stepper directive (`[kjNumberStepper]`)

- `kjStep: input<'up' | 'down'>` — required (no default — explicit).
- `kjStepAmount: input<number | undefined>(undefined)` — when set,
  overrides the input's `kjStep` (e.g. for "+5" buttons).
- **Activation:** click / Enter / Space invokes one step. Pointerdown
  starts a long-press cycle: 500 ms initial delay, then 100 ms repeat for
  10 ticks, then 50 ms repeat thereafter. Pointerup / pointerleave / blur
  / Esc cancel the cycle. `prefers-reduced-motion: reduce` does **not**
  affect repeat (it's not motion).
- **Bounds-aware disabled.** Reflects `aria-disabled="true"` and
  `data-disabled` when the corresponding bound is reached
  (`value() >= kjMax()` for `up`, `value() <= kjMin()` for `down`). The
  directive does **not** reach into `KjDisabled` for this — it's a
  computed effective-disabled identical in shape to `KjButton`'s
  `kjLoading` ↔ `effectiveDisabled` chain. Capture-phase click
  suppression mirrors `KjButton`.
- **Form-submit guard.** The directive sets `type="button"` on the host
  if it isn't set. Stepper presses inside a `<form>` must not submit.
- **Keyboard.** Enter / Space step once (no auto-repeat on key-hold; that
  is reserved for pointer-hold to avoid keyboard-repeat clashes with the
  input itself, which already handles ArrowUp/Down).

### Group directive (`[kjNumberInputGroup]`)

- Pure context provider. No public inputs / outputs.
- Provides `KJ_NUMBER_INPUT`. The number-input directive registers itself
  with `inject(KJ_NUMBER_INPUT, { optional: true })?.register(this)` from
  its constructor. The stepper directive injects `KJ_NUMBER_INPUT` with
  `optional: true` — if absent, falls back to `kjNumberStepperFor`.
- Hosts no roles or ARIA — a plain layout container.

### Slots and layout

The styled wrapper (in `@kouji-ui/components`) is responsible for:

- **Flanking layout** (steppers left / right of input) vs. **stacked**
  (vertical stack of up-arrow / input / down-arrow). Reflected as
  `data-stepper-layout="flanking" | "stacked"` on the group root.
- **Prefix / suffix slots** (e.g. `$`, `%`, `kg`). Implemented by reusing
  `[kjInputGroup]` (see [`input-group.md`](./input-group.md)) — the number
  input is just an `[kjInput]`-shaped slot consumer. The locale formatter
  already inserts the currency symbol / percent / unit; prefix/suffix
  slots are for *non-currency* affordances (e.g. a "$" prefix when not
  using `kjFormat="currency"`, or a search-icon prefix). When `kjFormat`
  is `currency` / `percent` / `unit` the wrapper should warn against
  redundant prefix/suffix to avoid double symbols.
- **Variant / Size.** Forwarded to the input via `KjVariant` / `KjSize`
  host directives, same as `[kjInput]`.

## Accessibility (WCAG 2.1 AAA)

### Roles

| Element                          | Role                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `[kjNumberInput]` host (`<input>`)| `spinbutton` (set via `[attr.role]`; overrides the implicit `textbox` of `type="text"`). When `kjUseNativeNumber=true`, `role="spinbutton"` is still set explicitly because the implicit role of `<input type="number">` is `spinbutton` already in the AAM but inconsistently exposed. |
| `[kjNumberStepper]` host (`<button>`) | implicit `button` (host element should be `<button type="button">`).             |
| `[kjNumberInputGroup]`           | none (state container only).                                                           |

Reference: WAI-ARIA APG **Spinbutton**
(<https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/>).

### ARIA wiring

On `[kjNumberInput]`:

- `role="spinbutton"`.
- `aria-valuemin` — reflects `kjMin()` when finite, else omitted.
- `aria-valuemax` — reflects `kjMax()` when finite, else omitted.
- `aria-valuenow` — reflects the current numeric `value()` (omitted when
  `null`).
- `aria-valuetext` — reflects the *formatted* display string (e.g.
  `"$1,234.50"` or `"50 %"`). Critical for currency / percent / unit
  formats: AT users hear the formatted value, not just the raw number.
  Omitted when `value()` is `null`.
- `aria-invalid` — reflects `formCtrl.touched() && (formCtrl.invalid() || outOfRange())`.
- `aria-required` — reflected from `KjFormControl` when the form control
  has `Validators.required`.
- `aria-readonly` — reflects `kjReadonly`.
- `aria-disabled` — reflected from `KjDisabled`.

On `[kjNumberStepper]`:

- `aria-label` — required. Default-suggested by the wrapper:
  `"Increase value"` / `"Decrease value"` (configurable via wrapper inputs
  for localisation). The directive does **not** auto-fill `aria-label`;
  the consumer or wrapper must — this matches `KjButton`'s rule for
  icon-only buttons.
- `aria-controls` — the directive sets this to the input's id when the
  context is wired (auto-generates an id on the input if absent: `kj-number-{n}`).
- `aria-disabled` — reflected from the bounds-aware effective-disabled
  computation.
- `tabindex="-1"` (proposed). The APG Spinbutton pattern says the buttons
  are not part of the tab sequence — Tab lands on the spinbutton input
  itself, ArrowUp / ArrowDown step. Stepper buttons are pointer-only
  conveniences. Open question (see below) — current vote is `tabindex="-1"`
  by default, configurable.

### Keyboard contract

| Key                  | When focus is on…           | Behaviour                                                                                  |
| -------------------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| Digits / `-` / decimal sep | input                  | Sanitise: only one decimal separator, sign only as the leading char, locale-aware decimal sep. Other chars are dropped (preventDefault on keypress). |
| `Backspace` / `Delete` | input                     | Standard text editing on the *raw* edit string.                                              |
| `ArrowUp`            | input                       | `value = clamp(snap(value + step))`. Repeats on key-hold via native `keydown` repeat.       |
| `ArrowDown`          | input                       | `value = clamp(snap(value - step))`. Repeats on key-hold.                                    |
| `PageUp`             | input                       | `value = clamp(snap(value + pageStep))`.                                                     |
| `PageDown`           | input                       | `value = clamp(snap(value - pageStep))`.                                                     |
| `Home`               | input                       | `value = kjMin` if defined, else no-op.                                                       |
| `End`                | input                       | `value = kjMax` if defined, else no-op.                                                       |
| `Enter`              | input                       | Commit (blur formatting kicks in). Does not submit the form by itself unless the input is in a form with a default submit and no other handler — standard `<input>` behaviour. |
| `Escape`             | input                       | Reset edit buffer to last committed value. Open question — see below.                        |
| `Tab` / `Shift+Tab`  | input                       | Standard focus movement. Triggers blur → commit + format.                                    |
| `Enter` / `Space`    | stepper button              | Single step (no auto-repeat).                                                                 |
| (pointerdown-hold)   | stepper button              | Long-press auto-repeat (500 ms initial → 100 ms repeat → 50 ms after 10 ticks).               |

The roving-tabindex pattern from menus does **not** apply here. The input
holds `tabindex="0"` (default for `<input>`); the steppers are
`tabindex="-1"`. APG-compliant.

### Focus management

- The input retains focus when stepper buttons are pressed via pointer.
  This is critical: clicking the stepper must not move focus to the
  button (otherwise rapid pointer-step + keyboard-step interleave
  breaks). The stepper directive calls `event.preventDefault()` on
  `pointerdown` to suppress focus-on-click; the input's focus is
  preserved.
- On Enter / Space activation of a stepper (rare — they are usually
  `tabindex="-1"`), focus stays on the stepper. If the stepper's
  effective-disabled flips (because the value reached the bound), focus
  is **not** auto-redirected — that is the consumer's choice.
- Form-validation focus: when a `[kjNumberInput]` is part of a form's
  invalid set, standard form-submission focus behaviour applies. The
  directive does no custom focus moves on validation.

### Touch target (WCAG 2.5.5 AAA — 44×44 CSS px)

- Stepper buttons must be ≥ 44×44 px. Wrapper enforces this via
  `kjButton kjSize="icon"` defaults (matches `KjButton` icon-size minimum).
- Input height matches the wrapper's input size token; the input itself
  satisfies the target via its width (line of text) plus min-height ≥ 44
  px on touch breakpoints.

### Contrast

Theme concern. Currency / percent / unit characters rendered by the
formatter inherit the input's text colour and are therefore covered by
the same theme-tuned `--kj-color-*-content` contrast (≥ 7:1 AAA).

### Live region for announcements

The `aria-valuetext` change announces value updates in real time on most
AT (NVDA, JAWS, VoiceOver). No additional `aria-live` region is needed
for stepper presses. For *out-of-range* errors (typing `200` in a field
with `kjMax=100` and committing), `aria-invalid` flips and the wrapper's
form error message (linked via `aria-describedby` from `KjFormControl`)
provides the announcement. No directive-level live region.

### Reduced motion

No motion in core. Long-press auto-repeat is *not* governed by
`prefers-reduced-motion: reduce` — it is interaction acceleration, not
animation. Wrapper visual transitions on the stepper hover/active states
respect the media query (same as `KjButton`).

## Composition model

```
number-input/
  number-input.ts            ← KjNumberInput (root, on <input>)
  number-stepper.ts          ← KjNumberStepper (on stepper <button>s)
  number-input-group.ts      ← KjNumberInputGroup (optional context wrapper)
  number-input.context.ts    ← KJ_NUMBER_INPUT + KjNumberInputContext
  number-input.format.ts     ← internal: format / parse helpers around Intl.NumberFormat
  number-input.example.ts
  number-input.locale.example.ts
  number-input.currency.example.ts
  number-input.percent.example.ts
  number-input.bounds.example.ts
  number-input.steppers.example.ts
  number-input.spec.ts
  index.ts
```

### Shared state (`KJ_NUMBER_INPUT` context)

```ts
export interface KjNumberInputContext {
  readonly value: Signal<number | null>;
  readonly min: Signal<number>;          // -Infinity if unset
  readonly max: Signal<number>;          // +Infinity if unset
  readonly step: Signal<number>;
  readonly pageStep: Signal<number>;
  readonly disabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  /** Apply n step units. Positive for up, negative for down. Clamps + snaps. */
  stepBy(units: number, options?: { source: 'pointer' | 'keyboard' | 'programmatic' }): void;
  /** Set the value directly. Clamps + snaps. */
  setValue(value: number | null): void;
}
export const KJ_NUMBER_INPUT = new InjectionToken<KjNumberInputContext>('KjNumberInput');
```

`KjNumberInput` provides `KJ_NUMBER_INPUT` *and* registers itself with the
optional ancestor `KjNumberInputGroup` (which re-exposes the same context
to descendant steppers). The two-way registration accommodates two valid
DOM shapes:

```html
<!-- Shape A: input is the parent — steppers as children of the input is invalid HTML. -->
<!-- Shape B (canonical): all three siblings, wrapped in a group. -->
<div kjNumberInputGroup>
  <button kjButton kjSize="icon" kjNumberStepper kjStep="down">−</button>
  <input kjInput kjNumberInput [(ngModel)]="qty" kjMin="0" kjMax="100" />
  <button kjButton kjSize="icon" kjNumberStepper kjStep="up">+</button>
</div>
```

The group sits *above* the input and steppers; the input registers itself
into the group on construction; the steppers inject the group's context.
This keeps the contract symmetric with `[kjMenu]` / `[kjMenuItem]` and
`[kjAccordion]` / `[kjAccordionTrigger]`.

### `hostDirectives` composition

- `[kjNumberInput]` composes:
  - `KjDisabled` (input alias `kjDisabled`).
  - `KjFocusRing`.
  - `KjFormControl` — owns the CVA wiring (`number | null`).
  - `KjVariant` (input alias `kjVariant`) — same as `[kjInput]`.
  - `KjSize` (input alias `kjSize`) — same as `[kjInput]`.
  - **Does not** compose `KjAriaDescribedBy` directly; the wrapper or
    `[kjFormField]` (see [`field.md`](./field.md)) wires error-message
    `aria-describedby`. The directive only sets `aria-invalid`.
- `[kjNumberStepper]` composes:
  - **Nothing.** It is meant to sit on top of whatever directive the
    consumer already has on the button (typically `[kjButton]`). Same
    rationale as `[kjDropdownMenuTriggerFor]` —
    composing `KjVariant` / `KjSize` here would fight with the host button.
    The capture-phase click suppression is inlined (third instance after
    `KjButton` and menu items; we accept the duplication, see Open
    Questions about extracting a `KjEffectiveDisabled` helper).
- `[kjNumberInputGroup]`:
  - No host directives. Pure context provider.

### Cross-component pointers

- **Input** ([`input.md`](./input.md)) — `[kjInput]` is the spiritual
  parent. `[kjNumberInput]` is **not** a sub-directive of `[kjInput]`; it
  is a peer. They share the `KjFormControl` / `KjDisabled` /
  `KjFocusRing` / `KjVariant` / `KjSize` host-directive composition. They
  are mutually exclusive on the same element. The Input analysis should
  document this peer relationship in its **Cross-component pointers**.
- **Button** ([`../actions/button.md`](../actions/button.md)) — pattern
  for `aria-disabled` reflection, capture-phase click suppression, and
  `effectiveDisabled` composition. The stepper directive mirrors all
  three, with the disabled signal being bounds-aware (`value >= max` /
  `value <= min`) rather than `loading`-aware. Adopting Button's
  documented "(b) extend `KjDisabled` with an optional `effective` signal
  input" path would benefit Number Stepper too — flagging here as the
  third consumer (Button, Menu Item, Number Stepper) of the same pattern.
- **Slider / Range** ([`./slider.md`](./slider.md)) — closest sibling
  pattern. Sliders are bounded-numeric controls with `min` / `max` /
  `step`, an `aria-valuetext` requirement, and Page / Home / End
  semantics. The keyboard contracts are nearly identical (Arrow / Page /
  Home / End). Differences worth carrying in the Slider analysis:
  - Slider's `role="slider"` (not `spinbutton`).
  - Slider has no text-typing surface (so no display-vs-edit format swap,
    no masking).
  - Slider supports two-handle range — number-input does not (a "range"
    of two values is two number inputs in a `[kjFieldGroup]`).
  - Long-press auto-repeat does not apply to a slider thumb (drag, not
    button).
  - Both should share the `clamp + snap-to-step` helper. Recommended:
    extract to `packages/core/src/primitives/numeric/clamp-snap.ts` once
    Slider lands. Number-input ships the helper inline in v1; Slider
    promotes it.
- **Input Group** ([`./input-group.md`](./input-group.md)) — owns
  prefix / suffix slot DOM (`<span class="prefix">`, `<span class="suffix">`,
  visually attached to the input). The number-input wrapper consumes
  `[kjInputGroup]` for non-currency prefix / suffix; when `kjFormat` is
  `currency` / `percent` / `unit`, the formatter handles the symbol and
  prefix/suffix should not be used (warn in dev mode).
- **Field / Form Field** ([`./field.md`](./field.md)) — owns label
  association, helper text, error message, and `aria-describedby`
  wiring. The number-input directive only sets `aria-invalid`; the field
  wraps the input + steppers + label + error and links them via
  `KjAriaDescribedBy`. This split mirrors `[kjInput]` + `[kjField]`.
- **Form** ([`./form.md`](./form.md)) — Number Input ships as a fully
  CVA-compliant control (`number | null`), so `[kjForm]` integration is
  free. Validators recommended: `Validators.required`, plus the
  directive-emitted out-of-range invalid state surfaced via
  `KjFormControl`.
- **Input OTP** ([`./input-otp.md`](./input-otp.md)) — also numeric, but
  fundamentally different: discrete digit cells, no min/max/step. Not a
  reuse path. Document the divergence in the OTP analysis.
- **Time Picker** / **Date Picker** ([`./time-picker.md`](./time-picker.md),
  [`./date-picker.md`](./date-picker.md)) — both build on per-segment
  spinbuttons (hours, minutes, day, month, year). Each segment is
  morally a number-input with custom min/max/step and a shared focus-
  rotate behaviour. Whether to reuse `[kjNumberInput]` per segment or
  ship a dedicated `[kjDateSegment]` directive is decided in those
  analyses; the strong recommendation here is **reuse**, because the
  ARIA spinbutton + Page/Home/End + value-snap-to-step behaviour is
  identical. The format swap and locale handling differ enough that a
  thin `[kjDateSegment]` wrapper around `[kjNumberInput]` is likely the
  right shape.

## Inputs / Outputs / Models

### `[kjNumberInput]`

| Member                       | Kind   | Type                                                           | Default       | Notes                                                                                                                  |
| ---------------------------- | ------ | -------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `kjValue`                    | model  | `number \| null`                                                | `null`        | Two-way bindable. Public model. CVA-bridged via `KjFormControl`. Use `[(kjValue)]` outside reactive forms; use `[formControl]` inside. |
| `kjMin`                      | input  | `number \| undefined`                                           | `undefined`   | Reflects `aria-valuemin`. `undefined` → `-Infinity` internally.                                                          |
| `kjMax`                      | input  | `number \| undefined`                                           | `undefined`   | Reflects `aria-valuemax`. `undefined` → `+Infinity` internally.                                                          |
| `kjStep`                     | input  | `number`                                                        | `1`           | Increment / decrement amount.                                                                                            |
| `kjPageStep`                 | input  | `number \| undefined`                                           | `undefined`   | PageUp / PageDown amount. Defaults to `kjStep * 10` if `undefined`.                                                       |
| `kjStepBase`                 | input  | `number \| undefined`                                           | `undefined`   | Lattice base. Defaults to `kjMin` if defined, else `0`. Stepper actions snap to `kjStepBase + n * kjStep`.                  |
| `kjAllowEmpty`               | input  | `boolean`                                                       | `true`        | If `false`, blur on empty snaps to `clamp(0, kjMin, kjMax)`.                                                              |
| `kjAllowDecimals`            | input  | `boolean`                                                       | `true`        | If `false`, decimal separator is rejected on type and `kjStep` must be integer.                                            |
| `kjAllowNegative`            | input  | `boolean`                                                       | `true`        | If `false`, sign is rejected on type and effective `kjMin` is `max(kjMin, 0)`.                                              |
| `kjReadonly`                 | input  | `boolean`                                                       | `false`       | Reflects `aria-readonly`, `[readonly]`. Stepper directives respect this and become effective-disabled.                     |
| `kjDisabled`                 | input  | `boolean`                                                       | `false`       | Forwarded to `KjDisabled`.                                                                                                  |
| `kjInvalid`                  | input  | `boolean`                                                       | `false`       | External invalid signal (mirrors `[kjInput]`). OR'd with bounds + form invalidity for `aria-invalid`.                    |
| `kjUseNativeNumber`          | input  | `boolean`                                                       | `false`       | When `true`, sets host `type="number"` and disables the mask. Locale formatting does not apply (browser owns it).         |
| `kjFormat`                   | input  | `'decimal' \| 'currency' \| 'percent' \| 'unit'`                | `'decimal'`   | Drives `Intl.NumberFormat` style. Ignored when `kjUseNativeNumber=true`.                                                  |
| `kjLocale`                   | input  | `string \| undefined`                                            | `undefined`   | BCP-47 tag. Falls back to injected `LOCALE_ID`.                                                                            |
| `kjCurrency`                 | input  | `string \| undefined`                                            | `undefined`   | ISO 4217 (e.g. `'USD'`). Required when `kjFormat="currency"`.                                                              |
| `kjCurrencyDisplay`          | input  | `'symbol' \| 'narrowSymbol' \| 'code' \| 'name'`                  | `'symbol'`    |                                                                                                                          |
| `kjUnit`                     | input  | `string \| undefined`                                            | `undefined`   | Required when `kjFormat="unit"`.                                                                                          |
| `kjUnitDisplay`              | input  | `'short' \| 'long' \| 'narrow'`                                  | `'short'`     |                                                                                                                          |
| `kjUseGrouping`              | input  | `boolean`                                                       | `true`        | Thousands separator on display.                                                                                          |
| `kjMinimumFractionDigits`    | input  | `number \| undefined`                                            | `undefined`   |                                                                                                                          |
| `kjMaximumFractionDigits`    | input  | `number \| undefined`                                            | `undefined`   |                                                                                                                          |
| `kjMinimumIntegerDigits`     | input  | `number \| undefined`                                            | `undefined`   |                                                                                                                          |
| `kjMinimumSignificantDigits` | input  | `number \| undefined`                                            | `undefined`   |                                                                                                                          |
| `kjMaximumSignificantDigits` | input  | `number \| undefined`                                            | `undefined`   |                                                                                                                          |
| `kjVariant`                  | input  | `KjVariant` (forwarded)                                          | preset        | Same surface as `[kjInput]`.                                                                                              |
| `kjSize`                     | input  | `KjSize` (forwarded)                                             | preset        | Same surface as `[kjInput]`.                                                                                              |
| `kjAriaLabel`                | input  | `string \| null`                                                  | `null`        | Forwarded to `[attr.aria-label]`. Required when there is no `<label>` association — in practice the field wrapper handles this. |

| Output            | Payload                          | Notes                                                                                  |
| ----------------- | -------------------------------- | -------------------------------------------------------------------------------------- |
| `kjValueChange`   | `number \| null`                 | Auto-emitted by `kjValue` model. Fires on commit (blur, stepper, programmatic), not on every keystroke. |
| `kjInput`         | `{ raw: string; parsed: number \| null }` | Per-keystroke event for consumers that want a live preview (rare). Suppressed if `kjReadonly` or `kjDisabled`. |
| `kjCommit`        | `number \| null`                 | Convenience event — fires once per *committed* value change. Equivalent to `kjValueChange` but distinct from typing. |

### `[kjNumberStepper]`

| Member               | Kind   | Type                              | Default       | Notes                                                                                                |
| -------------------- | ------ | --------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `kjStep`             | input  | `'up' \| 'down'`                   | required      | Direction. No default — explicit per the principle "no implicit defaults for required semantics".   |
| `kjStepAmount`       | input  | `number \| undefined`              | `undefined`   | Per-button override of the input's `kjStep`.                                                          |
| `kjNumberStepperFor` | input  | `KjNumberInput \| undefined`       | `undefined`   | Optional escape-hatch reference to a `[kjNumberInput]`. Used when the steppers are outside a `[kjNumberInputGroup]`. |
| `kjAriaLabel`        | input  | `string \| null`                   | `null`        | Required for icon-only stepper buttons. Wrapper supplies a sensible default per `kjStep`.             |
| `kjDisabled`         | input  | `boolean`                          | `false`       | Forwarded to the host's effective-disabled. ORed with bounds-disabled.                                  |

| Output           | Payload      | Notes                                                                                     |
| ---------------- | ------------ | ----------------------------------------------------------------------------------------- |
| `kjStepped`      | `number`     | Emits the new value after each step (one per click, one per long-press tick).               |

### `[kjNumberInputGroup]`

No public inputs / outputs. Provides `KJ_NUMBER_INPUT` to descendants.

## Examples to ship

`@doc-example` groups in the directive's TSDoc:

1. **Default** (`number-input.example.ts`) — minimal: `<input kjInput
   kjNumberInput [(kjValue)]="qty">`. No steppers, no group. Demonstrates
   ArrowUp/Down keyboard, default formatting (decimal, locale fallback).
2. **With steppers (canonical)** (`number-input.steppers.example.ts`) —
   the three-directive layout in a `[kjNumberInputGroup]`. Demonstrates
   long-press auto-repeat, bounds-aware disabled stepper.
3. **Bounds + step** (`number-input.bounds.example.ts`) — `kjMin=0
   kjMax=100 kjStep=5`. Demonstrates clamp-on-commit, snap-to-step,
   PageUp/PageDown (50 jumps), Home/End.
4. **Locale formatting** (`number-input.locale.example.ts`) — three
   side-by-side fields with `kjLocale="en-US"`, `"de-DE"`, `"fr-FR"`,
   value `1234.5`. Demonstrates display swap on focus, AT
   `aria-valuetext` flowing through.
5. **Currency** (`number-input.currency.example.ts`) — `kjFormat="currency"
   kjCurrency="USD"`. Decimal precision auto-set to 2 by the formatter.
6. **Percent** (`number-input.percent.example.ts`) — `kjFormat="percent"`
   with `kjValue` semantics: `0.5` displays as `50 %`. Demonstrates the
   *displayed-value-vs-stored-value* split.
7. **Decimals disabled** (`number-input.integer.example.ts`) — quantity
   field with `kjAllowDecimals=false kjAllowNegative=false`. Demonstrates
   the keypress filter rejecting `.` and `-`.
8. **Reactive forms** (`number-input.form.example.ts`) — inside a
   `FormGroup` with `Validators.required` and a custom out-of-range
   validator. Demonstrates `aria-invalid`, error-message wiring through
   `[kjField]`.
9. **Native number mode** (`number-input.native.example.ts`) — opt-in
   `kjUseNativeNumber=true` for a mobile-numeric-keyboard-critical case.
   Documents the loss of locale formatting.
10. **Themed** (`number-input.retro.example.ts`,
    `number-input.finance.example.ts`) — variant + size composition under
    retro and finance themes. Mirrors the structure used in `KjButton`
    and `KjInput`.

## Open questions / risks

1. **Stepper button `tabindex`.** APG Spinbutton says the input is the
   tab stop and the steppers are pointer-only conveniences (so
   `tabindex="-1"` on the buttons). Some power users prefer Tab-reachable
   steppers (e.g. when a screen reader user wants explicit "Increase /
   Decrease" buttons in the focus order). Decision: **default
   `tabindex="-1"`**, expose `kjStepperTabbable: input<boolean>(false)`
   on the wrapper for opt-in. Document under wrapper inputs once the
   wrapper is designed.

2. **Escape behaviour.** Two reasonable behaviours: (a) reset the edit
   buffer to the last committed value (matches typical desktop spinboxes
   and PrimeNG); (b) clear the field to `null`. We choose (a). Document
   that consumers who want "clear" should provide a separate clear button
   (mirrors PrimeNG's `onClear` pattern and `[kjInput]`'s clear-affordance
   pattern).

3. **Clamp on type vs. clamp on commit.** PrimeNG and our chosen default
   clamp on commit (blur / stepper). A stricter UX clamps continuously
   ("can't even type 200 if max is 100"). Decision: clamp on commit by
   default; expose `kjClampOnType: input<boolean>(false)` for the strict
   case. Continuous clamping makes typing `-5` impossible when min is
   `-10` (you'd type `-`, then `5` is rejected), so it must be opt-in.

4. **Display-vs-edit on `kjFormat="percent"`.** Stored value `0.5` displays
   as `50 %`. On focus, do we show `50` (the displayed integer the user
   thinks of) or `0.5` (the stored value)? Decision: **show `50`** when
   editing — match user mental model. The directive multiplies on commit
   to store as `0.5`. This is what `Intl.NumberFormat` percent-mode
   already does for display; we mirror it for input. Document loudly
   because this is a common surprise.

5. **Locale that uses non-ASCII digits.** `'ar-EG'` formats `1234` as
   `'١٬٢٣٤'`. Display works (formatter handles it); typing must accept
   both Arabic-Indic and Western digits. Decision: parse both digit sets;
   normalise to Western digits on commit. Document.

6. **`Intl.NumberFormat` part-by-part parsing.** `Intl.NumberFormat` has
   no standard `parse()` method. We compose one using
   `formatToParts()` to derive the locale's group / decimal separators
   and a regex per locale. Cache per `(locale, options)` pair. There is
   a known edge case in some locales where the group separator is a
   non-breaking space — paste / type handling must accept the regular
   space too. Documented in implementation notes; non-blocking.

7. **Mouse-wheel changes value.** Some libraries listen to `wheel` to
   step. We **do not** by default — wheel-changes are a notorious
   accidental-edit source on long forms. Consumers can listen to
   `wheel` and call `ctx.stepBy(±1)` if they want it. Document.

8. **SSR formatting determinism.** `Intl.NumberFormat` is available in
   Node 18+. The directive runs the formatter eagerly, so first paint
   server-side will produce the same string as client-side as long as
   `LOCALE_ID` matches. If the consumer relies on browser-default locale
   (no `kjLocale`, no provided `LOCALE_ID`), SSR/CSR can mismatch. The
   `kjLocale` input plus `provideLocaleId` setup is the right answer.
   Documented.

9. **`kjUseNativeNumber=true` interaction with `kjFormat`.** Native
   `<input type="number">` ignores formatting. Decision: when
   `kjUseNativeNumber=true`, `kjFormat`, `kjLocale`, `kjCurrency`, etc.
   are ignored at runtime; dev-mode `effect()` warns once if any of them
   are set. Mirrors the wrapper-level icon-vs-`aria-label` warning we
   discussed for `KjButton`.

10. **Stepper directive on a non-`<button>`.** Same risk as
    `[kjDropdownMenuTriggerFor]` on a `<div>`. The directive will work
    (handlers attach), but `<div>`s aren't focusable / aren't buttons.
    No runtime guard. Document; AAA discourages.

11. **Effective-disabled abstraction.** Number Stepper is the third
    consumer of the "ARIA-disabled + capture-phase click suppression +
    bounds-aware effective signal" pattern, after `KjButton` (with
    `loading`) and Menu Item (with `disabled`). Promotion target:
    extract a `KjEffectiveDisabled` host directive that takes an
    `effective: () => boolean` source signal, owns the
    `aria-disabled` / `data-disabled` reflection, and runs the
    capture-phase `(click)` / `(keydown.enter)` / `(keydown.space)`
    interceptor. Defer to v1.1; carry the pattern inline in v1.

12. **Long-press repeat on touch.** Pointer-event-based long-press works
    on touch. iOS Safari has a quirk: pointerdown on a button can be
    swallowed if the button is inside a scrollable container that the
    user starts to drag. We accept the platform behaviour — if drag
    cancels the press, the auto-repeat tears down on `pointercancel`.
    Documented.

13. **Time-picker / date-picker reuse.** As flagged in the cross-component
    pointers, the strong recommendation is to reuse `[kjNumberInput]` per
    segment. The blocker is whether to add a "rotate to next segment on
    overflow" hook (e.g. minutes 60 → hours +1). Decision: **out of scope
    for `[kjNumberInput]`**; a thin `[kjDateSegment]` wrapper handles the
    cross-segment behaviour. Number Input remains a pure single-value
    spinbox.

14. **Value parsing for currency / percent / unit on paste.** Pasting
    `"$1,234.50"` into a `kjFormat="currency"` field should parse to
    `1234.5`. Pasting `"50 %"` into `kjFormat="percent"` should parse
    to `0.5`. Implementation: `format-aware paste handler` that runs the
    formatter's parts regex against the pasted text, strips currency /
    percent / unit symbols, and parses the digits. Locale-aware.
    Edge cases (`"$1.234,50"` in `de-DE`, mixed symbols) get the
    "best-effort, fall back to no-op" treatment with a console warn in
    dev. Tracked.

15. **`kjMin` / `kjMax` change at runtime with current value out of new
    bounds.** Decision: on bounds change, re-clamp the current value if
    it falls outside the new bounds, and emit `kjValueChange`. This
    matches `<input type="number">` (browsers re-validate) and avoids
    "the field is committed at 200 but max is now 100, and it stays 200
    until the user edits". Document the emission.

16. **`Intl.NumberFormat` polyfill on older browsers.** Out of scope —
    kouji targets Angular 17+ which targets evergreen browsers. No
    polyfill; documented in stack notes if not already there.

17. **Slider uplift.** When [`./slider.md`](./slider.md) is written, the
    `clamp + snap-to-step` helper should be promoted to
    `packages/core/src/primitives/numeric/clamp-snap.ts`. Number Input
    blocks on nothing — it ships the helper inline; Slider promotes it
    on landing.

18. **Field / Form Field availability.** [`./field.md`](./field.md) is
    expected to define the label / error / `aria-describedby` wiring.
    That analysis hasn't been written yet, so the exact contract for
    error-message linkage is unresolved. The number-input directive sets
    `aria-invalid`; the wrapper currently inlines a small
    `aria-describedby` reach pending the field analysis. Soft block on
    `field.md` for the wrapper-level v1; the directive-level v1 ships
    independently.
