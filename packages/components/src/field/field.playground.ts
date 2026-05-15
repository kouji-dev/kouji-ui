import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjFieldComponent,
  KjFieldLabelComponent,
  KjFieldHelpComponent,
  KjFieldErrorComponent,
} from './field';
import { KjInputComponent } from '../input/input';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs toggle the field's posture
 * (required, invalid, disabled) and switch the supporting message between
 * help text and an error message.
 */
const orientation = signal<'vertical' | 'horizontal'>('vertical');
const label = signal('Email');
const helpText = signal("We'll never share your email.");
const required = signal(false);
const invalid = signal(false);
const disabled = signal(false);

@Component({
  selector: 'kj-field-playground',
  standalone: true,
  imports: [
    KjFieldComponent,
    KjFieldLabelComponent,
    KjFieldHelpComponent,
    KjFieldErrorComponent,
    KjInputComponent,
  ],
  styles: [`:host { display: block; max-width: 28rem; }`],
  template: `
    <kj-field
      [kjFieldOrientation]="orientation()"
      [kjRequired]="required()"
      [kjInvalid]="invalid()"
      [kjDisabled]="disabled()"
    >
      <kj-field-label>{{ label() }}</kj-field-label>
      <kj-input type="email" placeholder="you@example.com" [invalid]="invalid()" [disabled]="disabled()" />
      @if (invalid()) {
        <kj-field-error>Please enter a valid email address.</kj-field-error>
      } @else {
        <kj-field-help>{{ helpText() }}</kj-field-help>
      }
    </kj-field>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjFieldPlaygroundDemo {
  protected readonly orientation = orientation;
  protected readonly label = label;
  protected readonly helpText = helpText;
  protected readonly required = required;
  protected readonly invalid = invalid;
  protected readonly disabled = disabled;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjFieldPlaygroundDemo,
  state: {
    orientation: orientation as unknown as ReturnType<typeof signal>,
    label: label as unknown as ReturnType<typeof signal>,
    helpText: helpText as unknown as ReturnType<typeof signal>,
    required: required as unknown as ReturnType<typeof signal>,
    invalid: invalid as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'orientation',
      label: 'orientation',
      options: ['vertical', 'horizontal'],
    },
    { kind: 'text', name: 'label', label: 'label' },
    { kind: 'text', name: 'helpText', label: 'help' },
    { kind: 'toggle', name: 'required', label: 'required' },
    { kind: 'toggle', name: 'invalid', label: 'invalid' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
  ],
  snippet: (values) => {
    const s = values as {
      orientation: string;
      label: string;
      helpText: string;
      required: boolean;
      invalid: boolean;
      disabled: boolean;
    };
    const attrs: string[] = [`kjFieldOrientation="${s.orientation}"`];
    if (s.required) attrs.push('[kjRequired]="true"');
    if (s.invalid) attrs.push('[kjInvalid]="true"');
    if (s.disabled) attrs.push('[kjDisabled]="true"');
    const lines: string[] = [`<kj-field\n  ${attrs.join('\n  ')}\n>`];
    lines.push(`  <kj-field-label>${s.label}</kj-field-label>`);
    lines.push(`  <kj-input type="email" placeholder="you@example.com" />`);
    if (s.invalid) {
      lines.push(`  <kj-field-error>Please enter a valid email address.</kj-field-error>`);
    } else if (s.helpText) {
      lines.push(`  <kj-field-help>${s.helpText}</kj-field-help>`);
    }
    lines.push('</kj-field>');
    return lines.join('\n');
  },
};
