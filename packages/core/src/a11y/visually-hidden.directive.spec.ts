import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjVisuallyHiddenDirective } from './visually-hidden.directive';

expect.extend(toHaveNoViolations);

describe('KjVisuallyHiddenDirective', () => {
  it('applies visually-hidden inline styles', async () => {
    const { container } = await render(
      `<span kjVisuallyHidden>Screen reader only</span>`,
      { imports: [KjVisuallyHiddenDirective] },
    );
    const el = container.querySelector('span')!;
    const style = el.getAttribute('style') ?? '';
    expect(style).toContain('position');
    expect(style).toContain('absolute');
  });

  it('content remains in the DOM for screen readers', async () => {
    const { getByText } = await render(
      `<span kjVisuallyHidden>Screen reader only</span>`,
      { imports: [KjVisuallyHiddenDirective] },
    );
    expect(getByText('Screen reader only')).toBeInTheDocument();
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<button><span kjVisuallyHidden>Close dialog</span></button>`,
      { imports: [KjVisuallyHiddenDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
