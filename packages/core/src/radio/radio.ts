import { Directive, computed, inject, input, model } from '@angular/core';
import { KJ_RADIO_GROUP, KjRadioContext } from './radio.context';
import { KjDisabled, KjFocusRing, KjFormControl } from '../primitives';

/**
 * Container for a group of radio buttons. Manages the selected value.
 * @example
 * ```html
 * <div kjRadioGroup [(kjValue)]="size" aria-label="Size">
 *   <div kjRadio [kjRadioValue]="'s'" tabindex="0">Small</div>
 * </div>
 * ```
 * @category Core/Inputs
 * @doc
 * @doc-name radio
 */
@Directive({
  selector: '[kjRadioGroup]', standalone: true,
  providers: [{ provide: KJ_RADIO_GROUP, useExisting: KjRadioGroup }],
  host: { role: 'radiogroup' },
})
export class KjRadioGroup implements KjRadioContext {
  kjValue = model<unknown>(undefined);
  readonly value = this.kjValue.asReadonly();
  select(val: unknown): void { this.kjValue.set(val); }
}

/**
 * Individual radio button within a `[kjRadioGroup]`. Includes CVA for forms integration.
 * @example `<div kjRadio [kjRadioValue]="'a'" tabindex="0">Option A</div>`
 * @category Core/Inputs
 * @doc
 * @doc-name radio
 * @doc-description Individual radio button within a `[kjRadioGroup]` — owns `role="radio"`, `aria-checked`, Space/Enter activation, and Angular forms integration via `KjFormControl` host directive.
 * @doc-is-main
 */
@Directive({
  selector: '[kjRadio]', standalone: true,
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFocusRing,
    KjFormControl,
  ],
  host: {
    role: 'radio',
    '[attr.aria-checked]': 'checked().toString()',
    '[attr.data-checked]': 'checked() ? "" : null',
    '(click)': 'select()',
    '(keydown.space)': 'onSpace($event)',
    '(keydown.enter)': 'select()',
    '(blur)': 'formCtrl.notifyTouched()',
  },
})
export class KjRadio {
  private readonly group = inject(KJ_RADIO_GROUP);
  readonly formCtrl = inject(KjFormControl);
  kjRadioValue = input.required<unknown>();
  readonly checked = computed(() => this.group.value() === this.kjRadioValue());
  select(): void { this.group.select(this.kjRadioValue()); this.formCtrl.notifyChange(this.kjRadioValue()); }
  onSpace(e: Event): void { e.preventDefault(); this.select(); }
}
