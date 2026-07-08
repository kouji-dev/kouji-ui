import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjDatetimePickerComponent } from './datetime-picker';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs cover the trigger
 * placeholder, size preset, and the read-only posture. The seeded value
 * carries both a date and a time so the trigger renders a populated field.
 */
const placeholder = signal('Pick date & time');
const size = signal<'xs' | 'sm' | 'md' | 'lg'>('md');
const readonly = signal(false);
const value = signal<Date | null>(new Date());

@Component({
  selector: 'kj-datetime-picker-playground',
  standalone: true,
  imports: [KjDatetimePickerComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); min-height: 20rem; }
    .selected { font-family: var(--kj-font-mono, monospace); color: var(--kj-fg-muted); font-size: 0.875rem; }
  `],
  template: `
    <kj-datetime-picker
      [(kjValue)]="value"
      [kjPlaceholder]="placeholder()"
      [kjSize]="size()"
      [kjReadonly]="readonly()"
    />
    <p class="selected">Selected: {{ value()?.toLocaleString() ?? '—' }}</p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDatetimePickerPlaygroundDemo {
  protected readonly placeholder = placeholder;
  protected readonly size = size;
  protected readonly readonly = readonly;
  protected readonly value = value;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjDatetimePickerPlaygroundDemo,
  state: {
    placeholder: placeholder as unknown as ReturnType<typeof signal>,
    size: size as unknown as ReturnType<typeof signal>,
    readonly: readonly as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'placeholder', label: 'placeholder' },
    { kind: 'chips', name: 'size', label: 'size', options: ['xs', 'sm', 'md', 'lg'] },
    { kind: 'toggle', name: 'readonly', label: 'read-only' },
  ],
  snippet: (values) => {
    const s = values as { placeholder: string; size: string; readonly: boolean };
    const attrs: string[] = [
      `kjPlaceholder="${s.placeholder}"`,
      `kjSize="${s.size}"`,
      '[(kjValue)]="when"',
    ];
    if (s.readonly) attrs.push('[kjReadonly]="true"');
    return `<kj-datetime-picker\n  ${attrs.join('\n  ')}\n/>`;
  },
};
