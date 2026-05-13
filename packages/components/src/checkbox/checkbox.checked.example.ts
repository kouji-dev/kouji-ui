import { Component, signal } from '@angular/core';
import { KjCheckboxComponent } from './checkbox';

@Component({
  selector: 'kj-checkbox-checked-example',
  standalone: true,
  imports: [KjCheckboxComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }`],
  template: `<kj-checkbox [(checked)]="value">Subscribed</kj-checkbox>`,
})
export class KjCheckboxCheckedExample { readonly value = signal(true); }
