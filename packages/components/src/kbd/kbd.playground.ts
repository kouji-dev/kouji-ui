import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjKbdComponent } from './kbd';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs let users drive the kbd
 * size scale (the only library component that legitimately ships below
 * `sm`), the visible label, and the optional `aria-label` override for
 * unicode-glyph keys (⌘, ⌥, ↵).
 */
const size = signal<'xs' | 'sm' | 'md' | 'lg'>('md');
const label = signal('Enter');
const ariaLabel = signal('');

@Component({
  selector: 'kj-kbd-playground',
  standalone: true,
  imports: [KjKbdComponent],
  template: `
    <kj-kbd
      [kjSize]="size()"
      [kjKbdAriaLabel]="ariaLabel() || undefined"
    >{{ label() }}</kj-kbd>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjKbdPlaygroundDemo {
  protected readonly size = size;
  protected readonly label = label;
  protected readonly ariaLabel = ariaLabel;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjKbdPlaygroundDemo,
  state: {
    size: size as unknown as ReturnType<typeof signal>,
    label: label as unknown as ReturnType<typeof signal>,
    ariaLabel: ariaLabel as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'size', label: 'size', options: ['xs', 'sm', 'md', 'lg'] },
    { kind: 'text', name: 'label', label: 'label' },
    { kind: 'text', name: 'ariaLabel', label: 'aria-label (glyph keys)', placeholder: 'Command' },
  ],
  snippet: (values) => {
    const s = values as { size: string; label: string; ariaLabel: string };
    const attrs: string[] = [`kjSize="${s.size}"`];
    if (s.ariaLabel) attrs.push(`kjKbdAriaLabel="${s.ariaLabel}"`);
    return `<kj-kbd\n  ${attrs.join('\n  ')}\n>${s.label}</kj-kbd>`;
  },
};
