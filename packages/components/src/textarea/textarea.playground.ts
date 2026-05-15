import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjTextareaComponent } from './textarea';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals.
 */
const size = signal<'sm' | 'md' | 'lg'>('md');
const rows = signal<2 | 3 | 4 | 6>(4);
const placeholder = signal('Tell us about yourself…');
const disabled = signal(false);
const invalid = signal(false);

@Component({
  selector: 'kj-textarea-playground',
  standalone: true,
  imports: [KjTextareaComponent],
  template: `
    <kj-textarea
      [kjSize]="size()"
      [kjRows]="rows()"
      [kjPlaceholder]="placeholder()"
      [kjDisabled]="disabled()"
      [kjInvalid]="invalid()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTextareaPlaygroundDemo {
  protected readonly size = size;
  protected readonly rows = rows;
  protected readonly placeholder = placeholder;
  protected readonly disabled = disabled;
  protected readonly invalid = invalid;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjTextareaPlaygroundDemo,
  state: {
    size: size as unknown as ReturnType<typeof signal>,
    rows: rows as unknown as ReturnType<typeof signal>,
    placeholder: placeholder as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
    invalid: invalid as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'size', label: 'size', options: ['sm', 'md', 'lg'] },
    { kind: 'chips', name: 'rows', label: 'rows', options: [2, 3, 4, 6] },
    { kind: 'text', name: 'placeholder', label: 'placeholder' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
    { kind: 'toggle', name: 'invalid', label: 'invalid' },
  ],
  snippet: (values) => {
    const s = values as {
      size: string;
      rows: number;
      placeholder: string;
      disabled: boolean;
      invalid: boolean;
    };
    const attrs: string[] = [
      `kjSize="${s.size}"`,
      `[kjRows]="${s.rows}"`,
      `kjPlaceholder="${s.placeholder}"`,
    ];
    if (s.disabled) attrs.push('[kjDisabled]="true"');
    if (s.invalid) attrs.push('[kjInvalid]="true"');
    return `<kj-textarea\n  ${attrs.join('\n  ')}\n/>`;
  },
};
