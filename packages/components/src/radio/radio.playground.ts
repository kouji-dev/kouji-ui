import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { KjRadioGroupComponent, KjRadioComponent } from './radio';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs cover orientation, the
 * number of rendered options, the selected value, and a per-option disabled
 * demonstration of skip behaviour during keyboard navigation.
 */
const selected = signal<string>('m');
const orientation = signal<'horizontal' | 'vertical'>('vertical');
const itemCount = signal<2 | 3 | 4 | 5>(3);
const disableMiddle = signal(false);

const ITEMS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 's', label: 'Small' },
  { value: 'm', label: 'Medium' },
  { value: 'l', label: 'Large' },
  { value: 'xl', label: 'X-Large' },
  { value: 'xxl', label: 'XX-Large' },
];

@Component({
  selector: 'kj-radio-playground',
  standalone: true,
  imports: [KjRadioGroupComponent, KjRadioComponent],
  template: `
    <kj-radio-group
      [(value)]="selected"
      [orientation]="orientation()"
      ariaLabel="Size"
    >
      @for (item of visibleItems(); track item.value; let i = $index) {
        <kj-radio [value]="item.value" [disabled]="disableMiddle() && i === 1">
          {{ item.label }}
        </kj-radio>
      }
    </kj-radio-group>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjRadioPlaygroundDemo {
  protected readonly selected = selected;
  protected readonly orientation = orientation;
  protected readonly itemCount = itemCount;
  protected readonly disableMiddle = disableMiddle;

  protected readonly visibleItems = computed(() => ITEMS.slice(0, itemCount()));
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjRadioPlaygroundDemo,
  state: {
    selected: selected as unknown as ReturnType<typeof signal>,
    orientation: orientation as unknown as ReturnType<typeof signal>,
    itemCount: itemCount as unknown as ReturnType<typeof signal>,
    disableMiddle: disableMiddle as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'orientation',
      label: 'orientation',
      options: ['vertical', 'horizontal'],
    },
    { kind: 'chips', name: 'itemCount', label: 'items', options: [2, 3, 4, 5] },
    {
      kind: 'chips',
      name: 'selected',
      label: 'selected',
      options: ['s', 'm', 'l', 'xl', 'xxl'],
    },
    { kind: 'toggle', name: 'disableMiddle', label: 'disable middle item' },
  ],
  snippet: (values) => {
    const s = values as {
      selected: string;
      orientation: string;
      itemCount: number;
      disableMiddle: boolean;
    };
    const items = ITEMS.slice(0, s.itemCount)
      .map((item, i) => {
        const disabled = s.disableMiddle && i === 1 ? ' [disabled]="true"' : '';
        return `  <kj-radio [value]="'${item.value}'"${disabled}>${item.label}</kj-radio>`;
      })
      .join('\n');
    return `<kj-radio-group\n  [(value)]="selected"\n  orientation="${s.orientation}"\n  ariaLabel="Size"\n>\n${items}\n</kj-radio-group>`;
  },
};
