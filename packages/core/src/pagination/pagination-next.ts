import {
  Directive,
  ElementRef,
  afterNextRender,
  computed,
  inject,
} from '@angular/core';
import { KjFocusRing } from '../primitives';
import { KjVariant, KjSize } from '../presets';
import { KJ_PAGINATION } from './pagination.context';
import { KJ_PAGINATION_CONFIG } from './config';

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
  host: {
    '[attr.aria-label]': 'config.nextLabel',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.tabindex]': '"0"',
    '[attr.data-pagination-action]': '"next"',
    '(click)': 'onClick($event)',
  },
})
export class KjPaginationNext {
  /** @internal */
  readonly pagination = inject(KJ_PAGINATION);
  /** @internal */
  readonly config = inject(KJ_PAGINATION_CONFIG);
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
