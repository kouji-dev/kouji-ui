import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjComboboxComponent, KjComboboxOptionComponent } from './combobox';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs cover the placeholder text,
 * the disabled posture, the free-text + autoActivateFirst behavioural axes,
 * and the visible option count so users can preview shorter / longer lists.
 */
const placeholder = signal('Pick a framework…');
const optionCount = signal<3 | 5 | 7>(5);
const disabled = signal(false);
const freeText = signal(false);
const autoActivateFirst = signal(false);

const OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'angular', label: 'Angular' },
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'solid', label: 'Solid' },
  { value: 'qwik', label: 'Qwik' },
  { value: 'lit', label: 'Lit' },
];

@Component({
  selector: 'kj-combobox-playground',
  standalone: true,
  imports: [KjComboboxComponent, KjComboboxOptionComponent],
  styles: [`:host { display: block; min-height: 14rem; }`],
  template: `
    <kj-combobox
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [freeText]="freeText()"
      [autoActivateFirst]="autoActivateFirst()"
    >
      @for (opt of visibleOptions(); track opt.value) {
        <kj-combobox-option [value]="opt.value">{{ opt.label }}</kj-combobox-option>
      }
    </kj-combobox>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjComboboxPlaygroundDemo {
  protected readonly placeholder = placeholder;
  protected readonly optionCount = optionCount;
  protected readonly disabled = disabled;
  protected readonly freeText = freeText;
  protected readonly autoActivateFirst = autoActivateFirst;

  protected visibleOptions(): typeof OPTIONS {
    return OPTIONS.slice(0, optionCount());
  }
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjComboboxPlaygroundDemo,
  state: {
    placeholder: placeholder as unknown as ReturnType<typeof signal>,
    optionCount: optionCount as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
    freeText: freeText as unknown as ReturnType<typeof signal>,
    autoActivateFirst: autoActivateFirst as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'placeholder', label: 'placeholder' },
    { kind: 'chips', name: 'optionCount', label: 'options', options: [3, 5, 7] },
    { kind: 'toggle', name: 'freeText', label: 'free text' },
    { kind: 'toggle', name: 'autoActivateFirst', label: 'auto-activate first' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
  ],
  snippet: (values) => {
    const s = values as {
      placeholder: string;
      optionCount: number;
      disabled: boolean;
      freeText: boolean;
      autoActivateFirst: boolean;
    };
    const attrs: string[] = [`placeholder="${s.placeholder}"`];
    if (s.freeText) attrs.push('[freeText]="true"');
    if (s.autoActivateFirst) attrs.push('[autoActivateFirst]="true"');
    if (s.disabled) attrs.push('[disabled]="true"');
    const options = OPTIONS.slice(0, s.optionCount)
      .map((o) => `  <kj-combobox-option [value]="'${o.value}'">${o.label}</kj-combobox-option>`)
      .join('\n');
    return `<kj-combobox\n  ${attrs.join('\n  ')}\n>\n${options}\n</kj-combobox>`;
  },
};
