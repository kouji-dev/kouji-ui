import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjDatetimePickerComponent } from './datetime-picker';

@Component({
  standalone: true,
  imports: [KjDatetimePickerComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-datetime-picker [(kjValue)]="value" kjTimeLabel="Heure" />`,
})
class HostComponent {
  value: Date | null = null;
}

describe('KjDatetimePickerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  function picker(fixture: { debugElement: { children: { componentInstance: unknown }[] } }): KjDatetimePickerComponent {
    return fixture.debugElement.children[0]!.componentInstance as KjDatetimePickerComponent;
  }

  test('renders trigger input and (hidden) panel with a time field', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kj-datetime-picker__input')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.kj-datetime-picker__time-input')).not.toBeNull();
  });

  test('calendar select on empty value applies the default hour and keeps time on later picks', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const cmp = picker(fixture);
    cmp.onCalendarSelect(new Date(2026, 6, 10));
    let v = fixture.componentInstance.value!;
    expect([v.getFullYear(), v.getMonth(), v.getDate(), v.getHours(), v.getMinutes()]).toEqual([2026, 6, 10, 9, 0]);

    // Adjust time, then pick another day — time must survive the day change.
    cmp.onTimeInput({ target: { value: '14:30' } } as unknown as Event);
    cmp.onCalendarSelect(new Date(2026, 6, 22));
    v = fixture.componentInstance.value!;
    expect([v.getDate(), v.getHours(), v.getMinutes()]).toEqual([22, 14, 30]);
  });

  test('time input merges into the existing date part', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value = new Date(2026, 0, 5, 8, 15);
    fixture.detectChanges();
    const cmp = picker(fixture);
    cmp.onTimeInput({ target: { value: '17:45' } } as unknown as Event);
    const v = fixture.componentInstance.value!;
    expect([v.getFullYear(), v.getMonth(), v.getDate(), v.getHours(), v.getMinutes()]).toEqual([2026, 0, 5, 17, 45]);
  });

  test('trigger shows date and time', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value = new Date(2026, 6, 10, 14, 30);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('.kj-datetime-picker__input') as HTMLInputElement;
    expect(input.value).toContain('14:30');
    expect(input.value).toMatch(/2026|26/);
  });
});
