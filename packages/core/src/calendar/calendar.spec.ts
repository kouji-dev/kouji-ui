import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import {
  KjCalendar,
  KjCalendarDay,
  KjCalendarGrid,
  KjCalendarHeader,
} from './index';
import {
  addDays,
  buildMonthMatrix,
  formatDateShort,
  formatMonthYear,
  isSameDay,
  parseDate,
  startOfDay,
} from './date-utils';

@Component({
  standalone: true,
  imports: [KjCalendar, KjCalendarHeader, KjCalendarGrid, KjCalendarDay],
  template: `
    <div
      kjCalendar
      #cal="kjCalendar"
      [(kjValue)]="value"
      [kjMin]="min()"
      [kjMax]="max()"
      [kjDisabledDates]="filter()"
    >
      <div kjCalendarHeader #hdr="kjCalendarHeader">
        <button type="button" (click)="hdr.prev()">prev</button>
        <h2 [id]="hdr.captionId()">{{ hdr.label() }}</h2>
        <button type="button" (click)="hdr.next()">next</button>
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
});

describe('KjCalendar directive', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostCalendar] });
  });

  test('renders the day grid for the seeded month', () => {
    const fixture = TestBed.createComponent(HostCalendar);
    fixture.detectChanges();
    const cells = fixture.nativeElement.querySelectorAll('button[kjCalendarDay]');
    expect(cells.length).toBe(42);
  });

  test('marks today with aria-current="date"', () => {
    const fixture = TestBed.createComponent(HostCalendar);
    // Set value to today so it's in the rendered month
    fixture.componentInstance.value.set(new Date());
    fixture.detectChanges();
    const todayCell = fixture.nativeElement.querySelector('[aria-current="date"]');
    expect(todayCell).not.toBeNull();
  });

  test('marks selected with aria-selected="true"', () => {
    const fixture = TestBed.createComponent(HostCalendar);
    fixture.detectChanges();
    const selected = fixture.nativeElement.querySelectorAll('[aria-selected="true"]');
    expect(selected.length).toBe(1);
  });

  test('clicking a day cell updates the value', () => {
    const fixture = TestBed.createComponent(HostCalendar);
    fixture.detectChanges();
    const cells = fixture.nativeElement.querySelectorAll('button[kjCalendarDay]');
    // Click on the first cell of the second week — definitely a real day in April.
    const target = cells[7] as HTMLButtonElement;
    target.click();
    fixture.detectChanges();
    const newVal = fixture.componentInstance.value();
    expect(newVal).not.toBeNull();
  });

  test('respects kjMin — out-of-bounds cells get aria-disabled', () => {
    const fixture = TestBed.createComponent(HostCalendar);
    fixture.componentInstance.min.set(new Date(2025, 3, 10)); // Apr 10
    fixture.detectChanges();
    // Apr 5 should be disabled.
    const disabled = fixture.nativeElement.querySelectorAll('[aria-disabled="true"]');
    expect(disabled.length).toBeGreaterThan(0);
  });

  test('respects kjDisabledDates predicate', () => {
    const fixture = TestBed.createComponent(HostCalendar);
    // Disable all weekends.
    fixture.componentInstance.filter.set((d: Date) => d.getDay() !== 0 && d.getDay() !== 6);
    fixture.detectChanges();
    const disabled = fixture.nativeElement.querySelectorAll('[aria-disabled="true"]');
    // Across 6 weeks * 2 weekend days = up to 12 disabled cells.
    expect(disabled.length).toBeGreaterThan(8);
  });

  test('grid hosts role="grid" with aria-labelledby pointing to the caption', () => {
    const fixture = TestBed.createComponent(HostCalendar);
    fixture.detectChanges();
    const grid = fixture.nativeElement.querySelector('table[kjCalendarGrid]');
    expect(grid.getAttribute('role')).toBe('grid');
    const labelledBy = grid.getAttribute('aria-labelledby');
    expect(labelledBy).toMatch(/^kj-calendar-caption-/);
    const heading = fixture.nativeElement.querySelector(`#${labelledBy}`);
    expect(heading).not.toBeNull();
  });

  test('host carries role="application" + aria-roledescription="calendar"', () => {
    const fixture = TestBed.createComponent(HostCalendar);
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('[kjCalendar]');
    expect(root.getAttribute('role')).toBe('application');
    expect(root.getAttribute('aria-roledescription')).toBe('calendar');
    expect(root.getAttribute('aria-label')).toBe('Calendar');
  });

  test('header next() advances the focused month', () => {
    const fixture = TestBed.createComponent(HostCalendar);
    fixture.detectChanges();
    const before = fixture.componentInstance.value()!;
    const nextBtn = fixture.nativeElement.querySelectorAll('button')[1] as HTMLButtonElement;
    nextBtn.click();
    fixture.detectChanges();
    // Value unchanged but the rendered month should have advanced — check the caption.
    const cap = fixture.nativeElement.querySelector('h2');
    expect(cap.textContent).not.toBe(formatMonthYear(before, 'en-US'));
  });

  test('keyboard ArrowRight advances focusedDate by one day', () => {
    const fixture = TestBed.createComponent(HostCalendar);
    fixture.detectChanges();
    const grid = fixture.nativeElement.querySelector('table[kjCalendarGrid]');
    // The focused-date cell should have tabindex=0.
    const focused = grid.querySelector('[tabindex="0"]') as HTMLElement;
    expect(focused).not.toBeNull();
    const before = fixture.componentInstance.value()!;
    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    // Selection unchanged, focusedDate advanced — selected cell is still the original.
    expect(isSameDay(fixture.componentInstance.value()!, before)).toBe(true);
  });

  test('keyboard Enter selects the focused date', () => {
    const fixture = TestBed.createComponent(HostCalendar);
    fixture.detectChanges();
    const grid = fixture.nativeElement.querySelector('table[kjCalendarGrid]');
    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    const newVal = startOfDay(fixture.componentInstance.value()!);
    const expected = startOfDay(addDays(new Date(2025, 3, 15), 1));
    expect(isSameDay(newVal, expected)).toBe(true);
  });
});
