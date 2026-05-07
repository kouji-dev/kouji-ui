import { InjectionToken, Signal } from '@angular/core';

/** Numeric strength score, matching the de-facto `zxcvbn` 0..4 scale. */
export type KjPasswordScore = 0 | 1 | 2 | 3 | 4;

/** Human-readable strength label mapped from {@link KjPasswordScore}. */
export type KjPasswordScoreLabel =
  | 'too weak'
  | 'weak'
  | 'fair'
  | 'good'
  | 'strong';

/**
 * Allowed values for the `autocomplete` attribute on a password field.
 *
 * Restricted union — invalid strings are rejected at type-check time. This
 * catches the common mis-spelling `autocomplete="password"` (which browsers
 * silently ignore).
 */
export type KjPasswordAutocomplete =
  | 'current-password'
  | 'new-password'
  | 'off';

/**
 * Shared state surfaced by `KjPasswordInput` for its sibling directives
 * (`KjPasswordToggle`, `KjPasswordStrength`, `KjPasswordCapsLockWarning`) to
 * read.
 *
 * The root directive owns all derivations: the raw `revealed` / `capsLock`
 * signals, the `score` (computed lazily — only when at least one
 * `KjPasswordStrength` has registered), and the human-readable `scoreLabel`.
 */
export interface KjPasswordInputContext {
  /** Host `<input>` id, generated when the consumer didn't provide one. */
  readonly inputId: Signal<string>;
  /** Whether the password is currently rendered as plain text. */
  readonly revealed: Signal<boolean>;
  /** Whether Caps Lock was detected as on during the last keydown. */
  readonly capsLock: Signal<boolean>;
  /** Strength score in `0..4`. */
  readonly score: Signal<KjPasswordScore>;
  /** Human-readable strength label (i18n via `kjStrengthLabels`). */
  readonly scoreLabel: Signal<string>;
  /** Whether the host `<input>` is disabled (mirrors `KjInput`'s state). */
  readonly disabled: Signal<boolean>;
  /** Toggles `revealed`. No-op when disabled. */
  toggle(): void;
  /**
   * Registers a `KjPasswordStrength` so the root knows to run the scorer.
   * Returns a deregister function consumed via `DestroyRef`.
   */
  registerStrength(): () => void;
  /**
   * Registers a `KjPasswordCapsLockWarning` so the root can wire the
   * warning's id into `aria-describedby`. Returns a deregister function.
   */
  registerCapsLockWarning(): () => void;
}

/** Injection token for {@link KjPasswordInputContext}. */
export const KJ_PASSWORD_INPUT = new InjectionToken<KjPasswordInputContext>(
  'KjPasswordInput',
);
