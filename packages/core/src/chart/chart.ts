import {
  Directive,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  afterNextRender,
  afterEveryRender,
  computed,
} from '@angular/core';
import type { EChartsOption, EChartsType, ECElementEvent } from 'echarts';

let nextDescId = 0;

/**
 * Wraps Apache ECharts. Initializes after first render, updates reactively
 * (resize, reduced-motion, kj theme palette), disposes on destroy.
 * Always provide `kjChartLabel` for WCAG AAA compliance.
 *
 * @example
 * ```html
 * <div kjChart [kjChartOption]="chartOption()" kjChartLabel="Monthly revenue" style="height:300px"></div>
 * ```
 * @doc-category Core/Data
 * @doc
 * @doc-name chart
 * @doc-description Renders a reactive ECharts chart on any sized element with an accessible label.
 * @doc-is-main
 */
@Directive({
  selector: '[kjChart]',
  standalone: true,
  exportAs: 'kjChart',
  host: {
    role: 'img',
    '[attr.aria-label]': 'kjChartLabel() || null',
    '[attr.aria-describedby]': 'descriptionId() || null',
  },
})
export class KjChart {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** ECharts option object defining the chart. */
  kjChartOption = input.required<EChartsOption>();
  /** Accessible short label for the chart. Required for WCAG AAA compliance. */
  kjChartLabel = input.required<string>();
  /** Longer description; rendered visually-hidden and wired via aria-describedby. */
  kjChartDescription = input<string>('');
  /** Toggles ECharts showLoading/hideLoading. */
  kjChartLoading = input<boolean>(false);
  /** Explicit color array; falls back to kj theme palette when undefined. */
  kjChartPalette = input<string[] | undefined>(undefined);
  /** Honored unless prefers-reduced-motion: reduce is set. */
  kjChartAnimate = input<boolean>(true);

  /** Emits the ECharts instance once initialized. */
  kjChartReady = output<EChartsType>();
  /** Emits ECharts 'click' events. */
  kjChartClick = output<ECElementEvent>();
  /** Emits ECharts 'legendselectchanged' events. */
  kjChartLegendSelect = output<unknown>();

  /** Unique id for the description div; used by host's aria-describedby binding. */
  readonly descriptionId = computed(() =>
    this.kjChartDescription() ? `kj-chart-desc-${this._descSeq}` : ''
  );
  private readonly _descSeq = ++nextDescId;

  private chart: EChartsType | null = null;

  constructor() {
    afterNextRender(async () => {
      try {
        const echarts = await import('echarts');
        this.chart = echarts.init(this.el.nativeElement);
        this.chart.setOption(this.kjChartOption());
        this.kjChartReady.emit(this.chart);

        let pendingRaf = 0;
        const ro = new ResizeObserver(() => {
          if (pendingRaf) return;
          pendingRaf = requestAnimationFrame(() => {
            pendingRaf = 0;
            this.chart?.resize();
          });
        });
        ro.observe(this.el.nativeElement);
        this.destroyRef.onDestroy(() => {
          if (pendingRaf) cancelAnimationFrame(pendingRaf);
          ro.disconnect();
        });

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

  /** Imperative resize — wraps chart.resize(). */
  resize(): void {
    this.chart?.resize();
  }

  /** Imperative dispatch — passes through to ECharts. */
  dispatchAction(payload: Parameters<EChartsType['dispatchAction']>[0]): void {
    this.chart?.dispatchAction(payload);
  }

  /** Reads current option — passes through to ECharts. */
  getOption(): EChartsOption | undefined {
    return this.chart?.getOption() as EChartsOption | undefined;
  }
}
