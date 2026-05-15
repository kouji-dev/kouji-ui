import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjAccordionComponent,
  KjAccordionItemComponent,
  KjAccordionContentComponent,
} from './accordion';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs let the user change the
 * accordion's behaviour mode, item count, default open value, and disable
 * the middle item to demonstrate skip behaviour in keyboard navigation.
 */
const type = signal<'single' | 'multiple'>('single');
const itemCount = signal<3 | 4 | 5>(3);
const openValue = signal<'none' | 'one' | 'two' | 'three'>('none');
const arrowNavigation = signal(false);
const disableMiddle = signal(false);

const ITEMS: ReadonlyArray<{ value: string; label: string; body: string }> = [
  { value: 'one', label: 'What is kouji-ui?', body: 'A headless-first component library for Angular.' },
  { value: 'two', label: 'Is it free?', body: 'Yes — MIT licensed.' },
  { value: 'three', label: 'Does it support theming?', body: 'Themes are CSS-variable driven; swap tokens at the host element.' },
  { value: 'four', label: 'Is it accessible?', body: 'WAI-ARIA APG patterns are baked in; targets WCAG 2.1 AAA.' },
  { value: 'five', label: 'How do I install?', body: 'pnpm add @kouji-ui/components @kouji-ui/core.' },
];

@Component({
  selector: 'kj-accordion-playground',
  standalone: true,
  imports: [
    KjAccordionComponent,
    KjAccordionItemComponent,
    KjAccordionContentComponent,
  ],
  template: `
    <kj-accordion
      [type]="type()"
      [arrowNavigation]="arrowNavigation()"
      [value]="resolvedValue()"
    >
      @for (item of visibleItems(); track item.value; let i = $index) {
        <kj-accordion-item
          [value]="item.value"
          [label]="item.label"
          [disabled]="disableMiddle() && i === 1"
        >
          <kj-accordion-content>{{ item.body }}</kj-accordion-content>
        </kj-accordion-item>
      }
    </kj-accordion>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAccordionPlaygroundDemo {
  protected readonly type = type;
  protected readonly itemCount = itemCount;
  protected readonly openValue = openValue;
  protected readonly arrowNavigation = arrowNavigation;
  protected readonly disableMiddle = disableMiddle;

  protected visibleItems(): typeof ITEMS {
    return ITEMS.slice(0, itemCount());
  }

  protected resolvedValue(): string | string[] {
    const v = openValue();
    if (type() === 'multiple') return v === 'none' ? [] : [v];
    return v === 'none' ? '' : v;
  }
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjAccordionPlaygroundDemo,
  state: {
    type: type as unknown as ReturnType<typeof signal>,
    itemCount: itemCount as unknown as ReturnType<typeof signal>,
    openValue: openValue as unknown as ReturnType<typeof signal>,
    arrowNavigation: arrowNavigation as unknown as ReturnType<typeof signal>,
    disableMiddle: disableMiddle as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'type', label: 'type', options: ['single', 'multiple'] },
    { kind: 'chips', name: 'itemCount', label: 'items', options: [3, 4, 5] },
    {
      kind: 'chips',
      name: 'openValue',
      label: 'open',
      options: ['none', 'one', 'two', 'three'],
    },
    { kind: 'toggle', name: 'arrowNavigation', label: 'arrow navigation' },
    { kind: 'toggle', name: 'disableMiddle', label: 'disable middle item' },
  ],
  snippet: (values) => {
    const s = values as {
      type: string;
      itemCount: number;
      openValue: string;
      arrowNavigation: boolean;
      disableMiddle: boolean;
    };
    const attrs: string[] = [`type="${s.type}"`];
    if (s.arrowNavigation) attrs.push('[arrowNavigation]="true"');
    if (s.openValue !== 'none') {
      attrs.push(
        s.type === 'multiple'
          ? `[value]="['${s.openValue}']"`
          : `value="${s.openValue}"`,
      );
    }
    const items = ITEMS.slice(0, s.itemCount)
      .map((item, i) => {
        const disabled = s.disableMiddle && i === 1 ? ' [disabled]="true"' : '';
        return `  <kj-accordion-item value="${item.value}" label="${item.label}"${disabled}>\n    <kj-accordion-content>${item.body}</kj-accordion-content>\n  </kj-accordion-item>`;
      })
      .join('\n');
    return `<kj-accordion\n  ${attrs.join('\n  ')}\n>\n${items}\n</kj-accordion>`;
  },
};
