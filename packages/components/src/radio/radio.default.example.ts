import { Component, signal } from '@angular/core';
import { KjRadioGroupComponent, KjRadioComponent } from './radio';

@Component({
  selector: 'kj-radio-default-example',
  standalone: true,
  imports: [KjRadioGroupComponent, KjRadioComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-radio-group [(value)]="size" ariaLabel="Size">
      <kj-radio [value]="'s'">Small</kj-radio>
      <kj-radio [value]="'m'">Medium</kj-radio>
      <kj-radio [value]="'l'">Large</kj-radio>
    </kj-radio-group>
  `,
})
export class KjRadioDefaultExample { readonly size = signal<'s'|'m'|'l'>('m'); }
