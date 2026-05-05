import { Component, signal } from '@angular/core';
import { KjCheckboxComponent } from './checkbox';

@Component({
  selector: 'kj-checkbox-with-label-example',
  standalone: true,
  imports: [KjCheckboxComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    label { display: inline-flex; align-items: center; gap: var(--kj-space-sm); cursor: pointer; }
  `],
  template: `
    <label>
      <kj-checkbox [(checked)]="value" ariaLabel="Newsletter"></kj-checkbox>
      Subscribe to newsletter
    </label>
  `,
})
export class KjCheckboxWithLabelExample { readonly value = signal(false); }
