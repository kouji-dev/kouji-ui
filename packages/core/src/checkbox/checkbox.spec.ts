import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjCheckbox } from './checkbox';

expect.extend(toHaveNoViolations);

describe('KjCheckbox', () => {
  it('sets role=checkbox', async () => {
    const { getByRole } = await render(`<div kjCheckbox tabindex="0">Check</div>`, { imports: [KjCheckbox] });
    expect(getByRole('checkbox')).toBeInTheDocument();
  });

  it('has aria-checked=false by default', async () => {
    const { getByRole } = await render(`<div kjCheckbox tabindex="0">Check</div>`, { imports: [KjCheckbox] });
    expect(getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles checked on click', async () => {
    const { getByRole } = await render(`<div kjCheckbox tabindex="0">Check</div>`, { imports: [KjCheckbox] });
    fireEvent.click(getByRole('checkbox'));
    expect(getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
    expect(getByRole('checkbox')).toHaveAttribute('data-checked', '');
  });

  it('toggles on Space key', async () => {
    const { getByRole } = await render(`<div kjCheckbox tabindex="0">Check</div>`, { imports: [KjCheckbox] });
    fireEvent.keyDown(getByRole('checkbox'), { key: ' ' });
    expect(getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  });

  it('passes axe audit', async () => {
    const { container } = await render(`<div kjCheckbox tabindex="0" aria-label="Accept terms">Accept</div>`, { imports: [KjCheckbox] });
    expect(await axe(container)).toHaveNoViolations();
  });
});
