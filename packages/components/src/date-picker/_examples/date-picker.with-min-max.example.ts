import { Component, signal } from '@angular/core';
import { KjDatePickerComponent } from '../date-picker';

/**
 * Min / max bounds example. Dates outside `[kjMin, kjMax]` carry
 * `aria-disabled="true"` in the calendar grid and are skipped by keyboard
 * navigation. Out-of-bounds typed input is rejected on blur.
 */
@Component({
  selector: 'kj-date-picker-with-min-max-example',
  standalone: true,
  imports: [KjDatePickerComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-2xl, 2rem); background: var(--kj-bg-surface, #f3f3f3); min-height: 24rem; }
    .hint { margin-top: var(--kj-space-md, 0.75rem); font-size: 0.875rem; opacity: 0.75; }
  `],
  template: `
    <kj-date-picker
      [(kjValue)]="when"
      [kjMin]="min"
      [kjMax]="max"
      kjPlaceholder="Pick a date in the next 14 days"
    />
    <p class="hint">Bounds: {{ min.toDateString() }} → {{ max.toDateString() }}</p>
  `,
})
export class KjDatePickerWithMinMaxExample {
  readonly min = new Date();
  readonly max = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d;
  })();
  when = signal<Date>(new Date());
}
