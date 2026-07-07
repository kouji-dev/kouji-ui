/**
 * Canonical English (`en`) message catalog — the **source of truth** for
 * kouji-ui's visible / assistive-text strings. Every translation key the
 * library understands is spelled exactly once here; the {@link KjTranslationKey}
 * union and the {@link KjTranslationCatalog} shape are derived from it, so a
 * typo in any alternate catalog is a compile error and no key can be forgotten.
 *
 * Values may contain `{name}` placeholders — see {@link KjTranslationParams} —
 * which {@link KjTranslateService.translate} substitutes at lookup time.
 */
export const EN_CATALOG = {
  // -- Overlays --
  'toast.close': 'Close notification',
  'dialog.close': 'Close dialog',

  // -- Pagination --
  'pagination.nav': 'Pagination',
  'pagination.previous': 'Previous page',
  'pagination.next': 'Next page',
  'pagination.first': 'First page',
  'pagination.last': 'Last page',
  'pagination.more': 'More pages',
  'pagination.page': 'Page {page}',
  'pagination.pageOf': 'Page {page} of {total}',

  // -- Accessibility live-region announcements --
  'a11y.pageChanged': 'Page {page} of {total}',
  'a11y.selected': 'Selected',
  'a11y.sortApplied': 'Sort applied, {rows} rows',
} as const;

/**
 * Union of every valid translation key, derived from {@link EN_CATALOG}. Using a
 * derived union (instead of a hand-maintained enum) keeps the keys and their
 * source-language values in a single place and makes misspelled keys fail
 * `tsc`.
 */
export type KjTranslationKey = keyof typeof EN_CATALOG;

/** A complete catalog: every {@link KjTranslationKey} mapped to a string. */
export type KjTranslationCatalog = Record<KjTranslationKey, string>;

/**
 * Interpolation values for a translation. `{name}` placeholders in a catalog
 * value are replaced by `params[name]`. Numbers are coerced with `String()`.
 */
export type KjTranslationParams = Record<string, string | number>;
