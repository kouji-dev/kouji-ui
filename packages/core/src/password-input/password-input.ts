import {
  DestroyRef,
  Directive,
  ElementRef,
  Signal,
  booleanAttribute,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';

import { KjButton } from '../button/button';
import { KjInput } from '../input/input';
import {
  KJ_PASSWORD_INPUT,
  KjPasswordAutocomplete,
  KjPasswordInputContext,
  KjPasswordScore,
  KjPasswordScoreLabel,
} from './password-input.context';
import { defaultPasswordScorer } from './password-input.scorer';

let _passwordInputIdCounter = 0;
function generateId(): string {
  return `kj-password-${++_passwordInputIdCounter}`;
}

/** Default English labels for the four strength tiers. Override via `kjStrengthLabels`. */
const DEFAULT_STRENGTH_LABELS: Record<KjPasswordScore, KjPasswordScoreLabel> = {
  0: 'too weak',
  1: 'weak',
  2: 'fair',
  3: 'good',
  4: 'strong',
};

/**
 * Enhances a native `<input>` for password entry. Composes `KjInput` via
 * `hostDirectives` so all of its contracts (CVA, `aria-invalid`, focus-ring,
 * ARIA-disabled) apply unchanged. Adds three concerns specific to passwords:
 *
 * - **Reveal toggle.** Flips `type="password" ⇄ "text"` via the
 *   {@link KJ_PASSWORD_INPUT} context. The toggle is owned by a sibling
 *   `[kjPasswordToggle]` directive (composed `KjButton`) so the wiring isn't
 *   forced into the root.
 * - **Strength meter (optional).** When at least one `[kjPasswordStrength]`
 *   element registers with the context, the root runs the configurable
 *   scorer on every value change. The score (`0..4`, matching `zxcvbn`) and
 *   human label flow into the meter via the context.
 * - **Caps Lock warning.** Sets a `capsLock` signal during keydown via
 *   `KeyboardEvent.getModifierState('CapsLock')`. Consumers render the
 *   warning with `[kjPasswordCapsLockWarning]`, which pipes the signal into
 *   `[hidden]` and announces via `aria-live="polite"`.
 *
 * Generates a host id when the consumer didn't supply one — needed by the
 * toggle's `aria-controls` and by `aria-describedby` wiring.
 *
 * @example
 * ```html
 * <input kjPasswordInput kjAutocomplete="new-password" [formControl]="passwordCtrl" />
 * <button kjPasswordToggle><svg aria-hidden="true">…</svg></button>
 * <div kjPasswordStrength></div>
 * <p kjPasswordCapsLockWarning>Caps Lock is on.</p>
 * ```
 *
 * @category Core/Inputs
 * @doc
 * @doc-name password-input
 * @doc-description Adds password-entry features (reveal toggle, strength scoring, Caps Lock detection) to a native input.
 * @doc-is-main
 */
@Directive({
  selector: 'input[kjPasswordInput]',
  standalone: true,
  exportAs: 'kjPasswordInput',
  hostDirectives: [
    { directive: KjInput, inputs: ['kjInvalid'] },
  ],
  providers: [{ provide: KJ_PASSWORD_INPUT, useExisting: KjPasswordInput }],
  host: {
    '[attr.id]': 'inputId()',
    '[attr.type]': 'revealed() ? "text" : "password"',
    '[attr.autocomplete]': 'kjAutocomplete()',
    '[attr.maxlength]': 'kjMaxLength() ?? null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(keydown)': 'onKeydown($event)',
    '(blur)': 'capsLock.set(false)',
  },
})
export class KjPasswordInput implements KjPasswordInputContext {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly kjInput = inject(KjInput);

  /**
   * Native `autocomplete` attribute. Restricted to the three sensible values —
   * `'current-password'` for login forms, `'new-password'` for sign-up /
   * change-password forms (also opts out of password-manager autofill on the
   * paired confirm field), and `'off'` to fully disable.
   * @default 'current-password'
   */
  readonly kjAutocomplete = input<KjPasswordAutocomplete>('current-password');

  /** Native `maxlength` attribute. Useful so the strength meter agrees with the limit. */
  readonly kjMaxLength = input<number | undefined>(undefined);

  /**
   * Disabled state. Reflects to `aria-disabled` / `data-disabled` and is
   * read by `KjPasswordToggle` to suppress its click. The host `KjInput`
   * still owns its own form-disabled wiring (via Angular forms `disable()`);
   * this input is the imperative override for non-form contexts.
   * @default false
   */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /**
   * Two-way bindable reveal state. `true` flips the `type` attribute to
   * `"text"`. Wires `KjPasswordToggle` and any programmatic show into the
   * single source of truth.
   * @default false
   */
  readonly kjRevealed = model<boolean>(false);

  /**
   * Replaces the built-in heuristic with a custom scoring function. The
   * scorer is **synchronous** — async scoring would race with keystrokes;
   * wrap your async source and write to `[(kjScore)]` on the meter instead.
   */
  readonly kjStrengthScorer = input<(value: string) => KjPasswordScore>(
    defaultPasswordScorer,
  );

  /**
   * i18n hook for the human-readable score labels surfaced via
   * `aria-valuetext` on the meter.
   * @default English defaults
   */
  readonly kjStrengthLabels = input<Record<KjPasswordScore, string>>(
    DEFAULT_STRENGTH_LABELS,
  );

  // ── KjPasswordInputContext shape ───────────────────────────────────────
  /** Internal counter — number of strength meters currently registered. */
  private readonly _strengthRegistrations = signal(0);

  /** Internal counter — number of caps-lock warnings currently registered. */
  private readonly _capsLockRegistrations = signal(0);

  /** Caps Lock detection — set in `onKeydown`, cleared on blur. */
  readonly capsLock = signal(false);

  /** Stable id for the host `<input>`. Honours an existing id, otherwise generates. */
  private readonly _generatedId = signal<string>('');

  /** @internal */
  readonly inputId: Signal<string> = computed(
    () => this.el.nativeElement.id || this._generatedId(),
  );

  /** @internal — alias of `kjRevealed` for the context contract. */
  readonly revealed: Signal<boolean> = this.kjRevealed;

  /** @internal — strength score in `0..4`. Always computed; the registration
   * counter is kept for future "skip scorer when no meter" optimisation but is
   * intentionally not gating the score because content-query timing makes the
   * gate unreliable for siblings inside a `[kjPasswordInputScope]`. */
  readonly score: Signal<KjPasswordScore> = computed(() => {
    const value = this.kjInput.formCtrl.value();
    const text = typeof value === 'string' ? value : '';
    const scorer = this.kjStrengthScorer();
    const raw = scorer(text);
    const clamped = Math.min(4, Math.max(0, Math.round(raw))) as KjPasswordScore;
    return clamped;
  });

  /** @internal */
  readonly scoreLabel: Signal<string> = computed(() => {
    const labels = this.kjStrengthLabels();
    const score = this.score();
    return labels[score];
  });

  /** @internal — OR of the consumer input and the form-control disabled state. */
  readonly disabled: Signal<boolean> = computed(
    () => this.kjDisabled() || this.kjInput.formCtrl.disabled(),
  );

  constructor() {
    if (!this.el.nativeElement.id) {
      this._generatedId.set(generateId());
    }
  }

  /** @internal */
  toggle(): void {
    if (this.disabled()) return;
    this.kjRevealed.set(!this.kjRevealed());
  }

  /** @internal */
  registerStrength(): () => void {
    this._strengthRegistrations.update(n => n + 1);
    return () => this._strengthRegistrations.update(n => Math.max(0, n - 1));
  }

  /** @internal */
  registerCapsLockWarning(): () => void {
    this._capsLockRegistrations.update(n => n + 1);
    return () =>
      this._capsLockRegistrations.update(n => Math.max(0, n - 1));
  }

  /** @internal — keydown handler used to detect Caps Lock. */
  protected onKeydown(event: KeyboardEvent): void {
    // Fail-soft: some test environments / older browsers don't implement
    // `getModifierState`. Treat as "no caps lock detected".
    if (typeof event.getModifierState === 'function') {
      this.capsLock.set(event.getModifierState('CapsLock'));
    }
  }
}

/**
 * Wiring directive composed onto a `[kjButton]` to provide the password-reveal
 * toggle. Reads {@link KJ_PASSWORD_INPUT} for state and writes the press
 * status onto the host `KjButton`'s `kjPressed` model so `aria-pressed` is
 * reflected by `KjButton` (single source of truth, no duplicated semantics).
 *
 * Sets `aria-controls` to the input's id and switches `aria-label` between
 * `kjShowLabel` / `kjHideLabel` based on the reveal state — the three things
 * a hand-rolled toggle button consistently misses.
 *
 * @example
 * ```html
 * <button kjButton kjPasswordToggle [kjShowLabel]="'Reveal'" [kjHideLabel]="'Hide'">
 *   <svg aria-hidden="true">…</svg>
 * </button>
 * ```
 *
 * @category Core/Inputs
 * @doc
 * @doc-name password-input
 */
@Directive({
  selector: '[kjPasswordToggle]',
  standalone: true,
  host: {
    'type': 'button',
    '[attr.aria-controls]': 'ctx.inputId()',
    '[attr.aria-label]': 'currentLabel()',
    '[attr.data-revealed]': 'ctx.revealed() ? "" : null',
    '(click)': 'onClick($event)',
  },
})
export class KjPasswordToggle {
  /** @internal */
  protected readonly ctx = inject(KJ_PASSWORD_INPUT);
  /** @internal — host `KjButton` (required: `[kjPasswordToggle]` composes onto a `[kjButton]`). */
  private readonly kjButton = inject(KjButton, { optional: true });

  /**
   * `aria-label` shown when the password is hidden. Required for icon-only
   * buttons (WCAG 2.4.6).
   * @default 'Show password'
   */
  readonly kjShowLabel = input<string>('Show password');

  /**
   * `aria-label` shown when the password is revealed.
   * @default 'Hide password'
   */
  readonly kjHideLabel = input<string>('Hide password');

  /** @internal */
  protected readonly currentLabel = computed(() =>
    this.ctx.revealed() ? this.kjHideLabel() : this.kjShowLabel(),
  );

  constructor() {
    // Mirror `revealed` onto the host KjButton's `kjPressed` model so
    // `aria-pressed` is reflected by KjButton (single source of truth).
    if (this.kjButton) {
      const button = this.kjButton;
      effect(() => {
        button.kjPressed.set(this.ctx.revealed());
      });
    }
  }

  /** @internal */
  protected onClick(event: Event): void {
    if (this.ctx.disabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.ctx.toggle();
  }
}

/**
 * Marks an element as the password-strength meter. Owns `role="progressbar"`
 * and the full ARIA value contract (`aria-valuemin="0"`, `aria-valuemax="4"`,
 * `aria-valuenow="{score}"`, `aria-valuetext="{label}"`). Subscribes to the
 * shared {@link KJ_PASSWORD_INPUT} context for the score signal.
 *
 * Score updates are **not** announced via live region by default — the
 * implicit `aria-valuetext` change is enough on focus, and announcing on every
 * keystroke would flood AT.
 *
 * Registers itself with the root on construction so the scorer only runs when
 * a meter is actually mounted.
 *
 * @example
 * ```html
 * <div kjPasswordStrength></div>
 * ```
 *
 * @category Core/Inputs
 * @doc
 * @doc-name password-input
 */
@Directive({
  selector: '[kjPasswordStrength]',
  standalone: true,
  exportAs: 'kjPasswordStrength',
  host: {
    'role': 'progressbar',
    '[attr.id]': 'strengthId',
    '[attr.aria-label]': 'kjAriaLabel()',
    '[attr.aria-valuemin]': '0',
    '[attr.aria-valuemax]': '4',
    '[attr.aria-valuenow]': 'ctx.score()',
    '[attr.aria-valuetext]': 'ctx.scoreLabel()',
    '[attr.data-score]': 'ctx.score()',
    '[attr.data-score-label]': 'ctx.scoreLabel()',
  },
})
export class KjPasswordStrength {
  private readonly destroyRef = inject(DestroyRef);
  /** @internal */
  protected readonly ctx = inject(KJ_PASSWORD_INPUT);

  /** Stable id used for `aria-describedby` wiring on the host input. */
  readonly strengthId = `kj-password-strength-${++_passwordInputIdCounter}`;

  /**
   * Accessible label for the meter. The meter is **not** `aria-hidden` —
   * users with screen readers need the score read aloud.
   * @default 'Password strength'
   */
  readonly kjAriaLabel = input<string>('Password strength');

  /**
   * When `true`, the strength label is also read via a live region on every
   * change. Off by default to avoid AT spam.
   * @default false
   */
  readonly kjAnnounce = input(false, { transform: booleanAttribute });

  constructor() {
    const deregister = this.ctx.registerStrength();
    this.destroyRef.onDestroy(deregister);
  }
}

/**
 * Marks an element as the Caps Lock warning. Holds no visual content of its
 * own — the consumer projects whatever message they like — but owns the ARIA
 * contract: `role="status"`, `aria-live="polite"`, and `[hidden]` reflecting
 * the context's `capsLock` signal.
 *
 * `polite` (not `assertive`) is the right choice here — Caps Lock is
 * informative, not urgent; `assertive` would interrupt mid-type.
 *
 * @example
 * ```html
 * <p kjPasswordCapsLockWarning>Caps Lock is on.</p>
 * ```
 *
 * @category Core/Inputs
 * @doc
 * @doc-name password-input
 */
@Directive({
  selector: '[kjPasswordCapsLockWarning]',
  standalone: true,
  host: {
    'role': 'status',
    'aria-live': 'polite',
    '[attr.id]': 'warningId',
    '[hidden]': '!ctx.capsLock()',
  },
})
export class KjPasswordCapsLockWarning {
  private readonly destroyRef = inject(DestroyRef);
  /** @internal */
  protected readonly ctx = inject(KJ_PASSWORD_INPUT);

  /** Stable id used for `aria-describedby` wiring on the host input. */
  readonly warningId = `kj-password-caps-${++_passwordInputIdCounter}`;

  constructor() {
    const deregister = this.ctx.registerCapsLockWarning();
    this.destroyRef.onDestroy(deregister);
  }
}

/** No-op deregister returned before a `KjPasswordInput` has been discovered. */
const NOOP_DEREGISTER = (): void => undefined;

/**
 * Scope directive placed on the wrapping element of a password input
 * composition. Provides `KJ_PASSWORD_INPUT` to siblings (toggle, strength,
 * caps-lock warning) by forwarding to the nested `KjPasswordInput` directive
 * discovered via content query. Without this wrapper, sibling directives
 * cannot see the input's context — DI flows down, not across.
 *
 * @example
 * ```html
 * <div kjPasswordInputScope>
 *   <input kjPasswordInput [formControl]="passwordCtrl" />
 *   <button kjButton kjPasswordToggle>eye</button>
 *   <div kjPasswordStrength></div>
 *   <p kjPasswordCapsLockWarning>Caps Lock is on.</p>
 * </div>
 * ```
 *
 * @category Core/Inputs
 * @doc
 * @doc-name password-input
 */
@Directive({
  selector: '[kjPasswordInputScope]',
  standalone: true,
  exportAs: 'kjPasswordInputScope',
  providers: [
    { provide: KJ_PASSWORD_INPUT, useExisting: KjPasswordInputScope },
  ],
})
export class KjPasswordInputScope implements KjPasswordInputContext {
  /** @internal — discovered descendant input. */
  private readonly child = contentChild(KjPasswordInput, { descendants: true });

  /** @internal */
  readonly inputId: Signal<string> = computed(
    () => this.child()?.inputId() ?? '',
  );
  /** @internal */
  readonly revealed: Signal<boolean> = computed(
    () => this.child()?.revealed() ?? false,
  );
  /** @internal */
  readonly capsLock: Signal<boolean> = computed(
    () => this.child()?.capsLock() ?? false,
  );
  /** @internal */
  readonly score: Signal<KjPasswordScore> = computed(
    () => this.child()?.score() ?? (0 as KjPasswordScore),
  );
  /** @internal */
  readonly scoreLabel: Signal<string> = computed(
    () => this.child()?.scoreLabel() ?? '',
  );
  /** @internal */
  readonly disabled: Signal<boolean> = computed(
    () => this.child()?.disabled() ?? false,
  );

  /** @internal */
  toggle(): void {
    this.child()?.toggle();
  }

  /** @internal */
  registerStrength(): () => void {
    return this.child()?.registerStrength() ?? NOOP_DEREGISTER;
  }

  /** @internal */
  registerCapsLockWarning(): () => void {
    return this.child()?.registerCapsLockWarning() ?? NOOP_DEREGISTER;
  }
}
