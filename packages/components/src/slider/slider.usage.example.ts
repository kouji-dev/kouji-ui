import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjSliderComponent } from './slider';

/**
 * A walkthrough of the most common slider usages — a volume slider, a
 * range price picker, and a stepped rating selector. Use this as the
 * copy-paste starting point for new screens.
 */
@Component({
  selector: 'kj-slider-usage-example',
  standalone: true,
  imports: [KjSliderComponent],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--kj-space-xl);
      }
      .row {
        display: flex;
        flex-direction: column;
        gap: var(--kj-space-sm);
      }
      .value {
        font: 0.875rem var(--kj-font-mono, monospace);
        color: var(--kj-fg-default);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="row">
      <kj-slider [(kjValue)]="volume" kjAriaLabel="Volume" />
      <span class="value">Volume: {{ volume() }}</span>
    </div>

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

    <div class="row">
      <kj-slider
        [(kjValue)]="rating"
        [kjMin]="0"
        [kjMax]="5"
        [kjStep]="1"
        [kjTicks]="'auto'"
        kjAriaLabel="Rating"
      />
      <span class="value">Rating: {{ rating() }} / 5</span>
    </div>
  `,
})
export class KjSliderUsageExample {
  readonly volume = signal<number>(40);
  readonly price = signal<readonly [number, number]>([100, 350]);
  readonly rating = signal<number>(3);
}
