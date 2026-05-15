import { Component, signal } from '@angular/core';
import { KjTimePickerComponent } from './time-picker';

/**
 * A walkthrough of the most common time-picker usages — 24-hour HH:MM, a
 * 12-hour picker with AM/PM, and a formatted string output. Use this as the
 * copy-paste starting point for new screens.
 */
@Component({
  selector: 'kj-time-picker-usage-example',
  standalone: true,
  imports: [KjTimePickerComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); }
    .row { display: flex; gap: var(--kj-space-md); align-items: center; }
    .readout { font: 0.875rem var(--kj-font-sans); color: var(--kj-fg-muted); }
  `],
  template: `
    <div class="row">
      <kj-time-picker [(kjValue)]="meeting" kjAriaLabel="Meeting time" />
      <span class="readout">{{ meeting() }}</span>
    </div>

    <div class="row">
      <kj-time-picker
        [(kjValue)]="lunch"
        [kj12Hour]="true"
        kjAriaLabel="Lunch time"
      />
      <span class="readout">{{ lunch() }}</span>
    </div>

    <div class="row">
      <kj-time-picker
        [(kjValue)]="alarm"
        kjValueShape="string"
        kjAriaLabel="Alarm time"
      />
      <span class="readout">{{ alarm() }}</span>
    </div>
  `,
})
export class KjTimePickerUsageExample {
  readonly meeting = signal<Date | string>(new Date(2024, 0, 1, 9, 30));
  readonly lunch = signal<Date | string>(new Date(2024, 0, 1, 12, 0));
  readonly alarm = signal<Date | string>('07:00');
}
