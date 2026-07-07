import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
  model,
} from '@angular/core';
import {
  KjDateRangePresets,
  KjDateRangePresetOption,
  defaultDateRangePresets,
  type KjDateRange,
  type KjDateRangePreset,
} from '@kouji-ui/core';

/**
 * Styled Date Range Presets — a compact, keyboard-navigable list of named
 * quick-selects ("Today", "Last 7 days", "This quarter", …). Picking one
 * resolves its inclusive `{ start, end }` range and commits the two-way
 * `kjValue`.
 *
 * Built as the reusable presets primitive from the date/time roadmap slice:
 * it slots beside a range calendar, but works standalone against any
 * `signal<KjDateRange | null>`.
 *
 * **Accessibility (WCAG 2.1 AAA):**
 * - the list is `role="listbox"` with an accessible name; each preset is a
 *   `role="option"` `<button>` carrying `aria-selected`.
 * - roving tabindex — one tab stop; Up/Down (and Home/End) move between
 *   options; Enter / Space select (native button activation).
 * - the selected preset is conveyed by `aria-selected`, not color alone.
 *
 * @doc-example Default
 *   The ten built-in presets bound to a `signal<KjDateRange | null>`.
 *   @doc-file date-range-presets.example.ts
 * @doc-example Custom presets
 *   Spread `defaultDateRangePresets()` and append your own `getRange`.
 *   @doc-file date-range-presets.custom.example.ts
 *
 * @doc-keyboard
 *   ArrowDown|ArrowUp — Moves between presets
 *   Home|End          — Jumps to the first / last preset
 *   Enter|Space       — Selects the focused preset
 *
 * @doc-aria
 *   role="listbox"  — On the container; `aria-orientation="vertical"`
 *   aria-label      — Names the list ("Date range presets" by default)
 *   role="option"   — On each preset button
 *   aria-selected   — Reflects the chosen preset
 *
 * @doc-css-var
 *   --kj-date-range-presets-min-width — Min width of the list. Default 12rem.
 *
 * @doc-touch
 *   Preset rows are 44px tall to meet the WCAG 2.5.5 target size.
 *
 * @doc-related date-picker,calendar
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name date-range-presets
 * @doc-description Themed listbox of date-range quick-selects that resolve to an inclusive start/end range.
 * @doc-is-main
 */
@Component({
  selector: 'kj-date-range-presets',
  standalone: true,
  imports: [KjDateRangePresets, KjDateRangePresetOption],
  template: `
    <div
      kjDateRangePresets
      class="kj-date-range-presets"
      [kjValue]="kjValue() ?? null!"
      (kjValueChange)="kjValue.set($event)"
      [kjPresets]="kjPresets()"
      [kjLabel]="kjLabel()"
      [kjNow]="kjNow() ?? null!"
      [kjDisabled]="kjDisabled()"
    >
      @for (preset of kjPresets(); track preset.id) {
        <button
          kjDateRangePresetOption
          #opt="kjDateRangePresetOption"
          class="kj-date-range-presets__option"
          [kjPreset]="preset"
          [attr.data-selected]="opt.selected() ? '' : null"
        >
          {{ preset.label }}
        </button>
      }
    </div>
  `,
  styleUrl: './date-range-presets.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-date-range-presets-host', style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDateRangePresetsComponent {
  /** Selected range. Two-way bindable — `[(kjValue)]`. `null` clears. */
  readonly kjValue = model<KjDateRange | null>(null);

  /** Presets to render. Defaults to the ten built-ins. */
  readonly kjPresets = input<readonly KjDateRangePreset[]>(defaultDateRangePresets());

  /** Accessible name for the list. */
  readonly kjLabel = input<string>('Date range presets');

  /** Injectable "now" for the preset math. Defaults to the current instant. */
  readonly kjNow = input<Date | null>(null);

  /** Disable the whole list. */
  readonly kjDisabled = input<boolean, boolean | string>(false, { transform: booleanAttribute });
}
