import { Component, signal } from '@angular/core';
import { KjTreeSelectComponent } from './tree-select';
import type { KjTreeNode } from '@kouji-ui/core';

/**
 * Default tree select example with categories and subcategories.
 * Click a category to expand it, then click a leaf to select it.
 * The selected label is shown in the trigger button.
 */
@Component({
  selector: 'kj-tree-select-example',
  standalone: true,
  imports: [KjTreeSelectComponent],
  styles: [
    `:host { display: block; }`,
    `p { margin-top: var(--kj-space-md); font: 0.875rem var(--kj-font-sans); color: var(--kj-fg-default); }`,
  ],
  template: `
    <kj-tree-select
      [kjNodes]="categories"
      [(kjValue)]="selected"
      placeholder="Select a topic"
    />
    <p>Selected: {{ selected() ?? 'none' }}</p>
  `,
})
export class KjTreeSelectExample {
  protected readonly selected = signal<string | undefined>(undefined);

  protected readonly categories: KjTreeNode<string>[] = [
    {
      value: 'frontend',
      label: 'Frontend',
      children: [
        { value: 'html', label: 'HTML' },
        { value: 'css', label: 'CSS' },
        { value: 'javascript', label: 'JavaScript' },
      ],
    },
    {
      value: 'backend',
      label: 'Backend',
      children: [
        { value: 'nodejs', label: 'Node.js' },
        { value: 'python', label: 'Python' },
        { value: 'go', label: 'Go' },
      ],
    },
    {
      value: 'devops',
      label: 'DevOps',
      children: [
        { value: 'docker', label: 'Docker' },
        { value: 'kubernetes', label: 'Kubernetes' },
      ],
    },
  ];
}
