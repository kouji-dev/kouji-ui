import { InjectionToken, Provider } from '@angular/core';

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
    /** `aria-label` on the root `<nav>` host element. */
    ariaLabel: string;
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
  /** Computes the `aria-label` for the `<nav>` when items are truncated. */
  truncatedAriaLabel: (visible: number, hidden: number) => string;
  /** Computes the `aria-label` for the ellipsis trigger button (menu mode). */
  ellipsisLabel: (hidden: number) => string;
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
    ariaLabel: 'Breadcrumb',
    separator: '/',
    maxItems: 4,
    overflow: 'truncate',
    linkVariant: 'muted',
    linkSize: 'sm',
    linkUnderline: 'hover',
  },
  truncatedAriaLabel: (_visible, hidden) =>
    hidden === 1 ? 'Breadcrumb (1 item hidden)' : `Breadcrumb (${hidden} items hidden)`,
  ellipsisLabel: (hidden) =>
    hidden === 1 ? 'Show 1 hidden breadcrumb' : `Show ${hidden} hidden breadcrumbs`,
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
 * Shallow-merges over the defaults — pass only the fields you want to override.
 */
export function provideKjBreadcrumb(config: Partial<KjBreadcrumbConfig>): Provider[] {
  return [
    {
      provide: KJ_BREADCRUMB_CONFIG,
      useValue: {
        ...KJ_BREADCRUMB_DEFAULTS,
        ...config,
        defaults: { ...KJ_BREADCRUMB_DEFAULTS.defaults, ...(config.defaults ?? {}) },
      },
    },
  ];
}
