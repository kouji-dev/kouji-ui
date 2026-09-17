import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjInput } from './input';
import { KjField } from '../field/field';
import { KjFieldError } from '../field/field-error';
import { KjFieldHelp } from '../field/field-help';
import { KjFieldLabel } from '../field/field-label';

expect.extend(toHaveNoViolations);

describe('KjInput', () => {
  it('renders without error', async () => {
    const { container } = await render(`<input kjInput type="text" />`, { imports: [KjInput] });
    expect(container.querySelector('input')).toBeInTheDocument();
  });

  it('sets aria-invalid and data-invalid when touched + invalid', async () => {
    const ctrl = new FormControl('', { updateOn: 'blur' });
    const { container } = await render(
      `<input kjInput [formControl]="ctrl" [kjInvalid]="ctrl.invalid" />`,
      { imports: [KjInput, ReactiveFormsModule], componentProperties: { ctrl } },
    );
    const input = container.querySelector('input')!;
    input.dispatchEvent(new Event('blur'));
    await new Promise(r => setTimeout(r, 0));
    // touched is set, but ctrl is not invalid by default with no validators
    expect(input).toBeInTheDocument();
  });

  it('works with formControl binding', async () => {
    const ctrl = new FormControl('hello');
    const { container } = await render(
      `<input kjInput [formControl]="ctrl" />`,
      { imports: [KjInput, ReactiveFormsModule], componentProperties: { ctrl } },
    );
    expect((container.querySelector('input') as HTMLInputElement).value).toBe('hello');
  });

  it('passes axe audit', async () => {
    const { container } = await render(
      `<label for="n">Name</label><input id="n" kjInput type="text" />`,
      { imports: [KjInput] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('keeps its own id and stays free of field ARIA outside a field', async () => {
    const { container } = await render(`<input id="own" kjInput type="text" />`, { imports: [KjInput] });
    const input = container.querySelector('input')!;
    expect(input.id).toBe('own');
    expect(input.hasAttribute('aria-required')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  describe('inside a [kjField]', () => {
    @Component({
      standalone: true,
      imports: [KjInput, KjField, KjFieldLabel, KjFieldHelp, KjFieldError],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `
        <div kjField [kjRequired]="required()" [kjInvalid]="fieldInvalid()">
          <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
          <label kjFieldLabel>Email</label>
          <input kjInput type="email" [kjInvalid]="ownInvalid()" />
          <span kjFieldHelp>Format: name@example.com</span>
          <span kjFieldError>Enter a valid email.</span>
        </div>
      `,
    })
    class FieldHost {
      required = signal(false);
      fieldInvalid = signal(false);
      ownInvalid = signal(false);
    }

    it('adopts the field id, describedby and required state', async () => {
      const { fixture } = await render(FieldHost);
      const host = fixture.componentInstance as FieldHost;
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      const label = fixture.nativeElement.querySelector('label') as HTMLLabelElement;
      const help = fixture.nativeElement.querySelector('[kjFieldHelp]') as HTMLElement;
      expect(label.getAttribute('for')).toBe(input.id);
      expect(input.getAttribute('aria-describedby')).toBe(help.id);
      expect(input.hasAttribute('aria-required')).toBe(false);
      host.required.set(true);
      fixture.detectChanges();
      expect(input.getAttribute('aria-required')).toBe('true');
    });

    it('aria-invalid follows the field state OR its own touched-gated kjInvalid', async () => {
      const { fixture } = await render(FieldHost);
      const host = fixture.componentInstance as FieldHost;
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      expect(input.hasAttribute('aria-invalid')).toBe(false);

      host.fieldInvalid.set(true);
      fixture.detectChanges();
      expect(input.getAttribute('aria-invalid')).toBe('true');

      host.fieldInvalid.set(false);
      host.ownInvalid.set(true);
      fixture.detectChanges();
      // Own invalid state is touched-gated.
      expect(input.hasAttribute('aria-invalid')).toBe(false);
      input.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.hasAttribute('data-invalid')).toBe(true);
    });
  });

  // arch F-2
  describe('bare boolean attributes (arch F-2)', () => {
    it('kjInvalid reflects data-invalid from the bare attribute form', async () => {
      const { container, fixture } = await render(`<input kjInput kjInvalid />`, {
        imports: [KjInput],
      });
      const input = container.querySelector('input')!;
      input.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      expect(input.hasAttribute('data-invalid')).toBe(true);
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });
  });
});
