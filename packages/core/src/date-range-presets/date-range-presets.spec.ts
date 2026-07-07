import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import {
  KjDateRangePresets,
  KjDateRangePresetOption,
  defaultDateRangePresets,
  resolveDateRangePreset,
  type KjDateRange,
  type KjDateRangePreset,
} from './index';

// Fixed "now": Wed 2026-07-15 (a Wednesday), Q3, so week / quarter math is
// exercised with non-trivial offsets.
const NOW = new Date(2026, 6, 15);

function byId(id: string): KjDateRangePreset {
  const p = defaultDateRangePresets().find((x) => x.id === id);
  if (!p) throw new Error(`no preset ${id}`);
  return p;
}

function range(id: string, now = NOW): KjDateRange {
  return resolveDateRangePreset(byId(id), now)!;
}

describe('defaultDateRangePresets — resolution', () => {
  test('today → [now, now]', () => {
    const r = range('today');
    expect(r.start).toEqual(new Date(2026, 6, 15));
    expect(r.end).toEqual(new Date(2026, 6, 15));
  });

  test('yesterday → [now-1, now-1]', () => {
    const r = range('yesterday');
    expect(r.start).toEqual(new Date(2026, 6, 14));
    expect(r.end).toEqual(new Date(2026, 6, 14));
  });

  test('last-7-days spans 7 inclusive days ending today', () => {
    const r = range('last-7-days');
    expect(r.start).toEqual(new Date(2026, 6, 9));
    expect(r.end).toEqual(new Date(2026, 6, 15));
  });

  test('last-30-days → [now-29, now]', () => {
    const r = range('last-30-days');
    expect(r.start).toEqual(new Date(2026, 5, 16));
    expect(r.end).toEqual(new Date(2026, 6, 15));
  });

  test('this-week (Sunday start) → [Sun 2026-07-12, now]', () => {
    const r = range('this-week');
    expect(r.start).toEqual(new Date(2026, 6, 12)); // Sunday before Wed 15th
    expect(r.end).toEqual(new Date(2026, 6, 15));
  });

  test('this-week honors Monday week start', () => {
    const monday = defaultDateRangePresets(1).find((p) => p.id === 'this-week')!;
    const r = resolveDateRangePreset(monday, NOW)!;
    expect(r.start).toEqual(new Date(2026, 6, 13)); // Monday
  });

  test('this-month → [1st, now]', () => {
    const r = range('this-month');
    expect(r.start).toEqual(new Date(2026, 6, 1));
    expect(r.end).toEqual(new Date(2026, 6, 15));
  });

  test('last-month → full previous month', () => {
    const r = range('last-month');
    expect(r.start).toEqual(new Date(2026, 5, 1));
    expect(r.end).toEqual(new Date(2026, 5, 30));
  });

  test('this-quarter → [Q3 start Jul 1, now]', () => {
    const r = range('this-quarter');
    expect(r.start).toEqual(new Date(2026, 6, 1));
    expect(r.end).toEqual(new Date(2026, 6, 15));
  });

  test('year-to-date → [Jan 1, now]', () => {
    const r = range('year-to-date');
    expect(r.start).toEqual(new Date(2026, 0, 1));
    expect(r.end).toEqual(new Date(2026, 6, 15));
  });

  test('last-year → full previous calendar year', () => {
    const r = range('last-year');
    expect(r.start).toEqual(new Date(2025, 0, 1));
    expect(r.end).toEqual(new Date(2025, 11, 31));
  });

  test('resolve normalizes to startOfDay (strips time)', () => {
    const noon = new Date(2026, 6, 15, 13, 30, 0);
    const r = range('today', noon);
    expect(r.start.getHours()).toBe(0);
    expect(r.end.getHours()).toBe(0);
  });

  test('custom preset resolves through the same helper', () => {
    const custom: KjDateRangePreset = {
      id: 'fixed',
      label: 'Fixed',
      getRange: () => ({ start: new Date(2020, 0, 1), end: new Date(2020, 0, 31) }),
    };
    const r = resolveDateRangePreset(custom, NOW)!;
    expect(r.start).toEqual(new Date(2020, 0, 1));
    expect(r.end).toEqual(new Date(2020, 0, 31));
  });

  test('inverted range resolves to null', () => {
    const bad: KjDateRangePreset = {
      id: 'bad',
      label: 'Bad',
      getRange: (now) => ({ start: now, end: new Date(2000, 0, 1) }),
    };
    expect(resolveDateRangePreset(bad, NOW)).toBeNull();
  });
});

@Component({
  standalone: true,
  imports: [KjDateRangePresets, KjDateRangePresetOption],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div kjDateRangePresets [(kjValue)]="value" [kjNow]="now" [kjPresets]="presets">
      @for (p of presets; track p.id) {
        <button kjDateRangePresetOption [kjPreset]="p">{{ p.label }}</button>
      }
    </div>
  `,
})
class Host {
  now = NOW;
  presets = defaultDateRangePresets();
  value = signal<KjDateRange | null>(null);
}

describe('KjDateRangePresets — listbox + selection', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Host] });
  });

  test('host is a labeled vertical listbox', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const list = fixture.nativeElement.querySelector('[kjDateRangePresets]');
    expect(list.getAttribute('role')).toBe('listbox');
    expect(list.getAttribute('aria-orientation')).toBe('vertical');
    expect(list.getAttribute('aria-label')).toBe('Date range presets');
  });

  test('options are role="option" and not selected initially', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll('[kjDateRangePresetOption]');
    expect(options.length).toBe(10);
    expect(options[0].getAttribute('role')).toBe('option');
    expect(options[0].getAttribute('aria-selected')).toBe('false');
  });

  test('clicking an option commits the resolved range', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll('button');
    // index 2 == last-7-days
    (options[2] as HTMLButtonElement).click();
    fixture.detectChanges();
    const v = fixture.componentInstance.value()!;
    expect(v.start).toEqual(new Date(2026, 6, 9));
    expect(v.end).toEqual(new Date(2026, 6, 15));
    expect(options[2].getAttribute('aria-selected')).toBe('true');
  });

  test('setting value externally highlights the matching preset', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set({
      start: new Date(2026, 6, 1),
      end: new Date(2026, 6, 15),
    });
    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll('button');
    // this-month is index 5
    expect(options[5].getAttribute('aria-selected')).toBe('true');
  });

  test('roving tabindex — first option is the tab stop', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll('button');
    expect(options[0].getAttribute('tabindex')).toBe('0');
    expect(options[1].getAttribute('tabindex')).toBe('-1');
  });
});
