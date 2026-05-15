import { Component, signal } from '@angular/core';
import { KjDatePickerComponent } from './date-picker';

/**
 * Read-only example. The input shows the formatted value but cannot be
 * edited and the popover toggle is disabled. Useful for "view as a date
 * picker" scenarios where the value is computed elsewhere.
 *
 * (A range-mode / multi-mode example is reserved for a follow-up release —
 * see `docs/component-analyses/data-input/date-picker.md` for the
 * deferred range surface.)
 */
@Component({
  selector: 'kj-date-picker-readonly-example',
  standalone: true,
  imports: [KjDatePickerComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-2xl, 2rem); background: var(--kj-bg-surface, #f3f3f3); min-height: 12rem; }
  `],
  template: `
    <kj-date-picker [(kjValue)]="when" [kjReadonly]="true" />
  `,
})
export class KjDatePickerReadonlyExample {
  readonly when = signal<Date>(new Date());
}
