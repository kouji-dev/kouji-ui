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
 *   A single rectangle placeholder — the bare-minimum recipe.
 *   @doc-file skeleton.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common usages — avatar + lines and card
 *   preview. Use this as the copy-paste starting point.
 *   @doc-file skeleton.usage.example.ts
 * @doc-example Shapes
 *   `rectangle`, `circle`, `text`, `text-block` — pick the cadence that fits.
 *   @doc-file skeleton.shapes.example.ts
 * @doc-example Animations
 *   `shimmer`, `pulse`, `none` — collapse under `prefers-reduced-motion`.
 *   @doc-file skeleton.animations.example.ts
 * @doc-example Card
 *   A complete card composition while data is loading.
 *   @doc-file skeleton.card.example.ts
 *
 * @doc-aria
 *   aria-hidden="true" — Set on the skeleton host (decorative; semantics live on the parent region)
 *   data-shape         — Mirrors the shape preset for theme hooks
 *   data-animation     — Mirrors the animation preset for theme hooks
 *
 * @doc-touch
 *   The skeleton is non-interactive — no touch target rules apply. The
 *   parent region should carry `aria-busy="true"` while loading.
 *
 * @doc-a11y
 *   The wrapper sets `aria-hidden="true"` so the placeholder is invisible
 *   to AT. The parent region owns the loading semantics — typically a
 *   `role="status"` live region with `aria-busy="true"` while the data is
 *   in-flight. Animations collapse under `prefers-reduced-motion: reduce`.
 *
 * @doc-related spinner,progress-bar,empty-state
 *
 * @doc-css-var
 *   --kj-skeleton-bg                 — Surface background of the placeholder block.
 *   --kj-skeleton-highlight          — Highlight gradient color used by the shimmer sweep.
 *   --kj-skeleton-radius             — Corner radius for rectangle/text shapes.
 *   --kj-skeleton-line-height        — Per-line block size for text and text-block shapes.
 *   --kj-skeleton-line-radius        — Corner radius applied to text lines.
 *   --kj-skeleton-shimmer-duration   — One-sweep duration of the shimmer animation.
 *   --kj-skeleton-pulse-duration     — One-cycle duration of the pulse animation.
 *
 * @doc-category Library/Feedback
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
