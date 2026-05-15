import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjIconDirective, type KjIconColor, type KjIconSize } from '@kouji-ui/core';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. `provideLucideIcons` is a
 * function (no class to mount), so the live stage hosts a single `<span>`
 * wearing the `[kjIcon]` directive. Knobs let users pick any icon name,
 * the size token, and a semantic color.
 */
const name = signal('check');
const size = signal<KjIconSize>('md');
const color = signal<KjIconColor | 'inherit'>('inherit');
const label = signal('');

@Component({
  selector: 'kj-icon-playground',
  standalone: true,
  imports: [KjIconDirective],
  template: `
    <span
      [kjIcon]="name()"
      [kjIconSize]="size()"
      [kjIconColor]="color() === 'inherit' ? null : color()"
      [kjIconLabel]="label() || null"
    ></span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjIconPlaygroundDemo {
  protected readonly name = name;
  protected readonly size = size;
  protected readonly color = color;
  protected readonly label = label;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjIconPlaygroundDemo,
  state: {
    name: name as unknown as ReturnType<typeof signal>,
    size: size as unknown as ReturnType<typeof signal>,
    color: color as unknown as ReturnType<typeof signal>,
    label: label as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'name', label: 'name (lucide)', placeholder: 'check' },
    { kind: 'chips', name: 'size', label: 'size', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    {
      kind: 'chips',
      name: 'color',
      label: 'color',
      options: ['inherit', 'muted', 'primary', 'success', 'warning', 'danger', 'info'],
    },
    { kind: 'text', name: 'label', label: 'aria-label (meaningful)' },
  ],
  snippet: (values) => {
    const s = values as { name: string; size: string; color: string; label: string };
    const attrs: string[] = [`kjIcon="${s.name}"`, `kjIconSize="${s.size}"`];
    if (s.color !== 'inherit') attrs.push(`kjIconColor="${s.color}"`);
    if (s.label) attrs.push(`kjIconLabel="${s.label}"`);
    return `<span\n  ${attrs.join('\n  ')}\n></span>`;
  },
};
