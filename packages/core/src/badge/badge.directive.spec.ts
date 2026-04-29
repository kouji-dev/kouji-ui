import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjBadgeDirective } from './badge.directive';

expect.extend(toHaveNoViolations);

describe('KjBadgeDirective', () => {
  it('sets data-variant attribute', async () => {
    const { container } = await render(`<span kjBadge [kjBadgeVariant]="'destructive'">New</span>`, { imports: [KjBadgeDirective] });
    expect(container.querySelector('span')).toHaveAttribute('data-variant', 'destructive');
  });
  it('defaults to default variant', async () => {
    const { container } = await render(`<span kjBadge>Beta</span>`, { imports: [KjBadgeDirective] });
    expect(container.querySelector('span')).toHaveAttribute('data-variant', 'default');
  });
  it('passes axe audit', async () => {
    const { container } = await render(`<span kjBadge>Beta</span>`, { imports: [KjBadgeDirective] });
    expect(await axe(container)).toHaveNoViolations();
  });
});
