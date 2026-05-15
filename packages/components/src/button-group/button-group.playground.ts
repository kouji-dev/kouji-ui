import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjButtonGroupComponent } from './button-group';
import { KjButtonComponent } from '../button/button';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Tunes orientation, the cascaded
 * variant / size for member buttons, disabled state, and the button count so
 * the segmented joining can be verified visually.
 */
const orientation = signal<'horizontal' | 'vertical'>('horizontal');
const variant = signal<'default' | 'outline' | 'ghost' | 'destructive'>('outline');
const size = signal<'sm' | 'md' | 'lg'>('md');
const count = signal<2 | 3 | 4>(3);
const disabled = signal(false);

const LABELS = ['Save', 'Cancel', 'Delete', 'Archive'] as const;

@Component({
  selector: 'kj-button-group-playground',
  standalone: true,
  imports: [KjButtonGroupComponent, KjButtonComponent],
  template: `
    <kj-button-group
      [kjOrientation]="orientation()"
      [kjVariant]="variant()"
      [kjSize]="size()"
      [kjDisabled]="disabled()"
    >
      @for (label of buttons(); track label) {
        <kj-button>{{ label }}</kj-button>
      }
    </kj-button-group>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjButtonGroupPlaygroundDemo {
  protected readonly orientation = orientation;
  protected readonly variant = variant;
  protected readonly size = size;
  protected readonly count = count;
  protected readonly disabled = disabled;

  protected buttons(): readonly string[] {
    return LABELS.slice(0, count());
  }
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjButtonGroupPlaygroundDemo,
  state: {
    orientation: orientation as unknown as ReturnType<typeof signal>,
    variant: variant as unknown as ReturnType<typeof signal>,
    size: size as unknown as ReturnType<typeof signal>,
    count: count as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'orientation',
      label: 'orientation',
      options: ['horizontal', 'vertical'],
    },
    {
      kind: 'chips',
      name: 'variant',
      label: 'variant',
      options: ['default', 'outline', 'ghost', 'destructive'],
    },
    { kind: 'chips', name: 'size', label: 'size', options: ['sm', 'md', 'lg'] },
    { kind: 'chips', name: 'count', label: 'buttons', options: [2, 3, 4] },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
  ],
  snippet: (values) => {
    const s = values as {
      orientation: string;
      variant: string;
      size: string;
      count: number;
      disabled: boolean;
    };
    const attrs: string[] = [
      `kjOrientation="${s.orientation}"`,
      `kjVariant="${s.variant}"`,
      `kjSize="${s.size}"`,
    ];
    if (s.disabled) attrs.push('[kjDisabled]="true"');
    const children = LABELS.slice(0, s.count)
      .map((label) => `  <kj-button>${label}</kj-button>`)
      .join('\n');
    return `<kj-button-group\n  ${attrs.join('\n  ')}\n>\n${children}\n</kj-button-group>`;
  },
};
