import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjSkipLinkComponent } from './skip-link';

describe('KjSkipLinkComponent', () => {
  it('renders an anchor with the default label and target', async () => {
    const { getByRole } = await render(`<kj-skip-link />`, { imports: [KjSkipLinkComponent] });
    const link = getByRole('link');
    expect(link).toHaveTextContent('Skip to main content');
    expect(link).toHaveAttribute('href', '#main-content');
    expect(link).toHaveClass('kj-skip-link');
  });

  it('projects custom label content', async () => {
    const { getByRole } = await render(`<kj-skip-link>Skip to article</kj-skip-link>`, {
      imports: [KjSkipLinkComponent],
    });
    expect(getByRole('link')).toHaveTextContent('Skip to article');
  });

  it('forwards kjTarget to the inner directive href', async () => {
    const { getByRole } = await render(`<kj-skip-link kjTarget="page-body" />`, {
      imports: [KjSkipLinkComponent],
    });
    expect(getByRole('link')).toHaveAttribute('href', '#page-body');
  });

  it('moves focus to the target landmark on activation', async () => {
    const { getByRole } = await render(
      `<kj-skip-link /><main id="main-content">content</main>`,
      { imports: [KjSkipLinkComponent] },
    );
    getByRole('link').click();
    const target = document.getElementById('main-content')!;
    expect(target.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(target);
  });
});
