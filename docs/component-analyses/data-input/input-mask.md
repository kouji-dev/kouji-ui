# Input Mask

A **fixed-format text input** — phone numbers (`(999) 999-9999`), credit
cards (`9999 9999 9999 9999`), dates (`99/99/9999`), postal codes,
identifiers. The user types raw characters; the directive enforces the
format slot-by-slot — non-matching keystrokes are rejected, fixed
characters (`(`, `)`, ` `, `-`, `/`) are skipped over by the caret, and the
remaining placeholder positions are visualised inline.

Layered on top of the existing `KjInput` directive
(`packages/core/src/input/input.ts`) the same way `KjPasswordInput` is —
`KjInputMask` composes `KjInput` via `hostDirectives` so the parent
contracts (CVA, `aria-invalid`, focus-ring, ARIA-disabled, `KjVariant`,
`KjSize`) apply unchanged. This document covers only the delta.

Cross-references:
- [`input.md`](./input.md) — parent. Form wiring, focus-ring, disabled
  policy, variants/sizes, preset config token shape are all inherited.
  Read that first.
- [`number-input.md`](./number-input.md) — sibling formatting concern.
  Number Input solves locale-aware **numeric** formatting (thousands
  separator, decimal swap on focus); Input Mask solves **structural**
  formatting (literal characters interleaved with placeholder slots). Both
  share the "model value vs. display value" split — Number commits a
  `number`, Mask commits either the masked string or the raw alphanumerics
  (configurable, see [Form integration](#form-integration--model-value)).
- [`field.md`](./field.md) — label + hint + error wrapper. The mask shape
  is described in the **hint** slot (`"Format: (###) ###-####"`), not the
  input's `aria-label`, so AT picks it up via `aria-describedby` rather
  than overloading the accessible name.
- [`form.md`](./form.md) — `Validators` integration. Incomplete masks
  surface a `mask` validation error (`{ mask: { expected: '(999) 999-9999',
  actual: '(415) 555-' } }`) so reactive forms can show "complete the
  field" without each component re-implementing the rule.
- [`../actions/button.md`](../actions/button.md) — for the optional
  trailing **clear** button consumers compose via `KjInputGroup`. Mask
  doesn't ship its own clear control.

## Source comparison

### PrimeNG — `p-inputMask`

PrimeNG's [`<p-inputMask>`](https://primeng.org/inputmask) is the
reference for what to lift. Mask grammar is a **single template string**:

| Token | Matches | Source |
|---|---|---|
| `9` | digit `[0-9]` | jQuery Mask Plugin lineage |
| `a` | letter `[A-Za-z]` | same |
| `*` | digit or letter `[A-Za-z0-9]` | same |
| anything else | literal — rendered, skipped over by the caret | same |

Public API surface worth lifting:

| Input | Notes |
|---|---|
| `mask` | The template string. `'(999) 999-9999'`, `'99/99/9999'`, etc. |
| `slotChar` | Placeholder char shown for empty slots. Default `'_'`. |
| `autoClear` | On blur, if the value is incomplete, clear it. Default `true`. PrimeNG choice; we default `false` — see [Open questions](#open-questions--risks). |
| `unmask` | When `true`, the model value is the **raw** alphanumerics (`"4155551234"`); when `false`, it's the **masked** string (`"(415) 555-1234"`). Default `false`. |
| `characterPattern` | Regex overriding which chars `*` / `a` accept (e.g. allow non-Latin letters). Default `[A-Za-z]`. |
| `placeholder` / `disabled` / `readonly` / `aria-*` | Standard pass-throughs to the internal input. |
| `onComplete` / `onFocus` / `onBlur` / `onInput` / `onClear` | Event surface. `onComplete` fires when every slot is filled. |

Behaviour:

- Caret **skips fixed characters** on type and on backspace — typing into
  slot 4 of `(415) ___-____` lands at slot 6 (the parens and space are
  skipped); backspacing from slot 6 deletes slot 4, not the closing paren.
- **Paste** is sanitised: pasted text is filtered to the alphanumerics
  that fit the next N variable slots; literals in the pasted string are
  ignored if they don't match the template at that position.
- **`<input type="text">`** under the hood — never `tel` / `email` /
  `number`, because a partially-masked phone `(415) 555-` is not a valid
  `tel` URI and browsers reject it on autofill.
- Form value is the masked string by default, unmasked when
  `unmask=true`. Validators run against whichever variant is committed.

Gaps in PrimeNG that we should close:

- **No incomplete-mask `Validators` error.** `onComplete` fires on
  completion but consumers must wire their own
  `Validators.pattern(/^\(\d{3}\) \d{3}-\d{4}$/)` to flag the half-typed
  state — error-prone and duplicates the truth in `mask`.
- **Single token alphabet.** `9` / `a` / `*` are baked in and not
  extensible. A consumer who wants "uppercase letter only" or "hex digit"
  has to wrap the directive and pre-validate. Tokenised regex per slot
  fixes this — see [Decision](#decision-mask-grammar).
- **`aria-label` is overwritten by the format hint.** PrimeNG sets
  `aria-label` to the mask string itself when no label is provided —
  screen readers read literal `"(999) 999-9999"`, not "Phone number". Bad
  default.
- **`autoClear=true` is hostile.** Tabbing away from a half-typed phone
  number wipes the field silently — on multi-page forms the user types
  the same digits twice.

### Angular Material — no first-class mask

Material does **not** ship a mask directive. The
[Form Field documentation](https://material.angular.dev/components/input)
and the
[Material `<input matInput>` API](https://material.angular.dev/components/input/api)
have no mask hook; the canonical recipe in the Angular ecosystem is the
community library [`ngx-mask`](https://github.com/JsDaddy/ngx-mask)
(MIT-licensed, ~10k weekly downloads as of 2025), or
[`imask`](https://imask.js.org/) wrapped in a custom directive. Material
treats this as out-of-scope — input formatting is left to the consumer or
to dedicated component libraries.

`ngx-mask` is the de-facto pattern outside Material:

- Same `9` / `A` / `S` / `0` / `*` token alphabet as PrimeNG (different
  letter cases — `A` vs `a` — but identical semantics).
- Predefined named patterns: `mask="Hh:m0"` for hours, `mask="d0/M0/0000"`
  for dates.
- `dropSpecialCharacters` (analogue of `unmask=true`) — defaults to
  `true`, opposite of PrimeNG.
- A `validation` boolean exposing a `mask` `Validators` error when
  incomplete — close to what we want but ad-hoc.
- Composition is via a parent-injected service (`NgxMaskConfig`), close
  to our `KJ_INPUT_CONFIG` pattern.

`imask` is lower-level (vanilla TS) but more powerful — supports regex,
function, dynamic, and pipe masks; PrimeNG's grammar is a strict subset.

**The gap is real.** Material consumers reach for a third-party mask on
every project; kouji shipping a first-class mask removes a recurring
"which library do we standardise on" decision.

### shadcn/ui — gap

shadcn ships `<Input>` and nothing else for masking. The
[community recipe](https://ui.shadcn.com/docs/components/input) is to
compose `Input` with a controlled-component pattern, hand-rolling the
caret-skip and paste logic per project, or reaching for
`react-input-mask` / `react-imask`. Same gap as Material; same conclusion.

**Pattern picked up.** We follow PrimeNG's **single-template-string**
grammar (`'(999) 999-9999'`) for the canonical case because it's
zero-learning-curve for anyone coming from PrimeNG / `ngx-mask`, but we
extend it with a **tokens map** so the alphabet is open. We keep
PrimeNG's structural concerns (caret skip, paste sanitisation) but
flip three defaults: `autoClear=false`, `unmask=true` (the model is the
raw value by default — see [Form integration](#form-integration--model-value)),
and `aria-label` is **not** overwritten with the mask string.

## Decision: needs a core directive?

**Yes — a single root directive on the `<input>`.** Same shape as
`KjPasswordInput`: one stateful directive, no children, the entire
template is just `<input kjInputMask mask="…">`. There is no consumer
template structure to mediate (no toggle button, no meter, no warning
message); the mask is purely a behaviour layer over a single element.

`KjInputMask` composes `KjInput` via `hostDirectives` so it inherits:

- `KjFormControl` plumbing (CVA — same `[(ngModel)]` / `[formControl]`
  surface as a plain input).
- `KjFocusRing` keyboard focus signal.
- `KjDisabled` host (ARIA-disabled / data-disabled — same policy split
  documented in `input.md`).
- `KjInput`'s own `aria-invalid` / `data-invalid` reflection.
- `KjVariant` / `KjSize` (once integrated on `KjInput` — see `input.md`
  open questions).

Stateful concerns owned by `KjInputMask` directly:

1. **Mask compilation.** Parse the template string into a slot vector
   `Slot[]` where each slot is either `{ kind: 'literal', char: ')' }`
   or `{ kind: 'variable', tokenId: '9', re: /[0-9]/ }`. Computed once
   per `kjMask()` change.
2. **Display string maintenance.** Track caret position and current
   filled-slots state in a `ChunkState` signal. The display string is
   `slots.map(slot, i => slot.kind === 'literal' ? slot.char : (filled[i] ?? slotChar()))`.
3. **Keyboard interception.** `keydown` handler routes printable keys to
   the next variable slot, `Backspace` / `Delete` to the previous /
   current variable slot, navigation keys (`ArrowLeft` / `ArrowRight` /
   `Home` / `End`) snap caret to the nearest variable slot.
4. **Paste sanitisation.** `paste` event handler reads the clipboard,
   filters to characters matching the next N variable slots' regexes,
   ignores non-matching characters from the paste source.
5. **Form value commit.** On every change, push either the masked
   display string or the raw alphanumerics (per `kjMaskMode`) into
   `KjFormControl.notifyChange`.
6. **Incomplete-mask validator.** Provide a `Validator` (via
   `NG_VALIDATORS`) that returns `{ mask: { expected, actual } }` when
   the value has any unfilled variable slots. Fires automatically — no
   consumer wiring beyond reactive forms.
7. **`aria-describedby` slot for format hint.** Generate an internal
   visually-hidden description element (or expose an `aria-describedby`
   chain hook for `KjField` to populate) with text like `"Format: phone
   number, ten digits"` — see [Accessibility](#accessibility-wcag-21-aaa).

None of this is layout. None of this is theming. A single attribute
directive is correct.

**Why not split into root + slot primitives?** Considered (`<input
kjInputMask>` + `<kjInputMaskSlot>` for each variable slot in a
projected template). Rejected — masks are short strings, not lists of
DOM nodes, and slot-as-element would force consumers to write template
fragments for trivial cases. The split also fails the "what can I
configure per slot" test: regex per slot is the only meaningful
per-slot knob, and that's covered by the tokens map without DOM
machinery.

## Mask grammar

### The decision: single template string, extensible token alphabet

Two options were on the table:

**Option A — single template string (PrimeNG / ngx-mask).**
`mask = '(999) 999-9999'`. Built-in tokens `9` / `a` / `*`. Literals are
anything else.

**Option B — tokenised regex per slot.**
`mask = [/[0-9]/, /[0-9]/, /[0-9]/, '-', /[0-9]/, …]` (the
`react-input-mask` shape, also `imask`'s array form). Each variable slot
carries its own regex.

We ship **A as the surface, with B as the implementation.** Concretely:

```ts
@Directive({ selector: '[kjInputMask]' })
export class KjInputMask {
  /** Mask template. e.g. `'(999) 999-9999'`, `'99/99/9999'`, `'***-***'`. */
  kjMask = input.required<string>();

  /** Token map. Each entry: token char in the template → matcher RegExp. */
  kjMaskTokens = input<Record<string, RegExp>>({
    '9': /[0-9]/,
    'a': /[A-Za-z]/,
    '*': /[A-Za-z0-9]/,
  });

  /** Placeholder char rendered in unfilled variable slots. */
  kjSlotChar = input<string>('_');
}
```

This gives:

- **Zero learning curve** for the canonical case — `kjMask="(999)
  999-9999"` is what every prior-art consumer expects.
- **Extensibility without grammar changes** — adding hex (`H` →
  `/[0-9A-Fa-f]/`), uppercase-only (`A` → `/[A-Z]/`), or
  Cyrillic letters (`л` → `/[А-Яа-я]/`) is a tokens-map addition, not
  a parser change.
- **Per-app customisation via DI** — a `KJ_INPUT_MASK_TOKENS` injection
  token (see [Composition model](#composition-model)) lets an app define
  its house token alphabet once and forget about it, exactly like
  `KJ_INPUT_CONFIG` does for variants/sizes.
- **One source of truth.** The compiled `Slot[]` vector is option B
  internally — every part of the runtime (slot lookup, paste sanitisation,
  validator) reads the compiled form, never the raw string. Option A
  is purely the **input shape**; option B is purely the **runtime shape**.

### Compiled-mask shape

```ts
type Slot =
  | { kind: 'literal';  char: string }
  | { kind: 'variable'; tokenId: string; re: RegExp };

interface CompiledMask {
  slots: ReadonlyArray<Slot>;
  variableIndices: ReadonlyArray<number>;   // position lookup for caret nav
  literalCount: number;
  variableCount: number;
}
```

Computed via `computed(() => compileMask(this.kjMask(),
this.kjMaskTokens()))`. Recompiled on token-map or template change —
expected to be rare (mask is usually static per field) so re-compile cost
is irrelevant.

**Escape syntax.** Literal `9`, `a`, or `*` (rare but possible —
`'9{9999}'` for a numeric ID prefixed by a literal `9{`) are escaped with
a leading backslash: `kjMask="\\9{9999}"`. Standard convention; PrimeNG
doesn't support escaping at all (have to swap the token alphabet via
`characterPattern`), so this is a strict superset.

**Predefined masks.** A small constant export — `KJ_INPUT_MASK_PRESETS` —
ships with named patterns:

```ts
export const KJ_INPUT_MASK_PRESETS = {
  phoneUS:    '(999) 999-9999',
  phoneIntl:  '+99 999 999 9999',
  cardNumber: '9999 9999 9999 9999',
  cardExpiry: '99/99',
  cardCvv:    '999',
  isoDate:    '9999-99-99',
  usDate:     '99/99/9999',
  ssn:        '999-99-9999',
  zip5:       '99999',
  zipPlus4:   '99999-9999',
} as const;
```

Consumers who want named presets do `[kjMask]="presets.phoneUS"`. Not
hardcoded into the directive — themes / locales differ; an `en-GB`
phone is `'09999 999999'` (different shape entirely). Presets are a
convenience export, not a dependency.

## Form integration — model value

Two configurable behaviours, controlled by a single input:

```ts
/**
 * What value is committed to the FormControl.
 * - `'unmasked'` (default) — raw alphanumerics only: `"4155551234"`
 * - `'masked'` — full display string: `"(415) 555-1234"`
 */
kjMaskMode = input<'unmasked' | 'masked'>('unmasked');
```

Default is **`'unmasked'`** — opposite of PrimeNG, same as `ngx-mask`.
Reasoning:

- Validators (`Validators.pattern`, `Validators.minLength`) work
  naturally on the raw value. `Validators.minLength(10)` for a US
  phone is unambiguous; against the masked string `"(415) 555-1234"`
  it'd be `minLength(14)` which couples the validator to the mask
  shape.
- Backend payloads almost always want the raw value; the mask is a
  presentation concern. Defaulting to `'unmasked'` lets consumers send
  the form value directly without re-stripping.
- The display value is always reconstructable from the raw value and
  the mask (re-fill the variable slots in order), so storing the raw
  is lossless. The reverse — storing the masked — needs a strip step
  on submit and on every cross-field reference. Always the wrong default.

Reactive-form interaction:

- `formCtrl.setValue('4155551234')` re-fills the display from the model
  value. This is the standard `KjFormControl` value-reflection path —
  the directive intercepts the effect, runs raw → display reconstruction,
  and writes to `el.nativeElement.value`. (For `'masked'` mode, the
  reflection is identity.)
- `formCtrl.setValue('(415) 555-1234')` in `'unmasked'` mode would set
  the display to the masked string but the model still holds the
  unmasked. We **strip on intake** in the value-reflection effect: any
  caller-supplied value, masked or unmasked, is normalised by extracting
  the chars matching the mask's variable-slot regexes in order. This is
  forgiving — `setValue('415-555-1234')` and `setValue('415 555 1234')`
  both produce the same `(415) 555-1234` display + `4155551234` model.

**Incomplete-mask `Validator`.** `KjInputMask` provides itself as
`NG_VALIDATORS`:

```ts
providers: [
  { provide: NG_VALIDATORS, useExisting: KjInputMask, multi: true },
],

validate(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  const filledVariables = countMatched(value, this.compiled().slots);
  if (filledVariables === 0) return null;          // empty is fine — Validators.required handles it
  if (filledVariables < this.compiled().variableCount) {
    return {
      mask: {
        expected: this.kjMask(),
        actual: this.formattedActual(),
        filled: filledVariables,
        required: this.compiled().variableCount,
      },
    };
  }
  return null;
}
```

Errors flow through `KjFormControl` to the wrapping `KjFormError` exactly
the same way `Validators.email` does. Consumers needing custom messages
read the `mask` error key in their template (`@if (ctrl.errors?.mask) {
…incomplete… }`).

## Accessibility (WCAG 2.1 AAA)

| Concern | Where | Mechanism |
|---|---|---|
| **Role** | inherited `KjInput` | Native `<input type="text">`. `KjInputMask` forces `type="text"` regardless of consumer-set type — `tel` / `email` / `url` reject partially-masked values during browser autofill, and `number` doesn't allow literals at all. The `inputmode` attribute is set instead (see below). |
| **`inputmode`** | `KjInputMask` | Auto-derived from the compiled mask: all-`9` slots → `inputmode="numeric"` (better mobile keyboard); mixed → `inputmode="text"`. Overridable via `kjInputMode` input. WCAG 1.3.5. |
| **`aria-invalid`** | inherited `KjInput` | `formCtrl.touched() && (kjInvalid() \|\| !!validate())`. Touched-gated. The directive's own `validate()` result *contributes* — incomplete on blur surfaces invalid styling automatically. |
| **`aria-disabled`** | inherited `KjInput` (via `KjDisabled`) | Inherited unchanged. |
| **`aria-readonly`** | inherited `KjInput` | If `kjReadonly` lands on `KjInput` (open question there), inherited unchanged. The mask still renders the literals, but keystrokes are no-ops. |
| **`aria-label`** | consumer / `KjField` | **The mask string is NOT used as `aria-label`.** Consumers must provide a human label (`"Phone number"`) via `<label>`, `kj-field`, or `kjAriaLabel`. PrimeNG's default of leaking `"(999) 999-9999"` to AT is the wrong default — see source comparison. WCAG 2.4.6. |
| **`aria-describedby` (format hint)** | `KjInputMask` + `KjAriaDescribedBy` | The directive auto-generates a visually-hidden `<span>` adjacent to the input describing the mask in human terms (`"Format: ten digits, e.g. four one five five five five one two three four"`). Its id is appended to `aria-describedby`. The text is computed from `kjFormatHint` (consumer-supplied) or, if absent, derived from the compiled mask + token map (`"three digits, then a space, then three digits, then a hyphen, then four digits"`). WCAG 1.3.1, 3.3.2. |
| **Format hint suppression** | `KjInputMask` | When `kjFormatHint=""` is set explicitly (empty string, not `undefined`), the auto-generated description is suppressed — for cases where `KjField`'s hint slot already says the format. The directive should not duplicate. |
| **Screen reader announcement of mask shape** | placeholder + describedby | The placeholder (`(___) ___-____`) is decorative — placeholders are not a substitute for labels (WCAG 3.3.2). The accessible-name is the label; the format is described via `aria-describedby`. AT users hear `"Phone number, edit text, format: ten digits"` on focus — exactly the right shape. |
| **Caret position announcement** | none | Caret movement during type-and-skip is not announced (would be spam). The user *hears* their typed character via the keyboard echo and sees the caret skip. AT users typing in a forms-mode buffer (NVDA / JAWS) bypass the directive's caret manipulation entirely — see [Open questions](#open-questions--risks). |
| **Keyboard contract** | `KjInputMask` host | `keydown`: printable → next variable slot; `Backspace` → previous variable slot; `Delete` → current variable slot; `ArrowLeft` / `ArrowRight` / `Home` / `End` → snap to nearest variable slot, **never** stop in a literal; `Tab` / `Shift+Tab` / `Enter` / `Escape` → unhandled (browser default). Selection across literals: clearing a selection spanning literals leaves the literals untouched. |
| **Paste handling** | `KjInputMask` host | `paste` event: read `event.clipboardData.getData('text')`, filter to chars matching the next variable slots' regexes in order, fill from the current caret position forward. If the pasted string contains the mask's literals already (`"(415) 555-1234"`), strip them via the same intake normaliser used for `setValue`. WCAG 3.3.5 (Help — paste-from-anywhere is friendlier than paste-rejected). |
| **Cut / copy** | native | Browser default. Cut respects literal protection (cut leaves literals; cut value via clipboard is the unmasked). Copy puts the masked display on the clipboard — most useful default; consumers wanting raw can wire `onCopy`. |
| **Drag-and-drop text** | `KjInputMask` host | Same path as paste — sanitised through the intake normaliser. |
| **IME composition** | `KjInputMask` host | Composition events skip the keydown filter (`compositionstart` sets a guard, `compositionend` re-runs the input handler against the composed string). Punts to the same intake path; characters that don't match are silently dropped. Imperfect for CJK in mixed masks but acceptable — masks are dominantly ASCII-shaped. WCAG 3.3.5. |
| **Touch target ≥ 44×44** | inherited from `KjInput` size config | Same `md` floor at 44px. WCAG 2.5.5. |
| **Color/contrast — slot char** | themes layer | The placeholder slot character (`_` by default) uses `--kj-color-neutral` — the same token as `placeholder` in `input.md`. Themes guarantee ≥4.5:1 against the input background. WCAG 1.4.3. |
| **Validation announcement** | `KjFormError` + `KjAriaDescribedBy` | `mask` validation error renders in `KjFormError` (which is `role="alert"` `aria-live="polite"`), id wired into the input's `aria-describedby` chain. The user hears *"Phone number, format: ten digits, complete the field"* on blur if they tabbed away half-typed. |
| **Reduced motion** | n/a | No animation. Caret skips are instantaneous. |
| **Auto-clear on blur** | suppressed by default | PrimeNG's `autoClear=true` is hostile (silent data loss). Default `kjAutoClear="false"`. When opted in, `aria-live` polite announcement of the clear is required — TBD copy ("Field cleared because the format was incomplete"). See [Open questions](#open-questions--risks). |

**Where it lives.** Mask-compilation, keyboard interception, paste
sanitisation, and the validator live in `KjInputMask`. ARIA-invalid /
ARIA-disabled / focus-ring / form-control wiring live in `KjInput`
(parent). Label / hint / error rendering live in `KjField` (sibling). The
auto-generated format-hint description sits in a private element rendered
from the directive's host template via `viewChild` — see
[Composition model](#composition-model).

## Composition model

```
input-mask/
  input-mask.ts                  ← KjInputMask (root, on the <input>)
  input-mask.compile.ts          ← compileMask() — pure function, slot vector
  input-mask.engine.ts           ← keystroke / paste / caret state machine
  input-mask.tokens.ts           ← KJ_INPUT_MASK_TOKENS DI token + defaults
  input-mask.presets.ts          ← KJ_INPUT_MASK_PRESETS named patterns
  input-mask.hint.ts             ← compiled-mask → human-readable description
  input-mask.spec.ts
  input-mask.compile.spec.ts
  input-mask.engine.spec.ts
  index.ts
```

**`KjInputMask`** (selector `[kjInputMask]`)

- `hostDirectives`:
  ```ts
  hostDirectives: [
    {
      directive: KjInput,
      inputs: ['kjDisabled', 'kjInvalid', 'kjVariant', 'kjSize', 'kjReadonly'],
    },
  ],
  ```
  Inherits `KjFormControl`, `KjFocusRing`, `KjDisabled` transitively
  through `KjInput`'s own `hostDirectives` — same trap-avoidance Password
  Input documents (no double-composition of primitives that would create
  duplicate `aria-disabled` reflectors).

- Provides itself as a multi-validator:
  ```ts
  providers: [
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => KjInputMask), multi: true },
  ],
  ```

- Host bindings:
  ```ts
  host: {
    '[attr.type]': '"text"',                                 // forced — see a11y table
    '[attr.inputmode]': 'kjInputMode() ?? autoInputMode()',
    '[attr.placeholder]': 'displayPlaceholder()',            // computed: literals + slot char in variable positions
    '[attr.aria-describedby]': 'describedBy()',              // chain: consumer + auto-hint id + KjField hint/error ids
    '(keydown)': 'engine.onKeydown($event)',
    '(beforeinput)': 'engine.onBeforeInput($event)',         // primary intake path; covers IME, paste, drop
    '(paste)': 'engine.onPaste($event)',                     // belt-and-braces; some browsers don't fire beforeinput for paste
    '(drop)': 'engine.onDrop($event)',
  }
  ```

- Reads `KjInput.formCtrl.value()` in an `effect()` to drive
  raw → display reconstruction. Writes `el.nativeElement.value` to the
  reconstructed display string and clamps caret position to the nearest
  variable slot afterwards (forms-driven `setValue` shouldn't leave the
  caret stranded inside a literal).

- Renders the auto-generated hint via a sibling element appended to the
  parent on construction. Implementation detail: a `Renderer2`-created
  `<span class="kj-sr-only">` placed immediately after the `<input>` in
  the DOM, with id minted from `_IdGenerator`. Visually hidden via the
  shared `.kj-sr-only` style class (clip-path / position-absolute), so AT
  reads it but sighted users don't see duplicate text. Auto-removed on
  destroy.

- Generates a host id if missing — same pattern as `KjPasswordInput`,
  same justification (`KjField`'s `<label for>` and the format-hint's
  `aria-describedby` linkage both need it).

**`compileMask` — pure function**

```ts
export function compileMask(
  template: string,
  tokens: Record<string, RegExp>,
): CompiledMask {
  const slots: Slot[] = [];
  const variableIndices: number[] = [];
  let i = 0;
  while (i < template.length) {
    const ch = template[i];
    if (ch === '\\' && i + 1 < template.length) {
      slots.push({ kind: 'literal', char: template[i + 1] });
      i += 2;
      continue;
    }
    const re = tokens[ch];
    if (re) {
      variableIndices.push(slots.length);
      slots.push({ kind: 'variable', tokenId: ch, re });
    } else {
      slots.push({ kind: 'literal', char: ch });
    }
    i++;
  }
  return {
    slots,
    variableIndices,
    literalCount: slots.length - variableIndices.length,
    variableCount: variableIndices.length,
  };
}
```

Pure, testable, no Angular dependencies. Spec in
`input-mask.compile.spec.ts` covers escape syntax, missing-token (treated
as literal), repeated tokens, all-literal masks (degenerate, valid).

**`MaskEngine` — instance per directive, owns caret state**

The engine is the keystroke/paste state machine. Constructed by the
directive with `(slots, getValue, setValue, getCaret, setCaret)`. Pure
behaviour; no DI; testable in isolation against fake DOM via spec.
Methods: `onKeydown`, `onBeforeInput`, `onPaste`, `onDrop`,
`reconstructFromRaw(raw: string): { display: string; rawIndex: number }`.

**`KJ_INPUT_MASK_TOKENS`** — injection token

```ts
export const KJ_INPUT_MASK_TOKENS = new InjectionToken<Record<string, RegExp>>(
  'KjInputMaskTokens',
  { providedIn: 'root', factory: () => ({ '9': /[0-9]/, 'a': /[A-Za-z]/, '*': /[A-Za-z0-9]/ }) },
);

export function provideKjInputMaskTokens(tokens: Record<string, RegExp>) {
  return { provide: KJ_INPUT_MASK_TOKENS, useValue: tokens };
}
```

Allows app-level extension: `provideKjInputMaskTokens({ ...defaults, 'H':
/[0-9A-Fa-f]/ })` once in `bootstrapApplication`, then every `KjInputMask`
in the app accepts `H` as a hex slot. Per-instance `kjMaskTokens` input
overrides the DI value when both are set.

**No injection-token context for child directives.** Mask is a leaf
directive. There are no `[kjInputMaskSlot]` / `[kjInputMaskHint]` /
`[kjInputMaskClearButton]` children — the hint is internal, the clear
button (if any) is a `KjButton` in a sibling `KjInputGroup`, not a
mask-aware directive.

**Cross-component pointers:**

- `KjField` (parent in template). Auto-id generated by `KjInputMask`
  registers with `KjField`'s context the same way `KjInput` will, so
  `<label for>` and `aria-describedby` chaining work without consumer
  wiring. Field's hint slot is the right place for the human-readable
  format (`"e.g. (415) 555-0123"`); when present, consumers should set
  `kjFormatHint=""` to suppress the auto-hint and avoid double-describing.
- `KjInputGroup` (sibling). Leading icon (e.g. flag for phone) and
  trailing clear button compose around the mask exactly like they do
  around `KjInput`. The clear button calls `formCtrl.setValue('')` —
  the directive handles the rest.
- `KjNumberInput` (sibling). Different problem space (numeric vs.
  structural), but the **value reflection effect** (raw → display) and
  the **`type="text"` under the hood** are identical patterns. If both
  components ship value-reflection helpers, they should share a
  `reconstructDisplay(raw, format)` shape — keep them aligned even if
  not literally shared code.

## Inputs / Outputs / Models — `kj`-prefixed

### `KjInputMask`

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjMask` | `input.required` | `string` | — | Mask template. e.g. `'(999) 999-9999'`. Required — without it, the directive does nothing useful. |
| `kjMaskTokens` | `input` | `Record<string, RegExp>` | `KJ_INPUT_MASK_TOKENS` value | Per-instance token override. Merged on top of the DI default — entries here win. |
| `kjMaskMode` | `input` | `'unmasked' \| 'masked'` | `'unmasked'` | What gets committed to the form control. See [Form integration](#form-integration--model-value). |
| `kjSlotChar` | `input` | `string` | `'_'` | Placeholder char for empty variable slots. Single-char (typed via `string` for ergonomics; runtime asserts length 1 in dev). |
| `kjAutoClear` | `input` | `boolean` | `false` | If true, clear the field on blur when the mask is incomplete. PrimeNG default flipped — see source comparison. When enabled, requires an `aria-live` announcement (TBD copy). |
| `kjFormatHint` | `input` | `string \| undefined` | `undefined` | Override the auto-generated screen-reader hint. Empty string `""` suppresses the hint entirely (use when `KjField`'s hint slot covers it). |
| `kjInputMode` | `input` | `'text' \| 'numeric' \| 'decimal' \| 'tel' \| 'email' \| 'url' \| 'search' \| undefined` | `undefined` (auto-derived) | Override the auto-derived `inputmode`. |
| `kjDisabled` | forwarded via `hostDirectives` to `KjInput` → `KjDisabled` | `boolean` | `false` | Inherited. |
| `kjInvalid` | forwarded via `hostDirectives` to `KjInput` | `boolean` | `false` | Inherited. ORed with the directive's own `validate()` result for `aria-invalid` reflection. |
| `kjVariant` | forwarded via `hostDirectives` to `KjInput` | `string` | `KJ_INPUT_CONFIG` default | Inherited (post-`KjInput` variant integration). |
| `kjSize` | forwarded via `hostDirectives` to `KjInput` | `string` | `KJ_INPUT_CONFIG` default | Inherited. |
| `kjReadonly` | forwarded via `hostDirectives` to `KjInput` | `boolean` | `false` | Inherited. |

| Output / model | Kind | Type | Notes |
|---|---|---|---|
| `kjComplete` | `output` | `void` | Emits when every variable slot is filled (one-shot per fill cycle — re-emits if the user clears and re-fills). Mirrors PrimeNG's `onComplete`. Useful for "auto-focus next field" UX in card-entry forms. |

**No standalone value model.** Value flow is entirely through
`KjInput`'s inherited `KjFormControl` — `[(ngModel)]` / `[formControl]`
on the host element work exactly as they do for `KjInput`. There is no
`[(kjValue)]` on `KjInputMask`; adding one would create two paths for
the same value and inevitably drift.

All input/output names follow shape (A) — property name carries the
`kj` prefix — per `rules/code_style.md`. The directive selector
(`[kjInputMask]`) already starts with `kj`.

## Examples to ship

Match the structure under `packages/components/src/input/` once the
wrapper exists; until then under `packages/core/src/input-mask/`.

1. **Phone number (default).** `<input kjInputMask kjMask="(999) 999-9999"
   [formControl]="phoneCtrl">` inside a `kj-field` with a label and the
   format hint. Demonstrates the cheapest viable use site, default
   `kjMaskMode="unmasked"`, validator firing on incomplete blur.
2. **Credit card group.** Three masked fields (`cardNumber`, `cardExpiry`,
   `cardCvv`), wired together so `(kjComplete)` on each auto-focuses the
   next. Uses `KJ_INPUT_MASK_PRESETS`. Demonstrates the auto-advance UX
   without a custom directive.
3. **Date with custom token alphabet.** ISO date `'9999-99-99'` with a
   per-app token providing `D` (`/[0-3]/` for day-tens-place) and `M`
   (`/[01]/` for month-tens-place) for stricter validation:
   `'9999-M9-D9'`. Demonstrates `provideKjInputMaskTokens` and
   per-instance `kjMaskTokens`.
4. **Masked vs unmasked submission.** Side-by-side forms with
   `kjMaskMode="unmasked"` (default) and `kjMaskMode="masked"`, showing
   the network payload diff. Pedagogical only.
5. **Reactive form with custom error message.** Reads
   `phoneCtrl.errors?.mask` and renders "Please enter all ten digits"
   via `KjFormError`. Demonstrates the `mask` validator key.
6. **Disabled and invalid states.** `kjDisabled`, `kjInvalid` forwarded
   through to `KjInput`. Demonstrates the inherited contract.
7. **Hex code field with extended tokens.** Custom token `'H'` for
   `/[0-9A-Fa-f]/`, mask `'#HHHHHH'` (the `#` is a literal). Shows
   token-map extension and that `*` / `9` / `a` aren't the universe.
8. **Within `kj-field` with format hint suppression.**
   `kjFormatHint=""` to suppress the auto-hint when the field's own hint
   slot already says the format. Demonstrates avoiding double-described
   labels.
9. **Themed (core-only).** `input-mask.example.ts`,
   `input-mask.retro.example.ts`, `input-mask.finance.example.ts` under
   `packages/core/`. Same convention as Password Input's themed
   examples — proves headless under arbitrary CSS.

## Open questions / risks

1. **Auto-clear default.** Defaulting `kjAutoClear="false"` means a user
   tabbing away from a half-typed phone leaves the partial value in the
   form. Validator catches it (the `mask` error fires) so submission is
   blocked, but the partial display is preserved across re-renders —
   could be confusing on long forms where the user returns to the field
   later. **Recommendation: keep `false`.** Silent data wipe (PrimeNG's
   default) is a worse failure mode than a stuck-but-flagged partial.
   Consumers wanting wipe-on-blur opt in; if telemetry shows >70% of
   call sites enable it, revisit.

2. **`kjMaskMode='unmasked'` default vs. PrimeNG.** Flipping the default
   relative to PrimeNG is a porting hazard for teams bringing PrimeNG
   forms across. Documenting the default in the migration guide
   (`docs/migration/primeng.md` — TBD) is the only mitigation.
   Alternative: match PrimeNG (`'masked'` default). **Recommendation:
   keep `'unmasked'`.** Backend payload simplicity wins over porting
   ergonomics; the migration mention is one line.

3. **Caret manipulation under screen-reader forms-mode.** NVDA and JAWS
   in forms-mode (the default editing mode) intercept arrow / backspace
   / type events differently — they often use a virtual buffer and
   replay events to the host. Our `keydown` listener may receive
   synthesised events with no `KeyboardEvent.key` set, or the AT may
   re-fire a `setSelectionRange` after our handler ran. **Risk:** caret
   skip behaviour breaks under AT, leaving the user "stuck" inside a
   literal. **Mitigation:** prefer `(beforeinput)` (the standard
   intake path browsers use for AT-driven edits — the `data` and
   `inputType` properties are reliable across AT) and treat `(keydown)`
   as a redundant fast path. Run NVDA + JAWS + VoiceOver smoke tests
   before claiming AAA. Open until tested.

4. **`beforeinput` browser support.** Safari < 16.4 didn't fire
   `inputType="insertReplacementText"` for some IME composition
   completions, so the IME path can leak unfiltered characters. Fallback:
   the `(input)` listener inherited from `KjInput` re-runs the intake
   normaliser as a safety net (the value-reflection effect normalises
   any raw / partially-masked string via the same path used for
   `setValue`). Belt-and-braces — no behaviour gap, just an extra pass.

5. **Selection across literals.** When the user selects across a
   literal (e.g. selects `"5) 555"` in `(415) 555-1234`) and types,
   what happens? Three options: (a) replace the entire selection
   verbatim, including the literal — wrong, breaks the mask; (b) drop
   the selection, insert at the start of the selection, leaving the
   rest of the original digits — confusing; (c) collapse the selection
   to its leading variable-slot position, replace from there forward,
   shifting subsequent digits in. **Recommendation: (c)** — same as
   PrimeNG, same as `imask`. Implementation lives in the engine.

6. **Right-to-left languages.** RTL masks (Arabic, Hebrew) — the literal
   characters' rendering direction matters. The compiled mask is
   left-to-right by definition (the input model is LTR), but the
   `<input>`'s `dir="rtl"` will flip visually. **Risk:** caret-skip
   maths off-by-one in RTL when navigating with arrow keys (visual
   "left" arrow is logical "right" in RTL). **Recommendation:** detect
   `getComputedStyle(el).direction === 'rtl'` once on focus, swap the
   arrow-key handler's direction. Mark as TBD until covered by a real
   RTL spec — not blocking the directive's first ship.

7. **Mask-mode change at runtime.** Switching `kjMaskMode` from
   `'unmasked'` to `'masked'` while the field has a value mid-form —
   what's the value committed? The intake normaliser handles this: the
   directive re-emits the model value via `notifyChange` after the mode
   change, so the form sees the appropriate shape. Spec needs a
   reactive-mode-change test to lock the behaviour.

8. **`kjMask` change at runtime.** Same issue, more severe: changing
   the mask itself can render the current value invalid (e.g. switching
   from `'(999) 999-9999'` to `'9999-99-99'` when the user has typed
   `'(415) 555-12'`). **Recommendation:** on mask change, run the
   intake normaliser against the current raw value. Slots that no
   longer match are dropped silently. The user sees the field
   re-format. Document — most consumers will never change `kjMask` at
   runtime, but country-aware phone fields will.

9. **Predefined-mask presets ownership.** The `KJ_INPUT_MASK_PRESETS`
   constant (US phone, ISO date, …) is opinionated and Anglo-default.
   Should presets ship with locale variants? **Recommendation: no.**
   Presets are convenience exports, not a locale system. Apps with
   per-locale phone formats build their own `phoneFor(locale)` lookup.
   The constant exists to remove the "what's the right mask string for
   a US phone" question, not to be a full i18n table.

10. **Validator vs `kjInvalid` precedence.** Consumer-passed
    `kjInvalid="true"` and the directive's own `validate()` returning a
    `mask` error both feed `aria-invalid`. Currently OR-ed (either flips
    the attribute). **Risk:** consumer wanting to suppress the mask
    validator (e.g. server says the phone is fine even though the mask
    thinks it's incomplete) has no way to opt out. **Recommendation:**
    add `kjValidate = input<boolean>(true)` to disable the built-in
    validator without disabling the masking. Mirrors `ngx-mask`'s
    `validation` boolean. Defer until a real consumer asks — YAGNI for
    v1.

11. **Strip-on-paste preserves selection?** When pasting
    `"(415) 555-1234"` into an empty mask, the directive re-renders the
    full display. Where should the caret land? **Recommendation:** end
    of last filled variable slot. Same as type-to-fill — feels
    consistent, lets the user verify by glancing at where the caret
    settled.

12. **`compositionend` race with `beforeinput`.** Some browsers fire
    `compositionend` before the corresponding `beforeinput`
    (`insertCompositionText`); others after. The engine must hold a
    composition guard from `compositionstart` through `compositionend`
    that allows raw text through, then runs the intake normaliser on
    `compositionend`. Same path Material's
    `MAT_INPUT_VALUE_ACCESSOR` documents. Not novel; just needs spec
    coverage.

13. **Cross-reference to Field.** `KjField` doc isn't yet written. When
    it ships, the auto-id-mint and `aria-describedby` chain wiring this
    directive does will move into a shared `KjAriaDescribedBy` /
    `KJ_FIELD` machinery. Until Field exists, the directive's
    self-contained `<span class="kj-sr-only">` hint sits standalone —
    fine, but produces a small DOM-cleanup task once Field lands.

14. **`KjValidator` token convention.** `NG_VALIDATORS` provider on the
    directive itself is the standard Angular pattern, but it forces
    `useExisting: forwardRef(() => KjInputMask)` because the validator
    interface is implemented on the same class. Cleaner: extract a tiny
    `KjMaskValidator` directive that injects `KjInputMask` and
    implements `Validator`. **Recommendation: keep on the same class
    for v1.** Two directives for one feature is more cost than the
    `forwardRef` it avoids.

15. **`inputmode="tel"` for phone masks.** Currently we auto-derive
    `inputmode="numeric"` for all-digit masks. For phone-shaped masks
    (`'(999) 999-9999'`), `inputmode="tel"` gets the user a phone-app
    keyboard on iOS with `+` and `*` keys. We don't know a phone mask
    is a phone mask. **Recommendation:** consumer sets
    `kjInputMode="tel"` explicitly when wanted. Auto-derivation stays
    conservative (`numeric` vs `text`); over-detection (`tel` vs
    `numeric` vs `decimal`) needs heuristics that don't survive contact
    with international formats.
