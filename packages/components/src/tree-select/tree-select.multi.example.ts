import { Component, computed, signal } from '@angular/core';
import { KjTreeSelectComponent } from './tree-select';
import type { KjTreeNode } from '@kouji-ui/core';

/**
 * Multi-select mode example. The panel stays open after each selection so
 * multiple values can be picked. The trigger shows how many items are selected.
 * A checkbox indicator appears on each node row.
 */
@Component({
  selector: 'kj-tree-select-multi-example',
  standalone: true,
  imports: [KjTreeSelectComponent],
  styles: [
    `:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`,
    `p { margin-top: var(--kj-space-md); font: 0.875rem var(--kj-font-sans); color: var(--kj-color-base-content); }`,
  ],
  template: `
    <kj-tree-select
      [kjNodes]="permissions"
      [(kjValue)]="selected"
      kjSelectionMode="multiple"
      placeholder="Select permissions"
    />
    <p>
      Selected ({{ count() }}):
      {{ selected().length ? selected().join(', ') : 'none' }}
    </p>
  `,
})
export class KjTreeSelectMultiExample {
  protected readonly selected = signal<string[]>([]);
  protected readonly count = computed(() => this.selected().length);

  protected readonly permissions: KjTreeNode<string>[] = [
    {
      value: 'users',
      label: 'Users',
      children: [
        { value: 'users:read', label: 'Read users' },
        { value: 'users:write', label: 'Write users' },
        { value: 'users:delete', label: 'Delete users' },
      ],
    },
    {
      value: 'content',
      label: 'Content',
      children: [
        { value: 'content:read', label: 'Read content' },
        { value: 'content:publish', label: 'Publish content' },
      ],
    },
    {
      value: 'settings',
      label: 'Settings',
      children: [
        { value: 'settings:view', label: 'View settings' },
        { value: 'settings:edit', label: 'Edit settings' },
      ],
    },
  ];
}
