import { Directive, computed, inject, input, model } from '@angular/core';
import { KJ_RADIO_GROUP, KjRadioContext } from './radio.context';
import { KjDisabled, KjFocusRing, KjFormControl } from '../primitives';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Container for a group of radio buttons. Manages the selected value.
 * @example
 * ```html
 * <div kjRadioGroup [(kjValue)]="size" aria-label="Size">
 *   <div kjRadio [kjRadioValue]="'s'" tabindex="0">Small</div>
 * </div>
 * ```
 * @doc-category Core/Inputs
 * @doc
 * @doc-name radio
 */
@Directive({
  selector: '[kjRadioGroup]', standalone: true,
  providers: [{ provide: KJ_RADIO_GROUP, useExisting: KjRadioGroup }],
  host: { role: 'radiogroup' },
})
export class KjRadioGroup implements KjRadioContext {
  /** The group's selected value. Two-way bindable. Defaults to `undefined` (nothing selected). */
  kjValue = model<unknown>(undefined);

  /** Read-only view of the selected value, for children reading through `KJ_RADIO_GROUP`. */
  readonly value = this.kjValue.asReadonly();

  /** Makes `val` the group's selection. @param val The radio value to select. */
  select(val: unknown): void { this.kjValue.set(val); }
}

/**
 * Individual radio button within a `[kjRadioGroup]`. Includes CVA for forms integration.
 *
 * Owns `role="radio"`, `aria-checked`, Space/Enter activation, and Angular
 * forms integration via the `KjFormControl` host directive so each radio
 * participates in reactive and template-driven forms.
 *
 * @example `<div kjRadio [kjRadioValue]="'a'" tabindex="0">Option A</div>`
 * @doc-category Core/Inputs
 * @doc
 * @doc-name radio
 * @doc-description Individual radio button within a radio group with accessible activation and forms support.
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
  private readonly group = injectParent(KJ_RADIO_GROUP, { child: 'KjRadio', parent: '[kjRadioGroup]' });
  private readonly disabledState = inject(KjDisabled);
  /** The composed forms bridge — the host binds `(blur)` to its `notifyTouched()`. */
  readonly formCtrl = inject(KjFormControl);

  /** The value this radio contributes to the group when selected. Required. */
  kjRadioValue = input.required<unknown>();

  /** `true` while this radio is the group's selection. Drives `aria-checked`. */
  readonly checked = computed(() => this.group.value() === this.kjRadioValue());

  /**
   * Whether interaction is blocked — either by `[kjDisabled]` or by an Angular
   * form control that was disabled through `FormControl.disable()`.
   */
  readonly isDisabled = computed(
    () => this.disabledState.disabled() || this.formCtrl.disabled(),
  );

  /** Makes this radio the group's selection, unless it is disabled. */
  select(): void {
    // A radio announcing aria-disabled must not become the group's selection
    // on click (WCAG 4.1.2), and selecting it would move the group's value
    // out from under the user (3.2.2 On Input).
    if (this.isDisabled()) return;
    this.group.select(this.kjRadioValue());
    this.formCtrl.notifyChange(this.kjRadioValue());
  }

  /** Space activates without scrolling the page. @param e The keydown event. */
  onSpace(e: Event): void { e.preventDefault(); this.select(); }
}
