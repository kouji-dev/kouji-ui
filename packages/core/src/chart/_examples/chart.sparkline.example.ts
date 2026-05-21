import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjChart } from '../chart';
import { REVENUE } from './fixtures';

@Component({
  selector: 'chart-sparkline-example',
  standalone: true,
  imports: [KjChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div kjChart [kjChartOption]="opt()" kjChartLabel="Weekly revenue sparkline" style="height: 60px;"></div>
  `,
})
export class ChartSparklineExample {
  readonly opt = signal({
    grid: { left: 0, right: 0, top: 4, bottom: 4 },
    xAxis: { type: 'category', show: false, data: REVENUE.map((_, i) => i) },
    yAxis: { type: 'value', show: false },
    tooltip: { show: false },
    series: [{ type: 'line', data: REVENUE, smooth: true, showSymbol: false, areaStyle: {} }],
  });
}
