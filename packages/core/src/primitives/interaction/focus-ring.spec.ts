import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjFocusRing } from './focus-ring';

expect.extend(toHaveNoViolations);

describe('KjFocusRing', () => {
  it('adds data-focus-visible on focus', async () => {
    const { container } = await render(
      `<button kjFocusRing>Click me</button>`,
      { imports: [KjFocusRing] },
    );
    const btn = container.querySelector('button')!;
    fireEvent.focus(btn);
    expect(btn).toHaveAttribute('data-focus-visible', '');
  });

  it('removes data-focus-visible on blur', async () => {
    const { container } = await render(
      `<button kjFocusRing>Click me</button>`,
      { imports: [KjFocusRing] },
    );
    const btn = container.querySelector('button')!;
    fireEvent.focus(btn);
    fireEvent.blur(btn);
    expect(btn).not.toHaveAttribute('data-focus-visible');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<button kjFocusRing>Click me</button>`,
      { imports: [KjFocusRing] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
