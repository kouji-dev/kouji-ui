import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  contentChild,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { KjTreeEmptyTemplate } from './tree-empty-template';
import { KjTreeNodeTemplate } from './tree-node-template';
import type { KjTreeItem, KjTreeNodeContext } from './tree.types';

/** A node as currently shown: expanded ancestors only, in document order. */
interface VisibleNode {
  readonly node: KjTreeItem;
  readonly level: number;
  readonly parent: string | null;
}

function flatten(
  nodes: readonly KjTreeItem[],
  open: ReadonlySet<string>,
  level: number,
  parent: string | null,
  out: VisibleNode[],
): VisibleNode[] {
  for (const node of nodes) {
    out.push({ node, level, parent });
    if (node.children && open.has(node.id)) flatten(node.children, open, level + 1, node.id, out);
  }
  return out;
}

/**
 * Hierarchical list following the WAI-ARIA tree pattern: one Tab stop, arrow
 * keys to move, open and close, single selection.
 *
 * Expansion is uncontrolled by default (`defaultExpanded`); bind `expanded`
 * to own it, and feed `(expandedChange)` back. Children render only while
 * their parent is open, and nodes are read in place, so a lazy branch is a
 * node with `children: []` filled in on `(expandedChange)`.
 *
 * @doc-example Default
 *   A file tree with one folder open and a selection.
 *   @doc-file tree.example.ts
 * @doc-example Custom rows and lazy children
 *   `kjTreeNode` for row content, `kjTreeEmpty` for an empty tree, and
 *   children loaded when a branch first opens.
 *   @doc-file tree.lazy.example.ts
 *
 * @doc-aria
 *   role="tree"       — On the inner list; named by `ariaLabel` / `ariaLabelledby`
 *   role="treeitem"   — Each node; one is tabbable (roving tabindex)
 *   role="group"      — Wraps an open branch's children
 *   aria-expanded     — On branches only
 *   aria-selected     — On every node; `true` on the selected one
 *   aria-level        — 1-based depth
 *   aria-disabled     — On disabled nodes (still focusable, not selectable)
 *
 * @doc-keyboard
 *   ArrowDown / ArrowUp — Next / previous visible node
 *   ArrowRight          — Open a closed branch; on an open one, move to its first child
 *   ArrowLeft           — Close an open branch; otherwise move to the parent
 *   Home / End          — First / last visible node
 *   Enter / Space       — Select and activate the node
 *   Printable character — Move to the next visible node whose label starts with it
 *
 * @doc-a11y
 *   Always give the tree a name (`ariaLabel` or `ariaLabelledby`). Arrow keys
 *   are physical: ArrowRight opens in RTL too.
 *
 * @doc-css-var
 *   --kj-tree-indent     — Indent per level. Default 1rem.
 *   --kj-tree-row-height — Minimum row height. Default 2rem.
 *   --kj-tree-selected-bg — Fill of the selected row.
 *
 * @doc-related tree-select,list,accordion
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name tree
 * @doc-description Hierarchical, keyboard-navigable tree with single selection, lazy branches and a row template.
 * @doc-is-main
 */
@Component({
  selector: 'kj-tree',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    @if (nodes().length) {
      <ul
        class="kj-tree"
        role="tree"
        [attr.aria-label]="ariaLabel() || null"
        [attr.aria-labelledby]="ariaLabelledby() || null"
      >
        <ng-container *ngTemplateOutlet="branch; context: { $implicit: nodes(), level: 1 }" />
      </ul>
    } @else if (emptyTemplate(); as empty) {
      <div class="kj-tree-empty"><ng-container [ngTemplateOutlet]="empty.template" /></div>
    }

    <ng-template #branch let-items let-level="level">
      @for (node of items; track node.id) {
        <li
          role="treeitem"
          class="kj-tree-item"
          [attr.data-kj-tree-id]="node.id"
          [attr.aria-level]="level"
          [attr.aria-expanded]="node.children ? open().has(node.id) : null"
          [attr.aria-selected]="selectedId() === node.id"
          [attr.aria-disabled]="node.disabled || null"
          [attr.tabindex]="tabbableId() === node.id ? 0 : -1"
          (focus)="activeId.set(node.id)"
        >
          <div class="kj-tree-row" [style.--kj-tree-level]="level - 1">
            <span class="kj-tree-twisty" aria-hidden="true">{{ node.children ? '▸' : '' }}</span>
            <span class="kj-tree-label">
              @if (nodeTemplate(); as custom) {
                <ng-container
                  *ngTemplateOutlet="custom.template; context: contextOf(node, level)"
                />
              } @else {
                {{ node.label }}
              }
            </span>
          </div>
          @if (node.children && open().has(node.id)) {
            <ul role="group" class="kj-tree-group">
              <ng-container
                *ngTemplateOutlet="branch; context: { $implicit: node.children, level: level + 1 }"
              />
            </ul>
          }
        </li>
      }
    </ng-template>
  `,
  styleUrl: './tree.css',
  encapsulation: ViewEncapsulation.None,
  // Delegated on the host: one listener for the whole tree, and the rows are
  // not separate tab stops (keyboard lives on the focused treeitem).
  host: {
    class: 'kj-tree-host',
    '(keydown)': 'onKeydown($event)',
    '(click)': 'onClick($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTree {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Root nodes. Read in place, never cloned. */
  readonly nodes = input<readonly KjTreeItem[]>([]);
  /** Controlled set of open branch ids. Leave unset to let the tree own expansion. */
  readonly expanded = input<ReadonlySet<string> | undefined>(undefined);
  /** Ids open on first render when `expanded` is not bound. */
  readonly defaultExpanded = input<readonly string[]>([]);
  /** Id of the selected node. The tree updates it itself on select; bind it to set or reset it. */
  readonly selected = input<string | null>(null);
  /** Accessible name of the tree. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Id of an element naming the tree. */
  readonly ariaLabelledby = input<string | undefined>(undefined);

  /** The next set of open ids, after a branch opens or closes. Emitted in both modes. */
  readonly expandedChange = output<ReadonlySet<string>>();
  /** A different node became selected. */
  readonly selectionChange = output<KjTreeItem>();
  /** A node was activated: click, Enter or Space. Fires even when it was already selected. */
  readonly activate = output<KjTreeItem>();

  protected readonly nodeTemplate = contentChild(KjTreeNodeTemplate);
  protected readonly emptyTemplate = contentChild(KjTreeEmptyTemplate);

  private readonly ownOpen = linkedSignal(() => new Set(this.defaultExpanded()));
  protected readonly open = computed<ReadonlySet<string>>(() => this.expanded() ?? this.ownOpen());
  protected readonly selectedId = linkedSignal(() => this.selected());
  protected readonly activeId = linkedSignal<string | null>(() => null);

  private readonly visible = computed(() => flatten(this.nodes(), this.open(), 1, null, []));

  /** The one node in the Tab order: the focused one, else the selected one, else the first. */
  protected readonly tabbableId = computed(() => {
    const visible = this.visible();
    const shown = (id: string | null) => id !== null && visible.some((v) => v.node.id === id);
    const active = this.activeId();
    if (shown(active)) return active;
    const selected = this.selectedId();
    if (shown(selected)) return selected;
    return visible[0]?.node.id ?? null;
  });

  protected contextOf(node: KjTreeItem, level: number): KjTreeNodeContext {
    return {
      $implicit: node,
      level,
      expanded: !!node.children && this.open().has(node.id),
      selected: this.selectedId() === node.id,
    };
  }

  protected onClick(event: MouseEvent): void {
    const id = (event.target as Element).closest('.kj-tree-row')?.parentElement?.dataset[
      'kjTreeId'
    ];
    const node = this.visible().find((v) => v.node.id === id)?.node;
    if (!node) return;
    this.activeId.set(node.id);
    if (node.children) this.toggle(node);
    this.choose(node);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const visible = this.visible();
    const index = visible.findIndex((v) => v.node.id === this.tabbableId());
    if (index < 0) return;
    const current = visible[index];
    const { node } = current;
    const isOpen = !!node.children && this.open().has(node.id);

    switch (event.key) {
      case 'ArrowDown':
        this.focus(visible[index + 1]);
        break;
      case 'ArrowUp':
        this.focus(visible[index - 1]);
        break;
      case 'Home':
        this.focus(visible[0]);
        break;
      case 'End':
        this.focus(visible[visible.length - 1]);
        break;
      case 'ArrowRight':
        if (!node.children) break;
        if (!isOpen) this.toggle(node);
        else if (visible[index + 1]?.parent === node.id) this.focus(visible[index + 1]);
        break;
      case 'ArrowLeft':
        if (isOpen) this.toggle(node);
        else this.focus(visible.find((v) => v.node.id === current.parent));
        break;
      case 'Enter':
      case ' ':
        this.choose(node);
        break;
      default: {
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
        const key = event.key.toLowerCase();
        for (let step = 1; step <= visible.length; step++) {
          const candidate = visible[(index + step) % visible.length];
          if (candidate.node.label.toLowerCase().startsWith(key)) {
            this.focus(candidate);
            break;
          }
        }
      }
    }
    event.preventDefault();
  }

  private toggle(node: KjTreeItem): void {
    const next = new Set(this.open());
    if (!next.delete(node.id)) next.add(node.id);
    if (this.expanded() === undefined) this.ownOpen.set(next);
    this.expandedChange.emit(next);
  }

  private choose(node: KjTreeItem): void {
    if (node.disabled) return;
    if (this.selectedId() !== node.id) {
      this.selectedId.set(node.id);
      this.selectionChange.emit(node);
    }
    this.activate.emit(node);
  }

  private focus(target: VisibleNode | undefined): void {
    if (!target) return;
    this.activeId.set(target.node.id);
    const items = this.host.nativeElement.querySelectorAll<HTMLElement>('[role="treeitem"]');
    for (const item of Array.from(items)) {
      if (item.dataset['kjTreeId'] === target.node.id) {
        item.focus();
        return;
      }
    }
  }
}
