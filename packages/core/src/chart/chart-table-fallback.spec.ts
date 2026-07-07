import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjChart } from './chart';
import { KjChartTableFallback } from './chart-table-fallback';

describe('KjChartTableFallback', () => {
  it('projects its template as a table when hosted by [kjChart]', async () => {
    const { container } = await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="Sales">
         <ng-container *kjChartTableFallback>
           <table data-testid="fb"><tbody><tr><td>x</td></tr></tbody></table>
         </ng-container>
       </div>`,
      { imports: [KjChart, KjChartTableFallback] },
    );
    expect(container.querySelector('[data-testid="fb"]')).toBeInTheDocument();
  });

  it('renders the table outside the role="img" host so AT can read it', async () => {
    const { container } = await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="Sales">
         <ng-container *kjChartTableFallback>
           <table data-testid="fb"><tbody><tr><td>x</td></tr></tbody></table>
         </ng-container>
       </div>`,
      { imports: [KjChart, KjChartTableFallback] },
    );
    const tbl = container.querySelector('[data-testid="fb"]');
    expect(tbl).not.toBeNull();
    expect(tbl!.closest('[role="img"]')).toBeNull();
  });
});
