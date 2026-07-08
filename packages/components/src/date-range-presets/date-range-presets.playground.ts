import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjDateRangePresetsComponent } from './date-range-presets';
import type { KjDateRange } from '@kouji-ui/core';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs cover the listbox's
 * accessible name and the disabled posture. The value is unseeded so the
 * demo shows the resolved range after a preset is picked.
 */
const label = signal('Date range presets');
const disabled = signal(false);
const value = signal<KjDateRange | null>(null);

@Component({
  selector: 'kj-date-range-presets-playground',
  standalone: true,
  imports: [KjDateRangePresetsComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); }
    .selected { font-family: var(--kj-font-mono, monospace); color: var(--kj-fg-muted); font-size: 0.875rem; }
  `],
  template: `
    <kj-date-range-presets
      [(kjValue)]="value"
      [kjLabel]="label()"
      [kjDisabled]="disabled()"
    />
    <p class="selected">
      Selected:
      {{ value() ? value()!.start.toDateString() + ' → ' + value()!.end.toDateString() : '—' }}
    </p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDateRangePresetsPlaygroundDemo {
  protected readonly label = label;
  protected readonly disabled = disabled;
  protected readonly value = value;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjDateRangePresetsPlaygroundDemo,
  state: {
    label: label as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'label', label: 'aria-label' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
  ],
  snippet: (values) => {
    const s = values as { label: string; disabled: boolean };
    const attrs: string[] = [`kjLabel="${s.label}"`, '[(kjValue)]="range"'];
    if (s.disabled) attrs.push('[kjDisabled]="true"');
    return `<kj-date-range-presets\n  ${attrs.join('\n  ')}\n/>`;
  },
};
