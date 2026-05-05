import { Component, signal } from '@angular/core';
import { KjRadioGroupComponent, KjRadioComponent } from './radio';

@Component({
  selector: 'kj-radio-default-example',
  standalone: true,
  imports: [KjRadioGroupComponent, KjRadioComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    label { display: inline-flex; align-items: center; gap: var(--kj-space-sm); }
  `],
  template: `
    <kj-radio-group [(value)]="size" ariaLabel="Size">
      <label><kj-radio [value]="'s'"></kj-radio> Small</label>
      <label><kj-radio [value]="'m'"></kj-radio> Medium</label>
      <label><kj-radio [value]="'l'"></kj-radio> Large</label>
    </kj-radio-group>
  `,
})
export class KjRadioDefaultExample { readonly size = signal<'s'|'m'|'l'>('m'); }
