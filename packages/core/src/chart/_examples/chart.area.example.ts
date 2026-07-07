import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjChart } from '../chart';
import { DAYS, USERS } from './fixtures';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'kj-chart-area-example',
  standalone: true,
  imports: [KjChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div kjChart [kjChartOption]="opt()" kjChartLabel="Daily users — stacked area" style="height: 300px;"></div>
  `,
})
export class ChartAreaExample {
  readonly opt = signal<EChartsOption>({
    xAxis: { type: 'category', boundaryGap: false, data: DAYS },
    yAxis: { type: 'value' },
    legend: { data: ['Desktop', 'Mobile'] },
    tooltip: { trigger: 'axis' },
    series: [
      { name: 'Desktop', type: 'line', stack: 'total', areaStyle: {}, data: USERS.desktop, smooth: true },
      { name: 'Mobile',  type: 'line', stack: 'total', areaStyle: {}, data: USERS.mobile,  smooth: true },
    ],
  });
}
