import { Component, ChangeDetectionStrategy } from '@angular/core';
import type { EChartsOption } from 'echarts';
import { KjChartComponent } from '../chart';

/**
 * Donut example — a pie series with an inner radius. Same a11y contract:
 * a name via `ariaLabel` and a summary via `caption`.
 */
@Component({
  selector: 'kj-chart-donut-example',
  standalone: true,
  imports: [KjChartComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-chart
      [option]="option"
      height="280px"
      ariaLabel="Traffic by source"
      caption="Traffic by source: Organic 48%, Referral 27%, Direct 15%, Social 10%."
    />
  `,
})
export class KjChartDonutExample {
  protected readonly option: EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        label: { show: false },
        data: [
          { value: 48, name: 'Organic' },
          { value: 27, name: 'Referral' },
          { value: 15, name: 'Direct' },
          { value: 10, name: 'Social' },
        ],
      },
    ],
  };
}
