import {
  InjectionToken,
  makeEnvironmentProviders,
  type EnvironmentProviders,
} from '@angular/core';

/**
 * Minimal ECharts surface {@link KjChart} needs to boot a chart: the `init`
 * factory. Both the full `echarts` module and a tree-shaken `echarts/core`
 * build (after `.use([...])`) structurally satisfy this, so either can be
 * handed to {@link provideECharts}.
 *
 * `init` is typed to return `unknown` deliberately: `echarts` and `echarts/core`
 * ship separate (private-field-incompatible) declarations of their instance
 * type, so a shared structural type is the only thing both satisfy. `KjChart`
 * narrows the result to `EChartsType` internally.
 */
export interface KjEChartsCore {
  init(
    dom: HTMLElement | null,
    theme?: string | object | null,
    opts?: object,
  ): unknown;
}

/**
 * Supplies an ECharts implementation. Return it synchronously or as a
 * `Promise` — {@link KjChart} awaits either. Typically returns the consumer's
 * own `echarts/core` namespace with the needed charts/components/renderer
 * already registered via `.use([...])`, trading the ~1 MB full bundle for a
 * minimal tree-shaken one.
 */
export type KjEChartsLoader = () => KjEChartsCore | Promise<KjEChartsCore>;

/**
 * DI token holding the optional {@link KjEChartsLoader}. When unset (default),
 * {@link KjChart} falls back to a dynamic `import('echarts')` of the full
 * build — zero-config convenience at the cost of bundle size.
 *
 * Prefer {@link provideECharts} over binding this token directly.
 * @doc
 * @doc-name chart
 * @doc-order 2
 */
export const KJ_ECHARTS = new InjectionToken<KjEChartsLoader | null>(
  'KJ_ECHARTS',
  { providedIn: 'root', factory: () => null },
);

/**
 * Registers a tree-shaken ECharts build for {@link KjChart}. Call at app
 * bootstrap (or a route's `providers`) so every `[kjChart]` uses the minimal
 * engine instead of the full `import('echarts')` fallback.
 *
 * @example
 * ```ts
 * // main.ts
 * import { provideECharts } from '@kouji-ui/core';
 * import * as echarts from 'echarts/core';
 * import { LineChart, BarChart } from 'echarts/charts';
 * import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
 * import { CanvasRenderer } from 'echarts/renderers';
 *
 * echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);
 *
 * bootstrapApplication(App, {
 *   providers: [provideECharts(() => echarts)],
 * });
 * ```
 * @doc
 * @doc-name chart
 * @doc-order 1
 */
export function provideECharts(
  loader: KjEChartsLoader,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: KJ_ECHARTS, useValue: loader },
  ]);
}
