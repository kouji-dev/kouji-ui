import { Component } from '@angular/core';
import { KjMenuComponent, KjMenuTriggerComponent, KjMenuContentComponent, KjMenuItemComponent } from './menu';

@Component({
  selector: 'kj-menu-disabled-example',
  standalone: true,
  imports: [KjMenuComponent, KjMenuTriggerComponent, KjMenuContentComponent, KjMenuItemComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-menu>
      <kj-menu-trigger>Edit</kj-menu-trigger>
      <kj-menu-content>
        <kj-menu-item>Cut</kj-menu-item>
        <kj-menu-item>Copy</kj-menu-item>
        <kj-menu-item [disabled]="true">Paste</kj-menu-item>
      </kj-menu-content>
    </kj-menu>
  `,
})
export class KjMenuDisabledExample {}
