import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjToggleDirective } from './toggle.directive';

expect.extend(toHaveNoViolations);

describe('KjToggleDirective', () => {
  it('has aria-pressed=false by default', async () => {
    const { getByRole } = await render(`<button kjToggle>Bold</button>`, { imports: [KjToggleDirective] });
    expect(getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles aria-pressed on click', async () => {
    const { getByRole } = await render(`<button kjToggle>Bold</button>`, { imports: [KjToggleDirective] });
    fireEvent.click(getByRole('button'));
    expect(getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    expect(getByRole('button')).toHaveAttribute('data-pressed', '');
  });

  it('passes axe audit', async () => {
    const { container } = await render(`<button kjToggle>Bold</button>`, { imports: [KjToggleDirective] });
    expect(await axe(container)).toHaveNoViolations();
  });
});
