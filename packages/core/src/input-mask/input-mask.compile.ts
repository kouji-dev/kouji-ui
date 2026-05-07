/**
 * A single slot in a compiled mask.
 * - `literal`: a fixed character that is always rendered and skipped by the caret.
 * - `variable`: a user-fillable position with a regex that filters keystrokes.
 */
export type Slot =
  | { kind: 'literal'; char: string }
  | { kind: 'variable'; tokenId: string; re: RegExp };

/** Result of compiling a mask template string. */
export interface CompiledMask {
  /** Full slot vector — one entry per character position in the display string. */
  readonly slots: ReadonlyArray<Slot>;
  /** Positions (in `slots`) that are variable (user-fillable). */
  readonly variableIndices: ReadonlyArray<number>;
  readonly literalCount: number;
  readonly variableCount: number;
}

/**
 * Compiles a mask template string into a `CompiledMask`.
 *
 * Token characters (keys of `tokens`) become variable slots. Any other
 * character becomes a literal slot. Escape a token character with a leading
 * backslash: `\\9` → literal `9`.
 *
 * @example
 * ```ts
 * const mask = compileMask('(999) 999-9999', { '9': /[0-9]/ });
 * // mask.variableCount === 10
 * // mask.slots[0] === { kind: 'literal', char: '(' }
 * // mask.slots[1] === { kind: 'variable', tokenId: '9', re: /[0-9]/ }
 * ```
 */
export function compileMask(
  template: string,
  tokens: Record<string, RegExp>,
): CompiledMask {
  const slots: Slot[] = [];
  const variableIndices: number[] = [];
  let i = 0;

  while (i < template.length) {
    const ch = template[i];

    // Escape: \\ followed by any character → literal of that character
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
