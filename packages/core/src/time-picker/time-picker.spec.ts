import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fireEvent } from '@testing-library/angular';
import { describe, expect, test } from 'vitest';
import {
  KjTimePicker,
  KjTimePickerHours,
  KjTimePickerMeridiem,
  KjTimePickerMinutes,
  KjTimePickerSeconds,
} from './index';
import { parseTimeString, toParts } from './time-picker.format';

@Component({
  standalone: true,
  imports: [
    KjTimePicker,
    KjTimePickerHours,
    KjTimePickerMinutes,
    KjTimePickerSeconds,
    KjTimePickerMeridiem,
  ],
  template: `
    <div
      kjTimePicker
      [(kjValue)]="value"
      [kj12Hour]="twelveHour()"
      [kjShowSeconds]="showSeconds()"
      [kjStep]="step()"
      [kjValueShape]="valueShape()"
    >
      <input kjTimePickerHours data-testid="hours" />
      <input kjTimePickerMinutes data-testid="minutes" />
      @if (showSeconds()) {
        <input kjTimePickerSeconds data-testid="seconds" />
      }
      <button type="button" kjTimePickerMeridiem data-testid="meridiem" aria-label="Toggle meridiem"></button>
    </div>
  `,
})
class HostComponent {
  value = signal<Date | string | null>(new Date(2024, 0, 1, 9, 30, 0));
  twelveHour = signal(false);
  showSeconds = signal(false);
  step = signal(1);
  valueShape = signal<'date' | 'string'>('date');
}

function setup(): { fixture: ReturnType<typeof TestBed.createComponent<HostComponent>>; root: HTMLElement } {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return { fixture, root: fixture.nativeElement };
}

describe('KjTimePicker (headless)', () => {
  test('wrapper is a group with role="group"', () => {
    const { root } = setup();
    const wrapper = root.querySelector('[kjTimePicker]') as HTMLElement;
    expect(wrapper.getAttribute('role')).toBe('group');
  });

  test('hours and minutes segments expose role="spinbutton" + value attrs', () => {
    const { root } = setup();
    const hours = root.querySelector('[data-testid="hours"]') as HTMLInputElement;
    const minutes = root.querySelector('[data-testid="minutes"]') as HTMLInputElement;
    expect(hours.getAttribute('role')).toBe('spinbutton');
    expect(minutes.getAttribute('role')).toBe('spinbutton');
    expect(hours.getAttribute('aria-valuemin')).toBe('0');
    expect(hours.getAttribute('aria-valuemax')).toBe('23');
    expect(hours.getAttribute('aria-valuenow')).toBe('9');
    expect(minutes.getAttribute('aria-valuenow')).toBe('30');
  });

  test('ArrowUp on minutes increments by step', () => {
    const { fixture, root } = setup();
    const minutes = root.querySelector('[data-testid="minutes"]') as HTMLInputElement;
    fireEvent.keyDown(minutes, { key: 'ArrowUp' });
    fixture.detectChanges();
    expect(minutes.getAttribute('aria-valuenow')).toBe('31');
  });

  test('ArrowDown on minutes decrements by step', () => {
    const { fixture, root } = setup();
    const minutes = root.querySelector('[data-testid="minutes"]') as HTMLInputElement;
    fireEvent.keyDown(minutes, { key: 'ArrowDown' });
    fixture.detectChanges();
    expect(minutes.getAttribute('aria-valuenow')).toBe('29');
  });

  test('ArrowUp on minutes carries into hours on overflow', () => {
    const { fixture, root } = setup();
    fixture.componentInstance.value.set(new Date(2024, 0, 1, 9, 59, 0));
    fixture.detectChanges();
    const minutes = root.querySelector('[data-testid="minutes"]') as HTMLInputElement;
    fireEvent.keyDown(minutes, { key: 'ArrowUp' });
    fixture.detectChanges();
    const hours = root.querySelector('[data-testid="hours"]') as HTMLInputElement;
    expect(minutes.getAttribute('aria-valuenow')).toBe('0');
    expect(hours.getAttribute('aria-valuenow')).toBe('10');
  });

  test('Home / End jump to segment bounds', () => {
    const { fixture, root } = setup();
    const minutes = root.querySelector('[data-testid="minutes"]') as HTMLInputElement;
    fireEvent.keyDown(minutes, { key: 'End' });
    fixture.detectChanges();
    expect(minutes.getAttribute('aria-valuenow')).toBe('59');
    fireEvent.keyDown(minutes, { key: 'Home' });
    fixture.detectChanges();
    expect(minutes.getAttribute('aria-valuenow')).toBe('0');
  });

  test('12-hour mode toggles meridiem (aria-pressed) and h12 hour bounds', () => {
    const { fixture, root } = setup();
    fixture.componentInstance.twelveHour.set(true);
    fixture.componentInstance.value.set(new Date(2024, 0, 1, 9, 30, 0));
    fixture.detectChanges();
    const meridiem = root.querySelector('[data-testid="meridiem"]') as HTMLButtonElement;
    const hours = root.querySelector('[data-testid="hours"]') as HTMLInputElement;
    expect(meridiem.getAttribute('aria-pressed')).toBe('false'); // AM at 09:30
    expect(hours.getAttribute('aria-valuemin')).toBe('1');
    expect(hours.getAttribute('aria-valuemax')).toBe('12');
    expect(hours.getAttribute('aria-valuenow')).toBe('9');
    meridiem.click();
    fixture.detectChanges();
    expect(meridiem.getAttribute('aria-pressed')).toBe('true');
    // Hour stayed display-9 but advanced to PM internally → 21:30.
    const v = fixture.componentInstance.value();
    expect(v instanceof Date).toBe(true);
    expect((v as Date).getHours()).toBe(21);
  });

  test('seconds segment renders only when kjShowSeconds=true', () => {
    const { fixture, root } = setup();
    expect(root.querySelector('[data-testid="seconds"]')).toBeNull();
    fixture.componentInstance.showSeconds.set(true);
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="seconds"]')).not.toBeNull();
  });

  test('emits a Date by default and a string when kjValueShape="string"', () => {
    const { fixture, root } = setup();
    const minutes = root.querySelector('[data-testid="minutes"]') as HTMLInputElement;
    fireEvent.keyDown(minutes, { key: 'ArrowUp' });
    fixture.detectChanges();
    const v1 = fixture.componentInstance.value();
    expect(v1 instanceof Date).toBe(true);

    fixture.componentInstance.valueShape.set('string');
    fixture.componentInstance.value.set('09:30');
    fixture.detectChanges();
    fireEvent.keyDown(minutes, { key: 'ArrowUp' });
    fixture.detectChanges();
    expect(typeof fixture.componentInstance.value()).toBe('string');
    expect(fixture.componentInstance.value()).toBe('09:31');
  });

  test('parseTimeString round-trips via toParts', () => {
    expect(parseTimeString('08:05')).toEqual({ hour: 8, minute: 5, second: 0 });
    expect(parseTimeString('08:05:09')).toEqual({ hour: 8, minute: 5, second: 9 });
    expect(parseTimeString('25:00')).toBeNull();
    expect(toParts(new Date(2024, 0, 1, 11, 22, 33))).toEqual({ hour: 11, minute: 22, second: 33 });
  });

  test('kjStep on minutes advances by the configured amount', () => {
    const { fixture, root } = setup();
    fixture.componentInstance.step.set(15);
    fixture.componentInstance.value.set(new Date(2024, 0, 1, 9, 30, 0));
    fixture.detectChanges();
    const minutes = root.querySelector('[data-testid="minutes"]') as HTMLInputElement;
    fireEvent.keyDown(minutes, { key: 'ArrowUp' });
    fixture.detectChanges();
    expect(minutes.getAttribute('aria-valuenow')).toBe('45');
  });
});
