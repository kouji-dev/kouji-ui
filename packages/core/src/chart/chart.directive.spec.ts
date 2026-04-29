import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjChartDirective } from './chart.directive';

expect.extend(toHaveNoViolations);

describe('KjChartDirective', () => {
  it('renders the host element', async () => {
    const { container } = await render(`<div kjChart [kjChartOption]="{}"></div>`, { imports: [KjChartDirective] });
    expect(container.querySelector('[kjChart]')).toBeInTheDocument();
  });

  it('sets role=img', async () => {
    const { container } = await render(`<div kjChart [kjChartOption]="{}" kjChartLabel="Sales"></div>`, { imports: [KjChartDirective] });
    expect(container.querySelector('[kjChart]')).toHaveAttribute('role', 'img');
  });

  it('sets aria-label', async () => {
    const { container } = await render(`<div kjChart [kjChartOption]="{}" kjChartLabel="Revenue chart"></div>`, { imports: [KjChartDirective] });
    expect(container.querySelector('[kjChart]')).toHaveAttribute('aria-label', 'Revenue chart');
  });

  it('passes axe audit', async () => {
    const { container } = await render(`<div kjChart [kjChartOption]="{}" kjChartLabel="Revenue chart"></div>`, { imports: [KjChartDirective] });
    expect(await axe(container)).toHaveNoViolations();
  });
});
