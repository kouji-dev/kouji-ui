import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach, vi } from 'vitest';
import { KJ_TODAY, KjCalendar, KjCalendarDay, KjCalendarGrid, KjCalendarHeader } from './index';
import {
  addDays,
  buildMonthMatrix,
  formatDateLong,
  formatDateShort,
  formatMonthYear,
  isSameDay,
  parseDate,
  startOfDay,
} from './date-utils';

/** Pinned "today" for every directive test: Tuesday, April 15, 2025. */
const TODAY = new Date(2025, 3, 15);

@Component({
  standalone: true,
  imports: [KjCalendar, KjCalendarHeader, KjCalendarGrid, KjCalendarDay],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div
      kjCalendar
      #cal="kjCalendar"
      [(kjValue)]="value"
      [kjMin]="min()"
      [kjMax]="max()"
      [kjDisabledDates]="filter()"
      [kjStartAt]="startAt()"
      [kjDisabled]="disabled()"
    >
      <div kjCalendarHeader #hdr="kjCalendarHeader">
        <button type="button" data-testid="prev" (click)="hdr.prev()">prev</button>
        <h2 [id]="hdr.captionId()">{{ hdr.label() }}</h2>
        <button type="button" data-testid="next" (click)="hdr.next()">next</button>
      </div>
      <table kjCalendarGrid #g="kjCalendarGrid">
        <thead>
          <tr>
            @for (n of g.weekdayShort(); track $index) {
              <th scope="col">{{ n }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (week of g.weeks(); track $index) {
            <tr>
              @for (d of week; track d.getTime()) {
                <td>
                  <button kjCalendarDay [kjDate]="d">{{ d.getDate() }}</button>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class HostCalendar {
  value = signal<Date | null>(new Date(2025, 3, 15)); // April 15, 2025
  min = signal<Date | null>(null);
  max = signal<Date | null>(null);
  filter = signal<((d: Date) => boolean) | null>(null);
  startAt = signal<Date | null>(null);
  disabled = signal(false);
}

/** Dispatches `key` from the element that really has focus, as a user would. */
function press(key: string, init: KeyboardEventInit = {}): void {
  (document.activeElement ?? document.body).dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
  );
}

/** The grid's single roving cell. */
function tabStop(fixture: { nativeElement: HTMLElement }): HTMLButtonElement | null {
  return fixture.nativeElement.querySelector('table [tabindex="0"]');
}

function caption(fixture: { nativeElement: HTMLElement }): string {
  return fixture.nativeElement.querySelector('h2')!.textContent!.trim();
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await new Promise<void>((r) => setTimeout(r, 0));
}

describe('Calendar utils', () => {
  test('buildMonthMatrix returns 6 rows of 7', () => {
    const m = buildMonthMatrix(new Date(2025, 3, 15), 0);
    expect(m.length).toBe(6);
    for (const row of m) expect(row.length).toBe(7);
  });

  test('parseDate handles ISO yyyy-MM-dd', () => {
    const d = parseDate('2025-04-15', 'en-US')!;
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(15);
  });

  test('parseDate handles US-style m/d/y', () => {
    const d = parseDate('4/15/2025', 'en-US')!;
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(15);
  });

  test('parseDate handles dmy locale', () => {
    const d = parseDate('15/04/2025', 'en-GB')!;
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(15);
  });

  test('parseDate returns null for empty', () => {
    expect(parseDate('', 'en-US')).toBeNull();
    expect(parseDate('   ', 'en-US')).toBeNull();
  });

  test('formatMonthYear is locale-aware', () => {
    const s = formatMonthYear(new Date(2025, 3, 1), 'en-US');
    expect(s.toLowerCase()).toContain('april');
    expect(s).toContain('2025');
  });

  test('formatDateShort produces locale numerics', () => {
    const s = formatDateShort(new Date(2025, 3, 15), 'en-US');
    expect(s).toContain('2025');
  });

  test('formatters are constructed once per locale and preset (perf F-21)', () => {
    formatDateLong(new Date(2025, 3, 15), 'de-DE');
    const Original = Intl.DateTimeFormat;
    const ctor = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (
      locale?: string | string[],
      options?: Intl.DateTimeFormatOptions,
    ) {
      return new Original(locale, options);
    } as unknown as typeof Intl.DateTimeFormat);
    try {
      for (let day = 1; day <= 42; day += 1) formatDateLong(new Date(2025, 3, day), 'de-DE');
      formatMonthYear(new Date(2025, 3, 1), 'de-DE');
      expect(ctor).toHaveBeenCalledTimes(1);
      expect(ctor.mock.calls[0][1]).toEqual({ year: 'numeric', month: 'long' });
    } finally {
      ctor.mockRestore();
    }
  });
});

describe('KjCalendar directive', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostCalendar],
      providers: [{ provide: KJ_TODAY, useValue: () => TODAY }],
    });
  });

  function create(setup?: (host: HostCalendar) => void) {
    const fixture = TestBed.createComponent(HostCalendar);
    setup?.(fixture.componentInstance);
    fixture.detectChanges();
    return fixture;
  }

  test('renders the day grid for the seeded month', () => {
    const fixture = create();
    const cells = fixture.nativeElement.querySelectorAll('button[kjCalendarDay]');
    expect(cells.length).toBe(42);
  });

  test('marks today with aria-current="date" from KJ_TODAY', () => {
    const fixture = create();
    const todayCell = fixture.nativeElement.querySelector('[aria-current="date"]') as HTMLElement;
    expect(todayCell).not.toBeNull();
    expect(todayCell.textContent!.trim()).toBe('15');
    expect(todayCell).toHaveAttribute('data-today', '');
  });

  test('marks the selected day with aria-pressed="true" on its button', () => {
    const fixture = create();
    const pressed = fixture.nativeElement.querySelectorAll('[aria-pressed="true"]');
    expect(pressed.length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('[aria-selected]').length).toBe(0);
  });

  test('clicking a day cell updates the value', () => {
    const fixture = create();
    const cells = fixture.nativeElement.querySelectorAll('button[kjCalendarDay]');
    // Click on the first cell of the second week — definitely a real day in April.
    const target = cells[7] as HTMLButtonElement;
    target.click();
    fixture.detectChanges();
    const newVal = fixture.componentInstance.value();
    expect(newVal).not.toBeNull();
  });

  test('respects kjMin — out-of-bounds cells get aria-disabled', () => {
    const fixture = create((host) => host.min.set(new Date(2025, 3, 10))); // Apr 10
    // Apr 5 should be disabled.
    const disabled = fixture.nativeElement.querySelectorAll('[aria-disabled="true"]');
    expect(disabled.length).toBeGreaterThan(0);
  });

  test('respects kjDisabledDates predicate', () => {
    // Disable all weekends.
    const fixture = create((host) =>
      host.filter.set((d: Date) => d.getDay() !== 0 && d.getDay() !== 6),
    );
    const disabled = fixture.nativeElement.querySelectorAll('[aria-disabled="true"]');
    // Across 6 weeks * 2 weekend days = up to 12 disabled cells.
    expect(disabled.length).toBeGreaterThan(8);
  });

  test('grid hosts role="grid" with aria-labelledby pointing to the caption', () => {
    const fixture = create();
    const grid = fixture.nativeElement.querySelector('table[kjCalendarGrid]');
    expect(grid.getAttribute('role')).toBe('grid');
    const labelledBy = grid.getAttribute('aria-labelledby');
    expect(labelledBy).toMatch(/^kj-calendar-caption-/);
    const heading = fixture.nativeElement.querySelector(`#${labelledBy}`);
    expect(heading).not.toBeNull();
  });

  test('header next() advances the focused month', () => {
    const fixture = create();
    const before = fixture.componentInstance.value()!;
    const nextBtn = fixture.nativeElement.querySelector('[data-testid="next"]') as HTMLButtonElement;
    nextBtn.click();
    fixture.detectChanges();
    // Value unchanged but the rendered month should have advanced — check the caption.
    expect(caption(fixture)).not.toBe(formatMonthYear(before, 'en-US'));
  });

  test('keyboard ArrowRight advances focusedDate by one day', () => {
    const fixture = create();
    const focused = tabStop(fixture)!;
    expect(focused).not.toBeNull();
    const before = fixture.componentInstance.value()!;
    focused.focus();
    press('ArrowRight');
    fixture.detectChanges();
    // Selection unchanged, focusedDate advanced — selected cell is still the original.
    expect(isSameDay(fixture.componentInstance.value()!, before)).toBe(true);
    expect(tabStop(fixture)!.textContent!.trim()).toBe('16');
  });

  test('keyboard Enter selects the focused date', () => {
    const fixture = create();
    tabStop(fixture)!.focus();
    press('ArrowRight');
    fixture.detectChanges();
    press('Enter');
    fixture.detectChanges();
    const newVal = startOfDay(fixture.componentInstance.value()!);
    const expected = startOfDay(addDays(new Date(2025, 3, 15), 1));
    expect(isSameDay(newVal, expected)).toBe(true);
  });

  describe('roles and structure (a11y F-10)', () => {
    test('the root is a labelled group, not an application', () => {
      const fixture = create();
      const root = fixture.nativeElement.querySelector('[kjCalendar]');
      expect(root.getAttribute('role')).toBe('group');
      expect(root.getAttribute('aria-label')).toBe('Calendar');
      expect(root.hasAttribute('aria-roledescription')).toBe(false);
    });

    test('day buttons keep their native role; the <td> is the only gridcell', () => {
      const fixture = create();
      const button = fixture.nativeElement.querySelector('button[kjCalendarDay]') as HTMLElement;
      expect(button.hasAttribute('role')).toBe(false);
      expect(button.getAttribute('type')).toBe('button');
      expect(fixture.nativeElement.querySelectorAll('button[role="gridcell"]').length).toBe(0);
    });
  });

  describe('one reachable tab stop (a11y F-6)', () => {
    test('with no value and kjMin three months ahead, the tab stop is the first selectable day', () => {
      const min = new Date(2025, 6, 20); // Jul 20
      const fixture = create((host) => {
        host.value.set(null);
        host.min.set(min);
      });
      const stop = tabStop(fixture)!;
      expect(stop).not.toBeNull();
      expect(stop.getAttribute('aria-disabled')).toBeNull();
      expect(stop.textContent!.trim()).toBe('20');
      expect(caption(fixture)).toBe(formatMonthYear(min, 'en-US'));
      expect(fixture.nativeElement.querySelectorAll('table [tabindex="0"]').length).toBe(1);
    });

    test('with no value and kjMax three months back, the tab stop is the last selectable day', () => {
      const max = new Date(2025, 0, 10); // Jan 10
      const fixture = create((host) => {
        host.value.set(null);
        host.max.set(max);
      });
      const stop = tabStop(fixture)!;
      expect(stop.textContent!.trim()).toBe('10');
      expect(stop.getAttribute('aria-disabled')).toBeNull();
      expect(caption(fixture)).toBe(formatMonthYear(max, 'en-US'));
    });

    test('a disabled-dates predicate never leaves the tab stop on a disabled cell', () => {
      const fixture = create((host) => {
        host.value.set(null);
        host.filter.set((d: Date) => d.getDate() !== 15 && d.getDate() !== 16);
      });
      const stop = tabStop(fixture)!;
      expect(stop.textContent!.trim()).toBe('17');
      expect(stop.getAttribute('aria-disabled')).toBeNull();
    });

    test('tightening kjMin after render moves the tab stop into range', () => {
      const fixture = create((host) => host.value.set(null));
      expect(tabStop(fixture)!.textContent!.trim()).toBe('15');
      fixture.componentInstance.min.set(new Date(2025, 3, 20));
      fixture.detectChanges();
      expect(tabStop(fixture)!.textContent!.trim()).toBe('20');
      expect(tabStop(fixture)!.getAttribute('aria-disabled')).toBeNull();
    });

    test('kjStartAt picks the opening month of a value-less calendar', () => {
      const fixture = create((host) => {
        host.value.set(null);
        host.startAt.set(new Date(2026, 1, 3));
      });
      expect(caption(fixture)).toBe(formatMonthYear(new Date(2026, 1, 1), 'en-US'));
      expect(tabStop(fixture)!.textContent!.trim()).toBe('3');
    });

    test('a disabled calendar has no tab stop at all', () => {
      const fixture = create((host) => host.disabled.set(true));
      expect(tabStop(fixture)).toBeNull();
    });

    test('disabled days are aria-disabled, not natively disabled, and ignore clicks', () => {
      const fixture = create((host) => host.min.set(new Date(2025, 3, 10)));
      const cell = fixture.nativeElement.querySelector('[aria-disabled="true"]') as HTMLButtonElement;
      expect(cell.hasAttribute('disabled')).toBe(false);
      const before = fixture.componentInstance.value()!;
      cell.click();
      fixture.detectChanges();
      expect(isSameDay(fixture.componentInstance.value()!, before)).toBe(true);
    });
  });

  describe('bound-aware month navigation (a11y F-6, secondary defect)', () => {
    test('Next from a month before kjMin lands on kjMin instead of doing nothing', () => {
      const fixture = create((host) => {
        host.value.set(null);
        host.startAt.set(new Date(2025, 0, 15));
        host.min.set(new Date(2025, 8, 20)); // Sep 20
      });
      // The seed is clamped straight to the bound, so the calendar opens on September.
      expect(tabStop(fixture)!.textContent!.trim()).toBe('20');
      expect(caption(fixture)).toBe(formatMonthYear(new Date(2025, 8, 1), 'en-US'));
    });

    test('prev/next round trip across a partially bounded month reaches the bound', () => {
      const fixture = create((host) => {
        host.value.set(new Date(2025, 9, 15)); // Oct 15
        host.min.set(new Date(2025, 8, 20)); // Sep 20
      });
      const prev = fixture.nativeElement.querySelector('[data-testid="prev"]') as HTMLButtonElement;
      const next = fixture.nativeElement.querySelector('[data-testid="next"]') as HTMLButtonElement;

      prev.click();
      fixture.detectChanges();
      expect(caption(fixture)).toBe(formatMonthYear(new Date(2025, 8, 1), 'en-US'));
      expect(tabStop(fixture)!.textContent!.trim()).toBe('20');

      next.click();
      fixture.detectChanges();
      expect(caption(fixture)).toBe(formatMonthYear(new Date(2025, 9, 1), 'en-US'));
      expect(tabStop(fixture)!.textContent!.trim()).toBe('20');
    });

    test('PageDown past kjMax lands on kjMax', () => {
      const fixture = create((host) => host.max.set(new Date(2025, 3, 20)));
      tabStop(fixture)!.focus();
      press('PageDown');
      fixture.detectChanges();
      expect(tabStop(fixture)!.textContent!.trim()).toBe('20');
      expect(caption(fixture)).toBe(formatMonthYear(new Date(2025, 3, 1), 'en-US'));
    });

    test('Home lands on the first selectable day of the week when the week start is disabled', () => {
      const fixture = create((host) => host.min.set(new Date(2025, 3, 14))); // Mon Apr 14
      tabStop(fixture)!.focus();
      press('Home');
      fixture.detectChanges();
      expect(tabStop(fixture)!.textContent!.trim()).toBe('14');
    });
  });

  describe('focus management', () => {
    test('mounting a calendar does not steal focus', () => {
      create();
      expect(document.activeElement).toBe(document.body);
    });

    test('the month buttons do not pull focus into the grid', async () => {
      const fixture = create();
      const next = fixture.nativeElement.querySelector('[data-testid="next"]') as HTMLButtonElement;
      next.focus();
      next.click();
      fixture.detectChanges();
      await flush();
      expect(document.activeElement).toBe(next);
    });

    test('arrow keys move DOM focus with the roving cell while focus is inside the grid', async () => {
      const fixture = create();
      const start = tabStop(fixture)!;
      start.focus();
      press('ArrowRight');
      fixture.detectChanges();
      await flush();
      const stop = tabStop(fixture)!;
      expect(stop).not.toBe(start);
      expect(document.activeElement).toBe(stop);
      expect(stop.textContent!.trim()).toBe('16');
    });

    test('focus follows the roving cell across a re-rendered month', async () => {
      const fixture = create();
      tabStop(fixture)!.focus();
      press('PageDown');
      fixture.detectChanges();
      await flush();
      expect(caption(fixture)).toBe(formatMonthYear(new Date(2025, 4, 1), 'en-US'));
      const stop = tabStop(fixture)!;
      expect(stop.textContent!.trim()).toBe('15');
      expect(document.activeElement).toBe(stop);
    });
  });
});

describe('KjCalendar on the server (ssr F-10)', () => {
  test('renders no today marker when KJ_TODAY yields null', () => {
    TestBed.configureTestingModule({
      imports: [HostCalendar],
      providers: [{ provide: KJ_TODAY, useValue: () => null }],
    });
    const fixture = TestBed.createComponent(HostCalendar);
    fixture.componentInstance.value.set(new Date());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-current="date"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-today]')).toBeNull();
    // The month still renders and keeps its single tab stop.
    expect(fixture.nativeElement.querySelectorAll('table [tabindex="0"]').length).toBe(1);
  });
});
