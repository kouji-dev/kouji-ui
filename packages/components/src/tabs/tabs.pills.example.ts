import { Component, signal } from '@angular/core';
import { KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent } from './tabs';

@Component({
  selector: 'kj-tabs-pills-example',
  standalone: true,
  imports: [KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-tabs [(value)]="active" variant="pills">
      <kj-tab-list>
        <kj-tab [value]="'a'">A</kj-tab>
        <kj-tab [value]="'b'">B</kj-tab>
        <kj-tab [value]="'c'">C</kj-tab>
      </kj-tab-list>
      <kj-tab-panel [for]="'a'">Pill A content.</kj-tab-panel>
      <kj-tab-panel [for]="'b'">Pill B content.</kj-tab-panel>
      <kj-tab-panel [for]="'c'">Pill C content.</kj-tab-panel>
    </kj-tabs>
  `,
})
export class KjTabsPillsExample { readonly active = signal('a'); }
