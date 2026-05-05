import { Component, signal } from '@angular/core';
import { KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent } from './tabs';

@Component({
  selector: 'kj-tabs-default-example',
  standalone: true,
  imports: [KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-tabs [(value)]="active">
      <kj-tab-list>
        <kj-tab [value]="'overview'">Overview</kj-tab>
        <kj-tab [value]="'api'">API</kj-tab>
        <kj-tab [value]="'examples'">Examples</kj-tab>
      </kj-tab-list>
      <kj-tab-panel [for]="'overview'">Overview content.</kj-tab-panel>
      <kj-tab-panel [for]="'api'">API content.</kj-tab-panel>
      <kj-tab-panel [for]="'examples'">Examples content.</kj-tab-panel>
    </kj-tabs>
  `,
})
export class KjTabsDefaultExample { readonly active = signal('overview'); }
