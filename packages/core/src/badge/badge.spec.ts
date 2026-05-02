import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjBadge } from './badge';

expect.extend(toHaveNoViolations);

describe('KjBadge', () => {
  it('sets data-variant attribute', async () => {
    const { container } = await render(`<span kjBadge [kjBadgeVariant]="'destructive'">New</span>`, { imports: [KjBadge] });
    expect(container.querySelector('span')).toHaveAttribute('data-variant', 'destructive');
  });
  it('defaults to default variant', async () => {
    const { container } = await render(`<span kjBadge>Beta</span>`, { imports: [KjBadge] });
    expect(container.querySelector('span')).toHaveAttribute('data-variant', 'default');
  });
  it('passes axe audit', async () => {
    const { container } = await render(`<span kjBadge>Beta</span>`, { imports: [KjBadge] });
    expect(await axe(container)).toHaveNoViolations();
  });
});
