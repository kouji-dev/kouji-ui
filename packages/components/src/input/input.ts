import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  ViewEncapsulation,
  forwardRef,
  input,
  viewChild,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { KjInput } from '@kouji-ui/core';

export type KjInputType = 'text' | 'email' | 'password' | 'number'
                        | 'search' | 'tel' | 'url' | 'color';

/** Visual variants — `default` uses the field surface; `sunken` drops to
 *  body bg so the input pops against a card/surface parent. */
export type KjInputVariant = 'default' | 'sunken';

/** Size tier — `xs` (28px) for filter rows / inline editors, `sm` (32px)
 *  for dense forms, `md` (36px, default) for standard rows, `lg` (44px)
 *  for touch-first primary inputs. */
export type KjInputSize = 'xs' | 'sm' | 'md' | 'lg';

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
 * @doc-css-var
 *   --kj-input-bg             — Background fill. Variant `sunken` retargets this to body bg.
 *   --kj-input-fg             — Foreground (text + caret) color.
 *   --kj-input-border-color   — Border color. Focus and invalid states retarget this.
 *   --kj-input-border-style   — Border line style. Default solid.
 *   --kj-input-border-width   — Border thickness. Inherits --kj-border.
 *   --kj-input-radius         — Corner radius. Inherits --kj-radius-field.
 *   --kj-input-padding-x      — Horizontal padding inside the input.
 *   --kj-input-padding-y      — Vertical padding inside the input.
 *   --kj-input-font           — Font family. Defaults to --kj-font-sans.
 *   --kj-input-font-size      — Font size. Sizes (sm/md/lg) override.
 *   --kj-input-placeholder-fg — Placeholder text color. Muted by default.
 *   --kj-input-height         — Explicit height. Sizes override; matches button md by default.
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
 * @doc-related field,password-input,textarea,input-mask
 *
 * @doc-example Default
 *   Plain text input — anchors the chrome and the (ngModel) two-way pattern.
 *   @doc-file input.example.ts
 * @doc-example Usage
 *   Common input shapes — types, invalid state, disabled, and a (ngModel) bind.
 *   @doc-file input.usage.example.ts
 * @doc-example Color
 *   `type="color"` renders the native swatch wired through the same wrapper.
 *   @doc-file input.color.example.ts
 *
 * @doc
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
      #nativeInput
      kjInput
      class="kj-input"
      [type]="type()"
      [value]="value()"
      [placeholder]="placeholder()"
      [attr.data-variant]="variant()"
      [attr.data-size]="kjSize() === 'md' ? null : kjSize()"
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
  readonly kjSize = input<KjInputSize>('md');
  readonly value = input<string>('');
  readonly placeholder = input<string>('');
  readonly invalid = input(false);
  readonly disabled = input(false);

  @ViewChild(KjInput, { static: true })
  protected innerInput?: KjInput;

  /** Native `<input>` element, queried via template-ref. Used by callers
   *  (cell editors, focus-trapping consumers) that need to move keyboard
   *  focus into the input without reaching into the DOM. */
  readonly nativeInput = viewChild<ElementRef<HTMLInputElement>>('nativeInput');

  /** Focus the underlying `<input>`. No-op until the view renders. */
  focus(): void {
    this.nativeInput()?.nativeElement.focus();
  }

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
