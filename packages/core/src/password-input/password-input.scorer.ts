import { KjPasswordScore } from './password-input.context';

/**
 * Default password strength scorer.
 *
 * A small length + character-class heuristic — intentionally not a security
 * grade rating. Consumers wanting `zxcvbn`-equivalent scoring should provide
 * their own scorer via `[kjStrengthScorer]`.
 *
 * Scoring rules:
 * - empty / `< 4` chars  → 0 (too weak)
 * - `< 8`   chars        → 1 (weak)
 * - `>= 8`  chars + ≥2 character classes → 2 (fair)
 * - `>= 10` chars + ≥3 character classes → 3 (good)
 * - `>= 12` chars + 4 character classes  → 4 (strong)
 *
 * Character classes: lowercase, uppercase, digit, symbol.
 */
export function defaultPasswordScorer(value: string): KjPasswordScore {
  if (!value) return 0;
  const len = value.length;
  if (len < 4) return 0;

  let classes = 0;
  if (/[a-z]/.test(value)) classes++;
  if (/[A-Z]/.test(value)) classes++;
  if (/[0-9]/.test(value)) classes++;
  if (/[^a-zA-Z0-9]/.test(value)) classes++;

  if (len >= 12 && classes === 4) return 4;
  if (len >= 10 && classes >= 3) return 3;
  if (len >= 8 && classes >= 2) return 2;
  return 1;
}
