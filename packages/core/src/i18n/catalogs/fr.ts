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
  'toast.region': 'Notifications',
  'dialog.close': 'Fermer la boîte de dialogue',
  'sheet.close': 'Fermer la feuille',

  // -- Collapsed groups --
  'overflow.more': '+{count}',
  'overflow.show': 'Afficher {count} de plus',

  // -- Pagination --
  'pagination.nav': 'Pagination',
  'pagination.previous': 'Page précédente',
  'pagination.next': 'Page suivante',
  'pagination.first': 'Première page',
  'pagination.last': 'Dernière page',
  'pagination.more': 'Plus de pages',
  'pagination.page': 'Page {page}',
  'pagination.pageOf': 'Page {page} sur {total}',

  // -- Breadcrumb --
  'breadcrumb.nav': "Fil d'Ariane",
  'breadcrumb.truncatedOne': "Fil d'Ariane (1 élément masqué)",
  'breadcrumb.truncated': "Fil d'Ariane ({hidden} éléments masqués)",
  'breadcrumb.showHiddenOne': "Afficher 1 élément masqué du fil d'Ariane",
  'breadcrumb.showHidden': "Afficher {hidden} éléments masqués du fil d'Ariane",

  // -- Feedback --
  'spinner.loading': 'Chargement',
  'alert.dismiss': 'Fermer',
  'alert.actions': "Actions de l'alerte",

  // -- Data input --
  'inputOtp.complete': 'Code complet',
  'colorPicker.trigger': 'Sélecteur de couleur, valeur actuelle {value}',
  'colorPicker.presets': 'Couleurs prédéfinies',
  'colorPicker.area': 'Saturation et valeur de la couleur',
  'colorPicker.hue': 'Teinte',
  'colorPicker.alpha': 'Opacité',
  'colorPicker.hex': 'Valeur hexadécimale de la couleur',
  'datePicker.choose': 'Choisir une date',
  'treeSelect.expand': 'Développer',
  'treeSelect.collapse': 'Réduire',

  // -- Command palette --
  'commandPalette.dialog': 'Palette de commandes',
  'commandPalette.list': 'Commandes',

  // -- Calendar --
  'calendar.previousMonth': 'Mois précédent',
  'calendar.nextMonth': 'Mois suivant',

  // -- Chat --
  'chat.typing': "L'assistant est en train d'écrire",
  'chat.sources': 'Sources',
  'chat.slashCommands': 'Commandes slash',
  'chat.stop': 'Arrêter la génération',
  'chat.send': 'Envoyer le message',

  // -- Data table --
  'table.toolbar': 'Barre d’outils du tableau',
  'table.bulkActions': 'Actions groupées',

  // -- Carousel --
  'carousel.previous': 'Diapositive précédente',
  'carousel.next': 'Diapositive suivante',
  'carousel.pause': 'Mettre le carrousel en pause',
  'carousel.slide': 'Diapositive {index}',

  // -- Accessibility live-region announcements --
  'a11y.pageChanged': 'Page {page} sur {total}',
  'a11y.selected': 'Sélectionné',
  'a11y.sortApplied': 'Tri appliqué, {rows} lignes',
};
