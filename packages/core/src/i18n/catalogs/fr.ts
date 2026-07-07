import type { KjTranslationCatalog } from './en';

/**
 * French (`fr`) message catalog — shipped as proof that alternate locales plug
 * in. Typed as `Partial<KjTranslationCatalog>`: a translator may omit keys and
 * each missing one falls through to the English source at lookup time. The key
 * union is derived from `en`, so a misspelled key here fails `tsc`.
 *
 * Import it explicitly and register with `provideKjTranslations({ fr: FR_CATALOG })`
 * — because it is a plain module, bundlers tree-shake it away when unused.
 */
export const FR_CATALOG: Partial<KjTranslationCatalog> = {
  // -- Overlays --
  'toast.close': 'Fermer la notification',
  'dialog.close': 'Fermer la boîte de dialogue',

  // -- Pagination --
  'pagination.nav': 'Pagination',
  'pagination.previous': 'Page précédente',
  'pagination.next': 'Page suivante',
  'pagination.first': 'Première page',
  'pagination.last': 'Dernière page',
  'pagination.more': 'Plus de pages',
  'pagination.page': 'Page {page}',
  'pagination.pageOf': 'Page {page} sur {total}',

  // -- Accessibility live-region announcements --
  'a11y.pageChanged': 'Page {page} sur {total}',
  'a11y.selected': 'Sélectionné',
  'a11y.sortApplied': 'Tri appliqué, {rows} lignes',
};
