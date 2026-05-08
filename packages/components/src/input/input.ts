import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  ViewEncapsulation,
  forwardRef,
  input,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { KjInput } from '@kouji-ui/core';

export type KjInputType = 'text' | 'email' | 'password' | 'number'
                        | 'search' | 'tel' | 'url' | 'color';

/**
 * Styled wrapper around the headless KjInput directive.
 *
 * Supports `[(ngModel)]` and `[formControl]` bindings.
 *
 * @example
 * ```html
 * <kj-input type="email" placeholder="you@example.com" [(ngModel)]="email" />
 * ```
 * @doc
 *   @doc-file input.example.ts
 *   @doc-file input.color.example.ts
 * @category Library/Data input
 * @doc-name input
 * @doc-description Themed text input with type variants, invalid and disabled state, and Angular forms support.
 * @doc-is-main
 */
@Component({
  selector: 'kj-input',
  standalone: true,
  imports: [KjInput],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => KjInputComponent),
      multi: true,
    },
  ],
  template: `
    <input
      kjInput
      class="kj-input"
      [type]="type()"
      [value]="value()"
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
export class KjInputComponent implements ControlValueAccessor {
  readonly type = input<KjInputType>('text');
  readonly value = input<string>('');
  readonly placeholder = input<string>('');
  readonly invalid = input(false);
  readonly disabled = input(false);

  @ViewChild(KjInput, { static: true })
  protected innerInput?: KjInput;

  writeValue(val: unknown): void {
    this.innerInput?.formCtrl.writeValue(val);
  }
  registerOnChange(fn: (value: unknown) => void): void {
    this.innerInput?.formCtrl.registerOnChange(fn);
  }
  registerOnTouched(fn: () => void): void {
    this.innerInput?.formCtrl.registerOnTouched(fn);
  }
  setDisabledState(isDisabled: boolean): void {
    this.innerInput?.formCtrl.setDisabledState(isDisabled);
  }
}
