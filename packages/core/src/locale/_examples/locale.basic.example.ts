import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { KjLocale } from '../locale';

/**
 * Demonstrates the `KjLocale` provider: switching the active locale re-runs
 * every `Intl`-backed formatter (number, currency, date) reactively, and the
 * resolved logical direction (`ltr` / `rtl`) follows the locale's script. All
 * values below are `computed`s that read `KjLocale.locale()` — one
 * `setLocale(...)` call updates the whole panel.
 */
@Component({
  selector: 'kj-example-locale-basic',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: block;
        padding: 1.5rem;
      }
      .switch {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1.25rem;
      }
      .switch button {
        padding: 0.4rem 0.9rem;
        border: 1px solid var(--kj-bg-field, #d4d4d8);
        border-radius: var(--kj-radius-field, 0.375rem);
        background: transparent;
        color: inherit;
        cursor: pointer;
        font: inherit;
        font-size: 0.8125rem;
        min-height: 2.25rem;
      }
      .switch button[data-active='true'] {
        background: var(--kj-fg-primary, #4f46e5);
        border-color: var(--kj-fg-primary, #4f46e5);
        color: var(--kj-bg-surface, #fff);
      }
      dl {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.5rem 1.25rem;
        margin: 0;
        max-width: 26rem;
      }
      dt {
        font-size: 0.8125rem;
        opacity: 0.7;
      }
      dd {
        margin: 0;
        font-variant-numeric: tabular-nums;
        font-weight: 600;
      }
    `,
  ],
  template: `
    <div class="switch" role="group" aria-label="Locale">
      @for (l of locales; track l.tag) {
        <button
          type="button"
          [attr.data-active]="active() === l.tag"
          [attr.aria-pressed]="active() === l.tag"
          (click)="use(l.tag)"
        >
          {{ l.label }}
        </button>
      }
    </div>

    <dl>
      <dt>Locale</dt>
      <dd data-testid="locale-tag">{{ active() }}</dd>
      <dt>Direction</dt>
      <dd data-testid="locale-dir">{{ direction() }}</dd>
      <dt>Number</dt>
      <dd data-testid="locale-number">{{ number() }}</dd>
      <dt>Currency</dt>
      <dd data-testid="locale-currency">{{ currency() }}</dd>
      <dt>Date</dt>
      <dd data-testid="locale-date">{{ date() }}</dd>
    </dl>
  `,
})
export class LocaleBasicExample {
  private readonly locale = inject(KjLocale);

  protected readonly locales = [
    { tag: 'en-US', label: 'English (US)' },
    { tag: 'fr-FR', label: 'Français' },
    { tag: 'de-DE', label: 'Deutsch' },
    { tag: 'ar-EG', label: 'العربية' },
  ] as const;

  private readonly sampleDate = new Date(Date.UTC(2026, 0, 31));

  protected readonly active = this.locale.locale;
  protected readonly direction = this.locale.direction;

  protected readonly number = computed(() =>
    this.locale.formatNumber(1234567.89),
  );
  protected readonly currency = computed(() =>
    this.locale.formatCurrency(1234.5, 'EUR'),
  );
  protected readonly date = computed(() =>
    this.locale.formatDate(this.sampleDate, { dateStyle: 'long' }),
  );

  protected use(tag: string): void {
    this.locale.setLocale(tag);
  }
}
