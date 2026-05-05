import { Component, signal } from '@angular/core';
import { KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent } from './tabs';

@Component({
  selector: 'kj-tabs-disabled-example',
  standalone: true,
  imports: [KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-tabs [(value)]="active">
      <kj-tab-list>
        <kj-tab [value]="'one'">Tab one</kj-tab>
        <kj-tab [value]="'two'" [disabled]="true">Tab two (disabled)</kj-tab>
        <kj-tab [value]="'three'">Tab three</kj-tab>
      </kj-tab-list>
      <kj-tab-panel [for]="'one'">First panel.</kj-tab-panel>
      <kj-tab-panel [for]="'two'">Second panel.</kj-tab-panel>
      <kj-tab-panel [for]="'three'">Third panel.</kj-tab-panel>
    </kj-tabs>
  `,
})
export class KjTabsDisabledExample { readonly active = signal('one'); }
