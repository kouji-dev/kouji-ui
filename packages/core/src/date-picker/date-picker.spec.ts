import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import {
  KjDatePicker,
  KjDatePickerCalendar,
  KjDatePickerTrigger,
} from './index';
import { isSameDay } from '../calendar/date-utils';

@Component({
  standalone: true,
  imports: [KjDatePicker, KjDatePickerTrigger, KjDatePickerCalendar],
  template: `
    <div kjDatePicker [(kjValue)]="value" [(kjOpen)]="open">
      <input kjDatePickerTrigger #t="kjDatePickerTrigger" />
      <div kjDatePickerCalendar [kjFor]="t"></div>
    </div>
  `,
})
class HostPicker {
  value = signal<Date | null>(null);
  open = signal(false);
}

describe('KjDatePicker', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostPicker] });
  });

  test('input has role="combobox" + aria-haspopup="dialog"', () => {
    const fixture = TestBed.createComponent(HostPicker);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input');
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-haspopup')).toBe('dialog');
  });

  test('input aria-controls points to the panel id', () => {
    const fixture = TestBed.createComponent(HostPicker);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input');
    const panel = fixture.nativeElement.querySelector('[kjDatePickerCalendar]');
    expect(input.getAttribute('aria-controls')).toBe(panel.getAttribute('id'));
  });

  test('aria-expanded reflects open state', () => {
    const fixture = TestBed.createComponent(HostPicker);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    expect(input.getAttribute('aria-expanded')).toBe('true');
  });

  test('ArrowDown opens the popover', () => {
    const fixture = TestBed.createComponent(HostPicker);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(true);
  });

  test('Escape closes the popover when open', () => {
    const fixture = TestBed.createComponent(HostPicker);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  test('typing a parseable date and blurring commits the value', () => {
    const fixture = TestBed.createComponent(HostPicker);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = '2025-04-15';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    const v = fixture.componentInstance.value()!;
    expect(v).not.toBeNull();
    expect(isSameDay(v, new Date(2025, 3, 15))).toBe(true);
  });

  test('typing garbage and blurring restores the formatted value', () => {
    const fixture = TestBed.createComponent(HostPicker);
    fixture.componentInstance.value.set(new Date(2025, 3, 15));
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'asdfgh';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    // Value unchanged.
    expect(isSameDay(fixture.componentInstance.value()!, new Date(2025, 3, 15))).toBe(true);
    // Input restored to formatted text.
    expect(input.value.length).toBeGreaterThan(0);
  });

  test('formats the input on value change', () => {
    const fixture = TestBed.createComponent(HostPicker);
    fixture.detectChanges();
    fixture.componentInstance.value.set(new Date(2025, 3, 15));
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value.length).toBeGreaterThan(0);
    expect(input.value).toContain('2025');
  });

  test('panel host gets role="dialog"', () => {
    const fixture = TestBed.createComponent(HostPicker);
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('[kjDatePickerCalendar]');
    expect(panel.getAttribute('role')).toBe('dialog');
  });
});
