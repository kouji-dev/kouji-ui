import {
  Injectable,
  type Signal,
  computed,
  inject,
} from '@angular/core';
import { KjLocale } from '../locale/index';
import {
  EN_CATALOG,
  type KjTranslationCatalog,
  type KjTranslationKey,
  type KjTranslationParams,
} from './catalogs/en';
import { KJ_TRANSLATION_CATALOGS } from './translate.config';

/** Replace every `{name}` token in `template` with `params[name]`. */
function interpolate(template: string, params?: KjTranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/**
 * Resolves kouji-ui's visible / assistive-text strings from **typed, per-locale
 * catalogs**, selecting the active catalog from the locale that already exists —
 * {@link KjLocale.locale} — and guaranteeing a fallback to the English source so
 * the UI never blanks out on a missing key.
 *
 * Selection for a key resolves in order: exact locale tag (`fr-FR`) → bare
 * language subtag (`fr`) → `en`; within the chosen catalog a missing key falls
 * through to the English value, then to the key string itself. Values may carry
 * `{name}` placeholders substituted from `params`.
 *
 * Register alternate catalogs with {@link provideKjTranslations}; switch locale
 * at runtime with `KjLocale.setLocale()` — lookups are reactive, so
 * {@link translation} signals and the {@link KjTranslate} directive re-render.
 *
 * @example
 * ```ts
 * private readonly i18n = inject(KjTranslateService);
 * readonly closeLabel = this.i18n.translation('toast.close'); // Signal<string>
 * readonly info = computed(() =>
 *   this.i18n.translate('pagination.pageOf', { page: 3, total: 12 }));
 * ```
 * @doc
 * @doc-name i18n
 * @doc-is-main
 * @doc-category Core/Accessibility
 * @doc-description Resolves visible and ARIA strings from typed, tree-shakable per-locale catalogs, selected by KjLocale with an English fallback.
 */
@Injectable({ providedIn: 'root' })
export class KjTranslateService {
  private readonly locale = inject(KjLocale);
  private readonly catalogs = new Map<string, Partial<KjTranslationCatalog>>();

  constructor() {
    // English is always present as the source-language fallback.
    this.catalogs.set('en', EN_CATALOG);
    const groups = inject(KJ_TRANSLATION_CATALOGS, { optional: true }) ?? [];
    for (const group of groups) {
      for (const [tag, catalog] of Object.entries(group)) {
        this.register(tag, catalog);
      }
    }
  }

  /**
   * Register (or extend) a catalog at runtime. Merges over any catalog already
   * registered for the same tag. Locale tags are matched case-insensitively.
   * @param locale - BCP-47 tag or bare language subtag (e.g. `'fr'`, `'fr-CA'`).
   * @param catalog - Partial catalog; omitted keys fall through to English.
   */
  register(locale: string, catalog: Partial<KjTranslationCatalog>): void {
    const key = locale.toLowerCase();
    const existing = this.catalogs.get(key);
    this.catalogs.set(key, existing ? { ...existing, ...catalog } : catalog);
  }

  /**
   * Look up a key for the active locale and interpolate `params`. Reads
   * {@link KjLocale.locale}, so call it inside a `computed`/`effect` (or use
   * {@link translation}) to react to locale changes.
   */
  translate(key: KjTranslationKey, params?: KjTranslationParams): string {
    const catalog = this.selectCatalog(this.locale.locale());
    const value = catalog[key] ?? EN_CATALOG[key] ?? key;
    return interpolate(value, params);
  }

  /**
   * Reactive wrapper around {@link translate} — a `Signal` that re-emits when
   * the active locale or the resolved value changes. Ideal for host bindings
   * and template interpolation.
   */
  translation(
    key: KjTranslationKey,
    params?: KjTranslationParams,
  ): Signal<string> {
    return computed(() => this.translate(key, params));
  }

  /**
   * Pick the best catalog for a locale tag: exact tag → bare language subtag →
   * English. Never returns `undefined`.
   */
  private selectCatalog(tag: string): Partial<KjTranslationCatalog> {
    const lower = tag.toLowerCase();
    const exact = this.catalogs.get(lower);
    if (exact) return exact;
    const subtag = lower.split('-')[0];
    const byLanguage = this.catalogs.get(subtag);
    if (byLanguage) return byLanguage;
    return EN_CATALOG;
  }
}
