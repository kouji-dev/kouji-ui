import { Component, signal } from '@angular/core';
import { KjDatePickerComponent } from './date-picker';

/**
 * Locale example. Passing `kjLocale="fr-FR"` switches month/weekday names to
 * French and flips the input format to `dd/mm/yyyy`. The first day of the
 * week follows `Intl.Locale.getWeekInfo()` (Monday for `fr-FR`).
 */
@Component({
  selector: 'kj-date-picker-locale-example',
  standalone: true,
  imports: [KjDatePickerComponent],
  styles: [
    `
      :host {
        display: block;
        min-height: 24rem;
      }
      .row {
        display: grid;
        grid-template-columns: 6rem 1fr;
        align-items: center;
        gap: var(--kj-space-md, 0.75rem);
        margin-bottom: var(--kj-space-md, 0.75rem);
      }
    `,
  ],
  template: `
    <div class="row">
      <span>en-US</span>
      <kj-date-picker [(kjValue)]="enValue" kjLocale="en-US" kjPlaceholder="MM/DD/YYYY" />
    </div>
    <div class="row">
      <span>fr-FR</span>
      <kj-date-picker [(kjValue)]="frValue" kjLocale="fr-FR" kjPlaceholder="JJ/MM/AAAA" />
    </div>
    <div class="row">
      <span>ja-JP</span>
      <kj-date-picker [(kjValue)]="jaValue" kjLocale="ja-JP" />
    </div>
  `,
})
export class KjDatePickerLocaleExample {
  enValue = signal<Date>(new Date());
  frValue = signal<Date>(new Date());
  jaValue = signal<Date>(new Date());
}
