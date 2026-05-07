import { Component, signal } from '@angular/core';
import { KjButtonComponent } from '../button/button';
import {
  KjCommandPaletteComponent,
  KjCommandItemComponent,
  KjCommandGroupComponent,
  KjCommandSeparatorComponent,
} from './command-palette';

/**
 * Modal command palette with grouped items. Type to filter — groups with no
 * matching items hide automatically, including their heading.
 */
@Component({
  selector: 'kj-command-palette-groups-example',
  standalone: true,
  imports: [
    KjCommandPaletteComponent,
    KjCommandItemComponent,
    KjCommandGroupComponent,
    KjCommandSeparatorComponent,
    KjButtonComponent,
  ],
  styles: [`:host { display: flex; justify-content: center; padding: var(--kj-space-xl); background: var(--kj-color-base-200); min-height: 16rem; }`],
  template: `
    <kj-button kjVariant="outline" (click)="open.set(true)">Open palette</kj-button>

    <kj-command-palette [(kjOpen)]="open" kjPlaceholder="Search…">
      <kj-command-group kjLabel="Recent">
        <kj-command-item kjValue="recent-settings">Settings</kj-command-item>
        <kj-command-item kjValue="recent-profile">Profile</kj-command-item>
      </kj-command-group>

      <kj-command-separator></kj-command-separator>

      <kj-command-group kjLabel="Settings">
        <kj-command-item kjValue="theme">Toggle Theme</kj-command-item>
        <kj-command-item kjValue="language">Language</kj-command-item>
        <kj-command-item kjValue="shortcuts">Keyboard Shortcuts</kj-command-item>
      </kj-command-group>
    </kj-command-palette>
  `,
})
export class KjCommandPaletteGroupsExample {
  readonly open = signal(false);
}
