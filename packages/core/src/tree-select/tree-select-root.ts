import {
  computed,
  contentChildren,
  Directive,
  effect,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_LIST_NAVIGATOR_CONFIG,
  KjListItem,
  KjSelectionModel,
  type KjCompareFn,
  type KjListNavigatorConfig,
  type KjListSelectionMode,
  type KjTreeShape,
} from '../primitives/list';
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
 * Implements {@link KjListNavigatorConfig}: descendants (`KjListNavigator`,
 * `KjSelectionModel`) read the canonical `value`, `mode`, `compareBy`, and
 * optional `treeShape` from the same root via `KJ_LIST_NAVIGATOR_CONFIG`.
 * The legacy {@link KjTreeSelectContext} surface is preserved as a thin
 * delegate so existing node/toggle directives keep working.
 *
 * @example
 * ```html
 * <div kjTreeSelect [(kjValue)]="selected" [kjNodes]="categories">
 *   <button kjTreeSelectTrigger #t="kjTreeSelectTrigger">Select category</button>
 *   <kj-tree-select-content [kjFor]="t"></kj-tree-select-content>
 * </div>
 * ```
 * @doc-category Core/Inputs
 * @doc
 * @doc-name tree-select
 * @doc-is-main
 * @doc-description Unstyled tree-select root that holds the selection model and shares state with trigger, content, and nodes.
 */
@Directive({
  selector: '[kjTreeSelect]',
  standalone: true,
  providers: [
    { provide: KJ_TREE_SELECT, useExisting: KjTreeSelect },
    { provide: KJ_LIST_NAVIGATOR_CONFIG, useExisting: forwardRef(() => KjTreeSelect) },
    KjSelectionModel,
    KjOverlayController,
  ],
})
export class KjTreeSelect implements KjListNavigatorConfig, KjTreeSelectContext {
  // Note: selection state (current value, isSelected membership) lives
  // on the shared `KjSelectionModel` injected by `KjListItem`. The
  // tree-select context here only owns tree-specific surface:
  // expansion, the node-data signal, and the public `selectionMode`
  // input name. Programmatic selection routes through the same
  // `kjValue` signal that the selection model writes to — see
  // `afterSelect` below.
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

  /**
   * Optional tree topology used by `KjSelectionModel` in `'leaf'` /
   * `'cascade'` selection modes. Exposed as a signal so the model can
   * follow it reactively without `KjTreeSelect` having to inject the
   * model (that would re-introduce the NG0200 cycle).
   */
  readonly kjTreeShape = input<KjTreeShape<unknown> | null>(null);

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

  // ── KjListNavigatorConfig implementation ────────────────────────────

  /**
   * Items contributed by `KjListItem` instances under this root. Empty
   * until node-level wiring lands (Task 3 of the migration plan); kept
   * here now so the config contract is satisfied today.
   */
  readonly items = contentChildren(KjListItem, { descendants: true });

  /**
   * Single canonical value signal. Shared with the legacy `kjValue`
   * model — `KjSelectionModel` reads / writes through this signal.
   */
  readonly value = this.kjValue as unknown as WritableSignal<
    unknown | readonly unknown[] | null
  >;

  /**
   * `KjListSelectionMode` view of {@link kjSelectionMode}:
   * - `'single'` → `'single'` (one value, closes panel)
   * - `'multiple'` → `'cascade'` (tri-state tree selection: toggling a
   *   parent selects/deselects every leaf descendant; parent renders
   *   `aria-checked="mixed"` when only some descendants are selected).
   *
   * Cascade mode requires a tree shape; {@link treeShape} falls back to
   * a shape auto-derived from {@link kjNodes} when the consumer does
   * not supply one.
   */
  readonly mode: Signal<KjListSelectionMode> = computed(() =>
    this.kjSelectionMode() === 'multiple' ? 'cascade' : 'single',
  );

  /** Equality fn used by `KjSelectionModel`. Defaults to `Object.is`. */
  readonly compareBy = signal<KjCompareFn<unknown>>(Object.is as KjCompareFn<unknown>);

  /**
   * Effective tree topology. Consumer-supplied `kjTreeShape` takes
   * precedence; otherwise an auto-built shape is derived from the
   * `kjNodes` input so cascade mode works out of the box for the
   * canonical data-driven usage.
   */
  readonly treeShape = computed<KjTreeShape<unknown> | null>(() =>
    this.kjTreeShape() ?? this._nodeShape(),
  );

  /**
   * @internal Tree shape built from the `kjNodes` data structure. Walks
   * each branch once to populate parent / children / leaf maps keyed by
   * `node.value`.
   */
  private readonly _nodeShape = computed<KjTreeShape<unknown> | null>(() => {
    const roots = this.kjNodes();
    if (roots.length === 0) return null;
    const parentOf = new Map<unknown, unknown | null>();
    const childrenOf = new Map<unknown, unknown[]>();
    const walk = (node: KjTreeNode, parent: unknown | null): void => {
      parentOf.set(node.value, parent);
      const kids = node.children ?? [];
      childrenOf.set(node.value, kids.map(c => c.value));
      for (const c of kids) walk(c, node.value);
    };
    for (const r of roots) walk(r, null);
    return {
      getParent:  (n) => parentOf.get(n) ?? null,
      getChildren:(n) => childrenOf.get(n) ?? [],
      isLeaf:     (n) => (childrenOf.get(n)?.length ?? 0) === 0,
    };
  });

  /**
   * Hook called by `KjListItem` after it toggles the shared selection
   * model. Re-emits the public `kjNodeSelect` output so consumers see
   * the same notification they saw before the migration (the legacy
   * per-node `handleClick` emitted it; activation now happens inside
   * `KjListItem._activate`, so the root is the only place left to
   * forward it). In single mode (the only mode that returns
   * `closeRequested: true`) we then close the overlay; multi keeps the
   * panel open.
   */
  afterSelect(value: unknown, closeRequested: boolean): void {
    if (value !== undefined) this.kjNodeSelect.emit(value);
    if (closeRequested) this.controller.close('programmatic');
  }

  // ── KjTreeSelectContext implementation ──────────────────────────────

  readonly selectionMode = computed(() => this.kjSelectionMode());
  readonly expandedIds = computed(() =>
    new Set(this._expandedIds()) as ReadonlySet<string>,
  );
  readonly expandedValues = computed(() =>
    new Set(this._expandedValues()) as ReadonlySet<unknown>,
  );
  readonly nodes = computed(() => this.kjNodes());

  /** Directly-injected selection model; wired via `bind()` below. */
  private readonly _selection = inject(KjSelectionModel);

  constructor() {
    this._selection.bind({
      value:     this.value,
      items:     this.items,
      mode:      this.mode,
      compareBy: this.compareBy,
      treeShape: this.treeShape,
    });

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

  // ── Expansion ops ────────────────────────────────────────────────────

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
}
