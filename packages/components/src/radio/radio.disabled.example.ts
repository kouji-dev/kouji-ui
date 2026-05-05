import { Component, signal } from '@angular/core';
import { KjRadioGroupComponent, KjRadioComponent } from './radio';

@Component({
  selector: 'kj-radio-disabled-example',
  standalone: true,
  imports: [KjRadioGroupComponent, KjRadioComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    label { display: inline-flex; align-items: center; gap: var(--kj-space-sm); }
  `],
  template: `
    <kj-radio-group [(value)]="choice" ariaLabel="Choice">
      <label><kj-radio [value]="'a'"></kj-radio> Option A</label>
      <label><kj-radio [value]="'b'" [disabled]="true"></kj-radio> Option B (disabled)</label>
      <label><kj-radio [value]="'c'"></kj-radio> Option C</label>
    </kj-radio-group>
  `,
})
export class KjRadioDisabledExample { readonly choice = signal<'a'|'b'|'c'>('a'); }
