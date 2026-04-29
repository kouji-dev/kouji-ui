import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjInputDirective } from './input.directive';

expect.extend(toHaveNoViolations);

describe('KjInputDirective', () => {
  it('renders without error', async () => {
    const { container } = await render(`<input kjInput type="text" />`, { imports: [KjInputDirective] });
    expect(container.querySelector('input')).toBeInTheDocument();
  });

  it('sets aria-invalid and data-invalid when invalid', async () => {
    const { container } = await render(`<input kjInput [kjInvalid]="true" />`, { imports: [KjInputDirective] });
    expect(container.querySelector('input')).toHaveAttribute('aria-invalid', 'true');
    expect(container.querySelector('input')).toHaveAttribute('data-invalid', '');
  });

  it('sets aria-disabled when disabled', async () => {
    const { container } = await render(`<input kjInput [kjDisabled]="true" />`, { imports: [KjInputDirective] });
    expect(container.querySelector('input')).toHaveAttribute('aria-disabled', 'true');
  });

  it('passes axe audit', async () => {
    const { container } = await render(`<label for="n">Name</label><input id="n" kjInput type="text" />`, { imports: [KjInputDirective] });
    expect(await axe(container)).toHaveNoViolations();
  });
});
