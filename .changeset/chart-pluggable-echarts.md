---
'@kouji-ui/core': minor
---

feat(chart): pluggable/lazy ECharts engine + general event API for `KjChart`.

- `provideECharts(loader)` + the `KJ_ECHARTS` token let consumers supply a tree-shaken `echarts/core` build (`.use([...])`), replacing the default ~1 MB full `import('echarts')`. When no provider is registered the directive still falls back to the full import, so zero-config usage is unchanged. SSR-safe (resolution stays inside `afterNextRender`).
- New `[kjChartOn]` input (event names) + `(kjChartEvent)` output emitting `{ type, params }` forward any ECharts event; bindings are re-applied reactively when `kjChartOn` changes and torn down on destroy. `kjChartReady`, `kjChartClick` and `kjChartLegendSelect` are unchanged.
- `kjChartReady` now emits after the first `setOption`, so consumers receive an instance that is already showing data.
