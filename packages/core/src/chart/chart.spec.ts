import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect, vi } from 'vitest';
import { KjChart } from './chart';

expect.extend(toHaveNoViolations);

describe('KjChart', () => {
  it('renders the host element', async () => {
    const { container } = await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="Sales"></div>`,
      { imports: [KjChart] },
    );
    expect(container.querySelector('[kjChart]')).toBeInTheDocument();
  });

  it('sets role=img', async () => {
    const { container } = await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="Sales"></div>`,
      { imports: [KjChart] },
    );
    expect(container.querySelector('[kjChart]')).toHaveAttribute('role', 'img');
  });

  it('sets aria-label', async () => {
    const { container } = await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="Revenue chart"></div>`,
      { imports: [KjChart] },
    );
    expect(container.querySelector('[kjChart]')).toHaveAttribute('aria-label', 'Revenue chart');
  });

  it('passes axe audit', async () => {
    const { container } = await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="Revenue chart"></div>`,
      { imports: [KjChart] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
