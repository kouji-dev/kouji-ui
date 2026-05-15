import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjLinkComponent } from './link';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Variant, size, underline mode,
 * external-link affordance, and disabled state cover every directive input
 * the wrapper forwards.
 */
const variant = signal<'primary' | 'muted' | 'destructive'>('primary');
const size = signal<'sm' | 'md' | 'lg' | 'inherit'>('inherit');
const underline = signal<'always' | 'hover' | 'none'>('hover');
const external = signal(false);
const disabled = signal(false);
const label = signal('Read the docs');
const href = signal('/docs');

@Component({
  selector: 'kj-link-playground',
  standalone: true,
  imports: [KjLinkComponent],
  template: `
    <kj-link
      [kjHref]="href()"
      [kjVariant]="variant()"
      [kjSize]="size()"
      [kjUnderline]="underline()"
      [kjExternal]="external()"
      [kjDisabled]="disabled()"
      [kjTarget]="external() ? '_blank' : undefined"
    >{{ label() }}</kj-link>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjLinkPlaygroundDemo {
  protected readonly variant = variant;
  protected readonly size = size;
  protected readonly underline = underline;
  protected readonly external = external;
  protected readonly disabled = disabled;
  protected readonly label = label;
  protected readonly href = href;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjLinkPlaygroundDemo,
  state: {
    variant: variant as unknown as ReturnType<typeof signal>,
    size: size as unknown as ReturnType<typeof signal>,
    underline: underline as unknown as ReturnType<typeof signal>,
    external: external as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
    label: label as unknown as ReturnType<typeof signal>,
    href: href as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'variant',
      label: 'variant',
      options: ['primary', 'muted', 'destructive'],
    },
    { kind: 'chips', name: 'size', label: 'size', options: ['sm', 'md', 'lg', 'inherit'] },
    {
      kind: 'chips',
      name: 'underline',
      label: 'underline',
      options: ['always', 'hover', 'none'],
    },
    { kind: 'text', name: 'label', label: 'label' },
    { kind: 'text', name: 'href', label: 'href' },
    { kind: 'toggle', name: 'external', label: 'external' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
  ],
  snippet: (values) => {
    const s = values as {
      variant: string;
      size: string;
      underline: string;
      external: boolean;
      disabled: boolean;
      label: string;
      href: string;
    };
    const attrs: string[] = [
      `kjHref="${s.href}"`,
      `kjVariant="${s.variant}"`,
      `kjSize="${s.size}"`,
      `kjUnderline="${s.underline}"`,
    ];
    if (s.external) {
      attrs.push('[kjExternal]="true"');
      attrs.push('kjTarget="_blank"');
    }
    if (s.disabled) attrs.push('[kjDisabled]="true"');
    return `<kj-link\n  ${attrs.join('\n  ')}\n>${s.label}</kj-link>`;
  },
};
