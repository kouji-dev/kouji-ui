import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjSliderComponent } from './slider';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

const value = signal<number>(40);
const min = signal<number>(0);
const max = signal<number>(100);
const step = signal<number>(5);
const orientation = signal<'horizontal' | 'vertical'>('horizontal');
const disabled = signal(false);
const readonlyState = signal(false);

@Component({
  selector: 'kj-slider-playground',
  standalone: true,
  imports: [KjSliderComponent],
  template: `
    <kj-slider
      [(kjValue)]="value"
      [kjMin]="min()"
      [kjMax]="max()"
      [kjStep]="step()"
      [kjOrientation]="orientation()"
      [kjDisabled]="disabled()"
      [kjReadonly]="readonlyState()"
      kjAriaLabel="Volume"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSliderPlaygroundDemo {
  protected readonly value = value;
  protected readonly min = min;
  protected readonly max = max;
  protected readonly step = step;
  protected readonly orientation = orientation;
  protected readonly disabled = disabled;
  protected readonly readonlyState = readonlyState;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjSliderPlaygroundDemo,
  state: {
    value: value as unknown as ReturnType<typeof signal>,
    min: min as unknown as ReturnType<typeof signal>,
    max: max as unknown as ReturnType<typeof signal>,
    step: step as unknown as ReturnType<typeof signal>,
    orientation: orientation as unknown as ReturnType<typeof signal>,
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
      name: 'orientation',
      label: 'orientation',
      options: ['horizontal', 'vertical'],
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
      orientation: string;
      disabled: boolean;
      readonlyState: boolean;
    };
    const attrs: string[] = [
      `[(kjValue)]="value"`,
      `[kjMin]="${s.min}"`,
      `[kjMax]="${s.max}"`,
      `[kjStep]="${s.step}"`,
      `kjOrientation="${s.orientation}"`,
    ];
    if (s.disabled) attrs.push('[kjDisabled]="true"');
    if (s.readonlyState) attrs.push('[kjReadonly]="true"');
    attrs.push('kjAriaLabel="Volume"');
    return `<kj-slider\n  ${attrs.join('\n  ')}\n/>`;
  },
};
