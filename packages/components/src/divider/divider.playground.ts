import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjDividerComponent } from './divider';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs cover orientation, variant,
 * size, structural posture, and an optional label projected into the slot.
 */
const orientation = signal<'horizontal' | 'vertical'>('horizontal');
const variant = signal<'solid' | 'dashed' | 'dotted'>('solid');
const size = signal<'sm' | 'md' | 'lg'>('md');
const structural = signal(false);
const label = signal('');

@Component({
  selector: 'kj-divider-playground',
  standalone: true,
  imports: [KjDividerComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-md) 0; }
    .stack { display: flex; flex-direction: column; gap: var(--kj-space-md); min-height: 4rem; }
    .row { display: flex; align-items: center; gap: var(--kj-space-md); height: 4rem; }
  `],
  template: `
    @if (orientation() === 'horizontal') {
      <div class="stack">
        <span>Above</span>
        <kj-divider
          [kjOrientation]="orientation()"
          [kjVariant]="variant()"
          [kjSize]="size()"
          [kjStructural]="structural()"
        >{{ label() }}</kj-divider>
        <span>Below</span>
      </div>
    } @else {
      <div class="row">
        <span>Left</span>
        <kj-divider
          [kjOrientation]="orientation()"
          [kjVariant]="variant()"
          [kjSize]="size()"
          [kjStructural]="structural()"
        />
        <span>Right</span>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDividerPlaygroundDemo {
  protected readonly orientation = orientation;
  protected readonly variant = variant;
  protected readonly size = size;
  protected readonly structural = structural;
  protected readonly label = label;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjDividerPlaygroundDemo,
  state: {
    orientation: orientation as unknown as ReturnType<typeof signal>,
    variant: variant as unknown as ReturnType<typeof signal>,
    size: size as unknown as ReturnType<typeof signal>,
    structural: structural as unknown as ReturnType<typeof signal>,
    label: label as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'orientation',
      label: 'orientation',
      options: ['horizontal', 'vertical'],
    },
    { kind: 'chips', name: 'variant', label: 'variant', options: ['solid', 'dashed', 'dotted'] },
    { kind: 'chips', name: 'size', label: 'size', options: ['sm', 'md', 'lg'] },
    { kind: 'text', name: 'label', label: 'label' },
    { kind: 'toggle', name: 'structural', label: 'structural' },
  ],
  snippet: (values) => {
    const s = values as {
      orientation: string;
      variant: string;
      size: string;
      structural: boolean;
      label: string;
    };
    const attrs: string[] = [
      `kjOrientation="${s.orientation}"`,
      `kjVariant="${s.variant}"`,
      `kjSize="${s.size}"`,
    ];
    if (s.structural) attrs.push('[kjStructural]="true"');
    if (s.label) return `<kj-divider\n  ${attrs.join('\n  ')}\n>${s.label}</kj-divider>`;
    return `<kj-divider\n  ${attrs.join('\n  ')}\n/>`;
  },
};
