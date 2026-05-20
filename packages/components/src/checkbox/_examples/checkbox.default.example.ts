import { Component, signal } from '@angular/core';
import { KjCheckboxComponent } from '../checkbox';

@Component({
  selector: 'kj-checkbox-default-example',
  standalone: true,
  imports: [KjCheckboxComponent],
  styles: [`:host { display: block; }`],
  template: `<kj-checkbox [(checked)]="value">Accept terms</kj-checkbox>`,
})
export class KjCheckboxDefaultExample { readonly value = signal(false); }
