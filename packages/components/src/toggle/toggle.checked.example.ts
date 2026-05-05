import { Component, signal } from '@angular/core';
import { KjToggleComponent } from './toggle';

@Component({
  selector: 'kj-toggle-checked-example',
  standalone: true,
  imports: [KjToggleComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `<kj-toggle [(pressed)]="active" ariaLabel="Active">Active</kj-toggle>`,
})
export class KjToggleCheckedExample { readonly active = signal(true); }
