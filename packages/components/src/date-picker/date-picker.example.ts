import { Component, signal } from '@angular/core';
import { KjDatePickerComponent } from './date-picker';

/**
 * Default usage example for KjDatePickerComponent.
 *
 * The input accepts typed dates (`2025-04-15` or locale-aware `4/15/2025`)
 * and the calendar icon opens a popover for click-selection. Two-way binding
 * to a `signal<Date | null>` keeps the model in sync.
 */
@Component({
  selector: 'kj-date-picker-example',
  standalone: true,
  imports: [KjDatePickerComponent],
  styles: [
    `
      :host {
        display: block;
        min-height: 24rem;
      }
      .selected {
        margin-top: var(--kj-space-md, 0.75rem);
        font-family: monospace;
        color: var(--kj-color-base-content, #111);
      }
    `,
  ],
  template: `
    <kj-date-picker [(kjValue)]="when" kjPlaceholder="Pick a date" />
    <p class="selected">Selected: {{ when().toDateString() }}</p>
  `,
})
export class KjDatePickerExample {
  when = signal<Date>(new Date());
}
