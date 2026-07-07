import {
  type EnvironmentProviders,
  InjectionToken,
  makeEnvironmentProviders,
} from '@angular/core';
import type { KjTranslationCatalog } from './catalogs/en';

/**
 * A group of alternate catalogs, keyed by BCP-47 tag or bare language subtag
 * (e.g. `{ fr: FR_CATALOG }` or `{ 'fr-CA': FR_CA_CATALOG }`). Values are
 * `Partial` — omitted keys fall through to the English source catalog.
 */
export type KjTranslationCatalogs = Record<
  string,
  Partial<KjTranslationCatalog>
>;

/**
 * Multi-provider DI token holding every registered {@link KjTranslationCatalogs}
 * group. {@link KjTranslateService} reads it once at construction and merges the
 * groups over the always-present English source.
 */
export const KJ_TRANSLATION_CATALOGS = new InjectionToken<
  KjTranslationCatalogs[]
>('kj.translation.catalogs');

/**
 * Registers one or more alternate message catalogs for the enclosing injector.
 * The English (`en`) catalog is always available without registration, so this
 * only adds the languages you ship. Composes — several calls accumulate.
 *
 * Because catalogs are plain `import`-able modules, only the languages you
 * actually import are bundled (tree-shakable).
 *
 * @example
 * ```ts
 * import { FR_CATALOG, provideKjTranslations, provideKjLocale } from '@kouji-ui/core';
 *
 * bootstrapApplication(App, {
 *   providers: [
 *     provideKjLocale({ locale: 'fr-FR' }),  // selects the catalog at runtime
 *     provideKjTranslations({ fr: FR_CATALOG }),
 *   ],
 * });
 * ```
 * @doc
 * @doc-name i18n
 * @doc-order 1
 */
export function provideKjTranslations(
  catalogs: KjTranslationCatalogs,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: KJ_TRANSLATION_CATALOGS, useValue: catalogs, multi: true },
  ]);
}
