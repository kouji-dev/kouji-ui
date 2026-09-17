import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  ElementRef,
  DestroyRef,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { EChartsOption } from 'echarts';
import type { ECharts } from 'echarts';
import { KjId, KjResizeObserver, KJ_ECHARTS, type KjEChartsCore } from '@kouji-ui/core';

/** Monotonic id source for wiring `aria-describedby` to the caption span. */
/**
 * Reusable charting surface wrapping Apache ECharts.
 *
 * SSR-safe: the ECharts instance is created lazily in the browser only, after
 * the host element has rendered. `option` changes are pushed through
 * `setOption`, and the app-wide `KjResizeObserver` keeps the chart sized to its
 * container — a dashboard of twenty charts shares one observer, not twenty
 * (perf F-5).
 *
 * Honours `provideECharts`: register a tree-shaken `echarts/core` build and
 * this component boots from it instead of dynamically importing the full
 * ~1 MB module. With no provider it falls back to `import('echarts')`.
 *
 * ECharts paints into an opaque `<canvas>` that assistive technology cannot
 * read. The host therefore carries `role="img"` plus a required-in-practice
 * `ariaLabel`, giving screen readers a one-line description. Pass `caption`
 * for a longer summary — it renders in a visually-hidden `<span>` wired to the
 * host via `aria-describedby`, so it is announced even though the host is an
 * image (a leaf) to AT.
 *
 * @example
 * ```html
 * <kj-chart [option]="chartOption" height="320px" ariaLabel="Revenue by month" />
 * ```
 *
 * @doc-example Default
 *   The default playground — a labelled bar chart with auto-resize.
 *   @doc-file chart.example.ts
 * @doc-example Usage
 *   A bar chart and a donut, side by side, each with an accessible name and
 *   summary. Use this as the copy-paste starting point.
 *   @doc-file chart.usage.example.ts
 * @doc-example Donut
 *   A pie series with an inner radius for part-to-whole breakdowns.
 *   @doc-file chart.donut.example.ts
 *
 * @doc-aria
 *   role              — Always `img`; the canvas is decorative-with-label
 *   aria-label        — Bound from `ariaLabel`; the chart's accessible name
 *   aria-describedby  — Present only when `caption` is set; points at the sr-only summary
 *
 * @doc-a11y
 *   Screen readers get the `ariaLabel` as the accessible name and, when set,
 *   the `caption` as the accessible description. The host is never focusable
 *   and the canvas takes no tab stop, so keyboard users are not trapped. For
 *   dense data, mirror the series in an adjacent `<table>` or export link.
 *
 * @doc-related card,table
 *
 * @doc-css-var
 *   --kj-chart-height — Container height. Bound from the `height` input.
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name chart
 * @doc-description Accessible Apache ECharts wrapper with reactive options, auto-resize, and SSR-safe lazy init.
 * @doc-is-main
 */
@Component({
  selector: 'kj-chart',
  standalone: true,
  template: `
    @if (caption(); as text) {
      <span [id]="captionId" class="kj-chart__caption">{{ text }}</span>
    }
  `,
  styleUrl: './chart.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-chart',
    'role': 'img',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-describedby]': 'caption() ? captionId : null',
    '[style.height]': 'resolvedHeight()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjChartComponent {
  /** The ECharts option object driving the chart. */
  readonly option = input<EChartsOption>();
  /** Container height — number is treated as pixels. Default `'280px'`. */
  readonly height = input<string | number>('280px');
  /**
   * Optional registered ECharts theme name. ECharts takes the theme at `init`,
   * so changing this replaces the instance (chart state that is not in
   * `option` — a zoom, a brush — is lost with it).
   */
  readonly theme = input<string>();
  /**
   * Accessible name for the chart — required in practice. Surfaced via
   * `role="img"` + `aria-label` so screen readers describe the opaque canvas.
   * Keep it to a short phrase, e.g. `"Revenue by month"`.
   */
  readonly ariaLabel = input<string>('');
  /**
   * Optional longer summary read to screen readers. Rendered in a
   * visually-hidden `<span>` and linked via `aria-describedby`. Use it to
   * spell out the takeaway a sighted user gets from the shape of the data.
   */
  readonly caption = input<string>('');

  /** Stable id linking the sr-only caption span to `aria-describedby`. */
  protected readonly captionId = inject(KjId).mint('chart-caption');

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly resizes = inject(KjResizeObserver);
  /**
   * Consumer-supplied (tree-shaken) ECharts build registered with
   * `provideECharts`; `null` falls back to a dynamic import of the full module.
   * Honouring the token here matters: a consumer who registers a minimal
   * `echarts/core` build and then reaches for the styled `<kj-chart>` used to
   * silently ship both it and the ~1 MB full build.
   */
  private readonly echartsLoader = inject(KJ_ECHARTS, { optional: true });

  private chart: ECharts | null = null;
  /** Disposer returned by `KjResizeObserver.observe`; `null` while unobserved. */
  private releaseResize: (() => void) | null = null;
  /** The theme the live instance was created with — ECharts bakes it in at `init`. */
  private activeTheme: string | undefined;
  /** Bumped per `init()` so a superseded (or destroyed) async init bails out. */
  private initSeq = 0;
  private destroyed = false;

  protected readonly resolvedHeight = () => {
    const h = this.height();
    return typeof h === 'number' ? `${h}px` : h;
  };

  constructor() {
    // Create the instance only in the browser, after the host is in the DOM.
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      void this.init();
    });

    // Push option changes to the live instance. `notMerge: true` is deliberate:
    // the input is the whole option, so a series dropped from it must disappear
    // rather than survive a merge.
    effect(() => {
      const option = this.option();
      if (this.chart && option) {
        this.chart.setOption(option, { notMerge: true });
      }
    });

    // `theme` is an init-time argument in ECharts, so a change can only be
    // applied by replacing the instance. Without this the input was silently
    // non-reactive: the first value stuck for the lifetime of the component.
    effect(() => {
      const theme = this.theme();
      if (!this.chart || theme === this.activeTheme) return;
      this.dispose();
      void this.init();
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.dispose();
    });
  }

  private async init(): Promise<void> {
    const seq = ++this.initSeq;
    const echarts: KjEChartsCore = this.echartsLoader
      ? await this.echartsLoader()
      : await import('echarts');
    // Guard against double-init, a superseded theme swap, and destroy-during-await.
    if (this.chart || this.destroyed || seq !== this.initSeq) return;
    this.activeTheme = this.theme();
    this.chart = echarts.init(this.host, this.activeTheme) as ECharts;

    const option = this.option();
    if (option) this.chart.setOption(option, { notMerge: true });

    // `ECharts.resize()` is a full relayout + redraw, and dragging a window
    // edge delivers entries every frame. The shared service coalesces a burst
    // into one rAF and is SSR-safe, so there is no guard to repeat here.
    this.releaseResize = this.resizes.observe(this.host, () => this.chart?.resize());
  }

  private dispose(): void {
    this.releaseResize?.();
    this.releaseResize = null;
    this.chart?.dispose();
    this.chart = null;
    this.activeTheme = undefined;
  }
}
