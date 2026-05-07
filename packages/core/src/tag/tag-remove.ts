import { Directive, computed, inject, input } from '@angular/core';
import { KjButton } from '../button/button';
import { KJ_TAG } from './tag.context';

/**
 * Trailing remove control for a `KjTag`. Composes `KjButton` so the remove
 * action inherits native `<button>` semantics, ARIA-disabled handling,
 * capture-phase click suppression, and the focus ring — there is no second
 * keyboard / a11y story to maintain.
 *
 * The accessible name is derived automatically from the parent tag's
 * projected text content (`"Remove {label}"`) via a `MutationObserver` on
 * `KjTag`. Override with `kjTagRemoveLabel` when the auto-derived name is
 * insufficient (e.g. icon-only tag, custom phrasing).
 *
 * @example
 * ```html
 * <span kjTag>
 *   Acme
 *   <button kjTagRemove>×</button>
 * </span>
 * ```
 * @category Core/Data display
 */
@Directive({
  selector: '[kjTagRemove]',
  standalone: true,
  hostDirectives: [KjButton],
  host: {
    'type': 'button',
    '[attr.aria-label]': 'effectiveLabel()',
    '(click)': 'onClick($event)',
  },
})
export class KjTagRemove {
  private readonly tag = inject(KJ_TAG);

  /** Override the auto-derived `aria-label` for the remove button. */
  readonly kjTagRemoveLabel = input<string | undefined>(undefined);

  /** Computed accessible name: explicit override wins, else `"Remove {label}"`. */
  protected readonly effectiveLabel = computed<string>(() => {
    const override = this.kjTagRemoveLabel();
    if (override) return override;
    const label = this.tag.textContent();
    return label ? `Remove ${label}` : 'Remove';
  });

  /** @internal Click handler — fires the parent tag's `(kjTagRemoved)`. */
  onClick(event: Event): void {
    if (this.tag.disabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    event.stopPropagation();
    this.tag.remove();
  }
}
