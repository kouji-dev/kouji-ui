# Accessibility & Quality Pipeline — Design Spec

**Date:** 2026-05-13
**Status:** Approved (pending implementation)
**Command:** `pnpm a11y`

## Goal

Build a local pipeline that measures accessibility, font quality, and performance for the kouji-ui docs app across every theme. Results are persisted as JSON reports in the repo so changes over time are visible through git diffs.

The pipeline is a measurement tool, not a CI gate. It records the state of each (theme, page) pair so we can see whether design changes improve or regress the quality of our themes.

## Scope

### What it checks

For each (theme, page) pair:

1. **Accessibility (axe-core, full WCAG suite)** — contrast ratios, ARIA, missing labels, keyboard traps, all standard WCAG rules.
2. **Font / typography** — computed font-family, font-size, line-height on a curated selector list. Warns on font-size below WCAG 1.4.4 minimum (12px), line-height ratio below 1.2 (WCAG 1.4.12), and fallback to system fonts (indicates the theme font failed to load).
3. **Performance (Lighthouse)** — FCP, LCP, CLS, TBT, Speed Index, plus the Lighthouse performance score.

### Themes (6)

`kouji`, `dark`, `light`, `retro`, `cyberpunk`, `corporate`.
Source of truth: `apps/docs/src/app/services/theme.service.ts` `AVAILABLE_THEMES`.

### Pages (6)

- `/` — landing
- `/getting-started`
- `/docs/button`
- `/docs/list`
- `/docs/badge`
- `/theme-generator`

### Matrix

6 themes × 6 pages = 36 reports per run.

### What it does NOT do (out of scope)

- CI integration / build failure on violations
- Automatic delta detection or regression alerting between runs (deferred — git diff is the diff tool for v1)
- HTML / visual dashboards
- The wider design-token-system overhaul (tracked separately in `pending-tasks.md`)

## Architecture

A standalone Node script orchestrated by `pnpm a11y`. New top-level workspace folder `tools/a11y/` keeps the pipeline isolated from Angular build pipelines.

### Modules

| Module | Responsibility |
|---|---|
| `tools/a11y/run.ts` | Entry point. Parses CLI args, validates filters, orchestrates the matrix loop. |
| `tools/a11y/config.ts` | Static config: themes list, pages list, output dir, font sample selectors. |
| `tools/a11y/dev-server.ts` | Detects running server on `:4200`; starts one if absent; tears down on exit (only if it started one). |
| `tools/a11y/runners/axe.ts` | Launches Playwright/Chromium, navigates to URL, runs `@axe-core/playwright`, returns violations. Also hosts the font runner in the same session. |
| `tools/a11y/runners/fonts.ts` | Runs inside the Playwright page context. Measures computed font properties on a fixed selector list and emits warnings against WCAG 1.4.4 / 1.4.12. |
| `tools/a11y/runners/lighthouse.ts` | Spawns the `lighthouse` CLI as a subprocess; parses output JSON; extracts perf score + metrics. |
| `tools/a11y/aggregator.ts` | Pure function: merges axe + fonts + lighthouse outputs into a single per-page report object. |
| `tools/a11y/report-writer.ts` | Writes report JSON to disk; ensures dirs exist; normalizes page paths to filenames. |

### Rationale

- `axe` and `fonts` share a single Playwright session per page — runs together to avoid double navigation.
- `lighthouse` runs as a separate subprocess (the standalone CLI is more reliable than Lighthouse-over-CDP through Playwright; perf measurements are more accurate when Lighthouse drives its own Chromium).
- `aggregator` is dumb merging — easy to unit-test in isolation.

## Data Flow

```
pnpm a11y [--theme <name>] [--page <path>]
   │
   ▼
run.ts ─► dev-server.ts: ensure http://localhost:4200 is reachable
   │
   ▼
for each theme in filtered list (parallel, one worker per theme):
   for each page in filtered list (sequential within worker):
   │
   │   URL = `http://localhost:4200${page}?theme=${theme}`
   │
   ├─► axe.ts (Playwright session, ~3-5s)
   │     ├─ navigate, wait for app stable
   │     ├─ run fonts.ts inside the same page context
   │     └─ run @axe-core/playwright
   │     returns { axe, fonts }
   │
   ├─► lighthouse.ts (separate Chromium subprocess, ~10-20s)
   │     └─ spawn `lighthouse <URL> --output=json --only-categories=performance`
   │     returns { lighthouse }
   │
   ├─► aggregator.ts: merge into one report object
   │
   └─► report-writer.ts: write to reports/a11y/<theme>/<page-slug>.json
   │
   ▼
Write reports/a11y/_summary.json (totals per theme)
Print summary table to stdout
Exit 0 (no hard failure — snapshots only)
```

### Concurrency

Themes run in parallel (6 workers max). Pages run sequentially within each theme worker. This keeps each Lighthouse measurement clean (single Chromium per worker at a time) while still cutting wall time roughly 6x. Estimated runtime: ~2–3 minutes for a full matrix.

### Filename normalization

`/` → `home.json`. `/docs/button` → `docs-button.json`. Leading slash stripped, remaining slashes → dashes.

## CLI

```
pnpm a11y                                    # all 36 runs
pnpm a11y --theme kouji                      # 6 runs (one theme, all pages)
pnpm a11y --theme kouji --page /docs/button  # 1 run
pnpm a11y --page /docs/button                # 6 runs (one page, all themes)
```

Both filters validate against `config.ts`. Invalid theme or page → exit 1 with the valid list printed.

## Application change

The only code change outside `tools/a11y/` is in `apps/docs/src/app/services/theme.service.ts`. The constructor's `afterNextRender` block gains a `?theme=` URL parameter check:

```ts
constructor() {
  afterNextRender(() => {
    const fromUrl = new URLSearchParams(location.search).get('theme') as Theme | null;
    const fromStorage = localStorage.getItem('kj-theme') as Theme | null;
    const isValid = (t: string | null): t is Theme =>
      !!t && (AVAILABLE_THEMES as readonly string[]).includes(t);

    if (isValid(fromUrl))       this.apply(fromUrl);
    else if (isValid(fromStorage)) this.apply(fromStorage);
    else                          this.apply('kouji');
  });
}
```

Priority: URL → localStorage → default `kouji`. The URL param does **not** write to localStorage (transient override — the pipeline must not persist test themes into a user's browser profile if they later open the same profile).

## Report Schema

Each per-page report is a single JSON file at `reports/a11y/<theme>/<page-slug>.json`:

```json
{
  "schemaVersion": 1,
  "theme": "cyberpunk",
  "page": "/docs/button",
  "url": "http://localhost:4200/docs/button?theme=cyberpunk",
  "timestamp": "2026-05-13T10:00:00.000Z",

  "axe": {
    "violationsByImpact": { "critical": 0, "serious": 2, "moderate": 5, "minor": 1 },
    "violations": [
      {
        "id": "color-contrast",
        "impact": "serious",
        "help": "Elements must meet minimum color contrast ratio thresholds",
        "nodes": [
          {
            "target": ["button.kj-button.ghost"],
            "failureSummary": "...",
            "fg": "#888",
            "bg": "#999",
            "ratio": 1.8,
            "expected": 4.5
          }
        ]
      }
    ],
    "passes": 47
  },

  "fonts": {
    "samples": [
      { "selector": "body", "fontFamily": "Inter, ...", "fontSize": 16, "lineHeight": 24, "weight": 400 },
      { "selector": "h1",   "fontFamily": "Inter, ...", "fontSize": 32, "lineHeight": 40, "weight": 700 }
    ],
    "warnings": [
      { "selector": "small.kj-caption", "issue": "fontSize 11px below 12px minimum (WCAG 1.4.4)" }
    ]
  },

  "lighthouse": {
    "scores": { "performance": 87 },
    "metrics": { "FCP": 1240, "LCP": 2100, "CLS": 0.02, "TBT": 180, "SI": 2400 }
  }
}
```

**One file per page** (not split per check): a theme regression usually crosses dimensions (e.g., a token change breaks contrast AND shifts a font fallback). One file means one git diff to read.

### Font sample selectors

Initial fixed list (curated in `config.ts`):
`body`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `button`, `a`, `code`, `p`, `.kj-caption`, `[role="status"]`.

### Font warnings

- `fontSize < 12px` (WCAG 1.4.4)
- `lineHeight / fontSize < 1.2` (WCAG 1.4.12)
- Computed `fontFamily` resolves to a system fallback (e.g. `serif`, `sans-serif`, `system-ui`) when the theme declared a specific stack — signals the web font failed to load

### Summary file

`reports/a11y/_summary.json` aggregates totals per theme:

```json
{
  "schemaVersion": 1,
  "timestamp": "2026-05-13T10:00:00.000Z",
  "themes": {
    "kouji": {
      "axeViolationsByImpact": { "critical": 0, "serious": 4, "moderate": 8, "minor": 2 },
      "fontWarnings": 1,
      "lighthouseAvg": { "performance": 89 }
    }
  }
}
```

## Error Handling

| Failure | Behavior |
|---|---|
| Dev server not up & cannot be started | Fail fast. Exit 1 with the port and instructions to start the server manually. |
| Page navigation timeout (60s) | Write report with `"error": "<message>"` field, mark all sections null, continue to next page. |
| `axe-core` throws | Write partial report with error in `axe`, keep `fonts` / `lighthouse` if they ran. |
| Lighthouse subprocess crashes | Write report with `lighthouse: null` and `"lighthouseError": "<message>"`, continue. |
| Invalid `--theme` / `--page` arg | Exit 1 with the valid list. |

Snapshots-only means the pipeline never fails on accessibility violations — only on infrastructure errors. Regressions surface through reviewing the git diff of report files.

## Testing

- **Unit (Vitest):** `aggregator.ts`, `report-writer.ts` (slug normalization), `config.ts` (filter validation).
- **Smoke E2E:** Run `pnpm a11y --theme kouji --page /` against a running dev server. Assert the expected report file exists, parses as JSON, and has all three sections (`axe`, `fonts`, `lighthouse`) populated.
- No direct tests for `axe.ts` / `lighthouse.ts` — they're thin wrappers around third-party tools. Smoke E2E covers them end-to-end.

## Dependencies (new)

- `@playwright/test` (already installed)
- `@axe-core/playwright` (new)
- `lighthouse` CLI (new — npm dep, not a system requirement)

## File layout

```
tools/a11y/
  run.ts
  config.ts
  dev-server.ts
  aggregator.ts
  report-writer.ts
  runners/
    axe.ts
    fonts.ts
    lighthouse.ts
  package.json
  tsconfig.json
  README.md

reports/a11y/                      # generated, committed
  _summary.json
  kouji/
    home.json
    getting-started.json
    docs-button.json
    docs-list.json
    docs-badge.json
    theme-generator.json
  dark/...
  light/...
  retro/...
  cyberpunk/...
  corporate/...
```

`reports/a11y/` is committed (the whole point — diff over time).

## Open follow-ups (not in this spec)

- CI workflow that runs `pnpm a11y` on a schedule or on PRs and posts the diff as a check comment.
- Auto delta detection — a separate `pnpm a11y:diff` command that compares the latest run against the previous git revision and highlights regressions.
- HTML dashboard report.
- Design token system overhaul (tracked in `pending-tasks.md`) — once that lands, this pipeline becomes the validation tool for the new tokens.
