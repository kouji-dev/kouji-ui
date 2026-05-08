import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';
import { KjSkeleton, type KjSkeletonAnimation, type KjSkeletonShape } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjSkeleton` directive.
 *
 * Composes `KjSkeleton` via `hostDirectives` with `kj`-prefixed input
 * aliasing (`kjSkeletonShape`, `kjSkeletonAnimation`). The directive's
 * host bindings — `aria-hidden="true"`, `data-shape`, `data-animation` —
 * land directly on the `<kj-skeleton>` host so theme CSS in
 * `skeleton.css` paints the surface, runs the shimmer / pulse keyframes,
 * and honours `prefers-reduced-motion` against the same element. The
 * wrapper deliberately keeps a real (non-`display: contents`) host
 * because the host *is* the painted skeleton.
 *
 * For the `text-block` shape the wrapper expands its inner template into
 * N stacked text-shaped child skeletons (default 3, last at 60% width)
 * since multi-line composition can't be carried by a single element. The
 * outer host still reflects `data-shape="text-block"` so themes can opt
 * out of the rectangle paint when stacking lines.
 *
 * The wrapper has no `<ng-content/>` — projecting real content into a
 * skeleton is a bug, not a feature. The parent region carries the
 * loading semantics (`aria-busy`, `role="status"` live region); the
 * skeleton itself stays silent.
 *
 * @example
 * ```html
 * <kj-skeleton kjSkeletonShape="text" kjWidth="12rem" />
 * <kj-skeleton kjSkeletonShape="circle" kjWidth="40px" kjHeight="40px" />
 * <kj-skeleton kjSkeletonShape="text-block" [kjLines]="4" />
 * ```
 * @doc-example Default
 *   @doc-file skeleton.example.ts
 * @doc-example Shapes
 *   @doc-file skeleton.shapes.example.ts
 * @doc-example Animations
 *   @doc-file skeleton.animations.example.ts
 * @doc-example Card
 *   @doc-file skeleton.card.example.ts
 * @category Library/Feedback
 * @doc
 * @doc-name skeleton
 * @doc-description Themed loading placeholder with rectangle, circle, text, and text-block shapes.
 * @doc-is-main
 */
@Component({
  selector: 'kj-skeleton',
  standalone: true,
  hostDirectives: [
    {
      directive: KjSkeleton,
      inputs: ['kjSkeletonShape', 'kjSkeletonAnimation'],
    },
  ],
  imports: [KjSkeleton],
  template: `
    @if (isTextBlock()) {
      @for (line of lineWidths(); track $index) {
        <span
          kjSkeleton
          class="kj-skeleton kj-skeleton--line"
          [kjSkeletonShape]="'text'"
          [kjSkeletonAnimation]="kjSkeletonAnimation()"
          [style.width]="line"
        ></span>
      }
    }
  `,
  styleUrl: './skeleton.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-skeleton',
    '[style.width]': 'kjWidth()',
    '[style.height]': 'kjHeight()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSkeletonComponent {
  /**
   * Visual shape preset. Aliased onto the composed `KjSkeleton` directive,
   * which reflects the value to `data-shape` on this host element.
   */
  readonly kjSkeletonShape = input<KjSkeletonShape>('rectangle');

  /**
   * Animation preset. Aliased onto the composed `KjSkeleton` directive,
   * which reflects the value to `data-animation` on this host element.
   */
  readonly kjSkeletonAnimation = input<KjSkeletonAnimation>('shimmer');

  /** Optional inline width applied as `style.width` on the host. */
  readonly kjWidth = input<string | undefined>(undefined);

  /** Optional inline height applied as `style.height` on the host. */
  readonly kjHeight = input<string | undefined>(undefined);

  /**
   * Number of lines rendered when `kjSkeletonShape === 'text-block'`.
   * Ignored for every other shape. Defaults to 3, with the last line at
   * 60% width to match typographic cadence.
   */
  readonly kjLines = input<number>(3);

  /** True when the wrapper should render its multi-line text-block template. */
  protected readonly isTextBlock = computed(() => this.kjSkeletonShape() === 'text-block');

  /**
   * Pre-computed widths for the `text-block` line cadence: every line is
   * `100%` except the last (when more than one line), which is `60%`.
   */
  protected readonly lineWidths = computed<readonly string[]>(() => {
    const count = Math.max(1, Math.floor(this.kjLines()));
    const widths: string[] = [];
    for (let i = 0; i < count; i++) {
      widths.push(i === count - 1 && count > 1 ? '60%' : '100%');
    }
    return widths;
  });
}
