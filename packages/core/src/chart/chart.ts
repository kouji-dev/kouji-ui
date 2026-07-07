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
  effect,
  signal,
  contentChild,
  ViewContainerRef,
} from '@angular/core';
import type { EChartsOption, EChartsType, ECElementEvent } from 'echarts';
import { resolveChartPalette } from './chart-tokens';
import { KjChartTableFallback } from './chart-table-fallback';

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
 * @doc-example Line
 *   @doc-file chart.example.ts
 * @doc-example Bar
 *   @doc-file chart.bar.example.ts
 * @doc-example Donut
 *   @doc-file chart.donut.example.ts
 * @doc-example Area
 *   @doc-file chart.area.example.ts
 * @doc-example Sparkline
 *   @doc-file chart.sparkline.example.ts
 * @doc-example Events
 *   @doc-file chart.events.example.ts
 * @doc-example Loading
 *   @doc-file chart.loading.example.ts
 * @doc-example Table fallback
 *   @doc-file chart.fallback.example.ts
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
  private readonly vcr = inject(ViewContainerRef);

  /** ECharts option object defining the chart. */
  kjChartOption = input.required<EChartsOption>();
  /** Accessible short label for the chart. Required for WCAG AAA compliance. */
  kjChartLabel = input.required<string>();
  /** Longer description; rendered visually-hidden and wired via aria-describedby. */
  kjChartDescription = input<string>('');
  /** Toggles ECharts showLoading/hideLoading. */
  kjChartLoading = input<boolean>(false);
  /** Explicit color array; falls back to kj theme palette (resolveChartPalette) when undefined. */
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

  /** Projected `*kjChartTableFallback`, if any. Rendered as an SR table sibling. */
  protected readonly _fallback = contentChild(KjChartTableFallback);

  private chart: EChartsType | null = null;
  private readonly prefersReducedMotion = signal(false);

  constructor() {
    afterNextRender(async () => {
      try {
        const echarts = await import('echarts');
        this.chart = echarts.init(this.el.nativeElement);

        // prefers-reduced-motion — subscribe and re-apply on change. Guarded:
        // matchMedia is absent in some non-browser/test environments.
        const mql =
          typeof window !== 'undefined' && typeof window.matchMedia === 'function'
            ? window.matchMedia('(prefers-reduced-motion: reduce)')
            : null;
        if (mql) {
          this.prefersReducedMotion.set(mql.matches);
          const onMqlChange = () => {
            this.prefersReducedMotion.set(mql.matches);
            this.chart?.setOption(this.resolveOption());
          };
          mql.addEventListener('change', onMqlChange);
          this.destroyRef.onDestroy(() => mql.removeEventListener('change', onMqlChange));
        }

        this.chart.setOption(this.resolveOption());
        this.kjChartReady.emit(this.chart);

        this.chart.on('click', (e: ECElementEvent) => this.kjChartClick.emit(e));
        this.chart.on('legendselectchanged', (e: unknown) => this.kjChartLegendSelect.emit(e));

        // ResizeObserver — coalesce via rAF so a burst of entries collapses to one resize.
        // Guarded: ResizeObserver is absent in some non-browser environments.
        if (typeof ResizeObserver !== 'undefined') {
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
        }

        // Theme changes on <html> re-resolve the kj palette and re-apply the option.
        if (typeof MutationObserver !== 'undefined') {
          const themeMo = new MutationObserver(() => this.chart?.setOption(this.resolveOption()));
          themeMo.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme'],
          });
          this.destroyRef.onDestroy(() => themeMo.disconnect());
        }

        this.destroyRef.onDestroy(() => this.chart?.dispose());
      } catch {
        // ECharts cannot initialize in non-browser environments (jsdom, SSR)
      }
    });

    afterEveryRender(() => {
      if (this.chart) {
        this.chart.setOption(this.resolveOption());
      }
    });

    // Loading overlay driven reactively by [kjChartLoading].
    effect(() => {
      const loading = this.kjChartLoading();
      if (!this.chart) return;
      if (loading) this.chart.showLoading();
      else this.chart.hideLoading();
    });

    // Visually-hidden description element, referenced by the host's aria-describedby.
    let descDiv: HTMLDivElement | null = null;
    effect(() => {
      const text = this.kjChartDescription();
      const id = this.descriptionId();
      const host = this.el.nativeElement;
      if (!text) {
        descDiv?.remove();
        descDiv = null;
        return;
      }
      if (!descDiv) {
        descDiv = document.createElement('div');
        Object.assign(descDiv.style, {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
          border: '0',
        } as Partial<CSSStyleDeclaration>);
        host.appendChild(descDiv);
      }
      descDiv.id = id;
      descDiv.textContent = text;
    });

    // Project a *kjChartTableFallback as an SR table *outside* the role="img"
    // host (as a sibling), so assistive tech reads structured data while the
    // canvas subtree stays presentational.
    effect(() => {
      const fb = this._fallback();
      this.vcr.clear();
      if (fb) this.vcr.createEmbeddedView(fb.tpl);
    });
  }

  /** Merges reactive concerns (palette, reduced-motion) into the user option. */
  private resolveOption(): EChartsOption {
    const base = this.kjChartOption();
    const animate = this.kjChartAnimate() && !this.prefersReducedMotion();
    const explicit = this.kjChartPalette();
    const color = explicit ?? resolveChartPalette(this.el.nativeElement);
    return {
      ...base,
      color: color.length ? color : (base as { color?: string[] }).color,
      animation: animate,
      animationDuration: animate
        ? (base as { animationDuration?: number }).animationDuration ?? 1000
        : 0,
    };
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
