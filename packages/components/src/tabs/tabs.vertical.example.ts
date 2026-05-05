import { Component, signal } from '@angular/core';
import { KjTabsComponent, KjTabComponent } from './tabs';

@Component({
  selector: 'kj-tabs-vertical-example',
  standalone: true,
  imports: [KjTabsComponent, KjTabComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-tabs [(value)]="active" orientation="vertical">
      <kj-tab id="profile" label="Profile">Profile content.</kj-tab>
      <kj-tab id="team" label="Team">Team content.</kj-tab>
      <kj-tab id="billing" label="Billing">Billing content.</kj-tab>
    </kj-tabs>
  `,
})
export class KjTabsVerticalExample { readonly active = signal('profile'); }
