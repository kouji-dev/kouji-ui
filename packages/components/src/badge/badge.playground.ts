import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjBadgeComponent } from './badge';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Tunes variant, size and label so
 * the inline badge can be previewed across its visual register.
 */
const variant = signal<'default' | 'secondary' | 'destructive' | 'outline'>('default');
const size = signal<'xs' | 'sm' | 'md' | 'lg'>('md');
const label = signal('New');

@Component({
  selector: 'kj-badge-playground',
  standalone: true,
  imports: [KjBadgeComponent],
  template: `
    <kj-badge [variant]="variant()" [size]="size()">{{ label() }}</kj-badge>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBadgePlaygroundDemo {
  protected readonly variant = variant;
  protected readonly size = size;
  protected readonly label = label;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjBadgePlaygroundDemo,
  state: {
    variant: variant as unknown as ReturnType<typeof signal>,
    size: size as unknown as ReturnType<typeof signal>,
    label: label as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'variant',
      label: 'variant',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
    { kind: 'chips', name: 'size', label: 'size', options: ['xs', 'sm', 'md', 'lg'] },
    { kind: 'text', name: 'label', label: 'label' },
  ],
  snippet: (values) => {
    const s = values as { variant: string; size: string; label: string };
    return `<kj-badge variant="${s.variant}" size="${s.size}">${s.label}</kj-badge>`;
  },
};
