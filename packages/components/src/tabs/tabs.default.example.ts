import { Component, signal } from '@angular/core';
import { KjTabsComponent, KjTabComponent } from './tabs';

@Component({
  selector: 'kj-tabs-default-example',
  standalone: true,
  imports: [KjTabsComponent, KjTabComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-tabs [(value)]="active">
      <kj-tab id="overview" label="Overview">Overview content.</kj-tab>
      <kj-tab id="api" label="API">API content.</kj-tab>
      <kj-tab id="examples" label="Examples">Examples content.</kj-tab>
    </kj-tabs>
  `,
})
export class KjTabsDefaultExample { readonly active = signal('overview'); }
