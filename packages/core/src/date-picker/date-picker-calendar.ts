import { Directive, ElementRef, booleanAttribute, inject, input } from '@angular/core';
import { KJ_DATE_PICKER } from './date-picker.context';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo, injectAnchoredPosition, pxOffset } from '../primitives/overlay/strategies/position/anchored-to';
import { tabCycle } from '../primitives/overlay/strategies/focus-trap/tab-cycle';
import { injectParent } from '../primitives/diagnostics/inject-parent';
import { KjTranslateService } from '../i18n/translate.service';

/**
 * Marker directive for the calendar slot of a Date Picker. Composes the
 * overlay `KjOverlayPanel` host directive — `role="dialog"`, mount /
 * position / focus-trap strategies — and lets consumers project a
 * `KjCalendar` (or the `<kj-calendar>` wrapper) inside.
 *
 * Modality follows `kjTrap`, so `aria-modal` always tells the truth:
 *
 * - **Non-modal (default).** `aria-modal="false"`; opening does not move
 *   focus, so typing in the input keeps working. `ArrowDown` on the input
 *   moves focus onto the calendar's active day; `Tab` inside the calendar
 *   closes it and hands focus back to the input, where the keystroke then
 *   continues to the next field. `Escape` and picking a date close and
 *   return focus to the input.
 * - **Modal (`kjTrap`).** The WAI-ARIA APG date-picker dialog:
 *   `aria-modal="true"`, focus moves onto the active day on open, `Tab`
 *   cycles inside the calendar and `Escape` returns focus to the input.
 *
 * Wire the panel to its trigger via `[kjFor]`:
 *
 * ```html
 * <input kjDatePickerTrigger #t="kjDatePickerTrigger" />
 * <div kjDatePickerCalendar [kjFor]="t"></div>
 * ```
 *
 * @doc-category Core/Data input
 * @doc
 * @doc-name date-picker
 */
@Directive({
  selector: '[kjDatePickerCalendar]',
  standalone: true,
  exportAs: 'kjDatePickerCalendar',
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
  ],
  providers: [
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => anchoredTo() },
    {
      provide: KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
      useFactory: () => tabCycle({ returnFocus: true }),
    },
  ],
  host: {
    '[attr.aria-modal]': 'kjTrap() ? "true" : "false"',
    '[attr.aria-label]': 'ariaLabel()',
    '(keydown.tab)': 'onTab($event)',
    '(keydown.shift.tab)': 'onTab($event)',
  },
})
export class KjDatePickerCalendar {
  /**
   * Accessible name of the calendar dialog, from the i18n catalog
   * (`datePicker.choose`) — cust F-7: no assistive string is baked into this
   * directive's host block.
   */
  protected readonly ariaLabel = inject(KjTranslateService).translation('datePicker.choose');

  /** @internal */
  readonly ctx = injectParent(KJ_DATE_PICKER, { child: 'KjDatePickerCalendar', parent: '[kjDatePicker]' });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly panel = inject(KjOverlayPanel, { self: true });

  /** Preferred side of the trigger the calendar opens on. Default `'bottom'`. */
  readonly kjSide   = input<KjSide>('bottom');
  /** Alignment along that side. Default `'start'`. */
  readonly kjAlign  = input<KjAlign>('start');
  /** Gap in px between the trigger and the calendar. Default `4`. */
  readonly kjOffset = input<number, unknown>(4, { transform: pxOffset(4) });
  /**
   * Trap Tab inside the calendar and expose it as a modal dialog
   * (`aria-modal="true"`). Default `false`: Tab leaves the calendar and
   * closes it.
   */
  readonly kjTrap   = input(false, { transform: booleanAttribute });

  constructor() {
    injectAnchoredPosition({ side: this.kjSide, align: this.kjAlign, offset: this.kjOffset });
    const trap = inject(KJ_OVERLAY_FOCUS_TRAP_STRATEGY) as ReturnType<typeof tabCycle>;
    trap.configure({ enabled: () => this.kjTrap(), initialFocus: () => this.activeDay() });
  }

  /** The calendar's roving tab stop (the selected or current day), when a calendar is projected. */
  activeDay(): HTMLElement | null {
    return this.host.querySelector<HTMLElement>('[tabindex="0"]');
  }

  /** Moves focus onto the active day, or the panel itself when no calendar is projected. */
  focusActiveDay(): void {
    const target = this.activeDay();
    if (target) {
      target.focus();
      return;
    }
    if (!this.host.hasAttribute('tabindex')) this.host.setAttribute('tabindex', '-1');
    this.host.focus();
  }

  /**
   * Non-modal: Tab leaves the calendar. The popup closes and focus goes
   * back to the input first, so the browser's own Tab step continues from
   * the input to the next field rather than from the portalled panel.
   */
  protected onTab(_event: Event): void {
    if (this.kjTrap()) return;
    const controller = this.panel.controller;
    if (!controller?.isOpen()) return;
    controller.close('programmatic');
    controller.triggerEl()?.focus();
  }
}
