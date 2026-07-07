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
import { KJ_ECHARTS, type KjEChartsCore } from './echarts';

let nextDescId = 0;

/** Payload emitted by `(kjChartEvent)` — the forwarded ECharts event name and its raw params. */
export interface KjChartEvent {
  /** The ECharts event name (as listed in `kjChartOn`), e.g. `'click'`, `'datazoom'`. */
  readonly type: string;
  /** The raw event object ECharts passes to the handler. Shape depends on `type`. */
  readonly params: unknown;
}

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
 * @doc-example Pluggable engine + general events
 *   @doc-file chart.pluggable.example.ts
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
  /** Optional consumer-supplied ECharts loader (via `provideECharts`); null → full-import fallback. */
  private readonly echartsLoader = inject(KJ_ECHARTS, { optional: true });

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
  /**
   * ECharts event names to forward through `(kjChartEvent)`. Bound via
   * `chart.on(name, …)` and re-bound reactively when this list changes.
   * e.g. `['click', 'datazoom', 'legendselectchanged']`.
   */
  kjChartOn = input<readonly string[]>([]);

  /** Emits the ECharts instance after its first `setOption` (ready with data). Re-emits on re-init. */
  kjChartReady = output<EChartsType>();
  /**
   * Emits `{ type, params }` for every ECharts event named in `kjChartOn`.
   * Use this for arbitrary events; `kjChartReady` still exposes the raw
   * instance for full manual `.on(...)` wiring.
   */
  kjChartEvent = output<KjChartEvent>();
  /** Emits ECharts 'click' events. Convenience — also available via `kjChartOn`. */
  kjChartClick = output<ECElementEvent>();
  /** Emits ECharts 'legendselectchanged' events. Convenience — also available via `kjChartOn`. */
  kjChartLegendSelect = output<unknown>();

  /** Unique id for the description div; used by host's aria-describedby binding. */
  readonly descriptionId = computed(() =>
    this.kjChartDescription() ? `kj-chart-desc-${this._descSeq}` : ''
  );
  private readonly _descSeq = ++nextDescId;

  /** Projected `*kjChartTableFallback`, if any. Rendered as an SR table sibling. */
  protected readonly _fallback = contentChild(KjChartTableFallback);

  /** The live ECharts instance. A signal so event-binding + loading effects react to init/dispose. */
  private readonly chart = signal<EChartsType | null>(null);
  private readonly prefersReducedMotion = signal(false);
  /** Currently-bound `kjChartOn` forwarders, tracked so they can be unbound on re-bind/destroy. */
  private forwarded: { name: string; handler: (params: unknown) => void }[] = [];

  constructor() {
    afterNextRender(async () => {
      try {
        // Resolve ECharts from DI: a consumer-provided (tree-shaken) build via
        // provideECharts, else fall back to a dynamic import of the full module.
        const echarts: KjEChartsCore = this.echartsLoader
          ? await this.echartsLoader()
          : await import('echarts');
        const chart = echarts.init(this.el.nativeElement) as EChartsType;

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
            chart.setOption(this.resolveOption());
          };
          mql.addEventListener('change', onMqlChange);
          this.destroyRef.onDestroy(() => mql.removeEventListener('change', onMqlChange));
        }

        // First setOption populates the chart, THEN we publish it — so both the
        // signal-driven effects (events, loading) and kjChartReady observers get
        // an instance that is already showing data.
        chart.setOption(this.resolveOption());
        this.chart.set(chart);
        this.kjChartReady.emit(chart);

        // Convenience events — always emitted regardless of kjChartOn.
        chart.on('click', (e: ECElementEvent) => this.kjChartClick.emit(e));
        chart.on('legendselectchanged', (e: unknown) => this.kjChartLegendSelect.emit(e));

        // Initial general-event binding (the reactive effect below re-binds on
        // any later kjChartOn change; this guarantees the first bind even before
        // the next change-detection pass).
        this.bindForwardedEvents(chart, this.kjChartOn());

        // ResizeObserver — coalesce via rAF so a burst of entries collapses to one resize.
        // Guarded: ResizeObserver is absent in some non-browser environments.
        if (typeof ResizeObserver !== 'undefined') {
          let pendingRaf = 0;
          const ro = new ResizeObserver(() => {
            if (pendingRaf) return;
            pendingRaf = requestAnimationFrame(() => {
              pendingRaf = 0;
              chart.resize();
            });
          });
          ro.observe(this.el.nativeElement);
          this.destroyRef.onDestroy(() => {
            if (pendingRaf) cancelAnimationFrame(pendingRaf);
            ro.disconnect();
          });
        }

        // Theme changes on <html> re-resolve the kj palette and re-apply the
        // option. This never disposes the instance, so kjChartReady fires once.
        if (typeof MutationObserver !== 'undefined') {
          const themeMo = new MutationObserver(() => chart.setOption(this.resolveOption()));
          themeMo.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme'],
          });
          this.destroyRef.onDestroy(() => themeMo.disconnect());
        }

        this.destroyRef.onDestroy(() => {
          chart.dispose();
          this.chart.set(null);
        });
      } catch {
        // ECharts cannot initialize in non-browser environments (jsdom, SSR)
      }
    });

    afterEveryRender(() => {
      this.chart()?.setOption(this.resolveOption());
    });

    // General event API — re-forward kjChartOn through (kjChartEvent) whenever
    // the list changes (the initial bind happens imperatively at init).
    // bindForwardedEvents is idempotent, so a redundant first run is harmless.
    effect(() => {
      const names = this.kjChartOn();
      const chart = this.chart();
      if (chart) this.bindForwardedEvents(chart, names);
    });

    // Loading overlay driven reactively by [kjChartLoading].
    effect(() => {
      const loading = this.kjChartLoading();
      const chart = this.chart();
      if (!chart) return;
      if (loading) chart.showLoading();
      else chart.hideLoading();
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

  /**
   * (Re)binds the `kjChartOn` event forwarders: unbinds the previous set, then
   * binds `chart.on(name, …)` for each name, emitting `(kjChartEvent)`.
   * Idempotent — safe to call from both init and the reactive effect.
   */
  private bindForwardedEvents(chart: EChartsType, names: readonly string[]): void {
    for (const { name, handler } of this.forwarded) chart.off(name, handler);
    this.forwarded = names.map((name) => {
      const handler = (params: unknown) => this.kjChartEvent.emit({ type: name, params });
      chart.on(name, handler);
      return { name, handler };
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
    this.chart()?.resize();
  }

  /** Imperative dispatch — passes through to ECharts. */
  dispatchAction(payload: Parameters<EChartsType['dispatchAction']>[0]): void {
    this.chart()?.dispatchAction(payload);
  }

  /** Reads current option — passes through to ECharts. */
  getOption(): EChartsOption | undefined {
    return this.chart()?.getOption() as EChartsOption | undefined;
  }
}
