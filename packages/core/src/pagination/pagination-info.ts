import {
  Directive,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  signal,
} from '@angular/core';
import { KJ_PAGINATION } from './pagination.context';
import { KJ_PAGINATION_CONFIG } from './config';

/**
 * Renders the localised "Page N of M" status string. Apply to a
 * `<span>` (or any inline element) inside a `KjPagination`. The directive
 * sets `textContent` reactively on every page or total-pages change,
 * **only when the host is empty** at attach time — when the consumer
 * projects their own content (`<span kjPaginationInfo>Showing page {{ page }}</span>`),
 * the directive yields and the consumer's binding wins.
 *
 * The info span is AT-readable (no `aria-hidden`); AT users hear
 * "Pagination, Page 2 of 10" when they enter the navigation landmark.
 *
 * @example
 * ```html
 * <span kjPaginationInfo></span>
 * ```
 *
 * @category Core/Navigation
 */
@Directive({
  selector: '[kjPaginationInfo]',
  standalone: true,
  host: {
    '[attr.data-pagination-info]': '""',
  },
})
export class KjPaginationInfo {
  /** @internal */
  readonly pagination = inject(KJ_PAGINATION);
  /** @internal */
  readonly config = inject(KJ_PAGINATION_CONFIG);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Latched true on first render; gates the `textContent` mutation. */
  private readonly attached = signal(false);
  /** Latched true if the consumer projected their own content. */
  private consumerOwnsContent = false;

  constructor() {
    afterNextRender(() => {
      const host = this.el.nativeElement;
      this.consumerOwnsContent = host.childNodes.length > 0;
      this.attached.set(true);
    });

    // Effect lives in injection context (constructor). It is reactive on
    // `attached`, `page`, and `totalPages`; the body is a no-op until the
    // host is attached and the consumer-content latch has been determined.
    effect(() => {
      if (!this.attached()) return;
      if (this.consumerOwnsContent) return;
      this.el.nativeElement.textContent = this.config.infoTemplate(
        this.pagination.page(),
        this.pagination.totalPages(),
      );
    });
  }
}
