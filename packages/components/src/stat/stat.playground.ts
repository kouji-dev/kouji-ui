import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjStat, type KjStatDirection } from './stat';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

const label = signal('Revenue');
const value = signal('$48,200');
const change = signal('+12%');
const direction = signal<KjStatDirection>('up');
const tone = signal<'neutral' | 'info' | 'success' | 'warning' | 'error'>('success');
const size = signal<'sm' | 'md' | 'lg'>('md');
const loading = signal(false);

@Component({
  selector: 'kj-stat-playground',
  standalone: true,
  imports: [KjStat],
  template: `
    <kj-stat
      [label]="label()"
      [value]="value()"
      [change]="change()"
      [direction]="direction()"
      [tone]="tone()"
      [size]="size()"
      [loading]="loading()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjStatPlaygroundDemo {
  protected readonly label = label;
  protected readonly value = value;
  protected readonly change = change;
  protected readonly direction = direction;
  protected readonly tone = tone;
  protected readonly size = size;
  protected readonly loading = loading;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjStatPlaygroundDemo,
  state: {
    label: label as unknown as ReturnType<typeof signal>,
    value: value as unknown as ReturnType<typeof signal>,
    change: change as unknown as ReturnType<typeof signal>,
    direction: direction as unknown as ReturnType<typeof signal>,
    tone: tone as unknown as ReturnType<typeof signal>,
    size: size as unknown as ReturnType<typeof signal>,
    loading: loading as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'label', label: 'label' },
    { kind: 'text', name: 'value', label: 'value' },
    { kind: 'text', name: 'change', label: 'change' },
    { kind: 'chips', name: 'direction', label: 'direction', options: ['up', 'down', 'none'] },
    {
      kind: 'chips',
      name: 'tone',
      label: 'tone',
      options: ['neutral', 'info', 'success', 'warning', 'error'],
    },
    { kind: 'chips', name: 'size', label: 'size', options: ['sm', 'md', 'lg'] },
    { kind: 'toggle', name: 'loading', label: 'loading' },
  ],
  snippet: (values) => {
    const s = values as Record<string, string | boolean>;
    return `<kj-stat label="${s['label']}" value="${s['value']}" change="${s['change']}" direction="${s['direction']}" tone="${s['tone']}" size="${s['size']}"${s['loading'] ? ' loading' : ''} />`;
  },
};
