import { Directive, computed, inject, input } from '@angular/core';
import { KjRovingTabindexItemDirective } from '../a11y/roving-tabindex';
import {
  KJ_DATE_RANGE_PRESETS,
  type KjDateRangePreset,
} from './date-range-presets.context';

/**
 * One option inside a `[kjDateRangePresets]` listbox. Apply to a native
 * `<button>` so Enter / Space activation comes for free; the composed
 * {@link KjRovingTabindexItemDirective} manages its `tabindex` so the list is
 * a single tab stop.
 *
 * ```html
 * <button kjDateRangePresetOption [kjPreset]="preset">{{ preset.label }}</button>
 * ```
 *
 * @doc-category Core/Data input
 * @doc
 * @doc-name date-range-presets
 */
@Directive({
  selector: 'button[kjDateRangePresetOption]',
  standalone: true,
  exportAs: 'kjDateRangePresetOption',
  hostDirectives: [KjRovingTabindexItemDirective],
  host: {
    'type': 'button',
    'role': 'option',
    '[attr.aria-selected]': 'selected() ? "true" : "false"',
    '[attr.disabled]': 'ctx.disabled() ? "" : null',
    '(click)': 'onClick()',
  },
})
export class KjDateRangePresetOption {
  /** @internal */
  readonly ctx = inject(KJ_DATE_RANGE_PRESETS);

  /** The preset this option represents. */
  readonly kjPreset = input.required<KjDateRangePreset>();

  /** Whether this option is the selected one. */
  readonly selected = computed(() => this.ctx.isSelected(this.kjPreset().id));

  /** @internal */
  onClick(): void {
    this.ctx.select(this.kjPreset());
  }
}
