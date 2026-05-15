import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjColorPickerComponent } from './color-picker';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs cover the wire format, the
 * presence of the alpha slider, the inline hex input, the disabled posture,
 * and a seed color so the swatch label tracks the picker value.
 */
const value = signal('#b8f500');
const format = signal<'hex' | 'rgb' | 'hsl'>('hex');
const showAlpha = signal(false);
const showHexInput = signal(true);
const disabled = signal(false);
const invalid = signal(false);

@Component({
  selector: 'kj-color-picker-playground',
  standalone: true,
  imports: [KjColorPickerComponent, FormsModule],
  styles: [`
    :host { display: flex; gap: var(--kj-space-md); align-items: center; }
    code { font: 0.8125rem/1 var(--kj-font-mono, monospace); color: var(--kj-fg-muted); }
  `],
  template: `
    <kj-color-picker
      [(ngModel)]="value"
      [kjFormat]="format()"
      [kjShowAlpha]="showAlpha()"
      [kjShowHexInput]="showHexInput()"
      [kjDisabled]="disabled()"
      [kjInvalid]="invalid()"
    />
    <code>{{ value() }}</code>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjColorPickerPlaygroundDemo {
  protected readonly value = value;
  protected readonly format = format;
  protected readonly showAlpha = showAlpha;
  protected readonly showHexInput = showHexInput;
  protected readonly disabled = disabled;
  protected readonly invalid = invalid;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjColorPickerPlaygroundDemo,
  state: {
    value: value as unknown as ReturnType<typeof signal>,
    format: format as unknown as ReturnType<typeof signal>,
    showAlpha: showAlpha as unknown as ReturnType<typeof signal>,
    showHexInput: showHexInput as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
    invalid: invalid as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'format', label: 'format', options: ['hex', 'rgb', 'hsl'] },
    { kind: 'text', name: 'value', label: 'value' },
    { kind: 'toggle', name: 'showAlpha', label: 'alpha slider' },
    { kind: 'toggle', name: 'showHexInput', label: 'hex input' },
    { kind: 'toggle', name: 'invalid', label: 'invalid' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
  ],
  snippet: (values) => {
    const s = values as {
      value: string;
      format: string;
      showAlpha: boolean;
      showHexInput: boolean;
      disabled: boolean;
      invalid: boolean;
    };
    const attrs: string[] = [`kjFormat="${s.format}"`];
    if (s.showAlpha) attrs.push('[kjShowAlpha]="true"');
    if (!s.showHexInput) attrs.push('[kjShowHexInput]="false"');
    if (s.invalid) attrs.push('[kjInvalid]="true"');
    if (s.disabled) attrs.push('[kjDisabled]="true"');
    attrs.push('[(ngModel)]="color"');
    return `<kj-color-picker\n  ${attrs.join('\n  ')}\n/>`;
  },
};
