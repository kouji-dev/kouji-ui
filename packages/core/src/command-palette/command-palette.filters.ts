/**
 * Filter function type for the command palette.
 * Returns a numeric score: > 0 means the item is visible, 0 means hidden.
 * Higher scores are more relevant when sorting by score.
 */
export type KjCommandFilter = (query: string, haystacks: readonly string[]) => number;

/**
 * Strip diacritic marks from a string (e.g. `café` → `cafe`).
 * Uses NFD normalisation followed by removal of Unicode diacritic characters.
 * Note: locale-naive for v1 (Turkish/German edge cases are documented).
 */
export function stripDiacritics(str: string): string {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/**
 * Default filter: case- and diacritic-insensitive substring match.
 * Returns score 1 if any haystack contains the needle, 0 otherwise.
 * Returns 1 for empty queries (all items visible).
 */
export const kjSubstringFilter: KjCommandFilter = (query, haystacks) => {
  if (!query) return 1;
  const needle = stripDiacritics(query.toLowerCase());
  return haystacks.some(h => stripDiacritics(h.toLowerCase()).includes(needle)) ? 1 : 0;
};

/**
 * Optional fuzzy filter: checks whether all characters of the query appear
 * in the haystack in order (abbreviation matching).
 * E.g. `gth` matches `git checkout`.
 * Returns score 1 if any haystack matches, 0 otherwise.
 * Returns 1 for empty queries.
 *
 * @example
 * ```html
 * <div kjCommandPalette [kjFilter]="kjFuzzyFilter">…</div>
 * ```
 */
export const kjFuzzyFilter: KjCommandFilter = (query, haystacks) => {
  if (!query) return 1;
  const needle = query.toLowerCase();
  return haystacks.some(h => {
    const hay = h.toLowerCase();
    let i = 0;
    for (const c of needle) {
      const j = hay.indexOf(c, i);
      if (j < 0) return false;
      i = j + 1;
    }
    return true;
  }) ? 1 : 0;
};
