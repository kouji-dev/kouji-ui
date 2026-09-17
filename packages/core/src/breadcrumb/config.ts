import { InjectionToken, Provider } from '@angular/core';
import { type KjDeepPartial, mergeKjConfig } from '../presets/merge-config';

/**
 * Configuration shape for the Breadcrumb directive family. Exposes preset
 * lists, default truncation policy, and the (mostly i18n-facing) labels the
 * directives reflect into the DOM.
 */
export interface KjBreadcrumbConfig {
  variants: string[];
  sizes: string[];
  defaults: {
    variant: string;
    size: string;
    /**
     * `aria-label` on the root `<nav>` host element. Optional override —
     * unset, it resolves from the i18n catalog key `breadcrumb.nav`.
     */
    ariaLabel?: string;
    /** Default separator glyph. */
    separator: string;
    /** Default `kjMaxItems`. `0` disables truncation. */
    maxItems: number;
    /** Default overflow mode. */
    overflow: 'truncate' | 'menu' | 'none';
    /** Default link variant for `KjBreadcrumbLink`. */
    linkVariant: string;
    /** Default link size for `KjBreadcrumbLink`. */
    linkSize: string;
    /** Default underline mode for `KjBreadcrumbLink`. */
    linkUnderline: 'always' | 'hover' | 'none';
  };
  /**
   * Computes the `aria-label` for the `<nav>` when items are truncated.
   * Optional override — unset, it resolves from the i18n catalog keys
   * `breadcrumb.truncatedOne` / `breadcrumb.truncated`.
   */
  truncatedAriaLabel?: (visible: number, hidden: number) => string;
  /**
   * Computes the `aria-label` for the ellipsis trigger button (menu mode).
   * Optional override — unset, it resolves from the i18n catalog keys
   * `breadcrumb.showHiddenOne` / `breadcrumb.showHidden`.
   */
  ellipsisLabel?: (hidden: number) => string;
}

/**
 * Default Breadcrumb presets shipped by kouji-ui. Exported so consumers can
 * spread when extending: `[...KJ_BREADCRUMB_DEFAULTS.sizes, 'xl']`.
 */
export const KJ_BREADCRUMB_DEFAULTS: KjBreadcrumbConfig = {
  variants: ['default'],
  sizes: ['sm', 'md', 'lg'],
  defaults: {
    variant: 'default',
    size: 'md',
    separator: '/',
    maxItems: 4,
    overflow: 'truncate',
    linkVariant: 'muted',
    linkSize: 'sm',
    linkUnderline: 'hover',
  },
  // No label literals: every string resolves through the i18n catalog
  // (`injectKjBreadcrumbLabels`). Leaving them `undefined` is what makes the
  // catalog the source of truth rather than a second, competing surface.
};

/**
 * DI token for the active Breadcrumb presets. Default factory yields
 * `KJ_BREADCRUMB_DEFAULTS`. Override via `provideKjBreadcrumb(…)` at the
 * application or component scope.
 */
export const KJ_BREADCRUMB_CONFIG = new InjectionToken<KjBreadcrumbConfig>(
  'kj.breadcrumb.config',
  { factory: () => KJ_BREADCRUMB_DEFAULTS },
);

/**
 * Configures the Breadcrumb presets / labels for the enclosing injector.
 *
 * Deep-merges over {@link KJ_BREADCRUMB_DEFAULTS} through
 * {@link mergeKjConfig} — pass only the fields you want to change, at any
 * depth. Arrays and label functions **replace**.
 *
 * Labels default to the {@link KjTranslateService} catalog, so translating a
 * breadcrumb is `provideKjTranslations({ fr: FR_CATALOG })` — reach for the
 * label fields here only to override a *single* string independently of
 * locale.
 */
export function provideKjBreadcrumb(config: KjDeepPartial<KjBreadcrumbConfig>): Provider[] {
  return [{ provide: KJ_BREADCRUMB_CONFIG, useValue: mergeKjConfig(KJ_BREADCRUMB_DEFAULTS, config) }];
}
