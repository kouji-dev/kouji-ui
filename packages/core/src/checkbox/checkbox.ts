import { Directive, inject, model } from '@angular/core';
import { KjDisabled, KjFocusRing, KjFormControl } from '../primitives';

/**
 * Adds checkbox semantics with Angular forms integration.
 * Supports `formControl`, `formControlName`, and `ngModel` bindings.
 *
 * Apply `[kjCheckbox]` to any focusable element to get `role="checkbox"`,
 * `aria-checked` reflection, Space/click toggle, and the shared focus-ring
 * primitive — all composable onto custom markup with no styling attached.
 *
 * @example
 * ```html
 * <div kjCheckbox tabindex="0" [(kjChecked)]="accepted" aria-label="Accept terms">Accept</div>
 * ```
 * @doc
 *  @doc-file checkbox.example.ts
 *    ```typescript
 *       import { Component, signal } from '@angular/core';
 *       import { KjCheckbox } from '@kouji-ui/core';
 *
 *       @Component({
 *         standalone: true,
 *         imports: [KjCheckbox],
 *         styles: [`
 *           .row { display: flex; flex-direction: column; gap: 1rem; padding: 2rem; background: #0c0c0c; }
 *           .item { display: flex; align-items: center; gap: 0.75rem; }
 *           [kjCheckbox] { width: 18px; height: 18px; border: 2px solid #333; background: #111; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
 *           [data-checked] { background: #b8f500; border-color: #b8f500; }
 *           [data-checked]::after { content: '✓'; color: #0c0c0c; font-size: 0.75rem; font-weight: bold; }
 *           span { color: #888; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; }
 *         `],
 *         template: `
 *           <div class="row">
 *             <div class="item">
 *               <div kjCheckbox tabindex="0" [(kjChecked)]="terms" aria-label="Accept terms"></div>
 *               <span>Accept terms — {{ terms() ? 'checked' : 'unchecked' }}</span>
 *             </div>
 *             <div class="item">
 *               <div kjCheckbox tabindex="0" [(kjChecked)]="newsletter" aria-label="Newsletter"></div>
 *               <span>Subscribe to newsletter</span>
 *             </div>
 *           </div>
 *         `,
 *       })
 *       export class CheckboxExampleComponent {
 *         terms = signal(false);
 *         newsletter = signal(true);
 *       }
 *    ```
 * @category Core/Inputs
 * @doc-name checkbox
 * @doc-description Adds accessible checkbox behaviour and Angular forms support to any element you bring.
 * @doc-is-main
 */
@Directive({
  selector: '[kjCheckbox]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFocusRing,
    KjFormControl,
  ],
  host: {
    role: 'checkbox',
    '[attr.aria-checked]': 'kjChecked().toString()',
    '[attr.data-checked]': 'kjChecked() ? "" : null',
    '[attr.disabled]': 'formCtrl.disabled() ? "" : null',
    '(click)': 'toggle()',
    '(keydown.space)': 'onSpace($event)',
    '(blur)': 'formCtrl.notifyTouched()',
  },
})
export class KjCheckbox {
  readonly formCtrl = inject(KjFormControl);

  /** Whether the checkbox is checked. Supports two-way binding. */
  kjChecked = model<boolean>(false);

  /** @internal */
  toggle(): void {
    const next = !this.kjChecked();
    this.kjChecked.set(next);
    this.formCtrl.notifyChange(next);
  }

  /** @internal */
  onSpace(e: Event): void { e.preventDefault(); this.toggle(); }
}
