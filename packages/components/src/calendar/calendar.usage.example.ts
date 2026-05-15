import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjCalendarComponent } from './calendar';

/**
 * Common calendar shape — controlled date, min/max bounds, and a
 * disabled-dates predicate (no weekends). Use this as the copy-paste
 * starting point for new screens.
 */
@Component({
  selector: 'kj-calendar-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjCalendarComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); align-items: flex-start; }
    .selected { font-family: var(--kj-font-mono, monospace); font-size: 0.875rem; color: var(--kj-fg-muted); }
  `],
  template: `
    <kj-calendar
      [(kjValue)]="when"
      [kjMin]="minDate"
      [kjMax]="maxDate"
      [kjDisabledDates]="skipWeekends"
    />
    <p class="selected">Selected: {{ when()?.toDateString() ?? '—' }}</p>
  `,
})
export class KjCalendarUsageExample {
  readonly when = signal<Date | null>(new Date());
  readonly minDate = new Date(new Date().getFullYear(), 0, 1);
  readonly maxDate = new Date(new Date().getFullYear(), 11, 31);
  readonly skipWeekends = (d: Date): boolean => d.getDay() === 0 || d.getDay() === 6;
}
