import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjCalendarComponent } from '../calendar';

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
        padding: var(--kj-space-2xl, 2rem);
        background: var(--kj-bg-surface, #f3f3f3);
      }
      .selected {
        margin-top: var(--kj-space-md, 0.75rem);
        font-family: monospace;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-calendar [(kjValue)]="when" />
    <p class="selected">Selected: {{ when().toDateString() }}</p>
  `,
})
export class KjCalendarExample {
  when = signal<Date>(new Date());
}
