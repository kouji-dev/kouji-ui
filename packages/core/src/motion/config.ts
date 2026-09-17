import { InjectionToken, type Provider } from '@angular/core';
import { type KjDeepPartial, mergeKjConfig } from '../presets/merge-config';

/**
 * Configuration for the named motion presets applied by `KjMotion`.
 *
 * Motion is the last stylistic axis in the library without a `provideKj*`
 * surface: `kjMotion` used to be a free-form `input.required<string>()` with
 * no allowlist, no configurable timing and no dev-mode feedback for a typo,
 * while variant and size had all three. This gives it the same shape.
 *
 * `durations` and `easings` are written onto the host as the `--kj-motion-*`
 * custom properties that `motion.css` already reads, so configuring them is a
 * DI call rather than a global stylesheet edit.
 */
export interface KjMotionConfig {
  /**
   * Known preset names. `KjMotion` validates `kjMotion` against this list in
   * dev mode and warns once per unknown value. Registering a name here is
   * half the job — the keyframes are yours (see the CSS contract in
   * `KjMotion`'s TSDoc).
   */
  animations: string[];
  /**
   * Named durations. Each entry `k` is written as `--kj-motion-duration-<k>`
   * on the host; `motion.css` reads `--kj-motion-duration-md` by default.
   */
  durations: Record<string, string>;
  /**
   * Named easings. `default` / `in` / `spring` map to the `--kj-motion-ease`,
   * `--kj-motion-ease-in` and `--kj-motion-ease-spring` properties
   * `motion.css` reads; any other key becomes `--kj-motion-ease-<k>`.
   */
  easings: Record<string, string>;
  defaults: {
    /** Duration key applied as `--kj-motion-duration`. */
    duration: string;
    /** `kjMotionState` used when the input is not bound. */
    state: 'enter' | 'exit';
    /** Distance travelled by the `slide-*` presets (`--kj-motion-distance`). */
    distance: string;
  };
}

/**
 * The presets `@kouji-ui/core/motion/motion.css` ships. Spread to extend:
 * `{ animations: [...KJ_MOTION_DEFAULTS.animations, 'flip'] }`.
 */
export const KJ_MOTION_DEFAULTS: KjMotionConfig = {
  animations: [
    'fade',
    'slide-up',
    'slide-down',
    'slide-left',
    'slide-right',
    'scale',
    'slide-up-fade',
    'scale-spring',
  ],
  durations: { sm: '150ms', md: '250ms', lg: '400ms' },
  easings: {
    default: 'cubic-bezier(0.16, 1, 0.3, 1)',
    in: 'cubic-bezier(0.7, 0, 0.84, 0)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  defaults: { duration: 'md', state: 'enter', distance: '0.5rem' },
};

/**
 * DI token for the active motion configuration. Default factory yields
 * {@link KJ_MOTION_DEFAULTS}. Override via {@link provideKjMotion}.
 */
export const KJ_MOTION_CONFIG = new InjectionToken<KjMotionConfig>('kj.motion.config', {
  factory: () => KJ_MOTION_DEFAULTS,
});

/**
 * Configures the motion presets for the enclosing injector.
 *
 * Deep-merges over {@link KJ_MOTION_DEFAULTS} through `mergeKjConfig`, so
 * `provideKjMotion({ defaults: { duration: 'sm' } })` keeps every other
 * shipped value. `animations` replaces — spread
 * `KJ_MOTION_DEFAULTS.animations` to extend it.
 *
 * @example
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [
 *     provideKjMotion({
 *       animations: [...KJ_MOTION_DEFAULTS.animations, 'flip'],
 *       durations: { md: '180ms' },          // snappier app-wide
 *       easings: { default: 'ease-out' },
 *     }),
 *   ],
 * });
 * ```
 * Register the matching keyframes yourself:
 * ```css
 * @keyframes acme-flip-in { from { transform: rotateX(90deg); } to { transform: none; } }
 * .kj-motion[data-kj-motion="flip"][data-kj-motion-state="enter"] {
 *   animation-name: acme-flip-in;
 * }
 * ```
 */
export function provideKjMotion(config: KjDeepPartial<KjMotionConfig>): Provider[] {
  return [{ provide: KJ_MOTION_CONFIG, useValue: mergeKjConfig(KJ_MOTION_DEFAULTS, config) }];
}
