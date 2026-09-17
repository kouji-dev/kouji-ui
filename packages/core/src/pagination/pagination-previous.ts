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
 * Boundary control that retreats one page. Disabled (via `aria-disabled`,
 * not the native `disabled` attribute) when the parent is on the first
 * page or the dataset is empty. Stays in the focus ring even when
 * disabled (`tabindex="0"`) — matches Button's `disabledInteractive`
 * stance so AT users discover the control and learn it is currently
 * inactive (kouji's WCAG 2.1 AAA stance).
 *
 * @example
 * ```html
 * <button kjButton kjPaginationPrevious>Previous</button>
 * ```
 *
 * @doc-category Core/Navigation
 * @doc
 * @doc-name pagination
 */
@Directive({
  selector: '[kjPaginationPrevious]',
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
    { provide: KJ_VARIANT_FALLBACK, useFactory: () => injectParent(KJ_PAGINATION, { child: 'KjPaginationPrevious', parent: '[kjPagination]' }).variant },
    { provide: KJ_SIZE_FALLBACK, useFactory: () => injectParent(KJ_PAGINATION, { child: 'KjPaginationPrevious', parent: '[kjPagination]' }).size },
  ],
  host: {
    '[attr.aria-label]': 'labels.previous()',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.tabindex]': '"0"',
    '[attr.data-pagination-action]': '"previous"',
    '(click)': 'onClick($event)',
  },
})
export class KjPaginationPrevious {
  /** @internal */
  readonly pagination = injectParent(KJ_PAGINATION, { child: 'KjPaginationPrevious', parent: '[kjPagination]' });
  /**
   * Resolved label set: a `provideKjPagination(…)` override when one is set,
   * otherwise the active i18n catalog. Locale-reactive.
   * @internal
   */
  readonly labels = injectKjPaginationLabels();
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** True when the parent is on page 1 or the dataset is empty. */
  readonly isDisabled = computed(() => this.pagination.isFirstPage());

  constructor() {
    // Capture-phase listeners fire before any consumer template-bound
    // (click) / (keydown) handler and before native button activation,
    // so the suppression actually prevents downstream navigation.
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
    this.pagination.goToPrevious();
  }
}
