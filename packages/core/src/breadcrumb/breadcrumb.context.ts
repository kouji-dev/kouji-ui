import { InjectionToken, Signal } from '@angular/core';

/** Public-facing token interface representing a registered crumb item. */
export interface KjBreadcrumbItemContext {
  /** Index of the item among registered items (0-based, document order). */
  readonly index: Signal<number>;
  /** Whether this item is currently the "current page" cell. */
  readonly current: Signal<boolean>;
  /** Whether this item is hidden by truncation. */
  readonly hidden: Signal<boolean>;
}

/** Public-facing token interface representing the root breadcrumb. */
export interface KjBreadcrumbContext {
  /** Configured separator glyph (or `undefined` to use the CSS default). */
  readonly separator: Signal<string | undefined>;
  /** `kjMaxItems` — `0` or `Infinity` disables truncation. */
  readonly maxItems: Signal<number>;
  /** Active overflow mode. */
  readonly overflow: Signal<'truncate' | 'menu' | 'none'>;
  /** Read-only count of registered items. */
  readonly itemCount: Signal<number>;
  /** Read-only count of registered explicit current cells. */
  readonly currentCount: Signal<number>;
  /** Indices that should render visibly. */
  readonly visibleIndices: Signal<readonly number[]>;
  /** Indices that should be hidden by truncation. */
  readonly hiddenIndices: Signal<readonly number[]>;
  /** Whether the consumer has rendered explicit `<li kjBreadcrumbSeparator>` cells. */
  readonly hasExplicitSeparators: Signal<boolean>;

  /** Register a freshly-created item directive; returns its assigned index signal. */
  registerItem(): KjBreadcrumbItemContext;
  /** Unregister an item directive (called from `ngOnDestroy`). */
  unregisterItem(item: KjBreadcrumbItemContext): void;
  /** Register / unregister an explicit current cell. */
  registerCurrent(): void;
  unregisterCurrent(): void;
  /** Register / unregister an explicit separator cell. */
  registerSeparator(): void;
  unregisterSeparator(): void;
}

/** Injection token for the root `KjBreadcrumb` directive context. */
export const KJ_BREADCRUMB = new InjectionToken<KjBreadcrumbContext>('KjBreadcrumb');
