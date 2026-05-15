import { Component, signal } from '@angular/core';
import { KjButtonComponent } from '../button/button';
import {
  KjCommandPaletteComponent,
  KjCommandItemComponent,
  KjCommandGroupComponent,
} from './command-palette';

/**
 * A walkthrough of the most common command-palette usages — a trigger button
 * that opens the modal, a global Cmd-K hotkey, and grouped command rows.
 */
@Component({
  selector: 'kj-command-palette-usage-example',
  standalone: true,
  imports: [
    KjCommandPaletteComponent,
    KjCommandItemComponent,
    KjCommandGroupComponent,
    KjButtonComponent,
  ],
  styles: [`:host { display: flex; justify-content: center; min-height: 16rem; }`],
  template: `
    <kj-button kjVariant="outline" (click)="open.set(true)">
      Open palette (or press ⌘K)
    </kj-button>

    <kj-command-palette
      [(kjOpen)]="open"
      kjHotkey="mod+k"
      kjPlaceholder="Type a command…"
    >
      <kj-command-group kjLabel="Actions">
        <kj-command-item kjValue="new-file">New file</kj-command-item>
        <kj-command-item kjValue="save">Save</kj-command-item>
      </kj-command-group>
      <kj-command-group kjLabel="Navigation">
        <kj-command-item kjValue="settings">Settings</kj-command-item>
        <kj-command-item kjValue="profile">Profile</kj-command-item>
      </kj-command-group>
    </kj-command-palette>
  `,
})
export class KjCommandPaletteUsageExample {
  readonly open = signal(false);
}
