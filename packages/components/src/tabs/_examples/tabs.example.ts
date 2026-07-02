import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent } from '../tabs';

/**
 * Default tabs example — three tabs, automatic activation, horizontal.
 * The active value is uncontrolled; the directive reconciles to the first
 * registered tab on mount.
 */
@Component({
  selector: 'kj-tabs-example',
  standalone: true,
  imports: [KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-tabs>
      <kj-tab-list>
        <kj-tab value="overview">Overview</kj-tab>
        <kj-tab value="api">API</kj-tab>
        <kj-tab value="examples">Examples</kj-tab>
      </kj-tab-list>
      <kj-tab-panel value="overview">Overview content.</kj-tab-panel>
      <kj-tab-panel value="api">API content.</kj-tab-panel>
      <kj-tab-panel value="examples">Examples content.</kj-tab-panel>
    </kj-tabs>
  `,
})
export class KjTabsExample {}
