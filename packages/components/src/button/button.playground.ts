import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjButtonComponent } from './button';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. The demo component reads them via
 * its template; the snippet fn reads them via the engine-supplied `values`
 * arg; the engine writes them via {@link PLAYGROUND.state}.
 */
const variant = signal<'default' | 'destructive' | 'ghost' | 'outline' | 'link'>('default');
const size = signal<'sm' | 'md' | 'lg' | 'icon'>('md');
const label = signal('Click me');
const disabled = signal(false);
const loading = signal(false);
const fullWidth = signal(false);

@Component({
  selector: 'kj-button-playground',
  standalone: true,
  imports: [KjButtonComponent],
  template: `
    <kj-button
      [kjVariant]="variant()"
      [kjSize]="size()"
      [kjDisabled]="disabled()"
      [kjLoading]="loading()"
      [kjFullWidth]="fullWidth()"
    >{{ label() }}</kj-button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjButtonPlaygroundDemo {
  protected readonly variant = variant;
  protected readonly size = size;
  protected readonly label = label;
  protected readonly disabled = disabled;
  protected readonly loading = loading;
  protected readonly fullWidth = fullWidth;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjButtonPlaygroundDemo,
  state: {
    variant: variant as unknown as ReturnType<typeof signal>,
    size: size as unknown as ReturnType<typeof signal>,
    label: label as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
    loading: loading as unknown as ReturnType<typeof signal>,
    fullWidth: fullWidth as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'variant',
      label: 'variant',
      options: ['default', 'destructive', 'ghost', 'outline', 'link'],
    },
    { kind: 'chips', name: 'size', label: 'size', options: ['sm', 'md', 'lg', 'icon'] },
    { kind: 'text', name: 'label', label: 'label' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
    { kind: 'toggle', name: 'loading', label: 'loading' },
    { kind: 'toggle', name: 'fullWidth', label: 'full width' },
  ],
  snippet: (values) => {
    const s = values as {
      variant: string;
      size: string;
      label: string;
      disabled: boolean;
      loading: boolean;
      fullWidth: boolean;
    };
    const attrs: string[] = [`kjVariant="${s.variant}"`, `kjSize="${s.size}"`];
    if (s.disabled) attrs.push('[kjDisabled]="true"');
    if (s.loading) attrs.push('[kjLoading]="true"');
    if (s.fullWidth) attrs.push('[kjFullWidth]="true"');
    return `<kj-button\n  ${attrs.join('\n  ')}\n>${s.label}</kj-button>`;
  },
};
