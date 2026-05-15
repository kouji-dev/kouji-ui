import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputGroupComponent, KjInputGroupAddonComponent } from './input-group';
import { KjInputComponent } from '../input/input';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Drives the prefix / suffix
 * addons surrounding a real `<kj-input>` plus the wrapper's orientation
 * and disabled state.
 */
const orientation = signal<'horizontal' | 'vertical'>('horizontal');
const prefix = signal('$');
const suffix = signal('.00');
const placeholder = signal('Amount');
const disabled = signal(false);

@Component({
  selector: 'kj-input-group-playground',
  standalone: true,
  imports: [
    KjInputGroupComponent,
    KjInputGroupAddonComponent,
    KjInputComponent,
    FormsModule,
  ],
  styles: [`:host { display: block; max-width: 360px; }`],
  template: `
    <kj-input-group [kjOrientation]="orientation()" [kjDisabled]="disabled()">
      @if (prefix()) {
        <kj-input-group-addon>{{ prefix() }}</kj-input-group-addon>
      }
      <kj-input
        type="text"
        [placeholder]="placeholder()"
        aria-label="Input group demo"
      />
      @if (suffix()) {
        <kj-input-group-addon>{{ suffix() }}</kj-input-group-addon>
      }
    </kj-input-group>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjInputGroupPlaygroundDemo {
  protected readonly orientation = orientation;
  protected readonly prefix = prefix;
  protected readonly suffix = suffix;
  protected readonly placeholder = placeholder;
  protected readonly disabled = disabled;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjInputGroupPlaygroundDemo,
  state: {
    orientation: orientation as unknown as ReturnType<typeof signal>,
    prefix: prefix as unknown as ReturnType<typeof signal>,
    suffix: suffix as unknown as ReturnType<typeof signal>,
    placeholder: placeholder as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'orientation',
      label: 'orientation',
      options: ['horizontal', 'vertical'],
    },
    { kind: 'text', name: 'prefix', label: 'prefix' },
    { kind: 'text', name: 'suffix', label: 'suffix' },
    { kind: 'text', name: 'placeholder', label: 'placeholder' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
  ],
  snippet: (values) => {
    const s = values as {
      orientation: string;
      prefix: string;
      suffix: string;
      placeholder: string;
      disabled: boolean;
    };
    const groupAttrs: string[] = [`kjOrientation="${s.orientation}"`];
    if (s.disabled) groupAttrs.push('[kjDisabled]="true"');
    const slots: string[] = [];
    if (s.prefix) slots.push(`  <kj-input-group-addon>${s.prefix}</kj-input-group-addon>`);
    slots.push(`  <kj-input type="text" placeholder="${s.placeholder}" />`);
    if (s.suffix) slots.push(`  <kj-input-group-addon>${s.suffix}</kj-input-group-addon>`);
    return `<kj-input-group\n  ${groupAttrs.join('\n  ')}\n>\n${slots.join('\n')}\n</kj-input-group>`;
  },
};
