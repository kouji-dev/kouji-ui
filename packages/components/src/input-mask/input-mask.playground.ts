import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputMaskComponent } from './input-mask';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Mask preset, mode, disabled,
 * invalid, and auto-clear cover the surface the wrapper exposes. The
 * mask preset is a chips list since the playground engine doesn't yet
 * ship a free-text control validated against a token regex.
 */
const mask = signal<'(999) 999-9999' | '99/99/9999' | '9999 9999 9999 9999' | 'aaa-999'>(
  '(999) 999-9999',
);
const maskMode = signal<'unmasked' | 'masked'>('unmasked');
const disabled = signal(false);
const invalid = signal(false);
const autoClear = signal(false);

@Component({
  selector: 'kj-input-mask-playground',
  standalone: true,
  imports: [KjInputMaskComponent, FormsModule],
  styles: [`:host { display: block; max-width: 360px; }`],
  template: `
    <kj-input-mask
      [kjMask]="mask()"
      [kjMaskMode]="maskMode()"
      [kjDisabled]="disabled()"
      [kjInvalid]="invalid()"
      [kjAutoClear]="autoClear()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjInputMaskPlaygroundDemo {
  protected readonly mask = mask;
  protected readonly maskMode = maskMode;
  protected readonly disabled = disabled;
  protected readonly invalid = invalid;
  protected readonly autoClear = autoClear;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjInputMaskPlaygroundDemo,
  state: {
    mask: mask as unknown as ReturnType<typeof signal>,
    maskMode: maskMode as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
    invalid: invalid as unknown as ReturnType<typeof signal>,
    autoClear: autoClear as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'mask',
      label: 'mask',
      options: ['(999) 999-9999', '99/99/9999', '9999 9999 9999 9999', 'aaa-999'],
    },
    { kind: 'chips', name: 'maskMode', label: 'mode', options: ['unmasked', 'masked'] },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
    { kind: 'toggle', name: 'invalid', label: 'invalid' },
    { kind: 'toggle', name: 'autoClear', label: 'auto clear' },
  ],
  snippet: (values) => {
    const s = values as {
      mask: string;
      maskMode: string;
      disabled: boolean;
      invalid: boolean;
      autoClear: boolean;
    };
    const attrs: string[] = [`kjMask="${s.mask}"`, `kjMaskMode="${s.maskMode}"`];
    if (s.disabled) attrs.push('[kjDisabled]="true"');
    if (s.invalid) attrs.push('[kjInvalid]="true"');
    if (s.autoClear) attrs.push('[kjAutoClear]="true"');
    return `<kj-input-mask\n  ${attrs.join('\n  ')}\n/>`;
  },
};
