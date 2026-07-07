import { Directive, Signal, computed, inject, input } from '@angular/core';
import { KjReducedMotion } from './reduced-motion';

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
 * `slide-left`, `slide-right`, `scale`, `slide-up-fade`, `scale-spring`. Under
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
  },
})
export class KjMotion {
  private readonly motion = inject(KjReducedMotion);

  /** Named preset to apply, e.g. `'fade'`, `'slide-up-fade'`, `'scale-spring'`. */
  readonly kjMotion = input.required<string>();

  /** Whether to play the entrance or exit keyframe. Defaults to `'enter'`. */
  readonly kjMotionState = input<KjMotionState>('enter');

  /** `true` when the user prefers reduced motion. Mirrors `KjReducedMotion`. */
  readonly reduced: Signal<boolean> = computed(() => this.motion.prefersReducedMotion());
}
