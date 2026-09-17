import { Directive, Signal, computed, inject, input } from '@angular/core';
import { KjDisabled, KjFocusRing } from '../primitives';
import { KJ_SIZE_FALLBACK, KJ_VARIANT_FALLBACK, KjVariant, KjSize } from '../presets';
import { KJ_PAGINATION } from './pagination.context';
import { injectKjPaginationLabels } from './labels';
import { injectParent } from '../primitives/diagnostics/inject-parent';

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
 * @doc-category Core/Navigation
 * @doc
 * @doc-name pagination
 */
@Directive({
  selector: '[kjPaginationItem]',
  standalone: true,
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize, inputs: ['kjSize'] },
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFocusRing,
  ],
  providers: [
    // Bridge the pagination root's cascaded variant/size into the preset
    // fallback chain: explicit input > root cascade > provideKjPagination
    // default. See KJ_VARIANT_FALLBACK / KJ_SIZE_FALLBACK.
    { provide: KJ_VARIANT_FALLBACK, useFactory: () => injectParent(KJ_PAGINATION, { child: 'KjPaginationItem', parent: '[kjPagination]' }).variant },
    { provide: KJ_SIZE_FALLBACK, useFactory: () => injectParent(KJ_PAGINATION, { child: 'KjPaginationItem', parent: '[kjPagination]' }).size },
  ],
  host: {
    '[attr.aria-current]': 'isCurrent() ? "page" : null',
    '[attr.data-current]': 'isCurrent() ? "true" : "false"',
    '[attr.aria-label]': 'ariaLabel()',
    '(click)': 'onClick($event)',
  },
})
export class KjPaginationItem {
  /** @internal */
  readonly pagination = injectParent(KJ_PAGINATION, { child: 'KjPaginationItem', parent: '[kjPagination]' });
  /**
   * Resolved label set: a `provideKjPagination(…)` override when one is set,
   * otherwise the active i18n catalog (`pagination.page`).
   */
  private readonly labels = injectKjPaginationLabels();

  /**
   * Page number this item navigates to (1-indexed). Required — the
   * directive cannot reflect `aria-current` or wire its click without
   * knowing which page it represents.
   */
  readonly kjPage = input.required<number>();

  /**
   * Per-item disabled state, owned by the composed `KjDisabled` host
   * directive — it reflects `aria-disabled` / `data-disabled` and applies
   * `booleanAttribute`, so the bare `kjDisabled` attribute works. This
   * directive adds the click suppression on top, so consumer-driven "this
   * page is loading and cannot be re-clicked" affordances behave like
   * Previous / Next / First / Last. Default `false`.
   *
   * Read-only mirror of the composed state — bind `[kjDisabled]` on the host.
   */
  readonly kjDisabled: Signal<boolean> = inject(KjDisabled).disabled;

  /** Whether this item represents the currently active page. */
  readonly isCurrent = computed(() => this.pagination.page() === this.kjPage());

  /** Computed `aria-label` string. */
  readonly ariaLabel = computed(() =>
    this.labels.pageItem(this.kjPage(), this.pagination.totalPages()),
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
