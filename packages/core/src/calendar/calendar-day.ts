import { isPlatformBrowser } from '@angular/common';
import {
  DOCUMENT,
  Directive,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { formatDateLong, isSameDay, isSameMonth } from './date-utils';
import { KjCalendarGrid } from './calendar-grid';
import { KJ_CALENDAR } from './calendar.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * A single day cell's control. Apply to the `<button>` inside a `<td>` of the
 * `[kjCalendarGrid]` table: the `<td>` is the `gridcell`, the button keeps
 * its native role (a gridcell holding one widget puts focus on the widget,
 * per the APG grid pattern). Exposes the computed flags `isSelected`,
 * `isToday`, `isDisabled`, `isOutsideMonth` as `data-*` attributes so themes
 * paint without re-deriving them.
 *
 * Roving `tabindex`: only the cell whose date matches `focusedDate()` carries
 * `tabindex="0"`; all others are `tabindex="-1"`. DOM focus follows the
 * roving cell only while focus is already inside the grid, so mounting a
 * calendar or clicking its month buttons never steals focus. Clicking a cell
 * calls `selectDate()` on the context.
 *
 * Selection is conveyed with `aria-pressed`; disabled dates stay focusable
 * with `aria-disabled="true"` and a click guard rather than a native
 * `disabled` attribute. The host's `aria-label` is auto-set to a locale-aware
 * long form (`"Tuesday, April 15, 2025"`) for SR clarity. Visible text is the
 * day-of-month only (consumer renders `{{ day.dayNumber() }}`).
 *
 * @doc-category Core/Data input
 * @doc
 * @doc-name calendar
 */
@Directive({
  selector: '[kjCalendarDay]',
  standalone: true,
  exportAs: 'kjCalendarDay',
  host: {
    'type': 'button',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-pressed]': 'isSelected() ? "true" : "false"',
    '[attr.aria-current]': 'isToday() ? "date" : null',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '[attr.tabindex]': 'isTabStop() ? "0" : "-1"',
    '[attr.data-selected]': 'isSelected() ? "" : null',
    '[attr.data-today]': 'isToday() ? "" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.data-outside-month]': 'isOutsideMonth() ? "" : null',
    '(click)': 'onClick($event)',
  },
})
export class KjCalendarDay {
  private readonly ctx = injectParent(KJ_CALENDAR, { child: 'KjCalendarDay', parent: '[kjCalendar]' });
  private readonly grid = inject(KjCalendarGrid, { optional: true });
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** The date this cell represents. */
  readonly kjDate = input.required<Date>();

  readonly isSelected = computed(() => {
    const v = this.ctx.value();
    return !!v && isSameDay(v, this.kjDate());
  });

  readonly isToday = computed(() => {
    const today = this.ctx.today();
    return !!today && isSameDay(this.kjDate(), today);
  });

  readonly isDisabled = computed(() => this.ctx.isDisabled(this.kjDate()));

  readonly isFocused = computed(() => isSameDay(this.kjDate(), this.ctx.focusedDate()));

  /** The grid's single tab stop: the roving cell, unless the whole calendar is disabled. */
  readonly isTabStop = computed(() => this.isFocused() && !this.ctx.disabled());

  readonly isOutsideMonth = computed(
    () => !isSameMonth(this.kjDate(), this.ctx.focusedDate()),
  );

  readonly ariaLabel = computed(() => formatDateLong(this.kjDate(), this.ctx.locale()));

  /** Day-of-month number for the visible text. */
  readonly dayNumber = computed(() => this.kjDate().getDate());

  constructor() {
    effect(() => {
      if (!this.isTabStop() || !this.isBrowser) return;
      // Keyboard navigation only: a cell that becomes the roving cell while
      // focus is elsewhere (mount, month buttons, bounds change) is left alone.
      if (!this.grid?.focusWithin) return;
      const el = this.el.nativeElement;
      if (this.doc.activeElement === el) return;
      // Defer so the DOM has the new tabindex and a re-rendered month is in place.
      queueMicrotask(() => {
        if (!this.isTabStop() || !this.grid?.focusWithin) return;
        try {
          el.focus({ preventScroll: true });
        } catch {
          /* noop */
        }
      });
    });
  }

  /** @internal */
  onClick(event: MouseEvent): void {
    event.preventDefault();
    if (this.isDisabled()) return;
    this.ctx.selectDate(this.kjDate());
  }
}
