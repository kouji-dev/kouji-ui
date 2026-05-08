import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { KjOverlayController } from '../primitives/overlay/controller';
import { KJ_TREE_SELECT, type KjTreeNode, type KjTreeSelectContext } from './tree-select.context';

let _treeSelectIdCounter = 0;

function setsEqual(a: ReadonlySet<unknown>, b: ReadonlySet<unknown>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

/**
 * Root Tree Select container. Manages selected values, expanded node IDs,
 * and the selection model. Composes with `KjTreeSelectTrigger` (which now
 * brings overlay primitives) and `KjTreeSelectContent` (the dropdown tree
 * panel).
 *
 * Supports two selection modes:
 * - `'single'` (default) — selecting a node writes that value and closes the panel.
 * - `'multiple'` — selecting toggles the value in the selection set; the panel
 *   stays open.
 *
 * Open/close state lives on the overlay primitives — this directive is no
 * longer responsible for it.
 *
 * @example
 * ```html
 * <div kjTreeSelect [(kjValue)]="selected" [kjNodes]="categories">
 *   <button kjTreeSelectTrigger #t="kjTreeSelectTrigger">Select category</button>
 *   <kj-tree-select-content [kjFor]="t"></kj-tree-select-content>
 * </div>
 * ```
 * @category Core/Inputs
 */
@Directive({
  selector: '[kjTreeSelect]',
  standalone: true,
  providers: [
    { provide: KJ_TREE_SELECT, useExisting: KjTreeSelect },
    KjOverlayController,
  ],
})
export class KjTreeSelect implements KjTreeSelectContext {
  /** @internal — shared overlay controller; trigger + content + nodes all see this same instance. */
  private readonly controller = inject(KjOverlayController);

  /** Tree node data. Each node may carry children, forming a hierarchy. */
  readonly kjNodes = input<readonly KjTreeNode[]>([]);

  /** Selection mode: `'single'` closes the panel on select; `'multiple'` toggles. */
  readonly kjSelectionMode = input<'single' | 'multiple'>('single');

  /**
   * Two-way model for the selected value(s). In `'single'` mode this holds
   * one value (or `undefined`); in `'multiple'` mode it holds an array.
   */
  readonly kjValue = model<unknown>(undefined);

  /** Set of node IDs that are currently expanded (two-way bindable). */
  readonly kjExpandedKeys = model<readonly unknown[]>([]);

  /** Emitted when a node is selected. */
  readonly kjNodeSelect = output<unknown>();

  /** Emitted when a node branch is expanded. */
  readonly kjNodeExpand = output<unknown>();

  /** Emitted when a node branch is collapsed. */
  readonly kjNodeCollapse = output<unknown>();

  /** Stable panel id used for `aria-controls`. */
  readonly panelId = `kj-tree-select-panel-${++_treeSelectIdCounter}`;

  private readonly _expandedIds = signal<Set<string>>(new Set());
  private readonly _expandedValues = signal<Set<unknown>>(new Set());
  private readonly _selectedValues = signal<readonly unknown[]>([]);

  // ── KjTreeSelectContext implementation ──────────────────────────────

  readonly selectionMode = computed(() => this.kjSelectionMode());

  readonly selectedValues = computed(() => this._selectedValues());

  readonly expandedIds = computed(() =>
    new Set(this._expandedIds()) as ReadonlySet<string>,
  );

  readonly expandedValues = computed(() =>
    new Set(this._expandedValues()) as ReadonlySet<unknown>,
  );

  readonly nodes = computed(() => this.kjNodes());

  constructor() {
    // Sync kjExpandedKeys (controlled input) → _expandedValues
    effect(() => {
      const keys = this.kjExpandedKeys();
      const next = new Set(keys);
      const current = untracked(this._expandedValues);
      if (!setsEqual(current, next)) {
        this._expandedValues.set(next);
      }
    });
  }

  // ── Selection ops ────────────────────────────────────────────────────

  selectNode(value: unknown): void {
    if (this.kjSelectionMode() === 'single') {
      this.kjValue.set(value);
      this._selectedValues.set([value]);
      this.controller.close('programmatic');
    } else {
      const current = this._selectedValues();
      const idx = current.indexOf(value);
      if (idx >= 0) {
        this._selectedValues.set(current.filter((_, i) => i !== idx));
      } else {
        this._selectedValues.set([...current, value]);
      }
      this.kjValue.set(this._selectedValues());
    }
    this.kjNodeSelect.emit(value);
  }

  toggleNode(nodeId: string): void {
    const set = new Set(this._expandedIds());
    if (set.has(nodeId)) {
      set.delete(nodeId);
    } else {
      set.add(nodeId);
    }
    this._expandedIds.set(set);
  }

  toggleNodeByValue(value: unknown): void {
    const set = new Set(this._expandedValues());
    const wasExpanded = set.has(value);
    if (wasExpanded) {
      set.delete(value);
    } else {
      set.add(value);
    }
    this._expandedValues.set(set);
    this.kjExpandedKeys.set(Array.from(set));
    if (wasExpanded) {
      this.kjNodeCollapse.emit(value);
    } else {
      this.kjNodeExpand.emit(value);
    }
  }

  isExpanded(nodeId: string): boolean {
    return this._expandedIds().has(nodeId);
  }

  isValueExpanded(value: unknown): boolean {
    return this._expandedValues().has(value);
  }

  isSelected(value: unknown): boolean {
    if (this.kjSelectionMode() === 'single') {
      return this.kjValue() === value;
    }
    return this._selectedValues().includes(value);
  }
}

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
