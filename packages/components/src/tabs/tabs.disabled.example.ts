import { Component, signal } from '@angular/core';
import { KjTabsComponent, KjTabComponent } from './tabs';

@Component({
  selector: 'kj-tabs-disabled-example',
  standalone: true,
  imports: [KjTabsComponent, KjTabComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-tabs [(value)]="active">
      <kj-tab id="one" label="Tab one">First panel.</kj-tab>
      <kj-tab id="two" label="Tab two (disabled)" [disabled]="true">Second panel.</kj-tab>
      <kj-tab id="three" label="Tab three">Third panel.</kj-tab>
    </kj-tabs>
  `,
})
export class KjTabsDisabledExample { readonly active = signal('one'); }
