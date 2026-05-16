import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjDropdownMenuTrigger,
  KjDropdownMenuContent,
  KjDropdownMenuItem,
  KjDropdownMenuSeparator,
} from './dropdown-menu';
import { KjButtonComponent } from '../button/button';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs cover the item count, the
 * presence of an inline separator, and a disable-second-row toggle so the
 * keyboard-skip path can be exercised.
 */
const itemCount = signal<3 | 4 | 5>(4);
const showSeparator = signal(true);
const disableSettings = signal(false);

const ITEMS: ReadonlyArray<string> = ['Profile', 'Settings', 'Team', 'Logout', 'Help'];

@Component({
  selector: 'kj-dropdown-menu-playground',
  standalone: true,
  imports: [
    KjButtonComponent,
    KjDropdownMenuTrigger,
    KjDropdownMenuContent,
    KjDropdownMenuItem,
    KjDropdownMenuSeparator,
  ],
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 14rem; align-items: flex-start; gap: var(--kj-space-md); }
    .kj-dropdown-menu-playground-readout { font: 0.875rem var(--kj-font-sans); color: var(--kj-fg-muted); }
    .kj-dropdown-menu-playground-readout strong { color: var(--kj-fg-default); font-weight: 600; }
  `],
  template: `
    <kj-button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger">Open menu</kj-button>
    <kj-dropdown-menu-content [kjFor]="t">
      @for (item of visibleItems(); track item; let i = $index) {
        <button
          kjDropdownMenuItem
          [kjDisabled]="disableSettings() && item === 'Settings'"
          (kjSelect)="lastSelected.set(item)"
        >
          {{ item }}
        </button>
        @if (showSeparator() && i === 0 && visibleItems().length > 1) {
          <div kjDropdownMenuSeparator></div>
        }
      }
    </kj-dropdown-menu-content>

    <p class="kj-dropdown-menu-playground-readout">
      Last selected: <strong>{{ lastSelected() ?? '—' }}</strong>
    </p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDropdownMenuPlaygroundDemo {
  protected readonly itemCount = itemCount;
  protected readonly showSeparator = showSeparator;
  protected readonly disableSettings = disableSettings;
  protected readonly lastSelected = signal<string | null>(null);

  protected visibleItems(): ReadonlyArray<string> {
    return ITEMS.slice(0, itemCount());
  }
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjDropdownMenuPlaygroundDemo,
  state: {
    itemCount: itemCount as unknown as ReturnType<typeof signal>,
    showSeparator: showSeparator as unknown as ReturnType<typeof signal>,
    disableSettings: disableSettings as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'itemCount', label: 'items', options: [3, 4, 5] },
    { kind: 'toggle', name: 'showSeparator', label: 'separator' },
    { kind: 'toggle', name: 'disableSettings', label: 'disable Settings' },
  ],
  snippet: (values) => {
    const s = values as {
      itemCount: number;
      showSeparator: boolean;
      disableSettings: boolean;
    };
    const items = ITEMS.slice(0, s.itemCount);
    const rows: string[] = [];
    items.forEach((label, i) => {
      const disabled = s.disableSettings && label === 'Settings' ? ' [kjDisabled]="true"' : '';
      rows.push(
        `  <button kjDropdownMenuItem${disabled} (kjSelect)="lastSelected.set('${label}')">${label}</button>`,
      );
      if (s.showSeparator && i === 0 && items.length > 1) {
        rows.push('  <div kjDropdownMenuSeparator></div>');
      }
    });
    return [
      '<kj-button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger">Open menu</kj-button>',
      '<kj-dropdown-menu-content [kjFor]="t">',
      rows.join('\n'),
      '</kj-dropdown-menu-content>',
      '',
      '<p>Last selected: <strong>{{ lastSelected() ?? \'—\' }}</strong></p>',
    ].join('\n');
  },
};
