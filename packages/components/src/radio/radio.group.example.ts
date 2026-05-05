import { Component, signal } from '@angular/core';
import { KjRadioGroupComponent, KjRadioComponent } from './radio';

@Component({
  selector: 'kj-radio-group-example',
  standalone: true,
  imports: [KjRadioGroupComponent, KjRadioComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    label { display: inline-flex; align-items: center; gap: var(--kj-space-sm); }
  `],
  template: `
    <kj-radio-group [(value)]="plan" ariaLabel="Plan">
      <label><kj-radio [value]="'free'"></kj-radio> Free</label>
      <label><kj-radio [value]="'pro'"></kj-radio> Pro</label>
      <label><kj-radio [value]="'team'"></kj-radio> Team</label>
      <label><kj-radio [value]="'enterprise'"></kj-radio> Enterprise</label>
    </kj-radio-group>
  `,
})
export class KjRadioGroupExample { readonly plan = signal<'free'|'pro'|'team'|'enterprise'>('pro'); }
