import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjDatePickerComponent } from './date-picker';

@Component({
  standalone: true,
  imports: [KjDatePickerComponent],
  template: `<kj-date-picker [(kjValue)]="value" [(kjOpen)]="open" />`,
})
class HostComponent {
  value = signal<Date | null>(null);
  open = signal(false);
}

describe('KjDatePickerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders an input + toggle button', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input.kj-date-picker__input')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button.kj-date-picker__toggle')).not.toBeNull();
  });

  test('toggle button has aria-haspopup="dialog" + aria-controls', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector('button.kj-date-picker__toggle');
    expect(toggle.getAttribute('aria-haspopup')).toBe('dialog');
    expect(toggle.getAttribute('aria-controls')).toMatch(/^kj-date-picker-panel-/);
  });

  test('toggle click opens the panel', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector('button.kj-date-picker__toggle') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(true);
    const panel = fixture.nativeElement.querySelector('.kj-date-picker__panel');
    expect(panel.hasAttribute('hidden')).toBe(false);
  });

  test('panel is hidden initially', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('.kj-date-picker__panel');
    expect(panel.hasAttribute('hidden')).toBe(true);
  });

  test('clicking a calendar day selects and closes', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.open.set(true);
    fixture.componentInstance.value.set(new Date(2025, 3, 15));
    fixture.detectChanges();
    const cells = fixture.nativeElement.querySelectorAll('button.kj-calendar__day');
    expect(cells.length).toBe(42);
    // Click cell 15 (some interior cell that is in-month)
    const cell = cells[20] as HTMLButtonElement;
    cell.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
    expect(fixture.componentInstance.value()).not.toBeNull();
  });
});
