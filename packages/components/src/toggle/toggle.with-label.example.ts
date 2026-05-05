import { Component, signal } from '@angular/core';
import { KjToggleComponent } from './toggle';

@Component({
  selector: 'kj-toggle-with-label-example',
  standalone: true,
  imports: [KjToggleComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    label { display: inline-flex; align-items: center; gap: var(--kj-space-sm); cursor: pointer; }
  `],
  template: `
    <label>
      <kj-toggle [(pressed)]="dark" ariaLabel="Dark mode"></kj-toggle>
      Dark mode
    </label>
  `,
})
export class KjToggleWithLabelExample { readonly dark = signal(false); }
