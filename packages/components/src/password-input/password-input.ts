import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  KJ_PASSWORD_INPUT,
  KjButton,
  KjPasswordCapsLockWarning,
  KjPasswordInput,
  KjPasswordInputScope,
  KjPasswordStrength,
  KjPasswordToggle,
  type KjPasswordAutocomplete,
  type KjPasswordScore,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjPasswordInput` directive family. Owns
 * the visual shape of the input + toggle button, and renders the optional
 * strength meter and Caps Lock warning when their feature flags are on.
 *
 * The component composes four directives behind a single API:
 * - `KjPasswordInputScope` on the wrapper (provides the shared context).
 * - `KjPasswordInput` on the inner `<input>`.
 * - `KjPasswordToggle` on a composed `[kjButton]` next to the input.
 * - `KjPasswordStrength` and `KjPasswordCapsLockWarning` rendered conditionally.
 *
 * @example
 * ```html
 * <kj-password-input
 *   [(kjValue)]="password"
 *   kjAutocomplete="new-password"
 *   [kjShowStrength]="true"
 *   [kjShowCapsLockWarning]="true" />
 * ```
 *
 * @doc-example Default
 *   The bare-minimum recipe — a sign-in password input with the toggle button.
 *   @doc-file password-input.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common usages — sign-in, sign-up with strength
 *   meter, and a disabled state. Use this as the copy-paste starting point.
 *   @doc-file password-input.usage.example.ts
 * @doc-example Show / hide toggle
 *   Two-way bind `[(kjRevealed)]` to drive the inner icon from outside.
 *   @doc-file password-input.toggle.example.ts
 * @doc-example Strength meter
 *   `[kjShowStrength]="true"` renders the four-segment estimator under the row.
 *   @doc-file password-input.strength.example.ts
 * @doc-example With validation rules
 *   Live rule list bound to the value; pairs well with reactive forms.
 *   @doc-file password-input.with-rules.example.ts
 *
 * @doc-keyboard
 *   Tab              — Moves focus into the input, then onto the toggle button
 *   Enter            — Submits the parent <form> when present (native input behavior)
 *   Space (on toggle) — Flips the reveal state
 *
 * @doc-aria
 *   type="password"|"text" — Native attribute toggles when `kjRevealed` flips
 *   aria-pressed     — Reflected on the toggle button (mirrors `kjRevealed`)
 *   aria-label       — Wired from `kjShowLabel` / `kjHideLabel` per state
 *   aria-invalid     — Reflected on the input when `kjInvalid` is true
 *   aria-disabled    — Reflected on input and toggle when `kjDisabled` is true
 *   role="status"    — Used by the optional Caps Lock warning paragraph
 *
 * @doc-touch
 *   The toggle button uses `kjSize="icon"` (44×44) so it meets WCAG 2.5.5.
 *   The input row matches `kj-input` height for form-row alignment.
 *
 * @doc-a11y
 *   The toggle button never reads the password aloud — it only flips the
 *   native input type. The Caps Lock warning is a live region so AT
 *   announces the state change without stealing focus. Strength feedback is
 *   rendered as decorative segments — pair with a textual cue if the score
 *   is the only signal carrying meaning.
 *
 * @doc-related input,field,form
 *
 * @doc-css-var
 *   --kj-password-input-bg                — Background fill. Inherits --kj-bg-field.
 *   --kj-password-input-fg                — Foreground (text) color.
 *   --kj-password-input-border-color      — Border color. Flips to danger when invalid.
 *   --kj-password-input-border-style      — Border style. Defaults to solid.
 *   --kj-password-input-border-width      — Border thickness. Inherits --kj-border.
 *   --kj-password-input-radius            — Corner radius. Inherits --kj-radius-field.
 *   --kj-password-input-padding-x         — Horizontal padding inside the field row.
 *   --kj-password-input-padding-y         — Vertical padding inside the field row.
 *   --kj-password-input-font              — Font family. Defaults to --kj-font-sans.
 *   --kj-password-input-font-size         — Font size. Size attributes override.
 *   --kj-password-input-placeholder-fg    — Placeholder text color.
 *   --kj-password-input-toggle-fg         — Show/hide toggle icon color.
 *   --kj-password-input-toggle-fg-hover   — Show/hide toggle icon color on hover or focus.
 *   --kj-password-input-height            — Row height. Matches input/select for form alignment.
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name password-input
 * @doc-description Themed password input with show/hide toggle, optional strength meter, and Caps Lock warning.
 * @doc-is-main
 */
@Component({
  selector: 'kj-password-input',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    KjButton,
    KjPasswordInput,
    KjPasswordInputScope,
    KjPasswordToggle,
    KjPasswordStrength,
    KjPasswordCapsLockWarning,
  ],
  template: `
    <div kjPasswordInputScope class="kj-password-input">
      <input
        kjPasswordInput
        class="kj-password-input__field"
        [kjAutocomplete]="kjAutocomplete()"
        [kjMaxLength]="kjMaxLength()"
        [kjDisabled]="kjDisabled()"
        [kjInvalid]="kjInvalid()"
        [(kjRevealed)]="kjRevealed"
        [placeholder]="kjPlaceholder()"
        [formControl]="control"
      />
      @if (kjShowToggle()) {
        <button
          kjButton
          kjPasswordToggle
          class="kj-password-input__toggle"
          [kjVariant]="'ghost'"
          [kjSize]="'icon'"
          [kjShowLabel]="kjShowLabel()"
          [kjHideLabel]="kjHideLabel()"
        >
          @if (kjRevealed()) {
            <svg class="kj-password-input__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 3l18 18M10.7 10.7a3 3 0 0 0 4.2 4.2M9.3 5.5A10.5 10.5 0 0 1 12 5c5 0 9.3 3.4 10.5 7-.3 1-.9 2-1.7 2.9M6.6 6.6C4.4 8 2.9 9.9 2 11.5 3.2 15.1 7.5 18.5 12 18.5c1.5 0 2.9-.4 4.2-1" />
            </svg>
          } @else {
            <svg class="kj-password-input__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2 12c2-4 5.5-7 10-7s8 3 10 7c-2 4-5.5 7-10 7s-8-3-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          }
        </button>
      }
      @if (kjShowStrength()) {
        <div class="kj-password-strength" kjPasswordStrength [attr.data-score]="score()">
          <span class="kj-password-strength__seg"></span>
          <span class="kj-password-strength__seg"></span>
          <span class="kj-password-strength__seg"></span>
          <span class="kj-password-strength__seg"></span>
        </div>
      }
      @if (kjShowCapsLockWarning()) {
        <p kjPasswordCapsLockWarning class="kj-password-caps-lock-warning">
          {{ kjCapsLockMessage() }}
        </p>
      }
    </div>
  `,
  styleUrl: './password-input.css',
  encapsulation: ViewEncapsulation.None,
  host: { 'style': 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPasswordInputComponent implements OnInit {
  /**
   * Native `autocomplete` attribute. Restricted to `'current-password'` |
   * `'new-password'` | `'off'`.
   * @default 'current-password'
   */
  readonly kjAutocomplete = input<KjPasswordAutocomplete>('current-password');

  /** Native `maxlength` attribute. */
  readonly kjMaxLength = input<number>(Number.POSITIVE_INFINITY);

  /** Disabled state. Reflects to the host `KjPasswordInput`. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /** Invalid state — wires to ARIA-invalid via the host `KjInput`. */
  readonly kjInvalid = input(false, { transform: booleanAttribute });

  /** Two-way bindable plain-text reveal state. @default false */
  readonly kjRevealed = model<boolean>(false);

  /** Placeholder text on the inner `<input>`. */
  readonly kjPlaceholder = input<string>('');

  /** Two-way bindable value (proxy CVA for non-form usage). */
  readonly kjValue = model<string>('');

  /** Show the show/hide toggle button. @default true */
  readonly kjShowToggle = input(true, { transform: booleanAttribute });

  /** Show the strength meter under the input. @default false */
  readonly kjShowStrength = input(false, { transform: booleanAttribute });

  /** Show the Caps Lock warning element. @default false */
  readonly kjShowCapsLockWarning = input(false, { transform: booleanAttribute });

  /** `aria-label` for the toggle when password is hidden. @default 'Show password' */
  readonly kjShowLabel = input<string>('Show password');

  /** `aria-label` for the toggle when password is revealed. @default 'Hide password' */
  readonly kjHideLabel = input<string>('Hide password');

  /** Caps Lock warning message (overridable for i18n). */
  readonly kjCapsLockMessage = input<string>('Caps Lock is on.');

  /** @internal — bridges template-bound `[(kjValue)]` to the inner `KjPasswordInput`. */
  protected readonly control = new FormControl<string>('', { nonNullable: true });

  /** @internal — exposes the score for the strength meter's data attr. */
  protected readonly score = computed<KjPasswordScore>(() => {
    // The directive provides the full `KJ_PASSWORD_INPUT` context; we re-read
    // the score for the data-attribute styling hook on our wrapper element.
    // The host-bound `data-score` from `KjPasswordStrength` already exists,
    // but mirroring it here lets CSS target the wrapper without `:has()`.
    const ctx = this._ctx;
    return ctx?.score() ?? 0;
  });

  /**
   * @internal — context resolved from the same scope. Optional because the
   * component itself owns the `[kjPasswordInputScope]` element, so injection
   * resolves up via the providers chain after init. If unavailable, the
   * meter still renders with score 0.
   */
  private readonly _ctx = inject(KJ_PASSWORD_INPUT, { optional: true });

  constructor() {
    // Two-way bind value <-> control.
    this.control.valueChanges.subscribe(v => this.kjValue.set(v ?? ''));
  }

  ngOnInit(): void {
    if (this.kjValue() !== this.control.value) {
      this.control.setValue(this.kjValue(), { emitEvent: false });
    }
  }
}

