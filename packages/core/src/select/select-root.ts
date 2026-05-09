import { Directive, InjectionToken, inject, model, signal } from '@angular/core';
import { KjOverlayController } from '../primitives/overlay/controller';

/**
 * Internal DI token used by child directives (`KjSelectTrigger`,
 * `KjSelectContent`, `KjOption`) to find their owning `KjSelect`. Replaces
 * the previous standalone `select.context.ts` file.
 *
 * @internal
 */
export const KJ_SELECT = new InjectionToken<KjSelect>('KjSelect');

/**
 * Root select container. Owns the selection model (`kjSelectValue`) and the
 * shared `KjOverlayController` so the trigger, panel, and individual
 * options all wire to the same overlay state. The `kjMultiple` flag (which
 * absorbs the former `multi-select` consumer) lives on `KjSelectTrigger`
 * and is forwarded into this umbrella via `setMultiple()`.
 *
 * @example
 * ```html
 * <div kjSelect [(kjSelectValue)]="selected">
 *   <button kjSelectTrigger #t="kjSelectTrigger">Choose fruit</button>
 *   <kj-select-content [kjFor]="t">
 *     <div kjOption [kjOptionValue]="'apple'">Apple</div>
 *   </kj-select-content>
 * </div>
 * ```
 * @doc-category Core/Inputs
 */
@Directive({
  selector: '[kjSelect]',
  standalone: true,
  exportAs: 'kjSelect',
  providers: [
    { provide: KJ_SELECT, useExisting: KjSelect },
    KjOverlayController,
  ],
})
export class KjSelect {
  /** @internal — shared overlay controller; trigger + content + options all see this same instance. */
  private readonly controller = inject(KjOverlayController);

  /** Two-way bindable selected value (single) or values (multi). */
  readonly kjSelectValue = model<unknown>(undefined);

  /** Read-only signal of the current selection. */
  readonly value = this.kjSelectValue.asReadonly();

  /** @internal — written by `KjSelectTrigger` to mirror its `kjMultiple` input. */
  readonly _multiple = signal(false);

  /** Whether the select is in multi-selection mode. */
  readonly multiple = this._multiple.asReadonly();

  /** Whether the listbox is currently open. */
  readonly open = this.controller.isOpen;

  /** Whether `target` is currently selected. */
  isSelected(target: unknown): boolean {
    if (this._multiple()) {
      const arr = this.kjSelectValue();
      return Array.isArray(arr) && arr.some(v => Object.is(v, target));
    }
    return Object.is(this.kjSelectValue(), target);
  }

  /**
   * Single mode: replace the value and close the overlay. Multi mode:
   * toggle membership in the value array; the panel stays open so
   * additional options can be picked.
   */
  select(target: unknown): { close: boolean } {
    if (this._multiple()) {
      const current = this.kjSelectValue();
      const arr = Array.isArray(current) ? current.slice() : [];
      const idx = arr.findIndex(v => Object.is(v, target));
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(target);
      this.kjSelectValue.set(arr);
      return { close: false };
    }
    this.kjSelectValue.set(target);
    this.controller.close('programmatic');
    return { close: true };
  }
}
