import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjCommandPaletteComponent,
  KjCommandItemComponent,
} from './command-palette';
import { KjButtonComponent } from '../button/button';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs cover the placeholder, the
 * trigger label, an item-count chip group, the global hotkey binding, and
 * an `open` toggle that drives the modal palette directly.
 */
const placeholder = signal('Search commands…');
const triggerLabel = signal('Search commands…');
const itemCount = signal<3 | 4 | 5>(4);
const hotkey = signal<'none' | 'mod+k' | 'mod+/' | '/'>('none');
const escBadge = signal(true);
const open = signal(false);

const ITEMS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'new-file', label: 'New File' },
  { value: 'open-folder', label: 'Open Folder' },
  { value: 'save', label: 'Save' },
  { value: 'settings', label: 'Settings' },
  { value: 'logout', label: 'Logout' },
];

@Component({
  selector: 'kj-command-palette-playground',
  standalone: true,
  imports: [KjButtonComponent, KjCommandPaletteComponent, KjCommandItemComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); align-items: flex-start; min-height: 12rem; }
  `],
  template: `
    <kj-button kjVariant="outline" (click)="open.set(true)">{{ triggerLabel() }}</kj-button>
    <kj-command-palette
      [(kjOpen)]="open"
      [kjPlaceholder]="placeholder()"
      [kjEscBadge]="escBadge()"
      [kjHotkey]="resolvedHotkey()"
    >
      @for (item of visibleItems(); track item.value) {
        <kj-command-item [kjValue]="item.value">{{ item.label }}</kj-command-item>
      }
    </kj-command-palette>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCommandPalettePlaygroundDemo {
  protected readonly placeholder = placeholder;
  protected readonly triggerLabel = triggerLabel;
  protected readonly itemCount = itemCount;
  protected readonly hotkey = hotkey;
  protected readonly escBadge = escBadge;
  protected readonly open = open;

  protected visibleItems(): typeof ITEMS {
    return ITEMS.slice(0, itemCount());
  }

  protected resolvedHotkey(): string {
    const h = hotkey();
    return h === 'none' ? '' : h;
  }
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjCommandPalettePlaygroundDemo,
  state: {
    placeholder: placeholder as unknown as ReturnType<typeof signal>,
    triggerLabel: triggerLabel as unknown as ReturnType<typeof signal>,
    itemCount: itemCount as unknown as ReturnType<typeof signal>,
    hotkey: hotkey as unknown as ReturnType<typeof signal>,
    escBadge: escBadge as unknown as ReturnType<typeof signal>,
    open: open as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'placeholder', label: 'placeholder' },
    { kind: 'text', name: 'triggerLabel', label: 'trigger' },
    { kind: 'chips', name: 'itemCount', label: 'items', options: [3, 4, 5] },
    {
      kind: 'chips',
      name: 'hotkey',
      label: 'hotkey',
      options: ['none', 'mod+k', 'mod+/', '/'],
    },
    { kind: 'toggle', name: 'escBadge', label: 'esc badge' },
    { kind: 'toggle', name: 'open', label: 'open' },
  ],
  snippet: (values) => {
    const s = values as {
      placeholder: string;
      triggerLabel: string;
      itemCount: number;
      hotkey: string;
      escBadge: boolean;
    };
    const attrs: string[] = [
      `[(kjOpen)]="open"`,
      `kjPlaceholder="${s.placeholder}"`,
    ];
    if (s.hotkey !== 'none') attrs.push(`kjHotkey="${s.hotkey}"`);
    if (!s.escBadge) attrs.push('[kjEscBadge]="false"');
    const items = ITEMS.slice(0, s.itemCount)
      .map((it) => `  <kj-command-item kjValue="${it.value}">${it.label}</kj-command-item>`)
      .join('\n');
    return [
      `<kj-button kjVariant="outline" (click)="open.set(true)">`,
      `  ${s.triggerLabel}`,
      `</kj-button>`,
      ``,
      `<kj-command-palette\n  ${attrs.join('\n  ')}\n>`,
      items,
      `</kj-command-palette>`,
    ].join('\n');
  },
};
