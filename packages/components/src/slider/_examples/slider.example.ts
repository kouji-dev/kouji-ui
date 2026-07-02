import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjSliderComponent } from '../slider';

/**
 * Default usage example for KjSliderComponent.
 *
 * Demonstrates a single-thumb slider with the standard `0–100` range.
 * Pointer drag, click-to-jump, and Arrow / Page / Home / End keyboard
 * controls are wired by the directive layer.
 */
@Component({
  selector: 'kj-slider-example',
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
        color: var(--kj-fg-default);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="row">
      <kj-slider [(kjValue)]="volume" kjAriaLabel="Volume" />
      <span class="value">Value: {{ volume() }}</span>
    </div>
  `,
})
export class KjSliderExample {
  readonly volume = signal<number>(40);
}
