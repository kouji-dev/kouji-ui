import { InjectionToken, Provider } from '@angular/core';
import { type KjDeepPartial, mergeKjConfig } from '../presets/merge-config';
import type { KjLivePoliteness } from '../a11y/live-region';

/**
 * Configuration shape for the Pagination directive family. Exposes preset
 * lists, default sliding-window sizes, and the (mostly i18n-facing) label
 * functions and templates the directives reflect into the DOM.
 */
export interface KjPaginationConfig {
  variants: string[];
  sizes: string[];
  defaults: {
    variant: string;
    size: string;
    siblingCount: number;
    boundaryCount: number;
  };
  /**
   * Per-string overrides. **Every one is optional and unset by default** —
   * the strings come from the {@link KjTranslateService} catalog
   * (`pagination.*`, `a11y.pageChanged`), which is the library's single i18n
   * surface. Set a field here only to override one string independently of
   * locale; to translate pagination, ship a catalog with
   * `provideKjTranslations(…)` instead.
   */
  /** `aria-label` on the root `<nav>` host element. Catalog: `pagination.nav`. */
  navigationLabel?: string;
  /** `aria-label` on `KjPaginationPrevious` host. Catalog: `pagination.previous`. */
  previousLabel?: string;
  /** `aria-label` on `KjPaginationNext` host. Catalog: `pagination.next`. */
  nextLabel?: string;
  /** `aria-label` on `KjPaginationFirst` host. Catalog: `pagination.first`. */
  firstLabel?: string;
  /** `aria-label` on `KjPaginationLast` host. Catalog: `pagination.last`. */
  lastLabel?: string;
  /** Visually-hidden text for the gap indicator's AT readout. Catalog: `pagination.more`. */
  ellipsisLabel?: string;
  /** Computes the per-item `aria-label` from `(page, totalPages)`. Catalog: `pagination.page`. */
  pageItemLabel?: (page: number, totalPages: number) => string;
  /** Renders the visible "Page N of M" text in `KjPaginationInfo`. Catalog: `pagination.pageOf`. */
  infoTemplate?: (page: number, totalPages: number) => string;
  /** Live-region announcement template for page changes. Catalog: `a11y.pageChanged`. */
  pageChangeAnnouncement?: (page: number, totalPages: number) => string;
  /** ARIA politeness for the page-change live region. */
  pageChangeAnnouncementPoliteness: KjLivePoliteness;
}

/**
 * Default Pagination presets shipped by kouji-ui. Exported so consumers can
 * spread when extending: `[...KJ_PAGINATION_DEFAULTS.variants, 'brand']`.
 *
 * Carries no English label literals — see the label fields on
 * {@link KjPaginationConfig}.
 */
export const KJ_PAGINATION_DEFAULTS: KjPaginationConfig = {
  variants: ['default', 'outline', 'ghost'],
  sizes: ['xs', 'sm', 'md', 'lg'],
  defaults: { variant: 'default', size: 'md', siblingCount: 1, boundaryCount: 1 },
  // No label literals: every string resolves through the i18n catalog
  // (`injectKjPaginationLabels`). Leaving them `undefined` is what makes the
  // catalog the source of truth rather than a second, competing surface.
  pageChangeAnnouncementPoliteness: 'polite',
};

/**
 * DI token for the active Pagination presets. Default factory yields
 * `KJ_PAGINATION_DEFAULTS`. Override via `provideKjPagination(…)` at the
 * application or component scope.
 */
export const KJ_PAGINATION_CONFIG = new InjectionToken<KjPaginationConfig>(
  'kj.pagination.config',
  { factory: () => KJ_PAGINATION_DEFAULTS },
);

/**
 * Configures the Pagination presets / labels for the enclosing injector.
 *
 * Deep-merges over {@link KJ_PAGINATION_DEFAULTS} through
 * {@link mergeKjConfig} — pass only the fields you want to change, at any
 * depth (`provideKjPagination({ defaults: { siblingCount: 2 } })` keeps the
 * shipped variant/size defaults). Arrays and label functions **replace**.
 *
 * Labels default to the {@link KjTranslateService} catalog, so translating
 * pagination is `provideKjTranslations({ fr: FR_CATALOG })` — reach for the
 * label fields here only to override a *single* string independently of
 * locale.
 */
export function provideKjPagination(config: KjDeepPartial<KjPaginationConfig>): Provider[] {
  return [{ provide: KJ_PAGINATION_CONFIG, useValue: mergeKjConfig(KJ_PAGINATION_DEFAULTS, config) }];
}
