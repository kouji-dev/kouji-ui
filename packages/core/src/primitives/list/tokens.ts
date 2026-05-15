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
export type KjListSelectionMode = 'single' | 'multi';
export type KjFilterFn = (query: string, haystacks: readonly string[]) => number;
export type KjCompareFn<T> = (a: T, b: T) => boolean;
