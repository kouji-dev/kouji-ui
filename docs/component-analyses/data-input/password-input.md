# Password Input

A text field for secret entry. Layered on top of the existing `KjInput`
directive (`packages/core/src/input/input.ts`) so it inherits forms
integration, focus-ring, ARIA-disabled, and `aria-invalid` reflection
unchanged. Adds three concerns specific to passwords: a **reveal toggle**
that flips `type="password" ⇄ "text"`, an **optional strength meter**, and
a **Caps Lock warning** announced to assistive tech. Three small directives
collaborate through a shared context — `KjPasswordInput` (root, on the
`<input>`), `[kjPasswordToggle]` (on the reveal button), and
`[kjPasswordStrength]` (on the meter element).

Cross-references:
- [`input.md`](./input.md) — parent directive. `KjPasswordInput` composes
  `KjInput` via `hostDirectives` so the same form-control / invalid /
  disabled / focus-ring contract is in effect; this doc only documents the
  delta.
- [`../actions/button.md`](../actions/button.md) — the reveal toggle is a
  `KjButton` with `[(kjPressed)]`. The toggle directive is a thin marker
  that wires `aria-controls` and the press handler; it does not re-implement
  pressed semantics.
- [`progress-bar.md`](./progress-bar.md) — strength meter renders a
  `KjProgressBar` (or matches its ARIA contract when consumers prefer
  segmented bars). `KjPasswordStrength` does not own bar visuals; it owns
  score computation and `aria-describedby` wiring.
- [`field.md`](./field.md) — label + hint + error wrapper. Password Input
  is a leaf control; `KjField` provides the `<label for>`, hint id, and
  error id that this directive consumes via `aria-describedby` /
  `aria-labelledby` (already inherited from `KjInput` once Field ships).

## Source comparison

### PrimeNG — `p-password`

A self-contained component on a wrapper `<input>` with these inputs:
`feedback` (boolean, default `true` — toggles the popover with strength
meter + label list), `toggleMask` (boolean — adds an inline eye button),
`promptLabel` / `weakLabel` / `mediumLabel` / `strongLabel` (i18n strings
shown inside the feedback popover), `mediumRegex` / `strongRegex`
(consumer-replaceable scoring regex pair), `inputStyleClass` / `panelStyle`
/ `panelStyleClass` for theming, and standard pass-throughs (`disabled`,
`placeholder`, `feedback`, `appendTo`, etc.). Forms integration is via
PrimeNG's standard CVA. Reveal button has an `aria-label` driven by
`hideIcon` / `showIcon` configuration. Strength is a single linear bar
inside a hover/focus-popover that also lists rules ("At least one
lowercase", "At least one number", …). The popover is `role="presentation"`
and the meter inside it has no explicit `role="progressbar"` — accessibility
of the strength feedback is weak. Caps Lock detection is **not** built in.

### Angular Material — no first-class password input

Material's [Form Field documentation](https://material.angular.dev/components/form-field)
explicitly does not provide a password component. The canonical pattern in
the docs is:

```html
<mat-form-field>
  <mat-label>Password</mat-label>
  <input matInput [type]="hide() ? 'password' : 'text'">
  <button matIconButton matSuffix (click)="hide.set(!hide())"
    [attr.aria-label]="'Hide password'" [attr.aria-pressed]="!hide()">
    <mat-icon>{{ hide() ? 'visibility_off' : 'visibility' }}</mat-icon>
  </button>
</mat-form-field>
```

Strength meter, Caps Lock warning, autocomplete tokens, and the
`aria-pressed` ↔ button-state mapping are all consumer responsibility.
Material accepts the duplication cost of having every consumer hand-roll
these in exchange for not committing to a strength algorithm. We do not —
see "Decision" below.

### shadcn/ui — gap

shadcn ships `<Input>` and `<Button>` but **no** `<PasswordInput>`. The
[community recipe](https://ui.shadcn.com/docs/components/input) wraps
`Input type="password"` with an absolutely-positioned eye button and uses
`zxcvbn` (or hand-rolled scoring) for the meter. `aria-pressed` on the
toggle, `autocomplete` tokens, and Caps Lock warnings are ad-hoc per
project. The gap is the same one Material accepts; the recipe pattern is
the same one Material recommends.

**Pattern picked up.** kouji follows the Material/shadcn split (input +
button + meter, not a single fused widget) but ships them as **three
collaborating directives in core** so consumers don't re-derive the wiring.
This matches kouji's segmentation philosophy (compare Button Group, Tabs)
and lets the toggle be replaced with any custom button — the contract is
"any element with `[kjPasswordToggle]`", not a hard-coded eye icon.

## Decision: needs a core directive?

**Yes — three of them.** Distinct responsibilities, not collapsible into
one:

1. **`KjPasswordInput` (root, on the `<input>`).** Owns the
   `type="password" ⇄ "text"` swap, the Caps Lock listener, the
   `autocomplete` default, the strength score (when a meter is present),
   and the `KJ_PASSWORD_INPUT` context. Composes `KjInput` so all the
   parent's contracts (CVA, `aria-invalid`, focus-ring, ARIA-disabled)
   apply unchanged.
2. **`KjPasswordToggle` (on the reveal `<button kjButton>`).** Reads the
   context's `revealed` signal, mirrors it onto the host `KjButton`'s
   `kjPressed` model (so `aria-pressed` is set by `KjButton`, not
   reinvented), wires `aria-controls` to the input id, and provides
   `aria-label` text via a string input that defaults to "Show password" /
   "Hide password" based on state.
3. **`KjPasswordStrength` (on the meter element).** Subscribes to the
   context's `score` signal, exposes it as a `model` for direct binding,
   reflects `aria-valuemin`/`max`/`now`/`valuetext`, and registers its id
   into `KjInput`'s `aria-describedby` chain via `KjAriaDescribedBy`.

Items 1 and 3 are stateful. Item 2 is a wiring directive (composes
`KjButton`, sets a few attributes, hooks click) — short, but it earns its
keep by enforcing the `aria-controls` link and the press-state mirror that
consumers consistently miss.

A pure-CSS or "just use `<kj-input type='password'>` and your own button"
recipe would push three accessibility traps onto consumers (toggle that
forgets `aria-pressed`, meter without `aria-describedby` linkage, missing
Caps Lock warning). Material's stance is "consumers do that" — ours, given
the roadmap explicitly lists Password Input, is "the library does that".

## Base features

- **Reveal toggle.** Default `false` (input renders as `type="password"`).
  Toggling flips the native `type` attribute on the input. Does not blur
  the input on toggle (would lose caret position); cursor position is
  preserved via the context updating the attribute synchronously.
- **Strength meter (optional).** When a `[kjPasswordStrength]` element is
  present in the same DOM scope as the root, `KjPasswordInput` runs a
  scoring function on every value change. Score is `0..4` (matching
  `zxcvbn`'s scale, the de-facto standard) plus a human label
  (`"too weak" | "weak" | "fair" | "good" | "strong"`). Scoring algorithm
  is a small built-in heuristic by default (length + character-class
  diversity), replaceable via `[kjStrengthScorer]` for consumers who want
  to plug in `zxcvbn` or a server-side checker.
- **Caps Lock warning.** When the input has focus and Caps Lock is
  detected as on (via `KeyboardEvent.getModifierState('CapsLock')` on
  `keydown`), the context exposes a `capsLock` signal. Consumers render
  the warning element however they like; it must carry
  `[kjPasswordCapsLockWarning]` (a fourth, very small directive — sets
  `role="status"` + `aria-live="polite"` + `[hidden]` reflecting the
  signal). Without the directive the signal still flips, but no announcement
  is made — that is the consumer's choice.
- **Autocomplete defaults.** `kjAutocomplete` input with three values:
  `'current-password'` (default — login forms),
  `'new-password'` (sign-up / change-password forms — also opts out of
  password manager autofill on the next paired field), and
  `'off'`. Forwarded to the input's native `autocomplete` attribute. **Not**
  a free-form string — restricting to the three sensible values catches
  the common mis-spelling (`autocomplete="password"`, which browsers
  silently ignore).
- **`maxLength`.** Optional, forwarded to native `maxlength`. Worth
  exposing because long-password truncation is the most common form bug
  and the strength meter should agree with the limit.
- **Element flexibility.** Root attaches to `<input>` only — does not work
  on `<textarea>` (passwords aren't multi-line by spec). The toggle
  attaches to any `KjButton`-compatible element (`<button>` or `<a>` —
  though anchors as toggles is silly, we don't forbid it). The meter and
  Caps Lock directives attach to any element.
- **State model.** Stateful: `revealed` (boolean signal), `capsLock`
  (boolean signal), `score` (`0..4` signal). All exposed read-only on the
  context. `revealed` is also a `model<boolean>(false)` on the root so
  consumers can two-way-bind it (e.g. for "show password by default" on a
  trusted-device screen).

## Accessibility (WCAG 2.1 AAA)

| Concern | Where | Mechanism |
|---|---|---|
| **Role (input)** | inherited `KjInput` | Native `<input type="password">` (or `"text"` when revealed). No explicit `role`. |
| **`aria-invalid`** | inherited `KjInput` | `formCtrl.touched() && kjInvalid()` — same wiring as Input. |
| **`aria-disabled`** | inherited `KjInput` (via `KjDisabled`) | Inherited unchanged. |
| **`aria-describedby`** | `KjPasswordStrength` + `KjPasswordCapsLockWarning` | Both register their host id into the input's `aria-describedby` chain via `KjAriaDescribedBy`. The strength meter id and the caps-lock warning id are appended to whatever Field already wires (hint, error). |
| **Toggle role** | `KjPasswordToggle` (via `KjButton`) | Native `<button>` element. `KjButton` host. |
| **Toggle `aria-pressed`** | `KjPasswordToggle` → `KjButton.kjPressed` | Mirror, not re-implementation. The toggle sets `kjPressed` on the host button to the context's `revealed()` signal; `KjButton` already reflects `aria-pressed`. WCAG 4.1.2. |
| **Toggle `aria-label`** | `KjPasswordToggle` | `kjShowLabel` / `kjHideLabel` inputs (defaults `"Show password"` / `"Hide password"`). Reflected as `[attr.aria-label]` on the button — switches based on `revealed()`. Required for icon-only buttons (WCAG 2.4.6). |
| **Toggle `aria-controls`** | `KjPasswordToggle` | Set to the input's id (auto-generated if the consumer didn't set one — see open questions). Lets AT users discover that the button targets *this* input. WCAG 1.3.1. |
| **Strength meter role** | `KjPasswordStrength` | `role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax="4"`, `aria-valuenow="{score}"`, `aria-valuetext="{label}"` (so AT reads "fair" rather than "2"). WCAG 4.1.2. |
| **Strength meter labelling** | `KjPasswordStrength` | `aria-label` defaulted to `"Password strength"`, overridable via `kjAriaLabel`. The meter is **not** `aria-hidden` — sighted-impaired users need the score read. |
| **Strength meter score change** | `KjPasswordStrength` | Score updates do **not** announce via live-region by default (would flood AT on every keystroke). The meter is described-by'd from the input — AT reads it on focus and re-reads via the `aria-valuetext` change on demand. Consumers wanting per-keystroke announcement set `kjAnnounce="true"` to wrap a `KjLiveRegion`. |
| **Caps Lock announcement** | `KjPasswordCapsLockWarning` | `role="status"` + `aria-live="polite"` + `[hidden]` reflecting `capsLock()`. `polite` (not `assertive`) — Caps Lock is informative, not urgent; `assertive` would interrupt the user mid-type. WCAG 4.1.3. |
| **Reveal toggle and password managers** | `KjPasswordInput` | When `kjAutocomplete="new-password"`, the directive sets `autocomplete="new-password"` on the input — browsers correctly skip autofill. When revealed, **does not** re-enter autocomplete (some browsers cache plain-text reveals; the directive does not opt into that risk). |
| **Click suppression while disabled** | inherited `KjButton` | The toggle button inherits `KjButton`'s capture-phase click suppression; toggling while disabled is impossible. WCAG 4.1.2. |
| **Focus management** | none | Toggling reveal does not move focus. Caps Lock warning is `aria-live`, not focus-grabbing. No overlay, no trap. |
| **Touch target ≥ 44×44** | `KjButton`, wrapper CSS | Toggle is `kjSize="icon"` by default in the wrapper — inherits the 44×44 floor. WCAG 2.5.5. |
| **Contrast** | themes layer | Strength meter colour ramp (red → amber → green) must hit ≥3:1 against the track and ≥7:1 against any text labels per AAA. Themes own the ramp; doc this requirement in the strength-meter token spec. |
| **Visible label / programmatic association** | `KjField` | Provided by Field via `<label for>`. Password Input does not own labelling. WCAG 1.3.1, 3.3.2. |

**Where it lives:** the input-side ARIA (`aria-invalid`, `aria-disabled`,
`aria-describedby`) is on `KjInput` (parent). The toggle ARIA
(`aria-pressed`, `aria-label`, `aria-controls`) is on `KjButton` +
`KjPasswordToggle`. The meter ARIA is on `KjPasswordStrength`. The Caps
Lock ARIA is on `KjPasswordCapsLockWarning`. Each piece sits in the
directive whose host element it describes — no cross-host attribute
forwarding.

## Composition model

```
password-input/
  password-input.ts                   ← KjPasswordInput (root, on the <input>)
  password-toggle.ts                  ← KjPasswordToggle (on the reveal button)
  password-strength.ts                ← KjPasswordStrength (on the meter)
  password-caps-lock-warning.ts       ← KjPasswordCapsLockWarning (on the warning)
  password-input.context.ts           ← KjPasswordInputContext + KJ_PASSWORD_INPUT token
  password-input.scorer.ts            ← default heuristic scorer (pure function)
  password-input.spec.ts
  password-toggle.spec.ts
  password-strength.spec.ts
  password-caps-lock-warning.spec.ts
  index.ts
```

**`KjPasswordInput`** (selector `[kjPasswordInput]`)
- Provides `KJ_PASSWORD_INPUT` context.
- `hostDirectives`:
  ```ts
  hostDirectives: [
    {
      directive: KjInput,
      inputs: ['kjDisabled', 'kjInvalid'],
    },
  ],
  ```
  Inherits `KjFormControl`, `KjFocusRing`, `KjDisabled` transitively
  through `KjInput`'s own `hostDirectives` — no need to re-compose them
  here, and re-composing would create duplicate `aria-disabled` reflectors
  (same trap `KjButton` documents).
- Host bindings:
  ```ts
  host: {
    '[attr.type]': 'revealed() ? "text" : "password"',
    '[attr.autocomplete]': 'kjAutocomplete()',
    '[attr.maxlength]': 'kjMaxLength() ?? null',
    '(keydown)': 'onKeydown($event)',
    '(blur)': 'capsLock.set(false)',  // clear stale caps-lock state on blur
  }
  ```
- Reads the `KjInput.formCtrl.value()` signal in an `effect()` to drive
  `score`. Exposes `score` lazily — the scorer runs only when at least
  one `KjPasswordStrength` has registered (avoid wasted work on simple
  login forms).
- Generates a host id if the element doesn't have one (used by the toggle's
  `aria-controls` and by `aria-describedby` wiring). Same pattern Field
  uses for label association.

**`KjPasswordToggle`** (selector `[kjPasswordToggle]`)
- Injects `KJ_PASSWORD_INPUT`.
- `hostDirectives`:
  ```ts
  hostDirectives: [
    { directive: KjButton, inputs: ['kjVariant', 'kjSize', 'kjDisabled', 'kjAriaLabel'] },
  ],
  ```
- Host bindings:
  ```ts
  host: {
    'type': 'button',                          // never submit a form by accident
    '[attr.aria-controls]': 'ctx.inputId()',
    '[attr.aria-label]': 'currentLabel()',     // computed from revealed() + kjShowLabel/kjHideLabel
    '(click)': 'ctx.toggle()',
  }
  ```
- Mirrors `ctx.revealed()` onto the host `KjButton`'s `kjPressed` via an
  `effect()` writing to the model — `aria-pressed` falls out of `KjButton`.
  This is the only reasonable way to share the press state without
  duplicating the listener.

**`KjPasswordStrength`** (selector `[kjPasswordStrength]`)
- Injects `KJ_PASSWORD_INPUT` and `KjAriaDescribedBy` (created on the input
  by `KjPasswordInput`).
- Registers itself with the context on construction so the root knows to
  run the scorer; deregisters via `DestroyRef`.
- Host bindings:
  ```ts
  host: {
    'role': 'progressbar',
    '[attr.aria-label]': 'kjAriaLabel()',
    '[attr.aria-valuemin]': '0',
    '[attr.aria-valuemax]': '4',
    '[attr.aria-valuenow]': 'ctx.score()',
    '[attr.aria-valuetext]': 'ctx.scoreLabel()',
    '[attr.data-score]': 'ctx.score()',         // styling hook
    '[attr.data-score-label]': 'ctx.scoreLabel()',
  }
  ```
- Models: exposes `kjScore` (read-only `model`) so consumers can react to
  score in their template without injecting the context.

**`KjPasswordCapsLockWarning`** (selector `[kjPasswordCapsLockWarning]`)
- Injects `KJ_PASSWORD_INPUT` and `KjAriaDescribedBy`.
- Registers itself for `aria-describedby` linkage.
- Host bindings:
  ```ts
  host: {
    'role': 'status',
    'aria-live': 'polite',
    '[hidden]': '!ctx.capsLock()',
  }
  ```
- Holds no visual; the consumer projects content (`<ng-content>`).

**Shared state — `KjPasswordInputContext`**
```ts
export type KjPasswordScore = 0 | 1 | 2 | 3 | 4;
export type KjPasswordScoreLabel =
  | 'too weak' | 'weak' | 'fair' | 'good' | 'strong';

export interface KjPasswordInputContext {
  readonly inputId: Signal<string>;
  readonly revealed: Signal<boolean>;
  readonly capsLock: Signal<boolean>;
  readonly score: Signal<KjPasswordScore>;
  readonly scoreLabel: Signal<KjPasswordScoreLabel>;
  readonly disabled: Signal<boolean>;
  toggle(): void;
  registerStrength(): () => void;        // returns deregister fn
  registerCapsLockWarning(): () => void;
}
export const KJ_PASSWORD_INPUT =
  new InjectionToken<KjPasswordInputContext>('KjPasswordInput');
```

**Why three (four) directives instead of one component?** Same logic as
Button Group: the parts are placed at different locations in the consumer's
template (icon button after the input, meter below it, warning anywhere),
so a single self-contained component would force a rigid layout. Spreading
the responsibility across small directives lets `KjField` wrap the lot
naturally and lets consumers pick exactly which features they want — login
forms typically skip the strength meter entirely.

**Why not use `KjButton`'s tri-state `kjPressed` directly without a
toggle directive?** Three things the toggle adds that a bare
`<button kjButton [(kjPressed)]>` does not:
1. `aria-controls` linkage to the input (consumers consistently forget).
2. State-aware `aria-label` switching (`"Show password"` ↔
   `"Hide password"`) without re-rendering or template `@if`.
3. Sourcing the press state from the context, not local state — so two
   toggle buttons (or a programmatic show via `kjRevealed` on the root)
   stay in sync.

The toggle directive is the cheapest place to encode all three.

**No injection-token context for the toggle alone.** The toggle, meter,
and Caps Lock warning all read the same `KJ_PASSWORD_INPUT` context
provided by the root. Single token, three consumer directives — same
shape as Tabs / Accordion.

## Inputs / Outputs / Models

### `KjPasswordInput`

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjAutocomplete` | `input` | `'current-password' \| 'new-password' \| 'off'` | `'current-password'` | Forwarded to native `autocomplete`. Restricted union — invalid strings rejected at type-check. |
| `kjMaxLength` | `input` | `number \| undefined` | `undefined` | Forwarded to native `maxlength`. |
| `kjRevealed` | `model` | `boolean` | `false` | Two-way bound; flips `type` attribute. Aliased through to the toggle context. |
| `kjStrengthScorer` | `input` | `(value: string) => KjPasswordScore` | built-in heuristic (`./password-input.scorer.ts`) | Replaceable for `zxcvbn`/server-side scoring. Pure, synchronous; async scoring would race with keystrokes — wrap your async source and update via `model` if needed. |
| `kjStrengthLabels` | `input` | `Record<KjPasswordScore, string>` | English defaults | i18n hook. Whatever string is at `kjStrengthLabels()[score()]` becomes `aria-valuetext`. |
| `kjDisabled` | `input` | `boolean` | `false` | Forwarded to host `KjInput` → `KjDisabled`. |
| `kjInvalid` | `input` | `boolean` | `false` | Forwarded to host `KjInput`. |

### `KjPasswordToggle`

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjShowLabel` | `input` | `string` | `'Show password'` | i18n. Becomes `aria-label` when password is hidden. |
| `kjHideLabel` | `input` | `string` | `'Hide password'` | i18n. Becomes `aria-label` when password is revealed. |
| `kjVariant` | `input` | `string` (validated) | `'ghost'` | Forwarded to host `KjButton`. Override of Button's `'default'` — eye buttons should not look like primary actions. |
| `kjSize` | `input` | `string` (validated) | `'icon'` | Forwarded to host `KjButton`. Icon-only is the default shape. |
| `kjDisabled` | `input` | `boolean` | `false` | Forwarded to host `KjButton`. OR-ed with `ctx.disabled()`. |

No standalone outputs — `kjRevealed` model on the root is the single source
of truth, two-way-bindable. The toggle's click is consumed internally.

### `KjPasswordStrength`

| Name | Kind | Type | Default | Notes |
|---|---|---|---|---|
| `kjScore` | `model` (read-only externally) | `KjPasswordScore` | `0` | Mirror of `ctx.score()`. Provided as a `model` for consumers who want to bind it (`[(kjScore)]="score"`) without injecting the context. Writes are ignored — the root owns the value. |
| `kjAriaLabel` | `input` | `string` | `'Password strength'` | Reflected on host. |
| `kjAnnounce` | `input` | `boolean` | `false` | When `true`, the strength label is also read via a `KjLiveRegion` on every change. Off by default to avoid AT spam. |

### `KjPasswordCapsLockWarning`

No inputs/outputs. Pure marker — content is projected, behaviour is
context-driven. Three host bindings (`role`, `aria-live`, `[hidden]`) and a
context registration are the entire surface.

All input/output/model names are `kj`-prefixed per `rules/code_style.md`.

## Examples to ship

Themed variants (`default` / `retro` / `finance`) for examples 1, 4, and 7
— same selection pattern as `button.example.ts`.

1. **Login form (minimal).** `<input kjPasswordInput
   kjAutocomplete="current-password" [formControl]="passwordCtrl">` plus a
   `<button kjPasswordToggle>` with an eye icon. No meter, no Caps Lock
   warning. Demonstrates the cheapest viable use site.
2. **Sign-up form (full).** `kjAutocomplete="new-password"` + strength
   meter + Caps Lock warning. Shows all four directives composed inside a
   `kj-field` wrapper with label + hint. Demonstrates the canonical
   "secure password" UX.
3. **Custom scorer.** Same as #2 but with `[kjStrengthScorer]` set to a
   `zxcvbn`-backed function. Demonstrates that scoring is pluggable and
   shows the i18n hook (`kjStrengthLabels`).
4. **Reveal-by-default (trusted device).** `[(kjRevealed)]="true"` on the
   root, with a hint explaining "your password is currently visible". Shows
   the two-way binding and the toggle staying in sync with programmatic
   reveal.
5. **Caps Lock warning only.** No meter; just the warning. For
   environments where strength meters are noise (admin tools).
6. **Disabled and invalid states.** `kjDisabled` and `kjInvalid` forwarded
   to the input, plus `kjDisabled` on the toggle so the eye button greys
   out with the field. Demonstrates that the same `KjInput` contract
   applies.
7. **Reactive forms with cross-field validation.** `passwordCtrl` and
   `confirmCtrl` linked by a parent-form validator that checks equality.
   Confirm field uses `kjAutocomplete="new-password"`. Demonstrates that
   Password Input plays inside `formGroup` exactly like `KjInput`.
8. **Themed (core-only).** `password-input.example.ts`,
   `password-input.retro.example.ts`, `password-input.finance.example.ts`
   under `packages/core/`. Demonstrates that the headless directives work
   under arbitrary theme CSS without the wrapper.
9. **Custom toggle button.** Replaces the default eye icon with text
   ("Show" / "Hide"). Same `[kjPasswordToggle]` directive, just different
   projected content. Demonstrates the toggle is shape-agnostic.

## Open questions / risks

1. **Auto-generating an input id when missing.** The toggle's
   `aria-controls` requires the input to have an id. If the consumer
   forgets, options are: (a) auto-generate via a counter and set the id
   on the input host; (b) warn in dev and degrade by omitting
   `aria-controls`; (c) require the id and fail-loud. Material does (a),
   PrimeNG does (a), shadcn leaves it to consumers. Recommendation: **(a)
   plus a dev warning if a `kj-field` is in scope but didn't supply one**
   — matches the "Field provides label association" story. Implementation
   is `signal(getId() ?? generateId('kj-password'))` on the root; reflected
   to the host via `[attr.id]`. Confirm this doesn't fight a consumer's
   own `[id]` binding (use `attr.id` only when missing).

2. **Async / server-side scoring.** `kjStrengthScorer` is sync only — an
   async scorer would race and could score stale values. Consumers needing
   server-side scoring should wrap with their own `effect()` + `signal`
   and write the result through a `[(kjScore)]` model. Should we offer a
   first-class `kjStrengthScoreAsync` input? **Recommendation: no, until
   asked.** The async case has too many edge knobs (debounce, abort,
   error display) to encode in a single input; YAGNI.

3. **Caps Lock detection on virtual keyboards.** Mobile touch keyboards
   don't report `getModifierState('CapsLock')` reliably (iOS reports `true`
   for the shift-locked state, Android varies). Risk: spurious warnings
   on mobile. Mitigation: detect `pointerType === 'touch'` and suppress
   the warning when the most recent input event came from a touch source.
   Open: is this worth the complexity, or should we live with the false
   positive? **Recommendation: ship without the suppression, add a
   `[kjCapsLockOnDesktopOnly]` boolean later if real complaints surface.**

4. **Strength meter announcement frequency.** `kjAnnounce="true"` will
   announce on every keystroke that crosses a score boundary. NVDA/JAWS
   batch announcements but VoiceOver does not — risk of spam on macOS.
   Mitigation: debounce announcements at 300ms inside `KjPasswordStrength`
   when `kjAnnounce` is true. Confirm with VO testing before promising AAA
   here.

5. **Reveal-and-paste.** When `revealed === true` and the user pastes,
   the plain text lands in the field, then potentially in clipboard
   history. Browser concern, not ours, but document in the directive
   TSDoc that callers building high-security forms (banking, password
   change while logged in) should consider not enabling reveal. No code
   change.

6. **Password manager interaction with `revealed`.** Some browsers (Safari
   notably) will *not* auto-fill fields where `type` has been changed via
   script after page-load. If the consumer programmatically sets
   `kjRevealed=true` on mount, autofill silently breaks. Mitigation:
   document. Optionally, the directive could expose a `kjPreserveAutofill`
   boolean that, when true, forbids programmatic reveal until first user
   interaction. **Recommendation: document only; the bug surface for the
   programmatic mitigation outweighs the value.**

7. **Toggle-button content projection.** The toggle directive accepts any
   projected content. Consumers might project a `<kj-icon>` that itself
   has `aria-label` set, conflicting with the toggle's host
   `aria-label`. Mitigation: the toggle's projected icon should be
   `aria-hidden="true"`; document this in the example template. Consider
   a dev warning that projects-content with non-empty accessible name +
   host `aria-label` are double-labelling.

8. **Scoring algorithm bundle weight.** The default heuristic is
   ~30 lines and ships with core. Adding `zxcvbn`-equivalent logic would
   bloat core to ~400KB. Decision: **never bundle a real strength
   library**; the built-in is intentionally simple and consumers wanting
   serious scoring use `kjStrengthScorer`. Document the trade-off so no
   one mistakes the default for a security-grade rating.

9. **Cross-component pointer for `KjField`.** Field doc isn't yet
   written. When it is, it needs to declare that `aria-describedby`
   linkage from hint/error elements to the input is owned by Field, and
   that Password Input's strength + caps-lock directives append to that
   chain (not replace it) via `KjAriaDescribedBy`. Until Field exists,
   this directive's `aria-describedby` story stands alone.

10. **`revealed` and form value.** Toggling reveal must not dispatch an
    `input` event (would mark the form dirty for no reason). Confirm that
    setting `[attr.type]` does not trigger `input`/`change` in target
    browsers — empirically it doesn't, but worth a guard test.

11. **Toggle's default variant choice.** Defaulting to `kjVariant="ghost"`
    + `kjSize="icon"` assumes the consumer wants an icon button. For
    text-only toggles (example #9) the variant override is fine, but the
    default size of `icon` will compress text content. Document that
    text-toggle consumers should set `kjSize="sm"` or similar. No code
    change.
