import { Component, signal } from '@angular/core';
import { KjCheckboxComponent } from './checkbox';

@Component({
  selector: 'kj-checkbox-indeterminate-example',
  standalone: true,
  imports: [KjCheckboxComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }`],
  template: `<kj-checkbox [(checked)]="value" [indeterminate]="true">Mixed selection</kj-checkbox>`,
})
export class KjCheckboxIndeterminateExample { readonly value = signal(false); }
