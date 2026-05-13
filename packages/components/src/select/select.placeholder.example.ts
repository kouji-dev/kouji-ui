import { Component, signal } from '@angular/core';
import { KjSelectComponent, KjOptionComponent } from './select';

@Component({
  selector: 'kj-select-placeholder-example',
  standalone: true,
  imports: [KjSelectComponent, KjOptionComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }`],
  template: `
    <kj-select [(value)]="status" placeholder="Pick a status">
      <kj-option [value]="'active'">Active</kj-option>
      <kj-option [value]="'inactive'">Inactive</kj-option>
      <kj-option [value]="'pending'">Pending</kj-option>
    </kj-select>
  `,
})
export class KjSelectPlaceholderExample { readonly status = signal<string | undefined>(undefined); }
