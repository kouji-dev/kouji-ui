import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjCheckboxDirective } from './checkbox.directive';

expect.extend(toHaveNoViolations);

describe('KjCheckboxDirective', () => {
  it('sets role=checkbox', async () => {
    const { getByRole } = await render(`<div kjCheckbox tabindex="0">Check</div>`, { imports: [KjCheckboxDirective] });
    expect(getByRole('checkbox')).toBeInTheDocument();
  });

  it('has aria-checked=false by default', async () => {
    const { getByRole } = await render(`<div kjCheckbox tabindex="0">Check</div>`, { imports: [KjCheckboxDirective] });
    expect(getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles checked on click', async () => {
    const { getByRole } = await render(`<div kjCheckbox tabindex="0">Check</div>`, { imports: [KjCheckboxDirective] });
    fireEvent.click(getByRole('checkbox'));
    expect(getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
    expect(getByRole('checkbox')).toHaveAttribute('data-checked', '');
  });

  it('toggles on Space key', async () => {
    const { getByRole } = await render(`<div kjCheckbox tabindex="0">Check</div>`, { imports: [KjCheckboxDirective] });
    fireEvent.keyDown(getByRole('checkbox'), { key: ' ' });
    expect(getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  });

  it('passes axe audit', async () => {
    const { container } = await render(`<div kjCheckbox tabindex="0" aria-label="Accept terms">Accept</div>`, { imports: [KjCheckboxDirective] });
    expect(await axe(container)).toHaveNoViolations();
  });
});
