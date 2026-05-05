import { Component, signal } from '@angular/core';
import { KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent } from './tabs';

@Component({
  selector: 'kj-tabs-vertical-example',
  standalone: true,
  imports: [KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-tabs [(value)]="active" orientation="vertical">
      <kj-tab-list>
        <kj-tab [value]="'profile'">Profile</kj-tab>
        <kj-tab [value]="'team'">Team</kj-tab>
        <kj-tab [value]="'billing'">Billing</kj-tab>
      </kj-tab-list>
      <kj-tab-panel [for]="'profile'">Profile content.</kj-tab-panel>
      <kj-tab-panel [for]="'team'">Team content.</kj-tab-panel>
      <kj-tab-panel [for]="'billing'">Billing content.</kj-tab-panel>
    </kj-tabs>
  `,
})
export class KjTabsVerticalExample { readonly active = signal('profile'); }
