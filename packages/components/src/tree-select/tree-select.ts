import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import {
  KjTreeSelect,
  KjTreeSelectNode,
  KjTreeSelectPanel,
  KjTreeSelectToggle,
  KjTreeSelectTrigger,
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
  /** Path of ancestor values — used to determine visibility when ancestors collapse. */
  ancestorValues: readonly unknown[];
}

/** Walk the tree into a flat array. All nodes are included; visibility is
 * determined at render time by checking ancestor expansion state. */
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
 * @category Library/Data input
 * @doc
 * @doc-name tree-select
 * @doc-description The pre-styled kouji tree-select node row. Renders one item in the `<kj-tree-select>` flat-projected tree list, including the expand/collapse toggle, optional multi-select checkbox, and indentation based on nesting level.
 * @doc-is-main
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
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTreeSelectNodeComponent {
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
 * Collapsed branches' children are hidden via `display:none`; all nodes
 * remain in the DOM to preserve ARIA tree structure.
 *
 * @example
 * ```html
 * <kj-tree-select [kjNodes]="categories" [(kjValue)]="selected" />
 * ```
 *
 * @doc-example Default
 *   @doc-file tree-select.example.ts
 * @doc-example Multi-select
 *   @doc-file tree-select.multi.example.ts
 * @doc-example Pre-expanded
 *   @doc-file tree-select.expanded.example.ts
 * @doc-example In a field
 *   @doc-file tree-select.field.example.ts
 * @doc-example Disabled
 *   @doc-file tree-select.disabled.example.ts
 * @category Library/Data input
 * @doc
 * @doc-name tree-select
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
  imports: [KjTreeSelectTrigger, KjTreeSelectPanel, KjTreeSelectNodeComponent],
  template: `
    <button
      type="button"
      kjTreeSelectTrigger
      class="kj-tree-select-trigger"
      [attr.aria-label]="ariaLabel() || null"
      [disabled]="disabled() || null"
    >
      <span class="kj-tree-select-trigger-label">{{ displayLabel() }}</span>
      <span class="kj-tree-select-caret" aria-hidden="true">▾</span>
    </button>
    <div kjTreeSelectPanel class="kj-tree-select-panel">
      @for (row of flatNodes(); track row.node.value) {
        <kj-tree-select-node
          [value]="row.node.value"
          [label]="row.node.label"
          [level]="row.level"
          [size]="row.size"
          [pos]="row.pos"
          [disabled]="!!row.node.disabled"
          [hasChildren]="row.hasChildren"
          [multiMode]="ts.selectionMode() === 'multiple'"
          [hidden]="isRowHidden(row)"
        >{{ row.node.label }}</kj-tree-select-node>
      }
      @if (flatNodes().length === 0) {
        <div class="kj-tree-select-empty">No options</div>
      }
    </div>
  `,
  styleUrl: './tree-select.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-tree-select',
    '[attr.data-disabled]': "disabled() ? '' : null",
    '[attr.data-open]': "ts.open() ? '' : null",
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
   * @internal — flat projected list of all tree nodes for rendering.
   * Children of collapsed branches are still in the list but have `[hidden]`
   * applied to keep them out of the visual and tab order.
   */
  readonly flatNodes = computed<FlatNode[]>(() =>
    flattenTree(this.ts.nodes() as readonly KjTreeNode[]),
  );

  /**
   * @internal — whether a row's ancestors include any collapsed branch, making
   * this row invisible. Reads `expandedValues` signal so Angular tracks it.
   */
  isRowHidden(row: FlatNode): boolean {
    if (row.ancestorValues.length === 0) return false;
    const expanded = this.ts.expandedValues();
    // If any ancestor value is NOT expanded, the row is hidden
    for (const ancestorValue of row.ancestorValues) {
      if (!expanded.has(ancestorValue)) return true;
    }
    return false;
  }

  /** @internal — display label shown in the trigger button. */
  readonly displayLabel = computed(() => {
    const mode = this.ts.selectionMode();
    const selected = this.ts.selectedValues();
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
