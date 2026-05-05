import { Component, signal } from '@angular/core';
import { KjRadioGroupComponent, KjRadioComponent } from './radio';

@Component({
  selector: 'kj-radio-inline-example',
  standalone: true,
  imports: [KjRadioGroupComponent, KjRadioComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    label { display: inline-flex; align-items: center; gap: var(--kj-space-sm); }
  `],
  template: `
    <kj-radio-group [(value)]="vote" orientation="horizontal" ariaLabel="Vote">
      <label><kj-radio [value]="'yes'"></kj-radio> Yes</label>
      <label><kj-radio [value]="'no'"></kj-radio> No</label>
      <label><kj-radio [value]="'abstain'"></kj-radio> Abstain</label>
    </kj-radio-group>
  `,
})
export class KjRadioInlineExample { readonly vote = signal<'yes'|'no'|'abstain'>('yes'); }
