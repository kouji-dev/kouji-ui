import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjInputComponent } from './input';

@Component({
  standalone: true,
  imports: [KjInputComponent],
  template: `<kj-input [type]="type" [placeholder]="placeholder" [invalid]="invalid" [disabled]="disabled" />`,
})
class HostComponent {
  type: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url' = 'text';
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
    const input = fixture.nativeElement.querySelector('kj-input input.kj-input');
    expect(input).not.toBeNull();
  });

  test('forwards type input to the inner element', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.type = 'email';
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('kj-input input.kj-input');
    expect(input.getAttribute('type')).toBe('email');
  });

  test('forwards placeholder input', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.placeholder = 'you@example.com';
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('kj-input input.kj-input');
    expect(input.getAttribute('placeholder')).toBe('you@example.com');
  });

  test('forwards invalid input → aria-invalid attr', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.invalid = true;
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('kj-input input.kj-input');
    // KjInput sets aria-invalid only after touched (blur). Simulate blur first.
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  test('forwards disabled input → aria-disabled attr', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('kj-input input.kj-input');
    expect(input.getAttribute('aria-disabled')).toBe('true');
  });
});
