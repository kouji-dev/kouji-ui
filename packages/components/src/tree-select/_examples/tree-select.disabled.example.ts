import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjTreeSelectComponent } from '../tree-select';
import type { KjTreeNode } from '@kouji-ui/core';

/**
 * Disabled state examples for tree select. The first select is entirely
 * disabled (the trigger cannot be activated). The second select has individual
 * nodes disabled — the "Legacy API" branch is disabled and cannot be selected.
 */
@Component({
  selector: 'kj-tree-select-disabled-example',
  standalone: true,
  imports: [KjTreeSelectComponent],
  styles: [
    `
      :host {
        display: block;
        display: flex;
        flex-direction: column;
        gap: var(--kj-space-lg);
      }
    `,
    `
      label {
        font: 0.75rem var(--kj-font-sans);
        color: var(--kj-fg-default);
        opacity: 0.7;
        margin-bottom: var(--kj-space-xs);
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div>
      <label for="tree-select-disabled-all">Entirely disabled</label>
      <kj-tree-select
        id="tree-select-disabled-all"
        [kjNodes]="categories"
        [(kjValue)]="selected1"
        disabled
        placeholder="Disabled select"
      />
    </div>
    <div>
      <label for="tree-select-disabled-node">Individual node disabled</label>
      <kj-tree-select
        id="tree-select-disabled-node"
        [kjNodes]="categoriesWithDisabled"
        [(kjValue)]="selected2"
        placeholder="Some nodes disabled"
      />
    </div>
  `,
})
export class KjTreeSelectDisabledExample {
  protected readonly selected1 = signal<string | undefined>(undefined);
  protected readonly selected2 = signal<string | undefined>(undefined);

  protected readonly categories: KjTreeNode<string>[] = [
    {
      value: 'api',
      label: 'API',
      children: [
        { value: 'rest', label: 'REST' },
        { value: 'graphql', label: 'GraphQL' },
      ],
    },
    {
      value: 'sdk',
      label: 'SDK',
      children: [
        { value: 'js-sdk', label: 'JavaScript' },
        { value: 'python-sdk', label: 'Python' },
      ],
    },
  ];

  protected readonly categoriesWithDisabled: KjTreeNode<string>[] = [
    {
      value: 'api-v2',
      label: 'API v2',
      children: [
        { value: 'rest-v2', label: 'REST' },
        { value: 'graphql-v2', label: 'GraphQL' },
      ],
    },
    {
      value: 'api-legacy',
      label: 'Legacy API',
      disabled: true,
      children: [
        { value: 'rest-v1', label: 'REST v1', disabled: true },
        { value: 'soap', label: 'SOAP', disabled: true },
      ],
    },
    {
      value: 'sdk-v2',
      label: 'SDK v2',
      children: [
        { value: 'js-sdk-v2', label: 'JavaScript' },
        { value: 'python-sdk-v2', label: 'Python', disabled: true },
      ],
    },
  ];
}
