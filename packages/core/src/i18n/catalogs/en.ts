/**
 * Canonical English (`en`) message catalog — the **source of truth** for
 * kouji-ui's visible / assistive-text strings. Every translation key the
 * library understands is spelled exactly once here; the {@link KjTranslationKey}
 * union and the {@link KjTranslationCatalog} shape are derived from it, so a
 * typo in any alternate catalog is a compile error and no key can be forgotten.
 *
 * Values may contain `{name}` placeholders — see {@link KjTranslationParams} —
 * which {@link KjTranslateService.translate} substitutes at lookup time.
 *
 * ## The rule this file enforces
 *
 * A user-visible or assistive string in `@kouji-ui/core` /
 * `@kouji-ui/components` lives **here and nowhere else**. Not as a literal in a
 * template, not in a host binding, not as a default on a config token. A
 * component that needs a string injects {@link KjTranslateService} and reads a
 * key; a per-component config field such as
 * `KjPaginationConfig.previousLabel` exists only as an *optional* override and
 * defaults to `undefined`, so translating the library is one
 * `provideKjTranslations({ fr: FR_CATALOG })` call rather than that plus a
 * `provideKj*` call per component plus a fork for whatever is left.
 *
 * Adding a component that renders text means adding its keys here first;
 * `catalog-is-source-of-truth.spec.ts` pins the contract for the families that
 * already follow it.
 */
export const EN_CATALOG = {
  // -- Overlays --
  'toast.close': 'Close notification',
  'toast.region': 'Notifications',
  'dialog.close': 'Close dialog',
  'sheet.close': 'Close sheet',

  // -- Collapsed groups (tag list / avatar group "+N" chip) --
  'overflow.more': '+{count}',
  'overflow.show': 'Show {count} more',

  // -- Pagination --
  'pagination.nav': 'Pagination',
  'pagination.previous': 'Previous page',
  'pagination.next': 'Next page',
  'pagination.first': 'First page',
  'pagination.last': 'Last page',
  'pagination.more': 'More pages',
  'pagination.page': 'Page {page}',
  'pagination.pageOf': 'Page {page} of {total}',

  // -- Breadcrumb --
  'breadcrumb.nav': 'Breadcrumb',
  'breadcrumb.truncatedOne': 'Breadcrumb (1 item hidden)',
  'breadcrumb.truncated': 'Breadcrumb ({hidden} items hidden)',
  'breadcrumb.showHiddenOne': 'Show 1 hidden breadcrumb',
  'breadcrumb.showHidden': 'Show {hidden} hidden breadcrumbs',

  // -- Feedback --
  'spinner.loading': 'Loading',
  'alert.dismiss': 'Dismiss',
  'alert.actions': 'Alert actions',

  // -- Data input --
  'inputOtp.complete': 'Code complete',
  'colorPicker.trigger': 'Color picker, current value {value}',
  'colorPicker.presets': 'Preset colors',
  'colorPicker.area': 'Color saturation and value',
  'colorPicker.hue': 'Hue',
  'colorPicker.alpha': 'Opacity',
  'colorPicker.hex': 'Hex color value',
  'datePicker.choose': 'Choose date',
  'treeSelect.expand': 'Expand',
  'treeSelect.collapse': 'Collapse',

  // -- Command palette --
  'commandPalette.dialog': 'Command palette',
  'commandPalette.list': 'Commands',

  // -- Calendar --
  'calendar.previousMonth': 'Previous month',
  'calendar.nextMonth': 'Next month',

  // -- Chat --
  'chat.typing': 'Assistant is typing',
  'chat.sources': 'Sources',
  'chat.slashCommands': 'Slash commands',
  'chat.stop': 'Stop generating',
  'chat.send': 'Send message',

  // -- Data table --
  'table.toolbar': 'Data table toolbar',
  'table.bulkActions': 'Bulk actions',

  // -- Carousel --
  'carousel.previous': 'Previous slide',
  'carousel.next': 'Next slide',
  'carousel.pause': 'Pause carousel',
  'carousel.slide': 'Slide {index}',

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
