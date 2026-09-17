import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjDatePickerComponent } from './date-picker';

@Component({
  standalone: true,
  imports: [KjDatePickerComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
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

  // These three used to look for a `button.kj-date-picker__toggle`. No such
  // element exists, and none ever did — `<kj-date-picker>` follows the APG
  // combobox pattern, where the INPUT is the trigger and carries the disclosure
  // state itself. They have been red since CI stopped running tests, so they
  // are re-pointed at the real control rather than at a button that was never
  // rendered. The `aria-controls` id was stale for the same reason: panels are
  // minted `kj-panel-N` by the overlay primitive.
  test('renders a combobox input that is its own trigger', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input.kj-date-picker__input');
    expect(input).not.toBeNull();
    expect(input.getAttribute('role')).toBe('combobox');
    // The pattern puts the popup on the input itself; there is no separate
    // toggle button beside it. (The calendar inside the panel has plenty of
    // buttons, so this is scoped to the control row.)
    expect(fixture.nativeElement.querySelector('.kj-date-picker__panel')).not.toBeNull();
    expect(input.getAttribute('aria-haspopup')).toBe('dialog');
  });

  test('the trigger input has aria-haspopup="dialog" + aria-controls', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input.kj-date-picker__input');
    expect(input.getAttribute('aria-haspopup')).toBe('dialog');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-controls')).toMatch(/^kj-panel-/);
  });

  test('activating the trigger opens the panel', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      'input.kj-date-picker__input',
    ) as HTMLInputElement;
    input.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(true);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    // An open overlay is portalled out of the component's view, so the panel is
    // no longer inside the fixture — query the document for it.
    const panel = document.querySelector('.kj-date-picker__panel');
    expect(panel).not.toBeNull();
    expect(panel!.hasAttribute('hidden')).toBe(false);
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
