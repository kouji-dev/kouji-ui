import { Component, signal } from '@angular/core';
import { KjButtonComponent } from '../button/button';
import {
  KjCommandPaletteComponent,
  KjCommandItemComponent,
} from './command-palette';

/**
 * Default modal command palette. Click the trigger button (or use the
 * `[(kjOpen)]` 2-way binding) to open. Type to filter — items are projected
 * directly via `<kj-command-item>`.
 */
@Component({
  selector: 'kj-command-palette-example',
  standalone: true,
  imports: [KjCommandPaletteComponent, KjCommandItemComponent, KjButtonComponent],
  styles: [`:host { display: flex; justify-content: center; padding: var(--kj-space-xl); background: var(--kj-color-base-200); min-height: 16rem; }`],
  template: `
    <kj-button kjVariant="outline" (click)="open.set(true)">Open palette</kj-button>

    <kj-command-palette [(kjOpen)]="open" kjPlaceholder="Search commands…">
      <kj-command-item kjValue="new-file">New File</kj-command-item>
      <kj-command-item kjValue="open-folder">Open Folder</kj-command-item>
      <kj-command-item kjValue="save">Save</kj-command-item>
      <kj-command-item kjValue="settings">Settings</kj-command-item>
      <kj-command-item kjValue="toggle-theme">Toggle Theme</kj-command-item>
      <kj-command-item kjValue="profile">Profile</kj-command-item>
      <kj-command-item kjValue="logout">Logout</kj-command-item>
    </kj-command-palette>
  `,
})
export class KjCommandPaletteExample {
  readonly open = signal(false);
}
