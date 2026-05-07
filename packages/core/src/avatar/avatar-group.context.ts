import { InjectionToken, Signal } from '@angular/core';

/** Logical text direction surfaced by the group to its CSS / wrapper. */
export type KjAvatarGroupDirection = 'ltr' | 'rtl';

/**
 * Shape forwarded from the group to its child avatars as a default.
 * Per-child overrides win.
 */
export type KjAvatarShape = 'circle' | 'rounded';

/**
 * Shared state surfaced by `KjAvatarGroup` for child avatars (in the wrapper
 * package) and the wrapper template to read.
 *
 * - `size` / `shape` are *defaults* — children may override per-instance.
 * - `direction` mirrors the group's resolved logical direction.
 * - `visibleCount`, `overflowCount`, `total` drive the count-aware
 *   `aria-label` and the wrapper's overflow chip.
 */
export interface KjAvatarGroupContext {
  /** Size token forwarded from the group as a default for children. */
  readonly size: Signal<string | undefined>;
  /** Shape forwarded from the group as a default for children. */
  readonly shape: Signal<KjAvatarShape | undefined>;
  /** Logical text direction observed by the group. */
  readonly direction: Signal<KjAvatarGroupDirection>;
  /**
   * Number of avatars rendered visibly, including the overflow chip when
   * present.
   */
  readonly visibleCount: Signal<number>;
  /** Number of avatars hidden behind the chip. `0` when no overflow. */
  readonly overflowCount: Signal<number>;
  /**
   * Effective total: `kjTotal` if provided (and not less than the projected
   * count), otherwise the projected child count.
   */
  readonly total: Signal<number>;
}

/** Injection token for `KjAvatarGroupContext`. */
export const KJ_AVATAR_GROUP = new InjectionToken<KjAvatarGroupContext>(
  'KjAvatarGroup',
);
