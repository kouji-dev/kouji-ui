import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjChart } from '../chart';
import { DAYS, REVENUE } from './fixtures';

@Component({
  selector: 'chart-example',
  standalone: true,
  imports: [KjChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div kjChart [kjChartOption]="opt()" kjChartLabel="Weekly revenue, line chart" style="height: 300px;"></div>
  `,
})
export class ChartExample {
  readonly opt = signal({
    xAxis: { type: 'category', data: DAYS },
    yAxis: { type: 'value' },
    tooltip: { trigger: 'axis' },
    series: [{ name: 'Revenue', type: 'line', data: REVENUE, smooth: true }],
  });
}
