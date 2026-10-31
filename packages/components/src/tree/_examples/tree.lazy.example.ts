import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjTree, KjTreeEmptyTemplate, KjTreeNodeTemplate, type KjTreeItem } from '../tree';

/**
 * Branches start with `children: []` and are filled the first time they
 * open. The row template adds a level hint; the empty template covers a
 * tree with no roots.
 */
@Component({
  selector: 'kj-tree-lazy-example',
  standalone: true,
  imports: [KjTree, KjTreeNodeTemplate, KjTreeEmptyTemplate],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <kj-tree ariaLabel="Regions" [nodes]="nodes()" (expandedChange)="load($event)">
      <ng-template kjTreeNode let-node let-level="level">
        {{ node.label }} <small>· level {{ level }}</small>
      </ng-template>
      <ng-template kjTreeEmpty>No regions.</ng-template>
    </kj-tree>
  `,
})
export class KjTreeLazyExample {
  protected readonly nodes = signal<KjTreeItem[]>([
    { id: 'eu', label: 'Europe', children: [] },
    { id: 'na', label: 'North America', children: [] },
  ]);

  protected load(open: ReadonlySet<string>): void {
    this.nodes.update((roots) =>
      roots.map((root) =>
        open.has(root.id) && root.children?.length === 0
          ? {
              ...root,
              children: [1, 2, 3].map((n) => ({
                id: `${root.id}-${n}`,
                label: `${root.label} ${n}`,
              })),
            }
          : root,
      ),
    );
  }
}
