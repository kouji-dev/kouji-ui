import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { KjFocusRing } from '../primitives';
import { KJ_TREE_SELECT, type KjTreeNode, type KjTreeSelectContext } from './tree-select.context';

let _treeSelectIdCounter = 0;

function setsEqual(a: ReadonlySet<unknown>, b: ReadonlySet<unknown>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

/**
 * Root Tree Select container. Manages open/close state, selected values,
 * and expanded node IDs. Composes with `KjTreeSelectPanel` (the dropdown
 * tree) and `KjTreeSelectTrigger` (the trigger button).
 *
 * Supports two selection modes:
 * - `'single'` (default) — selecting a node writes that value and closes the panel.
 * - `'multiple'` — selecting toggles the value in the selection set; the panel
 *   stays open.
 *
 * @example
 * ```html
 * <div kjTreeSelect [(kjValue)]="selected" [kjNodes]="categories">
 *   <button kjTreeSelectTrigger>Select category</button>
 *   <div kjTreeSelectPanel></div>
 * </div>
 * ```
 * @category Core/Inputs
 * @doc
 * @doc-name tree-select
 * @doc-is-main
 */
@Directive({
  selector: '[kjTreeSelect]',
  standalone: true,
  providers: [{ provide: KJ_TREE_SELECT, useExisting: KjTreeSelect }],
})
export class KjTreeSelect implements KjTreeSelectContext {
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

  private readonly _open = signal(false);
  private readonly _expandedIds = signal<Set<string>>(new Set());
  private readonly _expandedValues = signal<Set<unknown>>(new Set());
  private readonly _selectedValues = signal<readonly unknown[]>([]);

  // ── KjTreeSelectContext implementation ──────────────────────────────

  readonly open = this._open.asReadonly();

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
      this._open.set(false);
    } else {
      // Toggle in multi mode
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
    // Keep kjExpandedKeys model in sync
    this.kjExpandedKeys.set(Array.from(set));
    // Emit lifecycle outputs (single point of truth)
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

  // ── Panel ops ────────────────────────────────────────────────────────

  hide(): void {
    this._open.set(false);
  }

  toggleOpen(): void {
    if (this._open()) {
      this.hide();
    } else {
      this._open.set(true);
    }
  }
}

/**
 * Trigger button that opens/closes the Tree Select panel. Wires
 * `role="combobox"`, `aria-haspopup="tree"`, `aria-expanded`, and
 * `aria-controls` to the panel.
 *
 * @example
 * ```html
 * <button kjTreeSelectTrigger>Select category</button>
 * ```
 * @category Core/Inputs
 * @doc
 * @doc-name tree-select
 */
@Directive({
  selector: '[kjTreeSelectTrigger]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    'role': 'combobox',
    'aria-haspopup': 'tree',
    '[attr.aria-expanded]': 'ctx.open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.panelId',
    '[attr.data-open]': 'ctx.open() ? "" : null',
    '(click)': '$event.stopPropagation(); ctx.toggleOpen()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjTreeSelectTrigger {
  /** @internal */
  readonly ctx = inject(KJ_TREE_SELECT);

  /** @internal */
  onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
      case ' ':
      case 'Enter':
        event.preventDefault();
        if (!this.ctx.open()) this.ctx.toggleOpen();
        break;
      case 'Escape':
        if (this.ctx.open()) {
          event.preventDefault();
          this.ctx.hide();
        }
        break;
    }
  }
}

/**
 * Tree panel container. Carries `role="tree"` and `aria-multiselectable`.
 * Hidden when the parent context is closed. Implements ArrowDown/Up for
 * vertical focus movement, ArrowRight to expand a branch, ArrowLeft to
 * collapse a branch or move to parent, Enter/Space to select the focused
 * node, Home/End to jump to first/last visible node, and Escape to close.
 *
 * Outside-clicks and Escape close the panel.
 *
 * @example
 * ```html
 * <div kjTreeSelectPanel>
 *   <!-- tree nodes rendered here -->
 * </div>
 * ```
 * @category Core/Inputs
 * @doc
 * @doc-name tree-select
 */
@Directive({
  selector: '[kjTreeSelectPanel]',
  standalone: true,
  host: {
    'role': 'tree',
    '[attr.id]': 'ctx.panelId',
    '[attr.hidden]': '!ctx.open() ? "" : null',
    '[attr.aria-multiselectable]': 'ctx.selectionMode() === "multiple" ? "true" : null',
    '(keydown)': 'onKeydown($event)',
    '(document:keydown.escape)': 'ctx.hide()',
    '(document:click)': 'onDocClick($event)',
    '(click)': '$event.stopPropagation()',
  },
})
export class KjTreeSelectPanel {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  /** @internal */
  readonly ctx = inject(KJ_TREE_SELECT);

  private readonly _activeIndex = signal(-1);

  /** @internal */
  onDocClick(event: MouseEvent): void {
    if (!this.ctx.open()) return;
    const target = event.target as Node | null;
    if (!target) return;
    if (this.el.nativeElement.contains(target)) return;
    this.ctx.hide();
  }

  /** @internal */
  onKeydown(event: KeyboardEvent): void {
    const items = this._getVisibleNodes();
    if (!items.length) return;
    let idx = this._activeIndex();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        idx = idx < items.length - 1 ? idx + 1 : 0;
        this._activeIndex.set(idx);
        items[idx]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        idx = idx > 0 ? idx - 1 : items.length - 1;
        this._activeIndex.set(idx);
        items[idx]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        this._activeIndex.set(0);
        items[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        this._activeIndex.set(items.length - 1);
        items[items.length - 1]?.focus();
        break;
      case 'ArrowRight': {
        event.preventDefault();
        const node = items[idx];
        if (node) {
          const hasChildren = node.getAttribute('data-has-children') === 'true';
          const expanded = node.getAttribute('data-expanded') === 'true';
          if (hasChildren && !expanded) {
            // Expand: find and click the toggle
            const toggle = node.querySelector('[kjTreeSelectToggle]') as HTMLElement | null;
            toggle?.click();
          } else if (hasChildren && expanded) {
            // Move focus to first child
            const nextItems = this._getVisibleNodes();
            const nextIdx = idx + 1;
            if (nextIdx < nextItems.length) {
              this._activeIndex.set(nextIdx);
              nextItems[nextIdx]?.focus();
            }
          }
        }
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        const node = items[idx];
        if (node) {
          const expanded = node.getAttribute('data-expanded') === 'true';
          if (expanded) {
            // Collapse
            const toggle = node.querySelector('[kjTreeSelectToggle]') as HTMLElement | null;
            toggle?.click();
          } else {
            // Move to parent (lower aria-level)
            const currentLevel = parseInt(node.getAttribute('aria-level') ?? '1', 10);
            for (let i = idx - 1; i >= 0; i--) {
              const parentLevel = parseInt(items[i]?.getAttribute('aria-level') ?? '1', 10);
              if (parentLevel < currentLevel) {
                this._activeIndex.set(i);
                items[i]?.focus();
                break;
              }
            }
          }
        }
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const node = items[idx];
        if (node) {
          node.click();
        }
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.ctx.hide();
        break;
      default: {
        // Type-ahead: jump to first visible node whose label starts with typed char
        const char = event.key.length === 1 ? event.key.toLowerCase() : null;
        if (char) {
          const match = items.findIndex(item =>
            (item.textContent ?? '').trim().toLowerCase().startsWith(char),
          );
          if (match >= 0) {
            this._activeIndex.set(match);
            items[match]?.focus();
          }
        }
      }
    }
  }

  private _getVisibleNodes(): HTMLElement[] {
    return (
      Array.from(
        this.el.nativeElement.querySelectorAll('[kjTreeSelectNode]'),
      ) as HTMLElement[]
    ).filter(el => el.getAttribute('hidden') === null && !el.hasAttribute('hidden'));
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
 * @doc
 * @doc-name tree-select
 */
@Directive({
  selector: '[kjTreeSelectNode]',
  standalone: true,
  exportAs: 'kjTreeSelectNode',
  host: {
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
    // Ignore clicks that originated from the toggle button (it handles expand itself)
    const target = event.target as HTMLElement;
    if (target.closest('[kjTreeSelectToggle]')) return;
    // Ignore clicks that originated from a descendant tree node (child handles its own selection)
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
 * @doc
 * @doc-name tree-select
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
    // Update both id-based (for headless keyboard nav) and value-based (for wrapper) expansion.
    this.ctx.toggleNode(this.node.id);
    this.ctx.toggleNodeByValue(this.node.kjValue());
  }
}
