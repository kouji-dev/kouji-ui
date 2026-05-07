import { InjectionToken, Signal } from '@angular/core';

/**
 * A single node in a tree structure. Nodes may carry an arbitrary value
 * of type `T`, a display label, an optional disabled flag, and optional
 * child nodes (making the node a branch rather than a leaf).
 */
export interface KjTreeNode<T = unknown> {
  /** The value represented by this node. Used for selection and identity. */
  readonly value: T;
  /** Human-readable display label shown in the tree. */
  readonly label: string;
  /** When `true`, the node cannot be selected or expanded by the user. */
  readonly disabled?: boolean;
  /** Child nodes. When present and non-empty, this node is a branch. */
  readonly children?: readonly KjTreeNode<T>[];
}

/**
 * Context interface exposed by `KjTreeSelect` to descendant directives
 * (panel, nodes, toggle buttons) via the `KJ_TREE_SELECT` injection token.
 */
export interface KjTreeSelectContext<T = unknown> {
  /** Auto-minted id for the panel element. */
  readonly panelId: string;
  /** Whether the dropdown panel is currently open. */
  readonly open: Signal<boolean>;
  /** Current selection mode: `'single'` or `'multiple'`. */
  readonly selectionMode: Signal<'single' | 'multiple'>;
  /** Currently selected values. Single mode: 0 or 1 item; multi: N items. */
  readonly selectedValues: Signal<readonly T[]>;
  /** Set of node IDs that are currently expanded. */
  readonly expandedIds: Signal<ReadonlySet<string>>;
  /** Set of node **values** that are currently expanded. */
  readonly expandedValues: Signal<ReadonlySet<unknown>>;
  /** The full tree data. */
  readonly nodes: Signal<readonly KjTreeNode<T>[]>;

  /**
   * Select a node. In single mode closes the panel; in multiple mode toggles
   * the value in the selection set.
   */
  selectNode(value: T): void;
  /**
   * Toggle expand/collapse for the given node DOM id. Does nothing for leaf
   * nodes (those without children).
   */
  toggleNode(nodeId: string): void;
  /**
   * Toggle expand/collapse for a node identified by its **value**. Used by
   * wrapper components that track expansion by value rather than by DOM id.
   */
  toggleNodeByValue(value: T): void;
  /** Returns `true` when the node with the given DOM id is expanded. */
  isExpanded(nodeId: string): boolean;
  /** Returns `true` when the given value is in the expanded values set. */
  isValueExpanded(value: T): boolean;
  /** Returns `true` when the given value is in the current selection set. */
  isSelected(value: T): boolean;
  /** Close the panel. */
  hide(): void;
  /** Toggle the panel open/closed. */
  toggleOpen(): void;
}

/** Injection token providing the nearest `KjTreeSelect` context to descendants. */
export const KJ_TREE_SELECT = new InjectionToken<KjTreeSelectContext>('KjTreeSelect');
