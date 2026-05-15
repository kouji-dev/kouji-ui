import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjProgressBarComponent } from './progress-bar';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

const value = signal<number>(60);
const min = signal<number>(0);
const max = signal<number>(100);
const variant = signal<'primary' | 'success' | 'warning' | 'error'>('primary');
const size = signal<'xs' | 'sm' | 'md' | 'lg'>('md');
const ariaValuetext = signal<string>('');

@Component({
  selector: 'kj-progress-bar-playground',
  standalone: true,
  imports: [KjProgressBarComponent],
  styles: [`
    /* The progress bar itself uses width: 100%, but the flex-centered
       playground stage shrinks it to content size — give the host a
       comfortable width so the bar has something to fill. */
    :host { display: block; width: min(420px, 100%); }
  `],
  template: `
    <kj-progress-bar
      [kjValue]="value()"
      [kjMin]="min()"
      [kjMax]="max()"
      [kjVariant]="variant()"
      [kjSize]="size()"
      [kjAriaValuetext]="ariaValuetext()"
      kjAriaLabel="Loading progress"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjProgressBarPlaygroundDemo {
  protected readonly value = value;
  protected readonly min = min;
  protected readonly max = max;
  protected readonly variant = variant;
  protected readonly size = size;
  protected readonly ariaValuetext = ariaValuetext;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjProgressBarPlaygroundDemo,
  state: {
    value: value as unknown as ReturnType<typeof signal>,
    min: min as unknown as ReturnType<typeof signal>,
    max: max as unknown as ReturnType<typeof signal>,
    variant: variant as unknown as ReturnType<typeof signal>,
    size: size as unknown as ReturnType<typeof signal>,
    ariaValuetext: ariaValuetext as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'number', name: 'value', label: 'value' },
    { kind: 'number', name: 'min', label: 'min' },
    { kind: 'number', name: 'max', label: 'max' },
    {
      kind: 'chips',
      name: 'variant',
      label: 'variant',
      options: ['primary', 'success', 'warning', 'error'],
    },
    { kind: 'chips', name: 'size', label: 'size', options: ['xs', 'sm', 'md', 'lg'] },
    { kind: 'text', name: 'ariaValuetext', label: 'aria-valuetext' },
  ],
  snippet: (values) => {
    const s = values as {
      value: number;
      min: number;
      max: number;
      variant: string;
      size: string;
      ariaValuetext: string;
    };
    const attrs: string[] = [
      `[kjValue]="${s.value}"`,
      `[kjMin]="${s.min}"`,
      `[kjMax]="${s.max}"`,
      `kjVariant="${s.variant}"`,
      `kjSize="${s.size}"`,
    ];
    if (s.ariaValuetext) attrs.push(`kjAriaValuetext="${s.ariaValuetext}"`);
    attrs.push('kjAriaLabel="Loading progress"');
    return `<kj-progress-bar\n  ${attrs.join('\n  ')}\n/>`;
  },
};
