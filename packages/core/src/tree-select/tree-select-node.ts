import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
} from '@angular/core';
import { KJ_TREE_SELECT } from './tree-select.context';

/**
 * Individual tree node (treeitem). Carries `role="treeitem"` and the full
 * suite of ARIA attributes (`aria-level`, `aria-setsize`, `aria-posinset`,
 * `aria-expanded`, `aria-selected`, `aria-disabled`). Clicking or pressing
 * Enter/Space calls `selectNode` on the parent context. Auto-mints an `id`
 * for keyboard navigation.
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
 * @category Core/Inputs
 */
@Directive({
  selector: '[kjTreeSelectNode]',
  standalone: true,
  exportAs: 'kjTreeSelectNode',
  host: {
    'class': 'kj-tree-select-node',
    'role': 'treeitem',
    '[attr.id]': 'id',
    '[attr.tabindex]': 'disabled() ? "-1" : "0"',
    '[attr.aria-level]': 'kjNodeLevel()',
    '[attr.aria-setsize]': 'kjNodeSize()',
    '[attr.aria-posinset]': 'kjNodePos()',
    '[attr.aria-expanded]': 'kjHasChildren() ? (isExpanded() ? "true" : "false") : null',
    '[attr.aria-selected]': 'isSelected() ? "true" : "false"',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-selected]': 'isSelected() ? "" : null',
    '[attr.data-expanded]': 'isExpanded() ? "true" : "false"',
    '[attr.data-has-children]': 'kjHasChildren() ? "true" : "false"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'handleClick($event)',
    '(keydown.enter)': '$event.preventDefault(); handleClick($event)',
    '(keydown.space)': '$event.preventDefault(); handleClick($event)',
  },
})
export class KjTreeSelectNode {
  private readonly ctx = inject(KJ_TREE_SELECT);

  /** The value this node represents. Required. */
  readonly kjValue = input.required<unknown>();
  /** Display label for the node (used for type-ahead). */
  readonly kjLabel = input<string>('');
  /** Nesting depth (1-based). Maps to `aria-level`. */
  readonly kjNodeLevel = input<number>(1);
  /** Number of sibling nodes at the same level. Maps to `aria-setsize`. */
  readonly kjNodeSize = input<number>(1);
  /** 1-based position among siblings. Maps to `aria-posinset`. */
  readonly kjNodePos = input<number>(1);
  /** Whether this node is disabled (unselectable). */
  readonly kjDisabled = input(false, { transform: booleanAttribute });
  /** Whether this node has child nodes (branch vs. leaf). */
  readonly kjHasChildren = input(false, { transform: booleanAttribute });

  /** Stable auto-minted DOM id for aria references and keyboard navigation. */
  readonly id: string;

  /** Whether the node is currently expanded (reactive computed from context). */
  readonly isExpanded = computed(() => this.ctx.isExpanded(this.id));
  /** Whether the node value is currently selected (reactive computed from context). */
  readonly isSelected = computed(() => this.ctx.isSelected(this.kjValue()));
  /** Whether the node is disabled. */
  readonly disabled = computed(() => this.kjDisabled());

  constructor() {
    this.id = `kj-tree-node-${Math.random().toString(36).slice(2, 9)}`;
  }

  /** @internal */
  handleClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.closest('[kjTreeSelectToggle]')) return;
    const targetNode = target.closest('[kjTreeSelectNode]');
    if (targetNode && targetNode !== (event.currentTarget as HTMLElement)) return;
    if (this.kjDisabled()) return;
    event.stopPropagation();
    this.ctx.selectNode(this.kjValue());
  }
}

/**
 * Expand/collapse toggle button inside a `KjTreeSelectNode`. Intercepts
 * clicks before they bubble to the node (preventing accidental selection)
 * and calls `toggleNode` on the tree context. Only meaningful on branch
 * nodes (`[kjHasChildren]="true"`).
 *
 * Carries `role="button"` with `aria-label` that reflects the current state.
 *
 * @example
 * ```html
 * <button kjTreeSelectToggle aria-hidden="true"></button>
 * ```
 * @category Core/Inputs
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
  readonly isExpanded = computed(() => this.ctx.isExpanded(this.node.id));

  /** @internal */
  handleClick(event: Event): void {
    event.stopPropagation();
    if (this.node.kjDisabled()) return;
    this.ctx.toggleNode(this.node.id);
    this.ctx.toggleNodeByValue(this.node.kjValue());
  }
}
