import { Component, signal } from '@angular/core';
import { KjSliderComponent } from './slider';

/**
 * Range mode: two thumbs bound to `[(kjRange)]` as a `[number, number]`
 * tuple. `kjMinDistance` enforces a minimum gap; thumbs cannot cross by
 * default. Each thumb has its own accessible label so screen readers can
 * distinguish them.
 */
@Component({
  selector: 'kj-slider-range-example',
  standalone: true,
  imports: [KjSliderComponent],
  styles: [
    `
      :host {
        display: block;
      }
      .row {
        display: flex;
        flex-direction: column;
        gap: var(--kj-space-sm);
      }
      .value {
        font: 0.875rem var(--kj-font-mono, monospace);
        color: var(--kj-color-base-content);
      }
    `,
  ],
  template: `
    <div class="row">
      <kj-slider
        [(kjRange)]="price"
        [kjMin]="0"
        [kjMax]="500"
        [kjStep]="5"
        [kjMinDistance]="20"
        kjStartAriaLabel="Lowest price"
        kjEndAriaLabel="Highest price"
      />
      <span class="value">\${{ price()[0] }} – \${{ price()[1] }}</span>
    </div>
  `,
})
export class KjSliderRangeExample {
  readonly price = signal<[number, number]>([100, 350]);
}
