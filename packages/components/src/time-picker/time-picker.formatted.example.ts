import { Component, signal } from '@angular/core';
import { KjTimePickerComponent } from './time-picker';

/**
 * Emits ISO-8601 `'HH:mm'` strings instead of `Date` objects. Convenient when
 * the back-end stores time-of-day directly and a `Date` round-trip would
 * introduce a timezone hazard.
 */
@Component({
  selector: 'kj-time-picker-formatted-example',
  standalone: true,
  imports: [KjTimePickerComponent],
  styles: [
    `
      :host {
        display: block;
      }
      pre {
        margin-top: var(--kj-space-md);
        font: 0.875rem var(--kj-font-mono, ui-monospace);
      }
    `,
  ],
  template: `
    <kj-time-picker [(kjValue)]="time" kjValueShape="string" kjAriaLabel="Reminder time" />
    <pre>Stored: {{ time() }}</pre>
  `,
})
export class KjTimePickerFormattedExample {
  readonly time = signal<Date | string>('08:30');
}
