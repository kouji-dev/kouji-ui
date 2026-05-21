import { Component, signal } from '@angular/core';
import { KjRadioGroupComponent, KjRadioComponent } from '../radio';

@Component({
  selector: 'kj-radio-group-example',
  standalone: true,
  imports: [KjRadioGroupComponent, KjRadioComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-radio-group [(value)]="plan" ariaLabel="Plan">
      <kj-radio [value]="'free'">Free</kj-radio>
      <kj-radio [value]="'pro'">Pro</kj-radio>
      <kj-radio [value]="'team'">Team</kj-radio>
      <kj-radio [value]="'enterprise'">Enterprise</kj-radio>
    </kj-radio-group>
  `,
})
export class KjRadioGroupExample { readonly plan = signal<'free'|'pro'|'team'|'enterprise'>('pro'); }
