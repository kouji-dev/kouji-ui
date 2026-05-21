import { Component, signal } from '@angular/core';
import { KjTimePickerComponent } from '../time-picker';

/**
 * Default 24-hour time picker. The wrapper renders zero-padded HH and MM
 * spinbuttons; ArrowUp / ArrowDown step the focused segment.
 */
@Component({
  selector: 'kj-time-picker-example',
  standalone: true,
  imports: [KjTimePickerComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-time-picker [(kjValue)]="time" kjAriaLabel="Departure time" />
  `,
})
export class KjTimePickerExample {
  readonly time = signal<Date | string>(new Date(2024, 0, 1, 9, 30, 0));
}
