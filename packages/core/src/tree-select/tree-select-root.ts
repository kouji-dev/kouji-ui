import {
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
 * Root Tree Select container. Owns selection model, expanded node state,
 * and the shared `KjOverlayController` so the trigger, content, and
 * individual nodes all wire to the same overlay state.
 *
 * Mirrors the `[kjSelect]` pattern: umbrella root holds context +
 * controller; leaf directives read from it via DI.
 *
 * Supports two selection modes:
 * - `'single'` (default) — selecting a node writes that value and closes the panel.
 * - `'multiple'` — selecting toggles the value in the selection set; the panel
 *   stays open.
 *
 * @example
 * ```html
 * <div kjTreeSelect [(kjValue)]="selected" [kjNodes]="categories">
 *   <button kjTreeSelectTrigger #t="kjTreeSelectTrigger">Select category</button>
 *   <kj-tree-select-content [kjFor]="t"></kj-tree-select-content>
 * </div>
 * ```
 * @category Core/Inputs
 * @doc
 * @doc-name tree-select
 * @doc-is-main
 * @doc-description Root container that owns the tree selection model, expanded-node state, and a shared overlay controller so the trigger, content, and nodes all wire to the same state.
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
    if (set.has(nodeId)) set.delete(nodeId);
    else set.add(nodeId);
    this._expandedIds.set(set);
  }

  toggleNodeByValue(value: unknown): void {
    const set = new Set(this._expandedValues());
    const wasExpanded = set.has(value);
    if (wasExpanded) set.delete(value);
    else set.add(value);
    this._expandedValues.set(set);
    this.kjExpandedKeys.set(Array.from(set));
    if (wasExpanded) this.kjNodeCollapse.emit(value);
    else this.kjNodeExpand.emit(value);
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
