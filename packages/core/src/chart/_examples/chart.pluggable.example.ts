import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjChart, type KjChartEvent } from '../chart';
import { KJ_ECHARTS, type KjEChartsLoader } from '../echarts';
import { DAYS, REVENUE } from './fixtures';
import type { EChartsOption } from 'echarts';

/**
 * Minimal, tree-shaken ECharts build. Only the line chart, the grid/tooltip/
 * data-zoom components and the canvas renderer are registered — a fraction of
 * the ~1 MB full `echarts` module.
 *
 * In a real app you'd register this once at bootstrap:
 * `bootstrapApplication(App, { providers: [provideECharts(loadMinimalECharts)] })`.
 * Here it's scoped to the example via the `KJ_ECHARTS` token so the demo stays
 * self-contained.
 */
const loadMinimalECharts: KjEChartsLoader = async () => {
  const core = await import('echarts/core');
  const { BarChart } = await import('echarts/charts');
  const { GridComponent, TooltipComponent } = await import('echarts/components');
  const { CanvasRenderer } = await import('echarts/renderers');
  core.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);
  return core;
};

@Component({
  selector: 'kj-chart-pluggable-example',
  standalone: true,
  imports: [KjChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Component-scoped equivalent of `provideECharts(loadMinimalECharts)`.
  providers: [{ provide: KJ_ECHARTS, useValue: loadMinimalECharts }],
  template: `
    <div kjChart
         [kjChartOption]="opt()"
         kjChartLabel="Weekly revenue — minimal ECharts build"
         [kjChartOn]="['click', 'mouseover']"
         (kjChartEvent)="onEvent($event)"
         style="height: 300px;"></div>
    <p>Last event: {{ last() }}</p>
  `,
})
export class ChartPluggableExample {
  readonly opt = signal<EChartsOption>({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: DAYS },
    yAxis: { type: 'value' },
    series: [{ name: 'Revenue', type: 'bar', data: REVENUE }],
  });
  readonly last = signal('—');

  onEvent(e: KjChartEvent) {
    if (e.type === 'click') {
      const p = e.params as { name?: string; value?: number };
      this.last.set(`click ${p.name} = ${p.value}`);
    } else {
      this.last.set(`${e.type} event`);
    }
  }
}
