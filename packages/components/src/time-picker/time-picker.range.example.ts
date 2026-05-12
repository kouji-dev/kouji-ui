import { Component, signal } from '@angular/core';
import { KjTimePickerComponent } from './time-picker';

/**
 * Two pickers wired as a start / end range with a 15-minute step. The end
 * picker's `kjMin` follows the current start value, so dragging the start
 * past the end snaps the second segment forward.
 */
@Component({
  selector: 'kj-time-picker-range-example',
  standalone: true,
  imports: [KjTimePickerComponent],
  styles: [
    `
      :host {
        display: block;
      }
      .row {
        display: flex;
        gap: var(--kj-space-md);
        align-items: center;
        flex-wrap: wrap;
      }
      label {
        font: 0.875rem var(--kj-font-sans);
        color: var(--kj-color-base-content);
      }
    `,
  ],
  template: `
    <div class="row">
      <label for="time-picker-range-start">Start</label>
      <kj-time-picker
        id="time-picker-range-start"
        [(kjValue)]="start"
        [kjStep]="15"
        kjAriaLabel="Start time"
      />
      <label for="time-picker-range-end">End</label>
      <kj-time-picker
        id="time-picker-range-end"
        [(kjValue)]="end"
        [kjStep]="15"
        [kjMin]="start()"
        kjAriaLabel="End time"
      />
    </div>
  `,
})
export class KjTimePickerRangeExample {
  readonly start = signal<Date | string>(new Date(2024, 0, 1, 9, 0, 0));
  readonly end = signal<Date | string>(new Date(2024, 0, 1, 17, 0, 0));
}
