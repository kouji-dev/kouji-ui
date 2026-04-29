import { Directive, computed, inject, input, model } from '@angular/core';
import { KJ_RADIO_GROUP, KjRadioContext } from './radio.context';
import { KjDisabledDirective, KjFocusRingDirective } from '../primitives';

/**
 * Container for a group of radio buttons.
 * @example
 * ```html
 * <div kjRadioGroup [(kjValue)]="size" aria-label="Size"><div kjRadio [kjRadioValue]="'s'">S</div></div>
 * ```
 */
@Directive({ selector: '[kjRadioGroup]', standalone: true, providers: [{ provide: KJ_RADIO_GROUP, useExisting: KjRadioGroupDirective }], host: { role: 'radiogroup' } })
export class KjRadioGroupDirective implements KjRadioContext {
  kjValue = model<unknown>(undefined);
  readonly value = this.kjValue.asReadonly();
  select(val: unknown): void { this.kjValue.set(val); }
}

/**
 * Individual radio button within a `[kjRadioGroup]`.
 * @example
 * ```html
 * <div kjRadio [kjRadioValue]="'option-a'" tabindex="0">Option A</div>
 * ```
 */
@Directive({
  selector: '[kjRadio]', standalone: true,
  hostDirectives: [{ directive: KjDisabledDirective, inputs: ['kjDisabled'] }, KjFocusRingDirective],
  host: { role: 'radio', '[attr.aria-checked]': 'checked().toString()', '[attr.data-checked]': 'checked() ? "" : null', '(click)': 'select()', '(keydown.space)': 'onSpace($event)', '(keydown.enter)': 'select()' },
})
export class KjRadioDirective {
  private readonly group = inject(KJ_RADIO_GROUP);
  kjRadioValue = input.required<unknown>();
  readonly checked = computed(() => this.group.value() === this.kjRadioValue());
  select(): void { this.group.select(this.kjRadioValue()); }
  onSpace(e: Event): void { e.preventDefault(); this.select(); }
}
