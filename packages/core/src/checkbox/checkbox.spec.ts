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

describe('KjCheckbox — disabled is behaviour, not just an attribute', () => {
  it('does not toggle on click when kjDisabled is set', async () => {
    const { getByRole } = await render(
      `<div kjCheckbox kjDisabled tabindex="0" aria-label="Accept">Check</div>`,
      { imports: [KjCheckbox] },
    );
    fireEvent.click(getByRole('checkbox'));
    expect(getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
  });

  it('does not toggle on Space when kjDisabled is set', async () => {
    const { getByRole } = await render(
      `<div kjCheckbox kjDisabled tabindex="0" aria-label="Accept">Check</div>`,
      { imports: [KjCheckbox] },
    );
    fireEvent.keyDown(getByRole('checkbox'), { key: ' ' });
    expect(getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
  });

  it('still toggles when kjDisabled is bound to false', async () => {
    const { getByRole } = await render(
      `<div kjCheckbox [kjDisabled]="false" tabindex="0" aria-label="Accept">Check</div>`,
      { imports: [KjCheckbox] },
    );
    fireEvent.click(getByRole('checkbox'));
    expect(getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  });
});

describe('KjCheckbox — tri-state', () => {
  it('reports aria-checked="mixed" while indeterminate', async () => {
    const { getByRole } = await render(
      `<div kjCheckbox kjIndeterminate tabindex="0" aria-label="Select all">Check</div>`,
      { imports: [KjCheckbox] },
    );
    expect(getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed');
    expect(getByRole('checkbox')).toHaveAttribute('data-indeterminate', '');
  });

  it('mixed wins over the boolean, and activating still commits a value', async () => {
    const { getByRole } = await render(
      `<div kjCheckbox kjIndeterminate [(kjChecked)]="on" tabindex="0" aria-label="Select all"></div>`,
      { imports: [KjCheckbox], componentProperties: { on: true } },
    );
    expect(getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed');
    // Activating a mixed checkbox commits a boolean; the flag is the
    // consumer's to clear, so the announced state stays "mixed" until it does.
    fireEvent.click(getByRole('checkbox'));
    expect(getByRole('checkbox')).not.toHaveAttribute('data-checked');
    expect(getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed');
  });

  it('is a plain boolean checkbox when the flag is absent', async () => {
    const { getByRole } = await render(
      `<div kjCheckbox tabindex="0" aria-label="Accept">Check</div>`,
      { imports: [KjCheckbox] },
    );
    expect(getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
    expect(getByRole('checkbox')).not.toHaveAttribute('data-indeterminate');
  });
});
