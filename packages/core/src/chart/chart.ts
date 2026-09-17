import {
  Directive,
  DestroyRef,
  ElementRef,
  booleanAttribute,
  inject,
  input,
  output,
  afterNextRender,
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
import { KjId } from '../primitives/overlay/id';
import { KjReducedMotion } from '../motion/reduced-motion';
import { KjResizeObserver, KjThemeObserver } from '../primitives/interaction';
import { DOCUMENT } from '@angular/common';

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
 * Updates are dependency-driven: the option reaches the instance when an input
 * changes, not on every application tick. The one non-signal input — the themed
 * palette — is memoised and refreshed when the theme changes; see
 * {@link KjChart.refreshPalette}.
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
  private readonly document = inject(DOCUMENT);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  /** Shared root `ResizeObserver` — one instance for every chart on the page. */
  private readonly resizes = inject(KjResizeObserver);
  /** Shared root theme watcher — one `MutationObserver` per observed element. */
  private readonly themes = inject(KjThemeObserver);
  private readonly vcr = inject(ViewContainerRef);
  /** Optional consumer-supplied ECharts loader (via `provideECharts`); null → full-import fallback. */
  private readonly echartsLoader = inject(KJ_ECHARTS, { optional: true });

  /**
   * ECharts option object defining the chart.
   *
   * **Replace the object to update the chart.** The option is pushed to the
   * live instance from an `effect`, so a mutation in place is not observed —
   * a signal input compares by identity.
   */
  kjChartOption = input.required<EChartsOption>();
  /** Accessible short label for the chart. Required for WCAG AAA compliance. */
  kjChartLabel = input.required<string>();
  /** Longer description; rendered visually-hidden and wired via aria-describedby. */
  kjChartDescription = input<string>('');
  /** Toggles ECharts showLoading/hideLoading. Default `false`. */
  readonly kjChartLoading = input(false, { transform: booleanAttribute });
  /** Explicit color array; falls back to kj theme palette (resolveChartPalette) when undefined. */
  kjChartPalette = input<string[] | undefined>(undefined);
  /** Animates option transitions, unless `prefers-reduced-motion: reduce` is set. Default `true`. */
  readonly kjChartAnimate = input(true, { transform: booleanAttribute });
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
    this.kjChartDescription() ? this._descId : ''
  );
  private readonly _descId = inject(KjId).mint('chart-desc');

  /** Projected `*kjChartTableFallback`, if any. Rendered as an SR table sibling. */
  protected readonly _fallback = contentChild(KjChartTableFallback);

  /** The live ECharts instance. A signal so event-binding + loading effects react to init/dispose. */
  private readonly chart = signal<EChartsType | null>(null);
  /**
   * Shared, app-wide `prefers-reduced-motion` reader — one `matchMedia`
   * subscription for the whole application rather than one per chart. The
   * option-applying effect below reads it through `resolveOption()`, so a
   * change in the OS setting re-applies the option on its own.
   */
  private readonly motion = inject(KjReducedMotion);
  /** Currently-bound `kjChartOn` forwarders, tracked so they can be unbound on re-bind/destroy. */
  private forwarded: { name: string; handler: (params: unknown) => void }[] = [];
  /**
   * Memoised themed palette. `resolveChartPalette` runs `getComputedStyle`,
   * which forces a style recalculation, so it is read once and invalidated by
   * {@link refreshPalette} (wired to the shared {@link KjThemeObserver})
   * rather than on every option application.
   */
  private themedPalette: string[] | null = null;

  constructor() {
    afterNextRender(async () => {
      try {
        // Resolve ECharts from DI: a consumer-provided (tree-shaken) build via
        // provideECharts, else fall back to a dynamic import of the full module.
        const echarts: KjEChartsCore = this.echartsLoader
          ? await this.echartsLoader()
          : await import('echarts');
        const chart = echarts.init(this.el.nativeElement) as EChartsType;

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

        // Resize — the shared root `ResizeObserver` watches this host and
        // coalesces a burst of entries into one animation frame, so a
        // dashboard of 20 charts costs one observer, not 20.
        this.destroyRef.onDestroy(
          this.resizes.observe(this.el.nativeElement, () => chart.resize()),
        );

        // Theme changes re-resolve the kj palette and re-apply the option. This
        // never disposes the instance, so kjChartReady fires once. `<html>` is
        // the usual carrier; a scoped theme wrapper (`<div data-theme="dark">`)
        // is observed too, since the palette is read from the host's *computed*
        // style and an ancestor's theme wins there. Both observations go
        // through the shared root `KjThemeObserver` — one observer per element
        // for the whole app rather than one per chart.
        this.destroyRef.onDestroy(
          this.themes.observe(
            () => this.refreshPalette(),
            this.el.nativeElement.closest('[data-theme]'),
          ),
        );

        this.destroyRef.onDestroy(() => {
          chart.dispose();
          this.chart.set(null);
        });
      } catch {
        // ECharts cannot initialize in non-browser environments (jsdom, SSR)
      }
    });

    // Push option changes to the live instance. An `effect` (not
    // `afterEveryRender`) so the merge pipeline runs when a dependency actually
    // changes — `afterEveryRender` fires after *every* application
    // change-detection cycle, so an unrelated tick anywhere in the app used to
    // re-run `getComputedStyle` + ECharts' full option merge for every chart on
    // the page. The non-reactive input — the themed palette — is memoised and
    // invalidated by the shared theme observer / `refreshPalette()`.
    effect(() => {
      const chart = this.chart();
      if (!chart) return;
      chart.setOption(this.resolveOption());
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
        descDiv = this.document.createElement('div');
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

  /**
   * Re-reads the themed palette and re-applies the option to the live chart.
   *
   * Called automatically when `class` / `data-theme` changes on `<html>` or on
   * the host's nearest `[data-theme]` ancestor. Call it by hand after a theme
   * change this directive cannot observe — for example when an ancestor that
   * carried no `data-theme` at init gains one.
   */
  refreshPalette(): void {
    this.themedPalette = null;
    this.chart()?.setOption(this.resolveOption());
  }

  /** Merges reactive concerns (palette, reduced-motion) into the user option. */
  private resolveOption(): EChartsOption {
    const base = this.kjChartOption();
    const animate = this.kjChartAnimate() && !this.motion.prefersReducedMotion();
    const explicit = this.kjChartPalette();
    const color = explicit ?? (this.themedPalette ??= resolveChartPalette(this.el.nativeElement));
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
