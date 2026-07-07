import {
  Injectable,
  LOCALE_ID,
  type Signal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { KjDirectionality } from '../primitives/directionality/index';
import type { KjDirection } from '../primitives/directionality/index';
import { KJ_LOCALE_CONFIG } from './locale.config';

/**
 * Minimal RTL-script allow-list for engines whose `Intl.Locale` lacks
 * `getTextInfo` / `textInfo`. Keyed by the ISO 639 language subtag.
 */
const RTL_LANGUAGES = new Set([
  'ar', // Arabic
  'he', // Hebrew
  'fa', // Persian
  'ur', // Urdu
  'ps', // Pashto
  'sd', // Sindhi
  'ug', // Uyghur
  'yi', // Yiddish
  'dv', // Divehi
  'ku', // Kurdish (Sorani)
]);

/**
 * Derive `'ltr'` / `'rtl'` from a BCP-47 tag. Prefers the standard
 * `Intl.Locale` text-info APIs; falls back to a language-subtag allow-list.
 */
function directionFromLocale(tag: string): KjDirection {
  try {
    const loc = new Intl.Locale(tag);
    // `getTextInfo()` (newer) and `.textInfo` (older) both expose `.direction`.
    const info =
      (loc as { getTextInfo?: () => { direction?: string } }).getTextInfo?.() ??
      (loc as { textInfo?: { direction?: string } }).textInfo;
    if (info?.direction === 'rtl') return 'rtl';
    if (info?.direction === 'ltr') return 'ltr';
    const language = loc.language ?? tag.toLowerCase().split('-')[0];
    return RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr';
  } catch {
    const language = tag.toLowerCase().split('-')[0];
    return RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr';
  }
}

/**
 * Application-wide source of truth for **how locale-sensitive data renders** —
 * number / currency / date formatting and the logical text direction
 * (`ltr` / `rtl`). Every locale-aware primitive (NumberInput, DatePicker,
 * TimePicker, Calendar, currency display) falls back to this service instead of
 * re-reading `LOCALE_ID` or drilling a `kjLocale` prop.
 *
 * Configure the initial state with {@link provideKjLocale}; change it at runtime
 * with {@link setLocale} / {@link setDirection} / {@link setCurrency} — the seam
 * the RTL switch and language menu build on. Everything is `Intl`-backed and
 * SSR-safe, so anything Angular's `LOCALE_ID` already supports works with zero
 * configuration.
 *
 * @example
 * ```ts
 * private readonly locale = inject(KjLocale);
 * readonly price = computed(() => this.locale.formatCurrency(19.9)); // '€19.90'
 * readonly isRtl = this.locale.isRtl;
 * ```
 * @doc
 * @doc-name locale
 * @doc-category Core/Primitives
 * @doc-description One DI provider for locale-aware number, currency, and date formatting plus the ltr/rtl direction every primitive falls back to.
 * @doc-is-main
 */
@Injectable({ providedIn: 'root' })
export class KjLocale {
  private readonly defaultLocale = inject(LOCALE_ID);
  private readonly directionality = inject(KjDirectionality);
  private readonly config = inject(KJ_LOCALE_CONFIG);

  private readonly _locale = signal<string | null>(this.config.locale ?? null);
  private readonly _direction = signal<KjDirection | 'auto'>(
    this.config.direction ?? 'auto',
  );
  private readonly _currency = signal<string | undefined>(this.config.currency);

  /** Resolved BCP-47 locale tag. Falls back to Angular's `LOCALE_ID`. */
  readonly locale: Signal<string> = computed(
    () => this._locale() || this.defaultLocale,
  );

  /**
   * Resolved logical text direction. When set to `'auto'`, derives from the
   * locale script, then falls back to the document's `<html dir>`.
   */
  readonly direction: Signal<KjDirection> = computed(() => {
    const explicit = this._direction();
    if (explicit === 'ltr' || explicit === 'rtl') return explicit;
    const fromLocale = directionFromLocale(this.locale());
    // Only honour a locale that positively resolves to RTL; otherwise defer to
    // the document direction so an app that sets `<html dir="rtl">` still wins
    // for a direction-neutral locale.
    if (fromLocale === 'rtl') return 'rtl';
    return this.directionality.current();
  });

  /** `true` when the resolved {@link direction} is `'rtl'`. */
  readonly isRtl: Signal<boolean> = computed(() => this.direction() === 'rtl');

  /** Resolved default currency (ISO 4217), or `undefined`. */
  readonly currency: Signal<string | undefined> = this._currency.asReadonly();

  /** Override the active locale at runtime. */
  setLocale(tag: string): void {
    this._locale.set(tag);
  }

  /** Override the active direction at runtime. `'auto'` re-enables derivation. */
  setDirection(dir: KjDirection | 'auto'): void {
    this._direction.set(dir);
  }

  /** Override the default currency at runtime. */
  setCurrency(code: string | undefined): void {
    this._currency.set(code);
  }

  /**
   * Build an `Intl.NumberFormat` bound to the resolved locale. Pass options to
   * override; `undefined` locale in options is ignored.
   */
  numberFormat(options?: Intl.NumberFormatOptions): Intl.NumberFormat {
    return new Intl.NumberFormat(this.locale(), options);
  }

  /** Build an `Intl.DateTimeFormat` bound to the resolved locale. */
  dateTimeFormat(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    return new Intl.DateTimeFormat(this.locale(), options);
  }

  /** Format a number with the resolved locale. */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return this.numberFormat(options).format(value);
  }

  /**
   * Format a currency amount. Uses `currency` when given, else the provider's
   * default {@link currency}. Returns a plain number format when neither is set.
   */
  formatCurrency(
    value: number,
    currency?: string,
    options?: Intl.NumberFormatOptions,
  ): string {
    const code = currency ?? this._currency();
    if (!code) return this.formatNumber(value, options);
    return this.numberFormat({
      style: 'currency',
      currency: code,
      ...options,
    }).format(value);
  }

  /** Format a `Date` with the resolved locale. */
  formatDate(value: Date, options?: Intl.DateTimeFormatOptions): string {
    return this.dateTimeFormat(options).format(value);
  }
}
