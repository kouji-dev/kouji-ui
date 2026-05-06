# Navigation Redesign

**Status:** Draft (2026-05-06)
**Owner:** kouji-ui
**Affects:** `apps/docs`

---

## 1. Goal

Replace the current single-panel drill-in sidebar with a two-surface model that keeps top-level docs sections always visible and slides a secondary panel in for hierarchical content. Add a persistent navbar across every page so the theme picker, search, and external links are reachable from the landing page too. Promote `/theme-generator` to its own surface with a layout tuned for live theme editing (token editor in a side panel, full-bleed preview in the main area).

The redesign resolves four problems with the current navigation:

1. The theme picker is locked inside `DocsSidebarComponent`, so it's unreachable from `/`.
2. The "Get started" CTA on landing routes to `/docs` (the index) instead of the actual setup page `/docs/getting-started`.
3. `/docs` and `/theme-generator` are siblings with no shared shell — visiting one loses the navigation context of the other.
4. The current sidebar swaps its entire contents when drilling into a track, so the user loses sight of sibling sections.

## 2. Scope

**In scope:**
- New persistent `NavbarComponent` with logo, primary links (Docs / Theme Generator), search trigger, version pill, GitHub & npm icons, theme picker.
- New `DocsSidebarComponent` (replaces current) with two-panel layout: persistent Column A (sections) + popout Column B (children of selected section).
- `/theme-generator` redesign: token editor moved out of main into a sidebar Column B; main becomes full-bleed live preview.
- Landing page (`/`) integrated under the new shell — navbar visible, no sidebar.
- Mobile drawer behavior for both sidebars.
- Keyboard / a11y contracts for the two-panel sidebar (full WCAG 2.1 AAA target per `rules/accessibility.md`).
- Playwright smoke test covering: landing → /docs/getting-started navigation; /docs Column B open/swap; /theme-generator Col A → Col B → preview update.

**Out of scope (deferred):**
- Search implementation changes (existing `SearchService` reused as-is, just relocated to navbar).
- New theme picker UI (existing `togglePicker` reused; wire to navbar icon instead of sidebar).
- `/theme-generator` URL params for sharing drafts (`/theme-generator/:slug`).
- Persistent "last visited /docs path" memory for the navbar's Docs link.
- New search overlay design — keep what's there.

## 3. Information Architecture

```
Surfaces                     URL                    Sidebar
────────────────────────────────────────────────────────────────
Landing                      /                      none
Docs index                   /docs                  Col A (highlights none)
Getting Started              /docs/getting-started   Col A (highlight GS)
Headless track index         /docs/headless          Col A + Col B (headless)
Headless item                /docs/headless/:slug    Col A + Col B (item active)
Components track index       /docs/components        Col A + Col B (components)
Components item              /docs/components/:slug  Col A + Col B (item active)
Theme Generator              /theme-generator        Col A (themes) + Col B (tokens)
```

**Three navigation levels max** (constraint enforced):
- L1: section in Col A (`Getting Started`, `Headless`, `Components`)
- L2: group header in Col B (visual only — no route, e.g. "Actions", "Data display")
- L3: leaf item in Col B (e.g. `Button`, `Card`)

Groups (L2) are visual subdivisions inside a track, not navigable nodes. The drill stops at L3.

## 4. Architecture & Components

### 4.1 Component tree

```
AppRoot
├── NavbarComponent  (new — always visible)
└── <router-outlet>
    ├── HomeComponent              → /
    ├── DocsShellComponent  (new)  → /docs/**
    │   ├── DocsSidebarComponent  (rewritten — two-panel)
    │   └── <router-outlet>  → DocsIndex / GettingStarted / TrackIndex / ComponentDoc
    └── ThemeGeneratorShellComponent  (new)  → /theme-generator
        ├── ThemeGeneratorSidebarComponent  (new — Col A: themes, Col B: tokens)
        └── ThemeGeneratorPreviewComponent  (existing — promoted to main area)
```

The current `theme-generator.html` mixes a `<aside>` containing `<kj-docs-sidebar>` with the controls panel and preview. This gets split: shell owns layout; sidebar component owns Cols A+B; preview component owns the main area.

### 4.2 NavbarComponent

**Responsibility:** persistent top bar; nothing route-specific.

**Slots (left → right):**
- Logo → `/`
- `Docs` link → `/docs`
- `Theme Generator` link → `/theme-generator` (loads last-used draft from `ThemeDraftService` on click; new visit gets a fresh fork)
- (flex spacer)
- Search trigger pill — labels "Search docs", `⌘K` kbd hint, opens existing `SearchService.open()`
- Version pill — reads from `@kouji-ui/core` `package.json` at build time (Angular `import.meta.env`-style or static asset)
- GitHub icon → external link to repo
- npm icon → external link to `@kouji-ui/core` package
- Theme picker icon → opens existing `togglePicker()` UI (relocated from sidebar)

**Active state:** `routerLinkActive` highlights `Docs` / `Theme Generator` based on route prefix.

**Mobile (< 768px):** logo + hamburger + theme picker icon stay; search + version + GitHub + npm collapse into a "more" overflow menu.

### 4.3 DocsSidebarComponent (rewritten)

**Layout:** two columns side by side. Col A always rendered; Col B conditionally rendered when the active section has children.

**Col A (left, ~200px):**
- Header label "Docs"
- Three rows: `Getting Started` (leaf), `Headless` (parent), `Components` (parent)
- Each row: icon + label + `›` chevron when has children
- Active row highlighted (matches current route prefix)
- Click behavior:
  - Leaf row → navigate to that route (e.g. `/docs/getting-started`); Col B stays closed
  - Parent row → navigate to track index (e.g. `/docs/headless`); Col B opens with that track's tree

**Col B (right of A, ~280px):**
- Renders the selected track's `SidebarNode[]` from `DocsService`
- Group headers (uppercase, muted) for each `SidebarNode.label`
- Item rows under each group; click → navigate to `/docs/{track}/{slug}`
- Active item highlighted
- Slide-in animation when opening (translateX + fade, 180ms ease-out)

**State derivation (signals):**
- `activeSection: computed<'getting-started' | 'headless' | 'components' | null>` — derived from URL
- `colBOpen: computed<boolean>` — `activeSection !== null && activeSection !== 'getting-started'`
- `colBTree: computed<SidebarNode[] | null>` — track tree from `DocsService`
- All three driven by `Router.events` filtered to `NavigationEnd`

**Removed from current sidebar:**
- View-machine state (`'top' | 'docs' | 'generator' | track-id`) — replaced by the URL-driven derivation above
- `localStorage` persistence of view (`VIEW_STORAGE_KEY`) — URL is the source of truth
- Theme picker UI — relocated to `NavbarComponent`
- Theme generator section (built-in + saved themes) — moved to `ThemeGeneratorSidebarComponent`

### 4.4 ThemeGeneratorSidebarComponent (new)

**Layout:** two columns matching docs visually.

**Col A (~200px) — themes list:**
- Group header "Built-in"
- Five rows (one per `BUILT_IN_NAMES`), each with a 16×16 swatch (gradient of primary + accent) + name
- Group header "My themes"
- N rows from `ThemeDraftService.list()`, swatch + name + delete affordance (existing `onDeleteSaved` flow)
- "+ New theme" CTA at bottom (existing `onNewTheme`)
- Active row highlighted = currently loaded draft

**Col A click behavior:**
- Built-in row → `draftService.loadFork(name)` (auto-fork — chosen during brainstorming)
- My-themes row → `draftService.loadSaved(name)`
- "+ New" → `draftService.loadFork('light')` then `setName('')`

**Col B (~280px) — token editor:**
- Replaces the current `<section class="generator-body">` `<details>` accordion
- Same content (Colors, Derived, Spacing, Radii, Fonts, Motion sections) — just relocated
- Each section is collapsible (`<details>` retained); first section open by default
- Each control (color swatch, input, slider) is wired to the same `draftService` mutation methods that exist today

**Main area:**
- Action bar at top: name input + Reset · Save · Copy CSS · Export JSON · Download .css buttons (existing markup, just relocated)
- Below: full-bleed `ThemeGeneratorPreviewComponent` (existing, takes remaining height)
- Live preview updates the moment a Col B token changes (no separate apply step)

### 4.5 Shells (DocsShellComponent, ThemeGeneratorShellComponent)

Thin layout components. Each renders its sidebar + a `<router-outlet>` (or content slot) inside a CSS grid (sidebar fixed-width, main flex-1). Navbar lives at the app root, not inside the shells.

Why two shells instead of one shared one: the docs sidebar and theme-generator sidebar have different Col B contents and different click semantics (navigate vs. mutate draft). A shared shell would need a discriminated union; two shells are simpler and the duplication is ~30 lines of layout CSS.

## 5. Routes

```ts
export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent) },
  {
    path: 'docs',
    loadComponent: () => import('./shells/docs-shell/docs-shell').then(m => m.DocsShellComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/docs-index/docs-index').then(m => m.DocsIndexComponent) },
      { path: 'getting-started', loadComponent: () => import('./pages/getting-started/getting-started').then(m => m.GettingStartedComponent) },
      { path: 'headless', loadComponent: () => import('./pages/track-index/track-index').then(m => m.TrackIndexComponent), data: { trackId: 'headless' } },
      { path: 'components', loadComponent: () => import('./pages/track-index/track-index').then(m => m.TrackIndexComponent), data: { trackId: 'components' } },
      { path: 'headless/:slug', loadComponent: () => import('./pages/component-doc/component-doc').then(m => m.ComponentDocComponent) },
      { path: 'components/:slug', loadComponent: () => import('./pages/component-doc/component-doc').then(m => m.ComponentDocComponent) },
    ],
  },
  {
    path: 'theme-generator',
    loadComponent: () => import('./shells/theme-generator-shell/theme-generator-shell').then(m => m.ThemeGeneratorShellComponent),
  },
  { path: '**', redirectTo: '' },
];
```

URLs are unchanged from today — the shell components wrap them via children. No breaking changes to existing `routerLink`s in markdown content.

## 6. Mobile Behavior (< 768px)

**Navbar:** logo · hamburger · theme picker. Hamburger toggles a drawer. Search + version + GitHub + npm collapse into a "more" overflow menu inside the drawer or after a `…` button — exact placement decided during implementation.

**/docs drawer:** off-canvas, full-height. Two-stage drill:
- Stage 1 (default open): Col A entries
- Tap parent with children → drawer content swaps to Col B with a `← Docs` back row at top
- Tap leaf → navigate, drawer closes
- Body scroll locked while open (existing pattern preserved)

**/theme-generator drawer:** the desktop's two columns become a tabbed drawer:
- Tabs: `Themes` (Col A list) | `Tokens` (Col B editor)
- Tap a theme on `Themes` tab → loads it, drawer stays open on `Themes` tab; user can switch to `Tokens` to edit
- Drawer closes on backdrop tap or `Esc`

## 7. Theme Picker

Relocates intact from the current sidebar to the navbar. A floating dropdown anchored to the picker icon, listing named themes with swatch previews (existing markup). Closes on outside click or `Esc`. No design change here.

## 8. Search

Existing `SearchService.open()` opens the search overlay. The trigger pill in the navbar fires it; `⌘K` / `Ctrl+K` keyboard shortcut continues to work. No internals change.

## 9. Accessibility

Per `rules/accessibility.md` (target WCAG 2.1 AAA):

- **Navbar:** `role="navigation"`, `aria-label="Primary"`. Active link uses `aria-current="page"`. Theme picker dropdown wired with `aria-expanded`, `aria-haspopup="menu"`, focus trap inside dropdown, `Esc` closes.
- **Col A (docs):** `role="navigation"`, `aria-label="Documentation sections"`. Each row uses `aria-current="page"` when active. Rows with children: `aria-expanded` reflecting Col B open state, `aria-controls` pointing to Col B's id.
- **Col B (docs):** `role="navigation"`, `aria-label="<active section> items"`. Active item gets `aria-current="page"`.
- **Keyboard:** Tab order = navbar → Col A → Col B → main. Arrow keys within Col A/B move focus between sibling rows (no roving tabindex needed for vertical lists; native focus order works). `Esc` on mobile drawer closes it.
- **Live preview (theme-generator):** Token edits change visual styling but do not affect a11y semantics. Color contrast warnings (existing) stay.

## 10. Migration

The change touches `apps/docs` only — no library packages affected.

**File-level diff plan:**
- New: `apps/docs/src/app/components/navbar/{navbar.ts,html,css}`
- New: `apps/docs/src/app/shells/docs-shell/{docs-shell.ts,html,css}`
- New: `apps/docs/src/app/shells/theme-generator-shell/{theme-generator-shell.ts,html,css}`
- Rewritten: `apps/docs/src/app/components/docs-sidebar/{docs-sidebar.ts,html,css}` (two-panel)
- New: `apps/docs/src/app/components/theme-generator-sidebar/{theme-generator-sidebar.ts,html,css}` (extracted from existing theme-generator)
- Modified: `apps/docs/src/app/pages/theme-generator/theme-generator.{ts,html,css}` — controls panel removed; component becomes preview-only
- Modified: `apps/docs/src/app/app.routes.ts` — wrap `/docs` and `/theme-generator` in shell components
- Modified: `apps/docs/src/app/app.ts` (or wherever the root template lives) — render `<kj-navbar>` above `<router-outlet>`
- Modified: `apps/docs/src/app/pages/home/home.html` — primary CTA `routerLink` from `/docs` to `/docs/getting-started`

**Existing components reused unchanged:** `SearchService`, `ThemeService`, `ThemeDraftService`, `DocsService`, `ThemeGeneratorPreviewComponent`, all `kj-*` library components.

## 11. Testing

**E2E (Playwright):**
- Smoke: load `/`, click `Docs` in navbar, land on `/docs`. Click `Components` in Col A, expect URL `/docs/components` and Col B open with a known item visible. Click that item, expect URL update and main content render.
- Theme picker reachability: load `/`, open theme picker dropdown from navbar, switch to `dark`, expect `<html data-theme="dark">`.
- Theme generator live update: load `/theme-generator`, click a built-in theme in Col A, change a primary color via Col B, expect preview component's computed style for `--kj-color-primary` to match.

**Unit:** existing service tests untouched. New component tests for `NavbarComponent` (active link state) and `DocsSidebarComponent` (Col B open/closed derivation from URL). No new tests needed for theme-generator preview (component unchanged).

**Visual regression:** out of scope — no harness in the repo. Manual smoke during implementation.

## 12. Open Questions / Future Work

- **Last-visited /docs path memory:** the navbar's `Docs` link goes to `/docs` (index). Could route to last visited `/docs/*` via session memory. Deferred — not worth the complexity in v1.
- **Theme draft URL params:** `/theme-generator/:slug` for shareable drafts. Out of scope.
- **Mobile theme-generator drawer shape:** tabs vs. stacked sections. Decide during implementation.
- **Version pill source:** read from `@kouji-ui/core/package.json` at build time. Implementation detail — pick during build setup.

---

**Approval gate:** This spec needs user approval before moving to a writing-plans pass.
