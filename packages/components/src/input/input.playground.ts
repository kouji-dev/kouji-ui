import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputComponent, type KjInputType, type KjInputVariant } from './input';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Type, variant, value/placeholder,
 * disabled, and invalid cover every public input the wrapper surfaces.
 */
const type = signal<KjInputType>('text');
const variant = signal<KjInputVariant>('default');
const value = signal('');
const placeholder = signal('you@example.com');
const disabled = signal(false);
const invalid = signal(false);

@Component({
  selector: 'kj-input-playground',
  standalone: true,
  imports: [KjInputComponent, FormsModule],
  template: `
    <kj-input
      [type]="type()"
      [variant]="variant()"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [invalid]="invalid()"
      [(ngModel)]="value"
    />
  `,
  styles: [`:host { display: block; max-width: 360px; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjInputPlaygroundDemo {
  protected readonly type = type;
  protected readonly variant = variant;
  protected readonly value = value;
  protected readonly placeholder = placeholder;
  protected readonly disabled = disabled;
  protected readonly invalid = invalid;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjInputPlaygroundDemo,
  state: {
    type: type as unknown as ReturnType<typeof signal>,
    variant: variant as unknown as ReturnType<typeof signal>,
    value: value as unknown as ReturnType<typeof signal>,
    placeholder: placeholder as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
    invalid: invalid as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'type',
      label: 'type',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url', 'color'],
    },
    { kind: 'chips', name: 'variant', label: 'variant', options: ['default', 'sunken'] },
    { kind: 'text', name: 'placeholder', label: 'placeholder' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
    { kind: 'toggle', name: 'invalid', label: 'invalid' },
  ],
  snippet: (values) => {
    const s = values as {
      type: string;
      variant: string;
      placeholder: string;
      disabled: boolean;
      invalid: boolean;
    };
    const attrs: string[] = [`type="${s.type}"`, `variant="${s.variant}"`];
    if (s.placeholder) attrs.push(`placeholder="${s.placeholder}"`);
    if (s.disabled) attrs.push('[disabled]="true"');
    if (s.invalid) attrs.push('[invalid]="true"');
    return `<kj-input\n  ${attrs.join('\n  ')}\n/>`;
  },
};
