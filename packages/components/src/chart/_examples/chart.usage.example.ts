import { ChangeDetectionStrategy, Component } from '@angular/core';
import type { EChartsOption } from 'echarts';
import { KjChartComponent } from '../chart';

/**
 * Common chart shapes — a bar and a donut, each with an accessible name and
 * summary. Use this as the copy-paste starting point for new dashboards.
 */
@Component({
  selector: 'kj-chart-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjChartComponent],
  styles: [
    `
      :host {
        display: grid;
        gap: var(--kj-space-md);
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        align-items: stretch;
      }
    `,
  ],
  template: `
    <kj-chart
      [option]="bar"
      ariaLabel="Revenue by quarter"
      caption="Revenue rising each quarter from 40 in Q1 to 95 in Q4."
    />
    <kj-chart
      [option]="donut"
      ariaLabel="Plan mix"
      caption="Plan mix: Pro 55%, Team 30%, Free 15%."
    />
  `,
})
export class KjChartUsageExample {
  protected readonly bar: EChartsOption = {
    tooltip: {},
    grid: { left: 40, right: 16, top: 16, bottom: 24 },
    xAxis: { type: 'category', data: ['Q1', 'Q2', 'Q3', 'Q4'] },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: [40, 62, 78, 95] }],
  };

  protected readonly donut: EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        label: { show: false },
        data: [
          { value: 55, name: 'Pro' },
          { value: 30, name: 'Team' },
          { value: 15, name: 'Free' },
        ],
      },
    ],
  };
}
