import { Component, signal } from '@angular/core';
import { KjDatePickerComponent } from './date-picker';

/**
 * A walkthrough of the most common date-picker usages — single-date two-way
 * binding, min / max bounds to enforce a valid range, and a read-only field.
 */
@Component({
  selector: 'kj-date-picker-usage-example',
  standalone: true,
  imports: [KjDatePickerComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); padding: var(--kj-space-xl); }
    .row { display: flex; gap: var(--kj-space-md); align-items: center; flex-wrap: wrap; }
    code { font: 0.8125rem/1 var(--kj-font-mono, monospace); color: var(--kj-fg-muted); }
  `],
  template: `
    <div class="row">
      <kj-date-picker [(kjValue)]="when" kjPlaceholder="Pick a date" />
      <code>{{ when()?.toDateString() ?? '—' }}</code>
    </div>

    <div class="row">
      <kj-date-picker
        [(kjValue)]="bounded"
        [kjMin]="minDate"
        [kjMax]="maxDate"
        kjPlaceholder="This week only"
      />
      <code>min/max constrained</code>
    </div>

    <div class="row">
      <kj-date-picker [kjValue]="when()" [kjReadonly]="true" />
      <code>readonly</code>
    </div>
  `,
})
export class KjDatePickerUsageExample {
  readonly when = signal<Date | null>(new Date());
  readonly bounded = signal<Date | null>(null);
  readonly minDate = new Date();
  readonly maxDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}
