import { Component, signal } from '@angular/core';
import { KjRadioGroupComponent, KjRadioComponent } from './radio';

@Component({
  selector: 'kj-radio-disabled-example',
  standalone: true,
  imports: [KjRadioGroupComponent, KjRadioComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-radio-group [(value)]="choice" ariaLabel="Choice">
      <kj-radio [value]="'a'">Option A</kj-radio>
      <kj-radio [value]="'b'" [disabled]="true">Option B (disabled)</kj-radio>
      <kj-radio [value]="'c'">Option C</kj-radio>
    </kj-radio-group>
  `,
})
export class KjRadioDisabledExample { readonly choice = signal<'a'|'b'|'c'>('a'); }
