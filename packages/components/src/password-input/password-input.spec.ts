import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, test } from 'vitest';
import { KjPasswordInputComponent } from './password-input';

@Component({
  standalone: true,
  imports: [KjPasswordInputComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-password-input
      [kjAutocomplete]="autocomplete"
      [kjMaxLength]="maxLength"
      [kjDisabled]="disabled"
      [kjInvalid]="invalid"
      [kjPlaceholder]="placeholder"
      [kjShowToggle]="showToggle"
      [kjShowStrength]="showStrength"
      [kjShowCapsLockWarning]="showCapsLock"
    />
  `,
})
class HostComponent {
  autocomplete: 'current-password' | 'new-password' | 'off' = 'current-password';
  maxLength: number | undefined = undefined;
  disabled = false;
  invalid = false;
  placeholder = '';
  showToggle = true;
  showStrength = false;
  showCapsLock = false;
}

describe('KjPasswordInputComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders an inner <input> with type="password"', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('kj-password-input input');
    expect(input).not.toBeNull();
    expect(input.getAttribute('type')).toBe('password');
  });

  test('forwards kjAutocomplete to the inner input', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.autocomplete = 'new-password';
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('kj-password-input input').getAttribute('autocomplete'),
    ).toBe('new-password');
  });

  test('forwards kjMaxLength to native maxlength', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.maxLength = 24;
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('kj-password-input input').getAttribute('maxlength'),
    ).toBe('24');
  });

  test('forwards kjPlaceholder to native placeholder', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.placeholder = 'Enter password';
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('kj-password-input input').getAttribute('placeholder'),
    ).toBe('Enter password');
  });

  test('renders the show/hide toggle by default', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('kj-password-input button');
    expect(button).not.toBeNull();
    expect(button.getAttribute('aria-label')).toBe('Show password');
    expect(button.getAttribute('aria-controls')).toBeTruthy();
  });

  test('hides the toggle when kjShowToggle is false', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.showToggle = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-password-input button')).toBeNull();
  });

  test('clicking the toggle flips the input type', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('kj-password-input input');
    const button = fixture.nativeElement.querySelector('kj-password-input button');
    expect(input.getAttribute('type')).toBe('password');
    button.click();
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();
    expect(input.getAttribute('type')).toBe('text');
  });

  test('renders the strength meter when kjShowStrength is true', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.showStrength = true;
    fixture.detectChanges();
    const meter = fixture.nativeElement.querySelector('[kjPasswordStrength]');
    expect(meter).not.toBeNull();
    expect(meter.getAttribute('role')).toBe('progressbar');
  });

  test('renders the caps lock warning when kjShowCapsLockWarning is true', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.showCapsLock = true;
    fixture.detectChanges();
    const warn = fixture.nativeElement.querySelector('[kjPasswordCapsLockWarning]');
    expect(warn).not.toBeNull();
    expect(warn.getAttribute('role')).toBe('status');
    expect(warn.hasAttribute('hidden')).toBe(true);
  });

  test('forwards kjDisabled to aria-disabled on the input', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('kj-password-input input');
    expect(input.getAttribute('aria-disabled')).toBe('true');
  });
});
