import { Component, signal } from '@angular/core';
import { KjCalendarComponent } from './calendar';

/**
 * Default usage example for KjCalendarComponent — an inline single-date
 * selection grid. Two-way binding keeps a local signal in sync.
 */
@Component({
  selector: 'kj-calendar-example',
  standalone: true,
  imports: [KjCalendarComponent],
  styles: [
    `
      :host {
        display: block;
      }
      .selected {
        margin-top: var(--kj-space-md, 0.75rem);
        font-family: monospace;
      }
    `,
  ],
  template: `
    <kj-calendar [(kjValue)]="when" />
    <p class="selected">Selected: {{ when().toDateString() }}</p>
  `,
})
export class KjCalendarExample {
  when = signal<Date>(new Date());
}
