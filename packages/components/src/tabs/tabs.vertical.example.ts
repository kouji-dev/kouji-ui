import { Component } from '@angular/core';
import { KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent } from './tabs';

/**
 * Vertical orientation example — the tab strip flips to a column and the
 * arrow-key axis switches to ArrowUp/ArrowDown.
 */
@Component({
  selector: 'kj-tabs-vertical-example',
  standalone: true,
  imports: [KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  template: `
    <kj-tabs orientation="vertical">
      <kj-tab-list>
        <kj-tab value="profile">Profile</kj-tab>
        <kj-tab value="team">Team</kj-tab>
        <kj-tab value="billing">Billing</kj-tab>
      </kj-tab-list>
      <kj-tab-panel value="profile">Profile content.</kj-tab-panel>
      <kj-tab-panel value="team">Team content.</kj-tab-panel>
      <kj-tab-panel value="billing">Billing content.</kj-tab-panel>
    </kj-tabs>
  `,
})
export class KjTabsVerticalExample {}
