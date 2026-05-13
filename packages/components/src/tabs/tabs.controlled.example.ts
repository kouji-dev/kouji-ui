import { Component, signal } from '@angular/core';
import {
  KjTabsComponent,
  KjTabListComponent,
  KjTabComponent,
  KjTabPanelComponent,
} from './tabs';
import { KjButtonComponent } from '../button/button';

/**
 * Controlled example — the active value is bound through a `signal` and
 * driven by external `<kj-button>` controls. Demonstrates the `[(value)]`
 * two-way binding and programmatic activation through the model.
 */
@Component({
  selector: 'kj-tabs-controlled-example',
  standalone: true,
  imports: [KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent, KjButtonComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }
    .toolbar { display: flex; gap: var(--kj-space-sm); margin-bottom: var(--kj-space-lg); }
  `],
  template: `
    <div class="toolbar">
      <kj-button kjVariant="outline" kjSize="sm" (click)="active.set('overview')">Go to Overview</kj-button>
      <kj-button kjVariant="outline" kjSize="sm" (click)="active.set('settings')">Go to Settings</kj-button>
      <kj-button kjVariant="outline" kjSize="sm" (click)="active.set('about')">Go to About</kj-button>
    </div>
    <kj-tabs [(value)]="active">
      <kj-tab-list>
        <kj-tab value="overview">Overview</kj-tab>
        <kj-tab value="settings">Settings</kj-tab>
        <kj-tab value="about">About</kj-tab>
      </kj-tab-list>
      <kj-tab-panel value="overview">Overview content.</kj-tab-panel>
      <kj-tab-panel value="settings">Settings content.</kj-tab-panel>
      <kj-tab-panel value="about">About content.</kj-tab-panel>
    </kj-tabs>
  `,
})
export class KjTabsControlledExample {
  readonly active = signal('overview');
}
