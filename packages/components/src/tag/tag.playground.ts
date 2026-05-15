import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjTagComponent } from './tag';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals.
 */
const variant = signal<'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'outline' | 'ghost'>('default');
const size = signal<'xs' | 'sm' | 'md' | 'lg'>('md');
const label = signal('New');
const disabled = signal(false);

@Component({
  selector: 'kj-tag-playground',
  standalone: true,
  imports: [KjTagComponent],
  template: `
    <kj-tag
      [kjVariant]="variant()"
      [kjSize]="size()"
      [kjTagDisabled]="disabled()"
    >{{ label() }}</kj-tag>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTagPlaygroundDemo {
  protected readonly variant = variant;
  protected readonly size = size;
  protected readonly label = label;
  protected readonly disabled = disabled;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjTagPlaygroundDemo,
  state: {
    variant: variant as unknown as ReturnType<typeof signal>,
    size: size as unknown as ReturnType<typeof signal>,
    label: label as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'variant',
      label: 'variant',
      options: ['default', 'secondary', 'success', 'warning', 'destructive', 'info', 'outline', 'ghost'],
    },
    { kind: 'chips', name: 'size', label: 'size', options: ['xs', 'sm', 'md', 'lg'] },
    { kind: 'text', name: 'label', label: 'label' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
  ],
  snippet: (values) => {
    const s = values as {
      variant: string;
      size: string;
      label: string;
      disabled: boolean;
    };
    const attrs: string[] = [`kjVariant="${s.variant}"`, `kjSize="${s.size}"`];
    if (s.disabled) attrs.push('[kjTagDisabled]="true"');
    return `<kj-tag\n  ${attrs.join('\n  ')}\n>${s.label}</kj-tag>`;
  },
};
