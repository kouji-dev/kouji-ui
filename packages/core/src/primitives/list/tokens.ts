import { InjectionToken, Signal, WritableSignal } from '@angular/core';
import type { KjListItem } from './item';

/**
 * The single contract a consumer root directive (KjSelect, KjCombobox,
 * KjCommandPalette, …) implements + provides via
 * `useExisting: forwardRef(() => Self)`. Primitives read whichever
 * fields they need from this one object — items for the navigator,
 * `value` for the selection model, `visibleItems` for filter-aware nav.
 */
export interface KjListNavigatorConfig {
  /** All registered items in DOM order. Source of truth for nav + filter. */
  readonly items: Signal<readonly KjListItem<unknown>[]>;
  /** Filter-aware visible subset. Falls back to `items` when not provided. */
  readonly visibleItems?: Signal<readonly KjListItem<unknown>[]>;
  /**
   * Writable signal holding the canonical selection value (typically the
   * consumer's `model()` input). When the consumer provides
   * `KjSelectionModel`, it reads / writes through this signal — one
   * source of truth, no bridging effects. Optional: consumers without
   * selection state (e.g. KjCommandPalette) omit it.
   */
  readonly value?: WritableSignal<unknown | readonly unknown[] | null>;
  /**
   * Selection mode signal. When provided, `KjSelectionModel` follows it
   * reactively — consumers don't need to inject the model just to call
   * `setMode()`. Default `'single'`.
   */
  readonly mode?: Signal<KjListSelectionMode>;
  /**
   * Equality fn signal. When provided, `KjSelectionModel` follows it
   * reactively. Default `Object.is`.
   */
  readonly compareBy?: Signal<KjCompareFn<unknown>>;
  /**
   * Consumer-side hook invoked by `KjListItem` immediately after it
   * toggles the shared `KjSelectionModel`. Lets the consumer do its
   * post-selection work (close an overlay, set an input query, emit a
   * commit event) without subscribing to every option's `activate`
   * output — pushing the repeat pattern down into one place.
   *
   * `closeRequested` mirrors `KjSelectionModel.toggle()`'s return value:
   * `true` in single mode, `false` in multi / leaf / cascade modes.
   */
  afterSelect?(value: unknown, closeRequested: boolean): void;
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
