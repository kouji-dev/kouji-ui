# Roadmap page & per-theme loading screen — design

**Date:** 2026-05-16
**Status:** approved (draft → implementation plan next)
**Source:** `design-revamp/kouji-ui-v3/` (unzipped from `kouji ui (2).zip`)

## Goal

Port two new artifacts from the v3 design revamp into the live `apps/docs` Angular app, pixel-perfect to the source:

1. A **Roadmap page** at `/roadmap` — kanban board with filter/sort and expandable cards.
2. A **per-theme loading screen** — replace the existing first-paint splash so each of the 13 themes gets its own bespoke ambient-loop figure.

The mockup pages have their own duplicate topbar, theme picker, and version chip. We **reuse `kj-navbar`** for both because it already does all of that. The mockup's per-page topbar code is not ported.

## Out of scope

- No `/loading-screens` showcase route. The two unused variants from the mockup (`wordmark`, `terminal-log`) are not ported as user-facing pages.
- No per-page topbar.
- No new design tokens. CSS-var renames only.
- No backend / API. Roadmap data is a static TS const.

## Section 1 — Roadmap page

### Route

Add to `apps/docs/src/app/app.routes.ts`:

```ts
{
  path: 'roadmap',
  loadComponent: () => import('./pages/roadmap/roadmap').then(m => m.RoadmapPage),
}
```

No shell needed — full-bleed page like `home`.

### Files

All under `apps/docs/src/app/pages/roadmap/`:

| File | Purpose |
|------|---------|
| `roadmap.ts` / `.html` / `.css` | Root `RoadmapPage` component (signals, OnPush) |
| `roadmap-data.ts` | Typed `ROADMAP`, `COLUMNS`, `CATEGORIES` consts — ported verbatim from `roadmap-data.jsx` |
| `roadmap-intro.ts` | Eyebrow + h1 + tagline + stats strip |
| `roadmap-toolbar.ts` | Filter chips (category + status) + sort `<select>` + clear button |
| `roadmap-column.ts` | One column with head + cards or empty state |
| `roadmap-card.ts` | One card; expand-on-click, progress bar (wip), candor note, candidate badge |

### Data shapes

```ts
type StatusId = 'idea' | 'next' | 'wip' | 'shipped';
type CategoryId = 'component' | 'theme' | 'a11y' | 'perf' | 'docs';
type SortMode = 'date-desc' | 'date-asc' | 'version-desc' | 'version-asc' | 'issues';

interface RoadmapItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly longDesc: string;
  readonly version: string;       // 'v0.5.0' | 'v0.7+' | 'tba' | '?'
  readonly date: string;          // 'Jun 2026' | 'Q4 2026' | '?'
  readonly category: CategoryId;
  readonly status: StatusId;
  readonly issues: number;
  readonly prs: number;
  readonly candor?: string | null;
  readonly progress?: number;     // 0..1 — only on wip
  readonly candidate?: boolean;   // only on idea
}

interface ColumnDef { readonly id: StatusId; readonly label: string; readonly sub: string; }
interface CategoryDef { readonly id: CategoryId; readonly label: string; }
```

The 19 items, 4 columns, 5 categories from `roadmap-data.jsx` are ported as-is (verbatim copy + verbatim hand-edited type quirks).

### Root component state

```ts
class RoadmapPage {
  protected readonly activeCats = signal<ReadonlySet<CategoryId>>(new Set());
  protected readonly activeStatuses = signal<ReadonlySet<StatusId>>(new Set());
  protected readonly sort = signal<SortMode>('date-desc');
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());

  protected readonly filtered = computed(() => /* category + status filter */);
  protected readonly sorted = computed(() => /* sort by mode */);
  protected readonly itemsByStatus = computed(() => /* group by column */);
  protected readonly totalsByStatus = computed(() => /* unfiltered counts */);
  protected readonly totalsByCategory = computed(() => /* unfiltered counts */);
  protected readonly filterActive = computed(
    () => this.activeCats().size > 0 || this.activeStatuses().size > 0,
  );

  protected readonly stats = computed(() => ({
    shipped: ROADMAP.filter(i => i.status === 'shipped').length,
    wip:     ROADMAP.filter(i => i.status === 'wip').length,
    next:    ROADMAP.filter(i => i.status === 'next').length,
    idea:    ROADMAP.filter(i => i.status === 'idea').length,
    candidate: ROADMAP.filter(i => i.candidate).length,
  }));

  protected toggleCat(id: CategoryId): void;
  protected toggleStatus(id: StatusId): void;
  protected clearFilters(): void;
  protected toggleExpand(id: string): void;
}
```

`versionSort` helper mirrors the JSX: strips leading `v`, parses major.minor, special tokens (`'?'`, `'tba'`) sort to `-1`.

### Visual / styling

Port `roadmap.css` 1:1, mapping vars:

| Mockup var | Kouji token |
|------------|-------------|
| `--bg` | `var(--kj-bg-body)` |
| `--surface` | `var(--kj-bg-surface)` |
| `--surface-2` | `var(--kj-bg-elevated)` |
| `--text` | `var(--kj-fg-default)` |
| `--text-dim` | `var(--kj-fg-muted)` |
| `--primary` | `var(--kj-bg-primary)` for fills, `var(--kj-fg-primary)` for text |
| `--primary-text` | `var(--kj-fg-on-primary)` |
| `--accent` | `var(--kj-bg-accent)` for fills, `var(--kj-fg-accent)` for text |
| `--border` | `var(--kj-border-default)` |
| `--stroke` | `1px` |
| `--radius` | `var(--kj-radius-field)` |
| `--font-display` | `var(--kj-font-display)` |
| `--font-mono` | `var(--kj-font-mono)` |
| `--font-body` | `var(--kj-font-sans)` |
| `--display-weight` | `var(--kj-display-weight)` |
| `--display-italic` | `var(--kj-display-italic)` |
| `--letter-spacing` | `var(--kj-letter-spacing)` |
| `--shadow-card` | `var(--kj-shadow-md)` |

Hard-coded category dot colors (`#00b06b` for a11y, `#88c0d0` for perf, `#d4a017` for docs) are kept literal — they are intentionally non-theme-aware semantic chips. Component uses `--kj-bg-primary`; theme uses `--kj-bg-accent`.

The toolbar uses `position: sticky; top: 73px` to clear `kj-navbar`. We verify the navbar height matches; if not, switch to a CSS var fed from the shell.

### Accessibility

- Filter chips: native `<button>` with `aria-pressed` for toggle state.
- Cards: native `role="button"` via `<article role="button" tabindex="0">`, with `aria-expanded` for the details panel and Enter/Space activating `toggleExpand`.
- Progress bar: `<div role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100" aria-label="Progress N%">`.
- Sort: native `<select>` — no custom replacement (a11y > aesthetics).
- Expanded panel: `aria-hidden` when closed, `id` referenced by the card's `aria-controls`.

WCAG 2.1 AAA review applied: contrast ratios sampled across all 13 themes; focus rings via `:focus-visible` inherit from kouji defaults.

### Navbar update

In `apps/docs/src/app/components/navbar/navbar.html`, insert between "Theme Generator" and `<span class="kj-navbar-spacer">`:

```html
<a routerLink="/roadmap" routerLinkActive="active" class="kj-navbar-link">Roadmap</a>
```

No other navbar changes.

---

## Section 2 — Per-theme loading screen

### Scope

Replace what the existing `LoadingScreenComponent` renders. Keep the trigger (shown until `appRef.isStable`) and the fullscreen overlay positioning unchanged. Swap the visual content.

### Files

| File | Action |
|------|--------|
| `apps/docs/src/app/components/loading-screen/loader-figures.ts` | **New.** `KjLoaderFigure` component with `@switch (themeId())` rendering 13 distinct SVG animations. |
| `apps/docs/src/app/components/loading-screen/loading-screen.ts` | Inject `ThemeService`, pass `theme()` to the figure. Drop the dummy `animateLogo` signal. |
| `apps/docs/src/app/components/loading-screen/loading-screen.html` | Replace logo+wordmark markup with `<kj-loader-figure>` + caption row. |
| `apps/docs/src/app/components/loading-screen/loading-screen.css` | Center the figure (max 320px square), caption row below in mono. |

### `KjLoaderFigure` component

Mirrors the existing `KjThemeFigure` pattern (`apps/docs/src/app/pages/home/theme-figures.ts`):

```ts
@Component({
  selector: 'kj-loader-figure',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'loader-figure', 'aria-hidden': 'true' },
  template: `
    @switch (themeId()) {
      @case ('kouji') { <!-- inline SVG with animateTransform --> }
      @case ('dark')  { ... }
      ...
    }
  `,
})
export class KjLoaderFigure {
  readonly themeId = input.required<Theme>();
}
```

All 13 SVGs ported 1:1 from `design-revamp/kouji-ui-v3/loader-figures.jsx`. Declarative SVG `<animate>` / `<animateTransform>` preserved exactly (no JS animation, no requestAnimationFrame).

### 13 figures inventory

| Theme | Animation summary |
|-------|-------------------|
| kouji | 工 strokes draw in sequence then dissolve, 2.4s loop |
| dark | dual rings counter-rotating + center orb pulse |
| light | enso draws in then undraws, accent dot pulses |
| retro | sweeping ray around starburst disc |
| cyberpunk | jittering bolt + horizontal scanline noise |
| corporate | five bars rising in stagger |
| sakura | corner blossom + 5 falling petals |
| bauhaus | red circle / blue triangle / yellow square orbiting on a black axis |
| dune | pulsing sun + rippling dune ridge |
| mint | leaf unfurling from stem |
| forest | 6 fireflies orbiting a glow |
| nord | aurora morphing over mountains |
| terminal | streamed log lines with CRT scanlines + flicker |

### Why hard-coded colors per figure

Each figure is theme-specific — kouji's lime (`#c4ff3d`), sakura's magenta (`#c8265e`), terminal's phosphor green (`#33ff66`). We don't try to re-color a single figure with theme tokens; we *switch the figure* when the theme changes. This matches the source's intent.

### `LoadingScreenComponent` update

```ts
@Component({
  selector: 'kj-loading-screen',
  standalone: true,
  imports: [KjLoaderFigure],
  templateUrl: './loading-screen.html',
  styleUrl: './loading-screen.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingScreenComponent {
  private readonly themeService = inject(ThemeService);
  protected readonly theme = this.themeService.theme;
}
```

Template:

```html
<div class="loading-screen" [attr.data-theme]="theme()">
  <div class="ls-stage">
    <kj-loader-figure [themeId]="theme()" />
    <div class="ls-caption">
      <span class="lf-name">kouji/ui</span>
      <span class="lf-dot" aria-hidden="true"></span>
      <span class="lf-status">loading <em>{{ theme() }}</em> workspace</span>
      <span class="lf-dots" aria-hidden="true"><span></span><span></span><span></span></span>
    </div>
  </div>
</div>
```

CSS: figure box max-width 320px, square, centered. Caption row mono small text below with three dot-pulse animation.

### SSR

`LoadingScreenComponent` renders on the server. `ThemeService.theme()` defaults to `'kouji'` server-side (`signal<Theme>('kouji')`). On hydration the service reads `localStorage` / URL and may swap to another theme — `@switch` swaps the figure. This matches what `KjThemeFigure` already does on the home page; no SSR special-casing required.

### Accessibility

- Outer host: `aria-hidden="true"` — the splash is decorative (the app's content is hidden via `[class.content-hidden]` while loading).
- Caption text remains in DOM for any AT that does pick it up; the wrapper hiding takes precedence.
- All `<animate>` animations should also degrade for `prefers-reduced-motion`. Add a `@media (prefers-reduced-motion: reduce)` block in `loading-screen.css` that hides the figure and shows only the wordmark caption.

---

## What changes outside these two areas

| File | Change |
|------|--------|
| `apps/docs/src/app/app.routes.ts` | Add `/roadmap` route |
| `apps/docs/src/app/components/navbar/navbar.html` | Add `Roadmap` nav link |
| `apps/docs/src/app/components/loading-screen/loading-screen.{ts,html,css}` | Replace splash visuals |

Everything else is **new files only** under `pages/roadmap/` and one new file under `components/loading-screen/loader-figures.ts`.

## Verification plan

- Build: `pnpm nx build docs` succeeds.
- Serve: `pnpm nx serve docs`, navigate to `/roadmap`, verify:
  - All 19 cards render in correct columns
  - Filter chips toggle correctly with `aria-pressed`
  - Sort modes reorder cards as expected
  - Cards expand/collapse on click + Enter + Space
  - "Clear" button appears when filter active
  - Toolbar sticks below navbar on scroll
  - Theme cycle through all 13 — `--primary` / `--accent` cues on columns update
- Splash: hard-refresh on each of the 13 themes, verify the correct figure renders pre-hydration and stays through `isStable`.
- Reduced motion: in DevTools emulate `prefers-reduced-motion: reduce`, verify SVG animations halt and caption still shows.
- Axe: run axe-core scan on `/roadmap` — zero violations.
- Visual diff: compare against `design-revamp/kouji-ui-v3/screenshots/01-roadmap-board.png` and `screenshots/loaders.png`.
