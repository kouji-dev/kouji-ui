# Chart features — directive hardening, examples, docs integration

**Date:** 2026-05-21
**Scope:** `packages/core/src/chart/`
**Branch:** `feat/chart-features`
**Roadmap link:** `apps/docs/src/app/pages/roadmap/items/v0.2-chart-primitives.md`

## Goal

Bring `KjChart` from a 50-line ECharts shim to a feature-complete, themed, accessible chart directive — with docs/examples wired into the auto-discovery pipeline so `/docs/chart` renders the full story.

This is **not** the v0.2 roadmap's full adapter system (`KjChartHost` + first-party SVG charts + 4 engine adapters + BYO contract). That decomposes into later sub-projects. This branch ships the polished single-engine (ECharts) directive plus its docs.

## Non-goals

- `KjChartHost` adapter primitive — deferred.
- First-party SVG line / bar / area / donut / sparkline — deferred (this branch demonstrates the shapes via ECharts options, not via kj-rendered SVG).
- Non-ECharts engine adapters (visx, Recharts, d3) — deferred.
- BYO adapter contract — deferred.
- Styled wrapper component in `@kouji-ui/components` — chart stays directive-only; users compose with their own host element.

## Architecture

### Directive surface

`KjChart` (extended), `[kjChart]` selector, `exportAs: 'kjChart'`.

**Inputs**

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `kjChartOption` | `EChartsOption` | required | Reactive — re-applied on change |
| `kjChartLabel` | `string` | required | Short `aria-label` — WCAG AAA |
| `kjChartDescription` | `string` | `''` | Long description; rendered as visually-hidden `<div>`, wired via `aria-describedby` |
| `kjChartLoading` | `boolean` | `false` | Toggles ECharts `showLoading`/`hideLoading` |
| `kjChartPalette` | `string[] \| undefined` | `undefined` | Explicit color array; falls back to kj-token palette |
| `kjChartAnimate` | `boolean` | `true` | Forced to `false` when `prefers-reduced-motion: reduce` matches |

**Outputs**

| Name | Payload |
| --- | --- |
| `kjChartReady` | the ECharts instance (typed `EChartsType`) |
| `kjChartClick` | ECharts click event (`ECElementEvent`) |
| `kjChartLegendSelect` | legend `selectchanged` event |

**Host bindings**

```ts
host: {
  role: 'img',
  '[attr.aria-label]': 'kjChartLabel() || null',
  '[attr.aria-describedby]': 'descriptionId() || null',
}
```

A visually-hidden `<div [id]="descriptionId()">{{ kjChartDescription() }}</div>` is rendered when `kjChartDescription()` is non-empty. The ECharts canvas wrapper inside the host is `aria-hidden="true"` — screen readers reach the chart only via `aria-label` + description + the optional table fallback.

**exportAs API**

```ts
exportAs: 'kjChart'
```

Exposes:
- `resize(): void` — calls `chart.resize()`
- `dispatchAction(payload): void` — pass-through
- `getOption(): EChartsOption | undefined`

### Wiring

- **ResizeObserver** on host element → coalesce via `requestAnimationFrame` → `chart.resize()`. Disconnect on destroy.
- **`matchMedia('prefers-reduced-motion: reduce')`** subscribed at init. When matched (or changes), all option applications run through a merge that forces `animation: false` (and `animationDuration: 0`) on the option object before `setOption`.
- **`MutationObserver`** on `document.documentElement` watching `class` and `data-theme` attributes. On change → re-resolve palette via `chart-tokens.ts` → re-apply the current option (which merges the new `color` array).
- **Theme palette resolution** (`chart-tokens.ts`): reads `getComputedStyle(host)` for these vars in order:
  - `--color-primary`
  - `--color-accent`
  - `--color-success`
  - `--color-warning`
  - `--color-destructive`
  - `--chart-scale-1` … `--chart-scale-6` (new vars added to the kj theme tokens)
- Empty / missing values are filtered out. Result becomes the default `color` array merged into the option unless `kjChartPalette()` is explicitly set.

### New sibling files

- **`chart-tokens.ts`** — `resolveChartPalette(host: HTMLElement): string[]`. Pure utility. Spec covers: returns array, skips empty vars, honors `--chart-scale-N`.
- **`chart-table-fallback.ts`** — structural directive `*kjChartTableFallback`. Projects a visually-hidden `<table>` next to the canvas wrapper. The host directive sets `aria-hidden="true"` on the canvas wrapper when a fallback is present, so SRs read the table only.

### Lifecycle

1. `afterNextRender` (browser only, try/catch keeps SSR safe):
   - dynamic `import('echarts')`
   - `chart = echarts.init(host)`
   - subscribe ResizeObserver, MutationObserver, mediaquery
   - resolve initial palette + reduced-motion → merge into option → `chart.setOption(...)`
   - bind `chart.on('click', ...)` and `chart.on('legendselectchanged', ...)` to emit outputs
   - emit `kjChartReady(chart)`
2. `afterEveryRender` (replaces the current re-apply): when `chart` exists, re-resolve loading/palette/reduced-motion, merge with `kjChartOption()`, `chart.setOption(...)`. Idempotent.
3. `destroyRef.onDestroy`: disconnect observers, remove mediaquery listener, `chart.dispose()`.

## Examples — 8 files in `packages/core/src/chart/_examples/`

Shared `fixtures.ts` exports demo datasets (revenue series, multi-series users data, donut categories).

| File | Class | What it shows |
| --- | --- | --- |
| `chart.example.ts` | `ChartExample` | Default basic line — 1 series, 7 datapoints |
| `chart.bar.example.ts` | `ChartBarExample` | Multi-series grouped bar |
| `chart.donut.example.ts` | `ChartDonutExample` | Donut with right-side legend |
| `chart.area.example.ts` | `ChartAreaExample` | Stacked area, 2 series |
| `chart.sparkline.example.ts` | `ChartSparklineExample` | Inline mini-chart — no axes/grid/tooltip, fixed compact height |
| `chart.events.example.ts` | `ChartEventsExample` | `(kjChartClick)` + `(kjChartLegendSelect)`; prints last interaction below the chart |
| `chart.loading.example.ts` | `ChartLoadingExample` | Button toggles `[kjChartLoading]` |
| `chart.fallback.example.ts` | `ChartFallbackExample` | Bar + `*kjChartTableFallback` slot rendering equivalent data as SR-only `<table>` |

All examples use the directive on a `<div>` with explicit `style="height: 300px"` (sparkline uses 60px).

`_examples/index.ts` re-exports all 8 classes.

## Docs integration

Auto-discovered via `@doc` tags on the directive — `apps/docs/src/lib/docs-extractor.ts`'s `getDocsSlugs()` walks `packages/core/src/` for `@doc` markers and produces a manifest. The chart directive already has `@doc-category Core/Data`, `@doc-name chart`, `@doc-description`, `@doc-is-main`.

Additions to chart directive TSDoc:

- `@doc-example ChartExample` (default at top)
- `@doc-example ChartBarExample`
- `@doc-example ChartDonutExample`
- `@doc-example ChartAreaExample`
- `@doc-example ChartSparklineExample`
- `@doc-example ChartEventsExample`
- `@doc-example ChartLoadingExample`
- `@doc-example ChartFallbackExample`

Verification: `pnpm --filter docs start`, navigate to `/docs/chart` — page renders all 8 example previews.

## Registry

`packages/core/src/example-components.ts`:

- Add `'chart': () => import('./chart/_examples') as Promise<...>` to `EXAMPLE_LOADERS`
- Add the 8 export names to `EXAMPLE_OWNER`, each mapped to `'chart'`

## Theme tokens

Add `--chart-scale-1` … `--chart-scale-6` to every theme in the kj theme registry (location TBD during implementation — likely `packages/themes/src/<theme>/tokens.css` or the central tokens file). Values: 6 visually-distinct shades that harmonize with the existing color tokens; sourced from each theme's existing palette.

If the theme tokens file structure makes adding 6 vars × N themes too noisy, the implementation plan may swap to a single CSS variable holding a comma-separated palette (e.g. `--chart-scale: "#aaa,#bbb,..."`) parsed by `chart-tokens.ts`. Decision deferred to writing-plans.

## Tests

`packages/core/src/chart/chart.spec.ts` — extend existing 4 cases. ECharts is stubbed via `vi.mock('echarts', ...)` returning spies for `init` (returns the chart double), `setOption`, `resize`, `showLoading`, `hideLoading`, `on`, `dispose`.

New cases:
1. `aria-describedby` matches the visually-hidden description div's id when `kjChartDescription` is set
2. `ResizeObserver` callback invokes `chart.resize()` (rAF-flushed)
3. `prefers-reduced-motion: reduce` → `setOption` call's argument has `animation: false`
4. `<html>` class change → `setOption` is called again with refreshed palette
5. `[kjChartLoading]=true` → `showLoading` called; flipping to `false` → `hideLoading` called
6. `(kjChartClick)` emits the event ECharts passes to its `'click'` handler
7. `(kjChartLegendSelect)` emits on `'legendselectchanged'`
8. `kjChartReady` emits once with the chart instance
9. With `*kjChartTableFallback`: canvas wrapper has `aria-hidden="true"`; rendered `<table>` is in the DOM and is not `aria-hidden`
10. axe audit passes on a variant with description + table fallback

`chart-tokens.spec.ts` — palette resolution: filters empties, honors all 11 vars (`--color-*` + `--chart-scale-1..6`).

`chart-table-fallback.spec.ts` — structural directive renders its template; multiple instances render their own templates.

## Files touched

**New:**
- `packages/core/src/chart/chart-tokens.ts`
- `packages/core/src/chart/chart-tokens.spec.ts`
- `packages/core/src/chart/chart-table-fallback.ts`
- `packages/core/src/chart/chart-table-fallback.spec.ts`
- `packages/core/src/chart/_examples/fixtures.ts`
- `packages/core/src/chart/_examples/index.ts`
- `packages/core/src/chart/_examples/chart.example.ts`
- `packages/core/src/chart/_examples/chart.bar.example.ts`
- `packages/core/src/chart/_examples/chart.donut.example.ts`
- `packages/core/src/chart/_examples/chart.area.example.ts`
- `packages/core/src/chart/_examples/chart.sparkline.example.ts`
- `packages/core/src/chart/_examples/chart.events.example.ts`
- `packages/core/src/chart/_examples/chart.loading.example.ts`
- `packages/core/src/chart/_examples/chart.fallback.example.ts`
- `.changeset/feat-chart.md` — `@kouji-ui/core: minor`

**Extended:**
- `packages/core/src/chart/chart.ts`
- `packages/core/src/chart/chart.spec.ts`
- `packages/core/src/chart/index.ts`
- `packages/core/src/example-components.ts`
- kj theme token files (add `--chart-scale-1..6` per theme)

## Verification before PR

- `pnpm build` green
- `pnpm test` green
- `pnpm --filter docs start` → `/docs/chart` renders all 8 examples; no console errors
- axe-extension (or jest-axe) clean on the chart page
- Manual: switch themes in the docs site → all chart examples re-paint with the new palette
- Manual: toggle OS reduced-motion → animations stop on the next interaction

## Accessibility review (per CLAUDE.md)

- **2.1.1 Keyboard** — chart is presentational (`role="img"`); no keyboard interaction is required. Interactive demos (events example) keep the chart non-tabbable; outputs fire via mouse/touch. Roving-tabindex over data points is a roadmap item, not in this branch.
- **1.1.1 Non-text content** — `aria-label` required (already enforced via `input.required`). `aria-describedby` provides long description when needed.
- **1.3.1 Info and Relationships** — `*kjChartTableFallback` provides a structured tabular alternative.
- **4.1.2 Name, Role, Value** — `role="img"` + `aria-label` + `aria-describedby` cover name/role; no interactive value beyond ECharts events.
- **2.3.3 Animation from Interactions** — `prefers-reduced-motion` honored; animations disabled when matched.
- **1.4.3 / 1.4.6 Contrast** — palette resolution defers to active kj theme tokens, which already meet AAA in the kj theme system.
- **2.5.5 Target Size** — chart itself is non-interactive; loading-toggle button in the loading example uses `KjButton` (already AAA-sized).
