import { Directive, computed, input } from '@angular/core';

/**
 * Wires `aria-describedby` to one or more element IDs.
 * Accepts a single ID string or an array of ID strings.
 * Removes the attribute automatically when the value is empty.
 *
 * @example
 * ```html
 * <input kjAriaDescribedBy [kjDescribedBy]="['hint-id', errorId()]" />
 * <span id="hint-id">Format: DD/MM/YYYY</span>
 * ```
 * @category Core/Accessibility
 */
@Directive({
  selector: '[kjAriaDescribedBy]',
  standalone: true,
  host: {
    '[attr.aria-describedby]': 'ariaDescribedBy()',
  },
})
export class KjAriaDescribedBy {
  /** One or more element IDs to reference via `aria-describedby`. */
  kjDescribedBy = input<string | readonly string[]>('');

  /** @internal */
  readonly ariaDescribedBy = computed(() => {
    const val = this.kjDescribedBy();
    const ids = Array.isArray(val) ? val : [val];
    const filtered = ids.filter(Boolean);
    return filtered.length ? filtered.join(' ') : null;
  });
}
