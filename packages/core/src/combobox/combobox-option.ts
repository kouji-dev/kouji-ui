import { computed, Directive, inject } from '@angular/core';
import { KjListItem, injectListItem } from '../primitives/list';
import { KjCombobox } from './combobox-root';

/**
 * One option inside the combobox listbox. Composes `KjListItem` for
 * id/value/label/disabled, activation (click + Enter/Space), and the
 * shared selection toggle. Post-selection side-effects (close overlay,
 * set query, emit commit) are run by `KjCombobox.afterSelect`, called
 * from `KjListItem` — this directive only contributes the option role,
 * the `kjOption*` input aliases, and the `aria-activedescendant`-driven
 * `data-active` styling hook.
 *
 * @doc-category Core/Inputs
 */
@Directive({
  selector: '[kjComboboxOption]',
  standalone: true,
  hostDirectives: [
    {
      directive: KjListItem,
      inputs: [
        'kjItemValue:kjOptionValue',
        'kjItemLabel:kjOptionLabel',
        'kjItemKeywords:kjOptionKeywords',
      ],
    },
  ],
  host: {
    'class': 'kj-combobox-option',
    'role': 'option',
    '[attr.data-active]': 'isActive() ? "" : null',
  },
})
export class KjComboboxOption {
  private readonly item     = injectListItem<unknown>();
  private readonly combobox = inject(KjCombobox);

  /** Whether this option is the currently active (aria-activedescendant) item. */
  readonly isActive = computed(() =>
    this.combobox.activeId() !== null && this.combobox.activeId() === this.item.id,
  );
}
