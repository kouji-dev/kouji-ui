import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjButtonComponent } from '../../button/button';
import {
  KjCommandPaletteComponent,
  KjCommandItemComponent,
  KjCommandGroupComponent,
  KjCommandSeparatorComponent,
} from '../command-palette';

/**
 * Modal command palette with Cmd-K / Ctrl-K hotkey wired in.
 * Click the trigger button or press the chord to toggle.
 */
@Component({
  selector: 'kj-command-palette-dialog-example',
  standalone: true,
  imports: [
    KjCommandPaletteComponent,
    KjCommandItemComponent,
    KjCommandGroupComponent,
    KjCommandSeparatorComponent,
    KjButtonComponent,
  ],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--kj-space-md);
        align-items: flex-start;
        min-height: 16rem;
      }
      kbd {
        border: 1px solid var(--kj-border-default);
        color: var(--kj-fg-muted);
        font-family: var(--kj-font-mono);
        font-size: 0.7rem;
        padding: 0.1rem 0.35rem;
        margin-inline-start: var(--kj-space-md);
      }
      .activated {
        font-family: var(--kj-font-mono);
        font-size: 0.75rem;
        color: var(--kj-fg-muted);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button kjVariant="outline" (click)="open.set(true)">
      Search commands… <kbd>⌘K</kbd>
    </kj-button>

    @if (lastActivated()) {
      <p class="activated">
        Activated: <strong>{{ lastActivated() }}</strong>
      </p>
    }

    <kj-command-palette
      [(kjOpen)]="open"
      kjHotkey="mod+k"
      kjPlaceholder="Search commands…"
      (kjActivate)="onActivate($any($event))"
    >
      <kj-command-group kjLabel="Suggestions">
        <kj-command-item kjValue="calendar">Calendar</kj-command-item>
        <kj-command-item kjValue="search-emoji">Search Emoji</kj-command-item>
        <kj-command-item kjValue="calculator">Calculator</kj-command-item>
      </kj-command-group>

      <kj-command-separator></kj-command-separator>

      <kj-command-group kjLabel="Settings">
        <kj-command-item kjValue="profile">Profile</kj-command-item>
        <kj-command-item kjValue="billing">Billing</kj-command-item>
        <kj-command-item kjValue="settings">Settings</kj-command-item>
        <kj-command-item kjValue="logout">Logout</kj-command-item>
      </kj-command-group>
    </kj-command-palette>
  `,
})
export class KjCommandPaletteDialogExample {
  readonly open = signal(false);
  readonly lastActivated = signal<string | null>(null);

  onActivate(event: { value: unknown; query: string }): void {
    this.lastActivated.set(String(event.value));
  }
}
