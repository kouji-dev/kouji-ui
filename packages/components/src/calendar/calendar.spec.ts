import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KJ_TODAY } from '@kouji-ui/core';
import { KjCalendarComponent } from './calendar';

@Component({
  standalone: true,
  imports: [KjCalendarComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-calendar [(kjValue)]="value" [kjMin]="min()" [kjStartAt]="startAt()" />`,
})
class HostComponent {
  value = signal<Date | null>(new Date(2025, 3, 15));
  min = signal<Date | null>(null);
  startAt = signal<Date | null>(null);
}

describe('KjCalendarComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: KJ_TODAY, useValue: () => new Date(2025, 3, 15) }],
    });
  });

  test('renders the calendar shell with the .kj-calendar class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kj-calendar')).not.toBeNull();
  });

  test('renders the prev/next nav buttons with aria-label', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('button[aria-label="Previous month"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button[aria-label="Next month"]')).not.toBeNull();
  });

  test('renders 42 day cells (6 × 7)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const cells = fixture.nativeElement.querySelectorAll('button.kj-calendar__day');
    expect(cells.length).toBe(42);
  });

  test('renders 7 weekday columns with abbr', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const headers = fixture.nativeElement.querySelectorAll('th.kj-calendar__weekday');
    expect(headers.length).toBe(7);
    expect((headers[0] as HTMLElement).getAttribute('abbr')?.length).toBeGreaterThan(0);
  });

  test('grid structure is grid > row > gridcell(td) > native button (a11y F-10)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.kj-calendar')!.getAttribute('role')).toBe('group');
    expect(root.querySelectorAll('td.kj-calendar__cell[role="gridcell"]').length).toBe(42);
    expect(root.querySelectorAll('button[role]').length).toBe(0);
    expect(root.querySelectorAll('button.kj-calendar__day[aria-pressed="true"]').length).toBe(1);
    expect(root.querySelector('[aria-current="date"]')).not.toBeNull();
  });

  test('a value-less calendar with kjMin ahead of today still has one reachable day (a11y F-6)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value.set(null);
    fixture.componentInstance.min.set(new Date(2025, 6, 20));
    fixture.detectChanges();
    const stops = fixture.nativeElement.querySelectorAll('button.kj-calendar__day[tabindex="0"]');
    expect(stops.length).toBe(1);
    expect(stops[0].getAttribute('aria-disabled')).toBeNull();
    expect(stops[0].hasAttribute('disabled')).toBe(false);
    expect(stops[0].textContent.trim()).toBe('20');
  });

  test('forwards kjStartAt to the headless root', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value.set(null);
    fixture.componentInstance.startAt.set(new Date(2026, 1, 3));
    fixture.detectChanges();
    const caption = fixture.nativeElement.querySelector('.kj-calendar__caption') as HTMLElement;
    expect(caption.textContent!.toLowerCase()).toContain('february');
  });
});
