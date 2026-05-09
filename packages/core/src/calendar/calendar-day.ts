import { isPlatformBrowser } from '@angular/common';
import {
  Directive,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { formatDateLong, isSameDay, isSameMonth } from './date-utils';
import { KJ_CALENDAR } from './calendar.context';

/**
 * A single day cell in the calendar grid. Apply to a `<button>` (preferred —
 * native focusability) or a `<td>` containing a `<button>`. Exposes the
 * computed flags `isSelected`, `isToday`, `isDisabled`, `isOutsideMonth` as
 * `data-*` attributes so themes paint without re-deriving them.
 *
 * Roving `tabindex`: only the cell whose date matches `focusedDate()` carries
 * `tabindex="0"`; all others are `tabindex="-1"`. Clicking a cell calls
 * `selectDate()` on the context.
 *
 * The host's `aria-label` is auto-set to a locale-aware long form
 * (`"Tuesday, April 15, 2025"`) for SR clarity. Visible text is the
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
    'role': 'gridcell',
    'type': 'button',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-selected]': 'isSelected() ? "true" : null',
    '[attr.aria-current]': 'isToday() ? "date" : null',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '[attr.tabindex]': 'isFocused() ? "0" : "-1"',
    '[attr.disabled]': 'isDisabled() ? "" : null',
    '[attr.data-selected]': 'isSelected() ? "" : null',
    '[attr.data-today]': 'isToday() ? "" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.data-outside-month]': 'isOutsideMonth() ? "" : null',
    '(click)': 'onClick($event)',
  },
})
export class KjCalendarDay {
  private readonly ctx = inject(KJ_CALENDAR);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  /** The date this cell represents. */
  readonly kjDate = input.required<Date>();

  readonly isSelected = computed(() => {
    const v = this.ctx.value();
    return !!v && isSameDay(v, this.kjDate());
  });

  readonly isToday = computed(() => isSameDay(this.kjDate(), new Date()));

  readonly isDisabled = computed(() => this.ctx.isDisabled(this.kjDate()));

  readonly isFocused = computed(() => isSameDay(this.kjDate(), this.ctx.focusedDate()));

  readonly isOutsideMonth = computed(
    () => !isSameMonth(this.kjDate(), this.ctx.focusedDate()),
  );

  readonly ariaLabel = computed(() => formatDateLong(this.kjDate(), this.ctx.locale()));

  /** Day-of-month number for the visible text. */
  readonly dayNumber = computed(() => this.kjDate().getDate());

  constructor() {
    // Whenever this cell becomes the focused one, request focus.
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      if (this.isFocused() && document.activeElement !== this.el.nativeElement) {
        // Defer so the DOM has the new tabindex.
        queueMicrotask(() => {
          if (this.isFocused()) {
            try { this.el.nativeElement.focus({ preventScroll: true }); } catch { /* noop */ }
          }
        });
      }
    });
  }

  /** @internal */
  onClick(event: MouseEvent): void {
    event.preventDefault();
    if (this.isDisabled()) return;
    this.ctx.selectDate(this.kjDate());
  }
}
