import { Component, signal } from '@angular/core';
import { KjFieldComponent, KjFieldHelpComponent, KjFieldLabelComponent } from '../field/field';
import { KjTreeSelectComponent } from './tree-select';
import type { KjTreeNode } from '@kouji-ui/core';

/**
 * Tree select inside a `<kj-field>` wrapper that provides a label and hint
 * text. The field label is associated to the trigger via the standard `kj-field`
 * composition pattern.
 */
@Component({
  selector: 'kj-tree-select-field-example',
  standalone: true,
  imports: [KjFieldComponent, KjFieldLabelComponent, KjFieldHelpComponent, KjTreeSelectComponent],
  styles: [
    `
      :host {
        display: block;
        max-width: 400px;
      }
    `,
    `
      .kj-tree-select {
        width: 100%;
      }
    `,
  ],
  template: `
    <kj-field>
      <kj-field-label>Department</kj-field-label>
      <kj-tree-select
        [kjNodes]="departments"
        [(kjValue)]="selected"
        placeholder="Choose a department"
        style="width: 100%"
      />
      <kj-field-help>Select the department this issue belongs to.</kj-field-help>
    </kj-field>
    @if (selected()) {
      <p style="margin-top: var(--kj-space-md); font: 0.875rem var(--kj-font-sans);">
        Selected: {{ selected() }}
      </p>
    }
  `,
})
export class KjTreeSelectFieldExample {
  protected readonly selected = signal<string | undefined>(undefined);

  protected readonly departments: KjTreeNode<string>[] = [
    {
      value: 'engineering',
      label: 'Engineering',
      children: [
        { value: 'frontend-team', label: 'Frontend' },
        { value: 'backend-team', label: 'Backend' },
        { value: 'platform-team', label: 'Platform' },
      ],
    },
    {
      value: 'product',
      label: 'Product',
      children: [
        { value: 'ux', label: 'UX Design' },
        { value: 'pm', label: 'Product Management' },
      ],
    },
    {
      value: 'operations',
      label: 'Operations',
      children: [
        { value: 'hr', label: 'Human Resources' },
        { value: 'finance', label: 'Finance' },
      ],
    },
  ];
}
