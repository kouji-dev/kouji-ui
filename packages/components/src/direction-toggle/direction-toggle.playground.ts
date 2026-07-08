import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjDirectionToggle } from './direction-toggle';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. The toggle's own direction is
 * driven by the shared `KjLocale`, so the tunable surface is its accessible
 * name and the projected text label shown on the button face.
 */
const ariaLabel = signal('Toggle right-to-left layout');
const label = signal('LTR / RTL');

@Component({
  selector: 'kj-direction-toggle-playground',
  standalone: true,
  imports: [KjDirectionToggle],
  template: `
    <kj-direction-toggle [kjAriaLabel]="ariaLabel()">{{ label() }}</kj-direction-toggle>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDirectionTogglePlaygroundDemo {
  protected readonly ariaLabel = ariaLabel;
  protected readonly label = label;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjDirectionTogglePlaygroundDemo,
  state: {
    ariaLabel: ariaLabel as unknown as ReturnType<typeof signal>,
    label: label as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'ariaLabel', label: 'aria-label' },
    { kind: 'text', name: 'label', label: 'label' },
  ],
  snippet: (values) => {
    const s = values as { ariaLabel: string; label: string };
    return `<kj-direction-toggle kjAriaLabel="${s.ariaLabel}">${s.label}</kj-direction-toggle>`;
  },
};
