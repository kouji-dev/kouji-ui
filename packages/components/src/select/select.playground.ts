import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { KjSelectComponent, KjOptionComponent } from './select';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

const selected = signal<string | undefined>(undefined);
const placeholder = signal<string>('Choose a fruit');
const optionCount = signal<2 | 3 | 4 | 5 | 6>(4);
const disabled = signal(false);
const multiple = signal(false);

const ITEMS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
  { value: 'elderberry', label: 'Elderberry' },
  { value: 'fig', label: 'Fig' },
];

@Component({
  selector: 'kj-select-playground',
  standalone: true,
  imports: [KjSelectComponent, KjOptionComponent],
  template: `
    <kj-select
      [(value)]="selected"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [multiple]="multiple()"
    >
      @for (item of visibleItems(); track item.value) {
        <kj-option [value]="item.value">{{ item.label }}</kj-option>
      }
    </kj-select>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSelectPlaygroundDemo {
  protected readonly selected = selected;
  protected readonly placeholder = placeholder;
  protected readonly optionCount = optionCount;
  protected readonly disabled = disabled;
  protected readonly multiple = multiple;

  protected readonly visibleItems = computed(() => ITEMS.slice(0, optionCount()));
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjSelectPlaygroundDemo,
  state: {
    selected: selected as unknown as ReturnType<typeof signal>,
    placeholder: placeholder as unknown as ReturnType<typeof signal>,
    optionCount: optionCount as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
    multiple: multiple as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'placeholder', label: 'placeholder' },
    { kind: 'chips', name: 'optionCount', label: 'options', options: [2, 3, 4, 5, 6] },
    { kind: 'toggle', name: 'multiple', label: 'multiple' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
  ],
  snippet: (values) => {
    const s = values as {
      placeholder: string;
      optionCount: number;
      disabled: boolean;
      multiple: boolean;
    };
    const attrs: string[] = [
      `[(value)]="selected"`,
      `placeholder="${s.placeholder}"`,
    ];
    if (s.multiple) attrs.push('[multiple]="true"');
    if (s.disabled) attrs.push('[disabled]="true"');
    const options = ITEMS.slice(0, s.optionCount)
      .map((item) => `  <kj-option [value]="'${item.value}'">${item.label}</kj-option>`)
      .join('\n');
    return `<kj-select\n  ${attrs.join('\n  ')}\n>\n${options}\n</kj-select>`;
  },
};
