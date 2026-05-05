import { Component } from '@angular/core';
import { KjMenuComponent, KjMenuTriggerComponent, KjMenuContentComponent, KjMenuItemComponent } from './menu';

@Component({
  selector: 'kj-menu-sub-items-example',
  standalone: true,
  imports: [KjMenuComponent, KjMenuTriggerComponent, KjMenuContentComponent, KjMenuItemComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-menu>
      <kj-menu-trigger>File</kj-menu-trigger>
      <kj-menu-content>
        <kj-menu-item>New</kj-menu-item>
        <kj-menu-item>Open</kj-menu-item>
        <hr style="border:0; border-top:1px solid var(--kj-color-base-300); margin:4px 0;" />
        <kj-menu-item>Save</kj-menu-item>
        <kj-menu-item>Save as…</kj-menu-item>
        <hr style="border:0; border-top:1px solid var(--kj-color-base-300); margin:4px 0;" />
        <kj-menu-item>Quit</kj-menu-item>
      </kj-menu-content>
    </kj-menu>
  `,
})
export class KjMenuSubItemsExample {}
