import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjInput } from '@kouji-ui/core';

export type KjInputType = 'text' | 'email' | 'password' | 'number'
                        | 'search' | 'tel' | 'url' | 'color';

/**
 * Styled wrapper around the headless KjInput directive.
 *
 * Element-wrapper pattern: <kj-input> is structural shell; inner <input>
 * carries native input semantics (focus, form integration, validation).
 *
 * @example
 * ```html
 * <kj-input type="email" placeholder="you@example.com" [invalid]="emailCtrl.invalid" />
 * <kj-input type="color" [(ngModel)]="hex" />
 * ```
 *
 * Note: value is managed via Angular forms (ngModel / formControl) — there is no
 * standalone `value` input because the headless `kjInput` directive owns the
 * native input's .value via ControlValueAccessor.
 * @doc
 *   @doc-file input.example.ts
 *   @doc-file input.color.example.ts
 * @category Library/Base
 */
@Component({
  selector: 'kj-input',
  standalone: true,
  imports: [KjInput],
  template: `
    <input
      kjInput
      class="kj-input"
      [type]="type()"
      [placeholder]="placeholder()"
      [kjInvalid]="invalid()"
      [kjDisabled]="disabled()"
    />
  `,
  styleUrl: './input.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'style': 'display: contents;',
    '[attr.data-type]': 'type()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjInputComponent {
  readonly type = input<KjInputType>('text');
  readonly placeholder = input<string>('');
  readonly invalid = input(false);
  readonly disabled = input(false);
}
