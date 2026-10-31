import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjTree } from './tree-root';
import type { KjTreeItem } from './tree.types';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

const NODES: KjTreeItem[] = [
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

const empty = signal(false);

@Component({
  selector: 'kj-tree-playground',
  standalone: true,
  imports: [KjTree],
  template: `<kj-tree
    ariaLabel="Project files"
    [nodes]="empty() ? [] : nodes"
    [defaultExpanded]="['src']"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTreePlaygroundDemo {
  protected readonly nodes = NODES;
  protected readonly empty = empty;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjTreePlaygroundDemo,
  state: { empty: empty as unknown as ReturnType<typeof signal> },
  controls: [{ kind: 'toggle', name: 'empty', label: 'empty' }],
  snippet: () =>
    `<kj-tree ariaLabel="Project files" [nodes]="nodes" [defaultExpanded]="['src']" />`,
};
