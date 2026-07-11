import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import type { EChartsOption } from 'echarts';
import { KjChartComponent } from './chart';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Tunes chart type, accessible name
 * and height so the surface can be previewed across its register.
 */
const type = signal<'bar' | 'line' | 'donut'>('bar');
const ariaLabel = signal('Weekly active users');
const height = signal('280px');

const categories = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const values = [120, 160, 150, 210, 260];

function optionFor(kind: 'bar' | 'line' | 'donut'): EChartsOption {
  if (kind === 'donut') {
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          label: { show: false },
          data: categories.map((name, i) => ({ name, value: values[i] })),
        },
      ],
    };
  }
  return {
    tooltip: {},
    grid: { left: 40, right: 16, top: 16, bottom: 24 },
    xAxis: { type: 'category', data: categories },
    yAxis: { type: 'value' },
    series: [{ type: kind, data: values }],
  };
}

@Component({
  selector: 'kj-chart-playground',
  standalone: true,
  imports: [KjChartComponent],
  // The docs playground stage is a centering flexbox; without an intrinsic
  // width the chart (width: 100%) collapses to 0 — give the host one.
  styles: [`
    :host { display: block; width: 100%; max-width: 36rem; }
  `],
  template: `
    <kj-chart [option]="option()" [ariaLabel]="ariaLabel()" [height]="height()" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjChartPlaygroundDemo {
  protected readonly ariaLabel = ariaLabel;
  protected readonly height = height;
  protected readonly option = computed(() => optionFor(type()));
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjChartPlaygroundDemo,
  state: {
    type: type as unknown as ReturnType<typeof signal>,
    ariaLabel: ariaLabel as unknown as ReturnType<typeof signal>,
    height: height as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'type', label: 'type', options: ['bar', 'line', 'donut'] },
    { kind: 'text', name: 'ariaLabel', label: 'ariaLabel' },
    { kind: 'text', name: 'height', label: 'height' },
  ],
  snippet: (values) => {
    const s = values as { type: string; ariaLabel: string; height: string };
    return `<kj-chart [option]="${s.type}Option" ariaLabel="${s.ariaLabel}" height="${s.height}" />`;
  },
};
