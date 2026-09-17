import { Directive, Signal, computed, effect, inject, input } from '@angular/core';
import { KJ_MOTION_CONFIG } from './config';
import { KjReducedMotion } from './reduced-motion';
import { kjDevMode, kjDevWarn } from '../primitives/diagnostics/dev-mode';

/**
 * Direction of a motion preset — `'enter'` plays the entrance keyframe,
 * `'exit'` plays the reverse.
 */
export type KjMotionState = 'enter' | 'exit';

/**
 * Applies a named motion preset from `motion.css` to its host element. The
 * animation itself lives entirely in CSS (keyed off the reflected
 * `data-kj-motion` / `data-kj-motion-state` attributes and the `--kj-motion-*`
 * custom properties); this directive is a thin, declarative opt-in.
 *
 * Presets are composable, pre-bundled names — `fade`, `slide-up`, `slide-down`,
 * `slide-left`, `slide-right`, `scale`, `slide-up-fade`, `scale-spring`. They
 * are **configurable, not hard-coded**: `provideKjMotion(…)` sets the timing
 * and easing scales (written onto the host as the `--kj-motion-*` properties
 * `motion.css` reads) and registers extra names, which the directive validates
 * against in dev mode. Registering a name is a config entry plus your own
 * `@keyframes` + a `.kj-motion[data-kj-motion="…"]` rule — the directive only
 * reflects the attribute, it owns no keyframes. Under
 * `prefers-reduced-motion: reduce` every preset collapses to a ~1ms opacity
 * fade with no transform (WCAG 2.1 AAA 2.3.3), so consumers never have to
 * branch on the setting for the visual result. The `reduced()` signal is
 * exposed for the rare case that needs to gate JS-driven timing.
 *
 * Requires `@kouji-ui/core/motion/motion.css` to be loaded (globally or in the
 * component's styles).
 *
 * @example
 * ```html
 * <div kjMotion="slide-up-fade" [kjMotionState]="open() ? 'enter' : 'exit'">…</div>
 * ```
 *
 * @doc-aria
 *   data-kj-motion        — reflects the active preset name for CSS targeting
 *   data-kj-motion-state  — "enter" | "exit"
 *   data-kj-reduced-motion — present when the user prefers reduced motion
 *
 * @doc-a11y
 *   Motion is decorative and opt-in; the directive adds no interactive
 *   semantics (no role, no tabindex). Every preset honours
 *   prefers-reduced-motion by collapsing to a near-instant opacity fade with no
 *   transform, satisfying WCAG 2.1 AAA 2.3.3 (Animation from Interactions).
 *
 * @doc
 *  @doc-example Presets
 *    @doc-file motion.example.ts
 *  @doc-example Reduced motion
 *    @doc-file motion.reduced.example.ts
 * @doc-category Core/Primitives
 * @doc-name motion
 * @doc-is-main
 * @doc-description Applies a named, reduced-motion-aware CSS motion preset to any element.
 */
@Directive({
  selector: '[kjMotion]',
  standalone: true,
  host: {
    class: 'kj-motion',
    '[attr.data-kj-motion]': 'kjMotion()',
    '[attr.data-kj-motion-state]': 'kjMotionState()',
    '[attr.data-kj-reduced-motion]': 'reduced() ? "" : null',
    '[style.--kj-motion-duration-md]': 'duration()',
    '[style.--kj-motion-ease]': 'ease()',
    '[style.--kj-motion-ease-in]': 'easeIn()',
    '[style.--kj-motion-ease-spring]': 'easeSpring()',
    '[style.--kj-motion-distance]': 'distance()',
  },
})
export class KjMotion {
  private readonly motion = inject(KjReducedMotion);

  /**
   * Active motion configuration — `provideKjMotion(…)` at any injector above
   * this element, else the shipped defaults.
   * @internal
   */
  protected readonly config = inject(KJ_MOTION_CONFIG);

  /** Named preset to apply, e.g. `'fade'`, `'slide-up-fade'`, `'scale-spring'`. */
  readonly kjMotion = input.required<string>();

  /** Whether to play the entrance or exit keyframe. Defaults to `'enter'`. */
  readonly kjMotionState = input<KjMotionState>('enter');

  /** `true` when the user prefers reduced motion. Mirrors `KjReducedMotion`. */
  readonly reduced: Signal<boolean> = computed(() => this.motion.prefersReducedMotion());

  // The five resolved custom properties below are written onto the host so a
  // `provideKjMotion(…)` scope retimes its own sub-tree. `motion.css` reads
  // each with an inline fallback, so `null` (an unconfigured key) leaves the
  // stylesheet's own value in place rather than blanking it.

  /**
   * Effective animation duration: `durations[defaults.duration]`. It lands in
   * `--kj-motion-duration-md`, which is the slot `motion.css` reads — the key
   * names the entry in the scale, the property names the slot.
   */
  protected readonly duration = computed(
    () => this.config.durations[this.config.defaults.duration] ?? null,
  );
  /** `easings.default` → `--kj-motion-ease` (enter keyframes). */
  protected readonly ease = computed(() => this.config.easings['default'] ?? null);
  /** `easings.in` → `--kj-motion-ease-in` (exit keyframes accelerate away). */
  protected readonly easeIn = computed(() => this.config.easings['in'] ?? null);
  /** `easings.spring` → `--kj-motion-ease-spring` (the `scale-spring` preset). */
  protected readonly easeSpring = computed(() => this.config.easings['spring'] ?? null);
  /** `defaults.distance` → `--kj-motion-distance` (the `slide-*` travel). */
  protected readonly distance = computed(() => this.config.defaults.distance || null);

  constructor() {
    if (kjDevMode()) {
      effect(() => {
        const name = this.kjMotion();
        if (name && !this.config.animations.includes(name)) {
          kjDevWarn(
            'kj-motion',
            `unknown preset "${name}". Allowed values: ` +
              `${this.config.animations.join(', ')}. Register it with ` +
              `provideKjMotion({ animations: [...KJ_MOTION_DEFAULTS.animations, '${name}'] }) ` +
              'and ship the matching @keyframes.',
          );
        }
      });
    }
  }
}
