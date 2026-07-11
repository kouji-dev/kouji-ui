import { Component, ChangeDetectionStrategy } from '@angular/core';
import type { EChartsOption } from 'echarts';
import { KjChartComponent } from '../chart';

/**
 * Default example — a labelled bar chart. `ariaLabel` names it for screen
 * readers; `caption` spells out the takeaway.
 */
@Component({
  selector: 'kj-chart-example',
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
      ariaLabel="Weekly active users"
      caption="Weekly active users climbing from 120 on Monday to 260 on Friday."
    />
  `,
})
export class KjChartExample {
  protected readonly option: EChartsOption = {
    tooltip: {},
    grid: { left: 40, right: 16, top: 16, bottom: 24 },
    xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: [120, 160, 150, 210, 260] }],
  };
}
