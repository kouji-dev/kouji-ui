# Input OTP

A multi-cell input for one-time-codes (SMS / TOTP / email verification). Each
cell holds a single character; typing auto-advances to the next cell, Backspace
returns to the previous, and pasting a full code distributes characters across
all cells. The whole widget exposes **one** value to Angular forms — the
concatenated string — regardless of how many internal cells it renders.

Layered on top of the existing `KjInput` directive
(`packages/core/src/input/input.ts`) and the `KjFormControl` /
`KjFocusRing` / `KjDisabled` / `KjRovingTabindex` / `KjLiveRegion` primitives.
Two collaborating directives ship in core: a root `KjInputOtp` (owns the value,
the cell count, the paste-distribute / auto-advance logic, and the
`KJ_INPUT_OTP` context) and a leaf `KjInputOtpCell` (one per cell, composes a
local `KjInput`-like surface with cell-specific keyboard handling). Themes
ship a single styled wrapper (`<kj-input-otp [kjLength]="6">`) that renders the
N cells in a flex row.

Cross-references:
- [`input.md`](./input.md) — the parent directive each cell composes (or
  mirrors). Form integration, focus-ring, ARIA-disabled, `aria-invalid`
  reflection, value-flow effect — all inherited unchanged. This doc only
  describes the OTP-specific delta.
- [`field.md`](./field.md) — label + hint + error wrapper. Input OTP is a
  composite control; the `KjFormField` wrapper provides the **single**
  `<label>` (e.g. "Verification code"), hint, and error that apply to the
  whole widget. Cells do **not** consume the field's label; only the root
  does (via `aria-labelledby`).
- [`mask-input.md`](./mask-input.md) — the closest sibling pattern. Mask Input
  also enforces a fixed character format on a single value, but renders into
  one `<input>` with visual mask characters; OTP renders into N `<input>`s
  with one character each. The two directives share **paste-distribute** and
  **char-set validation** logic — extract a shared helper if both ship.
- [`number-input.md`](./number-input.md) — same parent-input composition
  pattern, different domain. Reference for how composite controls expose a
  single typed model on top of one-or-many native fields.
- [`form.md`](./form.md) / Form spec — Input OTP must pass standard form
  validation surface (`Validators.required`, `Validators.pattern(/^\d{6}$/)`
  etc.). The CVA value is `string | null`; an incomplete code is the empty
  prefix the user has typed, not `null`, so `Validators.minLength(6)` is the
  intuitive way to require completeness.
- [`../actions/button.md`](../actions/button.md) — the (optional) "Resend
  code" button is a `KjButton`; not part of OTP itself but always rendered
  alongside it in real designs. Document the recipe in examples.

## Source comparison

### PrimeNG — `p-inputOtp`

A self-contained component on a `<div>` wrapper that renders N `<input>`
elements internally. Inputs:

- `length: number = 4` — number of cells.
- `mask: boolean = false` — when `true`, displays bullet-like characters
  (visually hides the value, like `type="password"`). Implemented by toggling
  cell `type` between `'text'` and `'password'`.
- `integerOnly: boolean = false` — restricts char set to `[0-9]`. When
  `true`, sets `inputmode="numeric"` on each cell.
- `variant: 'outlined' | 'filled'` — theme token from PrimeNG's theme config.
- `disabled`, `readonly`, `invalid`, `style`, `styleClass` — pass-throughs.

Form integration is via PrimeNG's standard CVA — `[(ngModel)]` /
`[formControl]` see the concatenated string (or a number when
`integerOnly`). Outputs: `onChange`, `onFocus`, `onBlur`. PrimeNG also exposes
a `inputTemplate` slot for custom cell rendering.

Behaviours:

- **Auto-advance** on `(input)` when the cell is filled — focus moves to the
  next cell, with no explicit replace logic if the cell already has a
  character (the new char overwrites and advances).
- **Backspace** — clears the current cell and moves to the previous; if the
  current cell is already empty, just moves back without clearing the
  previous (then the next Backspace clears).
- **Arrow keys** — left/right move focus between cells, up/down do nothing.
- **Paste** — `(paste)` listener reads `event.clipboardData.getData('text')`,
  filters to the allowed char set, distributes across cells starting from
  the current one, and focuses the first empty cell after the paste (or the
  last cell if all are filled).
- **`autocomplete="one-time-code"`** is set on the **first** cell only —
  iOS/Safari and Android both look at the first focused input for the SMS
  autofill suggestion; once it auto-fills with the full code, PrimeNG's
  paste distribution path handles the multi-cell write.

A11y: each cell gets a generic `aria-label="Please enter OTP character N"`.
No `aria-describedby` linkage to the field's hint/error. No live-region
announcement on completion. `inputmode="numeric"` is set when
`integerOnly`, otherwise omitted.

### Angular Material — gap

Material does **not** ship a first-class OTP input. The CDK provides
`InputModalityDetector` and `LiveAnnouncer`, but no OTP recipe is
documented. Community patterns wrap N `<input matInput>` cells in a
`<div role="group">` and hand-roll the auto-advance / paste logic — same
duplication trap as Material's password-input gap. We do not follow this;
see "Decision" below.

### shadcn/ui — `input-otp` (wraps the `input-otp` library)

A thin React wrapper over [`input-otp`](https://input-otp.rodz.dev/) by
Pedro Duarte. The library's design is **single hidden `<input>` + visual
fake cells**. One real `<input type="text" maxlength="6"
inputmode="numeric" autocomplete="one-time-code">` is positioned to overlay
the cell row but visually hidden; user keystrokes go to the real input,
which tracks the value and renders fake `<div>`s for each character with the
caret position visually emulated. Pros: native paste / autofill / select-all
"just works" because there's only one input; one tab stop; mobile keyboard
behavior is identical to a normal numeric input. Cons: every cell is
non-focusable, so users can't tap a specific cell to edit (you can only
position the caret via the underlying input's selection API — the library
fakes this on click).

The shadcn wrapper exposes:

- `<InputOTP value maxLength={6} pattern={REGEXP_ONLY_DIGITS}>` — root that
  owns the real input and the value.
- `<InputOTPGroup>` — visual grouping (no behavior).
- `<InputOTPSlot index={0}>` — fake cell renderer; reads char N from
  context.
- `<InputOTPSeparator />` — decorative dash between cell groups (e.g.
  `123-456`).
- Predefined patterns exported: `REGEXP_ONLY_DIGITS`,
  `REGEXP_ONLY_CHARS`, `REGEXP_ONLY_DIGITS_AND_CHARS`.

A11y: the underlying real `<input>` carries a single `aria-label` (e.g.
"Verification code"). The fake slots are `aria-hidden="true"` because they
have no semantic role — they're presentational. Caret tracking provides a
visual "current cell" cue.

**Pattern picked up.** The two source approaches are genuinely different
architectures, not stylistic variants:

| | PrimeNG (N real inputs) | shadcn / `input-otp` (1 real input + fake cells) |
|---|---|---|
| Focus model | N tab stops, arrow keys move | 1 tab stop, caret API |
| Auto-advance logic | manual (this directive) | native (max-length + char shift) |
| Paste distribution | manual loop over cells | native (`maxLength` truncates) |
| iOS/Safari `one-time-code` autofill | flaky — depends on which cell is focused | reliable — single input is the canonical case the OS targets |
| Per-cell click-to-edit | yes | yes, but via fake caret positioning |
| Per-cell `aria-label` | yes (verbose) | no (one label on the real input) |
| Mobile selection / cursor | per-cell (can be confusing) | one selection range over the whole code |
| RTL support | manual (cell order) | native input handles it |
| Implementation complexity | high (this directive owns most logic) | medium (shifted to CSS / caret math) |

**kouji's choice: hybrid — N real inputs as the default, with a documented
"single hidden input" mode behind a flag.** Default is PrimeNG-style because
it's the discoverable, click-any-cell-to-edit, screen-reader-explicit
pattern that most consumers expect when they see "OTP input". The
single-input mode is shipped as `[kjSingleInput]="true"` for projects that
prioritize iOS autofill reliability and one-tab-stop simplicity. Both modes
expose the **same** Angular forms surface (one `string` value, one
`KjFormControl`) and the **same** `KJ_INPUT_OTP` context — they differ only
in how the cells are rendered and how the value is split. See **Open
questions** for the recommendation on which mode to make default.

## Decision: needs a core directive?

**Yes — two of them.** Distinct responsibilities, not collapsible into one:

1. **`KjInputOtp` (root, on the wrapping `<div>` or `<fieldset>`).** Owns
   the value (the concatenated string), the `kjLength` count, the
   `kjCharSet` filter (digits / alphanumeric / regex), the `kjMask`
   visibility flag, the paste handler, the auto-advance logic, the
   completion announcement, and the `KJ_INPUT_OTP` context. Composes
   `KjFormControl` via `hostDirectives` so the **whole widget** is a single
   form control. Composes `KjDisabled` so disabling the root disables every
   cell.
2. **`KjInputOtpCell` (leaf, on each `<input>`).** Reads its index from
   structural directive context (`*kjInputOtpCell="$index"`) or from a
   `kjIndex` input. Reads its character from the parent context's value
   signal sliced by index. Owns the per-cell key handlers
   (Backspace / ArrowLeft / ArrowRight / Home / End), the per-cell input
   event that pushes its character upstream to the parent, and the focus
   management calls back into the parent. Composes `KjFocusRing`. Does
   **not** compose `KjFormControl` — there's only one form control for the
   whole widget, and it lives on the root.

A pure-CSS or "just use N `<kj-input>` and your own *ngFor" recipe would
push four traps onto consumers: (a) paste distribution across cells; (b)
correct Backspace-to-previous focus; (c) the single-string CVA mapping; (d)
`autocomplete="one-time-code"` placement and the iOS autofill multi-write.
Material accepts this trap; we don't, given how often verification UIs
ship.

A single fused directive on the root that does everything (cells via
`@for` inside its template) is **too rigid**: themes need to project cell
templates for things like a separator dash between groups
(`123-456`), per-cell decorations, or the shadcn-style fake-cell mode.
Splitting root + cell preserves projection and keeps the cell directive
small and composable.

The single-input mode adds a third optional directive,
**`KjInputOtpSlot`** (presentational marker, no logic) for the fake cells
in that mode — see **Composition model**. It's a marker only and doesn't
warrant its own decision section.

## Base features

- **Length** — `kjLength: input<number>(6)`. Common values are 4 and 6;
  some banking flows use 8. No upper bound enforced; document that
  `length > 8` starts to harm usability and that long codes belong in a
  single `KjInput` instead.
- **Char set** — `kjCharSet: input<'digits' | 'alphanumeric' | RegExp>('digits')`.
  - `'digits'` → `inputmode="numeric"`, `pattern="[0-9]*"`,
    filter `/[^0-9]/g` on input/paste.
  - `'alphanumeric'` → `inputmode="text"`, no `pattern`, filter
    `/[^A-Za-z0-9]/g`.
  - `RegExp` → custom; consumer-supplied; `inputmode="text"`. The regex is
    applied per-character on input, not as a full-string match.
- **Mask** — `kjMask: input<boolean>(false)`. When `true`, every cell renders
  with `type="password"` (or, with the single-input mode, the real input
  uses `type="password"` and slot rendering substitutes `•`). Default
  `false` because OTPs are typically read off a screen — masking is opt-in
  for high-sensitivity flows (banking PIN-by-OTP, recovery code re-entry).
- **Variants** — forwarded via `hostDirectives` to `KjVariant` so themes
  drive cell appearance from `data-variant`. Match the `KjInput` set:
  `default`, `filled`, `ghost`, `destructive`. Same `bindPresets(KJ_INPUT_OTP_CONFIG)`
  pattern as `KjButton` / `KjInput`.
- **Sizes** — forwarded via `hostDirectives` to `KjSize`. `sm`, `md`
  (default — must clear 44×44 per WCAG 2.5.5), `lg`. The `md` cell needs
  enough block-size + inline-size for a 44px tap target; cells are square
  by convention so inline-size = block-size = 44px minimum.
- **States** — `kjInvalid` (touched-gated, just like `KjInput`),
  `kjDisabled` (disables every cell + root), `kjReadonly` (every cell gets
  `readonly`).
- **Single-input mode** — `kjSingleInput: input<boolean>(false)`. When
  `true`, the directive renders one real `<input>` and N `KjInputOtpSlot`
  presentational divs. See **Composition model** for the structural impact.
- **Auto-submit on completion** — `kjAutoSubmit: input<boolean>(false)`.
  When `true`, the directive emits `kjComplete` (an output) the first time
  the value reaches `kjLength` characters. Consumers wire this to
  `(kjComplete)="onSubmit()"`. Off by default — auto-submit is a
  per-product UX choice and forcing it would surprise consumers who want a
  visible "Verify" button. Cross-reference: PrimeNG does not ship this; the
  `input-otp` library does (`onComplete`).
- **Resend recipe** — not part of this directive. Document the standard
  recipe: a `KjButton kjVariant="ghost"` next to the OTP that calls a
  `resendCode()` service method. Belongs in the examples, not the API.

## Accessibility (WCAG 2.1 AAA)

| Concern | Where | Mechanism |
|---|---|---|
| **Role (root)** | core directive (root) | `role="group"` on the root element. Groups the cells semantically so AT users hear "Verification code, group" instead of N orphan inputs. Alternative: render the root as `<fieldset>` and a hidden `<legend>` — but `role="group"` on a `<div>` is more flexible for the wrapper component. |
| **Label association (root)** | consumer / `KjFormField` | `aria-labelledby="<field-label-id>"` on the root, fed by `KjFormField` via the same context-registration improvement Input needs (see `input.md` — Open questions). The **single** label "Verification code" applies to the whole widget; per-cell labels are positional only. |
| **Per-cell labels** | core directive (cell) | `aria-label="Code digit ${index + 1} of ${length}"` on each cell. Internationalized via `kjCellLabel` input on the root that takes a `(index, length) => string` formatter, defaulting to the English string above. |
| **`aria-describedby` (root)** | core directive (root) | Mirrors `KjInput`'s wiring — root injects `KJ_FORM_FIELD` (optional) and computes `aria-describedby` from the field's hint + error ids. Per-cell `aria-describedby` is **not** set; the description applies to the widget, not each cell. |
| **`aria-invalid`** | core directive (root + cell) | Root sets `aria-invalid="true"` on itself when `kjInvalid() && touched()`, and **also** propagates to every cell via context (so each cell's red border styling lights up). `data-invalid` for CSS hooks at both levels. |
| **`aria-required`** | core directive (root) | Auto-derived from the bound `NgControl`'s `Validators.required`, same approach proposed for `KjInput`. Set on the root only. |
| **`aria-disabled` / `disabled`** | core directive (root + cell) | Root reflects via `KjDisabled`. Each cell **also** writes native `disabled` on its `<input>` so the browser blocks input — text-input policy carry-over from `KjInput`. Cells are tab-stops only when not disabled. |
| **`aria-readonly` / `readonly`** | core directive (cell) | When `kjReadonly`, every cell `<input>` gets the native `readonly` attribute (preferred over `aria-readonly` on inputs, which is widely supported less consistently). |
| **Keyboard contract — root** | none | Root does not own keys; it delegates to cells. (`role="group"` does not have a keyboard contract.) |
| **Keyboard contract — cell** | core directive (cell) | <ul><li>**Single printable char** — replaces cell value, advances focus to next cell.</li><li>**Backspace on filled cell** — clears the cell, stays on it. (Variant: clear and move back; we follow PrimeNG: clear-then-stay so the next key types into the just-cleared cell.) **Reconsidered: clear-and-move-back** matches `input-otp` and shadcn and is what most users expect on a phone — a single Backspace tap deletes a character. Adopting clear-and-move-back.</li><li>**Backspace on empty cell** — moves focus to previous cell and clears it.</li><li>**Delete** — same as Backspace on filled cell (clear, stay).</li><li>**ArrowLeft / ArrowRight** — move focus to previous / next cell without clearing. RTL-aware: in RTL contexts, ArrowLeft moves to the **next** cell visually (logical "right" in DOM). Use `dir` attribute reading.</li><li>**Home / End** — first / last cell.</li><li>**Tab / Shift+Tab** — leaves the widget (cells are not all tab stops; see **Tab semantics** below).</li><li>**Ctrl/Cmd+A** — selects all (the full code, across all cells). Requires the single-input mode or a synthetic select-all that highlights every cell.</li><li>**Ctrl/Cmd+V (paste)** — distributes across cells starting from the focused one.</li><li>**Ctrl/Cmd+C (copy)** — copies the full code from any focused cell. The default `<input>.value` is just one char; intercept and write the full string to clipboard.</li><li>**Enter** — bubbles up; consumers can listen for "Enter to submit" semantics on the root or on a parent form.</li></ul> |
| **Tab semantics** | core directive | **Only the first non-empty cell is in the tab order**, or the first cell when empty. Subsequent cells are `tabindex="-1"`. This is the standard pattern: Tab into the widget lands on the natural editing position, Shift+Tab leaves to the previous form field. Implemented via `KjRovingTabindex` on the root with each cell as `kjRovingTabindexItem`. **Caveat:** the roving directive's default arrow-key handling fights our cell-specific arrow-key behavior (clear-on-backspace etc.). **Decision:** do **not** use `KjRovingTabindex`; implement the tabindex toggle manually in `KjInputOtp` (one `tabindex="0"` cell at a time, the rest `tabindex="-1"`), and own the arrow keys in `KjInputOtpCell`. The roving directive is too opinionated about which keys mean "next item" for this case. Cross-reference noted; the rule "use existing primitives" yields here for fit. |
| **Focus-visible** | core directive (cell) | `KjFocusRing` composed on each cell. Same `data-focus-visible` signal as `KjInput`. Themes draw the keyboard ring around the focused cell. |
| **Focus management on completion** | core directive (root) | When the value reaches `kjLength`, focus is **left on the last cell** (not auto-blurred). The `kjAutoSubmit` output fires; if the consumer dispatches focus to a "Verify" button, that's their choice. Auto-blurring would skip the visual confirmation that the last char landed. |
| **Touch target ≥ 44×44** | wrapper CSS | Each cell is square at 44×44 minimum on `md`. Inter-cell gap ≥ 8px so adjacent cells don't merge into one tap zone. Documented in the wrapper's CSS contract. |
| **Color/contrast** | themes layer | Each cell uses the same `--kj-color-base-100` / `--kj-color-base-content` tokens as `KjInput`. The "current cell" indicator (caret or block) must reach 3:1 against the cell background per WCAG 1.4.11 (non-text contrast). |
| **Live announcement on completion** | core directive (root) | Root composes `KjLiveRegion` (`kjPoliteness="polite"`) and calls `region.announce('Code complete')` when the value first reaches `kjLength` and `region.announce('Code invalid')` when `kjInvalid` becomes true after a complete code. Without this, screen readers don't know the user successfully filled the field. The field's error message handles invalid announcements via `role="alert"`, but "code complete" is a positive cue with no error counterpart, so the live region earns its keep. |
| **Autofill — `autocomplete="one-time-code"`** | core directive | Set on the **first** cell (and only the first) in N-input mode. Set on the **single real input** in single-input mode. iOS Safari and Chrome on Android both surface the SMS autofill suggestion based on the focused field's autocomplete token; placing it on the first cell is the convention. When the OS auto-fills the first cell with the **whole code** (which is the actual behavior — the OS writes the full value to the focused input as if pasted), the directive's paste/oversize-input handler distributes it to subsequent cells. |
| **`inputmode`** | core directive (cell) | `inputmode="numeric"` for digits, `inputmode="text"` for alphanumeric / regex. Drives the mobile keyboard layout. |
| **`pattern`** | core directive (cell) | `pattern="[0-9]*"` for digits (extra hint for older iOS keyboards). For regex char-sets, the pattern is **not** set on the input element (HTML `pattern` is a full-string match, not per-char). |
| **`autocapitalize="off"` / `autocorrect="off"` / `spellcheck="false"`** | core directive (cell) | All three off — autocomplete suggestions on a digit cell are noise. |
| **Reduced motion** | n/a | No animations on focus / advance. The change of focus is instant. |

**Where it lives.** Root owns: `role="group"`, `aria-labelledby`,
`aria-describedby`, `aria-invalid` (both top-level and propagated),
`aria-required`, the live region, and the tabindex policy. Cell owns: per-cell
`aria-label`, `inputmode`, `autocomplete` on cell 0 only, key handlers,
`aria-invalid` mirror, `disabled` / `readonly`. The form-field linkage
(label id, hint id, error id) is bidirectional just like `KjInput` —
proposed in `input.md`'s Open questions, applies here unchanged.

## Composition model

**Two collaborating directives, one mandatory context.** The standard
(N-input) mode renders into:

```html
<div kjInputOtp [kjLength]="6" [kjCharSet]="'digits'" [(ngModel)]="code">
  @for (i of [0,1,2,3,4,5]; track i) {
    <input kjInputOtpCell [kjIndex]="i" />
  }
</div>
```

The cell directive reads its index, registers itself with the context, and
keys its character off `ctx.value()[index]`. The root computes the value as
the join of all cell characters and pushes it through `KjFormControl`.

The wrapper component (`<kj-input-otp>`) renders this `@for` for the
consumer:

```html
<kj-input-otp [kjLength]="6" [(ngModel)]="code" />
```

**Single-input mode** swaps the cell directive for a presentational
`KjInputOtpSlot`:

```html
<div kjInputOtp [kjLength]="6" [kjSingleInput]="true" [(ngModel)]="code">
  <input kjInputOtpRealInput />  <!-- visually hidden, owns focus -->
  @for (i of [0,1,2,3,4,5]; track i) {
    <span kjInputOtpSlot [kjIndex]="i">{{ ctx.value()[i] || '' }}</span>
  }
</div>
```

`KjInputOtpRealInput` is the headless directive on the visually-hidden real
input that owns the value, autocomplete, paste, keyboard, and selection
range. `KjInputOtpSlot` is a presentational marker (`aria-hidden="true"`,
`role="presentation"`) that the parent uses to find slot elements for caret
positioning. In this mode the slots are **not** focusable; click on a slot
re-positions the caret in the real input via `setSelectionRange(index, index + 1)`.

### Context

```ts
export interface KjInputOtpContext {
  /** The full concatenated value. */
  value: Signal<string>;
  /** Total cell count. */
  length: Signal<number>;
  /** Whether the widget is disabled. */
  disabled: Signal<boolean>;
  /** Whether the widget is readonly. */
  readonly: Signal<boolean>;
  /** Whether `kjMask` is on. */
  masked: Signal<boolean>;
  /** Char set spec. */
  charSet: Signal<'digits' | 'alphanumeric' | RegExp>;
  /** Currently focused cell index, or -1 if none. */
  focusedIndex: Signal<number>;

  /** Cell pushes its new char (or '') upstream. The root re-computes value. */
  setCellValue(index: number, char: string): void;
  /** Cell asks the root to move focus by delta. */
  moveFocus(delta: number): void;
  /** Cell asks the root to focus a specific index (clamped). */
  focusIndex(index: number): void;
  /** Cell delegates the paste event to the root. */
  handlePaste(event: ClipboardEvent, fromIndex: number): void;
  /** Cell delegates copy to the root (root writes the whole code). */
  handleCopy(event: ClipboardEvent): void;
  /** Cell registers / unregisters its element ref so the root can call .focus(). */
  registerCell(index: number, el: HTMLInputElement): void;
  unregisterCell(index: number): void;
}
export const KJ_INPUT_OTP = new InjectionToken<KjInputOtpContext>('KjInputOtp');
```

### Directive shapes

```ts
@Directive({
  selector: '[kjInputOtp]',
  standalone: true,
  exportAs: 'kjInputOtp',
  hostDirectives: [
    { directive: KjVariant,  inputs: ['kjVariant'] },
    { directive: KjSize,     inputs: ['kjSize'] },
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFormControl,
    KjLiveRegion,
  ],
  providers: [
    { provide: KJ_INPUT_OTP, useExisting: forwardRef(() => KjInputOtp) },
    ...bindPresets(KJ_INPUT_OTP_CONFIG),
  ],
  host: {
    'role': 'group',
    '[attr.aria-invalid]': 'formCtrl.touched() && kjInvalid() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.data-invalid]': 'formCtrl.touched() && kjInvalid() ? "" : null',
  },
})
export class KjInputOtp implements KjInputOtpContext { /* ... */ }
```

```ts
@Directive({
  selector: 'input[kjInputOtpCell]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    'type': 'text',
    'maxlength': '1',
    'autocapitalize': 'off',
    'autocorrect': 'off',
    'spellcheck': 'false',
    '[attr.inputmode]': 'inputmode()',
    '[attr.pattern]': 'pattern()',
    '[attr.autocomplete]': 'kjIndex() === 0 ? "one-time-code" : "off"',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-invalid]': 'ctx.value() && touched() && invalid() ? "true" : null',
    '[attr.tabindex]': 'isTabStop() ? "0" : "-1"',
    '[attr.disabled]': 'ctx.disabled() ? "" : null',
    '[attr.readonly]': 'ctx.readonly() ? "" : null',
    '[attr.type]': 'ctx.masked() ? "password" : "text"',
    '[value]': 'ctx.value()[kjIndex()] ?? ""',
    '(input)': 'onInput($event)',
    '(keydown)': 'onKeydown($event)',
    '(paste)': 'ctx.handlePaste($event, kjIndex())',
    '(copy)': 'ctx.handleCopy($event)',
    '(focus)': 'ctx.focusIndex(kjIndex())',
  },
})
export class KjInputOtpCell { /* ... */ }
```

The cell does **not** compose `KjInput` directly because `KjInput` brings
its own `KjFormControl` (which would create a per-cell CVA — wrong; the
form control lives only on the root). It instead duplicates the small set
of host bindings that apply to a leaf input. If `KjInput`'s body grows
features that should apply per-cell (e.g. `KjVariant` on each cell so the
"focused cell" gets a different variant), refactor `KjInput` so its
behaviors are decomposable — but that's a refactor of `KjInput`, not a
constraint on this directive.

**Cross-component pointers:**

- [`input.md`](./input.md) — parent. Most of the per-cell host wiring
  (`aria-invalid`, `data-invalid`, `KjFocusRing`, ARIA-disabled stance) is
  copy-pasted from there. Any improvements landed in `KjInput` (auto-id
  minting, `aria-required` derivation, `aria-describedby` chain) should
  flow into `KjInputOtpCell` at the same time.
- [`mask-input.md`](./mask-input.md) — sibling using same single-string CVA
  on top of fixed-format input. Extract a shared
  **`packages/core/src/utils/char-set.ts`** with helpers for
  `'digits'` / `'alphanumeric'` / `RegExp` → filter regex + `inputmode` +
  `pattern` triple. Both directives consume it.
- [`field.md`](./field.md) — wraps the OTP for a single label / hint /
  error. The bidirectional id wiring proposed in `input.md` Open questions
  is the same wiring needed here, applied to the root.
- [`form.md`](./form.md) / Form spec — the root's CVA is `string`. Document
  that `Validators.required` triggers when the string is empty and that
  `Validators.minLength(length)` is the idiomatic way to require
  completeness. `Validators.pattern(/^\d{6}$/)` works for both
  completeness and char-set (but duplicates the directive's own
  `kjCharSet` filter — the directive prevents bad chars from landing,
  the validator catches consumer-bypass cases).
- [`../actions/button.md`](../actions/button.md) — the "Resend code" and
  "Verify" buttons that ship next to OTP in real designs are
  `KjButton`s. Document the recipe in the OTP examples; not part of this
  directive.
- [`../primitives/roving-tabindex.md`](../primitives/roving-tabindex.md)
  *(if/when written)* — explicitly **not** used, by design. The directive
  manages tabindex itself because the OTP keyboard contract is incompatible
  with the roving primitive's arrow-key default. Document this exception so
  the rule "use existing primitives where possible" doesn't drag a future
  contributor into refactoring it.

## Inputs / Outputs / Models — `kj`-prefixed

### Root directive (`KjInputOtp`, selector `[kjInputOtp]`)

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjLength` | `input<number>(6)` | `6` | Cell count. Common: 4, 6, 8. |
| `kjCharSet` | `input<'digits' \| 'alphanumeric' \| RegExp>('digits')` | `'digits'` | Drives `inputmode`, `pattern`, and the input/paste filter. |
| `kjMask` | `input<boolean>(false)` | `false` | When true, cells render `type="password"`. |
| `kjSingleInput` | `input<boolean>(false)` | `false` | Switches to the visually-hidden-single-input rendering mode. Default is N visible inputs. |
| `kjAutoSubmit` | `input<boolean>(false)` | `false` | When true, fires `kjComplete` once the value reaches `kjLength`. |
| `kjInvalid` | `input<boolean>(false)` | `false` | Reflected via `aria-invalid` (touched-gated) and propagated to cells. |
| `kjDisabled` | forwarded via `hostDirectives` to `KjDisabled` | `false` | Disables every cell. |
| `kjReadonly` | `input<boolean>(false)` | `false` | Read-only every cell. |
| `kjVariant` | forwarded to `KjVariant` | `'default'` | Themes via `data-variant`. |
| `kjSize` | forwarded to `KjSize` | `'md'` | Themes via `data-size`. |
| `kjCellLabel` | `input<(index: number, length: number) => string>(...)` | `(i, n) => \`Code digit ${i + 1} of ${n}\`` | i18n hook for per-cell `aria-label`. |
| `kjAriaLabel` | `input<string \| undefined>(undefined)` | `undefined` | When there is no `KjFormField` parent and no external `aria-labelledby`. Set on the root, applies to the whole widget. |
| `kjComplete` | `output<string>()` | — | Emitted the first time value reaches `kjLength`. Re-emitted on subsequent completions after editing back to incomplete and re-completing. |
| `kjPasted` | `output<string>()` | — | Emitted after a paste distributes characters. Useful for analytics; `kjComplete` is the canonical "user has entered the code" signal. |

Bidirectional value flow goes through `KjFormControl` exactly like
`KjInput` — there is **no `kjValue` / `kjValueChange` model on the
directive**. Callers use `[(ngModel)]` or `[formControl]`. The CVA value
is `string | null`; the directive normalizes incoming `null` to `''`
internally and writes back `''` on clear.

### Cell directive (`KjInputOtpCell`, selector `input[kjInputOtpCell]`)

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjIndex` | `input<number>(required)` | — | Position within the parent. **Required.** Validates against `ctx.length()` in dev. |

Cell exposes no other public inputs; everything else is read from the
context. Cell has no outputs — events flow through the context's methods
to the root, which then emits.

### Wrapper component (`KjInputOtpComponent`, selector `kj-input-otp`)

Re-exposes the root's surface plus a structural helper:

| Name | Type | Default | Notes |
|---|---|---|---|
| `kjLength` | `input<number>(6)` | `6` | Forwarded. |
| `kjCharSet` | `input<'digits' \| 'alphanumeric' \| RegExp>('digits')` | `'digits'` | Forwarded. |
| `kjMask` | `input<boolean>(false)` | `false` | Forwarded. |
| `kjSingleInput` | `input<boolean>(false)` | `false` | Forwarded. |
| `kjAutoSubmit` | `input<boolean>(false)` | `false` | Forwarded. |
| `kjInvalid` | `input<boolean>(false)` | `false` | Forwarded. |
| `kjDisabled` | `input<boolean>(false)` | `false` | Forwarded. |
| `kjReadonly` | `input<boolean>(false)` | `false` | Forwarded. |
| `kjVariant` | `input<KjVariantName>('default')` | `'default'` | Forwarded. |
| `kjSize` | `input<KjSizeName>('md')` | `'md'` | Forwarded. |
| `kjCellLabel` | `input<(index: number, length: number) => string>` | default formatter | Forwarded. |
| `kjAriaLabel` | `input<string \| undefined>(undefined)` | `undefined` | Forwarded. |
| `kjSeparatorAfter` | `input<readonly number[]>([])` | `[]` | Indices after which to render a visual separator (`-`). E.g. `[2]` for a 6-digit code rendered as `123-456`. Wrapper-only — purely visual; the value never contains the separator. |
| `kjComplete` | `output<string>()` | — | Forwarded. |
| `kjPasted` | `output<string>()` | — | Forwarded. |

All `kj`-prefixed names follow shape (A) — property name carries the prefix —
since the wrapper selector already starts with `kj`. This obeys
`rules/code_style.md` §"Inputs, Outputs, and Models — `kj` prefix is
mandatory" out of the box (unlike the existing `KjInputComponent`, which
uses unprefixed `type` / `value` / `placeholder` — see `input.md` Open
questions for the parallel cleanup task).

## Examples to ship

Match the structure under `packages/components/src/button/`:

1. **Default** — `input-otp.example.ts`. Six-digit numeric OTP with
   `[(ngModel)]`. The 80% case.
2. **Reactive form** — `input-otp.reactive.example.ts`. `Validators.required`
   + `Validators.minLength(6)`. Demonstrates the touched-gated invalid
   state and the field error showing only after blur or first
   completion attempt.
3. **Length variants** — `input-otp.lengths.example.ts`. 4-digit, 6-digit,
   8-digit side-by-side.
4. **Alphanumeric** — `input-otp.alphanumeric.example.ts`. `kjCharSet="alphanumeric"`
   with an 8-character backup-code style code.
5. **Custom regex char set** — `input-otp.regex.example.ts`. Hex code
   (`/[0-9a-fA-F]/`) — useful for crypto / 2FA recovery codes.
6. **Masked** — `input-otp.masked.example.ts`. `[kjMask]="true"` for a
   6-digit PIN re-entry flow.
7. **Auto-submit** — `input-otp.autosubmit.example.ts`. `(kjComplete)`
   wired to a service call. Demonstrates the focus-stays-on-last-cell
   policy.
8. **Separator** — `input-otp.separator.example.ts`.
   `[kjSeparatorAfter]="[2]"` for a 6-digit code rendered as `123-456`.
9. **Single-input mode** — `input-otp.single.example.ts`.
   `[kjSingleInput]="true"`. Documented as the iOS-autofill-optimized
   variant.
10. **Disabled / readonly** — `input-otp.disabled.example.ts`. Both root
    `kjDisabled` and form-driven `formCtrl.disable()`.
11. **In a field** — `input-otp.field.example.ts`. Wrapped in
    `<div kjFormField>` with `<label kjFormLabel>`, hint, and error.
12. **With Resend recipe** — `input-otp.resend.example.ts`. OTP +
    `KjButton` "Resend code" with countdown timer. Pure recipe — no API
    additions.
13. **Configured presets** — `input-otp.configured.example.ts`. Adds a
    `brand` variant via `provideKjInputOtp`.

## Open questions / risks

- **Default mode: N inputs vs single-input.** N inputs is the more
  *legible* pattern (each cell has a clear purpose, mobile users tap a
  specific cell to edit), but single-input is the more *robust* one
  (iOS/Android SMS autofill writes to the focused input — the OS-level
  flow assumes one input, and the multi-input case relies on the
  directive's paste-distribute path catching the over-length write).
  Recommendation: **N inputs as default**, with `kjSingleInput` available
  for autofill-critical flows. Document the trade-off prominently in the
  README. Revisit if real-world bug reports show iOS autofill failing in
  N-input mode at >1% rate.
- **Backspace semantics.** Two reasonable variants: (a) clear-then-stay
  (PrimeNG, requires a second Backspace to delete the previous char), (b)
  clear-and-move-back (input-otp / shadcn — single Backspace deletes a
  char). We pick (b) above; document the choice and provide no flag (the
  divergence is too small to expose).
- **`KjRovingTabindex` non-use.** The OTP keyboard contract conflicts
  with the roving primitive's arrow-key handling (Backspace, Home/End,
  cell-specific consumption). We implement tabindex policy manually.
  Flag this in the directive's TSDoc so future contributors don't try
  to "DRY it up".
- **Per-cell `KjInput` reuse.** The cell directive re-implements ~10
  host bindings that are also in `KjInput`. We don't compose `KjInput`
  on the cell because that would also pull in `KjFormControl` per cell.
  Two paths to deduplicate: (i) split `KjInput` into a "host bindings
  only" inner directive (`KjInputBase`) without `KjFormControl`, and have
  both `KjInput` and `KjInputOtpCell` compose it; (ii) accept the small
  duplication. Recommendation: **(i) once `KjInputOtp` lands**, since
  the same problem will appear for `KjMaskInput` and `KjNumberInput`'s
  spinner inner buttons.
- **`autocomplete="one-time-code"` on first cell only — is that right?**
  WebAIM and Apple docs confirm this is the standard convention. Setting
  it on every cell would multiply autofill prompts. Confirmed via
  PrimeNG and `input-otp` library both doing the same. Risk: a future
  iOS Safari version changes behavior; covered by browser-version
  smoke tests in the apps workspace.
- **iOS autofill writes the full code into one input.** When the user
  taps "From Messages" in the iOS autofill suggestion, the OS writes
  the full 6-digit code into the focused input (which is cell 0). Our
  `(input)` handler must detect that `event.target.value.length > 1`
  and route through the paste-distribute path. This is a one-line check
  but easy to miss; cover it explicitly with a unit test
  (`onInput` with `{ value: '123456' }` distributes correctly).
- **Copy semantics — single char or whole code?** Native
  `<input>.value` is a single char per cell, so default Ctrl+C copies
  one digit — useless. Override `(copy)` to write the whole
  concatenated code via `event.clipboardData.setData('text/plain', ctx.value())`
  and `event.preventDefault()`. Same logic in single-input mode is
  already correct because there's one input with the full value.
- **Select-all (Ctrl/Cmd+A).** In N-input mode there's no native
  cross-input selection. Options: (a) intercept Ctrl+A and add a CSS
  state to all cells to *visualize* selection, then on next keypress
  clear all and write the new char (effectively "select-all then
  type to replace"); (b) do nothing; (c) say "use single-input mode".
  Recommendation: **(b)** — select-all on a 6-digit code is a niche
  ask, and the visual-only fake selection is more confusing than
  useful. Document.
- **RTL.** Cells are laid out left-to-right in DOM order, but with
  `dir="rtl"` the visual order reverses. Arrow-left/right must follow
  *visual* direction, not DOM order, so `dir="rtl"` flips them. Use
  `getComputedStyle(host).direction` once on focus / keydown. Test
  with Arabic and Hebrew locales.
- **Live-region duplication.** If the consumer also wraps in
  `KjFormField` and the field has its own `role="alert"` error region,
  we don't want to double-announce. Coordinate: `KjLiveRegion` on the
  root only fires for **completion** ("Code complete"), never for
  errors — errors are the field's job. Document the contract.
- **Composition vs structural directive for cells.** We chose
  `<input kjInputOtpCell [kjIndex]="i">` inside an `@for`. Alternative:
  `*kjInputOtpCell` structural directive that takes care of the loop
  itself. Considered and rejected — the consumer loses control over the
  template (e.g. inserting a separator at index 2), and the structural
  shape adds zero compared to a 1-line `@for`.
- **Caret tracking in single-input mode.** The fake-cell rendering
  needs to know which cell to highlight as "current". This is the real
  input's `selectionStart` value, read on `(select)`,
  `(keyup)`, and `(click)`. Expose `focusedIndex` on the context for
  `KjInputOtpSlot` to consume. Implementation note, not a public API
  decision.
- **Form-level `disabled`.** When the form control is disabled via
  `formGroup.disable()`, the root's `KjFormControl.disabled()` flips
  to `true`. Cells must read this through the context (we pull
  `disabled` from both `KjDisabled.kjDisabled` and
  `KjFormControl.disabled` and OR them). Same dual-source pattern as
  `KjInput`; carry forward the policy decision made there.
- **SSR.** Cells are rendered on the server; the value-read effect runs
  in the browser only after hydration. `autocomplete="one-time-code"`
  static attribute is safe under SSR. The `KjLiveRegion` setTimeout
  also only runs in the browser. No SSR pitfalls expected; cover with
  a smoke test in the apps workspace.
- **Right-click paste.** The `(paste)` listener fires for both
  Ctrl/Cmd+V and right-click → paste. No special handling needed.
- **Programmatic `setValue('123456')` from forms.** Writes a 6-char
  string to the root's CVA, which means each cell's
  `[value]="ctx.value()[index]"` binding picks up its char. Focus does
  **not** auto-advance on programmatic write (focus only moves on
  user input). Test explicitly.
- **Empty / partial value on init.** When `[(ngModel)]` is `null` or
  `''`, the value is `''`; cells render empty. When it's `'12'`, only
  cells 0-1 render their chars; cells 2-5 render empty. Tab focus
  goes to cell 2 (the first empty one) — implement a "first-empty-cell"
  convention for the tab stop so refilling a partial code is natural.
  PrimeNG does this; we should too.
- **Loading state.** Defer. The "Verify" button next to the OTP is
  where the loading spinner lives, not the OTP itself. If a future
  product wants an inline loading state (e.g. async code validation
  on each char), expose a `kjLoading` flag and overlay a `KjSpinner`
  on the last cell. Out of scope for v1.
