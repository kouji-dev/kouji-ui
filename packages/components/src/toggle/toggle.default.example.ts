import { Component, signal } from '@angular/core';
import { KjToggleComponent } from './toggle';

@Component({
  selector: 'kj-toggle-default-example',
  standalone: true,
  imports: [KjToggleComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `<kj-toggle [(pressed)]="bold" ariaLabel="Bold">B</kj-toggle>`,
})
export class KjToggleDefaultExample { readonly bold = signal(false); }
