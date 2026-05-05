import { Component } from '@angular/core';
import { KjMenuComponent, KjMenuTriggerComponent, KjMenuContentComponent, KjMenuItemComponent } from './menu';

@Component({
  selector: 'kj-menu-default-example',
  standalone: true,
  imports: [KjMenuComponent, KjMenuTriggerComponent, KjMenuContentComponent, KjMenuItemComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-menu>
      <kj-menu-trigger>Actions</kj-menu-trigger>
      <kj-menu-content>
        <kj-menu-item>Edit</kj-menu-item>
        <kj-menu-item>Duplicate</kj-menu-item>
        <kj-menu-item>Delete</kj-menu-item>
      </kj-menu-content>
    </kj-menu>
  `,
})
export class KjMenuDefaultExample {}
