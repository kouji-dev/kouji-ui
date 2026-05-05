import { Component } from '@angular/core';
import { KjMenuComponent, KjMenuTriggerComponent, KjMenuContentComponent, KjMenuItemComponent } from './menu';
import { KjKbdComponent } from '../kbd/kbd';

@Component({
  selector: 'kj-menu-shortcuts-example',
  standalone: true,
  imports: [KjMenuComponent, KjMenuTriggerComponent, KjMenuContentComponent, KjMenuItemComponent, KjKbdComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-menu>
      <kj-menu-trigger>Edit</kj-menu-trigger>
      <kj-menu-content>
        <kj-menu-item>Undo<kj-kbd>⌘Z</kj-kbd></kj-menu-item>
        <kj-menu-item>Redo<kj-kbd>⇧⌘Z</kj-kbd></kj-menu-item>
        <kj-menu-item>Cut<kj-kbd>⌘X</kj-kbd></kj-menu-item>
      </kj-menu-content>
    </kj-menu>
  `,
})
export class KjMenuShortcutsExample {}
