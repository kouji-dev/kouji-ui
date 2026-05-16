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
