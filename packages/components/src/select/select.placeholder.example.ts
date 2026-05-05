import { Component, signal } from '@angular/core';
import { KjSelectComponent, KjSelectTriggerComponent, KjSelectContentComponent, KjOptionComponent } from './select';

@Component({
  selector: 'kj-select-placeholder-example',
  standalone: true,
  imports: [KjSelectComponent, KjSelectTriggerComponent, KjSelectContentComponent, KjOptionComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-select [(value)]="status">
      <kj-select-trigger>{{ status() ?? 'Pick a status' }}</kj-select-trigger>
      <kj-select-content>
        <kj-option [value]="'active'">Active</kj-option>
        <kj-option [value]="'inactive'">Inactive</kj-option>
        <kj-option [value]="'pending'">Pending</kj-option>
      </kj-select-content>
    </kj-select>
  `,
})
export class KjSelectPlaceholderExample { readonly status = signal<string | undefined>(undefined); }
