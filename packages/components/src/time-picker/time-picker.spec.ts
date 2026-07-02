import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjTimePickerComponent } from './time-picker';

@Component({
  standalone: true,
  imports: [KjTimePickerComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-time-picker
      [(kjValue)]="value"
      [kj12Hour]="twelveHour"
      [kjShowSeconds]="showSeconds"
      [kjStep]="step"
      kjAriaLabel="Time"
    />
  `,
})
class HostComponent {
  value = signal<Date | string | null>(new Date(2024, 0, 1, 9, 30, 0));
  twelveHour = false;
  showSeconds = false;
  step = 1;
}

describe('KjTimePickerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders the wrapper with two segments by default', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('.kj-time-picker');
    expect(root).not.toBeNull();
    const segments = root.querySelectorAll('.kj-time-picker__segment');
    expect(segments.length).toBe(2);
  });

  test('forwards initial value to the hour and minute segments', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const hours = fixture.nativeElement.querySelector('.kj-time-picker__hours') as HTMLInputElement;
    const minutes = fixture.nativeElement.querySelector(
      '.kj-time-picker__minutes',
    ) as HTMLInputElement;
    expect(hours.getAttribute('aria-valuenow')).toBe('9');
    expect(minutes.getAttribute('aria-valuenow')).toBe('30');
  });

  test('renders the meridiem toggle when kj12Hour is true', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.twelveHour = true;
    fixture.detectChanges();
    const meridiem = fixture.nativeElement.querySelector(
      '.kj-time-picker__meridiem',
    ) as HTMLButtonElement;
    expect(meridiem).not.toBeNull();
    expect(meridiem.getAttribute('aria-pressed')).toBe('false'); // 09:30 → AM
  });

  test('renders the seconds segment when kjShowSeconds is true', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.showSeconds = true;
    fixture.detectChanges();
    const seconds = fixture.nativeElement.querySelector('.kj-time-picker__seconds');
    expect(seconds).not.toBeNull();
  });

  test('group conveys role="group"', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('.kj-time-picker');
    expect(root.getAttribute('role')).toBe('group');
  });
});
