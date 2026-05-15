import { Component } from '@angular/core';
import { KjProgressBarComponent } from './progress-bar';

/**
 * Indeterminate progress bar — `kjValue` is `null`, the bar shows the
 * CSS-animated stripe, and `aria-valuenow` is omitted from the DOM
 * (APG-correct for *"working, no measurable progress"*).
 */
@Component({
  selector: 'kj-progress-bar-indeterminate-example',
  standalone: true,
  imports: [KjProgressBarComponent],
  styles: [`
    :host { display: block; }
  `],
  template: `
    <kj-progress-bar kjAriaLabel="Loading" />
  `,
})
export class KjProgressBarIndeterminateExample {}
