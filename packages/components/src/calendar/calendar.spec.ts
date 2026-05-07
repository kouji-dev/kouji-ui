import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjCalendarComponent } from './calendar';

@Component({
  standalone: true,
  imports: [KjCalendarComponent],
  template: `<kj-calendar [(kjValue)]="value" />`,
})
class HostComponent {
  value = signal<Date | null>(new Date(2025, 3, 15));
}

describe('KjCalendarComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders the calendar shell with the .kj-calendar class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kj-calendar')).not.toBeNull();
  });

  test('renders the prev/next nav buttons with aria-label', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[aria-label="Previous month"]')).not.toBeNull();
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
});
