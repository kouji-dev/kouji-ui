import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjDatePickerComponent } from './date-picker';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs cover the placeholder, the
 * first-day-of-week, and the read-only / disabled postures. The seeded value
 * tracks today's date so the popover anchors against a populated field.
 */
const placeholder = signal('Pick a date');
const firstDayOfWeek = signal<0 | 1 | 6>(0);
const readonly = signal(false);
const disabled = signal(false);
const value = signal<Date | null>(new Date());

@Component({
  selector: 'kj-date-picker-playground',
  standalone: true,
  imports: [KjDatePickerComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); min-height: 20rem; }
    .selected { font-family: var(--kj-font-mono, monospace); color: var(--kj-fg-muted); font-size: 0.875rem; }
  `],
  template: `
    <kj-date-picker
      [(kjValue)]="value"
      [kjPlaceholder]="placeholder()"
      [kjFirstDayOfWeek]="firstDayOfWeek()"
      [kjReadonly]="readonly()"
      [kjDisabled]="disabled()"
    />
    <p class="selected">Selected: {{ value()?.toDateString() ?? '—' }}</p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDatePickerPlaygroundDemo {
  protected readonly placeholder = placeholder;
  protected readonly firstDayOfWeek = firstDayOfWeek;
  protected readonly readonly = readonly;
  protected readonly disabled = disabled;
  protected readonly value = value;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjDatePickerPlaygroundDemo,
  state: {
    placeholder: placeholder as unknown as ReturnType<typeof signal>,
    firstDayOfWeek: firstDayOfWeek as unknown as ReturnType<typeof signal>,
    readonly: readonly as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'placeholder', label: 'placeholder' },
    {
      kind: 'chips',
      name: 'firstDayOfWeek',
      label: 'week starts',
      options: [0, 1, 6],
    },
    { kind: 'toggle', name: 'readonly', label: 'read-only' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
  ],
  snippet: (values) => {
    const s = values as {
      placeholder: string;
      firstDayOfWeek: number;
      readonly: boolean;
      disabled: boolean;
    };
    const attrs: string[] = [
      `kjPlaceholder="${s.placeholder}"`,
      `[kjFirstDayOfWeek]="${s.firstDayOfWeek}"`,
      '[(kjValue)]="when"',
    ];
    if (s.readonly) attrs.push('[kjReadonly]="true"');
    if (s.disabled) attrs.push('[kjDisabled]="true"');
    return `<kj-date-picker\n  ${attrs.join('\n  ')}\n/>`;
  },
};
