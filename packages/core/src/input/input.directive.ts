import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { KjDisabledDirective, KjFocusRingDirective, KjFormControlDirective } from '../primitives';

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
 *       import { KjInputDirective } from './input.directive';
 *
 *       @Component({
 *         standalone: true,
 *         imports: [KjInputDirective, ReactiveFormsModule],
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
 * @category Foundation/Input
 */
@Directive({
  selector: '[kjInput]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabledDirective, inputs: ['kjDisabled'] },
    KjFocusRingDirective,
    KjFormControlDirective,
  ],
  host: {
    '[attr.aria-invalid]': 'formCtrl.touched() && kjInvalid() ? "true" : null',
    '[attr.data-invalid]': 'formCtrl.touched() && kjInvalid() ? "" : null',
    '[attr.disabled]': 'formCtrl.disabled() ? "" : null',
    '(input)': 'formCtrl.notifyChange($any($event.target).value)',
    '(blur)': 'formCtrl.notifyTouched()',
  },
})
export class KjInputDirective {
  readonly formCtrl = inject(KjFormControlDirective);
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  /** Whether the input is in an invalid state. Combined with `touched` for ARIA. */
  kjInvalid = input<boolean>(false);

  constructor() {
    // Reflect the CVA value signal back to the native input element.
    effect(() => {
      const val = this.formCtrl.value();
      this.el.nativeElement.value = val == null ? '' : String(val);
    });
  }
}
