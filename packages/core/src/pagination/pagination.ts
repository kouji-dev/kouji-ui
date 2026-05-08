import {
  Directive,
  ElementRef,
  ModelSignal,
  Signal,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  isDevMode,
  model,
  output,
  untracked,
} from '@angular/core';
import { bindPresets } from '../presets';
import { KJ_PAGINATION_CONFIG } from './config';
import {
  KJ_PAGINATION,
  KjPageToken,
  KjPaginationContext,
} from './pagination.context';
import { computePageTokens } from './page-tokens';

/**
 * Root of the Pagination directive family. Owns the page-state model
 * (`kjPage`, `kjTotalPages`), the sliding-window algorithm
 * (`kjSiblingCount`, `kjBoundaryCount`), the `pages` computed, the
 * boundary-state computeds (`isFirstPage`, `isLastPage`), and a polite
 * live-region announcement on every page change. Provides
 * {@link KJ_PAGINATION} to descendants for ARIA wiring and selection
 * coordination.
 *
 * Applied to a `<nav>` element. Hosts `aria-label="Pagination"` (the
 * navigation landmark's accessible name; configurable via
 * `KJ_PAGINATION_CONFIG.navigationLabel`).
 *
 * Page numbers are **1-indexed** and `kjPage` is clamped to
 * `[1, kjTotalPages()]` on every write. Out-of-range writes warn in dev
 * mode and silently clamp.
 *
 * @example
 * ```html
 * <nav kjPagination [(kjPage)]="page" [kjTotalPages]="10">
 *   <button kjButton kjPaginationPrevious>Previous</button>
 *   @for (token of pagination.pages(); track token) {
 *     @if (token === 'ellipsis-left' || token === 'ellipsis-right') {
 *       <span kjPaginationEllipsis>…</span>
 *     } @else {
 *       <button kjButton kjPaginationItem [kjPage]="token">{{ token }}</button>
 *     }
 *   }
 *   <button kjButton kjPaginationNext>Next</button>
 * </nav>
 * ```
 *
 * @category Core/Navigation
 * @doc
 * @doc-name pagination
 * @doc-is-main
 */
@Directive({
  selector: '[kjPagination]',
  standalone: true,
  exportAs: 'kjPagination',
  providers: [
    { provide: KJ_PAGINATION, useExisting: KjPagination },
    ...bindPresets(KJ_PAGINATION_CONFIG),
  ],
  host: {
    '[attr.aria-label]': 'config.navigationLabel',
    '[attr.data-page]': 'page()',
    '[attr.data-total-pages]': 'totalPages()',
  },
})
export class KjPagination implements KjPaginationContext {
  /** @internal */
  readonly config = inject(KJ_PAGINATION_CONFIG);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Current page (1-indexed). Two-way bound — the canonical surface is
   * `[(kjPage)]`. Out-of-range writes are clamped to `[1, kjTotalPages()]`
   * with a dev-mode console warning.
   */
  readonly kjPage: ModelSignal<number> = model<number>(1);

  /** Total number of pages. May be `0` (empty dataset). */
  readonly kjTotalPages = input.required<number>();

  /**
   * Pages adjacent to the current page on each side. Default `1`, so the
   * window includes `[current-1, current, current+1]`. `0` collapses the
   * window to `[current]`.
   */
  readonly kjSiblingCount = input<number>(this.config.defaults.siblingCount);

  /**
   * Pages anchored at the start and end. Default `1`, so `[1]` and
   * `[totalPages]` are always visible. `0` removes the boundary anchors.
   */
  readonly kjBoundaryCount = input<number>(this.config.defaults.boundaryCount);

  /**
   * Cascaded variant for child items / boundary controls that did not set
   * their own. Forwarded to each child's `KjVariant` host directive via
   * the `KJ_PAGINATION` context.
   */
  readonly kjVariant = input<string>(this.config.defaults.variant);

  /** Cascaded size for child items / boundary controls. */
  readonly kjSize = input<string>(this.config.defaults.size);

  /**
   * Page-change output. Mirrors `kjPage` writes; emitted whenever the
   * model value settles after a clamp / boundary navigation / item click.
   */
  readonly kjPageChange = output<number>();

  /** Read-only view of the current page. */
  readonly page: Signal<number> = computed(() => this.kjPage());

  /** Read-only view of the total page count. */
  readonly totalPages: Signal<number> = computed(() => this.kjTotalPages());

  /** Cascaded variant exposed via context for children. */
  readonly variant: Signal<string> = computed(() => this.kjVariant());

  /** Cascaded size exposed via context for children. */
  readonly size: Signal<string> = computed(() => this.kjSize());

  /** Output of the windowed page-token algorithm. */
  readonly pages: Signal<readonly KjPageToken[]> = computed(() =>
    computePageTokens(
      this.kjPage(),
      this.kjTotalPages(),
      this.kjSiblingCount(),
      this.kjBoundaryCount(),
    ),
  );

  /** True on page 1, or whenever the dataset is empty. */
  readonly isFirstPage: Signal<boolean> = computed(
    () => this.kjTotalPages() <= 0 || this.kjPage() <= 1,
  );

  /** True on the last page, or whenever the dataset is empty. */
  readonly isLastPage: Signal<boolean> = computed(
    () => this.kjTotalPages() <= 0 || this.kjPage() >= this.kjTotalPages(),
  );

  /** The visually-hidden live-region span injected at construction. */
  private liveRegion: HTMLSpanElement | null = null;

  constructor() {
    // Clamp out-of-range writes. The model can settle on a clamped value
    // in a single re-run — the effect is idempotent because clamping a
    // value that is already in-range is a no-op write that signals reject.
    effect(() => {
      const total = this.kjTotalPages();
      const v = this.kjPage();
      if (total <= 0) {
        // Empty dataset: lock to 1 so consumer state is well-defined; do
        // not emit page-change for the lock-in itself.
        if (v !== 1) untracked(() => this.kjPage.set(1));
        return;
      }
      if (v < 1) {
        if (isDevMode()) {
          console.warn(
            `[kj] kjPage=${v} is out of range; clamping to 1.`,
          );
        }
        untracked(() => this.kjPage.set(1));
      } else if (v > total) {
        if (isDevMode()) {
          console.warn(
            `[kj] kjPage=${v} exceeds kjTotalPages=${total}; clamping to ${total}.`,
          );
        }
        untracked(() => this.kjPage.set(total));
      }
    });

    // Emit kjPageChange on every settled page write. The output mirrors
    // the model so consumers using the explicit `(kjPageChange)` shape get
    // the same value regardless of whether the change came from a click,
    // a programmatic write, or the clamp.
    let lastEmitted: number | null = null;
    effect(() => {
      const v = this.kjPage();
      const total = this.kjTotalPages();
      // Skip emit while the value is mid-clamp — re-run will catch the
      // settled value on the next tick.
      if (total > 0 && (v < 1 || v > total)) return;
      if (v !== lastEmitted) {
        lastEmitted = v;
        this.kjPageChange.emit(v);
      }
    });

    // Inject the live region once the host has rendered. Polite by
    // default; the live region survives focus changes so AT users hear
    // "Page 5 of 10" even if the click moved focus elsewhere.
    afterNextRender(() => {
      if (typeof document === 'undefined') return;
      const span = document.createElement('span');
      span.setAttribute('aria-live', this.config.pageChangeAnnouncementPoliteness);
      span.setAttribute('aria-atomic', 'true');
      span.setAttribute('data-kj-pagination-live', '');
      span.setAttribute(
        'style',
        'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0',
      );
      this.el.nativeElement.appendChild(span);
      this.liveRegion = span;
    });

    // Live-region announcement effect lives in injection context. The
    // first reactive run primes `lastAnnounced` so the initial render
    // does not produce a spurious announcement; subsequent changes
    // re-emit the configured template into the visually-hidden region.
    let lastAnnounced: number | null = null;
    effect(() => {
      const page = this.kjPage();
      const total = this.kjTotalPages();
      if (total > 0 && (page < 1 || page > total)) return;
      if (lastAnnounced === null) {
        lastAnnounced = page;
        return;
      }
      if (lastAnnounced === page) return;
      lastAnnounced = page;
      if (!this.liveRegion) return;
      // Brief clear-then-set so AT consistently picks up the change
      // even when the same string is announced repeatedly (e.g. on a
      // single-page dataset where every "click" yields "Page 1 of 1").
      const region = this.liveRegion;
      const message = this.config.pageChangeAnnouncement(page, total);
      region.textContent = '';
      // queueMicrotask makes the clear paint before the set; AT pickup
      // is more reliable than two synchronous writes back-to-back.
      queueMicrotask(() => {
        // Guard against the directive being torn down between writes.
        if (this.liveRegion === region) region.textContent = message;
      });
    });
  }

  /** Jump to a specific page. Clamped to `[1, totalPages]`. */
  goToPage(page: number): void {
    const total = this.kjTotalPages();
    if (total <= 0) return;
    const clamped = Math.min(Math.max(1, page), total);
    if (this.kjPage() !== clamped) this.kjPage.set(clamped);
  }

  /** Jump to page 1. */
  goToFirst(): void {
    if (this.kjTotalPages() <= 0) return;
    if (this.kjPage() !== 1) this.kjPage.set(1);
  }

  /** Jump to the last page. */
  goToLast(): void {
    const total = this.kjTotalPages();
    if (total <= 0) return;
    if (this.kjPage() !== total) this.kjPage.set(total);
  }

  /** Advance one page. No-op on the last page. */
  goToNext(): void {
    const total = this.kjTotalPages();
    if (total <= 0) return;
    const next = this.kjPage() + 1;
    if (next <= total) this.kjPage.set(next);
  }

  /** Retreat one page. No-op on page 1. */
  goToPrevious(): void {
    if (this.kjTotalPages() <= 0) return;
    const prev = this.kjPage() - 1;
    if (prev >= 1) this.kjPage.set(prev);
  }
}
