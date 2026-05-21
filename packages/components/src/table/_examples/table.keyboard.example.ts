import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { kjColumn, type KjColumnDef } from '@kouji-ui/core';
import { KjTableComponent } from '../table';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

/**
 * Keyboard navigation — full WCAG 2.1 grid keymap. Click into the grid and
 * try the keys listed in the legend. Focus is row-based; cells advertise
 * `tabindex="-1"` so arrow keys drive movement instead of Tab.
 *
 * Internally `KjTableKeyboardNav` resolves cells via Angular's
 * `contentChildren(KjTableCell)`, so only currently-rendered (visible) cells
 * participate — virtualized off-window rows + hidden columns are skipped
 * automatically.
 */
@Component({
  selector: 'kj-table-keyboard-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTableComponent],
  styles: [`
    :host { display: block; font-family: var(--kj-font-sans); }

    .keymap {
      margin-block-end: var(--kj-space-md);
      padding: var(--kj-space-md) var(--kj-space-lg);
      border: 1px solid var(--kj-border-default);
      border-radius: var(--kj-radius-field);
      background: var(--kj-bg-surface);
      color: var(--kj-fg-default);
    }
    .keymap h3 {
      margin: 0 0 var(--kj-space-sm);
      font-family: var(--kj-font-display);
      font-size: var(--kj-text-sm);
      font-weight: var(--kj-display-weight, 700);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--kj-fg-muted);
    }
    .keymap dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--kj-space-xs) var(--kj-space-lg);
      margin: 0;
      font-size: var(--kj-text-sm);
    }
    .keymap dt {
      font-family: var(--kj-font-mono);
      color: var(--kj-fg-default);
    }
    .keymap dd {
      margin: 0;
      color: var(--kj-fg-muted);
    }
    kbd {
      display: inline-block;
      padding: 1px var(--kj-space-xs);
      background: var(--kj-bg-field);
      border: 1px solid var(--kj-border-default);
      border-radius: var(--kj-radius-selector);
      font-family: var(--kj-font-mono);
      font-size: 0.85em;
      color: var(--kj-fg-default);
    }
  `],
  template: `
    <aside class="keymap" aria-label="Keyboard shortcuts">
      <h3>Keyboard shortcuts</h3>
      <dl>
        <dt><kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd></dt>
        <dd>Move focus between cells</dd>
        <dt><kbd>Home</kbd> / <kbd>End</kbd></dt>
        <dd>Jump to first / last cell in the row</dd>
        <dt><kbd>Ctrl</kbd>+<kbd>Home</kbd> / <kbd>Ctrl</kbd>+<kbd>End</kbd></dt>
        <dd>Jump to first / last cell in the grid</dd>
        <dt><kbd>PageUp</kbd> / <kbd>PageDown</kbd></dt>
        <dd>Move focus a page of rows at a time</dd>
        <dt><kbd>F2</kbd> / <kbd>Enter</kbd></dt>
        <dd>Begin editing the focused cell (if editable)</dd>
        <dt><kbd>Esc</kbd></dt>
        <dd>Cancel the active editor</dd>
        <dt><kbd>Space</kbd></dt>
        <dd>Toggle row selection</dd>
        <dt><kbd>Ctrl</kbd>+<kbd>A</kbd> / <kbd>Cmd</kbd>+<kbd>A</kbd></dt>
        <dd>Select all rows</dd>
      </dl>
    </aside>

    <kj-table [kjData]="rows()" [kjColumns]="cols" [kjGetRowId]="getRowId" />
  `,
})
export class KjTableKeyboardExample {
  protected readonly rows = signal<User[]>([
    { id: '1', name: 'Alice Chen', email: 'alice@example.com', role: 'admin' },
    { id: '2', name: 'Bob Diaz', email: 'bob@example.com', role: 'editor' },
    { id: '3', name: 'Carol Evans', email: 'carol@example.com', role: 'viewer' },
    { id: '4', name: 'Dan Fischer', email: 'dan@example.com', role: 'editor' },
    { id: '5', name: 'Eve Garcia', email: 'eve@example.com', role: 'admin' },
  ]);

  protected readonly cols: KjColumnDef<User>[] = [
    kjColumn<User>({ id: 'name', accessorKey: 'name', header: 'Name' }),
    kjColumn<User>({ id: 'email', accessorKey: 'email', header: 'Email' }),
    kjColumn<User>({ id: 'role', accessorKey: 'role', header: 'Role' }),
  ];

  protected readonly getRowId = (row: User): string => row.id;
}
