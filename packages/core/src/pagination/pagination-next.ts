import {
  Directive,
  ElementRef,
  afterNextRender,
  computed,
  inject,
} from '@angular/core';
import { KjFocusRing } from '../primitives';
import { KJ_SIZE_FALLBACK, KJ_VARIANT_FALLBACK, KjVariant, KjSize } from '../presets';
import { KJ_PAGINATION } from './pagination.context';
import { injectKjPaginationLabels } from './labels';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Boundary control that advances one page. Mirror of
 * {@link KjPaginationPrevious}: disabled (via `aria-disabled`, not the
 * native `disabled` attribute) when the parent is on the last page or
 * the dataset is empty; remains in the focus ring (`tabindex="0"`) even
 * when disabled.
 *
 * @example
 * ```html
 * <button kjButton kjPaginationNext>Next</button>
 * ```
 *
 * @doc-category Core/Navigation
 * @doc
 * @doc-name pagination
 */
@Directive({
  selector: '[kjPaginationNext]',
  standalone: true,
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize, inputs: ['kjSize'] },
    KjFocusRing,
  ],
  providers: [
    // Bridge the pagination root's cascaded variant/size into the preset
    // fallback chain: explicit input > root cascade > provideKjPagination
    // default. See KJ_VARIANT_FALLBACK / KJ_SIZE_FALLBACK.
    { provide: KJ_VARIANT_FALLBACK, useFactory: () => injectParent(KJ_PAGINATION, { child: 'KjPaginationNext', parent: '[kjPagination]' }).variant },
    { provide: KJ_SIZE_FALLBACK, useFactory: () => injectParent(KJ_PAGINATION, { child: 'KjPaginationNext', parent: '[kjPagination]' }).size },
  ],
  host: {
    '[attr.aria-label]': 'labels.next()',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.tabindex]': '"0"',
    '[attr.data-pagination-action]': '"next"',
    '(click)': 'onClick($event)',
  },
})
export class KjPaginationNext {
  /** @internal */
  readonly pagination = injectParent(KJ_PAGINATION, { child: 'KjPaginationNext', parent: '[kjPagination]' });
  /**
   * Resolved label set: a `provideKjPagination(…)` override when one is set,
   * otherwise the active i18n catalog. Locale-reactive.
   * @internal
   */
  readonly labels = injectKjPaginationLabels();
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** True when the parent is on the last page or the dataset is empty. */
  readonly isDisabled = computed(() => this.pagination.isLastPage());

  constructor() {
    afterNextRender(() => {
      const node = this.el.nativeElement;
      const block = (event: Event) => {
        if (this.isDisabled()) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      };
      const blockKey = (event: KeyboardEvent) => {
        if (!this.isDisabled()) return;
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      };
      node.addEventListener('click', block, { capture: true });
      node.addEventListener('keydown', blockKey, { capture: true });
    });
  }

  /** @internal */
  onClick(event: Event): void {
    if (this.isDisabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.pagination.goToNext();
  }
}
