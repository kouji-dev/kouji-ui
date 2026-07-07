import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjChart } from '../chart';
import { REGION_REVENUE } from './fixtures';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'kj-chart-donut-example',
  standalone: true,
  imports: [KjChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div kjChart [kjChartOption]="opt()" kjChartLabel="Revenue by region" style="height: 300px;"></div>
  `,
})
export class ChartDonutExample {
  readonly opt = signal<EChartsOption>({
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      name: 'Region',
      type: 'pie',
      radius: ['45%', '70%'],
      avoidLabelOverlap: true,
      label: { show: true, formatter: '{b}: {d}%' },
      data: REGION_REVENUE,
    }],
  });
}
