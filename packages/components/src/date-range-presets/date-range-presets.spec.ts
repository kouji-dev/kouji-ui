import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjDateRangePresetsComponent } from './date-range-presets';
import type { KjDateRange } from '@kouji-ui/core';

const NOW = new Date(2026, 6, 15);

@Component({
  standalone: true,
  imports: [KjDateRangePresetsComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-date-range-presets [(kjValue)]="range" [kjNow]="now" />`,
})
class Host {
  now = NOW;
  range = signal<KjDateRange | null>(null);
}

describe('KjDateRangePresetsComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Host] });
  });

  test('renders a labeled listbox of preset options', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const list = fixture.nativeElement.querySelector('[role="listbox"]');
    expect(list).toBeTruthy();
    expect(list.getAttribute('aria-label')).toBe('Date range presets');
    const options = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(options.length).toBe(10);
  });

  test('clicking a preset commits its range and marks it selected', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll('button');
    (options[0] as HTMLButtonElement).click(); // Today
    fixture.detectChanges();
    const r = fixture.componentInstance.range()!;
    expect(r.start).toEqual(new Date(2026, 6, 15));
    expect(r.end).toEqual(new Date(2026, 6, 15));
    expect(options[0].getAttribute('aria-selected')).toBe('true');
    expect(options[0].hasAttribute('data-selected')).toBe(true);
  });

  test('Enter on a focused preset selects it (native button activation)', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll('button');
    // last-7-days is index 2 — dispatch a real click (Enter triggers click on buttons)
    (options[2] as HTMLButtonElement).click();
    fixture.detectChanges();
    const r = fixture.componentInstance.range()!;
    expect(r.start).toEqual(new Date(2026, 6, 9));
  });
});
