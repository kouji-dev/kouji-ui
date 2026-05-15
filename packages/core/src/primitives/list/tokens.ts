import { InjectionToken, Signal } from '@angular/core';
import type { KjListItem } from './item';

export interface KjListNavigatorConfig {
  /** All registered items in DOM order. Source of truth for nav + filter. */
  readonly items: Signal<readonly KjListItem<unknown>[]>;
  /** Filter-aware visible subset. Falls back to `items` when not provided. */
  readonly visibleItems?: Signal<readonly KjListItem<unknown>[]>;
}

export const KJ_LIST_NAVIGATOR_CONFIG =
  new InjectionToken<KjListNavigatorConfig>('KJ_LIST_NAVIGATOR_CONFIG');

export type KjListOrientation = 'vertical' | 'horizontal' | 'both';

/**
 * Selection modes supported by `KjSelectionModel`:
 *
 * - `'single'` — exactly one value (or `null`). Aria: `aria-selected="true"` on the chosen item.
 * - `'multi'` — any combination from a flat list. Aria: `aria-selected="true|false"` per item, container `aria-multiselectable="true"`.
 * - `'leaf'` — multi over a tree, but only leaf nodes go into `value`. Branch clicks are no-ops. Requires `setTreeShape()`. Aria: `aria-selected`.
 * - `'cascade'` — tri-state tree selection. Toggling a branch selects/deselects all leaf descendants; the parent's state is computed from descendants (`true` / `false` / `mixed`). Requires `setTreeShape()`. Aria: `aria-checked="true|false|mixed"` per WAI-ARIA tree checkbox pattern.
 */
export type KjListSelectionMode = 'single' | 'multi' | 'leaf' | 'cascade';

export type KjFilterFn = (query: string, haystacks: readonly string[]) => number;
export type KjCompareFn<T> = (a: T, b: T) => boolean;

/**
 * Tree topology contract used by `KjSelectionModel` in `'leaf'` and
 * `'cascade'` modes. The consumer's root directive (typically
 * `KjTreeSelect`) implements + provides this via `setTreeShape()`.
 */
export interface KjTreeShape<T> {
  /** Parent of `node`, or `null` at the root. */
  getParent(node: T): T | null;
  /** Immediate children of `node`. Empty for leaves. */
  getChildren(node: T): readonly T[];
  /** `true` when `node` has no children. */
  isLeaf(node: T): boolean;
}
