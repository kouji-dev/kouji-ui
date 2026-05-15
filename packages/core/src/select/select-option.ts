import { Directive, inject } from '@angular/core';
import { KjListItem, injectListItem } from '../primitives/list';
import { KJ_SELECT } from './select-root';

/**
 * Individual option inside a `<kj-select-content>`. Public input
 * (`kjOptionValue`) is preserved by aliasing into the composed
 * `KjListItem`'s `kjItemValue`. Click / Enter / Space activation is
 * owned by `KjListItem`; this directive adapts the value back to
 * `KjSelect.select(value)` and sets the ARIA role.
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
      ],
    },
  ],
  host: {
    'class': 'kj-option',
    'role': 'option',
  },
})
export class KjOption {
  private readonly item = injectListItem<unknown>();
  private readonly select = inject(KJ_SELECT, { optional: true });

  constructor() {
    this.item.activate.subscribe(value => {
      if (this.select && value !== undefined) this.select.select(value);
    });
  }
}
