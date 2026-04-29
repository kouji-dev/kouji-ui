import { Component, signal } from '@angular/core';
import { KjTabsDirective, KjTabListDirective, KjTabDirective, KjTabPanelDirective } from '@kouji-ui/core';

@Component({
  standalone: true,
  imports: [KjTabsDirective, KjTabListDirective, KjTabDirective, KjTabPanelDirective],
  styles: [`
    :host { display: block; padding: 2rem; background: #0c0c0c; }
    [kjTabList] { display: flex; border-bottom: 1px solid #1e1e1e; margin-bottom: 1.5rem; }
    button[kjTab] { background: none; border: none; border-bottom: 2px solid transparent; color: #555; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; padding: 0.625rem 1.25rem; cursor: pointer; margin-bottom: -1px; transition: color 0.15s, border-color 0.15s; }
    button[kjTab][aria-selected="true"] { color: #f0ede6; border-bottom-color: #b8f500; }
    button[kjTab]:hover { color: #f0ede6; }
    [kjTabPanel] { color: #666; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; line-height: 1.6; }
    [hidden] { display: none; }
  `],
  template: `
    <div kjTabs [(kjTabsValue)]="active">
      <div kjTabList aria-label="Tabs demo">
        <button kjTab [kjTabValue]="'overview'">Overview</button>
        <button kjTab [kjTabValue]="'api'">API</button>
        <button kjTab [kjTabValue]="'examples'">Examples</button>
      </div>
      <div kjTabPanel [kjPanelFor]="'overview'">The overview content goes here.</div>
      <div kjTabPanel [kjPanelFor]="'api'">API reference content.</div>
      <div kjTabPanel [kjPanelFor]="'examples'">Code examples here.</div>
    </div>
  `,
})
export class TabsDemoComponent {
  active = signal('overview');
}
