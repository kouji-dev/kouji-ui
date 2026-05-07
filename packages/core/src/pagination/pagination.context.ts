import { InjectionToken, Signal } from '@angular/core';

/**
 * A single token in the windowed page list produced by the page-token
 * algorithm. Numeric tokens render as page buttons (`KjPaginationItem`);
 * the two `'ellipsis-*'` variants are rendered as a `KjPaginationEllipsis`
 * gap indicator. The two ellipsis variants are kept distinct so Angular's
 * `@for (… ; track token)` can build stable, collision-free tracks.
 */
export type KjPageToken = number | 'ellipsis-left' | 'ellipsis-right';

/**
 * Context exposed by `KjPagination` to its child directives
 * (`KjPaginationItem`, `KjPaginationPrevious`, `KjPaginationNext`,
 * `KjPaginationFirst`, `KjPaginationLast`, `KjPaginationEllipsis`,
 * `KjPaginationInfo`). Holds the page state, the algorithm output, the
 * boundary computeds, and the imperative navigation methods.
 *
 * Children are stateless reflectors of the root's state — every
 * derivation lives here so a single source of truth drives ARIA wiring,
 * `data-current` / `data-disabled` reflection, and the live-region
 * announcement.
 */
export interface KjPaginationContext {
  /** Current page (1-indexed). */
  readonly page: Signal<number>;
  /** Total number of pages. May be `0` (empty dataset). */
  readonly totalPages: Signal<number>;
  /** Output of the windowed page-token algorithm. */
  readonly pages: Signal<readonly KjPageToken[]>;
  /** True when the current page is `1` or the dataset is empty. */
  readonly isFirstPage: Signal<boolean>;
  /** True when the current page is `totalPages` or the dataset is empty. */
  readonly isLastPage: Signal<boolean>;
  /** Cascaded variant for children that did not set their own. */
  readonly variant: Signal<string>;
  /** Cascaded size for children that did not set their own. */
  readonly size: Signal<string>;
  /** Jump to a specific page (1-indexed); clamps to `[1, totalPages]`. */
  goToPage(page: number): void;
  /** Jump to page 1. No-op when already on page 1 / empty dataset. */
  goToFirst(): void;
  /** Jump to the last page. No-op when already there / empty dataset. */
  goToLast(): void;
  /** Advance one page. No-op when on the last page. */
  goToNext(): void;
  /** Retreat one page. No-op when on the first page. */
  goToPrevious(): void;
}

/** Injection token for the root `KjPagination` directive context. */
export const KJ_PAGINATION = new InjectionToken<KjPaginationContext>('KjPagination');
