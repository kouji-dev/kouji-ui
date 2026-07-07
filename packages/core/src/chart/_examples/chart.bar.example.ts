import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjChart } from '../chart';
import { DAYS, USERS } from './fixtures';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'kj-chart-bar-example',
  standalone: true,
  imports: [KjChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div kjChart [kjChartOption]="opt()" kjChartLabel="Daily active users by platform" style="height: 300px;"></div>
  `,
})
export class ChartBarExample {
  readonly opt = signal<EChartsOption>({
    xAxis: { type: 'category', data: DAYS },
    yAxis: { type: 'value' },
    legend: { data: ['Desktop', 'Mobile'] },
    tooltip: { trigger: 'axis' },
    series: [
      { name: 'Desktop', type: 'bar', data: USERS.desktop },
      { name: 'Mobile',  type: 'bar', data: USERS.mobile  },
    ],
  });
}
