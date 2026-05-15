import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjAvatarComponent } from './avatar';
import { KjAvatarGroupComponent } from './avatar-group';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Targets the group facepile (main
 * symbol) and exposes size / shape / max-visible / total / item count so the
 * overflow chip and stacking can be probed.
 */
const size = signal<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');
const shape = signal<'circle' | 'rounded'>('circle');
const max = signal<2 | 3 | 4 | 5>(3);
const total = signal<4 | 6 | 8>(6);
const itemCount = signal<3 | 4 | 5>(4);

const PEOPLE: ReadonlyArray<{ content: string; alt: string }> = [
  { content: 'AL', alt: 'Alice' },
  { content: 'BR', alt: 'Bruno' },
  { content: 'CY', alt: 'Cyrille' },
  { content: 'DA', alt: 'Dara' },
  { content: 'ED', alt: 'Eduardo' },
];

@Component({
  selector: 'kj-avatar-playground',
  standalone: true,
  imports: [KjAvatarComponent, KjAvatarGroupComponent],
  template: `
    <kj-avatar-group
      [kjMax]="max()"
      [kjTotal]="total()"
      [kjSize]="size()"
      [kjShape]="shape()"
    >
      @for (p of visiblePeople(); track p.alt) {
        <kj-avatar [content]="p.content" [alt]="p.alt" />
      }
    </kj-avatar-group>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAvatarPlaygroundDemo {
  protected readonly size = size;
  protected readonly shape = shape;
  protected readonly max = max;
  protected readonly total = total;
  protected readonly itemCount = itemCount;

  protected visiblePeople(): typeof PEOPLE {
    return PEOPLE.slice(0, itemCount());
  }
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjAvatarPlaygroundDemo,
  state: {
    size: size as unknown as ReturnType<typeof signal>,
    shape: shape as unknown as ReturnType<typeof signal>,
    max: max as unknown as ReturnType<typeof signal>,
    total: total as unknown as ReturnType<typeof signal>,
    itemCount: itemCount as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'size',
      label: 'size',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    { kind: 'chips', name: 'shape', label: 'shape', options: ['circle', 'rounded'] },
    { kind: 'chips', name: 'max', label: 'max visible', options: [2, 3, 4, 5] },
    { kind: 'chips', name: 'total', label: 'total', options: [4, 6, 8] },
    { kind: 'chips', name: 'itemCount', label: 'items', options: [3, 4, 5] },
  ],
  snippet: (values) => {
    const s = values as {
      size: string;
      shape: string;
      max: number;
      total: number;
      itemCount: number;
    };
    const attrs: string[] = [
      `[kjMax]="${s.max}"`,
      `[kjTotal]="${s.total}"`,
      `kjSize="${s.size}"`,
      `kjShape="${s.shape}"`,
    ];
    const children = PEOPLE.slice(0, s.itemCount)
      .map((p) => `  <kj-avatar content="${p.content}" alt="${p.alt}" />`)
      .join('\n');
    return `<kj-avatar-group\n  ${attrs.join('\n  ')}\n>\n${children}\n</kj-avatar-group>`;
  },
};
