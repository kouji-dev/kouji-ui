import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjChart } from '../chart';
import { KjChartTableFallback } from '../chart-table-fallback';
import { DAYS, USERS } from './fixtures';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'kj-chart-fallback-example',
  standalone: true,
  imports: [KjChart, KjChartTableFallback],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div kjChart [kjChartOption]="opt()"
         kjChartLabel="Daily active users by platform"
         kjChartDescription="A grouped bar chart showing desktop and mobile users over the past week."
         style="height: 300px;">
      <ng-container *kjChartTableFallback>
        <table>
          <caption>Daily users (desktop / mobile)</caption>
          <thead><tr><th scope="col">Day</th><th scope="col">Desktop</th><th scope="col">Mobile</th></tr></thead>
          <tbody>
            @for (d of days; let i = $index; track d) {
              <tr><th scope="row">{{ d }}</th><td>{{ desktop[i] }}</td><td>{{ mobile[i] }}</td></tr>
            }
          </tbody>
        </table>
      </ng-container>
    </div>
  `,
})
export class ChartFallbackExample {
  readonly days = DAYS;
  readonly desktop = USERS.desktop;
  readonly mobile = USERS.mobile;
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
