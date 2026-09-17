import { Directive, ElementRef, computed, effect, inject, input, untracked } from '@angular/core';
import { KjFormControl } from '../primitives/forms/form-control';
import { KjFocusRing } from '../primitives/interaction/focus-ring';
import { focusInitialIn } from '../a11y/focus-trap';
import { formatDateShort, parseDate } from '../calendar/date-utils';
import { KJ_DATE_PICKER } from './date-picker.context';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import type { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
  type KjTriggerEventStrategy,
} from '../primitives/overlay/tokens';
import type { KjOverlayContext } from '../primitives/overlay/context';
import { onClick } from '../primitives/overlay/strategies/trigger-event/on-click';
import { onFocus } from '../primitives/overlay/strategies/trigger-event/on-focus';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Composite trigger-event strategy: opens the calendar on input focus AND on
 * click of the input (handy for icons inside the input). Mirrors the
 * `hoverOrFocus` factory used by the tooltip migration.
 *
 * Naïvely wiring both `onClick` and `onFocus` to the same `toggle()` is a
 * bug: clicking an unfocused input fires focus → toggle (opens), then
 * click → toggle (closes), so the calendar appears only while the mouse
 * button is held. We swallow any click toggle that fires within a short
 * window after a focus-driven open so the activating click reads as a
 * normal "open" instead of "open-then-close".
 */
function clickOrFocus(): KjTriggerEventStrategy {
  const a = onClick();
  const b = onFocus();
  let userToggle: (() => void) | null = null;
  let suppressClickUntil = 0;
  const guardedClickToggle = () => {
    if (performance.now() < suppressClickUntil) return;
    userToggle?.();
  };
  const focusToggle = () => {
    suppressClickUntil = performance.now() + 300;
    userToggle?.();
  };
  return {
    ariaHasPopup: 'dialog',
    attach(ctx: KjOverlayContext) { a.attach(ctx); b.attach(ctx); },
    bindToggle(t) {
      userToggle = t;
      a.bindToggle(guardedClickToggle);
      b.bindToggle(focusToggle);
    },
    onOpen()  { a.onOpen?.();  b.onOpen?.();  },
    onClose() { a.onClose?.(); b.onClose?.(); },
    detach()  { a.detach();    b.detach();    },
  };
}

/**
 * Date Picker trigger directive. Apply to the `<input>` element. Combines:
 *  - locale-aware **format on render** — when the value changes, the input's
 *    text is overwritten with `Intl.DateTimeFormat`'s short form.
 *  - locale-aware **parse on blur / Enter** — typed text is parsed (ISO,
 *    locale-aware m/d/y or d/m/y) and committed to the picker's value.
 *  - **combobox a11y** — `role="combobox"`; `aria-haspopup`, `aria-expanded`,
 *    and `aria-controls` are wired by the composed `KjOverlayTrigger` host
 *    directive (APG combobox+dialog pattern).
 *  - **keyboard** — `ArrowDown` / `Alt+ArrowDown` opens the popup;
 *    `Escape` closes; `Enter` parses and (if valid) commits.
 *  - **CVA** — composes `KjFormControl` so the input plays with
 *    `formControl` / `[(ngModel)]` bindings on the host.
 *
 * @doc-category Core/Data input
 * @doc
 * @doc-name date-picker
 */
@Directive({
  selector: 'input[kjDatePickerTrigger]',
  exportAs: 'kjDatePickerTrigger',
  standalone: true,
  hostDirectives: [
    KjFormControl,
    KjFocusRing,
    { directive: KjOverlayTrigger, inputs: ['kjOpen'] },
  ],
  providers: [
    KjOverlayController,
    { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => clickOrFocus() },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
  ],
  host: {
    'role': 'combobox',
    'autocomplete': 'off',
    'spellcheck': 'false',
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
  readonly ctx = injectParent(KJ_DATE_PICKER, { child: 'KjDatePickerTrigger', parent: '[kjDatePicker]' });
  /** @internal */
  readonly controller = inject(KjOverlayController);
  private readonly formCtrl = inject(KjFormControl);
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  /** Cached typed text — avoids overwriting mid-edit. */
  private editing = false;

  /**
   * Optional custom display formatter, e.g. for datetime pickers that show
   * the time next to the date. Free-text parsing (`commitTyped`) still uses
   * the locale date parser — text that doesn't parse as a plain date is
   * reverted to the formatted value on the next value change.
   */
  readonly kjDisplayFormat = input<((d: Date, locale: string) => string) | null>(null);

  readonly displayValue = computed(() => {
    const v = this.ctx.value();
    if (!v) return '';
    const fmt = this.kjDisplayFormat();
    return fmt ? fmt(v, this.ctx.locale()) : formatDateShort(v, this.ctx.locale());
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

    // Bridge the root context's `open` (kjOpen model) with the overlay
    // controller so consumers reading or writing `picker.kjOpen` see the
    // same source of truth as the primitive. Each direction tracks only its
    // own source: a controller-side effect that also tracked `ctx.open()`
    // would re-run when the consumer sets `kjOpen` and write the stale
    // controller state straight back over it.
    effect(() => {
      const isOpen = this.controller.isOpen();
      untracked(() => {
        if (this.ctx.open() !== isOpen) this.ctx.open.set(isOpen);
      });
    });
    effect(() => {
      const want = this.ctx.open();
      untracked(() => {
        const isOpen = this.controller.isOpen();
        if (want && !isOpen) {
          if (!this.ctx.disabled() && !this.ctx.readonly()) this.controller.open();
        } else if (!want && isOpen) {
          this.controller.close('programmatic');
        }
      });
    });

    // An explicit keyboard open (ArrowDown) moves focus onto the calendar's
    // active day once the panel is open — WAI-ARIA APG date picker. A
    // focus- or click-driven open leaves focus in the input so typing
    // keeps working.
    effect(() => {
      if (this.controller.state() !== 'open' || !this.focusCalendarOnOpen) return;
      this.focusCalendarOnOpen = false;
      untracked(() => this.focusCalendar());
    });
  }

  /** Set by ArrowDown; consumed once the overlay reports `'open'`. */
  private focusCalendarOnOpen = false;

  /** Moves focus onto the calendar's roving tab stop (the active day), else the panel itself. */
  private focusCalendar(): void {
    const panel = this.controller.panelEl();
    if (panel) focusInitialIn(panel, () => panel.querySelector<HTMLElement>('[tabindex="0"]'));
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
    if (event.key === 'ArrowDown') {
      // APG date picker: ArrowDown opens the calendar and moves focus onto
      // its active day. The calendar may already be open from the focus
      // that preceded the keystroke; then the key only moves focus.
      event.preventDefault();
      if (this.ctx.disabled() || this.ctx.readonly()) return;
      if (this.controller.state() === 'open') {
        this.focusCalendar();
        return;
      }
      this.focusCalendarOnOpen = true;
      this.controller.open();
      return;
    }
    if (event.key === 'Escape' && this.controller.isOpen()) {
      event.preventDefault();
      this.controller.close('escape');
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

  private readonly _overlayTrigger = inject(KjOverlayTrigger, { self: true });
  attachPanel(panel: KjOverlayPanel): void {
    this._overlayTrigger.attachPanel(panel);
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
