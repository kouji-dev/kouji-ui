import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjAriaDescribedBy } from '../a11y/aria-describedby';
import { KjField } from './field';
import { KjFieldControl } from './field-control';
import { KjFieldError } from './field-error';
import { KjFieldGroup } from './field-group';
import { KjFieldHelp } from './field-help';
import { KjFieldLabel } from './field-label';
import { KjInput } from '../input/input';
import { KjInputMask } from '../input-mask/input-mask';
import { KjInputOtp, KjInputOtpCell } from '../input-otp/input-otp';
import { KjSelect } from '../select/select-root';
import { KjSelectTrigger } from '../select/select-trigger';
import { KjTextarea } from '../textarea/textarea';

@Component({
  standalone: true,
  imports: [KjField, KjFieldLabel, KjFieldHelp, KjFieldError, KjAriaDescribedBy],
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

  test('reserved error keeps its box: data-hidden toggles instead of hidden', () => {
    @Component({
      standalone: true,
      imports: [KjField, KjFieldError],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `
        <div kjField [kjInvalid]="invalid()">
          <span kjFieldError kjFieldErrorReserve>Enter a valid email.</span>
        </div>
      `,
    })
    class ReserveHost {
      invalid = signal(false);
    }
    const fixture = TestBed.createComponent(ReserveHost);
    fixture.detectChanges();
    const error = fixture.nativeElement.querySelector('[kjFieldError]') as HTMLElement;
    // Valid: never display:none-hidden — the box is kept, marked data-hidden.
    expect(error.hasAttribute('hidden')).toBe(false);
    expect(error.hasAttribute('data-hidden')).toBe(true);
    expect(error.hasAttribute('data-reserve')).toBe(true);
    fixture.componentInstance.invalid.set(true);
    fixture.detectChanges();
    expect(error.hasAttribute('hidden')).toBe(false);
    expect(error.hasAttribute('data-hidden')).toBe(false);
    expect(error.hasAttribute('data-reserve')).toBe(true);
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

  describe('KjFieldControl', () => {
    @Component({
      standalone: true,
      imports: [KjField, KjFieldLabel, KjFieldHelp, KjFieldError, KjFieldControl],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `
        <div kjField [kjRequired]="required()" [kjInvalid]="invalid()" [kjFieldId]="fieldId()">
          <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
          <label kjFieldLabel>Email</label>
          <input kjFieldControl type="email" />
          <span kjFieldHelp>Format: name@example.com</span>
          <span kjFieldError>Enter a valid email.</span>
        </div>
        <input id="outside" kjFieldControl type="text" />
      `,
    })
    class ControlHost {
      required = signal(false);
      invalid = signal(false);
      fieldId = signal<string | undefined>(undefined);
    }

    function setup() {
      TestBed.configureTestingModule({ imports: [ControlHost] });
      const fixture = TestBed.createComponent(ControlHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input[type="email"]') as HTMLInputElement;
      const label = fixture.nativeElement.querySelector('label') as HTMLLabelElement;
      return { fixture, input, label };
    }

    test('adopts the field control id so the label for= resolves', () => {
      const { input, label } = setup();
      expect(input.id).toMatch(/^kj-field-\d+$/);
      expect(label.getAttribute('for')).toBe(input.id);
    });

    test('kjFieldId overrides the adopted id', () => {
      const { fixture, input, label } = setup();
      fixture.componentInstance.fieldId.set('email-ctrl');
      fixture.detectChanges();
      expect(input.id).toBe('email-ctrl');
      expect(label.getAttribute('for')).toBe('email-ctrl');
    });

    test('aria-describedby lists the help id, then the error id once invalid', () => {
      const { fixture, input } = setup();
      const help = fixture.nativeElement.querySelector('[kjFieldHelp]') as HTMLElement;
      const error = fixture.nativeElement.querySelector('[kjFieldError]') as HTMLElement;
      expect(input.getAttribute('aria-describedby')).toBe(help.id);
      fixture.componentInstance.invalid.set(true);
      fixture.detectChanges();
      expect(input.getAttribute('aria-describedby')!.split(' ')).toEqual([help.id, error.id]);
    });

    test('reflects aria-invalid from kjInvalid', () => {
      const { fixture, input } = setup();
      expect(input.hasAttribute('aria-invalid')).toBe(false);
      fixture.componentInstance.invalid.set(true);
      fixture.detectChanges();
      expect(input.getAttribute('aria-invalid')).toBe('true');
      fixture.componentInstance.invalid.set(false);
      fixture.detectChanges();
      expect(input.hasAttribute('aria-invalid')).toBe(false);
    });

    test('reflects aria-required from kjRequired', () => {
      const { fixture, input } = setup();
      expect(input.hasAttribute('aria-required')).toBe(false);
      fixture.componentInstance.required.set(true);
      fixture.detectChanges();
      expect(input.getAttribute('aria-required')).toBe('true');
    });

    test('outside a field it is inert and keeps the element id', () => {
      const { fixture } = setup();
      const outside = fixture.nativeElement.querySelector('#outside') as HTMLInputElement;
      expect(outside.id).toBe('outside');
      expect(outside.hasAttribute('aria-describedby')).toBe(false);
      expect(outside.hasAttribute('aria-invalid')).toBe(false);
      expect(outside.hasAttribute('aria-required')).toBe(false);
    });
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

  // arch F-2 — every boolean input on the field family carries
  // `transform: booleanAttribute`, so the bare-attribute form the TSDoc
  // examples teach (`<span kjFieldError kjFieldErrorReserve>`) is not a
  // silent no-op.
  describe('bare boolean attributes (arch F-2)', () => {
    test('bare kjRequired / kjInvalid / kjDisabled reflect on the field host', () => {
      @Component({
        standalone: true,
        imports: [KjField],
        template: `<div kjField kjRequired kjInvalid kjDisabled data-test="f"></div>`,
      })
      class A {}
      const fixture = TestBed.createComponent(A);
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('[data-test="f"]') as HTMLElement;
      expect(host.hasAttribute('data-required')).toBe(true);
      expect(host.hasAttribute('data-invalid')).toBe(true);
      expect(host.hasAttribute('data-disabled')).toBe(true);
    });

    test('bare kjFieldErrorReserve keeps the error box instead of hiding it', () => {
      @Component({
        standalone: true,
        imports: [KjField, KjFieldError],
        template: `
          <div kjField>
            <span kjFieldError kjFieldErrorReserve data-test="e">Bad</span>
          </div>
        `,
      })
      class A {}
      const fixture = TestBed.createComponent(A);
      fixture.detectChanges();
      const err = fixture.nativeElement.querySelector('[data-test="e"]') as HTMLElement;
      expect(err.hasAttribute('data-reserve')).toBe(true);
      expect(err.hasAttribute('data-hidden')).toBe(true);
      expect(err.hasAttribute('hidden')).toBe(false);
    });

    test('[kjRequired]="false" still wins over the attribute default', () => {
      @Component({
        standalone: true,
        imports: [KjField],
        template: `<div kjField [kjRequired]="false" data-test="f"></div>`,
      })
      class A {}
      const fixture = TestBed.createComponent(A);
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('[data-test="f"]') as HTMLElement;
      expect(host.hasAttribute('data-required')).toBe(false);
    });
  });
});

/**
 * The field's ARIA relationships are only worth anything if every control the
 * kit ships can carry them. Before this, `KjInput` was the only one that
 * composed `KjFieldControl` — a `<textarea kjTextarea>`, a `<button
 * kjSelectTrigger>` or a masked input inside a `[kjField]` got no id, no
 * `aria-describedby`, no `aria-invalid` and no `aria-required`
 * (WCAG 1.3.1 / 3.3.1 / 3.3.2).
 */
describe('every shipped control inside a [kjField] carries the relationships', () => {
  @Component({
    standalone: true,
    imports: [
      KjField,
      KjFieldLabel,
      KjFieldHelp,
      KjFieldError,
      KjTextarea,
      KjInput,
      KjInputMask,
      KjSelect,
      KjSelectTrigger,
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
      <div kjField [kjInvalid]="invalid()" [kjRequired]="required()" #f="kjField">
        <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
        <label kjFieldLabel>Notes</label>
        <textarea kjTextarea data-test="textarea"></textarea>
        <span kjFieldHelp data-test="help">Markdown is fine.</span>
        <span kjFieldError data-test="error">Too long.</span>
      </div>
      <div kjField [kjInvalid]="invalid()" #g="kjField">
        <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
        <label kjFieldLabel>Phone</label>
        <input kjInputMask kjMask="(999) 999-9999" data-test="mask" />
        <span kjFieldHelp>Digits only.</span>
      </div>
      <div kjField [kjInvalid]="invalid()" [kjRequired]="required()" #h="kjField">
        <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
        <label kjFieldLabel>Country</label>
        <div kjSelect>
          <button kjSelectTrigger data-test="trigger">Pick one</button>
        </div>
        <span kjFieldHelp>Where you pay tax.</span>
      </div>
    `,
  })
  class Host {
    readonly invalid = signal(false);
    readonly required = signal(false);
  }

  function mount() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  }

  function el(fixture: { nativeElement: HTMLElement }, name: string): HTMLElement {
    return fixture.nativeElement.querySelector(`[data-test="${name}"]`) as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Host] });
  });

  test('a <textarea kjTextarea> adopts the field id and the describedby chain', () => {
    const fixture = mount();
    const textarea = el(fixture, 'textarea');
    const label = fixture.nativeElement.querySelector('label') as HTMLLabelElement;
    expect(textarea.id).toBe(label.getAttribute('for'));
    expect(textarea.id).not.toBe('');
    // Help only — the error contributes once the field is invalid.
    expect(textarea.getAttribute('aria-describedby')).toBe(el(fixture, 'help').id);
  });

  test('the textarea reflects the field error and required state', () => {
    const fixture = mount();
    const textarea = el(fixture, 'textarea');
    expect(textarea.getAttribute('aria-invalid')).toBeNull();
    expect(textarea.getAttribute('aria-required')).toBeNull();

    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.required.set(true);
    fixture.detectChanges();
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(textarea.getAttribute('aria-required')).toBe('true');
    // The field's error id joins the chain once it is shown.
    expect(textarea.getAttribute('aria-describedby')?.split(' ')).toContain(
      el(fixture, 'error').id,
    );
  });

  test('a masked input gets it transitively — KjInputMask composes KjInput composes KjFieldControl', () => {
    const fixture = mount();
    const mask = el(fixture, 'mask');
    expect(mask.id).not.toBe('');
    expect(mask.getAttribute('aria-describedby')).not.toBeNull();
    fixture.componentInstance.invalid.set(true);
    fixture.detectChanges();
    expect(mask.getAttribute('aria-invalid')).toBe('true');
  });

  test('a <button kjSelectTrigger> is labelled and described by its field', () => {
    const fixture = mount();
    const trigger = el(fixture, 'trigger');
    // `<button>` is a labelable element, so `for=` really resolves onto it.
    const labels = fixture.nativeElement.querySelectorAll('label');
    const own = [...labels].find((l) => l.getAttribute('for') === trigger.id);
    expect(own, 'the third field label points at the trigger').toBeDefined();
    expect(trigger.getAttribute('aria-describedby')).not.toBeNull();
    // ...and the overlay contract it already had is untouched.
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  test('the trigger reflects the field error and required state', () => {
    const fixture = mount();
    const trigger = el(fixture, 'trigger');
    expect(trigger.getAttribute('aria-invalid')).toBeNull();
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.required.set(true);
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    expect(trigger.getAttribute('aria-required')).toBe('true');
  });
});

describe('KjFieldControl merges the element\'s own aria-describedby', () => {
  @Component({
    standalone: true,
    imports: [KjField, KjFieldHelp, KjInput],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
      <span id="outside-hint">Company policy applies.</span>
      <div kjField>
        <input kjInput aria-describedby="outside-hint" data-test="c" />
        <span kjFieldHelp data-test="help">At least 8 characters.</span>
      </div>
    `,
  })
  class Host {}

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Host] });
  });

  test('the consumer\'s id survives next to the field\'s', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const control = fixture.nativeElement.querySelector('[data-test="c"]') as HTMLElement;
    const help = fixture.nativeElement.querySelector('[data-test="help"]') as HTMLElement;
    // Field ids first (they describe the control), then whatever was there.
    // Replacing instead of merging silently dropped the consumer's own
    // description, which is the bug this pins.
    expect(control.getAttribute('aria-describedby')).toBe(`${help.id} outside-hint`);
  });
});

describe('a wrapper contributes its own describing elements with [kjDescribedBy]', () => {
  @Component({
    standalone: true,
    imports: [KjField, KjFieldHelp, KjTextarea],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
      <div kjField>
        <textarea kjTextarea [kjDescribedBy]="counterId" data-test="c"></textarea>
        <span kjFieldHelp data-test="help">Keep it short.</span>
      </div>
      <span [id]="counterId">120 characters left</span>
    `,
  })
  class Host {
    readonly counterId = 'counter-1';
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Host] });
  });

  test('the wrapper id joins the field chain instead of replacing it', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const control = fixture.nativeElement.querySelector('[data-test="c"]') as HTMLElement;
    const help = fixture.nativeElement.querySelector('[data-test="help"]') as HTMLElement;
    // Writing `[attr.aria-describedby]` here instead would have been silently
    // dropped: `KjFieldControl`'s host binding runs after the template's, so
    // whoever owns the attribute has to own all of it. `<kj-textarea>`'s
    // character counter is the shipped case.
    expect(control.getAttribute('aria-describedby')).toBe(`${help.id} counter-1`);
  });
});

describe('a label-by-reference control only points at a rendered label', () => {
  @Component({
    standalone: true,
    imports: [KjField, KjFieldLabel, KjInputOtp, KjInputOtpCell],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
      <div kjField>
        @if (withLabel()) {
          <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
          <label kjFieldLabel data-test="label">One-time code</label>
        }
        <div kjInputOtp [kjLength]="2" data-test="otp">
          <input kjInputOtpCell [kjIndex]="0" />
          <input kjInputOtpCell [kjIndex]="1" />
        </div>
      </div>
    `,
  })
  class Host {
    readonly withLabel = signal(true);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Host] });
  });

  test('the OTP group is named by the field label', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const otp = fixture.nativeElement.querySelector('[data-test="otp"]') as HTMLElement;
    const label = fixture.nativeElement.querySelector('[data-test="label"]') as HTMLElement;
    expect(otp.getAttribute('role')).toBe('group');
    // `for=` cannot reach a <div role="group"> — only a labelable element —
    // so `aria-labelledby` is the association that has to carry it.
    expect(otp.getAttribute('aria-labelledby')).toBe(label.id);
  });

  test('with no label rendered it points at nothing rather than at a dangling id', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.withLabel.set(false);
    fixture.detectChanges();
    const otp = fixture.nativeElement.querySelector('[data-test="otp"]') as HTMLElement;
    // `labelId` is minted eagerly whether or not a label exists, so a naive
    // binding would emit an IDREF resolving to nothing.
    expect(otp.getAttribute('aria-labelledby')).toBeNull();
  });
});
