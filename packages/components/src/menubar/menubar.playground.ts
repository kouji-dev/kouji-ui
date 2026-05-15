import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { KjMenubarComponent, KjMenubarItemComponent } from './menubar';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Compound knobs cover item
 * count, an optional disabled item, and the bar-level loop / aria-label
 * affordances. Submenu disclosure stays out — pending the overlay-
 * migration follow-up tracked on the menubar examples.
 */
const itemCount = signal<3 | 4 | 5>(4);
const disableLast = signal(true);
const loop = signal(false);
const ariaLabel = signal('Application');

const ITEMS = ['File', 'Edit', 'View', 'Help', 'Window'] as const;

@Component({
  selector: 'kj-menubar-playground',
  standalone: true,
  imports: [KjMenubarComponent, KjMenubarItemComponent],
  template: `
    <kj-menubar [kjLoop]="loop()" [kjAriaLabel]="ariaLabel()">
      @for (item of visibleItems(); track item; let last = $last) {
        <kj-menubar-item [kjDisabled]="disableLast() && last">{{ item }}</kj-menubar-item>
      }
    </kj-menubar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMenubarPlaygroundDemo {
  protected readonly itemCount = itemCount;
  protected readonly disableLast = disableLast;
  protected readonly loop = loop;
  protected readonly ariaLabel = ariaLabel;

  protected readonly visibleItems = computed(() =>
    ITEMS.slice(0, itemCount()),
  );
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjMenubarPlaygroundDemo,
  state: {
    itemCount: itemCount as unknown as ReturnType<typeof signal>,
    disableLast: disableLast as unknown as ReturnType<typeof signal>,
    loop: loop as unknown as ReturnType<typeof signal>,
    ariaLabel: ariaLabel as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'itemCount', label: 'items', options: [3, 4, 5] },
    { kind: 'text', name: 'ariaLabel', label: 'aria-label' },
    { kind: 'toggle', name: 'disableLast', label: 'disable last' },
    { kind: 'toggle', name: 'loop', label: 'loop focus' },
  ],
  snippet: (values) => {
    const s = values as {
      itemCount: number;
      disableLast: boolean;
      loop: boolean;
      ariaLabel: string;
    };
    const attrs: string[] = [`kjAriaLabel="${s.ariaLabel}"`];
    if (s.loop) attrs.push('[kjLoop]="true"');
    const rows = Array.from(ITEMS.slice(0, s.itemCount))
      .map((label, i, arr) => {
        const isLast = i === arr.length - 1;
        const disabled = s.disableLast && isLast ? ' [kjDisabled]="true"' : '';
        return `  <kj-menubar-item${disabled}>${label}</kj-menubar-item>`;
      })
      .join('\n');
    return `<kj-menubar\n  ${attrs.join('\n  ')}\n>\n${rows}\n</kj-menubar>`;
  },
};
