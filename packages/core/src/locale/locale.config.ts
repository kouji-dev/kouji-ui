import {
  type EnvironmentProviders,
  InjectionToken,
  makeEnvironmentProviders,
} from '@angular/core';
import type { KjDirection } from '../primitives/directionality/index';

/**
 * Static configuration for the locale provider. Every field is optional — with
 * an empty config the {@link KjLocale} service falls back to Angular's
 * `LOCALE_ID` and the document's `<html dir>`.
 */
export interface KjLocaleConfig {
  /**
   * BCP-47 language tag (e.g. `'de-DE'`, `'ar-EG'`). Defaults to the injected
   * `LOCALE_ID` when omitted.
   */
  readonly locale?: string;

  /**
   * Logical text direction. `'auto'` (the default) derives the direction from
   * the locale's script, then falls back to the document's `<html dir>` via
   * `KjDirectionality`. An explicit `'ltr'` / `'rtl'` always wins.
   */
  readonly direction?: KjDirection | 'auto';

  /**
   * ISO 4217 currency code (e.g. `'EUR'`) used as the default for currency
   * formatting when a component does not specify its own.
   */
  readonly currency?: string;
}

/**
 * DI token for the initial locale configuration. Default factory yields an
 * empty config, so {@link KjLocale} resolves entirely from `LOCALE_ID` and
 * `<html dir>` when {@link provideKjLocale} is not called.
 */
export const KJ_LOCALE_CONFIG = new InjectionToken<KjLocaleConfig>(
  'kj.locale.config',
  { factory: (): KjLocaleConfig => ({}) },
);

/**
 * Configures the application (or route) locale — the single source of truth
 * every locale-sensitive kouji-ui primitive falls back to for number, currency,
 * and date formatting plus logical text direction.
 *
 * Call once at the application scope (`bootstrapApplication`'s `providers`) or
 * on a route to scope a sub-tree. Runtime changes go through the
 * {@link KjLocale} service (`setLocale` / `setDirection` / `setCurrency`) — the
 * seam the upcoming RTL switch and language menu build on.
 *
 * @example
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [provideKjLocale({ locale: 'de-DE', currency: 'EUR' })],
 * });
 * ```
 * @doc
 * @doc-name locale
 * @doc-order 1
 */
export function provideKjLocale(
  config: KjLocaleConfig = {},
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: KJ_LOCALE_CONFIG, useValue: config },
  ]);
}
