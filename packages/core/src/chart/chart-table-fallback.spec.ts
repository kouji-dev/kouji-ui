import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjChartTableFallback } from './chart-table-fallback';

describe('KjChartTableFallback', () => {
  it('renders its template content', async () => {
    const { container } = await render(
      `<ng-container *kjChartTableFallback>
         <table data-testid="fb"><tbody><tr><td>x</td></tr></tbody></table>
       </ng-container>`,
      { imports: [KjChartTableFallback] }
    );
    expect(container.querySelector('[data-testid="fb"]')).toBeInTheDocument();
  });

  it('exposes its TemplateRef via static query on the host', async () => {
    const { container } = await render(
      `<div><ng-container *kjChartTableFallback>X</ng-container></div>`,
      { imports: [KjChartTableFallback] }
    );
    expect(container.textContent).toContain('X');
  });
});
