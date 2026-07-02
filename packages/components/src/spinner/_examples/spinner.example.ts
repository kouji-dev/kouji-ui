import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjSpinnerComponent } from '../spinner';

/**
 * Default usage example for KjSpinnerComponent. Renders a single
 * `<kj-spinner>` with the shipped defaults — `spin` animation,
 * `md` size, `neutral` variant (inherits `currentColor`), and the
 * default `aria-label="Loading"`.
 */
@Component({
  selector: 'kj-spinner-example',
  standalone: true,
  imports: [KjSpinnerComponent],
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-spinner />`,
})
export class KjSpinnerExample {}
