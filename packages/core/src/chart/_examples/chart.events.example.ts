import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjChart } from '../chart';
import { DAYS, REVENUE } from './fixtures';
import type { ECElementEvent, EChartsOption } from 'echarts';

@Component({
  selector: 'kj-chart-events-example',
  standalone: true,
  imports: [KjChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div kjChart
         [kjChartOption]="opt()"
         kjChartLabel="Weekly revenue — interactive"
         (kjChartClick)="onClick($event)"
         (kjChartLegendSelect)="onLegend($event)"
         style="height: 300px;"></div>
    <p>Last interaction: {{ last() }}</p>
  `,
})
export class ChartEventsExample {
  readonly opt = signal<EChartsOption>({
    xAxis: { type: 'category', data: DAYS },
    yAxis: { type: 'value' },
    legend: { data: ['Revenue'] },
    tooltip: { trigger: 'axis' },
    series: [{ name: 'Revenue', type: 'bar', data: REVENUE }],
  });
  readonly last = signal('—');
  onClick(e: ECElementEvent) { this.last.set(`click ${e.name} = ${e.value}`); }
  onLegend(e: unknown) {
    const name = (e as { name?: string }).name ?? '?';
    this.last.set(`legend toggled: ${name}`);
  }
}
