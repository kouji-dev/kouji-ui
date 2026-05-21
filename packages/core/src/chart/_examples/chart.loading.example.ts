import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjChart } from '../chart';
import { DAYS, REVENUE } from './fixtures';

@Component({
  selector: 'chart-loading-example',
  standalone: true,
  imports: [KjChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="loading.set(!loading())">
      {{ loading() ? 'Stop loading' : 'Show loading' }}
    </button>
    <div kjChart [kjChartOption]="opt()" kjChartLabel="Loading-state demo"
         [kjChartLoading]="loading()" style="height: 300px;"></div>
  `,
})
export class ChartLoadingExample {
  readonly loading = signal(false);
  readonly opt = signal({
    xAxis: { type: 'category', data: DAYS },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: REVENUE, smooth: true }],
  });
}
