# Roadmap page & per-theme loading screen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the v3 design revamp's roadmap board and per-theme loader figure into `apps/docs`, pixel-perfect to `design-revamp/kouji-ui-v3/`.

**Architecture:** Two independent additions:
1. New lazy route `/roadmap` rendered by a standalone `RoadmapPage` with signal-based filter/sort state, four sub-components (intro, toolbar, column, card), and a page-local typed data const.
2. New `KjLoaderFigure` component (13-case `@switch` over the active theme) consumed by an updated `LoadingScreenComponent` that swaps the splash visual to a per-theme ambient loop. Keep the existing `appRef.isStable` hide trigger.

**Tech Stack:** Angular 21 standalone components, signals, OnPush, CSS variables (`--kj-*` tokens), declarative SVG `<animate>` / `<animateTransform>` (no JS animation), Playwright for E2E.

**Source files** (reference, do not modify):
- `design-revamp/kouji-ui-v3/roadmap.jsx`
- `design-revamp/kouji-ui-v3/roadmap-data.jsx`
- `design-revamp/kouji-ui-v3/roadmap.css`
- `design-revamp/kouji-ui-v3/loaders.jsx`
- `design-revamp/kouji-ui-v3/loader-figures.jsx`
- `design-revamp/kouji-ui-v3/loaders.css`

**Token mapping reference** (used throughout):

| Mockup var | Kouji token |
|------------|-------------|
| `--bg` | `var(--kj-bg-body)` |
| `--surface` | `var(--kj-bg-surface)` |
| `--surface-2` | `var(--kj-bg-elevated)` |
| `--text` | `var(--kj-fg-default)` |
| `--text-dim` | `var(--kj-fg-muted)` |
| `--primary` (bg) | `var(--kj-bg-primary)` |
| `--primary` (fg) | `var(--kj-fg-primary)` |
| `--primary-text` | `var(--kj-fg-on-primary)` |
| `--accent` (bg) | `var(--kj-bg-accent)` |
| `--accent` (fg) | `var(--kj-fg-accent)` |
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

Existing navbar height = **56px** (not 73px from mockup); sticky toolbar uses `top: 56px`.

---

## Part A — Roadmap page (Tasks 1–11)

### Task 1: Add roadmap data file

**Files:**
- Create: `apps/docs/src/app/pages/roadmap/roadmap-data.ts`

- [ ] **Step 1: Create the data file**

```ts
/**
 * Roadmap dataset for the /roadmap page.
 *
 * Ports `design-revamp/kouji-ui-v3/roadmap-data.jsx` verbatim. When the real
 * roadmap diverges from this snapshot, edit this file — no other file should
 * need to change.
 */

export type StatusId = 'idea' | 'next' | 'wip' | 'shipped';
export type CategoryId = 'component' | 'theme' | 'a11y' | 'perf' | 'docs';
export type SortMode =
  | 'date-desc'
  | 'date-asc'
  | 'version-desc'
  | 'version-asc'
  | 'issues';

export interface RoadmapItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly longDesc: string;
  readonly version: string;
  readonly date: string;
  readonly category: CategoryId;
  readonly status: StatusId;
  readonly issues: number;
  readonly prs: number;
  readonly candor?: string | null;
  readonly progress?: number;
  readonly candidate?: boolean;
}

export interface ColumnDef {
  readonly id: StatusId;
  readonly label: string;
  readonly sub: string;
}

export interface CategoryDef {
  readonly id: CategoryId;
  readonly label: string;
}

export const ROADMAP: readonly RoadmapItem[] = [
  // ─── SHIPPED ───────────────────────────────────────────────
  {
    id: 'v0.4-themes',
    title: '13 ship-ready themes',
    description:
      'kouji, dark, light, retro, cyberpunk, corporate, sakura, bauhaus, dune, mint, forest, nord, terminal.',
    longDesc:
      'Every theme ships a full token set: colors, type, shape, spacing, motion. Theme can be swapped at runtime via [data-theme] without re-mount. Themes are tree-shakable — only the ones you import ship.',
    version: 'v0.4.0',
    date: 'Apr 2026',
    category: 'theme',
    status: 'shipped',
    issues: 14,
    prs: 22,
    candor: null,
  },
  {
    id: 'v0.4-theme-gen',
    title: 'Theme generator',
    description:
      'Visual editor for tokens with live preview across 8 component scenes + WCAG contrast scores.',
    longDesc:
      'Fork any of the 13 base themes, tweak any token, see eight live preview scenes (landing/form/dashboard/modal/chat/pricing/settings/tokens) update instantly. Built-in a11y panel shows contrast ratios for every text/bg pair, plus colorblindness sim and focus-ring tests.',
    version: 'v0.4.0',
    date: 'Apr 2026',
    category: 'theme',
    status: 'shipped',
    issues: 9,
    prs: 11,
    candor: null,
  },
  {
    id: 'v0.3-a11y',
    title: 'Axe-clean across the board',
    description:
      'Every primitive passes axe-core at WCAG AA out of the box. Focus rings respect :focus-visible everywhere.',
    longDesc:
      '47 components, 0 axe violations on default settings. Keyboard nav patterns verified against WAI-ARIA Authoring Practices. Tested with NVDA, JAWS, VoiceOver.',
    version: 'v0.3.0',
    date: 'Feb 2026',
    category: 'a11y',
    status: 'shipped',
    issues: 28,
    prs: 41,
  },
  {
    id: 'v0.3-ssr',
    title: 'SSR-safe by default',
    description: 'Hydration-safe across Angular Universal. No flash, no mismatch.',
    longDesc:
      "All overlays use Angular CDK's Portal with deterministic IDs. Theme tokens resolve via CSS variables (no JS theme detection during hydration). Verified against Universal + ng-vite SSR.",
    version: 'v0.3.0',
    date: 'Feb 2026',
    category: 'perf',
    status: 'shipped',
    issues: 6,
    prs: 9,
  },
  {
    id: 'v0.2-button',
    title: 'Button (the rite of passage)',
    description:
      'Four variants, three sizes, every state. The component every library has — done right.',
    longDesc:
      'We rebuilt button three times before we shipped it. Now it has no rough edges: real <button> semantics, axe-clean, type-safe API, theme-aware shadows, springy hover.',
    version: 'v0.2.0',
    date: 'Jan 2026',
    category: 'component',
    status: 'shipped',
    issues: 4,
    prs: 7,
  },

  // ─── IN PROGRESS ───────────────────────────────────────────
  {
    id: 'v0.5-datatable',
    title: 'DataTable component',
    description:
      'Sortable, filterable, virtual-scrolling. With selection + column resizing.',
    longDesc:
      "Backed by Angular CDK's @angular/cdk/table for accessibility primitives, layered with our token system. Virtual scrolling via cdk-virtual-scroll-viewport. Column resize handles, multi-sort, server-driven loading mode.",
    version: 'v0.5.0',
    date: 'Jun 2026',
    category: 'component',
    status: 'wip',
    issues: 7,
    prs: 3,
    candor: 'Pagination subcomponent is harder than we thought — might slip a week.',
    progress: 0.65,
  },
  {
    id: 'v0.5-datepicker',
    title: 'DatePicker + DateRangePicker',
    description: 'Calendar-grid date selection. Single + range. Localized.',
    longDesc:
      'Built on top of Intl.DateTimeFormat for locales. Keyboard navigation: arrow keys move days, page up/down moves months, home/end snap to week. Range picker uses two coupled calendars on desktop, one on mobile.',
    version: 'v0.5.0',
    date: 'Jun 2026',
    category: 'component',
    status: 'wip',
    issues: 5,
    prs: 2,
    progress: 0.40,
  },
  {
    id: 'v0.5-docs-search',
    title: 'Docs site search',
    description: 'Cmd-K opens a full-text search across all components and recipes.',
    longDesc:
      'Powered by a build-time index (fuse.js, ~12kb gzipped). Fuzzy matching with keyword boost. Result preview with code snippet thumbnails.',
    version: 'v0.5.0',
    date: 'Jun 2026',
    category: 'docs',
    status: 'wip',
    issues: 2,
    prs: 1,
    progress: 0.80,
  },

  // ─── NEXT UP ───────────────────────────────────────────────
  {
    id: 'v0.6-combobox',
    title: 'Combobox + Autocomplete',
    description: 'Searchable select with async data loading and free-text mode.',
    longDesc:
      'WAI-ARIA Combobox pattern. Supports static items, async loader, custom item templates. Free-text mode lets users enter values not in the list (useful for tags). Multi-select variant ships alongside.',
    version: 'v0.6.0',
    date: 'Aug 2026',
    category: 'component',
    status: 'next',
    issues: 12,
    prs: 0,
  },
  {
    id: 'v0.6-toast',
    title: 'Toast (graduating from beta)',
    description: 'Toast moves out of beta. Stable API, stable behavior.',
    longDesc:
      'Locks in the imperative API (KouToastService.show()), positioning options (4 corners + center top/bottom), and the staging behavior when multiple toasts fire in quick succession.',
    version: 'v0.6.0',
    date: 'Aug 2026',
    category: 'component',
    status: 'next',
    issues: 5,
    prs: 0,
  },
  {
    id: 'v0.6-rtl',
    title: 'RTL support across the board',
    description: 'Right-to-left layouts for Arabic, Hebrew, Farsi.',
    longDesc:
      'Layout primitives switch via [dir="rtl"] on the host. Icons and chevrons mirror automatically; calendars/sliders/progress get a writing-mode-aware traversal. Tested with Arabic + Hebrew sample docs.',
    version: 'v0.6.0',
    date: 'Aug 2026',
    category: 'a11y',
    status: 'next',
    issues: 3,
    prs: 0,
  },
  {
    id: 'v0.6-perf',
    title: 'Bundle size budget',
    description: 'Each component locks in a maximum gzipped size. CI fails on regression.',
    longDesc:
      'Per-component bundlewatch config. Core package target: 8kb gzipped, no exceptions. Tree-shaking lints to catch accidental side-effects that pull in everything.',
    version: 'v0.6.0',
    date: 'Aug 2026',
    category: 'perf',
    status: 'next',
    issues: 2,
    prs: 0,
  },

  // ─── UNDER CONSIDERATION ───────────────────────────────────
  {
    id: 'researching-charts',
    title: 'Chart primitives',
    description: 'Line, bar, area charts as themed components. Maybe.',
    longDesc:
      "We're undecided. Charts are a huge surface area, and there are good libraries already (Apache ECharts, visx). If we ship them, they'll wrap an existing engine and just make it themeable + accessible. If we don't, we'll publish a theming recipe for the popular libraries instead.",
    version: 'v0.7+',
    date: 'Q4 2026',
    category: 'component',
    status: 'idea',
    candidate: true,
    issues: 8,
    prs: 0,
    candor: 'Honestly torn. Comments welcome on the RFC.',
  },
  {
    id: 'researching-form-engine',
    title: 'Form schema engine',
    description: 'Generate full forms from a TypeScript schema. JSON-schema interop.',
    longDesc:
      'Define a schema in TS, get a fully-validated form with all the right kouji components. Inspired by Formly but tighter integration with our component types. Open question: does it belong in the core package or a separate @kouji/forms?',
    version: 'v0.8+',
    date: 'Q4 2026',
    category: 'component',
    status: 'idea',
    candidate: true,
    issues: 4,
    prs: 0,
    candor: 'Not committed. Need to validate the API with 3+ real apps first.',
  },
  {
    id: 'researching-figma',
    title: 'Figma plugin',
    description: 'Sync tokens between Figma variables and kouji themes.',
    longDesc:
      'Bidirectional sync: edit a token in the theme generator, see it in Figma. Tweak a Figma variable, push back to a theme file. Probably ships as a separate companion plugin, not bundled.',
    version: 'tba',
    date: 'Q1 2027',
    category: 'theme',
    status: 'idea',
    candidate: true,
    issues: 2,
    prs: 0,
    candor: 'Cool if it works. Hard to maintain a plugin alongside a UI library.',
  },

  // ─── IDEAS ─────────────────────────────────────────────────
  {
    id: 'idea-react-port',
    title: 'React port',
    description: 'Same components, same themes, React APIs.',
    longDesc:
      "Discussion on github. Strong demand. We'd love to do it, but we want kouji's Angular story to be airtight first.",
    version: '?',
    date: '?',
    category: 'component',
    status: 'idea',
    issues: 47,
    prs: 0,
    candor: 'Not soon. Maybe 2027 at earliest.',
  },
  {
    id: 'idea-themes-marketplace',
    title: 'Community themes gallery',
    description:
      'Submit your theme, see it on a public page, install with one command.',
    longDesc:
      'A page listing user-submitted themes. PR-based contribution: open a PR with a theme file, get it reviewed, merged into the gallery. Install via ng add @kouji/themes/<name>.',
    version: '?',
    date: '?',
    category: 'theme',
    status: 'idea',
    issues: 18,
    prs: 0,
  },
  {
    id: 'idea-motion-system',
    title: 'Motion system v2',
    description:
      'Composable motion presets: entrance, exit, transition. Reduced-motion aware.',
    longDesc:
      'Move beyond per-component animations to a kit of named motion presets (slide-up-fade, scale-spring, drift-in). All presets respect prefers-reduced-motion. Designers can author new presets in pure CSS.',
    version: '?',
    date: '?',
    category: 'theme',
    status: 'idea',
    issues: 9,
    prs: 0,
  },
  {
    id: 'idea-vscode',
    title: 'VS Code companion',
    description: 'Snippets, theme preview, component prop hover.',
    longDesc:
      'Surface our typed prop docs inline in the editor. Show a small theme swatch when hovering theme tokens. Snippets for common patterns.',
    version: '?',
    date: '?',
    category: 'docs',
    status: 'idea',
    issues: 6,
    prs: 0,
  },
];

export const COLUMNS: readonly ColumnDef[] = [
  { id: 'idea',    label: 'ideas',       sub: 'wishlist · some flagged as candidates' },
  { id: 'next',    label: 'next up',     sub: 'committed for upcoming version' },
  { id: 'wip',     label: 'in progress', sub: 'shipping this sprint' },
  { id: 'shipped', label: 'shipped',     sub: 'available now' },
];

export const CATEGORIES: readonly CategoryDef[] = [
  { id: 'component', label: 'component' },
  { id: 'theme',     label: 'theme' },
  { id: 'a11y',      label: 'a11y' },
  { id: 'perf',      label: 'performance' },
  { id: 'docs',      label: 'docs' },
];

/**
 * Maps version strings to a sortable number. Higher = newer.
 * Tokens 'tba' and '?' sort to -1 (bottom for desc, top for asc).
 */
export function versionSort(v: string): number {
  if (!v || v === '?' || v === 'tba') return -1;
  const m = v.replace(/^v/, '').match(/^(\d+)\.?(\d*)/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 1000 + parseInt(m[2] || '0', 10);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/docs/src/app/pages/roadmap/roadmap-data.ts
git commit -m "feat(docs/roadmap): add typed roadmap dataset (19 items, 4 columns, 5 categories)"
```

---

### Task 2: Add /roadmap route + navbar link (renders empty page, verifies plumbing)

**Files:**
- Create: `apps/docs/src/app/pages/roadmap/roadmap.ts`
- Create: `apps/docs/src/app/pages/roadmap/roadmap.html`
- Create: `apps/docs/src/app/pages/roadmap/roadmap.css`
- Modify: `apps/docs/src/app/app.routes.ts`
- Modify: `apps/docs/src/app/components/navbar/navbar.html`

- [ ] **Step 1: Create the empty page component**

`apps/docs/src/app/pages/roadmap/roadmap.ts`:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'kj-roadmap-page',
  standalone: true,
  templateUrl: './roadmap.html',
  styleUrl: './roadmap.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoadmapPage {}
```

`apps/docs/src/app/pages/roadmap/roadmap.html`:

```html
<div class="page">
  <!-- Sections wired in later tasks -->
</div>
```

`apps/docs/src/app/pages/roadmap/roadmap.css`:

```css
.page { display: block; }
```

- [ ] **Step 2: Wire the route**

Modify `apps/docs/src/app/app.routes.ts` — insert this entry before the `{ path: '**' ... }` catch-all:

```ts
  {
    path: 'roadmap',
    loadComponent: () => import('./pages/roadmap/roadmap').then(m => m.RoadmapPage),
  },
```

- [ ] **Step 3: Add the navbar link**

In `apps/docs/src/app/components/navbar/navbar.html`, insert after the existing `Theme Generator` link (line 28) and before `<span class="kj-navbar-spacer">`:

```html
<a routerLink="/roadmap" routerLinkActive="active" class="kj-navbar-link">Roadmap</a>
```

- [ ] **Step 4: Verify it loads**

Run: `pnpm exec ng build docs --configuration development`
Expected: build succeeds, no TS errors.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/pages/roadmap/ apps/docs/src/app/app.routes.ts apps/docs/src/app/components/navbar/navbar.html
git commit -m "feat(docs): add /roadmap route + navbar link (empty page stub)"
```

---

### Task 3: Roadmap intro section

**Files:**
- Modify: `apps/docs/src/app/pages/roadmap/roadmap.ts`
- Modify: `apps/docs/src/app/pages/roadmap/roadmap.html`

- [ ] **Step 1: Import data and expose stats**

Replace `apps/docs/src/app/pages/roadmap/roadmap.ts` with:

```ts
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { ROADMAP } from './roadmap-data';

@Component({
  selector: 'kj-roadmap-page',
  standalone: true,
  templateUrl: './roadmap.html',
  styleUrl: './roadmap.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoadmapPage {
  protected readonly stats = computed(() => ({
    shipped:   ROADMAP.filter(i => i.status === 'shipped').length,
    wip:       ROADMAP.filter(i => i.status === 'wip').length,
    next:      ROADMAP.filter(i => i.status === 'next').length,
    idea:      ROADMAP.filter(i => i.status === 'idea').length,
    candidate: ROADMAP.filter(i => i.candidate).length,
  }));
}
```

- [ ] **Step 2: Render intro markup**

Replace `apps/docs/src/app/pages/roadmap/roadmap.html` with:

```html
<div class="page">
  <section class="rm-intro">
    <span class="rm-eyebrow">// what's next</span>
    <h1 class="rm-h1">roadmap.</h1>
    <p class="rm-tagline">
      what we're building, what we're thinking about, and what's already shipped.
      <strong>dates slip</strong> — we'll be honest about it. ideas are a public
      sketchpad; the ones marked <strong>candidate</strong> have a real shot at
      the next version.
    </p>
    <div class="rm-stats">
      <div class="rm-stat">
        <div class="num">{{ stats().idea }}</div>
        <div class="lbl">ideas · {{ stats().candidate }} candidates</div>
      </div>
      <div class="rm-stat">
        <div class="num">{{ stats().next }}</div>
        <div class="lbl">next up</div>
      </div>
      <div class="rm-stat">
        <div class="num">{{ stats().wip }}</div>
        <div class="lbl">in progress</div>
      </div>
      <div class="rm-stat">
        <div class="num">{{ stats().shipped }}</div>
        <div class="lbl">shipped</div>
      </div>
      <div class="rm-stat">
        <div class="num">v1.0</div>
        <div class="lbl">target · q4 2026</div>
      </div>
    </div>
  </section>
</div>
```

- [ ] **Step 3: Build to confirm no errors**

Run: `pnpm exec ng build docs --configuration development`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/app/pages/roadmap/
git commit -m "feat(docs/roadmap): render intro section with stats strip"
```

---

### Task 4: Roadmap toolbar (filters + sort)

**Files:**
- Create: `apps/docs/src/app/pages/roadmap/roadmap-toolbar.ts`
- Modify: `apps/docs/src/app/pages/roadmap/roadmap.ts`
- Modify: `apps/docs/src/app/pages/roadmap/roadmap.html`

- [ ] **Step 1: Create the toolbar component**

`apps/docs/src/app/pages/roadmap/roadmap-toolbar.ts`:

```ts
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  CATEGORIES,
  CategoryId,
  COLUMNS,
  SortMode,
  StatusId,
} from './roadmap-data';

@Component({
  selector: 'kj-roadmap-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rm-toolbar">
      <div class="rm-filter-group">
        <span class="rm-filter-label">category</span>
        @for (c of categories; track c.id) {
          <button
            type="button"
            class="rm-chip"
            [attr.aria-pressed]="activeCats().has(c.id)"
            (click)="toggleCat.emit(c.id)"
          >
            <span>{{ c.label }}</span>
            <span class="count">{{ totalsByCategory()[c.id] ?? 0 }}</span>
          </button>
        }
      </div>

      <div class="rm-filter-group">
        <span class="rm-filter-label">status</span>
        @for (s of columns; track s.id) {
          <button
            type="button"
            class="rm-chip"
            [attr.aria-pressed]="activeStatuses().has(s.id)"
            (click)="toggleStatus.emit(s.id)"
          >
            <span>{{ s.label }}</span>
            <span class="count">{{ totalsByStatus()[s.id] ?? 0 }}</span>
          </button>
        }
      </div>

      @if (filterActive()) {
        <button type="button" class="rm-clear" (click)="clearFilters.emit()">
          clear · showing {{ visibleCount() }}
        </button>
      }

      <select
        class="rm-sort"
        [value]="sort()"
        (change)="sortChange.emit($any($event.target).value)"
        aria-label="Sort roadmap items"
      >
        <option value="date-desc">sort: newest first</option>
        <option value="date-asc">sort: oldest first</option>
        <option value="version-desc">sort: version desc</option>
        <option value="version-asc">sort: version asc</option>
        <option value="issues">sort: most discussed</option>
      </select>
    </div>
  `,
  // Styles ported in the dedicated CSS task; class names match `roadmap.css`.
})
export class RoadmapToolbar {
  protected readonly categories = CATEGORIES;
  protected readonly columns = COLUMNS;

  readonly activeCats = input.required<ReadonlySet<CategoryId>>();
  readonly activeStatuses = input.required<ReadonlySet<StatusId>>();
  readonly totalsByCategory = input.required<Readonly<Record<CategoryId, number>>>();
  readonly totalsByStatus = input.required<Readonly<Record<StatusId, number>>>();
  readonly sort = input.required<SortMode>();
  readonly filterActive = input.required<boolean>();
  readonly visibleCount = input.required<number>();

  readonly toggleCat = output<CategoryId>();
  readonly toggleStatus = output<StatusId>();
  readonly clearFilters = output<void>();
  readonly sortChange = output<SortMode>();
}
```

- [ ] **Step 2: Wire state and computed totals into the page**

Replace `apps/docs/src/app/pages/roadmap/roadmap.ts` with:

```ts
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  CATEGORIES,
  CategoryId,
  COLUMNS,
  ROADMAP,
  RoadmapItem,
  SortMode,
  StatusId,
  versionSort,
} from './roadmap-data';
import { RoadmapToolbar } from './roadmap-toolbar';

@Component({
  selector: 'kj-roadmap-page',
  standalone: true,
  imports: [RoadmapToolbar],
  templateUrl: './roadmap.html',
  styleUrl: './roadmap.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoadmapPage {
  protected readonly activeCats     = signal<ReadonlySet<CategoryId>>(new Set());
  protected readonly activeStatuses = signal<ReadonlySet<StatusId>>(new Set());
  protected readonly sort           = signal<SortMode>('date-desc');
  protected readonly expanded       = signal<ReadonlySet<string>>(new Set());

  protected readonly filtered = computed<readonly RoadmapItem[]>(() => {
    const cats = this.activeCats();
    const stats = this.activeStatuses();
    return ROADMAP.filter(i => {
      if (cats.size > 0 && !cats.has(i.category)) return false;
      if (stats.size > 0 && !stats.has(i.status)) return false;
      return true;
    });
  });

  protected readonly sorted = computed<readonly RoadmapItem[]>(() => {
    const arr = [...this.filtered()];
    switch (this.sort()) {
      case 'date-desc':    arr.sort((a, b) => versionSort(b.version) - versionSort(a.version)); break;
      case 'date-asc':     arr.sort((a, b) => versionSort(a.version) - versionSort(b.version)); break;
      case 'version-desc': arr.sort((a, b) => b.version.localeCompare(a.version)); break;
      case 'version-asc':  arr.sort((a, b) => a.version.localeCompare(b.version)); break;
      case 'issues':       arr.sort((a, b) => (b.issues || 0) - (a.issues || 0)); break;
    }
    return arr;
  });

  protected readonly itemsByStatus = computed<Readonly<Record<StatusId, readonly RoadmapItem[]>>>(() => {
    const out: Record<StatusId, RoadmapItem[]> = {
      idea: [], next: [], wip: [], shipped: [],
    };
    for (const item of this.sorted()) out[item.status].push(item);
    return out;
  });

  protected readonly totalsByStatus = computed<Readonly<Record<StatusId, number>>>(() => {
    const m: Record<StatusId, number> = { idea: 0, next: 0, wip: 0, shipped: 0 };
    for (const i of ROADMAP) m[i.status]++;
    return m;
  });

  protected readonly totalsByCategory = computed<Readonly<Record<CategoryId, number>>>(() => {
    const m: Record<CategoryId, number> = { component: 0, theme: 0, a11y: 0, perf: 0, docs: 0 };
    for (const i of ROADMAP) m[i.category]++;
    return m;
  });

  protected readonly filterActive = computed(
    () => this.activeCats().size > 0 || this.activeStatuses().size > 0,
  );

  protected readonly stats = computed(() => ({
    shipped:   ROADMAP.filter(i => i.status === 'shipped').length,
    wip:       ROADMAP.filter(i => i.status === 'wip').length,
    next:      ROADMAP.filter(i => i.status === 'next').length,
    idea:      ROADMAP.filter(i => i.status === 'idea').length,
    candidate: ROADMAP.filter(i => i.candidate).length,
  }));

  protected readonly columns = COLUMNS;
  protected readonly categories = CATEGORIES;

  protected toggleCat(id: CategoryId): void {
    const next = new Set(this.activeCats());
    next.has(id) ? next.delete(id) : next.add(id);
    this.activeCats.set(next);
  }
  protected toggleStatus(id: StatusId): void {
    const next = new Set(this.activeStatuses());
    next.has(id) ? next.delete(id) : next.add(id);
    this.activeStatuses.set(next);
  }
  protected clearFilters(): void {
    this.activeCats.set(new Set());
    this.activeStatuses.set(new Set());
  }
  protected toggleExpand(id: string): void {
    const next = new Set(this.expanded());
    next.has(id) ? next.delete(id) : next.add(id);
    this.expanded.set(next);
  }
  protected setSort(mode: SortMode): void {
    this.sort.set(mode);
  }
}
```

- [ ] **Step 3: Render toolbar in the page template**

Append below the closing `</section>` of `.rm-intro` in `apps/docs/src/app/pages/roadmap/roadmap.html`:

```html
  <kj-roadmap-toolbar
    [activeCats]="activeCats()"
    [activeStatuses]="activeStatuses()"
    [totalsByCategory]="totalsByCategory()"
    [totalsByStatus]="totalsByStatus()"
    [sort]="sort()"
    [filterActive]="filterActive()"
    [visibleCount]="sorted().length"
    (toggleCat)="toggleCat($event)"
    (toggleStatus)="toggleStatus($event)"
    (clearFilters)="clearFilters()"
    (sortChange)="setSort($event)"
  />
```

- [ ] **Step 4: Build**

Run: `pnpm exec ng build docs --configuration development`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/pages/roadmap/
git commit -m "feat(docs/roadmap): wire filter chips + sort toolbar with signal state"
```

---

### Task 5: Roadmap card component

**Files:**
- Create: `apps/docs/src/app/pages/roadmap/roadmap-card.ts`

- [ ] **Step 1: Create the card**

```ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { RoadmapItem } from './roadmap-data';

@Component({
  selector: 'kj-roadmap-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'rm-card',
    'role': 'button',
    'tabindex': '0',
    '[class.open]': 'open()',
    '[attr.aria-expanded]': 'open()',
    '(click)': 'toggle.emit()',
    '(keydown.enter)': '$event.preventDefault(); toggle.emit()',
    '(keydown.space)': '$event.preventDefault(); toggle.emit()',
  },
  template: `
    <div class="rm-card-meta">
      <span class="rm-card-version">{{ item().version }}</span>
      <span class="sep">·</span>
      <span>{{ item().date }}</span>
    </div>

    <h3 class="rm-card-title">
      @if (item().candidate) {
        <span class="rm-candidate" title="candidate for upcoming version">candidate</span>
      }
      {{ item().title }}
    </h3>
    <p class="rm-card-desc">{{ item().description }}</p>

    @if (progressPct() !== null) {
      <div
        class="rm-progress"
        role="progressbar"
        [attr.aria-valuenow]="progressPct()"
        aria-valuemin="0"
        aria-valuemax="100"
        [attr.aria-label]="'Progress ' + progressPct() + '%'"
      >
        <div class="rm-progress-fill" [style.width.%]="progressPct()"></div>
      </div>
    }

    @if (item().candor) {
      <span class="rm-candor">{{ item().candor }}</span>
    }

    <div class="rm-card-foot">
      <span class="rm-cat" [attr.data-cat]="item().category">{{ item().category }}</span>
      <span class="rm-issues">
        <span title="open issues">{{ item().issues }}↯</span>
        @if (item().prs > 0) {
          <span title="open pull requests">{{ item().prs }}⤴</span>
        }
      </span>
    </div>

    <div class="rm-card-details">
      <div>
        <p class="rm-card-long">{{ item().longDesc }}</p>
        <div class="rm-card-link-row">
          <a class="rm-card-link" href="#" (click)="$event.preventDefault(); $event.stopPropagation()">
            {{ item().issues }} issues ↗
          </a>
          @if (item().prs > 0) {
            <a class="rm-card-link" href="#" (click)="$event.preventDefault(); $event.stopPropagation()">
              {{ item().prs }} PRs ↗
            </a>
          }
          <a class="rm-card-link" href="#" (click)="$event.preventDefault(); $event.stopPropagation()">
            rfc thread ↗
          </a>
        </div>
      </div>
    </div>
  `,
})
export class RoadmapCard {
  readonly item = input.required<RoadmapItem>();
  readonly open = input.required<boolean>();
  readonly toggle = output<void>();

  protected readonly progressPct = computed<number | null>(() => {
    const p = this.item().progress;
    return p == null ? null : Math.round(p * 100);
  });
}
```

- [ ] **Step 2: Build**

Run: `pnpm exec ng build docs --configuration development`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/app/pages/roadmap/roadmap-card.ts
git commit -m "feat(docs/roadmap): add card component with expand-on-click + a11y"
```

---

### Task 6: Roadmap column component

**Files:**
- Create: `apps/docs/src/app/pages/roadmap/roadmap-column.ts`

- [ ] **Step 1: Create the column**

```ts
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { ColumnDef, RoadmapItem } from './roadmap-data';
import { RoadmapCard } from './roadmap-card';

@Component({
  selector: 'kj-roadmap-column',
  standalone: true,
  imports: [RoadmapCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'rm-column',
    '[attr.data-status]': 'col().id',
  },
  template: `
    <div class="rm-column-head">
      <div class="rm-column-title">
        <span class="rm-column-label">{{ col().label }}</span>
        <span class="rm-column-count">
          {{ items().length }}
          @if (items().length !== total()) {
            <span style="opacity:0.5"> / {{ total() }}</span>
          }
        </span>
      </div>
      <span class="rm-column-sub">{{ col().sub }}</span>
    </div>

    @if (items().length === 0) {
      <div class="rm-empty">nothing here right now</div>
    } @else {
      @for (item of items(); track item.id) {
        <kj-roadmap-card
          [item]="item"
          [open]="expanded().has(item.id)"
          (toggle)="toggleExpand.emit(item.id)"
        />
      }
    }
  `,
})
export class RoadmapColumn {
  readonly col = input.required<ColumnDef>();
  readonly items = input.required<readonly RoadmapItem[]>();
  readonly total = input.required<number>();
  readonly expanded = input.required<ReadonlySet<string>>();
  readonly toggleExpand = output<string>();
}
```

- [ ] **Step 2: Wire into the page**

Update `apps/docs/src/app/pages/roadmap/roadmap.ts` imports array to add `RoadmapColumn`:

```ts
import { RoadmapColumn } from './roadmap-column';
// ...
@Component({
  // ...
  imports: [RoadmapToolbar, RoadmapColumn],
  // ...
})
```

Append below the `<kj-roadmap-toolbar />` in `apps/docs/src/app/pages/roadmap/roadmap.html`:

```html
  <div class="rm-board-wrap">
    <div class="rm-board">
      @for (col of columns; track col.id) {
        <kj-roadmap-column
          [col]="col"
          [items]="itemsByStatus()[col.id]"
          [total]="totalsByStatus()[col.id]"
          [expanded]="expanded()"
          (toggleExpand)="toggleExpand($event)"
        />
      }
    </div>
  </div>
```

- [ ] **Step 3: Build**

Run: `pnpm exec ng build docs --configuration development`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/app/pages/roadmap/
git commit -m "feat(docs/roadmap): wire 4-column kanban board"
```

---

### Task 7: Roadmap CSS port (pixel-perfect)

**Files:**
- Modify: `apps/docs/src/app/pages/roadmap/roadmap.css`

- [ ] **Step 1: Replace with the full ported CSS**

Replace `apps/docs/src/app/pages/roadmap/roadmap.css` with the following. This is a 1:1 port of `design-revamp/kouji-ui-v3/roadmap.css` with the var renames from the token table at the top of this plan. `position: sticky` toolbar uses `top: 56px` to clear the existing 56px-tall `kj-navbar`.

```css
/* ============================================================
   Roadmap — kanban + filter chrome
   Ported 1:1 from design-revamp/kouji-ui-v3/roadmap.css.
   ============================================================ */

.page { display: block; }

/* ─────────── intro ─────────── */
.rm-intro {
  padding: 28px 32px 8px;
  border-bottom: 1px solid var(--kj-border-default);
  background-color: var(--kj-bg-body);
}
.rm-eyebrow {
  font-family: var(--kj-font-mono);
  font-size: 11px;
  color: var(--kj-fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  display: block;
  margin-bottom: 6px;
}
.rm-h1 {
  font-family: var(--kj-font-display);
  font-weight: var(--kj-display-weight);
  font-style: var(--kj-display-italic);
  font-size: clamp(36px, 6vw, 72px);
  letter-spacing: var(--kj-letter-spacing);
  line-height: 0.95;
  margin: 0 0 12px;
}
.rm-tagline {
  font-family: var(--kj-font-sans);
  font-size: 16px;
  color: var(--kj-fg-muted);
  max-width: 720px;
  margin: 0 0 18px;
  line-height: 1.45;
}
.rm-tagline strong { color: var(--kj-fg-default); }

/* ─────────── stats strip ─────────── */
.rm-stats {
  display: flex;
  gap: 0;
  margin: 18px 0 4px;
}
.rm-stat {
  flex: 0 0 auto;
  padding-right: 26px;
  margin-right: 26px;
  border-right: 1px solid var(--kj-border-default);
}
.rm-stat:last-child { border-right: 0; }
.rm-stat .num {
  font-family: var(--kj-font-display);
  font-weight: var(--kj-display-weight);
  font-size: 28px;
  line-height: 1;
  color: var(--kj-fg-default);
  letter-spacing: -0.02em;
}
.rm-stat .lbl {
  font-family: var(--kj-font-mono);
  font-size: 10px;
  color: var(--kj-fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin-top: 4px;
}

/* ─────────── toolbar ─────────── */
.rm-toolbar {
  padding: 16px 32px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background-color: var(--kj-bg-body);
  border-bottom: 1px solid var(--kj-border-default);
  position: sticky;
  top: 56px;
  z-index: 20;
}
.rm-filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rm-filter-label {
  font-family: var(--kj-font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--kj-fg-muted);
  margin-right: 4px;
}
.rm-chip {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--kj-border-default);
  background-color: var(--kj-bg-surface);
  color: var(--kj-fg-default);
  font-family: var(--kj-font-mono);
  font-size: 11px;
  text-transform: lowercase;
  letter-spacing: 0;
  border-radius: var(--kj-radius-field);
  cursor: pointer;
  white-space: nowrap;
}
.rm-chip:hover { border-color: var(--kj-bg-primary); }
.rm-chip[aria-pressed="true"] {
  background-color: var(--kj-bg-primary);
  color: var(--kj-fg-on-primary);
  border-color: var(--kj-bg-primary);
}
.rm-chip .count {
  font-size: 10px;
  opacity: 0.6;
  margin-left: 2px;
  font-variant-numeric: tabular-nums;
}
.rm-chip[aria-pressed="true"] .count { opacity: 0.85; }
.rm-sort {
  appearance: none;
  background-color: var(--kj-bg-surface);
  border: 1px solid var(--kj-border-default);
  border-radius: var(--kj-radius-field);
  color: var(--kj-fg-default);
  font-family: var(--kj-font-mono);
  font-size: 11px;
  padding: 6px 26px 6px 10px;
  cursor: pointer;
  margin-left: auto;
  background-image:
    linear-gradient(45deg, transparent 50%, var(--kj-fg-muted) 50%),
    linear-gradient(135deg, var(--kj-fg-muted) 50%, transparent 50%);
  background-position: calc(100% - 14px) 50%, calc(100% - 10px) 50%;
  background-size: 4px 4px;
  background-repeat: no-repeat;
}
.rm-clear {
  appearance: none;
  background: transparent;
  border: 0;
  font-family: var(--kj-font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--kj-fg-muted);
  cursor: pointer;
  padding: 0;
}
.rm-clear:hover { color: var(--kj-fg-primary); }

/* ─────────── kanban board ─────────── */
.rm-board-wrap {
  padding: 24px 0 80px;
  overflow-x: auto;
  scrollbar-width: thin;
}
.rm-board {
  display: grid;
  grid-template-columns: repeat(4, minmax(280px, 1fr));
  gap: 16px;
  padding: 0 32px;
  align-items: start;
}
@media (max-width: 1280px) {
  .rm-board { grid-template-columns: repeat(4, 320px); }
}

kj-roadmap-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rm-column-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 4px 12px;
  border-bottom: 2px solid var(--kj-border-default);
  margin-bottom: 4px;
}
.rm-column-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.rm-column-label {
  font-family: var(--kj-font-display);
  font-weight: var(--kj-display-weight);
  font-style: var(--kj-display-italic);
  font-size: 22px;
  letter-spacing: var(--kj-letter-spacing);
  color: var(--kj-fg-default);
}
.rm-column-count {
  font-family: var(--kj-font-mono);
  font-size: 11px;
  color: var(--kj-fg-muted);
  font-variant-numeric: tabular-nums;
  margin-left: auto;
  padding: 2px 8px;
  border: 1px solid var(--kj-border-default);
  border-radius: var(--kj-radius-field);
  background-color: var(--kj-bg-surface);
}
.rm-column-sub {
  font-family: var(--kj-font-mono);
  font-size: 10px;
  color: var(--kj-fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.14em;
}
kj-roadmap-column[data-status="wip"] .rm-column-label { color: var(--kj-fg-primary); }
kj-roadmap-column[data-status="wip"] .rm-column-head  { border-bottom-color: var(--kj-bg-primary); }
kj-roadmap-column[data-status="shipped"] .rm-column-label { color: var(--kj-fg-accent); }
kj-roadmap-column[data-status="shipped"] .rm-column-head  { border-bottom-color: var(--kj-bg-accent); }

/* candidate badge */
.rm-candidate {
  display: inline-block;
  margin-right: 6px;
  padding: 1px 6px;
  background-color: var(--kj-bg-accent);
  color: var(--kj-fg-on-primary);
  font-family: var(--kj-font-mono);
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  border-radius: 2px;
  vertical-align: 2px;
}
.rm-card:has(.rm-candidate) { border-left: 3px solid var(--kj-bg-accent); }

/* ─────────── cards ─────────── */
.rm-card {
  background-color: var(--kj-bg-surface);
  border: 1px solid var(--kj-border-default);
  border-radius: var(--kj-radius-field);
  padding: 14px 16px;
  cursor: pointer;
  box-shadow: var(--kj-shadow-md);
  transition: transform .15s cubic-bezier(.34,1.56,.64,1), border-color .15s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rm-card:hover { border-color: var(--kj-bg-primary); transform: translateY(-2px); }
.rm-card.open { border-color: var(--kj-bg-primary); }
.rm-card:focus-visible {
  outline: 2px solid var(--kj-border-focus);
  outline-offset: 2px;
}

.rm-card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--kj-font-mono);
  font-size: 10px;
  color: var(--kj-fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.rm-card-version { color: var(--kj-fg-default); font-weight: 700; }
.rm-card-meta .sep { opacity: 0.4; }

.rm-card-title {
  font-family: var(--kj-font-sans);
  font-weight: 700;
  font-size: 14px;
  letter-spacing: -0.01em;
  color: var(--kj-fg-default);
  line-height: 1.3;
  margin: 0;
}
.rm-card-desc {
  font-family: var(--kj-font-sans);
  font-size: 12px;
  line-height: 1.45;
  color: var(--kj-fg-muted);
  margin: 0;
}
.rm-card-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}
.rm-cat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border: 1px solid var(--kj-border-default);
  border-radius: var(--kj-radius-field);
  font-family: var(--kj-font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--kj-fg-default);
  background-color: var(--kj-bg-elevated);
}
.rm-cat::before {
  content: "";
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: var(--kj-bg-primary);
}
.rm-cat[data-cat="component"]::before { background-color: var(--kj-bg-primary); }
.rm-cat[data-cat="theme"]::before     { background-color: var(--kj-bg-accent); }
.rm-cat[data-cat="a11y"]::before      { background-color: #00b06b; }
.rm-cat[data-cat="perf"]::before      { background-color: #88c0d0; }
.rm-cat[data-cat="docs"]::before      { background-color: #d4a017; }

.rm-issues {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--kj-font-mono);
  font-size: 10px;
  color: var(--kj-fg-muted);
}
.rm-issues span { font-variant-numeric: tabular-nums; }

.rm-progress {
  width: 100%;
  height: 4px;
  background-color: var(--kj-bg-elevated);
  border-radius: 999px;
  overflow: hidden;
  margin-top: 4px;
}
.rm-progress-fill {
  height: 100%;
  background-color: var(--kj-bg-primary);
  transition: width .35s ease;
}

.rm-candor {
  display: block;
  margin-top: 2px;
  padding: 8px 10px;
  background-color: var(--kj-bg-elevated);
  border-left: 2px solid var(--kj-bg-accent);
  font-family: var(--kj-font-sans);
  font-size: 11px;
  font-style: italic;
  color: var(--kj-fg-muted);
  line-height: 1.4;
}
.rm-candor::before {
  content: "✱ ";
  color: var(--kj-fg-accent);
  font-style: normal;
  margin-right: 2px;
}

.rm-card-details {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows .25s cubic-bezier(.4, 0, .2, 1);
}
.rm-card.open .rm-card-details { grid-template-rows: 1fr; }
.rm-card-details > div { overflow: hidden; }
.rm-card-long {
  font-family: var(--kj-font-sans);
  font-size: 12px;
  line-height: 1.5;
  color: var(--kj-fg-default);
  margin: 8px 0 4px;
  padding-top: 8px;
  border-top: 1px solid var(--kj-border-default);
}
.rm-card-link-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.rm-card-link {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: var(--kj-bg-body);
  border: 1px solid var(--kj-border-default);
  border-radius: var(--kj-radius-field);
  color: var(--kj-fg-default);
  font-family: var(--kj-font-mono);
  font-size: 10px;
  text-transform: lowercase;
  text-decoration: none;
  cursor: pointer;
}
.rm-card-link:hover { border-color: var(--kj-bg-primary); color: var(--kj-fg-primary); }

.rm-empty {
  padding: 32px 16px;
  text-align: center;
  font-family: var(--kj-font-mono);
  font-size: 11px;
  color: var(--kj-fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  background-color: var(--kj-bg-surface);
  border: 1px dashed var(--kj-border-default);
  border-radius: var(--kj-radius-field);
}

@media (max-width: 760px) {
  .rm-toolbar { padding: 12px 20px; }
  .rm-board   { padding: 0 20px; }
}
```

> Note: the source CSS targets `.rm-column` as a class selector. Because we use Angular component selectors (`kj-roadmap-column`) without `ViewEncapsulation.None`, the `.rm-column` class would be view-scoped. We rewrite those selectors to target the host element `kj-roadmap-column[data-status="…"]`. Same effect, idiomatic.

- [ ] **Step 2: Run dev server and eyeball the page**

Use the Monitor tool to stream `pnpm exec ng serve docs --port 4200` and open `http://localhost:4200/roadmap` in a browser (do NOT pass `--host`). Verify:
- Intro reads correctly, 5-stat strip lines up
- Toolbar chips clickable, sticky below navbar on scroll
- Cards render in 4 columns, "in progress" column label is primary-colored, "shipped" is accent-colored
- Cards expand on click; candidate cards show the accent left-rail badge
- WIP cards show progress bars; candor blockquote appears on the DataTable card

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/app/pages/roadmap/roadmap.css
git commit -m "style(docs/roadmap): port roadmap.css with kj-token mapping"
```

---

### Task 8: E2E test — roadmap interactivity

**Files:**
- Create: `apps/docs/e2e/roadmap.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test';

test('roadmap renders all four columns with correct counts', async ({ page }) => {
  await page.goto('/roadmap');

  await expect(page.getByRole('heading', { name: 'roadmap.' })).toBeVisible();
  // Four columns: ideas, next up, in progress, shipped
  await expect(page.locator('kj-roadmap-column')).toHaveCount(4);
  // Stats strip shows 5 items
  await expect(page.locator('.rm-stat')).toHaveCount(5);
});

test('clicking a category chip filters cards', async ({ page }) => {
  await page.goto('/roadmap');

  // Total card count before filtering
  const before = await page.locator('kj-roadmap-card').count();
  expect(before).toBeGreaterThan(0);

  // Press the "a11y" filter chip
  const a11yChip = page.locator('.rm-chip', { hasText: 'a11y' });
  await a11yChip.click();
  await expect(a11yChip).toHaveAttribute('aria-pressed', 'true');

  // Now only a11y cards should render
  const after = await page.locator('kj-roadmap-card').count();
  expect(after).toBeLessThan(before);
  expect(after).toBeGreaterThan(0);

  // Clear button shows up
  await expect(page.locator('.rm-clear')).toBeVisible();
  await page.locator('.rm-clear').click();
  await expect(a11yChip).toHaveAttribute('aria-pressed', 'false');
});

test('clicking a card expands its details', async ({ page }) => {
  await page.goto('/roadmap');

  const card = page.locator('kj-roadmap-card').first();
  await expect(card).toHaveAttribute('aria-expanded', 'false');
  await card.click();
  await expect(card).toHaveAttribute('aria-expanded', 'true');
  await card.click();
  await expect(card).toHaveAttribute('aria-expanded', 'false');
});

test('Enter key activates a focused card', async ({ page }) => {
  await page.goto('/roadmap');
  const card = page.locator('kj-roadmap-card').first();
  await card.focus();
  await page.keyboard.press('Enter');
  await expect(card).toHaveAttribute('aria-expanded', 'true');
});

test('roadmap link in navbar navigates and marks active', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /^roadmap$/i }).first().click();
  await expect(page).toHaveURL(/\/roadmap$/);
  await expect(page.getByRole('link', { name: /^roadmap$/i }).first()).toHaveClass(/active/);
});
```

- [ ] **Step 2: Run the spec**

Run: `pnpm exec playwright test apps/docs/e2e/roadmap.spec.ts --reporter=list`
Expected: all 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/e2e/roadmap.spec.ts
git commit -m "test(e2e): roadmap renders, filters, expands, navigates"
```

---

## Part B — Per-theme loading screen (Tasks 9–11)

### Task 9: Create `KjLoaderFigure` component (13 themed SVGs)

**Files:**
- Create: `apps/docs/src/app/components/loading-screen/loader-figures.ts`

- [ ] **Step 1: Write the component**

This is a large file because every SVG is inlined verbatim from `design-revamp/kouji-ui-v3/loader-figures.jsx`. The Angular template syntax uses kebab-case SVG attribute names (`stroke-width` not `strokeWidth`), but otherwise the geometry, colors, and animation timings are byte-identical to the JSX source.

```ts
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
} from '@angular/core';
import { Theme } from '../../services/theme.service';

/**
 * Per-theme ambient-loop figure for the first-paint splash.
 *
 * Mirrors the shape of `KjThemeFigure`: a single component dispatches to one
 * of 13 inlined SVG compositions via `@switch (themeId())`. Animations are
 * pure declarative SVG (`<animate>` / `<animateTransform>`) + a couple of CSS
 * keyframes for transform-origin-anchored shrink/grow. No JS animation.
 *
 * Hard-coded colors are intentional — each figure speaks its theme's visual
 * dialect. We switch the figure when the theme changes; we do not re-color
 * a single figure.
 *
 * Ported 1:1 from design-revamp/kouji-ui-v3/loader-figures.jsx.
 * Decorative — host carries aria-hidden="true".
 */
@Component({
  selector: 'kj-loader-figure',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'loader-fig-svg-wrap', 'aria-hidden': 'true' },
  template: `
    @switch (themeId()) {
      @case ('kouji') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <rect width="400" height="400" fill="#0a0a0a" />
          <g stroke="#1f1f1f" stroke-width="1">
            <line x1="50" y1="100" x2="350" y2="100" /><line x1="50" y1="200" x2="350" y2="200" /><line x1="50" y1="300" x2="350" y2="300" />
            <line x1="100" y1="50" x2="100" y2="350" /><line x1="200" y1="50" x2="200" y2="350" /><line x1="300" y1="50" x2="300" y2="350" />
          </g>
          <g fill="#c4ff3d">
            <rect x="80" y="100" width="240" height="36" style="transform-origin: left center">
              <animateTransform attributeName="transform" type="scale" values="0 1; 1 1; 1 1; 1 1" keyTimes="0; 0.18; 0.8; 1" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1; 1; 1; 0" keyTimes="0; 0.7; 0.85; 1" dur="2.4s" repeatCount="indefinite" />
            </rect>
            <rect x="184" y="100" width="32" height="200" style="transform-origin: center top">
              <animateTransform attributeName="transform" type="scale" values="1 0; 1 0; 1 1; 1 1; 1 1" keyTimes="0; 0.18; 0.36; 0.8; 1" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1; 1; 1; 0" keyTimes="0; 0.7; 0.85; 1" dur="2.4s" repeatCount="indefinite" />
            </rect>
            <rect x="80" y="264" width="240" height="36" style="transform-origin: left center">
              <animateTransform attributeName="transform" type="scale" values="0 1; 0 1; 1 1; 1 1; 1 1" keyTimes="0; 0.36; 0.54; 0.8; 1" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1; 1; 1; 0" keyTimes="0; 0.7; 0.85; 1" dur="2.4s" repeatCount="indefinite" />
            </rect>
          </g>
        </svg>
      }
      @case ('dark') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <defs>
            <radialGradient id="lfd-bg" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stop-color="#262a33" /><stop offset="100%" stop-color="#15171c" />
            </radialGradient>
            <radialGradient id="lfd-orb" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stop-color="#bcd0ff" /><stop offset="55%" stop-color="#4a7dff" /><stop offset="100%" stop-color="#16224a" />
            </radialGradient>
          </defs>
          <rect width="400" height="400" fill="url(#lfd-bg)" />
          <g>
            <circle cx="200" cy="200" r="120" fill="none" stroke="#4a7dff" stroke-width="3" stroke-dasharray="200 600" stroke-linecap="round" />
            <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="1.5s" repeatCount="indefinite" />
          </g>
          <g>
            <circle cx="200" cy="200" r="160" fill="none" stroke="#4a7dff" stroke-width="1" stroke-dasharray="60 600" opacity="0.6" />
            <animateTransform attributeName="transform" type="rotate" from="360 200 200" to="0 200 200" dur="2.4s" repeatCount="indefinite" />
          </g>
          <g transform="translate(200 200)">
            <circle cx="0" cy="0" r="50" fill="url(#lfd-orb)">
              <animate attributeName="r" values="48; 56; 48" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="-15" cy="-15" r="11" fill="#fff" opacity="0.25" />
          </g>
        </svg>
      }
      @case ('light') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <rect width="400" height="400" fill="#fbf9f4" />
          <g stroke="#e6e3da" stroke-width="0.8" opacity="0.6">
            <line x1="0" y1="60" x2="400" y2="60" /><line x1="0" y1="120" x2="400" y2="120" /><line x1="0" y1="180" x2="400" y2="180" />
            <line x1="0" y1="240" x2="400" y2="240" /><line x1="0" y1="300" x2="400" y2="300" /><line x1="0" y1="360" x2="400" y2="360" />
          </g>
          <circle cx="200" cy="200" r="120" fill="none" stroke="#111111" stroke-width="22" stroke-linecap="round" stroke-dasharray="680 720" transform="rotate(-30 200 200)">
            <animate attributeName="stroke-dashoffset" values="680; 0; 0; -680; -680" keyTimes="0; 0.4; 0.5; 0.9; 1" dur="3.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="262" cy="148" r="9" fill="#d6a300">
            <animate attributeName="r" values="9; 13; 9" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </svg>
      }
      @case ('retro') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <rect width="400" height="400" fill="#f5ecd9" />
          <g opacity="0.18" transform="translate(200 200)">
            @for (i of RAYS_24; track i) {
              <line x1="0" y1="-70" x2="0" y2="-160"
                    [attr.stroke]="i % 2 === 0 ? '#c84a2e' : '#4a6670'" stroke-width="3"
                    [attr.transform]="'rotate(' + (i * 15) + ')'" />
            }
          </g>
          <g>
            <line x1="200" y1="40" x2="200" y2="130" stroke="#c84a2e" stroke-width="8" stroke-linecap="square" />
            <line x1="200" y1="56" x2="200" y2="128" stroke="#4a6670" stroke-width="3" stroke-linecap="square" />
            <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="2.5s" repeatCount="indefinite" />
          </g>
          <circle cx="200" cy="200" r="56" fill="#c84a2e" />
          <circle cx="200" cy="200" r="32" fill="#f5ecd9" />
          <circle cx="200" cy="200" r="14" fill="#c84a2e">
            <animate attributeName="r" values="12; 16; 12" dur="1s" repeatCount="indefinite" />
          </circle>
        </svg>
      }
      @case ('cyberpunk') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <rect width="400" height="400" fill="#ecf043" />
          <g opacity="0.5">
            <rect x="0" y="80" width="400" height="4" fill="#6b1aaf">
              <animate attributeName="x" values="0; -20; 0" dur="0.6s" repeatCount="indefinite" />
            </rect>
            <rect x="0" y="200" width="400" height="2" fill="#6b1aaf">
              <animate attributeName="x" values="0; 30; 0" dur="0.4s" repeatCount="indefinite" />
            </rect>
            <rect x="0" y="316" width="400" height="6" fill="#6b1aaf">
              <animate attributeName="x" values="0; -15; 0" dur="0.5s" repeatCount="indefinite" />
            </rect>
          </g>
          <path [attr.d]="BOLT" fill="#6b1aaf">
            <animateTransform attributeName="transform" type="translate" values="8 0; -6 3; 12 -3; 8 0" keyTimes="0; 0.5; 0.6; 1" dur="1s" repeatCount="indefinite" />
          </path>
          <path [attr.d]="BOLT" fill="#d80027" stroke="#0a0a0a" stroke-width="3">
            <animate attributeName="opacity" values="1; 0.7; 1; 1" keyTimes="0; 0.5; 0.55; 1" dur="0.8s" repeatCount="indefinite" />
          </path>
        </svg>
      }
      @case ('corporate') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <rect width="400" height="400" fill="#f4f6f9" />
          <g stroke="#dfe5ed" stroke-width="1">
            <line x1="40" y1="120" x2="360" y2="120" />
            <line x1="40" y1="200" x2="360" y2="200" />
            <line x1="40" y1="280" x2="360" y2="280" />
          </g>
          <g fill="#0a2540">
            @for (b of CORP_BARS; track b.x) {
              <rect [attr.x]="b.x" y="100" width="40" height="220" style="transform-origin: bottom">
                <animateTransform attributeName="transform" type="scale" values="1 0; 1 1; 1 1; 1 0" keyTimes="0; 0.3; 0.7; 1" dur="2s" repeatCount="indefinite" [attr.begin]="b.delay + 's'" />
              </rect>
            }
          </g>
          <text x="40" y="368" font-family="sans-serif" font-size="11" fill="#5a6a7e" letter-spacing="0.18em">PROCESSING</text>
        </svg>
      }
      @case ('sakura') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <rect width="400" height="400" fill="#fbeaee" />
          <g stroke="#f5d5dc" stroke-width="1" opacity="0.6">
            <line x1="0" y1="80" x2="400" y2="80" /><line x1="0" y1="160" x2="400" y2="160" />
            <line x1="0" y1="240" x2="400" y2="240" /><line x1="0" y1="320" x2="400" y2="320" />
          </g>
          <g transform="translate(80 80)">
            <circle r="16" cx="0" cy="-17" fill="#c8265e" transform="rotate(0)" opacity="0.9" />
            <circle r="16" cx="0" cy="-17" fill="#c8265e" transform="rotate(72)" opacity="0.9" />
            <circle r="16" cx="0" cy="-17" fill="#c8265e" transform="rotate(144)" opacity="0.9" />
            <circle r="16" cx="0" cy="-17" fill="#c8265e" transform="rotate(216)" opacity="0.9" />
            <circle r="16" cx="0" cy="-17" fill="#c8265e" transform="rotate(288)" opacity="0.9" />
            <circle r="6" fill="#fff5f7" />
          </g>
          @for (p of SAKURA_PETALS; track p.x; let i = $index) {
            <g>
              <ellipse [attr.cx]="p.x" cy="-30" rx="8" ry="14" fill="#c8265e" opacity="0.85">
                <animateTransform attributeName="transform" type="translate" from="0 0" [attr.to]="(30 + i * 6) + ' 480'" [attr.dur]="p.d + 's'" repeatCount="indefinite" [attr.begin]="p.delay + 's'" />
                <animate attributeName="opacity" values="0; 0.85; 0.85; 0" keyTimes="0; 0.1; 0.9; 1" [attr.dur]="p.d + 's'" repeatCount="indefinite" [attr.begin]="p.delay + 's'" />
              </ellipse>
            </g>
          }
        </svg>
      }
      @case ('bauhaus') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <rect width="400" height="400" fill="#f3ead4" />
          <line x1="40" y1="200" x2="360" y2="200" stroke="#111" stroke-width="8" />
          <g>
            <circle cx="200" cy="120" r="36" fill="#d83b2e" />
            <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="3s" repeatCount="indefinite" />
          </g>
          <g>
            <polygon points="174,290 226,290 200,332" fill="#1d4ed8" />
            <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="-360 200 200" dur="3.6s" repeatCount="indefinite" />
          </g>
          <g>
            <rect x="70" y="180" width="40" height="40" fill="#f5c443" />
            <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="4.2s" repeatCount="indefinite" />
          </g>
        </svg>
      }
      @case ('dune') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <defs>
            <linearGradient id="lfdun-sky" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#f3d5b5" /><stop offset="55%" stop-color="#ecc4a0" /><stop offset="100%" stop-color="#d99a6c" />
            </linearGradient>
          </defs>
          <rect width="400" height="400" fill="url(#lfdun-sky)" />
          <circle cx="200" cy="180" r="60" fill="#1f2050">
            <animate attributeName="r" values="56; 68; 56" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx="200" cy="180" r="80" fill="none" stroke="#1f2050" stroke-width="1" opacity="0.4">
            <animate attributeName="r" values="74; 92; 74" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4; 0; 0.4" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <path d="M 0 285 Q 100 250 200 275 T 400 250 L 400 400 L 0 400 Z" fill="#b87545">
            <animate attributeName="d"
              values="M 0 285 Q 100 250 200 275 T 400 250 L 400 400 L 0 400 Z;
                      M 0 285 Q 100 265 200 285 T 400 260 L 400 400 L 0 400 Z;
                      M 0 285 Q 100 250 200 275 T 400 250 L 400 400 L 0 400 Z"
              dur="6s" repeatCount="indefinite" />
          </path>
          <path d="M 0 320 Q 130 290 220 312 T 400 290 L 400 400 L 0 400 Z" fill="#925a32" />
          <path d="M 0 358 Q 150 340 250 350 T 400 340 L 400 400 L 0 400 Z" fill="#5e3920" />
        </svg>
      }
      @case ('mint') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <rect width="400" height="400" fill="#e8f4ec" />
          <g stroke="#d6ecdc" stroke-width="0.8" opacity="0.6">
            <line x1="0" y1="80" x2="400" y2="80" /><line x1="0" y1="160" x2="400" y2="160" />
            <line x1="0" y1="240" x2="400" y2="240" /><line x1="0" y1="320" x2="400" y2="320" />
          </g>
          <line x1="200" y1="395" x2="200" y2="348" stroke="#0e4b2d" stroke-width="4" stroke-linecap="round" />
          <g class="lfmint-leaf">
            <path d="M 200 56 Q 332 128 332 200 Q 332 282 200 348 Q 68 282 68 200 Q 68 128 200 56 Z" fill="#1f7a4e" />
            <path d="M 200 76 Q 199 200 200 330" stroke="#0e4b2d" stroke-width="2.6" opacity="0.6" fill="none" stroke-linecap="round" />
            <g stroke="#0e4b2d" stroke-width="1.5" opacity="0.45" fill="none" stroke-linecap="round">
              <path d="M 200 108 Q 234 124 288 142" /><path d="M 200 108 Q 166 124 112 142" />
              <path d="M 200 158 Q 252 178 322 198" /><path d="M 200 158 Q 148 178 78 198" />
              <path d="M 200 218 Q 250 238 316 252" /><path d="M 200 218 Q 150 238 84 252" />
              <path d="M 200 274 Q 240 290 280 300" /><path d="M 200 274 Q 160 290 120 300" />
            </g>
          </g>
        </svg>
      }
      @case ('forest') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <rect width="400" height="400" fill="#1a241c" />
          <circle cx="200" cy="200" r="46" fill="#d4a017" opacity="0.7">
            <animate attributeName="opacity" values="0.5; 1; 0.5" dur="2s" repeatCount="indefinite" />
          </circle>
          @for (f of FIREFLIES; track $index) {
            <g>
              <circle [attr.cx]="200 + f.r" cy="200" [attr.r]="f.size" fill="#d4a017">
                <animate attributeName="opacity" values="0.3; 1; 0.3" dur="1.2s" repeatCount="indefinite" [attr.begin]="(-f.delay * 0.3) + 's'" />
              </circle>
              <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" [attr.dur]="f.dur + 's'" repeatCount="indefinite" [attr.begin]="f.delay + 's'" />
            </g>
          }
        </svg>
      }
      @case ('nord') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <defs>
            <linearGradient id="lfn-sky" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#2e3440" /><stop offset="100%" stop-color="#3b4252" />
            </linearGradient>
            <linearGradient id="lfn-aurora" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stop-color="#88c0d0" stop-opacity="0" />
              <stop offset="50%" stop-color="#88c0d0" stop-opacity="0.85" />
              <stop offset="100%" stop-color="#88c0d0" stop-opacity="0" />
            </linearGradient>
          </defs>
          <rect width="400" height="400" fill="url(#lfn-sky)" />
          <path fill="url(#lfn-aurora)">
            <animate attributeName="d"
              values="M -50 140 Q 100 110 200 130 T 460 120 L 460 220 Q 300 240 200 210 T -50 240 Z;
                      M -50 130 Q 100 160 200 130 T 460 150 L 460 240 Q 300 220 200 245 T -50 220 Z;
                      M -50 140 Q 100 110 200 130 T 460 120 L 460 220 Q 300 240 200 210 T -50 240 Z"
              dur="5s" repeatCount="indefinite" />
          </path>
          <g fill="#eceff4">
            <circle cx="80"  cy="50"  r="1.5"><animate attributeName="opacity" values="0.5;1;0.5" dur="3s"   repeatCount="indefinite" /></circle>
            <circle cx="320" cy="40"  r="1"><animate attributeName="opacity" values="1;0.5;1"   dur="3.6s" repeatCount="indefinite" /></circle>
            <circle cx="220" cy="60"  r="1.2"><animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" repeatCount="indefinite" /></circle>
            <circle cx="370" cy="120" r="1" />
            <circle cx="40"  cy="180" r="1" />
          </g>
          <polygon points="0,400 50,250 110,310 180,210 240,290 320,200 400,280 400,400" fill="#1a1f28" />
          <polygon points="0,400 70,330 130,360 200,300 260,340 330,290 400,330 400,400" fill="#262e3a" />
        </svg>
      }
      @case ('terminal') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <defs>
            <radialGradient id="lft-vignette" cx="50%" cy="50%" r="70%">
              <stop offset="55%" stop-color="#000" stop-opacity="0" />
              <stop offset="100%" stop-color="#000" stop-opacity="0.7" />
            </radialGradient>
          </defs>
          <rect width="400" height="400" fill="#000" />
          <g fill="#33ff66" opacity="0.05">
            @for (i of SCANLINES_100; track i) {
              <rect x="0" [attr.y]="i * 4" width="400" height="2" />
            }
          </g>
          <text x="24" y="36"  font-family="JetBrains Mono, ui-monospace, monospace" font-size="11" fill="#1f9a3d" letter-spacing="2">KOUJI&#64;UI · INIT</text>
          <text x="376" y="36" text-anchor="end" font-family="JetBrains Mono, ui-monospace, monospace" font-size="11" fill="#33ff66" font-weight="700" letter-spacing="2">BOOTING</text>
          <g font-family="JetBrains Mono, ui-monospace, monospace" font-size="15">
            @for (line of TERM_LINES; track line.y) {
              <text x="24" [attr.y]="line.y" [attr.fill]="line.cls === 'ok' ? '#33ff66' : '#1f9a3d'" opacity="0">
                {{ line.text }}
                <animate attributeName="opacity" values="0; 1; 1; 0" [attr.keyTimes]="'0; ' + (line.at / 4 + 0.05) + '; 0.93; 1'" dur="4s" repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="translate" values="0 4; 0 0; 0 0; 0 0" [attr.keyTimes]="'0; ' + (line.at / 4 + 0.05) + '; 0.93; 1'" dur="4s" repeatCount="indefinite" />
              </text>
            }
            <text x="24" y="312" fill="#33ff66" opacity="0">
              $&#160;
              <animate attributeName="opacity" values="0; 0; 1; 1; 0" keyTimes="0; 0.75; 0.78; 0.93; 1" dur="4s" repeatCount="indefinite" />
            </text>
            <rect x="40" y="298" width="11" height="18" fill="#33ff66">
              <animate attributeName="opacity" values="0; 0; 1; 0; 1; 0; 1; 1; 0" keyTimes="0; 0.75; 0.78; 0.82; 0.86; 0.90; 0.93; 0.95; 1" dur="4s" repeatCount="indefinite" />
            </rect>
          </g>
          <rect width="400" height="400" fill="url(#lft-vignette)" />
          <rect width="400" height="400" fill="#33ff66" opacity="0">
            <animate attributeName="opacity" values="0; 0.04; 0; 0; 0.02; 0" keyTimes="0; 0.02; 0.04; 0.5; 0.52; 1" dur="3.7s" repeatCount="indefinite" />
          </rect>
        </svg>
      }
    }
  `,
})
export class KjLoaderFigure {
  readonly themeId = input.required<Theme>();

  protected readonly RAYS_24 = Array.from({ length: 24 }, (_, i) => i);
  protected readonly BOLT = 'M 220 60 L 130 215 L 195 215 L 145 340 L 280 175 L 215 175 L 270 60 Z';
  protected readonly CORP_BARS: ReadonlyArray<{ x: number; delay: number }> = [
    { x: 80,  delay: 0   },
    { x: 130, delay: 0.1 },
    { x: 180, delay: 0.2 },
    { x: 230, delay: 0.3 },
    { x: 280, delay: 0.4 },
  ];
  protected readonly SAKURA_PETALS: ReadonlyArray<{ x: number; delay: number; d: number }> = [
    { x: 100, delay: 0,   d: 4.5 },
    { x: 170, delay: 0.8, d: 5.0 },
    { x: 240, delay: 0.4, d: 4.2 },
    { x: 300, delay: 1.6, d: 5.4 },
    { x: 360, delay: 2.4, d: 4.7 },
  ];
  protected readonly FIREFLIES: ReadonlyArray<{ r: number; dur: number; delay: number; size: number }> = [
    { r: 60,  dur: 3,   delay: 0,    size: 4   },
    { r: 60,  dur: 3,   delay: -1.5, size: 3   },
    { r: 100, dur: 4.6, delay: 0,    size: 3.5 },
    { r: 100, dur: 4.6, delay: -2.3, size: 3   },
    { r: 140, dur: 6.5, delay: -1,   size: 4   },
    { r: 140, dur: 6.5, delay: -4,   size: 2.5 },
  ];
  protected readonly SCANLINES_100 = Array.from({ length: 100 }, (_, i) => i);
  protected readonly TERM_LINES: ReadonlyArray<{ y: number; at: number; text: string; cls: 'ok' | 'dim' }> = [
    { y: 64,  at: 0.0, text: '$ kouji init',              cls: 'ok'  },
    { y: 92,  at: 0.4, text: '→ resolving 47 components', cls: 'dim' },
    { y: 120, at: 0.8, text: '→ resolving 13 themes',     cls: 'dim' },
    { y: 148, at: 1.2, text: '→ tokens.css …',            cls: 'dim' },
    { y: 176, at: 1.6, text: '✓ stylesheet · 12.4kb',     cls: 'ok'  },
    { y: 204, at: 2.0, text: '✓ runtime · 8.1kb',         cls: 'ok'  },
    { y: 232, at: 2.4, text: '✓ a11y · axe clean',        cls: 'ok'  },
    { y: 260, at: 2.8, text: '✓ ready in 2.1s',           cls: 'ok'  },
  ];
}
```

- [ ] **Step 2: Build to confirm**

Run: `pnpm exec ng build docs --configuration development`
Expected: success, no template errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/app/components/loading-screen/loader-figures.ts
git commit -m "feat(docs/loading-screen): add KjLoaderFigure with 13 per-theme SVG animations"
```

---

### Task 10: Update `LoadingScreenComponent` to render the per-theme figure

**Files:**
- Modify: `apps/docs/src/app/components/loading-screen/loading-screen.ts`
- Modify: `apps/docs/src/app/components/loading-screen/loading-screen.html`
- Modify: `apps/docs/src/app/components/loading-screen/loading-screen.css`

- [ ] **Step 1: Replace the component**

`apps/docs/src/app/components/loading-screen/loading-screen.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { KjLoaderFigure } from './loader-figures';

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

- [ ] **Step 2: Replace the template**

`apps/docs/src/app/components/loading-screen/loading-screen.html`:

```html
<div class="loading-screen" [attr.data-theme]="theme()">
  <div class="ls-stage">
    <div class="lf-figure-wrap">
      <kj-loader-figure [themeId]="theme()" />
    </div>
    <div class="lf-caption">
      <span class="lf-name">kouji/ui</span>
      <span class="lf-dot" aria-hidden="true"></span>
      <span class="lf-status">loading <em>{{ theme() }}</em> workspace</span>
      <span class="lf-dots" aria-hidden="true"><span></span><span></span><span></span></span>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Replace the styles**

`apps/docs/src/app/components/loading-screen/loading-screen.css`:

```css
.loading-screen {
  position: fixed;
  inset: 0;
  background: var(--kj-bg-body);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: ls-appear 0.3s ease-out forwards;
}

.ls-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.lf-figure-wrap {
  width: min(64vw, 320px);
  aspect-ratio: 1;
  position: relative;
  border-radius: 4px;
  overflow: hidden;
  animation: lf-figure-in 0.6s cubic-bezier(.34, 1.56, .64, 1) both;
}
.loader-fig-svg-wrap { width: 100%; height: 100%; display: block; }
.lf-svg { display: block; width: 100%; height: 100%; }

/* Caption row */
.lf-caption {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--kj-font-mono);
  font-size: clamp(10px, 1.4cqw, 12px);
  color: var(--kj-fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin-top: 4px;
}
.lf-name { color: var(--kj-fg-default); font-weight: 700; }
.lf-dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  background-color: var(--kj-bg-primary);
}
.lf-status em {
  font-style: normal;
  color: var(--kj-fg-primary);
  font-weight: 700;
}
.lf-dots {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: 2px;
}
.lf-dots span {
  width: 3px; height: 3px;
  border-radius: 50%;
  background-color: var(--kj-bg-primary);
  animation: lf-blink 1.2s ease-in-out infinite;
}
.lf-dots span:nth-child(2) { animation-delay: 0.2s; }
.lf-dots span:nth-child(3) { animation-delay: 0.4s; }

/* Mint leaf needs CSS for transform-origin-anchored grow/shrink */
.lfmint-leaf {
  transform-box: view-box;
  transform-origin: 200px 348px;
  animation: lfmint-unfurl 3s cubic-bezier(.4, 0, .2, 1) infinite;
}
@keyframes lfmint-unfurl {
  0%       { transform: scale(0.05); }
  35%, 70% { transform: scale(1); }
  100%     { transform: scale(0.05); }
}

@keyframes ls-appear {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes lf-figure-in {
  from { opacity: 0; transform: scale(.92); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes lf-blink {
  0%, 100% { opacity: 0.25; }
  50%      { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .loading-screen,
  .lf-figure-wrap,
  .lfmint-leaf,
  .lf-dots span,
  .loader-fig-svg-wrap * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **Step 4: Build**

Run: `pnpm exec ng build docs --configuration development`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/components/loading-screen/
git commit -m "feat(docs/loading-screen): swap splash to per-theme figure + caption row"
```

---

### Task 11: Verify per-theme splash + reduced motion + axe

**Files:**
- None (verification only).

- [ ] **Step 1: Stream the dev server**

Use the Monitor tool to start: `pnpm exec ng serve docs --port 4200`.

- [ ] **Step 2: Verify each theme renders its figure on first paint**

For each of the 13 themes, set `localStorage.kj-theme = '<theme>'` in DevTools and hard-refresh `http://localhost:4200/`. Confirm:

| Theme | Expected splash motion |
|-------|------------------------|
| kouji | three lime 工 strokes draw in then fade |
| dark | two blue rings counter-spin around a pulsing orb |
| light | black enso draws in, fades, redraws |
| retro | red ray sweeps the starburst |
| cyberpunk | jittery purple/red bolt + scanlines |
| corporate | five navy bars rise & fall |
| sakura | corner blossom + falling petals |
| bauhaus | red circle / blue triangle / yellow square orbit |
| dune | indigo sun pulses, dune ripples |
| mint | leaf unfurls from stem |
| forest | gold fireflies orbit a glow |
| nord | aurora morphs over mountains |
| terminal | streamed green log lines + CRT flicker |

- [ ] **Step 3: Verify reduced motion**

In DevTools → Rendering tab, emulate `prefers-reduced-motion: reduce`. Hard refresh. The splash should appear but all animations should be frozen on their first frame.

- [ ] **Step 4: Verify SSR pre-hydration matches**

Run: `pnpm exec ng build docs --configuration production` (uses prerender if configured) then preview the static HTML. Verify the splash markup renders with `kouji` as the default theme.

- [ ] **Step 5: Run axe on /roadmap**

In the browser at `/roadmap`, run axe-core via the browser extension or `await axe.run()` in console. Expect zero violations.

- [ ] **Step 6: Run all E2E tests one more time**

Run: `pnpm exec playwright test --reporter=list`
Expected: all tests pass (existing + new roadmap.spec).

- [ ] **Step 7: Final commit (if any verification fixes were needed)**

If any small CSS tweak was required during verification, commit it now with a descriptive message. Otherwise skip this step.

---

## Self-review checklist

- [x] **Spec coverage:** Every section of the design spec has corresponding tasks.
  - Roadmap route + lazy load → Task 2
  - Data file → Task 1
  - 4 sub-components (intro, toolbar, card, column) → Tasks 3, 4, 5, 6
  - Root state (signals + computed) → Task 4
  - CSS port with token mapping → Task 7
  - Navbar link → Task 2
  - A11y (aria-pressed, aria-expanded, progressbar, keyboard) → Tasks 4, 5
  - E2E verification → Task 8
  - `KjLoaderFigure` with 13 SVGs → Task 9
  - `LoadingScreenComponent` rewrite → Task 10
  - SSR / reduced-motion / axe verification → Task 11
- [x] **Placeholder scan:** No "TBD", "implement later", or vague steps. Every code step shows actual code.
- [x] **Type consistency:** `RoadmapItem`, `StatusId`, `CategoryId`, `SortMode`, `ColumnDef`, `CategoryDef` are defined once in Task 1 and referenced consistently in all later tasks. Method names (`toggleCat`, `toggleStatus`, `clearFilters`, `toggleExpand`, `setSort`) match between component and emitter outputs (`toggleCat` output → `toggleCat($event)` in template).
- [x] **File path consistency:** Every `Create:` / `Modify:` path matches what subsequent steps reference.
