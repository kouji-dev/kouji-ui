import { Component, signal } from '@angular/core';
import { KjTabsComponent, KjTabComponent } from './tabs';

@Component({
  selector: 'kj-tabs-pills-example',
  standalone: true,
  imports: [KjTabsComponent, KjTabComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-tabs [(value)]="active" variant="pills">
      <kj-tab id="a" label="A">Pill A content.</kj-tab>
      <kj-tab id="b" label="B">Pill B content.</kj-tab>
      <kj-tab id="c" label="C">Pill C content.</kj-tab>
    </kj-tabs>
  `,
})
export class KjTabsPillsExample { readonly active = signal('a'); }
