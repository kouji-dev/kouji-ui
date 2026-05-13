import { Component, signal } from '@angular/core';
import { KjSliderComponent } from './slider';

/**
 * `kjDisplayWith` formats the value for `aria-valuetext`, so screen
 * readers announce `"$ 55.00"` instead of just `"55"`. Here we format a
 * percentage with `Intl.NumberFormat`.
 */
@Component({
  selector: 'kj-slider-formatted-example',
  standalone: true,
  imports: [KjSliderComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }
    .row { display: flex; flex-direction: column; gap: var(--kj-space-sm); }
    .value { font: 0.875rem var(--kj-font-mono, monospace); color: var(--kj-fg-default); }
  `],
  template: `
    <div class="row">
      <kj-slider
        [(kjValue)]="cpu"
        [kjMin]="0"
        [kjMax]="100"
        [kjStep]="1"
        [kjDisplayWith]="formatPercent"
        kjAriaLabel="CPU utilisation"
      />
      <span class="value">{{ formatPercent(cpu(), 0) }}</span>
    </div>
  `,
})
export class KjSliderFormattedExample {
  readonly cpu = signal<number>(42);

  /** Formats `42` as `"42 %"` using Intl.NumberFormat. */
  readonly formatPercent = (value: number, _thumbIndex: number): string =>
    new Intl.NumberFormat(undefined, {
      style: 'percent',
      maximumFractionDigits: 0,
    }).format(value / 100);
}
