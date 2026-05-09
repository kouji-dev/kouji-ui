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
 * Boundary control that jumps to page 1. Disabled when the parent is
 * already on the first page or the dataset is empty; remains focusable
 * (`tabindex="0"`) so AT users can still discover the control.
 *
 * @example
 * ```html
 * <button kjButton kjPaginationFirst>«</button>
 * ```
 *
 * @doc-category Core/Navigation
 * @doc
 * @doc-name pagination
 */
@Directive({
  selector: '[kjPaginationFirst]',
  standalone: true,
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize, inputs: ['kjSize'] },
    KjFocusRing,
  ],
  host: {
    '[attr.aria-label]': 'config.firstLabel',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.tabindex]': '"0"',
    '[attr.data-pagination-action]': '"first"',
    '(click)': 'onClick($event)',
  },
})
export class KjPaginationFirst {
  /** @internal */
  readonly pagination = inject(KJ_PAGINATION);
  /** @internal */
  readonly config = inject(KJ_PAGINATION_CONFIG);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** True when on page 1 or the dataset is empty. */
  readonly isDisabled = computed(() => this.pagination.isFirstPage());

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
    this.pagination.goToFirst();
  }
}
