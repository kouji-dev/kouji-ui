import { InjectionToken, Provider } from '@angular/core';
import { type KjDeepPartial, mergeKjConfig } from '../presets/merge-config';

/** Shape of the bubble's preset configuration. */
export interface KjChatBubbleConfig {
  variants: string[];
  sizes: string[];
  defaults: { variant: string; size: string };
}

/**
 * Default Chat-Bubble presets shipped by kouji-ui. Exported so consumers can
 * spread when extending: `[...KJ_CHAT_BUBBLE_DEFAULTS.variants, 'brand']`.
 */
export const KJ_CHAT_BUBBLE_DEFAULTS: KjChatBubbleConfig = {
  variants: [
    'default',
    'primary',
    'secondary',
    'accent',
    'info',
    'success',
    'warning',
    'error',
  ],
  sizes: ['sm', 'md', 'lg'],
  defaults: { variant: 'default', size: 'md' },
};

/**
 * DI token for the active Chat-Bubble presets. Default factory yields
 * `KJ_CHAT_BUBBLE_DEFAULTS`. Override via `provideKjChatBubble(…)` at the
 * application or component scope.
 */
export const KJ_CHAT_BUBBLE_CONFIG = new InjectionToken<KjChatBubbleConfig>(
  'kj.chat-bubble.config',
  { factory: () => KJ_CHAT_BUBBLE_DEFAULTS },
);

/**
 * Configures the Chat-Bubble presets for the enclosing injector.
 *
 * Deep-merges over {@link KJ_CHAT_BUBBLE_DEFAULTS} through {@link mergeKjConfig}: pass only the
 * fields you want to change, at any depth — `provideKjChatBubble({ defaults: { variant: '…' } })`
 * keeps every other shipped default. Arrays still **replace**, so spread
 * `KJ_CHAT_BUBBLE_DEFAULTS.variants` to extend rather than swap the list.
 */
export function provideKjChatBubble(
  config: KjDeepPartial<KjChatBubbleConfig>,
): Provider[] {
  return [
    {
      provide: KJ_CHAT_BUBBLE_CONFIG,
      useValue: mergeKjConfig(KJ_CHAT_BUBBLE_DEFAULTS, config),
    },
  ];
}
