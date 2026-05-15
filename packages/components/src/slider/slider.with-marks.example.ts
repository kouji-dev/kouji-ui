import { Component, signal } from '@angular/core';
import { KjSliderComponent } from './slider';

/**
 * Discrete slider with auto-generated tick marks. `kjTicks="auto"` places
 * a tick at every `kjStep`. Pointer drag and arrow keys snap to the
 * lattice exactly as in the default mode — the ticks are decorative.
 */
@Component({
  selector: 'kj-slider-with-marks-example',
  standalone: true,
  imports: [KjSliderComponent],
  styles: [`
    :host { display: block; }
    .row { display: flex; flex-direction: column; gap: var(--kj-space-sm); }
    .value { font: 0.875rem var(--kj-font-mono, monospace); color: var(--kj-fg-default); }
  `],
  template: `
    <div class="row">
      <kj-slider
        [(kjValue)]="rating"
        [kjMin]="0"
        [kjMax]="10"
        [kjStep]="1"
        kjTicks="auto"
        kjAriaLabel="Rating"
      />
      <span class="value">Rating: {{ rating() }}/10</span>
    </div>
  `,
})
export class KjSliderWithMarksExample {
  readonly rating = signal<number>(7);
}
