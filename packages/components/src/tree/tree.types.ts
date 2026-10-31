/**
 * One node of a `<kj-tree>`. The tree reads these objects in place — it never
 * clones them — so a lazy loader can swap a branch's `children` array and
 * re-bind `nodes` without the tree re-walking anything it has not shown.
 *
 * A node is a **branch** when `children` is present, even as an empty array:
 * set `children: []` on a node whose children are not loaded yet, listen to
 * `(expandedChange)`, and fill them in.
 */
export interface KjTreeItem {
  /** Unique across the whole tree. Drives expansion, selection and focus. */
  readonly id: string;
  /** Text shown in the row, and the type-ahead target. */
  readonly label: string;
  /** Child nodes. Present (even empty) = branch; absent = leaf. */
  readonly children?: readonly KjTreeItem[];
  /** A disabled node stays focusable (WAI-ARIA tree) but cannot be selected or activated. */
  readonly disabled?: boolean;
}

/** Template context handed to `<ng-template kjTreeNode>`. */
export interface KjTreeNodeContext {
  /** The node itself. */
  readonly $implicit: KjTreeItem;
  /** 1-based depth, the value of `aria-level`. */
  readonly level: number;
  /** Whether the node is a branch and currently open. */
  readonly expanded: boolean;
  /** Whether the node is the selected one. */
  readonly selected: boolean;
}
