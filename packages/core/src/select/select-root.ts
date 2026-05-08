import { Directive, InjectionToken, model, signal } from '@angular/core';

/**
 * Internal DI token used by child directives (`KjSelectTrigger`,
 * `KjSelectContent`, `KjOption`) to find their owning `KjSelect`. Replaces
 * the previous standalone `select.context.ts` file.
 *
 * @internal
 */
export const KJ_SELECT = new InjectionToken<KjSelect>('KjSelect');

/**
 * Root select container. Owns the selection model (`kjSelectValue`) and acts
 * as the rendezvous between the trigger, the content panel, and individual
 * options. The `kjMultiple` flag (which absorbs the former `multi-select`
 * consumer) lives on `KjSelectTrigger` and is forwarded into this umbrella
 * via `setMultiple()`.
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
 * @category Core/Inputs
 */
@Directive({
  selector: '[kjSelect]',
  standalone: true,
  exportAs: 'kjSelect',
  providers: [{ provide: KJ_SELECT, useExisting: KjSelect }],
})
export class KjSelect {
  /** Two-way bindable selected value (single) or values (multi). */
  readonly kjSelectValue = model<unknown>(undefined);

  /** Read-only signal of the current selection. */
  readonly value = this.kjSelectValue.asReadonly();

  /** @internal — written by `KjSelectTrigger` to mirror its `kjMultiple` input. */
  readonly _multiple = signal(false);

  /** @internal — written by `KjSelectTrigger` whenever the overlay opens or closes. */
  readonly _open = signal(false);

  /** @internal — bumped by `select()` in single mode so the trigger can close. */
  readonly _closeRequest = signal(0);

  /** Whether the select is in multi-selection mode. */
  readonly multiple = this._multiple.asReadonly();

  /** Whether the listbox is currently open. */
  readonly open = this._open.asReadonly();

  /** Whether `target` is currently selected. */
  isSelected(target: unknown): boolean {
    if (this._multiple()) {
      const arr = this.kjSelectValue();
      return Array.isArray(arr) && arr.some(v => Object.is(v, target));
    }
    return Object.is(this.kjSelectValue(), target);
  }

  /**
   * Single mode: replace the value and request close. Multi mode: toggle
   * membership in the value array; the panel stays open so additional
   * options can be picked.
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
    this._closeRequest.update(n => n + 1);
    return { close: true };
  }
}
