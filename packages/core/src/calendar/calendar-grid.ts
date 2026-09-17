import { Directive, ElementRef, computed, inject } from '@angular/core';
import {
  buildMonthMatrix,
  weekdayLongNames,
  weekdayShortNames,
} from './date-utils';
import { KJ_CALENDAR } from './calendar.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Calendar grid directive. Hosts the `<table role="grid">` and exposes the
 * 6×7 day matrix plus locale-aware weekday headers. The `(keydown)` handler
 * implements the APG keyboard contract — see `KjCalendar` for the full key
 * map. Also tracks whether focus is inside the grid, which is what lets DOM
 * focus follow the roving cell during keyboard navigation and nothing else.
 *
 * @doc-category Core/Data input
 * @doc
 * @doc-name calendar
 */
@Directive({
  selector: '[kjCalendarGrid]',
  standalone: true,
  exportAs: 'kjCalendarGrid',
  host: {
    'role': 'grid',
    '[attr.aria-labelledby]': 'ctx.captionId()',
    '(keydown)': 'onKeydown($event)',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class KjCalendarGrid {
  /** @internal */
  readonly ctx = injectParent(KJ_CALENDAR, { child: 'KjCalendarGrid', parent: '[kjCalendar]' });
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * @internal True while focus sits inside the grid. A focused cell being
   * removed (the month re-rendered under it) still counts as inside, so the
   * new roving cell can pick focus up.
   */
  focusWithin = false;

  /** 6 weeks × 7 days for the focused month. */
  readonly weeks = computed(() =>
    buildMonthMatrix(this.ctx.focusedDate(), this.ctx.firstDayOfWeek()),
  );

  /** Localised short weekday names (`['Sun','Mon',…]`). */
  readonly weekdayShort = computed(() =>
    weekdayShortNames(this.ctx.locale(), this.ctx.firstDayOfWeek()),
  );

  /** Localised long weekday names (used for `<th abbr>`). */
  readonly weekdayLong = computed(() =>
    weekdayLongNames(this.ctx.locale(), this.ctx.firstDayOfWeek()),
  );

  /** @internal */
  onFocusIn(): void {
    this.focusWithin = true;
  }

  /** @internal */
  onFocusOut(event: FocusEvent): void {
    const to = event.relatedTarget as Node | null;
    // Chrome fires focusout when the focused element leaves the DOM (Firefox
    // does not); a disconnected target is a month change, not a real exit.
    this.focusWithin = to
      ? this.el.nativeElement.contains(to)
      : !(event.target as Node | null)?.isConnected;
  }

  /** @internal — APG keyboard contract for the grid. */
  onKeydown(event: KeyboardEvent): void {
    if (this.ctx.disabled()) return;
    const key = event.key;
    let handled = true;
    switch (key) {
      case 'ArrowLeft':
        this.ctx.moveFocus('day', -1);
        break;
      case 'ArrowRight':
        this.ctx.moveFocus('day', 1);
        break;
      case 'ArrowUp':
        this.ctx.moveFocus('week', -1);
        break;
      case 'ArrowDown':
        this.ctx.moveFocus('week', 1);
        break;
      case 'Home':
        this.ctx.moveFocusToWeekBoundary('start');
        break;
      case 'End':
        this.ctx.moveFocusToWeekBoundary('end');
        break;
      case 'PageUp':
        this.ctx.moveFocus(event.shiftKey ? 'year' : 'month', -1);
        break;
      case 'PageDown':
        this.ctx.moveFocus(event.shiftKey ? 'year' : 'month', 1);
        break;
      case 'Enter':
      case ' ':
        this.ctx.selectDate(this.ctx.focusedDate());
        break;
      default:
        handled = false;
    }
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
