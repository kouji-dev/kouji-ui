import { Directive, computed, inject, input } from '@angular/core';
import { KjFocusRing } from '../primitives';
import { KjVariant, KjSize } from '../presets';
import { KJ_PAGINATION } from './pagination.context';
import { KJ_PAGINATION_CONFIG } from './config';

/**
 * Per-page button within a `KjPagination`. Apply to `<button>` (in-page
 * state) or `<a>` (routing variant). Reflects `aria-current="page"` /
 * `data-current="true"` when the item's `kjPage` matches the parent's
 * current page; the directive is tag-agnostic.
 *
 * Click on an enabled item calls the parent's `goToPage(kjPage())`. The
 * directive does not call `preventDefault()` — when the host is an `<a>`
 * with `routerLink`, the route change is the navigation and the model
 * write either follows from the URL-driven binding or from this click.
 *
 * @example
 * ```html
 * <button kjButton kjPaginationItem [kjPage]="3">3</button>
 * ```
 *
 * @category Core/Navigation
 */
@Directive({
  selector: '[kjPaginationItem]',
  standalone: true,
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize, inputs: ['kjSize'] },
    KjFocusRing,
  ],
  host: {
    '[attr.aria-current]': 'isCurrent() ? "page" : null',
    '[attr.data-current]': 'isCurrent() ? "true" : "false"',
    '[attr.aria-disabled]': 'kjDisabled() ? "true" : null',
    '[attr.data-disabled]': 'kjDisabled() ? "" : null',
    '[attr.aria-label]': 'ariaLabel()',
    '(click)': 'onClick($event)',
  },
})
export class KjPaginationItem {
  /** @internal */
  readonly pagination = inject(KJ_PAGINATION);
  private readonly config = inject(KJ_PAGINATION_CONFIG);

  /**
   * Page number this item navigates to (1-indexed). Required — the
   * directive cannot reflect `aria-current` or wire its click without
   * knowing which page it represents.
   */
  readonly kjPage = input.required<number>();

  /**
   * Per-item disabled state. Composes the boundary-style disabled bundle
   * (capture-phase click suppression) so consumer-driven "this page is
   * loading and cannot be re-clicked" affordances work consistently with
   * Previous / Next / First / Last.
   */
  readonly kjDisabled = input<boolean>(false);

  /** Whether this item represents the currently active page. */
  readonly isCurrent = computed(() => this.pagination.page() === this.kjPage());

  /** Computed `aria-label` string. */
  readonly ariaLabel = computed(() =>
    this.config.pageItemLabel(this.kjPage(), this.pagination.totalPages()),
  );

  /** @internal */
  onClick(event: Event): void {
    if (this.kjDisabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.pagination.goToPage(this.kjPage());
  }
}
