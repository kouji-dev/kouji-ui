import { Component, signal } from '@angular/core';
import { KjToggleComponent } from '../toggle';

@Component({
  selector: 'kj-toggle-checked-example',
  standalone: true,
  imports: [KjToggleComponent],
  styles: [`:host { display: block; }`],
  template: `<kj-toggle [(pressed)]="active" ariaLabel="Active">Active</kj-toggle>`,
})
export class KjToggleCheckedExample { readonly active = signal(true); }
