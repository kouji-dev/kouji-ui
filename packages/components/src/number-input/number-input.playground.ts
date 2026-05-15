import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjNumberInputComponent } from './number-input';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs cover the numeric envelope
 * (min/max/step), formatting locale, and read-only / disabled toggles.
 */
const value = signal<number>(50);
const min = signal<number>(0);
const max = signal<number>(100);
const step = signal<number>(5);
const stepperLayout = signal<'flanking' | 'stacked'>('flanking');
const disabled = signal(false);
const readonlyState = signal(false);

@Component({
  selector: 'kj-number-input-playground',
  standalone: true,
  imports: [KjNumberInputComponent],
  template: `
    <kj-number-input
      [(kjValue)]="value"
      [kjMin]="min()"
      [kjMax]="max()"
      [kjStep]="step()"
      [kjStepperLayout]="stepperLayout()"
      [kjDisabled]="disabled()"
      [kjReadonly]="readonlyState()"
      kjAriaLabel="Quantity"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjNumberInputPlaygroundDemo {
  protected readonly value = value;
  protected readonly min = min;
  protected readonly max = max;
  protected readonly step = step;
  protected readonly stepperLayout = stepperLayout;
  protected readonly disabled = disabled;
  protected readonly readonlyState = readonlyState;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjNumberInputPlaygroundDemo,
  state: {
    value: value as unknown as ReturnType<typeof signal>,
    min: min as unknown as ReturnType<typeof signal>,
    max: max as unknown as ReturnType<typeof signal>,
    step: step as unknown as ReturnType<typeof signal>,
    stepperLayout: stepperLayout as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
    readonlyState: readonlyState as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'number', name: 'value', label: 'value' },
    { kind: 'number', name: 'min', label: 'min' },
    { kind: 'number', name: 'max', label: 'max' },
    { kind: 'number', name: 'step', label: 'step', min: 1 },
    {
      kind: 'chips',
      name: 'stepperLayout',
      label: 'stepper layout',
      options: ['flanking', 'stacked'],
    },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
    { kind: 'toggle', name: 'readonlyState', label: 'readonly' },
  ],
  snippet: (values) => {
    const s = values as {
      value: number;
      min: number;
      max: number;
      step: number;
      stepperLayout: string;
      disabled: boolean;
      readonlyState: boolean;
    };
    const attrs: string[] = [
      `[(kjValue)]="value"`,
      `[kjMin]="${s.min}"`,
      `[kjMax]="${s.max}"`,
      `[kjStep]="${s.step}"`,
      `kjStepperLayout="${s.stepperLayout}"`,
    ];
    if (s.disabled) attrs.push('[kjDisabled]="true"');
    if (s.readonlyState) attrs.push('[kjReadonly]="true"');
    attrs.push('kjAriaLabel="Quantity"');
    return `<kj-number-input\n  ${attrs.join('\n  ')}\n/>`;
  },
};
