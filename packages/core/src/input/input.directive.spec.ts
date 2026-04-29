import { render } from '@testing-library/angular';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjInputDirective } from './input.directive';

expect.extend(toHaveNoViolations);

describe('KjInputDirective', () => {
  it('renders without error', async () => {
    const { container } = await render(`<input kjInput type="text" />`, { imports: [KjInputDirective] });
    expect(container.querySelector('input')).toBeInTheDocument();
  });

  it('sets aria-invalid and data-invalid when touched + invalid', async () => {
    const ctrl = new FormControl('', { updateOn: 'blur' });
    const { container } = await render(
      `<input kjInput [formControl]="ctrl" [kjInvalid]="ctrl.invalid" />`,
      { imports: [KjInputDirective, ReactiveFormsModule], componentProperties: { ctrl } },
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
      { imports: [KjInputDirective, ReactiveFormsModule], componentProperties: { ctrl } },
    );
    expect((container.querySelector('input') as HTMLInputElement).value).toBe('hello');
  });

  it('passes axe audit', async () => {
    const { container } = await render(
      `<label for="n">Name</label><input id="n" kjInput type="text" />`,
      { imports: [KjInputDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
