import { Component, signal } from '@angular/core';
import { KjTabsDirective, KjTabListDirective, KjTabDirective, KjTabPanelDirective } from '@kouji-ui/core';

@Component({
  standalone: true,
  imports: [KjTabsDirective, KjTabListDirective, KjTabDirective, KjTabPanelDirective],
  styles: [`
    .tabs { background: #0c0c0c; padding: 2rem; }
    [kjTabList] { display: flex; border-bottom: 1px solid #1e1e1e; margin-bottom: 1.5rem; }
    [kjTab] { background: none; border: none; border-bottom: 2px solid transparent; color: #555; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; padding: 0.625rem 1.25rem; cursor: pointer; transition: color 0.15s, border-color 0.15s; margin-bottom: -1px; }
    [kjTab][aria-selected="true"] { color: #f0ede6; border-bottom-color: #b8f500; }
    [kjTab]:hover { color: #f0ede6; }
    [kjTabPanel] { color: #666; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; line-height: 1.6; }
    [hidden] { display: none; }
  `],
  template: `
    <div class="tabs">
      <div kjTabs [(kjTabsValue)]="activeTab" aria-label="Example tabs">
        <div kjTabList>
          <button kjTab [kjTabValue]="'tab1'">Overview</button>
          <button kjTab [kjTabValue]="'tab2'">API</button>
          <button kjTab [kjTabValue]="'tab3'">Examples</button>
        </div>
        <div kjTabPanel [kjPanelFor]="'tab1'">The overview tab content goes here.</div>
        <div kjTabPanel [kjPanelFor]="'tab2'">API reference content goes here.</div>
        <div kjTabPanel [kjPanelFor]="'tab3'">Code examples go here.</div>
      </div>
    </div>
  `,
})
export class TabsExampleComponent {
  activeTab = signal('tab1');
}
