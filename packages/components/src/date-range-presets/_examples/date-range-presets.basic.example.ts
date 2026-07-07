import { Component, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjDateRangePresetsComponent } from '../date-range-presets';
import type { KjDateRange } from '@kouji-ui/core';

/**
 * Default usage — the ten built-in presets bound to a `signal<KjDateRange>`.
 * Selecting a preset resolves its inclusive start/end and updates the readout.
 */
@Component({
  selector: 'kj-date-range-presets-example',
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
        min-height: 22rem;
      }
      .readout {
        font-family: var(--kj-font-mono, monospace);
        color: var(--kj-fg-default, #111);
      }
      .readout dt {
        color: var(--kj-fg-muted, #666);
        font-size: 0.75rem;
      }
      .readout dd {
        margin: 0 0 var(--kj-space-md, 0.75rem);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-date-range-presets [(kjValue)]="range" />
    <dl class="readout" data-testid="range-readout">
      <dt>Start</dt>
      <dd data-testid="range-start">{{ start() }}</dd>
      <dt>End</dt>
      <dd data-testid="range-end">{{ end() }}</dd>
    </dl>
  `,
})
export class KjDateRangePresetsExample {
  readonly range = signal<KjDateRange | null>(null);
  readonly start = computed(() => this.range()?.start.toDateString() ?? '—');
  readonly end = computed(() => this.range()?.end.toDateString() ?? '—');
}
