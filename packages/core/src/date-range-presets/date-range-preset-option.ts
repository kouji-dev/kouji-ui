import { Directive, ElementRef, computed, effect, inject, input } from '@angular/core';
import { KJ_ROVING_TABINDEX, KjRovingTabindexItem } from '../a11y/roving-tabindex';
import {
  KJ_DATE_RANGE_PRESETS,
  type KjDateRangePreset,
} from './date-range-presets.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * One option inside a `[kjDateRangePresets]` listbox. Apply to a native
 * `<button>` so Enter / Space activation comes for free; the composed
 * {@link KjRovingTabindexItem} manages its `tabindex` so the list is
 * a single tab stop, placed on the selected preset.
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
  hostDirectives: [KjRovingTabindexItem],
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
  readonly ctx = injectParent(KJ_DATE_RANGE_PRESETS, { child: 'KjDateRangePresetOption', parent: '[kjDateRangePresets]' });
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly roving = inject(KJ_ROVING_TABINDEX, { optional: true });

  /** The preset this option represents. */
  readonly kjPreset = input.required<KjDateRangePreset>();

  /** Whether this option is the selected one. */
  readonly selected = computed(() => this.ctx.isSelected(this.kjPreset().id));

  constructor() {
    effect(() => {
      if (this.selected()) this.roving?.setActive(this.el.nativeElement);
    });
  }

  /** @internal */
  onClick(): void {
    this.ctx.select(this.kjPreset());
  }
}
