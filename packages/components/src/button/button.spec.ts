import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjButtonComponent } from './button';

@Component({
  standalone: true,
  imports: [KjButtonComponent],
  template: `<kj-button [variant]="variant" [size]="size" [disabled]="disabled">Click</kj-button>`,
})
class HostComponent {
  variant: 'default' | 'destructive' | 'ghost' | 'link' | 'outline' = 'default';
  size: 'sm' | 'md' | 'lg' | 'icon' = 'md';
  disabled = false;
}

describe('KjButtonComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders an inner <button> with the .kj-button class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const wrapper = fixture.nativeElement.querySelector('kj-button');
    expect(wrapper).not.toBeNull();
    const btn = wrapper.querySelector('button.kj-button');
    expect(btn).not.toBeNull();
  });

  test('forwards variant signal input to the inner KjButton directive (data-variant attr)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.variant = 'destructive';
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('kj-button button.kj-button');
    expect(btn.getAttribute('data-variant')).toBe('destructive');
  });

  test('forwards size signal input (data-size attr on inner button)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.size = 'lg';
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('kj-button button.kj-button');
    expect(btn.getAttribute('data-size')).toBe('lg');
  });

  test('forwards disabled signal input (aria-disabled attr on inner button)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('kj-button button.kj-button');
    expect(btn.getAttribute('aria-disabled')).toBe('true');
  });

  test('projects content into the inner button', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('kj-button button.kj-button');
    expect(btn.textContent.trim()).toBe('Click');
  });
});
