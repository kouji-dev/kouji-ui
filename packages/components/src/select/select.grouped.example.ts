import { Component, signal } from '@angular/core';
import { KjSelectComponent, KjOptionComponent } from './select';

@Component({
  selector: 'kj-select-grouped-example',
  standalone: true,
  imports: [KjSelectComponent, KjOptionComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    .group-label { padding: 4px 12px; font-size: 0.75rem; color: var(--kj-color-base-content); opacity: 0.6; text-transform: uppercase; letter-spacing: 0.05em; }
  `],
  template: `
    <kj-select [(value)]="city" placeholder="Choose a city">
      <div class="group-label">Europe</div>
      <kj-option [value]="'london'">London</kj-option>
      <kj-option [value]="'berlin'">Berlin</kj-option>
      <div class="group-label">Asia</div>
      <kj-option [value]="'tokyo'">Tokyo</kj-option>
      <kj-option [value]="'seoul'">Seoul</kj-option>
    </kj-select>
  `,
})
export class KjSelectGroupedExample { readonly city = signal<string | undefined>(undefined); }
