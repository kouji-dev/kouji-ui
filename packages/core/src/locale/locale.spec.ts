import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { KjNumberInput } from '../number-input/number-input';
import { KjLocale } from './locale';
import { provideKjLocale } from './locale.config';

function setup(
  providers: unknown[] = [],
): KjLocale {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: LOCALE_ID, useValue: 'en-US' }, ...(providers as [])],
  });
  return TestBed.inject(KjLocale);
}

describe('KjLocale', () => {
  describe('defaults / fallback', () => {
    it('falls back to LOCALE_ID when no config is provided', () => {
      const locale = setup();
      expect(locale.locale()).toBe('en-US');
      expect(locale.currency()).toBeUndefined();
      expect(locale.direction()).toBe('ltr');
      expect(locale.isRtl()).toBe(false);
    });

    it('uses the configured locale over LOCALE_ID', () => {
      const locale = setup([provideKjLocale({ locale: 'de-DE' })]);
      expect(locale.locale()).toBe('de-DE');
    });
  });

  describe('number / currency formatting', () => {
    it('formats numbers with the resolved locale grouping', () => {
      const locale = setup([provideKjLocale({ locale: 'de-DE' })]);
      // de-DE groups with '.' and uses ',' as the decimal separator.
      expect(locale.formatNumber(1234.5)).toBe('1.234,5');
    });

    it('formats currency with the default currency', () => {
      const locale = setup([
        provideKjLocale({ locale: 'en-US', currency: 'USD' }),
      ]);
      expect(locale.formatCurrency(19.9)).toBe('$19.90');
    });

    it('lets an explicit currency override the default', () => {
      const locale = setup([
        provideKjLocale({ locale: 'en-US', currency: 'USD' }),
      ]);
      // 'de-DE' output would differ, but locale stays en-US; only code changes.
      expect(locale.formatCurrency(5, 'JPY')).toBe('¥5');
    });

    it('falls back to plain number format when no currency is set', () => {
      const locale = setup([provideKjLocale({ locale: 'en-US' })]);
      expect(locale.formatCurrency(1234.5)).toBe('1,234.5');
    });
  });

  describe('date formatting', () => {
    it('formats dates with the resolved locale', () => {
      const locale = setup([provideKjLocale({ locale: 'en-US' })]);
      const out = locale.formatDate(new Date(2026, 0, 5), {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      expect(out).toBe('01/05/2026');
    });
  });

  describe('direction', () => {
    it('derives rtl from an RTL locale (auto)', () => {
      const locale = setup([provideKjLocale({ locale: 'ar-EG' })]);
      expect(locale.direction()).toBe('rtl');
      expect(locale.isRtl()).toBe(true);
    });

    it('derives ltr from an LTR locale (auto)', () => {
      const locale = setup([provideKjLocale({ locale: 'fr-FR' })]);
      expect(locale.direction()).toBe('ltr');
    });

    it('honours an explicit direction over the locale script', () => {
      const locale = setup([
        provideKjLocale({ locale: 'ar-EG', direction: 'ltr' }),
      ]);
      expect(locale.direction()).toBe('ltr');
    });
  });

  describe('runtime setters', () => {
    it('setLocale updates the resolved locale + dependent formatting', () => {
      const locale = setup([provideKjLocale({ locale: 'en-US' })]);
      expect(locale.formatNumber(1234.5)).toBe('1,234.5');
      locale.setLocale('de-DE');
      expect(locale.locale()).toBe('de-DE');
      expect(locale.formatNumber(1234.5)).toBe('1.234,5');
    });

    it('setDirection overrides, and "auto" re-enables derivation', () => {
      const locale = setup([provideKjLocale({ locale: 'ar-EG' })]);
      expect(locale.direction()).toBe('rtl');
      locale.setDirection('ltr');
      expect(locale.direction()).toBe('ltr');
      locale.setDirection('auto');
      expect(locale.direction()).toBe('rtl');
    });

    it('setCurrency updates the default currency', () => {
      const locale = setup([provideKjLocale({ locale: 'en-US' })]);
      expect(locale.currency()).toBeUndefined();
      locale.setCurrency('EUR');
      expect(locale.currency()).toBe('EUR');
      expect(locale.formatCurrency(10)).toBe('€10.00');
    });
  });

  // End-to-end DI fallback: a NumberInput with NO explicit kjLocale / kjCurrency
  // must pick up the provider's locale + currency purely through injection.
  describe('provider → NumberInput (integration)', () => {
    it('formats a currency value from provideKjLocale alone (no directive inputs)', async () => {
      const { container } = await render(
        `<input kjNumberInput aria-label="Preis" kjFormat="currency" [kjValue]="1234.5" />`,
        {
          imports: [KjNumberInput],
          providers: [provideKjLocale({ locale: 'de-DE', currency: 'EUR' })],
        },
      );
      const input = container.querySelector('input')!;
      // de-DE + EUR: '1.234,50 €' (NBSP before the symbol).
      expect(input.value).toContain('1.234,50');
      expect(input.value).toContain('€');
      // aria-valuetext mirrors the same locale-formatted string.
      expect(input.getAttribute('aria-valuetext')).toContain('1.234,50');
    });

    it('an explicit kjLocale still overrides the provider', async () => {
      const { container } = await render(
        `<input kjNumberInput aria-label="Qty" kjLocale="en-US" [kjValue]="1234.5" />`,
        {
          imports: [KjNumberInput],
          providers: [provideKjLocale({ locale: 'de-DE' })],
        },
      );
      expect(container.querySelector('input')!.value).toBe('1,234.5');
    });
  });
});
