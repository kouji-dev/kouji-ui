import { Component, signal } from '@angular/core';
import {
  KjTabsComponent,
  KjTabListComponent,
  KjTabComponent,
  KjTabPanelComponent,
} from '../tabs';

/**
 * A walkthrough of the most common tabs usages — controlled value, a disabled
 * tab in the strip, and a panel that reads from the active value to drive
 * companion UI. Use this as the copy-paste starting point.
 */
@Component({
  selector: 'kj-tabs-usage-example',
  standalone: true,
  imports: [KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); }
    .readout { font: 0.875rem var(--kj-font-sans); color: var(--kj-fg-muted); }
  `],
  template: `
    <p class="readout">Active: {{ active() }}</p>
    <kj-tabs [(value)]="active">
      <kj-tab-list>
        <kj-tab value="overview">Overview</kj-tab>
        <kj-tab value="billing">Billing</kj-tab>
        <kj-tab value="archived" [disabled]="true">Archived</kj-tab>
      </kj-tab-list>
      <kj-tab-panel value="overview">Overview content.</kj-tab-panel>
      <kj-tab-panel value="billing">Billing content.</kj-tab-panel>
      <kj-tab-panel value="archived">Archived content.</kj-tab-panel>
    </kj-tabs>
  `,
})
export class KjTabsUsageExample {
  readonly active = signal('overview');
}
