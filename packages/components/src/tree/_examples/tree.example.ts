import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjTree, type KjTreeItem } from '../tree';

@Component({
  selector: 'kj-tree-example',
  standalone: true,
  imports: [KjTree],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <kj-tree
      ariaLabel="Project files"
      [nodes]="nodes"
      [defaultExpanded]="['src']"
      [selected]="selected()"
      (selectionChange)="selected.set($event.id)"
    />
    <p>Selected: {{ selected() ?? 'none' }}</p>
  `,
})
export class KjTreeExample {
  protected readonly selected = signal<string | null>('app');
  protected readonly nodes: KjTreeItem[] = [
    {
      id: 'src',
      label: 'src',
      children: [
        { id: 'app', label: 'app.ts' },
        { id: 'lib', label: 'lib', children: [{ id: 'util', label: 'util.ts' }] },
      ],
    },
    { id: 'readme', label: 'README.md' },
    { id: 'lock', label: 'pnpm-lock.yaml', disabled: true },
  ];
}
