import {
  Directive,
  ElementRef,
  PLATFORM_ID,
  Signal,
  computed,
  contentChildren,
  effect,
  inject,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { KjDirectionality } from '../primitives/directionality/directionality';
import { KjAvatar } from './avatar';
import {
  KJ_AVATAR_GROUP,
  KjAvatarGroupContext,
  KjAvatarGroupDirection,
  KjAvatarShape,
} from './avatar-group.context';

/** Format used to compose the count-aware `aria-label`. */
export type KjAvatarGroupAriaLabelFormat = (
  visible: number,
  total: number,
  label: string,
) => string;

const DEFAULT_ARIA_LABEL_FORMAT: KjAvatarGroupAriaLabelFormat = (v, t, l) =>
  `${v} of ${t} ${l}`;

/**
 * Coordinates a horizontally stacked cluster of `KjAvatar` children.
 *
 * Owns:
 * - **Counting** — enumerates the projected `KjAvatar` directives via
 *   `contentChildren` and exposes `visibleCount`, `overflowCount`, and `total`
 *   signals for the wrapper template.
 * - **Overflow hiding (Plan C)** — writes `[hidden]` (and a
 *   `data-overflow="true"` data attribute) on each child past `kjMax`.
 *   Cleared automatically when the child re-enters the visible range.
 * - **ARIA** — applies `role="group"` (or `"list"` / none) and a count-aware
 *   `aria-label` such as `"3 of 8 collaborators"`. Consumers may override the
 *   noun (`kjAriaLabel`) and the entire format function (`kjAriaLabelFormat`),
 *   or pass a static label via the standard `aria-label` attribute on the
 *   host (the host binding only writes when the consumer hasn't).
 * - **RTL-aware stacking** — composes `KjDirectionality` and writes a
 *   per-child `--kj-avatar-group-stack-order` CSS custom property (and the
 *   group-wide `--kj-avatar-group-count` and `--kj-avatar-group-direction`)
 *   so theme CSS can paint first-on-top in either direction without walking
 *   ancestors.
 *
 * The directive renders nothing of its own (no template, no DOM mutations
 * beyond child host attributes / inline custom properties). The wrapper
 * component owns the chip element and the layout CSS.
 *
 * @example
 * ```html
 * <span kjAvatarGroup [kjMax]="3" kjAriaLabel="collaborators">
 *   <span kjAvatar>...</span>
 *   <span kjAvatar>...</span>
 *   <span kjAvatar>...</span>
 *   <span kjAvatar>...</span>
 *   <span kjAvatar>...</span>
 * </span>
 * ```
 * @category Core/Data display
 * @doc
 * @doc-name avatar
 */
@Directive({
  selector: '[kjAvatarGroup]',
  standalone: true,
  exportAs: 'kjAvatarGroup',
  providers: [{ provide: KJ_AVATAR_GROUP, useExisting: KjAvatarGroup }],
  host: {
    '[attr.role]': 'kjRole()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.data-direction]': 'direction()',
    '[style.--kj-avatar-group-count]': 'visibleCount()',
    '[style.--kj-avatar-group-direction]': 'direction()',
  },
})
export class KjAvatarGroup implements KjAvatarGroupContext {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly directionality = inject(KjDirectionality);

  /**
   * Maximum number of avatars to show before the overflow chip. Children past
   * this index are hidden via `[hidden]` and counted toward
   * `overflowCount`. `0` disables the cap (always show all, no chip).
   * @default 4
   */
  readonly kjMax = input<number>(4);

  /**
   * Override of the effective total. When provided (and not less than the
   * projected child count) drives the count-aware `aria-label` and the
   * overflow count, so consumers can show a *page* of a larger collection
   * (e.g. server-side pagination).
   *
   * If the consumer passes a value smaller than the projected count, the
   * directive clamps to the projected count to avoid nonsense like `"5 of 3"`.
   */
  readonly kjTotal = input<number | undefined>(undefined);

  /**
   * Default size token forwarded to children via `KJ_AVATAR_GROUP`. Per-child
   * overrides win.
   */
  readonly kjSize = input<string | undefined>(undefined);

  /**
   * Default shape forwarded to children via `KJ_AVATAR_GROUP`. Per-child
   * overrides win.
   * @default 'circle'
   */
  readonly kjShape = input<KjAvatarShape | undefined>('circle');

  /** Noun used in the count-aware `aria-label`. */
  readonly kjAriaLabel = input<string>('avatars');

  /** Formatter for the count-aware `aria-label`. */
  readonly kjAriaLabelFormat = input<KjAvatarGroupAriaLabelFormat>(
    DEFAULT_ARIA_LABEL_FORMAT,
  );

  /**
   * Host role. `'group'` for a decorative cluster, `'list'` when each child
   * is wrapped in a `listitem` (e.g. interactive avatars as links), `null`
   * to opt out entirely.
   * @default 'group'
   */
  readonly kjRole = input<'group' | 'list' | null>('group');

  /**
   * Per-consumer override for the host `aria-label`. When set, takes
   * precedence over the count-aware label. `null` opts out of `aria-label`.
   */
  readonly kjAriaLabelOverride = input<string | null | undefined>(undefined);

  /**
   * All `KjAvatar` directives projected into the group, including those
   * composed via `hostDirectives` on a wrapper component.
   *
   * `descendants: true` so wrapping a `<kj-avatar>` in `<a>` (the "stack of
   * links" use case) still finds the child.
   */
  private readonly avatars = contentChildren(KjAvatar, { descendants: true });

  /**
   * Host elements for each projected `KjAvatar`, queried in parallel with
   * the directive query so we can write `[hidden]` and CSS variables onto
   * the right host node without having to expose `ElementRef` on `KjAvatar`.
   */
  private readonly avatarHosts = contentChildren(KjAvatar, {
    descendants: true,
    read: ElementRef,
  });

  /** Effective total: `kjTotal` (clamped) or the projected child count. */
  readonly total: Signal<number> = computed(() => {
    const childCount = this.avatars().length;
    const override = this.kjTotal();
    if (override === undefined) return childCount;
    return Math.max(override, childCount);
  });

  /** Number of children rendered visibly (the rest are `[hidden]`). */
  readonly visibleCount: Signal<number> = computed(() => {
    const max = this.kjMax();
    const childCount = this.avatars().length;
    if (max <= 0) return childCount;
    return Math.min(childCount, max);
  });

  /** Number of avatars hidden by the cap. `0` when nothing overflows. */
  readonly overflowCount: Signal<number> = computed(() => {
    const max = this.kjMax();
    if (max <= 0) return 0;
    return Math.max(0, this.total() - max);
  });

  /** Logical text direction observed at the document level. */
  readonly direction: Signal<KjAvatarGroupDirection> = computed(
    () => this.directionality.current() as KjAvatarGroupDirection,
  );

  /** Default `aria-label`, omitted when the group is empty. */
  private readonly countAwareAriaLabel = computed<string | null>(() => {
    const total = this.total();
    if (total === 0) return null;
    return this.kjAriaLabelFormat()(this.visibleCount(), total, this.kjAriaLabel());
  });

  /**
   * `aria-label` actually written to the host. Consumer override wins; `null`
   * opts out of the attribute entirely.
   */
  protected readonly resolvedAriaLabel = computed<string | null>(() => {
    const override = this.kjAriaLabelOverride();
    if (override !== undefined) return override ?? null;
    return this.countAwareAriaLabel();
  });

  /** Read-only signal — exposed for the wrapper / spec ergonomics. */
  get size(): Signal<string | undefined> {
    return this.kjSize;
  }

  /** Read-only signal — exposed for the wrapper / spec ergonomics. */
  get shape(): Signal<KjAvatarShape | undefined> {
    return this.kjShape;
  }

  constructor() {
    // Plan C from `avatar-group.md`: write `[hidden]` and a per-child stack
    // order onto each projected avatar's host element. Crosses the directive
    // boundary by design — the group owns visibility of its overflow items.
    effect(() => {
      const hosts = this.avatarHosts();
      const max = this.kjMax();
      const dir = this.direction();
      const visibleCount = this.visibleCount();
      const isBrowser = isPlatformBrowser(this.platformId);
      if (!isBrowser) return;

      const total = hosts.length;
      const cap = max <= 0 ? total : Math.min(max, total);

      hosts.forEach((ref, index) => {
        const el = ref.nativeElement as HTMLElement | null;
        if (!el) return;

        const overflow = max > 0 && index >= cap;
        if (overflow) {
          el.setAttribute('hidden', '');
          el.setAttribute('data-overflow', 'true');
        } else {
          el.removeAttribute('hidden');
          el.removeAttribute('data-overflow');
        }

        // First-on-top in LTR (highest z-index goes to index 0); flipped in
        // RTL so the visually-leading face — which is now on the right —
        // still paints on top.
        const visualIndex =
          dir === 'rtl' ? Math.max(0, visibleCount - 1 - index) : index;
        const stackOrder = Math.max(0, visibleCount - 1 - visualIndex);
        el.style.setProperty(
          '--kj-avatar-group-stack-order',
          String(stackOrder),
        );
        el.style.setProperty('--kj-avatar-group-index', String(index));
      });
    });
  }
}
