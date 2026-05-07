import {
  Directive,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  KJ_OVERLAY_BADGE,
  type KjOverlayBadgeContext,
  type KjOverlayBadgePosition,
  nextOverlayBadgeId,
} from './overlay-badge.context';

/**
 * Anchor-side directive of the Overlay Badge family. Applied to the host
 * element the badge decorates (a button, an avatar, a tab label, an inbox
 * row). Provides the {@link KJ_OVERLAY_BADGE} context that the sibling
 * `[kjOverlayBadgeContent]` directive consumes.
 *
 * The directive does **not** inject a wrapper element — it composes onto the
 * existing anchor host. Visual chrome (variant, size, dot styling) is reused
 * from {@link import('../badge/badge').KjBadge} via `hostDirectives` on the
 * content node.
 *
 * Accessibility:
 *
 * - When `kjDescription` is set, the directive renders a visually-hidden span
 *   (id derived from `contentId`) and **merges** that id into the host's
 *   existing `aria-describedby` attribute, preserving any consumer-set ids.
 * - When `kjDecorative` is `true`, the badge content is `aria-hidden` and the
 *   describedby merge is skipped.
 * - Without a description and without `kjDecorative`, the content node is
 *   `aria-hidden` by default (a stray "4" with no context is worse than
 *   silence — the Material rule).
 *
 * @example
 * ```html
 * <button kjOverlayBadge kjDescription="4 unread" [kjPosition]="'top-end'">
 *   <kj-icon name="bell" />
 *   <span kjOverlayBadgeContent>4</span>
 * </button>
 * ```
 * @category Core/Data display
 */
@Directive({
  selector: '[kjOverlayBadge]',
  standalone: true,
  providers: [{ provide: KJ_OVERLAY_BADGE, useExisting: KjOverlayBadge }],
  host: {
    'style': 'position: relative;',
    '[attr.aria-describedby]': 'mergedDescribedBy()',
  },
})
export class KjOverlayBadge implements KjOverlayBadgeContext {
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Logical corner where the badge is placed. Defaults to `'top-end'`. */
  readonly kjPosition = input<KjOverlayBadgePosition>('top-end');

  /** Renders a fixed-size presence dot in place of numeric / text content. */
  readonly kjDot = input<boolean>(false);

  /**
   * Decorative opt-out. When `true`, the badge content is `aria-hidden` and
   * the host's `aria-describedby` merge is skipped. Use for cases where the
   * surrounding context already announces the badge's meaning.
   */
  readonly kjDecorative = input<boolean>(false);

  /**
   * Optional accessible description for assistive tech. When set, drives a
   * visually-hidden span whose id is merged into the host's existing
   * `aria-describedby`. Required for non-decorative badges that carry
   * meaning (a count, a status word).
   */
  readonly kjDescription = input<string | undefined>(undefined);

  /** Stable id of the badge content node. */
  private readonly _contentId = signal(nextOverlayBadgeId());

  /** @internal — exposed via {@link KJ_OVERLAY_BADGE}. */
  readonly contentId = this._contentId.asReadonly();

  /** Id of the visually-hidden description node — `${contentId}-desc`. */
  readonly descriptionId = computed(() => `${this._contentId()}-desc`);

  /** @internal — context surface (signal-typed) for consumers / tests. */
  readonly position = computed<KjOverlayBadgePosition>(() => this.kjPosition());
  /** @internal */
  readonly dot = computed(() => this.kjDot());
  /** @internal */
  readonly decorative = computed(() => this.kjDecorative());
  /** @internal */
  readonly description = computed(() => this.kjDescription() ?? '');

  /**
   * `aria-describedby` cached at construction so we can merge our description
   * id without dropping any consumer-set ids. We re-read once at construction
   * — consumers who mutate `aria-describedby` post-init via direct DOM are
   * out-of-contract; declarative bindings or `KjAriaDescribedBy` are the
   * supported paths.
   */
  private readonly originalDescribedBy = this.readOriginalDescribedBy();

  /** Merged `aria-describedby` value bound to the host. */
  protected readonly mergedDescribedBy = computed(() => {
    const original = this.originalDescribedBy;
    if (this.decorative() || !this.description()) {
      return original.length ? original.join(' ') : null;
    }
    const merged = [...original];
    const id = this.descriptionId();
    if (!merged.includes(id)) merged.push(id);
    return merged.join(' ');
  });

  private readOriginalDescribedBy(): string[] {
    const raw = this.hostEl.nativeElement.getAttribute('aria-describedby');
    if (!raw) return [];
    return raw.split(/\s+/u).filter(Boolean);
  }
}
