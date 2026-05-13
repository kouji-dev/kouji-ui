import { Component } from '@angular/core';
import {
  KjTabsComponent,
  KjTabListComponent,
  KjTabComponent,
  KjTabPanelComponent,
} from './tabs';

/**
 * Disabled-tab example — the middle tab announces `aria-disabled="true"` and
 * cannot be activated by click or Enter/Space, but it remains in the roving
 * sequence so users can still discover it via Home/End and arrow keys.
 */
@Component({
  selector: 'kj-tabs-disabled-example',
  standalone: true,
  imports: [KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-tabs>
      <kj-tab-list>
        <kj-tab value="one">Tab one</kj-tab>
        <kj-tab value="two" [disabled]="true">Tab two (disabled)</kj-tab>
        <kj-tab value="three">Tab three</kj-tab>
      </kj-tab-list>
      <kj-tab-panel value="one">First panel.</kj-tab-panel>
      <kj-tab-panel value="two">Second panel — unreachable while disabled.</kj-tab-panel>
      <kj-tab-panel value="three">Third panel.</kj-tab-panel>
    </kj-tabs>
  `,
})
export class KjTabsDisabledExample {}
