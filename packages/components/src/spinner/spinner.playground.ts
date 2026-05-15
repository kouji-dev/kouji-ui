import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjSpinnerComponent } from './spinner';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals.
 */
const variant = signal<'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info'>('neutral');
const size = signal<'xs' | 'sm' | 'md' | 'lg'>('md');
const animation = signal<'spin' | 'dots' | 'bars'>('spin');
const ariaLabel = signal('Loading');

@Component({
  selector: 'kj-spinner-playground',
  standalone: true,
  imports: [KjSpinnerComponent],
  template: `
    <kj-spinner
      [kjVariant]="variant()"
      [kjSize]="size()"
      [kjAnimation]="animation()"
      [kjAriaLabel]="ariaLabel()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSpinnerPlaygroundDemo {
  protected readonly variant = variant;
  protected readonly size = size;
  protected readonly animation = animation;
  protected readonly ariaLabel = ariaLabel;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjSpinnerPlaygroundDemo,
  state: {
    variant: variant as unknown as ReturnType<typeof signal>,
    size: size as unknown as ReturnType<typeof signal>,
    animation: animation as unknown as ReturnType<typeof signal>,
    ariaLabel: ariaLabel as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'variant',
      label: 'variant',
      options: ['neutral', 'primary', 'success', 'warning', 'error', 'info'],
    },
    { kind: 'chips', name: 'size', label: 'size', options: ['xs', 'sm', 'md', 'lg'] },
    { kind: 'chips', name: 'animation', label: 'animation', options: ['spin', 'dots', 'bars'] },
    { kind: 'text', name: 'ariaLabel', label: 'aria label' },
  ],
  snippet: (values) => {
    const s = values as {
      variant: string;
      size: string;
      animation: string;
      ariaLabel: string;
    };
    const attrs: string[] = [
      `kjVariant="${s.variant}"`,
      `kjSize="${s.size}"`,
      `kjAnimation="${s.animation}"`,
      `kjAriaLabel="${s.ariaLabel}"`,
    ];
    return `<kj-spinner\n  ${attrs.join('\n  ')}\n/>`;
  },
};
