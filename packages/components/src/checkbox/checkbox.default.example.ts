import { Component, signal } from '@angular/core';
import { KjCheckboxComponent } from './checkbox';

@Component({
  selector: 'kj-checkbox-default-example',
  standalone: true,
  imports: [KjCheckboxComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `<kj-checkbox [(checked)]="value">Accept terms</kj-checkbox>`,
})
export class KjCheckboxDefaultExample { readonly value = signal(false); }
