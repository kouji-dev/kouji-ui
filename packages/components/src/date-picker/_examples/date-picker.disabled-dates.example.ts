import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjDatePickerComponent } from '../date-picker';

/**
 * Disabled-dates example. Pass a predicate via `kjDisabledDates` — return
 * `true` for selectable, `false` for disabled. Here we disable weekends so
 * only weekdays can be picked.
 */
@Component({
  selector: 'kj-date-picker-disabled-dates-example',
  standalone: true,
  imports: [KjDatePickerComponent],
  styles: [
    `
      :host {
        display: block;
        padding: var(--kj-space-2xl, 2rem);
        background: var(--kj-bg-surface, #f3f3f3);
        min-height: 24rem;
      }
      .hint {
        margin-top: var(--kj-space-md, 0.75rem);
        font-size: 0.875rem;
        opacity: 0.75;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-date-picker
      [(kjValue)]="when"
      [kjDisabledDates]="weekdaysOnly"
      kjPlaceholder="Pick a weekday"
    />
    <p class="hint">Saturdays and Sundays are disabled.</p>
  `,
})
export class KjDatePickerDisabledDatesExample {
  when = signal<Date>(new Date());
  readonly weekdaysOnly = (d: Date) => {
    const dow = d.getDay();
    return dow !== 0 && dow !== 6;
  };
}
