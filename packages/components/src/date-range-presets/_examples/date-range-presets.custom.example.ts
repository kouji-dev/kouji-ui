import { Component, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjDateRangePresetsComponent } from '../date-range-presets';
import {
  defaultDateRangePresets,
  type KjDateRange,
  type KjDateRangePreset,
} from '@kouji-ui/core';

/**
 * Custom presets — spread the built-ins and append your own `getRange`.
 * Here "Last 90 days" and a fixed "Fiscal Q1" are added to the defaults.
 */
@Component({
  selector: 'kj-date-range-presets-custom-example',
  standalone: true,
  imports: [KjDateRangePresetsComponent],
  styles: [
    `
      :host {
        display: flex;
        gap: var(--kj-space-xl, 1.5rem);
        align-items: flex-start;
        flex-wrap: wrap;
        padding: var(--kj-space-2xl, 2rem);
        background: var(--kj-bg-surface, #f3f3f3);
        min-height: 24rem;
      }
      .readout {
        font-family: var(--kj-font-mono, monospace);
        color: var(--kj-fg-default, #111);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-date-range-presets [(kjValue)]="range" [kjPresets]="presets" />
    <p class="readout">{{ label() }}</p>
  `,
})
export class KjDateRangePresetsCustomExample {
  readonly presets: KjDateRangePreset[] = [
    ...defaultDateRangePresets(),
    {
      id: 'last-90-days',
      label: 'Last 90 days',
      getRange: (now) => ({
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89),
        end: now,
      }),
    },
    {
      id: 'fiscal-q1',
      label: 'Fiscal Q1 (Apr–Jun)',
      getRange: (now) => ({
        start: new Date(now.getFullYear(), 3, 1),
        end: new Date(now.getFullYear(), 5, 30),
      }),
    },
  ];

  readonly range = signal<KjDateRange | null>(null);
  readonly label = computed(() => {
    const r = this.range();
    return r ? `${r.start.toDateString()} → ${r.end.toDateString()}` : 'No range selected';
  });
}
