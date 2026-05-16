import { Directive, computed, inject } from '@angular/core';
import { KjCommandPalette } from './command-palette';

/**
 * Slot shown when the palette has no visible items and is not loading.
 * Sets `role="status"` and `aria-live="polite"` for live-region announcements.
 * Hidden when items are visible or loading is active.
 *
 * @example
 * ```html
 * <div kjCommandList>
 *   <div kjCommandEmpty>No results found.</div>
 *   <button kjCommandItem>…</button>
 * </div>
 * ```
 * @doc-category Core/Actions
 * @doc
 * @doc-name command-palette
 */
@Directive({
  selector: '[kjCommandEmpty]',
  standalone: true,
  host: {
    'role': 'status',
    'aria-live': 'polite',
    '[hidden]': 'isHidden()',
  },
})
export class KjCommandEmpty {
  private readonly ctx = inject(KjCommandPalette);

  /** Hidden unless there are no visible items and loading is false. */
  readonly isHidden = computed(() =>
    this.ctx.visibleItems().length > 0 || this.ctx.loading()
  );
}
