import { Directive, booleanAttribute, input } from '@angular/core';

/**
 * Applies disabled state to any element via ARIA and data attributes.
 * Compose via `hostDirectives` on other directives to add disabled behavior.
 *
 * @example
 * ```html
 * <div kjDisabled [kjDisabled]="isLoading()">Content</div>
 * ```
 * @category Core/Primitives
 */
@Directive({
  selector: '[kjDisabled]',
  standalone: true,
  host: {
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export class KjDisabled {
  /** Whether the element is disabled. Reflects via `aria-disabled` and `data-disabled`. */
  readonly disabled = input<boolean, unknown>(false, { alias: 'kjDisabled', transform: booleanAttribute });
}
