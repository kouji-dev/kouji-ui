import { InjectionToken, Signal } from '@angular/core';

/**
 * A node in the cascade tree — value, label, optional children.
 * Leaf nodes have no children (or empty children array).
 */
export interface KjCascadeNode<T = unknown> {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
  readonly children?: readonly KjCascadeNode<T>[];
}

/**
 * Shared cascade-specific context for the Cascade Select compound family.
 * Owned by `KjCascadeSelect`; injected by panel, sub-panel, and option
 * directives. Carries only the cross-cutting state that doesn't already
 * live on the shared `KjListNavigator` / `KjSelectionModel` primitives
 * (open sub-panels, the cascade path, sub-panel hover timing).
 */
export interface KjCascadeSelectContext<T = unknown> {
  /** The currently selected leaf value (mirrors KjSelect's value). */
  readonly value: Signal<T | null | undefined>;

  /**
   * The path of values from root option to selected leaf (inclusive).
   * Empty when nothing is selected.
   */
  readonly path: Signal<readonly T[]>;

  /**
   * Ids of sub-panels that are currently open.
   * Each id is the `ownerOptionId` used to key the sub-panel.
   */
  readonly openSubPanels: Signal<readonly string[]>;

  /** Sub-panel hover-open delay in ms. */
  readonly subPanelOpenDelayMs: Signal<number>;

  /** Sub-panel hover-out-to-close delay in ms. */
  readonly subPanelCloseDelayMs: Signal<number>;

  /**
   * Open the sub-panel associated with the given owner-option id.
   * Automatically closes any sub-panels at deeper levels.
   */
  openSubPanel(ownerOptionId: string): void;

  /**
   * Close the sub-panel associated with the given owner-option id
   * and all deeper panels.
   */
  closeSubPanel(ownerOptionId: string): void;

  /** Close all sub-panels (called when the root select closes). */
  closeAll(): void;

  /** Close the root cascade panel. */
  hide(): void;
}

/** DI token for the Cascade Select shared context. */
export const KJ_CASCADE_SELECT = new InjectionToken<KjCascadeSelectContext>(
  'KjCascadeSelect',
);

let _idCounter = 0;
/** Allocate a stable id for cascade sub-panels / options. */
export function nextCascadeId(prefix: string): string {
  return `${prefix}-${++_idCounter}`;
}
