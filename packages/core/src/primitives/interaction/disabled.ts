import { Directive, booleanAttribute, input } from '@angular/core';

/**
 * Applies disabled state to any element via ARIA and data attributes.
 *
 * Compose via `hostDirectives` on other directives to add disabled behaviour.
 * The directive reflects `aria-disabled` and `data-disabled` so consumers do
 * not need to repeat the same host-binding pattern on every input.
 *
 * @example
 * ```html
 * <div kjDisabled [kjDisabled]="isLoading()">Content</div>
 * ```
 * @category Core/Primitives
 * @doc
 * @doc-name interaction
 * @doc-description Adds accessible disabled state to any element you compose it onto.
 * @doc-is-main
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
