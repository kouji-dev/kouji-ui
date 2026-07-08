import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { KjChart } from '@kouji-ui/core';
import type { EChartsOption } from 'echarts';
import type { PlaygroundFile } from '../playground-types';

/**
 * Chart playground. `KjChart` is a headless core directive (no styled wrapper),
 * so its playground lives here in the docs app rather than co-located in a
 * component package. Tuning `type` reactively swaps the ECharts series so the
 * same data renders as a line / bar / area chart.
 */
const type = signal<'line' | 'bar' | 'area'>('line');

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const VALUES = [120, 132, 101, 134, 90, 230, 210];

function optionFor(t: 'line' | 'bar' | 'area'): EChartsOption {
  const isArea = t === 'area';
  return {
    grid: { left: 40, right: 16, top: 16, bottom: 28 },
    xAxis: { type: 'category', data: DAYS },
    yAxis: { type: 'value' },
    tooltip: { trigger: 'axis' },
    series: [
      {
        name: 'Active users',
        type: isArea ? 'line' : t,
        smooth: t !== 'bar',
        ...(isArea ? { areaStyle: {} } : {}),
        data: VALUES,
      },
    ],
  };
}

@Component({
  selector: 'kj-chart-playground',
  standalone: true,
  imports: [KjChart],
  // Give the demo host a definite width so the chart (which fills 100%) renders
  // at the stage width instead of collapsing when the stage lets it shrink.
  styles: [':host { display: block; width: 100%; min-width: 0; }'],
  template: `
    <div
      kjChart
      [kjChartOption]="option()"
      kjChartLabel="Weekly active users"
      style="height: 280px; width: 100%;"
    ></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjChartPlaygroundDemo {
  protected readonly type = type;
  protected readonly option = computed(() => optionFor(type()));
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjChartPlaygroundDemo,
  state: {
    type: type as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'type', label: 'type', options: ['line', 'bar', 'area'] },
  ],
  snippet: (values) => {
    const s = values as { type: string };
    const seriesType = s.type === 'area' ? 'line' : s.type;
    const area = s.type === 'area' ? 'areaStyle: {}, ' : '';
    return `<div\n  kjChart\n  [kjChartOption]="{\n    xAxis: { type: 'category', data: days },\n    yAxis: { type: 'value' },\n    series: [{ type: '${seriesType}', ${area}data: values }],\n  }"\n  kjChartLabel="Weekly active users"\n  style="height: 280px"\n></div>`;
  },
};
