import { Component } from '@angular/core';
import { KjSpinnerComponent } from '../spinner';

/**
 * Animation shape presets — `spin` (rotating arc, default), `dots`
 * (three pulsing dots), `pulse` (single fading circle), `bars`
 * (vertical bars rising/falling) — side by side at the same size so
 * the visual character of each shape is directly comparable.
 */
@Component({
  selector: 'kj-spinner-animations-example',
  standalone: true,
  imports: [KjSpinnerComponent],
  styles: [`
    :host { display: flex; gap: var(--kj-space-xl); align-items: center; }
    figure { display: flex; flex-direction: column; align-items: center; gap: var(--kj-space-sm); margin: 0; }
    figcaption { font-size: var(--kj-text-sm); color: var(--kj-fg-default); }
  `],
  template: `
    <figure>
      <kj-spinner kjAnimation="spin" kjSize="lg" kjAriaLabel="Loading (spin)" />
      <figcaption>spin</figcaption>
    </figure>
    <figure>
      <kj-spinner kjAnimation="dots" kjSize="lg" kjAriaLabel="Loading (dots)" />
      <figcaption>dots</figcaption>
    </figure>
    <figure>
      <kj-spinner kjAnimation="pulse" kjSize="lg" kjAriaLabel="Loading (pulse)" />
      <figcaption>pulse</figcaption>
    </figure>
    <figure>
      <kj-spinner kjAnimation="bars" kjSize="lg" kjAriaLabel="Loading (bars)" />
      <figcaption>bars</figcaption>
    </figure>
  `,
})
export class KjSpinnerAnimationsExample {}
