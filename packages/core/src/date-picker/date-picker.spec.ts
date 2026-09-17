import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { KjDatePicker, KjDatePickerCalendar, KjDatePickerTrigger } from './index';
import { isSameDay } from '../calendar/date-utils';

@Component({
  standalone: true,
  imports: [KjDatePicker, KjDatePickerTrigger, KjDatePickerCalendar],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div kjDatePicker [(kjValue)]="value" [(kjOpen)]="open">
      <input kjDatePickerTrigger #t="kjDatePickerTrigger" />
      <div kjDatePickerCalendar [kjFor]="t" [kjTrap]="trap()">
        <button id="prev">prev</button>
        <button id="day" tabindex="0">15</button>
        <button id="next">next</button>
      </div>
    </div>
    <button id="after">after</button>
  `,
})
class HostPicker {
  value = signal<Date | null>(null);
  open = signal(false);
  trap = signal(false);
}

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 40));

function pressKey(key: string, init: KeyboardEventInit = {}): boolean {
  const target = document.activeElement ?? document.body;
  return target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
}

describe('KjDatePicker', () => {
  let fixture: ComponentFixture<HostPicker>;
  let panel: HTMLElement;
  const input = (): HTMLInputElement => fixture.nativeElement.querySelector('input');
  const day = (id: string): HTMLElement => panel.querySelector<HTMLElement>(`#${id}`)!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HostPicker] });
    document.querySelectorAll('.kj-overlay-container > *').forEach((el) => el.remove());
    fixture = TestBed.createComponent(HostPicker);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    // The panel binds to its trigger in an effect after the first pass;
    // a second pass flushes the trigger's aria-* host bindings.
    fixture.detectChanges();
    panel = fixture.nativeElement.querySelector('[kjDatePickerCalendar]');
  });

  afterEach(async () => {
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    await settle();
    fixture.destroy();
    fixture.nativeElement.remove();
  });

  async function open(): Promise<void> {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
  }

  test('input has role="combobox" + aria-haspopup="dialog"', () => {
    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().getAttribute('aria-haspopup')).toBe('dialog');
  });

  test('input aria-controls points to the panel id', () => {
    expect(input().getAttribute('aria-controls')).toBe(panel.getAttribute('id'));
  });

  test('aria-expanded reflects open state', async () => {
    expect(input().getAttribute('aria-expanded')).toBe('false');
    await open();
    expect(input().getAttribute('aria-expanded')).toBe('true');
  });

  test('ArrowDown opens the popover', () => {
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(true);
  });

  test('Escape closes the popover when open', async () => {
    await open();
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  test('typing a parseable date and blurring commits the value', () => {
    const el = input();
    el.value = '2025-04-15';
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    const v = fixture.componentInstance.value()!;
    expect(v).not.toBeNull();
    expect(isSameDay(v, new Date(2025, 3, 15))).toBe(true);
  });

  test('typing garbage and blurring restores the formatted value', () => {
    fixture.componentInstance.value.set(new Date(2025, 3, 15));
    fixture.detectChanges();
    const el = input();
    el.value = 'asdfgh';
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    // Value unchanged.
    expect(isSameDay(fixture.componentInstance.value()!, new Date(2025, 3, 15))).toBe(true);
    // Input restored to formatted text.
    expect(el.value.length).toBeGreaterThan(0);
  });

  test('formats the input on value change', () => {
    fixture.componentInstance.value.set(new Date(2025, 3, 15));
    fixture.detectChanges();
    expect(input().value.length).toBeGreaterThan(0);
    expect(input().value).toContain('2025');
  });

  test('panel host gets role="dialog"', () => {
    expect(panel.getAttribute('role')).toBe('dialog');
  });

  test('aria-modal follows kjTrap: "false" by default, "true" when trapping', () => {
    expect(panel.getAttribute('aria-modal')).toBe('false');
    fixture.componentInstance.trap.set(true);
    fixture.detectChanges();
    expect(panel.getAttribute('aria-modal')).toBe('true');
  });

  test('non-modal: a focus-driven open leaves focus in the input', async () => {
    input().focus();
    await open();
    expect(document.activeElement).toBe(input());
  });

  test('non-modal: ArrowDown on the input opens and moves focus onto the active day', async () => {
    input().focus();
    pressKey('ArrowDown');
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(true);
    expect(document.activeElement).toBe(day('day'));
  });

  test('non-modal: Tab inside the calendar closes it and hands focus back to the input', async () => {
    input().focus();
    pressKey('ArrowDown');
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    expect(document.activeElement).toBe(day('day'));

    expect(pressKey('Tab')).toBe(true);
    fixture.detectChanges();
    expect(document.activeElement).toBe(input());
    await settle();
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  test('Escape from inside the calendar closes it and returns focus to the input', async () => {
    input().focus();
    pressKey('ArrowDown');
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    expect(document.activeElement).toBe(day('day'));

    pressKey('Escape');
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
    expect(document.activeElement).toBe(input());
  });

  test('modal (kjTrap): opening moves focus onto the active day and Tab cycles inside the calendar', async () => {
    fixture.componentInstance.trap.set(true);
    fixture.detectChanges();
    input().focus();
    await open();
    expect(document.activeElement).toBe(day('day'));

    day('next')!.focus();
    expect(pressKey('Tab')).toBe(false);
    expect(document.activeElement).toBe(day('prev'));
    expect(pressKey('Tab', { shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(day('next'));

    pressKey('Escape');
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    expect(document.activeElement).toBe(input());
  });
});
