import { InjectionToken, Provider } from '@angular/core';
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
  /** `aria-label` on the root `<nav>` host element. */
  navigationLabel: string;
  /** `aria-label` on `KjPaginationPrevious` host. */
  previousLabel: string;
  /** `aria-label` on `KjPaginationNext` host. */
  nextLabel: string;
  /** `aria-label` on `KjPaginationFirst` host. */
  firstLabel: string;
  /** `aria-label` on `KjPaginationLast` host. */
  lastLabel: string;
  /** Visually-hidden text for the gap indicator's AT readout. */
  ellipsisLabel: string;
  /** Computes the per-item `aria-label` from `(page, totalPages)`. */
  pageItemLabel: (page: number, totalPages: number) => string;
  /** Renders the visible "Page N of M" text in `KjPaginationInfo`. */
  infoTemplate: (page: number, totalPages: number) => string;
  /** Live-region announcement template for page changes. */
  pageChangeAnnouncement: (page: number, totalPages: number) => string;
  /** ARIA politeness for the page-change live region. */
  pageChangeAnnouncementPoliteness: KjLivePoliteness;
}

/**
 * Default Pagination presets shipped by kouji-ui. Exported so consumers can
 * spread when extending: `[...KJ_PAGINATION_DEFAULTS.variants, 'brand']`.
 */
export const KJ_PAGINATION_DEFAULTS: KjPaginationConfig = {
  variants: ['default', 'outline', 'ghost'],
  sizes: ['sm', 'md', 'lg'],
  defaults: { variant: 'default', size: 'md', siblingCount: 1, boundaryCount: 1 },
  navigationLabel: 'Pagination',
  previousLabel: 'Previous page',
  nextLabel: 'Next page',
  firstLabel: 'First page',
  lastLabel: 'Last page',
  ellipsisLabel: 'More pages',
  pageItemLabel: (page) => `Page ${page}`,
  infoTemplate: (page, totalPages) => `Page ${page} of ${totalPages}`,
  pageChangeAnnouncement: (page, totalPages) => `Page ${page} of ${totalPages}`,
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
 * Shallow-merges over the defaults — pass only the fields you want to
 * override.
 */
export function provideKjPagination(config: Partial<KjPaginationConfig>): Provider[] {
  return [
    {
      provide: KJ_PAGINATION_CONFIG,
      useValue: { ...KJ_PAGINATION_DEFAULTS, ...config },
    },
  ];
}
