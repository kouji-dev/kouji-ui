import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { KjDisabled, KjFocusRing, KjFormControl } from '../primitives';

/**
 * Enhances a native `<input>` with Angular forms integration, disabled/invalid state, and focus-ring.
 * Supports `formControl`, `formControlName`, and `ngModel` bindings.
 *
 * @example
 * ```html
 * <input kjInput type="email" [formControl]="emailCtrl" [kjInvalid]="emailCtrl.invalid" />
 * ```
 * @doc
 *  @doc-file input.example.ts
 *    ```typescript
 *       import { Component } from '@angular/core';
 *       import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
 *       import { KjInput } from '@kouji-ui/core';
 *
 *       @Component({
 *         standalone: true,
 *         imports: [KjInput, ReactiveFormsModule],
 *         styles: [`
 *           .form { padding: 2rem; background: #0c0c0c; display: flex; flex-direction: column; gap: 1rem; max-width: 400px; }
 *           [kjInput] { padding: 0.625rem 0.875rem; background: #111; border: 1px solid #222; color: #f0ede6; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; width: 100%; }
 *           [kjInput]:focus { outline: none; border-color: #b8f500; }
 *           [aria-invalid="true"] { border-color: #ef4444; }
 *           .error { color: #ef4444; font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; }
 *           label { color: #888; font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; }
 *         `],
 *         template: `
 *           <div class="form">
 *             <label for="email">Email</label>
 *             <input id="email" kjInput type="email" [formControl]="emailCtrl"
 *               [kjInvalid]="emailCtrl.invalid && emailCtrl.touched"
 *               placeholder="you@example.com" />
 *             @if (emailCtrl.invalid && emailCtrl.touched) {
 *               <span class="error">Please enter a valid email.</span>
 *             }
 *             <label for="disabled">Disabled input</label>
 *             <input id="disabled" kjInput type="text" [kjDisabled]="true" value="Not editable" />
 *           </div>
 *         `,
 *       })
 *       export class InputExampleComponent {
 *         emailCtrl = new FormControl('', [Validators.email, Validators.required]);
 *       }
 *    ```
 * @category Core/Inputs
 * @doc-name input
 * @doc-description Adds Angular forms integration, invalid and disabled state, and a focus ring to a native input.
 * @doc-is-main
 */
@Directive({
  selector: '[kjInput]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFocusRing,
    KjFormControl,
  ],
  host: {
    '[attr.aria-invalid]': 'formCtrl.touched() && kjInvalid() ? "true" : null',
    '[attr.data-invalid]': 'formCtrl.touched() && kjInvalid() ? "" : null',
    '[attr.disabled]': 'formCtrl.disabled() ? "" : null',
    '(input)': 'formCtrl.notifyChange($any($event.target).value)',
    '(blur)': 'formCtrl.notifyTouched()',
  },
})
export class KjInput {
  readonly formCtrl = inject(KjFormControl);
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  /** Whether the input is in an invalid state. Combined with `touched` for ARIA. */
  kjInvalid = input<boolean>(false);

  constructor() {
    // Reflect the CVA value signal back to the native input element.
    // Skip when the form control's value is null/undefined so external [value]
    // bindings (template attribute, parent component) are preserved when no
    // ngModel/formControl is wired. When a form is wired, callers clear via
    // setValue('') rather than setValue(null), preserving the clear-on-empty
    // behavior.
    effect(() => {
      const val = this.formCtrl.value();
      if (val == null) return;
      this.el.nativeElement.value = String(val);
    });
  }
}
