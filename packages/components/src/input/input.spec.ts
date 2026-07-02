import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjInputComponent } from './input';

@Component({
  standalone: true,
  imports: [KjInputComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-input
    [type]="type"
    [value]="value"
    [placeholder]="placeholder"
    [invalid]="invalid"
    [disabled]="disabled"
  />`,
})
class HostComponent {
  type: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url' | 'color' = 'text';
  value = '';
  placeholder = '';
  invalid = false;
  disabled = false;
}

describe('KjInputComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders an inner <input> with the .kj-input class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input input.kj-input')).not.toBeNull();
  });

  test('forwards type to the inner element', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.type = 'email';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input input').getAttribute('type')).toBe(
      'email',
    );
  });

  test('renders <input type="color"> when type=color', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.type = 'color';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input input').getAttribute('type')).toBe(
      'color',
    );
  });

  test('mirrors type to data-type attr on host', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.type = 'color';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input').getAttribute('data-type')).toBe('color');
  });

  test('forwards value to the inner element (no form control wired)', () => {
    // Use type=text — jsdom's <input type="color"> .value reverts to '#000000'.
    // The binding mechanism is identical for any type.
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value = 'hello';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input input').value).toBe('hello');
  });

  test('forwards placeholder', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.placeholder = 'you@example.com';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input input').getAttribute('placeholder')).toBe(
      'you@example.com',
    );
  });

  test('forwards invalid → aria-invalid (after blur)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.invalid = true;
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('kj-input input');
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  test('forwards disabled → aria-disabled', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('kj-input input').getAttribute('aria-disabled'),
    ).toBe('true');
  });
});
