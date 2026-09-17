import { type Signal, computed, inject } from '@angular/core';
import { KjTranslateService } from '../i18n/translate.service';
import { KJ_PAGINATION_CONFIG } from './config';

/**
 * Every user-visible / assistive string the Pagination family renders,
 * already resolved: a `provideKjPagination(…)` override when one is set,
 * otherwise the active {@link KjTranslateService} catalog entry.
 *
 * Signals (not plain strings) because the active locale can change at
 * runtime — bind them in a host binding or read them in an `effect`.
 */
export interface KjPaginationLabels {
  /** `aria-label` on the root `<nav>`. Catalog key `pagination.nav`. */
  readonly nav: Signal<string>;
  /** `aria-label` on the Previous control. Catalog key `pagination.previous`. */
  readonly previous: Signal<string>;
  /** `aria-label` on the Next control. Catalog key `pagination.next`. */
  readonly next: Signal<string>;
  /** `aria-label` on the First control. Catalog key `pagination.first`. */
  readonly first: Signal<string>;
  /** `aria-label` on the Last control. Catalog key `pagination.last`. */
  readonly last: Signal<string>;
  /** Visually-hidden readout for the gap indicator. Catalog key `pagination.more`. */
  readonly ellipsis: Signal<string>;
  /** Per-item `aria-label`. Catalog key `pagination.page` (`{page}`). */
  pageItem(page: number, totalPages: number): string;
  /** Visible "Page N of M" text. Catalog key `pagination.pageOf` (`{page}`, `{total}`). */
  info(page: number, totalPages: number): string;
  /** Live-region announcement on a page change. Catalog key `a11y.pageChanged`. */
  announcement(page: number, totalPages: number): string;
}

/**
 * Resolves the Pagination label set for the current injector.
 *
 * Precedence, per string: the matching `KJ_PAGINATION_CONFIG` field (set by
 * `provideKjPagination(…)`) → the {@link KjTranslateService} catalog → the
 * English source catalog. The catalog is the source of truth; the config
 * fields exist so an app can override **one** string without shipping a whole
 * locale, and are `undefined` by default so translating pagination needs
 * nothing but `provideKjTranslations(…)`.
 *
 * Must be called from an injection context.
 */
export function injectKjPaginationLabels(): KjPaginationLabels {
  const config = inject(KJ_PAGINATION_CONFIG);
  const i18n = inject(KjTranslateService);

  return {
    nav: computed(() => config.navigationLabel ?? i18n.translate('pagination.nav')),
    previous: computed(() => config.previousLabel ?? i18n.translate('pagination.previous')),
    next: computed(() => config.nextLabel ?? i18n.translate('pagination.next')),
    first: computed(() => config.firstLabel ?? i18n.translate('pagination.first')),
    last: computed(() => config.lastLabel ?? i18n.translate('pagination.last')),
    ellipsis: computed(() => config.ellipsisLabel ?? i18n.translate('pagination.more')),
    pageItem: (page, totalPages) =>
      config.pageItemLabel?.(page, totalPages) ??
      i18n.translate('pagination.page', { page, total: totalPages }),
    info: (page, totalPages) =>
      config.infoTemplate?.(page, totalPages) ??
      i18n.translate('pagination.pageOf', { page, total: totalPages }),
    announcement: (page, totalPages) =>
      config.pageChangeAnnouncement?.(page, totalPages) ??
      i18n.translate('a11y.pageChanged', { page, total: totalPages }),
  };
}
