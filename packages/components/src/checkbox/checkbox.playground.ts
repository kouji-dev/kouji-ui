import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjCheckboxComponent } from './checkbox';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs cover the visible axes of
 * `KjCheckboxComponent` (size, checked, indeterminate, disabled) plus the
 * label text projected into the slot.
 */
const size = signal<'sm' | 'md' | 'lg'>('md');
const checked = signal(false);
const indeterminate = signal(false);
const disabled = signal(false);
const label = signal('Accept the terms');

@Component({
  selector: 'kj-checkbox-playground',
  standalone: true,
  imports: [KjCheckboxComponent],
  template: `
    <kj-checkbox
      [size]="size()"
      [(checked)]="checked"
      [indeterminate]="indeterminate()"
      [disabled]="disabled()"
    >{{ label() }}</kj-checkbox>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCheckboxPlaygroundDemo {
  protected readonly size = size;
  protected readonly checked = checked;
  protected readonly indeterminate = indeterminate;
  protected readonly disabled = disabled;
  protected readonly label = label;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjCheckboxPlaygroundDemo,
  state: {
    size: size as unknown as ReturnType<typeof signal>,
    checked: checked as unknown as ReturnType<typeof signal>,
    indeterminate: indeterminate as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
    label: label as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'size', label: 'size', options: ['sm', 'md', 'lg'] },
    { kind: 'text', name: 'label', label: 'label' },
    { kind: 'toggle', name: 'checked', label: 'checked' },
    { kind: 'toggle', name: 'indeterminate', label: 'indeterminate' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
  ],
  snippet: (values) => {
    const s = values as {
      size: string;
      checked: boolean;
      indeterminate: boolean;
      disabled: boolean;
      label: string;
    };
    const attrs: string[] = [`size="${s.size}"`];
    if (s.checked) attrs.push('[checked]="true"');
    if (s.indeterminate) attrs.push('[indeterminate]="true"');
    if (s.disabled) attrs.push('[disabled]="true"');
    return `<kj-checkbox\n  ${attrs.join('\n  ')}\n>${s.label}</kj-checkbox>`;
  },
};
