import { computed, Directive, inject } from '@angular/core';
import { KjListItem, injectListItem } from '../primitives/list';
import { KJ_COMBOBOX } from './combobox.context';

/**
 * One option inside the combobox listbox. Composes `KjListItem` for
 * id/value/label/disabled/click+keyboard activation; this directive
 * wires the value into `KjCombobox.select(value)` on commit and sets
 * role=option. `aria-selected` is driven by `KjSelectionModel` inside
 * `KjListItem`.
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
  private readonly item = injectListItem<unknown>();
  private readonly combobox = inject(KJ_COMBOBOX);

  /** Whether this option is the currently active (aria-activedescendant) item. */
  readonly isActive = computed(() =>
    this.combobox.activeId() !== null && this.combobox.activeId() === this.item.id,
  );

  constructor() {
    this.item.activate.subscribe(value => {
      if (value !== undefined) this.combobox.select(value);
    });
  }
}
