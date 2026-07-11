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

/** Monotonic id source for wiring `aria-describedby` to the caption span. */
let kjChartUid = 0;

/**
 * Reusable charting surface wrapping Apache ECharts.
 *
 * SSR-safe: the ECharts instance is created lazily in the browser only, after
 * the host element has rendered. `option` changes are pushed through
 * `setOption`, and a `ResizeObserver` keeps the chart sized to its container.
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
  /** Optional registered ECharts theme name. */
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
  protected readonly captionId = `kj-chart-caption-${kjChartUid++}`;

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private chart: ECharts | null = null;
  private observer: ResizeObserver | null = null;

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

    // Push option changes to the live instance.
    effect(() => {
      const option = this.option();
      if (this.chart && option) {
        this.chart.setOption(option, { notMerge: true });
      }
    });

    this.destroyRef.onDestroy(() => this.dispose());
  }

  private async init(): Promise<void> {
    const echarts = await import('echarts');
    if (this.chart) return; // guard against double-init / destroyed race
    this.chart = echarts.init(this.host, this.theme());

    const option = this.option();
    if (option) this.chart.setOption(option, { notMerge: true });

    this.observer = new ResizeObserver(() => this.chart?.resize());
    this.observer.observe(this.host);
  }

  private dispose(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.chart?.dispose();
    this.chart = null;
  }
}
