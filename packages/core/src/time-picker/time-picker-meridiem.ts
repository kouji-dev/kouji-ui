import { Directive, LOCALE_ID, computed, inject, input } from '@angular/core';
import { KjDisabled, KjFocusRing } from '../primitives';
import { KJ_TIME_PICKER } from './time-picker.context';
import { is12Hour } from './time-picker.format';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * AM/PM toggle directive. Only meaningful when the resolved hour cycle is
 * `h11` or `h12`. Reflects `role="button"` + `aria-pressed` and toggles on
 * Enter / Space / ArrowUp / ArrowDown.
 *
 * Per the WAI-ARIA APG **Toggle Button** pattern
 * (<https://www.w3.org/WAI/ARIA/apg/patterns/button/>) the directive uses
 * `aria-pressed="true"` for PM and `aria-pressed="false"` for AM.
 *
 * @example
 * ```html
 * <button type="button" kjTimePickerMeridiem></button>
 * ```
 * @doc-category Core/Inputs
 * @doc
 * @doc-name time-picker
 */
@Directive({
  selector: '[kjTimePickerMeridiem]',
  standalone: true,
  hostDirectives: [
    KjFocusRing,
    // arch F-16: `kjDisabled` is owned by the primitive, so the transform
    // lives in exactly one place. The `aria-disabled` / `data-disabled` the
    // primitive writes describe this button's OWN flag; the bindings below
    // re-declare them with the *effective* state (own flag OR the picker's
    // disabled / readonly) and, running after the host directives', win.
    { directive: KjDisabled, inputs: ['kjDisabled'] },
  ],
  host: {
    '[attr.type]': '"button"',
    '[attr.role]': '"button"',
    '[attr.aria-pressed]': 'isPm() ? "true" : "false"',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-meridiem]': 'isPm() ? "pm" : "am"',
    '[attr.disabled]': 'disabled() ? "" : null',
    '[attr.hidden]': 'is12() ? null : ""',
    '[textContent]': 'label()',
    '(click)': 'onClick($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjTimePickerMeridiem {
  private readonly ctx = injectParent(KJ_TIME_PICKER, { child: 'KjTimePickerMeridiem', parent: '[kjTimePicker]' });
  private readonly localeId = inject(LOCALE_ID);

  /** Override the AM label. Defaults to a locale-derived string. */
  readonly kjAmLabel = input<string | null>(null);
  /** Override the PM label. Defaults to a locale-derived string. */
  readonly kjPmLabel = input<string | null>(null);
  /** Override the accessible label. Defaults to `null` (a locale-derived string). */
  readonly kjAriaLabel = input<string | null>(null);

  /**
   * Disable the toggle independently of the wrapper. Defaults to `false`.
   * Bound as `kjDisabled`, owned by the composed {@link KjDisabled}. Read
   * {@link disabled} for the effective state.
   */
  readonly kjDisabled = inject(KjDisabled).disabled;

  /** @internal */
  readonly isPm = computed(() => (this.ctx.value()?.hour ?? 0) >= 12);
  /** @internal */
  readonly is12 = computed(() => is12Hour(this.ctx.hourCycle()));

  /** @internal */
  readonly disabled = computed(() => this.kjDisabled() || this.ctx.disabled() || this.ctx.readonly());

  /** @internal */
  readonly label = computed(() => {
    if (!this.is12()) return '';
    const am = this.kjAmLabel() ?? localeMeridiem(this.localeId, false);
    const pm = this.kjPmLabel() ?? localeMeridiem(this.localeId, true);
    return this.isPm() ? pm : am;
  });

  /** @internal */
  readonly resolvedAriaLabel = computed(() => this.kjAriaLabel() ?? 'Toggle AM/PM');

  /** @internal */
  onClick(event: Event): void {
    if (this.disabled()) {
      event.preventDefault();
      return;
    }
    this.ctx.togglePeriod();
  }

  /** @internal */
  onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'Spacebar':
        event.preventDefault();
        this.ctx.togglePeriod();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.ctx.setMeridiem('pm');
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.ctx.setMeridiem('am');
        break;
    }
  }
}

function localeMeridiem(locale: string, pm: boolean): string {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      hour12: true,
    }).formatToParts(new Date(2000, 0, 1, pm ? 13 : 9, 0, 0));
    const dp = parts.find((p) => p.type === 'dayPeriod');
    if (dp && dp.value) return dp.value;
  } catch {
    /* ignore */
  }
  return pm ? 'PM' : 'AM';
}
