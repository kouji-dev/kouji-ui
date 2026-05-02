import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjVisuallyHidden } from './visually-hidden';

expect.extend(toHaveNoViolations);

describe('KjVisuallyHidden', () => {
  it('applies visually-hidden inline styles', async () => {
    const { container } = await render(
      `<span kjVisuallyHidden>Screen reader only</span>`,
      { imports: [KjVisuallyHidden] },
    );
    const el = container.querySelector('span')!;
    const style = el.getAttribute('style') ?? '';
    expect(style).toContain('position');
    expect(style).toContain('absolute');
  });

  it('content remains in the DOM for screen readers', async () => {
    const { getByText } = await render(
      `<span kjVisuallyHidden>Screen reader only</span>`,
      { imports: [KjVisuallyHidden] },
    );
    expect(getByText('Screen reader only')).toBeInTheDocument();
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<button><span kjVisuallyHidden>Close dialog</span></button>`,
      { imports: [KjVisuallyHidden] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
