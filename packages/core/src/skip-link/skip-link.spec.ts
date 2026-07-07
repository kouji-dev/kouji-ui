import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjSkipLink } from './skip-link';

describe('KjSkipLink', () => {
  it('renders a native anchor with role=link', async () => {
    const { getByRole } = await render(`<a kjSkipLink>Skip to main content</a>`, {
      imports: [KjSkipLink],
    });
    expect(getByRole('link')).toBeInTheDocument();
  });

  it('reflects href to the default target fragment', async () => {
    const { getByRole } = await render(`<a kjSkipLink>Skip</a>`, { imports: [KjSkipLink] });
    expect(getByRole('link')).toHaveAttribute('href', '#main-content');
  });

  it('reflects a custom target id into href', async () => {
    const { getByRole } = await render(`<a kjSkipLink="page-body">Skip</a>`, {
      imports: [KjSkipLink],
    });
    expect(getByRole('link')).toHaveAttribute('href', '#page-body');
  });

  it('moves focus to the target and adds tabindex="-1" when absent on activation', async () => {
    const { getByRole } = await render(
      `<a kjSkipLink>Skip</a><main id="main-content">content</main>`,
      { imports: [KjSkipLink] },
    );
    const target = document.getElementById('main-content')!;
    expect(target.hasAttribute('tabindex')).toBe(false);

    getByRole('link').click();

    expect(target.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(target);
  });

  it('does not overwrite an existing tabindex on the target', async () => {
    const { getByRole } = await render(
      `<a kjSkipLink>Skip</a><section id="main-content" tabindex="0">content</section>`,
      { imports: [KjSkipLink] },
    );
    getByRole('link').click();

    const target = document.getElementById('main-content')!;
    expect(target.getAttribute('tabindex')).toBe('0');
    expect(document.activeElement).toBe(target);
  });

  it('is a no-op when the target id is missing', async () => {
    const { getByRole } = await render(`<a kjSkipLink="nope">Skip</a>`, { imports: [KjSkipLink] });
    // Should not throw.
    expect(() => getByRole('link').click()).not.toThrow();
  });
});
