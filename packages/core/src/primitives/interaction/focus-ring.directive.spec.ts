import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjFocusRingDirective } from './focus-ring.directive';

expect.extend(toHaveNoViolations);

describe('KjFocusRingDirective', () => {
  it('adds data-focus-visible on focus', async () => {
    const { container } = await render(
      `<button kjFocusRing>Click me</button>`,
      { imports: [KjFocusRingDirective] },
    );
    const btn = container.querySelector('button')!;
    fireEvent.focus(btn);
    expect(btn).toHaveAttribute('data-focus-visible', '');
  });

  it('removes data-focus-visible on blur', async () => {
    const { container } = await render(
      `<button kjFocusRing>Click me</button>`,
      { imports: [KjFocusRingDirective] },
    );
    const btn = container.querySelector('button')!;
    fireEvent.focus(btn);
    fireEvent.blur(btn);
    expect(btn).not.toHaveAttribute('data-focus-visible');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<button kjFocusRing>Click me</button>`,
      { imports: [KjFocusRingDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
