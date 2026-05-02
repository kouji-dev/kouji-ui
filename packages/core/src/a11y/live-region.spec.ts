import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjLiveRegion } from './live-region';

expect.extend(toHaveNoViolations);

describe('KjLiveRegion', () => {
  it('sets aria-live to polite by default', async () => {
    const { container } = await render(
      `<div kjLiveRegion></div>`,
      { imports: [KjLiveRegion] },
    );
    expect(container.querySelector('div')).toHaveAttribute('aria-live', 'polite');
  });

  it('sets aria-live to assertive when specified', async () => {
    const { container } = await render(
      `<div kjLiveRegion [kjPoliteness]="'assertive'"></div>`,
      { imports: [KjLiveRegion] },
    );
    expect(container.querySelector('div')).toHaveAttribute('aria-live', 'assertive');
  });

  it('sets aria-atomic to true', async () => {
    const { container } = await render(
      `<div kjLiveRegion></div>`,
      { imports: [KjLiveRegion] },
    );
    expect(container.querySelector('div')).toHaveAttribute('aria-atomic', 'true');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<div kjLiveRegion></div>`,
      { imports: [KjLiveRegion] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
