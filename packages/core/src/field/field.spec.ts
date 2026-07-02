import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjAriaDescribedBy } from '../a11y/aria-describedby';
import { KjField } from './field';
import { KjFieldError } from './field-error';
import { KjFieldGroup } from './field-group';
import { KjFieldHelp } from './field-help';
import { KjFieldLabel } from './field-label';

@Component({
  standalone: true,
  imports: [KjField, KjFieldLabel, KjFieldHelp, KjFieldError, KjFieldGroup, KjAriaDescribedBy],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div
      kjField
      #f="kjField"
      [kjRequired]="required()"
      [kjDisabled]="disabled()"
      [kjInvalid]="invalid()"
    >
      <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
      <label kjFieldLabel>Email</label>
      <input
        type="email"
        kjAriaDescribedBy
        [id]="f.controlId()"
        [kjDescribedBy]="f.describedByIds()"
      />
      @if (showHelp()) {
        <span kjFieldHelp>Format: name@example.com</span>
      }
      @if (showError()) {
        <span kjFieldError>Enter a valid email.</span>
      }
    </div>
  `,
})
class HostComponent {
  required = signal(false);
  disabled = signal(false);
  invalid = signal(false);
  showHelp = signal(true);
  showError = signal(true);
}

describe('KjField', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('mints stable ids and wires label[for] to control id', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('label') as HTMLLabelElement;
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(label.getAttribute('for')).toBe(input.id);
    expect(input.id).toMatch(/^kj-field-\d+$/);
    expect(label.id).toMatch(/^kj-field-label-\d+$/);
  });

  test('appends help id to aria-describedby when not invalid', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const help = fixture.nativeElement.querySelector('[kjFieldHelp]') as HTMLElement;
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-describedby')).toBe(help.id);
  });

  test('appends both help and error ids when invalid', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.invalid.set(true);
    fixture.detectChanges();
    const help = fixture.nativeElement.querySelector('[kjFieldHelp]') as HTMLElement;
    const error = fixture.nativeElement.querySelector('[kjFieldError]') as HTMLElement;
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const ids = input.getAttribute('aria-describedby')!.split(' ');
    expect(ids).toContain(help.id);
    expect(ids).toContain(error.id);
    // hints first, errors second
    expect(ids.indexOf(help.id)).toBeLessThan(ids.indexOf(error.id));
  });

  test('toggles data-invalid / data-required / data-disabled on the field root', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.required.set(true);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('[kjField]') as HTMLElement;
    expect(root.hasAttribute('data-invalid')).toBe(true);
    expect(root.hasAttribute('data-required')).toBe(true);
    expect(root.hasAttribute('data-disabled')).toBe(true);
  });

  test('error element is hidden when not invalid and visible when invalid', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const error = fixture.nativeElement.querySelector('[kjFieldError]') as HTMLElement;
    expect(error.hasAttribute('hidden')).toBe(true);
    fixture.componentInstance.invalid.set(true);
    fixture.detectChanges();
    expect(error.hasAttribute('hidden')).toBe(false);
  });

  test('help element hides when invalid (error takes precedence)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const help = fixture.nativeElement.querySelector('[kjFieldHelp]') as HTMLElement;
    expect(help.hasAttribute('hidden')).toBe(false);
    fixture.componentInstance.invalid.set(true);
    fixture.detectChanges();
    expect(help.hasAttribute('hidden')).toBe(true);
  });

  test('error element carries role=alert and aria-live=polite', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const error = fixture.nativeElement.querySelector('[kjFieldError]') as HTMLElement;
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.getAttribute('aria-live')).toBe('polite');
  });

  test('label mirrors required / disabled / invalid via data-*', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.required.set(true);
    fixture.componentInstance.disabled.set(true);
    fixture.componentInstance.invalid.set(true);
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('label') as HTMLLabelElement;
    expect(label.hasAttribute('data-required')).toBe(true);
    expect(label.hasAttribute('data-disabled')).toBe(true);
    expect(label.hasAttribute('data-invalid')).toBe(true);
  });

  test('removing a help element deregisters its id from describedby', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-describedby')).toBeTruthy();
    fixture.componentInstance.showHelp.set(false);
    fixture.detectChanges();
    expect(input.getAttribute('aria-describedby')).toBeNull();
  });

  test('booleanAttribute coerces string "true"/"" / present', () => {
    @Component({
      standalone: true,
      imports: [KjField],
      template: `<div kjField kjRequired kjDisabled kjInvalid #f="kjField"></div>`,
    })
    class A {}
    const fixture = TestBed.createComponent(A);
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('[kjField]') as HTMLElement;
    expect(root.hasAttribute('data-required')).toBe(true);
    expect(root.hasAttribute('data-disabled')).toBe(true);
    expect(root.hasAttribute('data-invalid')).toBe(true);
  });

  test('field-group mirrors invalid / disabled state', () => {
    @Component({
      standalone: true,
      imports: [KjField, KjFieldGroup],
      template: `
        <div kjField [kjInvalid]="true" [kjDisabled]="true">
          <div kjFieldGroup data-test="group"></div>
        </div>
      `,
    })
    class A {}
    const fixture = TestBed.createComponent(A);
    fixture.detectChanges();
    const group = fixture.nativeElement.querySelector('[data-test="group"]') as HTMLElement;
    expect(group.hasAttribute('data-invalid')).toBe(true);
    expect(group.hasAttribute('data-disabled')).toBe(true);
  });
});
