import { Component, signal } from '@angular/core';
import { KjTimePickerComponent } from './time-picker';

/**
 * Adds the (optional) seconds segment. Useful for sports timing, recording
 * apps, or any time value where minute precision is too coarse.
 */
@Component({
  selector: 'kj-time-picker-with-seconds-example',
  standalone: true,
  imports: [KjTimePickerComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-time-picker
      [(kjValue)]="time"
      kjShowSeconds
      kjAriaLabel="Lap time"
    />
  `,
})
export class KjTimePickerWithSecondsExample {
  readonly time = signal<Date | string>(new Date(2024, 0, 1, 0, 1, 23));
}
