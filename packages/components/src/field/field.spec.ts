import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjAriaDescribedBy } from '@kouji-ui/core';
import { KjInputComponent } from '../input/input';
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

  describe('with a projected <kj-input> (default path, no manual plumbing)', () => {
    @Component({
      standalone: true,
      imports: [
        KjFieldComponent,
        KjFieldLabelComponent,
        KjFieldHelpComponent,
        KjFieldErrorComponent,
        KjInputComponent,
      ],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `
        <kj-field [kjRequired]="required()" [kjInvalid]="invalid()">
          <kj-field-label>Email</kj-field-label>
          <kj-input type="email" />
          <kj-field-help>Format: name@example.com</kj-field-help>
          <kj-field-error>Invalid email.</kj-field-error>
        </kj-field>
      `,
    })
    class InputHost {
      required = signal(false);
      invalid = signal(false);
    }

    function setup() {
      TestBed.configureTestingModule({ imports: [InputHost] });
      const fixture = TestBed.createComponent(InputHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input.kj-input') as HTMLInputElement;
      const label = fixture.nativeElement.querySelector('label.kj-field-label') as HTMLLabelElement;
      const help = fixture.nativeElement.querySelector('span.kj-field-help') as HTMLElement;
      const error = fixture.nativeElement.querySelector('span.kj-field-error') as HTMLElement;
      return { fixture, input, label, help, error };
    }

    test('the inner <input> carries the field id and the label points at it', () => {
      const { fixture, input, label } = setup();
      expect(input.id).toMatch(/^kj-field-\d+$/);
      expect(label.getAttribute('for')).toBe(input.id);
      // Exactly one element carries that id (the host <kj-input> never does).
      expect(fixture.nativeElement.querySelectorAll(`[id="${input.id}"]`)).toHaveLength(1);
    });

    test('aria-describedby, aria-invalid and aria-required land on the inner <input>', () => {
      const { fixture, input, help, error } = setup();
      expect(input.getAttribute('aria-describedby')).toBe(help.id);
      expect(input.hasAttribute('aria-invalid')).toBe(false);
      expect(input.hasAttribute('aria-required')).toBe(false);

      fixture.componentInstance.required.set(true);
      fixture.componentInstance.invalid.set(true);
      fixture.detectChanges();
      expect(input.getAttribute('aria-required')).toBe('true');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')!.split(' ')).toEqual([help.id, error.id]);
    });
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

  // arch F-2 — every boolean input on the field family carries
  // `transform: booleanAttribute`, so the bare-attribute form works on the
  // styled wrapper exactly as it does on the headless directive.
  describe('bare boolean attributes (arch F-2)', () => {
    test('bare kjRequired / kjInvalid / kjDisabled reach the composed KjField', () => {
      @Component({
        standalone: true,
        imports: [KjFieldComponent],
        changeDetection: ChangeDetectionStrategy.Eager,
        template: `<kj-field kjRequired kjInvalid kjDisabled />`,
      })
      class BareHost {}
      const fixture = TestBed.createComponent(BareHost);
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('kj-field') as HTMLElement;
      expect(host.hasAttribute('data-required')).toBe(true);
      expect(host.hasAttribute('data-invalid')).toBe(true);
      expect(host.hasAttribute('data-disabled')).toBe(true);
    });

    test('bare kjReserve reaches the inner kjFieldError', () => {
      @Component({
        standalone: true,
        imports: [KjFieldComponent, KjFieldErrorComponent],
        changeDetection: ChangeDetectionStrategy.Eager,
        template: `<kj-field><kj-field-error kjReserve>Bad</kj-field-error></kj-field>`,
      })
      class BareHost {}
      const fixture = TestBed.createComponent(BareHost);
      fixture.detectChanges();
      const err = fixture.nativeElement.querySelector('.kj-field-error') as HTMLElement;
      expect(err.hasAttribute('data-reserve')).toBe(true);
    });
  });
});
