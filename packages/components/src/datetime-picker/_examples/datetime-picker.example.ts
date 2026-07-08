import { Component, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { KjDatetimePickerComponent } from '../datetime-picker';

/**
 * Default usage example for KjDatetimePickerComponent.
 *
 * A single `Date` two-way binding carries both the calendar day and the
 * time-of-day. Picking a day keeps the popover open so the time field can be
 * adjusted; the merged value stays in sync with the bound signal.
 */
@Component({
  selector: 'kj-datetime-picker-example',
  standalone: true,
  imports: [KjDatetimePickerComponent],
  styles: [
    `
      :host {
        display: block;
        padding: var(--kj-space-2xl, 2rem);
        background: var(--kj-bg-surface, #f3f3f3);
        min-height: 24rem;
      }
      .selected {
        margin-top: var(--kj-space-md, 0.75rem);
        font-family: monospace;
        color: var(--kj-fg-default, #111);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-datetime-picker [(kjValue)]="when" kjPlaceholder="Pick a date & time" />
    <p class="selected">Selected: {{ label() }}</p>
  `,
})
export class KjDatetimePickerExample {
  readonly when = signal<Date | null>(null);
  readonly label = computed(() => this.when()?.toLocaleString() ?? 'nothing yet');
}
