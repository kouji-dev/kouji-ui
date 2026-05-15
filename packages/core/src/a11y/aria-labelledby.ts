import { Directive, computed, input } from '@angular/core';

/**
 * Wires `aria-labelledby` to one or more element IDs.
 * Accepts a single ID string or an array of ID strings.
 * Removes the attribute automatically when the value is empty.
 *
 * @example
 * ```html
 * <section kjAriaLabelledBy [kjLabelledBy]="'features-heading'">
 *   <h2 id="features-heading">Features</h2>
 *   …
 * </section>
 * ```
 * @doc-category Core/Accessibility
 * @doc
 * @doc-name a11y
 * @doc-description Wires `aria-labelledby` from a single id or an array of ids onto any element.
 */
@Directive({
  selector: '[kjAriaLabelledBy]',
  standalone: true,
  host: {
    '[attr.aria-labelledby]': 'ariaLabelledBy()',
  },
})
export class KjAriaLabelledBy {
  /** One or more element IDs to reference via `aria-labelledby`. */
  kjLabelledBy = input<string | readonly string[]>('');

  /** @internal */
  readonly ariaLabelledBy = computed(() => {
    const val = this.kjLabelledBy();
    const ids = Array.isArray(val) ? val : [val];
    const filtered = ids.filter(Boolean);
    return filtered.length ? filtered.join(' ') : null;
  });
}
