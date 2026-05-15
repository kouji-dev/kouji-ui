import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  KjStepperComponent,
  KjStepComponent,
  KjStepLabelComponent,
  KjStepContentComponent,
} from './stepper';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Compound stepper exposes step
 * count + active index + linear/orientation knobs.
 */
const stepCount = signal<2 | 3 | 4 | 5>(4);
const active = signal<0 | 1 | 2 | 3 | 4>(2);
const linear = signal(false);
const orientation = signal<'horizontal' | 'vertical'>('horizontal');

const STEP_LABELS = ['Account', 'Profile', 'Review', 'Confirm', 'Done'] as const;

@Component({
  selector: 'kj-stepper-playground',
  standalone: true,
  imports: [
    KjStepperComponent,
    KjStepComponent,
    KjStepLabelComponent,
    KjStepContentComponent,
  ],
  template: `
    <kj-stepper
      [(kjActiveStep)]="active"
      [kjLinear]="linear()"
      [kjOrientation]="orientation()"
    >
      @for (label of steps(); track label; let i = $index) {
        <kj-step [kjStepCompleted]="active() > i">
          <kj-step-label>{{ label }}</kj-step-label>
          <kj-step-content>Step {{ i + 1 }} — {{ label }}.</kj-step-content>
        </kj-step>
      }
    </kj-stepper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjStepperPlaygroundDemo {
  protected readonly active = active;
  protected readonly linear = linear;
  protected readonly orientation = orientation;
  protected readonly steps = computed(() =>
    STEP_LABELS.slice(0, stepCount()),
  );
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjStepperPlaygroundDemo,
  state: {
    stepCount: stepCount as unknown as ReturnType<typeof signal>,
    active: active as unknown as ReturnType<typeof signal>,
    linear: linear as unknown as ReturnType<typeof signal>,
    orientation: orientation as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'stepCount', label: 'steps', options: [2, 3, 4, 5] },
    { kind: 'chips', name: 'active', label: 'active', options: [0, 1, 2, 3, 4] },
    { kind: 'chips', name: 'orientation', label: 'orientation', options: ['horizontal', 'vertical'] },
    { kind: 'toggle', name: 'linear', label: 'linear' },
  ],
  snippet: (values) => {
    const s = values as {
      stepCount: number;
      active: number;
      linear: boolean;
      orientation: string;
    };
    const labels = STEP_LABELS.slice(0, s.stepCount);
    const steps = labels
      .map((label, i) => `  <kj-step [kjStepCompleted]="active() > ${i}">
    <kj-step-label>${label}</kj-step-label>
    <kj-step-content>Step ${i + 1} — ${label}.</kj-step-content>
  </kj-step>`)
      .join('\n');
    const attrs: string[] = ['[(kjActiveStep)]="active"'];
    if (s.linear) attrs.push('[kjLinear]="true"');
    if (s.orientation !== 'horizontal') attrs.push(`kjOrientation="${s.orientation}"`);
    return `<kj-stepper\n  ${attrs.join('\n  ')}\n>\n${steps}\n</kj-stepper>`;
  },
};
