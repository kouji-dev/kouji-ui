import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjTreeSelectComponent } from './tree-select';
import type { KjTreeNode } from '@kouji-ui/core';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals.
 */
const selectionMode = signal<'single' | 'multiple'>('single');
const placeholder = signal('Pick a topic');
const disabled = signal(false);

const NODES: KjTreeNode<string>[] = [
  {
    value: 'frontend',
    label: 'Frontend',
    children: [
      { value: 'html', label: 'HTML' },
      { value: 'css', label: 'CSS' },
      { value: 'javascript', label: 'JavaScript' },
    ],
  },
  {
    value: 'backend',
    label: 'Backend',
    children: [
      { value: 'nodejs', label: 'Node.js' },
      { value: 'python', label: 'Python' },
    ],
  },
];

@Component({
  selector: 'kj-tree-select-playground',
  standalone: true,
  imports: [KjTreeSelectComponent],
  template: `
    <kj-tree-select
      [kjNodes]="nodes"
      [kjSelectionMode]="selectionMode()"
      [(kjValue)]="selected"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTreeSelectPlaygroundDemo {
  protected readonly selectionMode = selectionMode;
  protected readonly placeholder = placeholder;
  protected readonly disabled = disabled;
  protected readonly nodes = NODES;
  protected readonly selected = signal<string | string[] | undefined>(undefined);
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjTreeSelectPlaygroundDemo,
  state: {
    selectionMode: selectionMode as unknown as ReturnType<typeof signal>,
    placeholder: placeholder as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'selectionMode', label: 'mode', options: ['single', 'multiple'] },
    { kind: 'text', name: 'placeholder', label: 'placeholder' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
  ],
  snippet: (values) => {
    const s = values as {
      selectionMode: string;
      placeholder: string;
      disabled: boolean;
    };
    const attrs: string[] = [
      '[kjNodes]="nodes"',
      `kjSelectionMode="${s.selectionMode}"`,
      '[(kjValue)]="selected"',
      `placeholder="${s.placeholder}"`,
    ];
    if (s.disabled) attrs.push('[disabled]="true"');
    return `<kj-tree-select\n  ${attrs.join('\n  ')}\n/>`;
  },
};
