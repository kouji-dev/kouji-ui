import { Directive, computed, inject } from '@angular/core';
import { KjBadge } from '../badge/badge';
import { KJ_OVERLAY_BADGE } from './overlay-badge.context';

/**
 * The badge content node of the Overlay Badge family. Applied to the element
 * that renders the badge's visible chrome (typically a `<span>` projected as
 * the last child of the anchor host).
 *
 * Composes {@link KjBadge} via `hostDirectives` so all variant / size styling
 * comes from the existing inline-Badge primitive — one CSS source of truth.
 *
 * Reads {@link KJ_OVERLAY_BADGE} for position, dot-mode, decorative, and
 * description state. Owns:
 *
 * - `data-position` reflection of the parent's logical-corner choice — used
 *   by CSS to drive `inset-inline-*` / `inset-block-*` placement (RTL is a
 *   pure-CSS concern, not JS).
 * - `data-dot` reflection for dot-vs-content rendering.
 * - `aria-hidden="true"` when the parent is decorative or no description was
 *   set (a stray "4" with no context would mislead AT — silence is better).
 * - Stable `id` derived from the parent context — referenced by the host's
 *   merged `aria-describedby` when a description is configured.
 * - `pointer-events: none` so clicks pass through to the anchor. Consumers
 *   who project an interactive child (e.g. `<button kjBadge>`) override this
 *   in their own CSS.
 *
 * @example
 * ```html
 * <button kjOverlayBadge kjDescription="4 unread">
 *   <kj-icon name="bell" />
 *   <span kjOverlayBadgeContent>4</span>
 * </button>
 * ```
 * @category Core/Data display
 */
@Directive({
  selector: '[kjOverlayBadgeContent]',
  standalone: true,
  hostDirectives: [
    { directive: KjBadge, inputs: ['kjBadgeVariant'] },
  ],
  host: {
    'style': 'position: absolute; pointer-events: none;',
    '[attr.id]': 'ctx.contentId()',
    '[attr.data-position]': 'ctx.position()',
    '[attr.data-dot]': 'ctx.dot() ? "" : null',
    '[attr.aria-hidden]': 'ariaHidden()',
  },
})
export class KjOverlayBadgeContent {
  /** The parent {@link KJ_OVERLAY_BADGE} context. */
  protected readonly ctx = inject(KJ_OVERLAY_BADGE);

  /**
   * `aria-hidden` resolution:
   *
   * - `true` when the parent is decorative — the consumer has explicitly
   *   opted out of AT announcement.
   * - `true` when there is no description — without one, reading the badge
   *   alone (e.g. just "4") would be context-free.
   * - `null` (attribute removed) when a description is wired and the badge
   *   is non-decorative — AT reaches the description through the host's
   *   merged `aria-describedby`.
   */
  protected readonly ariaHidden = computed(() => {
    if (this.ctx.decorative()) return 'true';
    if (!this.ctx.description()) return 'true';
    return null;
  });
}
