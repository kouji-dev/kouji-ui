import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent } from '../tabs';

/**
 * Manual activation example — focus moves with arrow keys but Enter or Space
 * is required to activate the focused tab. Use this mode when activation has
 * cost (network call, expensive panel render).
 */
@Component({
  selector: 'kj-tabs-manual-activation-example',
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
    <kj-tabs activationMode="manual">
      <kj-tab-list>
        <kj-tab value="reports">Reports</kj-tab>
        <kj-tab value="analytics">Analytics</kj-tab>
        <kj-tab value="exports">Exports</kj-tab>
      </kj-tab-list>
      <kj-tab-panel value="reports">Reports panel (mounted on activation).</kj-tab-panel>
      <kj-tab-panel value="analytics">Analytics panel (mounted on activation).</kj-tab-panel>
      <kj-tab-panel value="exports">Exports panel (mounted on activation).</kj-tab-panel>
    </kj-tabs>
  `,
})
export class KjTabsManualActivationExample {}
