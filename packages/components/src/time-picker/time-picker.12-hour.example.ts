import { Component, signal } from '@angular/core';
import { KjTimePickerComponent } from './time-picker';

/**
 * 12-hour time picker. The meridiem toggle (AM / PM) renders alongside the
 * hour and minute segments; click or press Enter / Space to flip it.
 */
@Component({
  selector: 'kj-time-picker-12-hour-example',
  standalone: true,
  imports: [KjTimePickerComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  template: ` <kj-time-picker [(kjValue)]="time" kj12Hour kjAriaLabel="Meeting time" /> `,
})
export class KjTimePicker12HourExample {
  readonly time = signal<Date | string>(new Date(2024, 0, 1, 14, 15, 0));
}
