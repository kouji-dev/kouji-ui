import { Directive, input } from '@angular/core';

/**
 * Visual shape preset for a skeleton placeholder. Reflects to `data-shape`.
 */
export type KjSkeletonShape = 'rectangle' | 'circle' | 'text' | 'text-block';

/**
 * Animation preset for a skeleton placeholder. Reflects to `data-animation`.
 */
export type KjSkeletonAnimation = 'shimmer' | 'pulse' | 'none';

/**
 * Marks an element as a kouji skeleton — a decorative placeholder painted
 * while real content is loading. Forces `aria-hidden="true"` on the host so
 * AT skips the placeholder (the *parent region* carries the loading
 * semantics, see [`skeleton.md`](./skeleton.md) § Accessibility), and
 * reflects `data-shape` / `data-animation` so theme CSS can pick the
 * chrome and animation. The directive owns no dimensions, no variant, no
 * size — sizing is consumer-driven and skeletons are tonally neutral by
 * design.
 *
 * @example
 * ```html
 * <span kjSkeleton kjSkeletonShape="text" style="width: 12rem"></span>
 * <div kjSkeleton kjSkeletonShape="circle" style="width: 40px; height: 40px"></div>
 * ```
 * @category Core/Layout
 * @doc
 * @doc-name skeleton
 * @doc-description Marks an element as a decorative loading placeholder hidden from screen readers.
 * @doc-is-main
 */
@Directive({
  selector: '[kjSkeleton]',
  standalone: true,
  exportAs: 'kjSkeleton',
  host: {
    '[attr.aria-hidden]': '"true"',
    '[attr.data-shape]': 'kjSkeletonShape()',
    '[attr.data-animation]': 'kjSkeletonAnimation()',
  },
})
export class KjSkeleton {
  /**
   * The visual shape of the skeleton. Reflects to `data-shape`. Defaults to
   * `'rectangle'`.
   */
  readonly kjSkeletonShape = input<KjSkeletonShape>('rectangle');

  /**
   * The animation style applied while the skeleton is on screen. Reflects to
   * `data-animation`. Defaults to `'shimmer'`.
   */
  readonly kjSkeletonAnimation = input<KjSkeletonAnimation>('shimmer');
}
