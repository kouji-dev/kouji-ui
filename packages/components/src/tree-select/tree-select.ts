import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  KjTreeSelect,
  KjTreeSelectContent,
  KjTreeSelectNode,
  KjTreeSelectToggle,
  KjTreeSelectTrigger,
  type KjListItem,
  type KjTreeNode,
} from '@kouji-ui/core';

// ── Flat-tree projection ──────────────────────────────────────────────────────

/**
 * Internal flat row produced by walking the tree. The wrapper renders a flat
 * list rather than nested DOM to avoid recursive component issues; indentation
 * is applied via `padding-inline-start`.
 */
interface FlatNode {
  node: KjTreeNode;
  level: number;
  size: number;
  pos: number;
  hasChildren: boolean;
  /**
   * Path of ancestor values, root first. Built once per `kjNodes` change and
   * shared by every sibling at the same depth, so the visibility pass reads
   * it instead of re-walking the tree per row.
   */
  ancestorValues: readonly unknown[];
}

/**
 * Walk the tree into a flat array in tree order. Every node is emitted;
 * {@link KjTreeSelectComponent.visibleRows} narrows the list to the rows
 * whose ancestors are all expanded, and only those are rendered.
 */
function flattenTree(
  nodes: readonly KjTreeNode[],
  level = 1,
  ancestors: readonly unknown[] = [],
): FlatNode[] {
  const result: FlatNode[] = [];
  const size = nodes.length;
  nodes.forEach((node, i) => {
    const hasChildren = !!(node.children && node.children.length > 0);
    result.push({
      node,
      level,
      size,
      pos: i + 1,
      hasChildren,
      ancestorValues: ancestors,
    });
    if (hasChildren && node.children) {
      result.push(
        ...flattenTree(node.children as readonly KjTreeNode[], level + 1, [...ancestors, node.value]),
      );
    }
  });
  return result;
}

/**
 * Single styled tree node row for `<kj-tree-select>`. Renders an optional
 * expand/collapse toggle, a checkbox in multi mode, indentation based on
 * nesting level, and the node label.
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name tree-select
 */
@Component({
  selector: 'kj-tree-select-node',
  standalone: true,
  imports: [KjTreeSelectNode, KjTreeSelectToggle],
  template: `
    <div
      kjTreeSelectNode
      [kjValue]="value()"
      [kjLabel]="label()"
      [kjNodeLevel]="level()"
      [kjNodeSize]="size()"
      [kjNodePos]="pos()"
      [kjDisabled]="disabled()"
      [kjHasChildren]="hasChildren()"
      class="kj-tree-select-node"
      [style.padding-inline-start.rem]="(level() - 1) * 1.25 + 0.75"
    >
      @if (hasChildren()) {
        <button
          type="button"
          kjTreeSelectToggle
          class="kj-tree-select-toggle"
          aria-hidden="true"
          tabindex="-1"
        >
          <span class="kj-tree-select-toggle-icon"></span>
        </button>
      } @else {
        <span class="kj-tree-select-indent" aria-hidden="true"></span>
      }
      @if (multiMode()) {
        <span class="kj-tree-select-checkbox" aria-hidden="true"></span>
      }
      <span class="kj-tree-select-label"><ng-content /></span>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
  // `display: contents` lives in the stylesheet, not inline: an inline
  // `display` would beat the `[hidden]` rule that hides collapsed rows.
  host: { 'class': 'kj-tree-select-row' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTreeSelectNodeComponent {
  /**
   * The row's `KjTreeSelectNode`, which carries the `KjListItem` the tree
   * navigates. It lives in THIS component's view, where neither the root's
   * content query nor the wrapper's view query can reach it, so the row
   * registers itself with the wrapper instead.
   */
  private readonly node = viewChild(KjTreeSelectNode);
  private readonly root = inject<KjTreeSelectComponent | null>(
    forwardRef(() => KjTreeSelectComponent),
    { optional: true },
  );

  constructor() {
    let registeredKey: unknown;
    let registered = false;
    effect(() => {
      const node = this.node();
      const key = this.value();
      const root = this.root;
      if (!root) return;
      untracked(() => {
        if (registered && registeredKey !== key) root._unregisterRow(registeredKey);
        if (!node) {
          registered = false;
          return;
        }
        root._registerRow(key, node.item);
        registeredKey = key;
        registered = true;
      });
    });
    inject(DestroyRef).onDestroy(() => {
      if (registered) this.root?._unregisterRow(registeredKey);
    });
  }

  /** The value this node represents. */
  readonly value = input.required<unknown>();
  /** Display label for type-ahead. */
  readonly label = input<string>('');
  /** Nesting depth (1-based). */
  readonly level = input<number>(1);
  /** Number of siblings at this level. */
  readonly size = input<number>(1);
  /** 1-based position among siblings. */
  readonly pos = input<number>(1);
  /** Whether the node is disabled. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Whether the node has children (branch). */
  readonly hasChildren = input(false, { transform: booleanAttribute });
  /** Whether the tree is in multi-select mode (renders a checkbox). */
  readonly multiMode = input(false, { transform: booleanAttribute });
}

/**
 * Styled wrapper around the headless `KjTreeSelect` directive family.
 *
 * Renders the trigger button showing the selected value label (single mode)
 * or a count of selected items (multiple mode), and a dropdown tree panel
 * containing all nodes. Tree data is passed via `[kjNodes]`.
 *
 * The component projects the recursive tree into a flat rendered list, using
 * CSS indentation (`padding-inline-start`) for visual hierarchy — avoiding
 * recursive component issues while remaining fully accessible via ARIA
 * `aria-level`, `aria-setsize`, and `aria-posinset` attributes.
 *
 * Only the rows whose ancestors are all expanded are rendered; collapsing a
 * branch removes its descendants from the DOM, so a large tree mounts one row
 * per visible node rather than one per node.
 *
 * @example
 * ```html
 * <kj-tree-select [kjNodes]="categories" [(kjValue)]="selected" />
 * ```
 *
 * @doc-example Default
 *   The default playground — single-select tree with collapsed branches.
 *   @doc-file tree-select.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common tree-select usages — single-select with a
 *   readout, multi-select with a count, and pre-expanded branches on mount.
 *   @doc-file tree-select.usage.example.ts
 * @doc-example Multi-select
 *   `kjSelectionMode="multiple"` renders a checkbox per row and emits an array.
 *   @doc-file tree-select.multi.example.ts
 * @doc-example Pre-expanded
 *   `[(kjExpandedKeys)]` seeds the open branches on mount.
 *   @doc-file tree-select.expanded.example.ts
 * @doc-example In a field
 *   Compose under `<kj-field>` for label / error / hint association.
 *   @doc-file tree-select.field.example.ts
 * @doc-example Disabled
 *   `[disabled]="true"` removes the trigger from the tab order.
 *   @doc-file tree-select.disabled.example.ts
 *
 * @doc-keyboard
 *   Enter|Space  — Opens the panel from the trigger; selects the focused node when open
 *   ArrowDown    — Moves focus to the next visible node
 *   ArrowUp      — Moves focus to the previous visible node
 *   ArrowRight   — Expands the focused branch (or moves into its children)
 *   ArrowLeft    — Collapses the focused branch (or moves to its parent)
 *   Home|End     — Jumps to the first/last visible node
 *   Escape       — Closes the panel and returns focus to the trigger
 *   Type-ahead   — Letters/digits jump to the next matching visible label
 *
 * @doc-aria
 *   role="combobox"   — applied to the trigger button
 *   role="tree"       — applied to the panel content
 *   role="treeitem"   — applied to each rendered node
 *   aria-level / setsize / posinset — wired per node for AT tree semantics
 *   aria-expanded     — set on branch nodes; mirrors expansion state
 *   aria-selected     — set on selected nodes
 *   aria-multiselectable — set on the tree when in multi mode
 *   data-multi        — Mirrors multi-mode on the host for CSS hooks
 *
 * @doc-touch
 *   Trigger and rows default to a 40px hit area at `md` density. For touch-first
 *   surfaces, bump the parent's density token to reach the WCAG 2.5.5 floor.
 *
 * @doc-a11y
 *   Implements the WAI-ARIA Tree APG pattern. Only the rows whose ancestors are
 *   all expanded are rendered — a collapsed branch's descendants leave the DOM
 *   rather than lingering behind `[hidden]`, which is what the pattern asks for
 *   (a collapsed subtree is not in the accessibility tree) and what keeps a
 *   large tree from mounting every node on open. `aria-level` /
 *   `aria-posinset` / `aria-setsize` stay correct because they describe a node's
 *   position among its *siblings*, and siblings are always shown or hidden
 *   together. Focus is restored to the trigger when the panel closes.
 *
 * @doc-related select,cascade-select,combobox
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name tree-select
 * @doc-description Themed dropdown that surfaces a hierarchical tree of options with single or multi-select and arrow-key navigation.
 * @doc-is-main
 */
@Component({
  selector: 'kj-tree-select',
  standalone: true,
  hostDirectives: [
    {
      directive: KjTreeSelect,
      inputs: [
        'kjNodes',
        'kjSelectionMode',
        'kjValue',
        'kjExpandedKeys',
      ],
      outputs: [
        'kjValueChange',
        'kjExpandedKeysChange',
        'kjNodeSelect',
        'kjNodeExpand',
        'kjNodeCollapse',
      ],
    },
  ],
  imports: [KjTreeSelectTrigger, KjTreeSelectContent, KjTreeSelectNodeComponent],
  template: `
    <button
      type="button"
      kjTreeSelectTrigger
      #trig="kjTreeSelectTrigger"
      class="kj-tree-select-trigger"
      [attr.aria-label]="ariaLabel() || null"
      [disabled]="disabled() || null"
    >
      <span class="kj-tree-select-trigger-label">{{ displayLabel() }}</span>
      <span class="kj-tree-select-caret" aria-hidden="true">▾</span>
    </button>
    <kj-tree-select-content [kjFor]="trig" class="kj-tree-select-panel">
      @for (row of visibleRows(); track row.node.value) {
        <kj-tree-select-node
          [value]="row.node.value"
          [label]="row.node.label"
          [level]="row.level"
          [size]="row.size"
          [pos]="row.pos"
          [disabled]="!!row.node.disabled"
          [hasChildren]="row.hasChildren"
          [multiMode]="multiMode()"
        >{{ row.node.label }}</kj-tree-select-node>
      }
      @if (flatNodes().length === 0) {
        <div class="kj-tree-select-empty">No options</div>
      }
    </kj-tree-select-content>
  `,
  styleUrl: './tree-select.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-tree-select',
    '[attr.data-disabled]': "disabled() ? '' : null",
    '[attr.data-multi]': "ts.selectionMode() === 'multiple' ? '' : null",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTreeSelectComponent {
  /** Placeholder text shown when nothing is selected. */
  readonly placeholder = input<string>('Select…');

  /** Whether the trigger is disabled. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Optional resolver for value → display label in the trigger. When omitted
   * the component searches the `kjNodes` tree by value. Falls back to
   * `String(value)` for primitives.
   */
  readonly getLabel = input<(value: unknown) => string | undefined>(
    () => undefined,
  );

  /** Optional ARIA label for the trigger when no visible label exists. */
  readonly ariaLabel = input<string | undefined>(undefined);

  /** @internal — reference to the headless root directive. */
  readonly ts = inject(KjTreeSelect);

  /**
   * @internal — every node in the tree, flattened in tree order. Recomputed
   * only when `kjNodes` changes; expansion never touches it.
   */
  readonly flatNodes = computed<FlatNode[]>(() =>
    flattenTree(this.ts.nodes() as readonly KjTreeNode[]),
  );

  /**
   * @internal — the rows whose ancestors are all expanded: exactly what the
   * template renders.
   *
   * The pass is one walk of {@link flatNodes} per expansion change rather
   * than a method binding re-evaluated per row per render, and it short-
   * circuits on depth: a collapsed branch's whole subtree is skipped by
   * comparing each row's `level` against the depth the walk is hiding
   * below, so no row re-walks its own ancestor chain.
   */
  readonly visibleRows = computed<FlatNode[]>(() => {
    const rows = this.flatNodes();
    const expanded = this.ts.expandedValues();
    const out: FlatNode[] = [];
    // `Infinity` = nothing is being hidden. Otherwise every row deeper than
    // `hiddenBelow` belongs to the collapsed branch and is skipped.
    let hiddenBelow = Number.POSITIVE_INFINITY;
    for (const row of rows) {
      if (row.level > hiddenBelow) continue;
      hiddenBelow = Number.POSITIVE_INFINITY;
      out.push(row);
      if (row.hasChildren && !expanded.has(row.node.value)) hiddenBelow = row.level;
    }
    return out;
  });

  /** @internal — hoisted out of the row loop; one comparison per render, not one per row. */
  readonly multiMode = computed(() => this.ts.selectionMode() === 'multiple');

  /** Rendered rows, keyed by node value. Written by each `<kj-tree-select-node>`. */
  private readonly rowItems = signal<ReadonlyMap<unknown, KjListItem<unknown>>>(new Map());

  /** @internal — a rendered row announces the list item it owns. */
  _registerRow(value: unknown, item: KjListItem<unknown>): void {
    this.rowItems.update(map => {
      if (map.get(value) === item) return map;
      const next = new Map(map);
      next.set(value, item);
      return next;
    });
  }

  /** @internal — a row leaves the DOM (collapsed branch, data change, destroy). */
  _unregisterRow(value: unknown): void {
    this.rowItems.update(map => {
      if (!map.has(value)) return map;
      const next = new Map(map);
      next.delete(value);
      return next;
    });
  }

  /**
   * The rendered rows in tree order. Ordering comes from
   * {@link visibleRows} rather than from a DOM comparison, so it is O(n) and
   * already matches what the user sees.
   */
  private readonly viewItems = computed<readonly KjListItem<unknown>[]>(() => {
    const map = this.rowItems();
    if (map.size === 0) return [];
    const out: KjListItem<unknown>[] = [];
    for (const row of this.visibleRows()) {
      const item = map.get(row.node.value);
      if (item) out.push(item);
    }
    return out;
  });

  constructor() {
    // Content queries stop at a component boundary, so the rows this
    // template paints have to be handed to the headless root explicitly.
    this.ts._setViewItems(this.viewItems);
    inject(DestroyRef).onDestroy(() => this.ts._setViewItems(null));
  }

  /** @internal — display label shown in the trigger button. */
  readonly displayLabel = computed(() => {
    const mode = this.ts.selectionMode();
    const raw = this.ts.value();
    const selected: readonly unknown[] = Array.isArray(raw)
      ? raw
      : raw === null || raw === undefined
        ? []
        : [raw];
    if (selected.length === 0) return this.placeholder();
    if (mode === 'multiple') {
      return `${selected.length} selected`;
    }
    // Single mode: look up label from the flat node list
    const val = selected[0];
    const customLabel = this.getLabel()(val);
    if (customLabel !== undefined) return customLabel;
    const found = this._findLabel(val, this.ts.nodes() as readonly KjTreeNode[]);
    return found ?? String(val);
  });

  private _findLabel(value: unknown, nodes: readonly KjTreeNode[]): string | undefined {
    for (const node of nodes) {
      if (node.value === value) return node.label;
      if (node.children) {
        const found = this._findLabel(value, node.children);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }
}
