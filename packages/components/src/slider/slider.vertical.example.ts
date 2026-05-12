import { Component, signal } from '@angular/core';
import { KjSliderComponent } from './slider';

/**
 * Vertical slider — `kjOrientation="vertical"`. ArrowUp / ArrowDown still
 * map to "increase" / "decrease" (as APG explicitly recommends), and the
 * pointer math is mirrored to the Y axis (top of the track = `kjMax`).
 *
 * The wrapper supplies a sensible default height; consumers can override
 * via the `--kj-slider-vertical-length` CSS custom property.
 */
@Component({
  selector: 'kj-slider-vertical-example',
  standalone: true,
  imports: [KjSliderComponent],
  styles: [
    `
      :host {
        display: block;
      }
      .row {
        display: flex;
        gap: var(--kj-space-xl);
        align-items: center;
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
        kjOrientation="vertical"
        [(kjValue)]="level"
        [kjMin]="0"
        [kjMax]="100"
        kjAriaLabel="Audio level"
      />
      <span class="value">Level: {{ level() }}</span>
    </div>
  `,
})
export class KjSliderVerticalExample {
  readonly level = signal<number>(60);
}
