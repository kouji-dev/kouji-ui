import { Component } from '@angular/core';
import { KjMenuComponent, KjMenuTriggerComponent, KjMenuContentComponent, KjMenuItemComponent } from './menu';

@Component({
  selector: 'kj-menu-shortcuts-example',
  standalone: true,
  imports: [KjMenuComponent, KjMenuTriggerComponent, KjMenuContentComponent, KjMenuItemComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    kbd { font: 0.75rem var(--kj-font-mono); background: var(--kj-color-base-200); padding: 2px 6px; border-radius: 4px; color: var(--kj-color-base-content); opacity: 0.7; }
  `],
  template: `
    <kj-menu>
      <kj-menu-trigger>Edit</kj-menu-trigger>
      <kj-menu-content>
        <kj-menu-item>Undo<kbd>⌘Z</kbd></kj-menu-item>
        <kj-menu-item>Redo<kbd>⇧⌘Z</kbd></kj-menu-item>
        <kj-menu-item>Cut<kbd>⌘X</kbd></kj-menu-item>
      </kj-menu-content>
    </kj-menu>
  `,
})
export class KjMenuShortcutsExample {}
