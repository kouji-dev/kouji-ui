import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjAriaDescribedBy } from '@kouji-ui/core';
import {
  KjFieldComponent,
  KjFieldErrorComponent,
  KjFieldGroupComponent,
  KjFieldHelpComponent,
  KjFieldLabelComponent,
} from './field';

@Component({
  standalone: true,
  imports: [
    KjFieldComponent,
    KjFieldLabelComponent,
    KjFieldHelpComponent,
    KjFieldErrorComponent,
    KjAriaDescribedBy,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-field
      #f="kjField"
      [kjRequired]="required()"
      [kjDisabled]="disabled()"
      [kjInvalid]="invalid()"
    >
      <kj-field-label>Email</kj-field-label>
      <input
        kjAriaDescribedBy
        type="email"
        [id]="f.controlId()"
        [kjDescribedBy]="f.describedByIds()"
      />
      <kj-field-help>Format: name@example.com</kj-field-help>
      <kj-field-error>Invalid email.</kj-field-error>
    </kj-field>
  `,
})
class HostComponent {
  required = signal(false);
  disabled = signal(false);
  invalid = signal(false);
}

describe('KjFieldComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders the kj-field host with class kj-field', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-field.kj-field')).not.toBeNull();
  });

  test('label[for] points at the inner input id', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('label.kj-field-label') as HTMLLabelElement;
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.id).toBeTruthy();
    expect(label.getAttribute('for')).toBe(input.id);
  });

  test('aria-describedby contains help id while not invalid', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const help = fixture.nativeElement.querySelector('span.kj-field-help') as HTMLElement;
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-describedby')).toBe(help.id);
  });

  test('aria-describedby includes both help and error ids when invalid', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.invalid.set(true);
    fixture.detectChanges();
    const help = fixture.nativeElement.querySelector('span.kj-field-help') as HTMLElement;
    const error = fixture.nativeElement.querySelector('span.kj-field-error') as HTMLElement;
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const ids = input.getAttribute('aria-describedby')!.split(' ');
    expect(ids).toContain(help.id);
    expect(ids).toContain(error.id);
  });

  test('error span is hidden until kjInvalid is true', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const error = fixture.nativeElement.querySelector('span.kj-field-error') as HTMLElement;
    expect(error.hasAttribute('hidden')).toBe(true);
    fixture.componentInstance.invalid.set(true);
    fixture.detectChanges();
    expect(error.hasAttribute('hidden')).toBe(false);
  });

  test('reflects required / disabled / invalid via data-* on host', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.required.set(true);
    fixture.componentInstance.disabled.set(true);
    fixture.componentInstance.invalid.set(true);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-field') as HTMLElement;
    expect(host.hasAttribute('data-required')).toBe(true);
    expect(host.hasAttribute('data-disabled')).toBe(true);
    expect(host.hasAttribute('data-invalid')).toBe(true);
  });

  test('field-group renders prefix/suffix slots', () => {
    @Component({
      standalone: true,
      imports: [KjFieldComponent, KjFieldLabelComponent, KjFieldGroupComponent],
      template: `
        <kj-field>
          <kj-field-label>Amount</kj-field-label>
          <kj-field-group>
            <span prefix data-test="prefix">$</span>
            <input data-test="input" />
            <span suffix data-test="suffix">USD</span>
          </kj-field-group>
        </kj-field>
      `,
    })
    class A {}
    const fixture = TestBed.createComponent(A);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-test="prefix"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-test="suffix"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-test="input"]')).not.toBeNull();
  });
});
