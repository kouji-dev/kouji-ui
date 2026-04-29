import { Directive, computed, inject, input, model } from '@angular/core';
import { KJ_RADIO_GROUP, KjRadioContext } from './radio.context';
import { KjDisabledDirective, KjFocusRingDirective, KjFormControlDirective } from '../primitives';

/**
 * Container for a group of radio buttons. Manages the selected value.
 * @example
 * ```html
 * <div kjRadioGroup [(kjValue)]="size" aria-label="Size">
 *   <div kjRadio [kjRadioValue]="'s'" tabindex="0">Small</div>
 * </div>
 * ```
 * @category Core/Inputs/Radio
 */
@Directive({
  selector: '[kjRadioGroup]', standalone: true,
  providers: [{ provide: KJ_RADIO_GROUP, useExisting: KjRadioGroupDirective }],
  host: { role: 'radiogroup' },
})
export class KjRadioGroupDirective implements KjRadioContext {
  kjValue = model<unknown>(undefined);
  readonly value = this.kjValue.asReadonly();
  select(val: unknown): void { this.kjValue.set(val); }
}

/**
 * Individual radio button within a `[kjRadioGroup]`. Includes CVA for forms integration.
 * @example `<div kjRadio [kjRadioValue]="'a'" tabindex="0">Option A</div>`
 * @category Core/Inputs/Radio
 */
@Directive({
  selector: '[kjRadio]', standalone: true,
  hostDirectives: [
    { directive: KjDisabledDirective, inputs: ['kjDisabled'] },
    KjFocusRingDirective,
    KjFormControlDirective,
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
export class KjRadioDirective {
  private readonly group = inject(KJ_RADIO_GROUP);
  readonly formCtrl = inject(KjFormControlDirective);
  kjRadioValue = input.required<unknown>();
  readonly checked = computed(() => this.group.value() === this.kjRadioValue());
  select(): void { this.group.select(this.kjRadioValue()); this.formCtrl.notifyChange(this.kjRadioValue()); }
  onSpace(e: Event): void { e.preventDefault(); this.select(); }
}
