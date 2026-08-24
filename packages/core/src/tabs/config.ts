import { InjectionToken, Provider } from '@angular/core';

export interface KjTabsConfig {
  variants: string[];
  defaults: { variant: string };
}

/**
 * Default Tabs presets shipped by kouji-ui. Exported so consumers can spread
 * them when extending: `[...KJ_TABS_DEFAULTS.variants, 'underline-top']`.
 *
 * Two shapes ship: `default` (an underline strip — tabs sitting flat on a
 * surface, active one marked by a bar on the strip's edge) and `pills` (a
 * recessed tray of chips). Both are driven entirely by `--kj-tab-*` custom
 * properties, so a registered extra variant only needs a CSS rule keyed on
 * `.kj-tabs[data-variant="…"]` — no component change.
 */
export const KJ_TABS_DEFAULTS: KjTabsConfig = {
  variants: ['default', 'pills'],
  defaults: { variant: 'default' },
};

/**
 * DI token for the active Tabs presets. Default factory yields
 * `KJ_TABS_DEFAULTS`. Override via `provideKjTabs(…)` at the application scope
 * (e.g. `bootstrapApplication`'s `providers` or a route config) or at the
 * component scope (a component's own `providers: […]`).
 */
export const KJ_TABS_CONFIG = new InjectionToken<KjTabsConfig>('kj.tabs.config', {
  factory: () => KJ_TABS_DEFAULTS,
});

/**
 * Configures the Tabs presets for the enclosing injector. Replaces (does not
 * merge) `variants`; spread `KJ_TABS_DEFAULTS.variants` to extend.
 *
 * Returns a `Provider[]` so it can be spread into either an environment
 * `providers` (`bootstrapApplication`, route config) or a component-level
 * `providers` array.
 *
 * @example
 * ```ts
 * provideKjTabs({
 *   variants: [...KJ_TABS_DEFAULTS.variants, 'document'],
 *   defaults: { variant: 'default' },
 * })
 * ```
 */
export function provideKjTabs(config: Partial<KjTabsConfig>): Provider[] {
  return [
    {
      provide: KJ_TABS_CONFIG,
      useValue: { ...KJ_TABS_DEFAULTS, ...config },
    },
  ];
}
