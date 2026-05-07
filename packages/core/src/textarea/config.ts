import { InjectionToken, Provider } from '@angular/core';

/** Preset configuration consumed by `KjTextarea` via `bindPresets`. */
export interface KjTextareaConfig {
  variants: string[];
  sizes: string[];
  defaults: { variant: string; size: string };
}

/**
 * Default Textarea presets shipped by kouji-ui. Variant list mirrors `KjInput`
 * — outlined / filled — so a textarea inside a form sits naturally next to a
 * matching input.
 */
export const KJ_TEXTAREA_DEFAULTS: KjTextareaConfig = {
  variants: ['outlined', 'filled'],
  sizes: ['sm', 'md', 'lg'],
  defaults: { variant: 'outlined', size: 'md' },
};

/**
 * DI token for the active Textarea presets. Default factory yields
 * `KJ_TEXTAREA_DEFAULTS`. Override via `provideKjTextarea(…)` at application
 * or component scope.
 */
export const KJ_TEXTAREA_CONFIG = new InjectionToken<KjTextareaConfig>('kj.textarea.config', {
  factory: () => KJ_TEXTAREA_DEFAULTS,
});

/**
 * Configures the Textarea presets for the enclosing injector. Replaces (does
 * not merge) `variants` and `sizes`; spread `KJ_TEXTAREA_DEFAULTS.variants` to
 * extend.
 */
export function provideKjTextarea(config: Partial<KjTextareaConfig>): Provider[] {
  return [
    {
      provide: KJ_TEXTAREA_CONFIG,
      useValue: { ...KJ_TEXTAREA_DEFAULTS, ...config },
    },
  ];
}
