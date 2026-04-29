import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjToastDirective } from './toast.directive';

expect.extend(toHaveNoViolations);

describe('KjToastDirective', () => {
  it('sets role=status by default', async () => {
    const { container } = await render(`<div kjToast>Saved</div>`, { imports: [KjToastDirective] });
    expect(container.querySelector('[kjToast]')).toHaveAttribute('role', 'status');
  });
  it('sets role=alert for destructive', async () => {
    const { container } = await render(`<div kjToast [kjToastVariant]="'destructive'">Error</div>`, { imports: [KjToastDirective] });
    expect(container.querySelector('[kjToast]')).toHaveAttribute('role', 'alert');
  });
  it('sets aria-live=polite by default', async () => {
    const { container } = await render(`<div kjToast>Message</div>`, { imports: [KjToastDirective] });
    expect(container.querySelector('[kjToast]')).toHaveAttribute('aria-live', 'polite');
  });
  it('passes axe audit', async () => {
    const { container } = await render(`<div kjToast>Saved</div>`, { imports: [KjToastDirective] });
    expect(await axe(container)).toHaveNoViolations();
  });
});
