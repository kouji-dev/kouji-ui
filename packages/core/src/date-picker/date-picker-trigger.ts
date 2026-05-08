import { Directive, ElementRef, computed, effect, inject } from '@angular/core';
import { KjFormControl } from '../primitives/forms/form-control';
import { KjFocusRing } from '../primitives/interaction/focus-ring';
import { formatDateShort, parseDate } from '../calendar/date-utils';
import { KJ_DATE_PICKER } from './date-picker.context';

/**
 * Date Picker trigger directive. Apply to the `<input>` element. Combines:
 *  - locale-aware **format on render** — when the value changes, the input's
 *    text is overwritten with `Intl.DateTimeFormat`'s short form.
 *  - locale-aware **parse on blur / Enter** — typed text is parsed (ISO,
 *    locale-aware m/d/y or d/m/y) and committed to the picker's value.
 *  - **combobox a11y** — `role="combobox"`, `aria-haspopup="dialog"`,
 *    `aria-expanded`, `aria-controls` — APG combobox+dialog pattern.
 *  - **keyboard** — `ArrowDown` / `Alt+ArrowDown` opens the popup;
 *    `Escape` closes; `Enter` parses and (if valid) commits.
 *  - **CVA** — composes `KjFormControl` so the input plays with
 *    `formControl` / `[(ngModel)]` bindings on the host.
 *
 * @category Core/Data input
 */
@Directive({
  selector: 'input[kjDatePickerTrigger]',
  standalone: true,
  hostDirectives: [
    KjFormControl,
    KjFocusRing,
  ],
  host: {
    'role': 'combobox',
    'autocomplete': 'off',
    'spellcheck': 'false',
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'ctx.open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.panelId',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[attr.aria-readonly]': 'ctx.readonly() ? "true" : null',
    '[attr.disabled]': 'ctx.disabled() ? "" : null',
    '[attr.readonly]': 'ctx.readonly() ? "" : null',
    '(input)': 'onInput($event)',
    '(blur)': 'onBlur()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjDatePickerTrigger {
  /** @internal */
  readonly ctx = inject(KJ_DATE_PICKER);
  private readonly formCtrl = inject(KjFormControl);
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  /** Cached typed text — avoids overwriting mid-edit. */
  private editing = false;

  readonly displayValue = computed(() => {
    const v = this.ctx.value();
    return v ? formatDateShort(v, this.ctx.locale()) : '';
  });

  constructor() {
    // Reflect the value to the input element whenever the value or locale
    // changes — but only if the user isn't currently editing.
    effect(() => {
      const text = this.displayValue();
      if (this.editing) return;
      const inputEl = this.el.nativeElement;
      if (inputEl.value !== text) inputEl.value = text;
    });

    // Mirror the picker's value into the form control (for CVA consumers).
    effect(() => {
      const v = this.ctx.value();
      if (this.formCtrl.value() !== v) this.formCtrl.value.set(v);
    });

  }

  /** @internal */
  onInput(_event: Event): void {
    this.editing = true;
    this.formCtrl.notifyChange(this.el.nativeElement.value);
  }

  /** @internal */
  onBlur(): void {
    this.commitTyped();
    this.editing = false;
    this.formCtrl.notifyTouched();
  }

  /** @internal */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' && (event.altKey || !this.ctx.open())) {
      event.preventDefault();
      this.ctx.show();
      return;
    }
    if (event.key === 'Escape' && this.ctx.open()) {
      event.preventDefault();
      this.ctx.hide();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitTyped();
    }
  }

  private commitTyped(): void {
    const text = this.el.nativeElement.value;
    if (!text.trim()) {
      // Clearing the input clears the value.
      if (this.ctx.value() !== null) {
        // Use selectDate is wrong (it requires a Date). Go through the
        // model on the picker by reaching for the public API.
        const picker = this.ctx as { kjValue?: { set(v: Date | null): void } };
        picker.kjValue?.set(null);
      }
      return;
    }
    const parsed = parseDate(text, this.ctx.locale());
    if (parsed && !this.isOutOfBounds(parsed)) {
      this.ctx.selectDate(parsed);
    } else {
      // Restore previous formatted value.
      this.el.nativeElement.value = this.displayValue();
    }
  }

  private isOutOfBounds(d: Date): boolean {
    const min = this.ctx.minDate();
    const max = this.ctx.maxDate();
    if (min && d < min) return true;
    if (max && d > max) return true;
    const filter = this.ctx.disabledDates();
    if (filter && !filter(d)) return true;
    return false;
  }
}
