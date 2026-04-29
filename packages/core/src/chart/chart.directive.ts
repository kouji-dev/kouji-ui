import { Directive, DestroyRef, ElementRef, inject, input, afterNextRender, afterEveryRender } from '@angular/core';
import type { EChartsOption } from 'echarts';

/**
 * Wraps Apache ECharts. Initializes after first render, updates reactively, disposes on destroy.
 * Always provide `kjChartLabel` for WCAG AAA compliance.
 *
 * @example
 * ```html
 * <div kjChart [kjChartOption]="chartOption()" kjChartLabel="Monthly revenue" style="height:300px"></div>
 * ```
 * @category Charts/Chart
 */
@Directive({
  selector: '[kjChart]', standalone: true,
  host: { role: 'img', '[attr.aria-label]': 'kjChartLabel() || null' },
})
export class KjChartDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** ECharts option object defining the chart. */
  kjChartOption = input.required<EChartsOption>();
  /** Accessible label for the chart. Required for WCAG AAA compliance. */
  kjChartLabel = input<string>('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private chart: any;

  constructor() {
    afterNextRender(async () => {
      try {
        const echarts = await import('echarts');
        this.chart = echarts.init(this.el.nativeElement);
        this.chart.setOption(this.kjChartOption());
        this.destroyRef.onDestroy(() => this.chart?.dispose());
      } catch {
        // ECharts cannot initialize in non-browser environments (jsdom, SSR)
      }
    });

    afterEveryRender(() => {
      if (this.chart) {
        this.chart.setOption(this.kjChartOption());
      }
    });
  }
}
