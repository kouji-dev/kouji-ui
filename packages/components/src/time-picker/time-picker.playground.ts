import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjTimePickerComponent } from './time-picker';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. The value signal is a string so it
 * round-trips through the text control cleanly.
 */
const value = signal<string>('09:30');
const twelveHour = signal(false);
const showSeconds = signal(false);
const disabled = signal(false);
const invalid = signal(false);

@Component({
  selector: 'kj-time-picker-playground',
  standalone: true,
  imports: [KjTimePickerComponent],
  template: `
    <kj-time-picker
      [(kjValue)]="value"
      kjValueShape="string"
      [kj12Hour]="twelveHour()"
      [kjShowSeconds]="showSeconds()"
      [kjDisabled]="disabled()"
      [kjInvalid]="invalid()"
      kjAriaLabel="Time"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTimePickerPlaygroundDemo {
  protected readonly value = value;
  protected readonly twelveHour = twelveHour;
  protected readonly showSeconds = showSeconds;
  protected readonly disabled = disabled;
  protected readonly invalid = invalid;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjTimePickerPlaygroundDemo,
  state: {
    value: value as unknown as ReturnType<typeof signal>,
    twelveHour: twelveHour as unknown as ReturnType<typeof signal>,
    showSeconds: showSeconds as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
    invalid: invalid as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'value', label: 'value', placeholder: 'HH:MM' },
    { kind: 'toggle', name: 'twelveHour', label: '12-hour' },
    { kind: 'toggle', name: 'showSeconds', label: 'show seconds' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
    { kind: 'toggle', name: 'invalid', label: 'invalid' },
  ],
  snippet: (values) => {
    const s = values as {
      value: string;
      twelveHour: boolean;
      showSeconds: boolean;
      disabled: boolean;
      invalid: boolean;
    };
    const attrs: string[] = [`[(kjValue)]="time"`, `kjValueShape="string"`];
    if (s.twelveHour) attrs.push('[kj12Hour]="true"');
    if (s.showSeconds) attrs.push('[kjShowSeconds]="true"');
    if (s.disabled) attrs.push('[kjDisabled]="true"');
    if (s.invalid) attrs.push('[kjInvalid]="true"');
    attrs.push('kjAriaLabel="Time"');
    return `<kj-time-picker\n  ${attrs.join('\n  ')}\n/>\n\n// time = signal('${s.value}')`;
  },
};
