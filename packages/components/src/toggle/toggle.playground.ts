import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjToggleComponent } from './toggle';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals.
 */
const appearance = signal<'press' | 'switch'>('press');
const size = signal<'sm' | 'md' | 'lg'>('md');
const label = signal('B');
const pressed = signal(false);
const disabled = signal(false);

@Component({
  selector: 'kj-toggle-playground',
  standalone: true,
  imports: [KjToggleComponent],
  template: `
    <kj-toggle
      [appearance]="appearance()"
      [size]="size()"
      [(pressed)]="pressed"
      [disabled]="disabled()"
    >{{ label() }}</kj-toggle>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTogglePlaygroundDemo {
  protected readonly appearance = appearance;
  protected readonly size = size;
  protected readonly label = label;
  protected readonly pressed = pressed;
  protected readonly disabled = disabled;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjTogglePlaygroundDemo,
  state: {
    appearance: appearance as unknown as ReturnType<typeof signal>,
    size: size as unknown as ReturnType<typeof signal>,
    label: label as unknown as ReturnType<typeof signal>,
    pressed: pressed as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'appearance', label: 'appearance', options: ['press', 'switch'] },
    { kind: 'chips', name: 'size', label: 'size', options: ['sm', 'md', 'lg'] },
    { kind: 'text', name: 'label', label: 'label' },
    { kind: 'toggle', name: 'pressed', label: 'pressed' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
  ],
  snippet: (values) => {
    const s = values as {
      appearance: string;
      size: string;
      label: string;
      pressed: boolean;
      disabled: boolean;
    };
    const attrs: string[] = [`appearance="${s.appearance}"`, `size="${s.size}"`];
    if (s.pressed) attrs.push('[pressed]="true"');
    if (s.disabled) attrs.push('[disabled]="true"');
    return `<kj-toggle\n  ${attrs.join('\n  ')}\n>${s.label}</kj-toggle>`;
  },
};
