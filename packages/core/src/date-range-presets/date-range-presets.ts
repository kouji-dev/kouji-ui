import {
  Directive,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
} from '@angular/core';
import { KjRovingTabindex } from '../a11y/roving-tabindex';
import { KjDisabled } from '../primitives/interaction/disabled';
import {
  KJ_DATE_RANGE_PRESETS,
  resolveDateRangePreset,
  type KjDateRange,
  type KjDateRangePreset,
  type KjDateRangePresetsContext,
} from './date-range-presets.context';
import { defaultDateRangePresets } from './default-presets';

/**
 * Headless Date Range Presets listbox. Renders a set of named quick-selects
 * ("Last 7 days", "This quarter", …) as `role="option"` children; picking one
 * resolves its `{ start, end }` range and commits the two-way `kjValue`.
 *
 * Designed to slot beside a range calendar, but usable standalone against any
 * `signal<KjDateRange | null>`.
 *
 * **Compound shape:**
 *
 * ```html
 * <div kjDateRangePresets [(kjValue)]="range">
 *   @for (p of presets.presets(); track p.id) {
 *     <button kjDateRangePresetOption [kjPreset]="p">{{ p.label }}</button>
 *   }
 * </div>
 * ```
 *
 * Composes {@link KjRovingTabindex} (vertical) so the whole list is a single
 * tab stop with Arrow / Home / End navigation.
 *
 * @doc-category Core/Data input
 * @doc
 * @doc-name date-range-presets
 * @doc-description Unstyled listbox of named date-range quick-selects that resolve to an inclusive `{ start, end }` range.
 * @doc-is-main
 */
@Directive({
  selector: '[kjDateRangePresets]',
  standalone: true,
  exportAs: 'kjDateRangePresets',
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjRovingTabindex,
  ],
  providers: [
    { provide: KJ_DATE_RANGE_PRESETS, useExisting: KjDateRangePresets },
  ],
  host: {
    'role': 'listbox',
    'aria-orientation': 'vertical',
    '[attr.aria-label]': 'kjLabel()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
  },
})
export class KjDateRangePresets implements KjDateRangePresetsContext {
  private readonly disabledHost = inject(KjDisabled);

  /** Selected range. Two-way bindable — `[(kjValue)]`. `null` when empty. */
  readonly kjValue = model<KjDateRange | null>(null);

  /** Presets to render as options. Defaults to {@link defaultDateRangePresets}. */
  readonly kjPresets = input<readonly KjDateRangePreset[]>(defaultDateRangePresets());

  /** Accessible name for the listbox. */
  readonly kjLabel = input<string>('Date range presets');

  /**
   * Injectable "now" for the preset math — defaults to the current instant.
   * Pass a fixed `Date` to freeze "today" (tests, storybook, replay).
   */
  readonly kjNow = input<Date | null>(null);

  /** Read-only — value displays but cannot be edited. */
  readonly kjReadonly = input<boolean, boolean | string>(false, { transform: booleanAttribute });

  // ── KjDateRangePresetsContext implementation ───────────────────────
  readonly presets = computed(() => this.kjPresets());
  readonly disabled = this.disabledHost.disabled;

  /**
   * Id of the preset whose resolved range matches `kjValue`, or `null`. Derived
   * from the value so an externally-set range still highlights its preset.
   */
  readonly selectedId = computed<string | null>(() => {
    const value = this.kjValue();
    if (!value) return null;
    const now = this.now();
    for (const preset of this.presets()) {
      const range = resolveDateRangePreset(preset, now);
      if (
        range
        && range.start.getTime() === value.start.getTime()
        && range.end.getTime() === value.end.getTime()
      ) {
        return preset.id;
      }
    }
    return null;
  });

  private now(): Date {
    return this.kjNow() ?? new Date();
  }

  select(preset: KjDateRangePreset): void {
    if (this.disabled() || this.kjReadonly()) return;
    const range = resolveDateRangePreset(preset, this.now());
    if (range) this.kjValue.set(range);
  }

  isSelected(id: string): boolean {
    return this.selectedId() === id;
  }
}
