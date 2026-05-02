import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjToggle } from './toggle';

expect.extend(toHaveNoViolations);

describe('KjToggle', () => {
  it('has aria-pressed=false by default', async () => {
    const { getByRole } = await render(`<button kjToggle>Bold</button>`, { imports: [KjToggle] });
    expect(getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles aria-pressed on click', async () => {
    const { getByRole } = await render(`<button kjToggle>Bold</button>`, { imports: [KjToggle] });
    fireEvent.click(getByRole('button'));
    expect(getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    expect(getByRole('button')).toHaveAttribute('data-pressed', '');
  });

  it('passes axe audit', async () => {
    const { container } = await render(`<button kjToggle>Bold</button>`, { imports: [KjToggle] });
    expect(await axe(container)).toHaveNoViolations();
  });
});
