import { Component, signal } from '@angular/core';
import { KjTreeSelectComponent } from './tree-select';
import type { KjTreeNode } from '@kouji-ui/core';

/**
 * Pre-expanded tree select. The `kjExpandedKeys` input controls which branches
 * are initially expanded when the panel opens. Here "Animals" and "Plants" start
 * open so their children are immediately visible.
 */
@Component({
  selector: 'kj-tree-select-expanded-example',
  standalone: true,
  imports: [KjTreeSelectComponent],
  styles: [
    `:host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }`,
    `p { margin-top: var(--kj-space-md); font: 0.875rem var(--kj-font-sans); color: var(--kj-fg-default); }`,
  ],
  template: `
    <kj-tree-select
      [kjNodes]="organisms"
      [(kjValue)]="selected"
      [kjExpandedKeys]="expandedKeys()"
      placeholder="Choose an organism"
    />
    <p>Selected: {{ selected() ?? 'none' }}</p>
  `,
})
export class KjTreeSelectExpandedExample {
  protected readonly selected = signal<string | undefined>(undefined);
  /** Pre-expand "Animals" and "Plants" branches on load. */
  protected readonly expandedKeys = signal<string[]>(['animals', 'plants']);

  protected readonly organisms: KjTreeNode<string>[] = [
    {
      value: 'animals',
      label: 'Animals',
      children: [
        { value: 'cat', label: 'Cat' },
        { value: 'dog', label: 'Dog' },
        { value: 'parrot', label: 'Parrot' },
      ],
    },
    {
      value: 'plants',
      label: 'Plants',
      children: [
        { value: 'oak', label: 'Oak' },
        { value: 'rose', label: 'Rose' },
        { value: 'cactus', label: 'Cactus' },
      ],
    },
    {
      value: 'fungi',
      label: 'Fungi',
      children: [
        { value: 'mushroom', label: 'Mushroom' },
        { value: 'truffle', label: 'Truffle' },
      ],
    },
  ];
}
