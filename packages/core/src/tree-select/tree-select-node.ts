import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
} from '@angular/core';
import { KjListItem, injectListItem } from '../primitives/list';
import { KJ_TREE_SELECT } from './tree-select.context';

/**
 * Individual tree node (treeitem). Composes `KjListItem` via
 * `hostDirectives` — the list item owns the stable id, the
 * click/Enter/Space activation, the `aria-selected` / `aria-disabled`
 * bindings, and the shared `KjSelectionModel` toggle. This directive
 * contributes only tree-specific semantics: `role="treeitem"`,
 * `aria-level` / `aria-setsize` / `aria-posinset` from the parent's
 * derived metadata, `aria-expanded` from the tree context's
 * expanded-id set, and the `data-*` styling hooks.
 *
 * @example
 * ```html
 * <div
 *   kjTreeSelectNode
 *   [kjValue]="node.value"
 *   [kjLabel]="node.label"
 *   [kjNodeLevel]="1"
 *   [kjHasChildren]="true"
 * >
 *   <button kjTreeSelectToggle>▶</button>
 *   <span>{{ node.label }}</span>
 * </div>
 * ```
 * @doc-category Core/Inputs
 * @doc
 * @doc-name tree-select
 * @doc-description Renders one tree node with accessible treeitem semantics; selection + activation owned by the composed KjListItem.
 */
@Directive({
  selector: '[kjTreeSelectNode]',
  standalone: true,
  exportAs: 'kjTreeSelectNode',
  hostDirectives: [
    {
      directive: KjListItem,
      inputs: [
        'kjItemValue:kjValue',
        'kjItemLabel:kjLabel',
        'kjDisabled:kjDisabled',
      ],
    },
  ],
  host: {
    'class': 'kj-tree-select-node',
    'role': 'treeitem',
    '[attr.aria-level]':        'kjNodeLevel()',
    '[attr.aria-setsize]':      'kjNodeSize()',
    '[attr.aria-posinset]':     'kjNodePos()',
    '[attr.aria-expanded]':     'kjHasChildren() ? (isExpanded() ? "true" : "false") : null',
    '[attr.data-expanded]':     'isExpanded() ? "true" : "false"',
    '[attr.data-has-children]': 'kjHasChildren() ? "true" : "false"',
    // `aria-selected` is owned by the composed `KjListItem` (it binds
    // off the shared `KjSelectionModel`). We surface it as a
    // `data-selected` styling hook here so consumer CSS doesn't have to
    // care that the source of truth is one directive layer down.
    '[attr.data-selected]': 'item.ariaSelected() === "true" ? "" : null',
  },
})
export class KjTreeSelectNode {
  /** Nesting depth (1-based). Maps to `aria-level`. */
  readonly kjNodeLevel   = input<number>(1);
  /** Number of sibling nodes at the same level. Maps to `aria-setsize`. */
  readonly kjNodeSize    = input<number>(1);
  /** 1-based position among siblings. Maps to `aria-posinset`. */
  readonly kjNodePos     = input<number>(1);
  /** Whether this node has child nodes (branch vs. leaf). */
  readonly kjHasChildren = input(false, { transform: booleanAttribute });

  private readonly ctx = inject(KJ_TREE_SELECT);
  /** @internal — composed list-item primitive providing id/value/disabled/activation. */
  readonly item = injectListItem<unknown>();

  /** Stable id minted by the composed `KjListItem` (used by toggle + aria refs). */
  get id(): string { return this.item.id; }
  /** Current value carried by this node (from the composed `KjListItem`). */
  get value(): unknown { return this.item.value(); }
  /** Whether this node is disabled (delegated to the composed `KjListItem`). */
  readonly disabled   = this.item.disabled;
  /** Whether the node is currently expanded (reactive computed from context). */
  readonly isExpanded = computed(() => this.ctx.isExpanded(this.id));
}

/**
 * Expand/collapse toggle button inside a `KjTreeSelectNode`. Intercepts
 * clicks before they bubble to the node (preventing accidental
 * activation through the composed `KjListItem`) and toggles the
 * tree-context expansion state by both the node's id and its value.
 * Only meaningful on branch nodes (`[kjHasChildren]="true"`).
 *
 * Carries `aria-label` that reflects the current state.
 *
 * @example
 * ```html
 * <button kjTreeSelectToggle aria-hidden="true"></button>
 * ```
 * @doc-category Core/Inputs
 */
@Directive({
  selector: '[kjTreeSelectToggle]',
  standalone: true,
  host: {
    '[attr.aria-label]': 'isExpanded() ? "Collapse" : "Expand"',
    '[attr.data-expanded]': 'isExpanded() ? "true" : "false"',
    '(click)': 'handleClick($event)',
  },
})
export class KjTreeSelectToggle {
  private readonly ctx = inject(KJ_TREE_SELECT);
  /** @internal — parent node context */
  private readonly node = inject(KjTreeSelectNode);

  /** Whether the parent node is currently expanded (reactive computed). */
  readonly isExpanded = this.node.isExpanded;

  /** @internal */
  handleClick(event: Event): void {
    event.stopPropagation();
    if (this.node.disabled()) return;
    this.ctx.toggleNode(this.node.id);
    this.ctx.toggleNodeByValue(this.node.value);
  }
}
