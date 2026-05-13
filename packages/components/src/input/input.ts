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

/** Visual variants — `default` uses the field surface; `sunken` drops to
 *  body bg so the input pops against a card/surface parent. */
export type KjInputVariant = 'default' | 'sunken';

/**
 * Styled wrapper around the headless KjInput directive.
 *
 * Supports `[(ngModel)]` and `[formControl]` bindings.
 *
 * @example
 * ```html
 * <kj-input type="email" placeholder="you@example.com" [(ngModel)]="email" />
 * ```
 *
 * @doc-keyboard
 *   Tab    — Moves focus into and out of the input (native input semantics)
 *   Enter  — Submits the parent <form> when present (native behavior)
 *
 * @doc-aria
 *   aria-invalid   — set to "true" only after the control is touched AND [invalid] is true; avoids announcing errors before the user has interacted
 *   data-invalid   — mirror of aria-invalid for CSS targeting
 *   data-type      — reflects the `type` input ("text" | "email" | "password" | ...) for type-specific styling
 *   data-variant   — reflects the visual `variant` input ("default" | "sunken")
 *   disabled       — native attribute reflected when the bound form control's disabled state is true
 *
 * @doc-touch
 *   Default height is 36px (md). Use `data-size="lg"` (2.75rem / 44px) when the input is the primary touch target in a form. The `type="color"` swatch renders at 44×32px — pair it with a textual label for the accessible name.
 *
 * @doc-a11y
 *   `<kj-input>` is a thin wrapper around the headless `kjInput` directive that
 *   composes `KjFormControl` (CVA), `KjDisabled`, and `KjFocusRing`. Always
 *   associate a `<label>` via `for=`/`id=` or wrap the input in the label — the
 *   component does not generate its own accessible name. Pair with a sibling
 *   error node referenced by `aria-describedby` to surface validation messages
 *   to screen readers. Focus visibility comes from `:focus-visible` only (2px
 *   primary outline), never on mouse click.
 *
 * @doc-related field,password-input,textarea
 *
 * @doc
 *   @doc-file input.example.ts
 *   @doc-file input.color.example.ts
 * @doc-category Library/Data input
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
      [attr.data-variant]="variant()"
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
  readonly variant = input<KjInputVariant>('default');
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
