import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputOtpComponent } from './input-otp';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs cover OTP length, the
 * character-set restriction, the masked / non-masked render, plus the
 * disabled and invalid states. Length 6 keeps a visual separator at
 * index 2 to anchor the decorative-dash story.
 */
const length = signal<4 | 6 | 8>(6);
const charSet = signal<'digits' | 'alphanumeric'>('digits');
const masked = signal(false);
const disabled = signal(false);
const invalid = signal(false);
const withSeparator = signal(false);
const value = signal('');

@Component({
  selector: 'kj-input-otp-playground',
  standalone: true,
  imports: [KjInputOtpComponent, FormsModule],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--kj-space-lg);
    }
  `],
  template: `
    <kj-input-otp
      [kjLength]="length()"
      [kjCharSet]="charSet()"
      [kjMask]="masked()"
      [kjDisabled]="disabled()"
      [kjInvalid]="invalid()"
      [kjSeparatorAfter]="withSeparator() ? [separatorIndex()] : []"
      kjAriaLabel="Verification code"
      [(ngModel)]="value"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjInputOtpPlaygroundDemo {
  protected readonly length = length;
  protected readonly charSet = charSet;
  protected readonly masked = masked;
  protected readonly disabled = disabled;
  protected readonly invalid = invalid;
  protected readonly withSeparator = withSeparator;
  protected readonly value = value;

  protected separatorIndex(): number {
    return Math.floor(this.length() / 2) - 1;
  }
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjInputOtpPlaygroundDemo,
  state: {
    length: length as unknown as ReturnType<typeof signal>,
    charSet: charSet as unknown as ReturnType<typeof signal>,
    masked: masked as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
    invalid: invalid as unknown as ReturnType<typeof signal>,
    withSeparator: withSeparator as unknown as ReturnType<typeof signal>,
    value: value as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'length', label: 'length', options: [4, 6, 8] },
    {
      kind: 'chips',
      name: 'charSet',
      label: 'charset',
      options: ['digits', 'alphanumeric'],
    },
    { kind: 'toggle', name: 'masked', label: 'masked' },
    { kind: 'toggle', name: 'withSeparator', label: 'with separator' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
    { kind: 'toggle', name: 'invalid', label: 'invalid' },
  ],
  snippet: (values) => {
    const s = values as {
      length: number;
      charSet: string;
      masked: boolean;
      disabled: boolean;
      invalid: boolean;
      withSeparator: boolean;
    };
    const attrs: string[] = [
      `[kjLength]="${s.length}"`,
      `kjCharSet="${s.charSet}"`,
      `kjAriaLabel="Verification code"`,
    ];
    if (s.masked) attrs.push('[kjMask]="true"');
    if (s.disabled) attrs.push('[kjDisabled]="true"');
    if (s.invalid) attrs.push('[kjInvalid]="true"');
    if (s.withSeparator) {
      const idx = Math.floor(s.length / 2) - 1;
      attrs.push(`[kjSeparatorAfter]="[${idx}]"`);
    }
    return `<kj-input-otp\n  ${attrs.join('\n  ')}\n/>`;
  },
};
