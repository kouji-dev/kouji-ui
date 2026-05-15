import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { KjListComponent, KjListItemComponent } from './list';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Compound knobs: item count and
 * an active-index selector accompany the structural divided / hoverable /
 * arrow-navigation toggles.
 */
const itemCount = signal<3 | 5 | 7>(5);
const divided = signal(true);
const hoverable = signal(true);
const arrowNavigation = signal(false);
const activeIndex = signal<0 | 1 | 2 | 3 | 4 | 5 | 6 | -1>(0);

const ITEMS = ['Profile', 'Notifications', 'Billing', 'Security', 'Connected apps', 'Plan', 'Danger zone'] as const;

@Component({
  selector: 'kj-list-playground',
  standalone: true,
  imports: [KjListComponent, KjListItemComponent],
  styles: [`:host { display: block; max-width: 360px; }`],
  template: `
    <kj-list
      ariaLabel="Account settings"
      [divided]="divided()"
      [hoverable]="hoverable()"
      [arrowNavigation]="arrowNavigation()"
    >
      @for (item of visibleItems(); track item; let i = $index) {
        <kj-list-item [active]="i === activeIndex()">{{ item }}</kj-list-item>
      }
    </kj-list>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjListPlaygroundDemo {
  protected readonly itemCount = itemCount;
  protected readonly divided = divided;
  protected readonly hoverable = hoverable;
  protected readonly arrowNavigation = arrowNavigation;
  protected readonly activeIndex = activeIndex;

  protected readonly visibleItems = computed(() =>
    ITEMS.slice(0, itemCount()),
  );
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjListPlaygroundDemo,
  state: {
    itemCount: itemCount as unknown as ReturnType<typeof signal>,
    divided: divided as unknown as ReturnType<typeof signal>,
    hoverable: hoverable as unknown as ReturnType<typeof signal>,
    arrowNavigation: arrowNavigation as unknown as ReturnType<typeof signal>,
    activeIndex: activeIndex as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'itemCount', label: 'items', options: [3, 5, 7] },
    {
      kind: 'chips',
      name: 'activeIndex',
      label: 'active row',
      options: [-1, 0, 1, 2, 3, 4],
    },
    { kind: 'toggle', name: 'divided', label: 'divided' },
    { kind: 'toggle', name: 'hoverable', label: 'hoverable' },
    { kind: 'toggle', name: 'arrowNavigation', label: 'arrow navigation' },
  ],
  snippet: (values) => {
    const s = values as {
      itemCount: number;
      divided: boolean;
      hoverable: boolean;
      arrowNavigation: boolean;
      activeIndex: number;
    };
    const attrs: string[] = ['ariaLabel="Account settings"'];
    if (s.divided) attrs.push('[divided]="true"');
    if (s.hoverable) attrs.push('[hoverable]="true"');
    if (s.arrowNavigation) attrs.push('[arrowNavigation]="true"');
    const rows = Array.from(ITEMS.slice(0, s.itemCount))
      .map((label, i) => {
        const active = i === s.activeIndex ? ' [active]="true"' : '';
        return `  <kj-list-item${active}>${label}</kj-list-item>`;
      })
      .join('\n');
    return `<kj-list\n  ${attrs.join('\n  ')}\n>\n${rows}\n</kj-list>`;
  },
};
