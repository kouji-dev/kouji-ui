import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjPasswordInputComponent } from './password-input';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

const passwordValue = signal<string>('');
const placeholder = signal<string>('Enter your password');
const showToggle = signal(true);
const showStrength = signal(false);
const showCapsLockWarning = signal(false);
const disabled = signal(false);
const invalid = signal(false);

@Component({
  selector: 'kj-password-input-playground',
  standalone: true,
  imports: [KjPasswordInputComponent],
  template: `
    <kj-password-input
      [(kjValue)]="passwordValue"
      [kjPlaceholder]="placeholder()"
      [kjShowToggle]="showToggle()"
      [kjShowStrength]="showStrength()"
      [kjShowCapsLockWarning]="showCapsLockWarning()"
      [kjDisabled]="disabled()"
      [kjInvalid]="invalid()"
      kjAutocomplete="current-password"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPasswordInputPlaygroundDemo {
  protected readonly passwordValue = passwordValue;
  protected readonly placeholder = placeholder;
  protected readonly showToggle = showToggle;
  protected readonly showStrength = showStrength;
  protected readonly showCapsLockWarning = showCapsLockWarning;
  protected readonly disabled = disabled;
  protected readonly invalid = invalid;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjPasswordInputPlaygroundDemo,
  state: {
    passwordValue: passwordValue as unknown as ReturnType<typeof signal>,
    placeholder: placeholder as unknown as ReturnType<typeof signal>,
    showToggle: showToggle as unknown as ReturnType<typeof signal>,
    showStrength: showStrength as unknown as ReturnType<typeof signal>,
    showCapsLockWarning: showCapsLockWarning as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
    invalid: invalid as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'placeholder', label: 'placeholder' },
    { kind: 'toggle', name: 'showToggle', label: 'show toggle' },
    { kind: 'toggle', name: 'showStrength', label: 'show strength meter' },
    { kind: 'toggle', name: 'showCapsLockWarning', label: 'caps-lock warning' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
    { kind: 'toggle', name: 'invalid', label: 'invalid' },
  ],
  snippet: (values) => {
    const s = values as {
      placeholder: string;
      showToggle: boolean;
      showStrength: boolean;
      showCapsLockWarning: boolean;
      disabled: boolean;
      invalid: boolean;
    };
    const attrs: string[] = [
      `[(kjValue)]="password"`,
      `kjPlaceholder="${s.placeholder}"`,
    ];
    if (!s.showToggle) attrs.push('[kjShowToggle]="false"');
    if (s.showStrength) attrs.push('[kjShowStrength]="true"');
    if (s.showCapsLockWarning) attrs.push('[kjShowCapsLockWarning]="true"');
    if (s.disabled) attrs.push('[kjDisabled]="true"');
    if (s.invalid) attrs.push('[kjInvalid]="true"');
    attrs.push('kjAutocomplete="current-password"');
    return `<kj-password-input\n  ${attrs.join('\n  ')}\n/>`;
  },
};
