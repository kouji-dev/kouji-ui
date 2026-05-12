# @kouji-ui/a11y

Local accessibility, font, and performance pipeline for the kouji-ui docs app.

## What it does

For every theme × page combination, runs:

- **axe-core** (full WCAG suite) — contrast, ARIA, keyboard, labels
- **Font / typography checks** — WCAG 1.4.4 font-size, WCAG 1.4.12 line-height, web-font load detection
- **Lighthouse** — performance score + FCP / LCP / CLS / TBT / SI

Reports are persisted as JSON at `reports/a11y/<theme>/<page>.json` (committed to git).
A per-run summary lives at `reports/a11y/_summary.json`.

The pipeline is a measurement tool, not a CI gate — it never fails the build on
violations. Track changes via `git diff reports/a11y/`.

## Usage

```bash
pnpm a11y                                      # all 36 runs
pnpm a11y --theme kouji                        # 6 runs (one theme, all pages)
pnpm a11y --theme kouji --page /docs/button    # 1 run
pnpm a11y --page /docs/button                  # 6 runs (one page, all themes)
```

The pipeline starts the docs dev server on `:4200` if it isn't already running,
and stops it on exit. If you have a server already running, it's reused.

## Theme switching

The pipeline navigates to `?theme=<name>` URL params. `ThemeService` honours
that param transiently (it does **not** write to localStorage). Priority:
URL → localStorage → `kouji`.

## Adding a theme or page

Edit `src/config.ts`:

- Add to `THEMES` and to `Theme` in `src/types.ts`.
- Append a `{ path, slug }` to `PAGES`.

No changes needed elsewhere.

## Design spec

[`docs/superpowers/specs/2026-05-13-a11y-pipeline-design.md`](../../docs/superpowers/specs/2026-05-13-a11y-pipeline-design.md)
