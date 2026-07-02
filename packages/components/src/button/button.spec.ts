import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjButtonComponent } from './button';

@Component({
  standalone: true,
  imports: [KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-button
    [kjVariant]="variant"
    [kjSize]="size"
    [kjDisabled]="disabled"
    [kjLoading]="loading"
    [kjPressed]="pressed"
    [kjAriaLabel]="ariaLabel"
    >{{ label }}</kj-button
  >`,
})
class HostComponent {
  variant: string = 'default';
  size: string = 'md';
  disabled = false;
  loading = false;
  pressed: boolean | undefined = undefined;
  ariaLabel: string | undefined = undefined;
  label = 'Click';
}

describe('KjButtonComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders an inner <button> with the .kj-button class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button.kj-button')).not.toBeNull();
  });

  test('forwards variant via [kjVariant] (data-variant attr)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.variant = 'destructive';
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('button.kj-button').getAttribute('data-variant'),
    ).toBe('destructive');
  });

  test('forwards size via [kjSize] (data-size attr)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.size = 'sm';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button.kj-button').getAttribute('data-size')).toBe(
      'sm',
    );
  });

  test('forwards disabled (aria-disabled attr on inner button)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('button.kj-button').getAttribute('aria-disabled'),
    ).toBe('true');
  });

  test('forwards loading: aria-busy on inner button + spinner element rendered', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.loading = true;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button.kj-button');
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(btn.querySelector('.kj-button__spinner')).not.toBeNull();
  });

  test('does not render spinner when loading is false', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kj-button__spinner')).toBeNull();
  });

  test('forwards pressed (aria-pressed attr on inner button)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.pressed = true;
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('button.kj-button').getAttribute('aria-pressed'),
    ).toBe('true');
  });

  test('forwards ariaLabel to the inner button', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.ariaLabel = 'Save changes';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button.kj-button').getAttribute('aria-label')).toBe(
      'Save changes',
    );
  });
});
