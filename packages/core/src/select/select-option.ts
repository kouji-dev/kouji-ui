import { Directive } from '@angular/core';
import { KjListItem } from '../primitives/list';

/**
 * Individual option inside a `<kj-select-content>`. Public inputs
 * (`kjOptionValue`, `kjOptionLabel`) are aliased onto the composed
 * `KjListItem`'s `kjItemValue` / `kjItemLabel`. Activation (click /
 * Enter / Space), selection-model toggle, and overlay dismissal are
 * all owned by `KjListItem` + `KjSelect.afterSelect` — this directive
 * is just role + class + the input aliasing.
 *
 * @example
 * ```html
 * <div kjOption [kjOptionValue]="'apple'">Apple</div>
 * ```
 * @doc-category Core/Inputs
 */
@Directive({
  selector: '[kjOption]',
  standalone: true,
  hostDirectives: [
    {
      directive: KjListItem,
      inputs: [
        'kjItemValue:kjOptionValue',
        'kjItemLabel:kjOptionLabel',
      ],
    },
  ],
  host: {
    'class': 'kj-option',
    'role': 'option',
  },
})
export class KjOption {}
