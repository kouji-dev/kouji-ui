# Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single-shell drill-in sidebar with a persistent navbar (theme picker reachable on landing) + an angular.dev-style two-panel `/docs` sidebar (Col A always visible, Col B popout for children) + an Option-C `/theme-generator` (token editor in Col B, full-bleed live preview in main).

**Architecture:** New `NavbarComponent` mounted at app root; new `DocsShellComponent` and `ThemeGeneratorShellComponent` wrap their child routes; the existing `DocsSidebarComponent` is rewritten as a two-panel component driven by URL-derived signals; the existing controls panel in `theme-generator.html` is extracted into a new `ThemeGeneratorSidebarComponent`. Routes stay flat — only the wrapping changes. Spec: `docs/superpowers/specs/2026-05-06-navigation-redesign-design.md`.

**Tech Stack:** Angular 21 (standalone components, signals, control-flow `@if`/`@for`, `inject()`), Angular Router with nested routes, Vitest + `@testing-library/angular` for unit tests, Playwright for E2E. Existing services reused: `SearchService`, `ThemeService`, `ThemeDraftService`, `DocsService`.

---

## File Structure

**Created:**
- `apps/docs/src/app/components/navbar/navbar.ts` (component)
- `apps/docs/src/app/components/navbar/navbar.html` (template)
- `apps/docs/src/app/components/navbar/navbar.css` (styles)
- `apps/docs/src/app/components/navbar/navbar.spec.ts` (unit tests)
- `apps/docs/src/app/shells/docs-shell/docs-shell.ts`
- `apps/docs/src/app/shells/docs-shell/docs-shell.html`
- `apps/docs/src/app/shells/docs-shell/docs-shell.css`
- `apps/docs/src/app/shells/theme-generator-shell/theme-generator-shell.ts`
- `apps/docs/src/app/shells/theme-generator-shell/theme-generator-shell.html`
- `apps/docs/src/app/shells/theme-generator-shell/theme-generator-shell.css`
- `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.ts`
- `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.html`
- `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.css`
- `apps/docs/e2e/nav.spec.ts` (E2E for navbar + landing CTA)
- `apps/docs/e2e/docs-sidebar.spec.ts` (E2E for two-panel sidebar)
- `apps/docs/e2e/theme-generator.spec.ts` (E2E for theme-generator surface)

**Rewritten:**
- `apps/docs/src/app/components/docs-sidebar/docs-sidebar.ts` (new two-panel logic, URL-driven)
- `apps/docs/src/app/components/docs-sidebar/docs-sidebar.html` (new markup: Col A + Col B)
- `apps/docs/src/app/components/docs-sidebar/docs-sidebar.css` (new styles)
- `apps/docs/src/app/components/docs-sidebar/docs-sidebar.spec.ts` (new tests for URL→state derivations)

**Modified:**
- `apps/docs/src/app/app.ts` (mount `<kj-navbar>` above `<router-outlet>`)
- `apps/docs/src/app/app.routes.ts` (wrap `/docs` and `/theme-generator` in shell components)
- `apps/docs/src/app/pages/home/home.html` (CTA → `/docs/getting-started`; remove inline nav now that navbar is global)
- `apps/docs/src/app/pages/home/home.css` (drop styles for the removed inline nav)
- `apps/docs/src/app/pages/theme-generator/theme-generator.ts` (remove controls panel logic; keep preview wiring)
- `apps/docs/src/app/pages/theme-generator/theme-generator.html` (remove controls + sidebar import; keep action bar + preview)
- `apps/docs/src/app/pages/theme-generator/theme-generator.css` (drop styles for removed controls)

**Reused unchanged:** `SearchService`, `ThemeService`, `ThemeDraftService`, `DocsService`, `BUILT_IN_NAMES`, `ThemeGeneratorPreviewComponent`, all `kj-*` library components.

---

## Task 1: NavbarComponent

**Files:**
- Create: `apps/docs/src/app/components/navbar/navbar.ts`
- Create: `apps/docs/src/app/components/navbar/navbar.html`
- Create: `apps/docs/src/app/components/navbar/navbar.css`
- Test: `apps/docs/src/app/components/navbar/navbar.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/docs/src/app/components/navbar/navbar.spec.ts`:

```ts
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, beforeEach } from 'vitest';
import { NavbarComponent } from './navbar';
import { ThemeService } from '../../services/theme.service';
import { SearchService } from '../search/search.service';

describe('NavbarComponent', () => {
  test('renders Docs and Theme Generator links', async () => {
    await render(NavbarComponent, { providers: [provideRouter([])] });
    expect(screen.getByRole('link', { name: /docs/i })).toHaveAttribute('href', '/docs');
    expect(screen.getByRole('link', { name: /theme generator/i })).toHaveAttribute('href', '/theme-generator');
  });

  test('search trigger button opens SearchService', async () => {
    let opened = false;
    class StubSearch { open() { opened = true; } }
    await render(NavbarComponent, {
      providers: [provideRouter([]), { provide: SearchService, useClass: StubSearch }],
    });
    await userEvent.click(screen.getByRole('button', { name: /search docs/i }));
    expect(opened).toBe(true);
  });

  test('theme picker button toggles aria-expanded', async () => {
    await render(NavbarComponent, { providers: [provideRouter([])] });
    const trigger = screen.getByRole('button', { name: /current theme:/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter docs test --run navbar.spec`
Expected: FAIL — `Cannot find module './navbar'`

- [ ] **Step 3: Create the component**

Create `apps/docs/src/app/components/navbar/navbar.ts`:

```ts
import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SearchService } from '../search/search.service';
import { ThemeService, AVAILABLE_THEMES, Theme } from '../../services/theme.service';

@Component({
  selector: 'kj-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private readonly search = inject(SearchService);
  private readonly themeService = inject(ThemeService);

  protected readonly themes = AVAILABLE_THEMES;
  protected readonly currentTheme = computed(() => this.themeService.theme());
  protected readonly pickerOpen = signal(false);

  protected readonly version = '0.0.4';
  protected readonly githubUrl = 'https://github.com/kouji-dev/kouji-ui';
  protected readonly npmUrl = 'https://www.npmjs.com/package/@kouji-ui/core';

  protected openSearch(): void { this.search.open(); }
  protected togglePicker(): void { this.pickerOpen.update(v => !v); }
  protected closePicker(): void { this.pickerOpen.set(false); }
  protected selectTheme(t: Theme): void { this.themeService.set(t); this.closePicker(); }
}
```

Create `apps/docs/src/app/components/navbar/navbar.html`:

```html
<nav class="kj-navbar" role="navigation" aria-label="Primary">
  <a routerLink="/" class="kj-navbar-logo" aria-label="kouji home">
    <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
      <line x1="10" y1="10" x2="10" y2="54" stroke="#b8f500" stroke-width="6" stroke-linecap="round"/>
      <line x1="10" y1="32" x2="34" y2="10" stroke="#b8f500" stroke-width="6" stroke-linecap="round"/>
      <line x1="10" y1="32" x2="34" y2="54" stroke="#b8f500" stroke-width="6" stroke-linecap="round"/>
      <path d="M50 24 L50 48 Q50 56 42 56 Q38 56 36 54" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <circle cx="50" cy="14" r="4" fill="currentColor"/>
    </svg>
    <span class="kj-navbar-brand">kouji</span>
  </a>

  <a routerLink="/docs" routerLinkActive="active" class="kj-navbar-link">Docs</a>
  <a routerLink="/theme-generator" routerLinkActive="active" class="kj-navbar-link">Theme Generator</a>

  <span class="kj-navbar-spacer"></span>

  <button type="button" class="kj-navbar-search" (click)="openSearch()" aria-label="Search docs">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <span>Search docs</span>
    <kbd>⌘K</kbd>
  </button>

  <span class="kj-navbar-version" aria-label="Library version">v{{ version }}</span>

  <a [href]="githubUrl" target="_blank" rel="noopener" class="kj-navbar-icon" aria-label="GitHub repository">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
  </a>

  <a [href]="npmUrl" target="_blank" rel="noopener" class="kj-navbar-icon" aria-label="npm package">
    <svg width="18" height="18" viewBox="0 0 18 7" fill="currentColor"><path d="M0 0h18v6H9v1H5V6H0V0zm1 5h2V2h1v3h1V1H1v4zm5-4v5h2V5h2V1H6zm2 1h1v2H8V2zm3-1v4h2V2h1v3h1V2h1v3h1V1h-6z"/></svg>
  </a>

  <div class="kj-navbar-theme">
    <button
      type="button"
      class="kj-navbar-theme-trigger"
      [attr.aria-label]="'Current theme: ' + currentTheme() + '. Click to change.'"
      [attr.aria-haspopup]="'listbox'"
      [attr.aria-expanded]="pickerOpen()"
      (click)="togglePicker()"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      </svg>
      <span>{{ currentTheme() }}</span>
    </button>
    @if (pickerOpen()) {
      <ul class="kj-navbar-theme-list" role="listbox" aria-label="Theme">
        @for (t of themes; track t) {
          <li
            role="option"
            tabindex="0"
            class="kj-navbar-theme-option"
            [class.active]="t === currentTheme()"
            [attr.aria-selected]="t === currentTheme()"
            (click)="selectTheme(t)"
            (keydown.enter)="selectTheme(t)"
            (keydown.space)="$event.preventDefault(); selectTheme(t)"
          >{{ t }}</li>
        }
      </ul>
    }
  </div>
</nav>
```

Create `apps/docs/src/app/components/navbar/navbar.css`:

```css
:host { display: contents; }

.kj-navbar {
  display: flex;
  align-items: center;
  gap: var(--kj-space-md, 12px);
  height: 56px;
  padding: 0 var(--kj-space-xl, 24px);
  background: var(--kj-color-base-100);
  border-bottom: 1px solid var(--kj-color-base-300);
  position: sticky;
  top: 0;
  z-index: 50;
}

.kj-navbar-logo {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--kj-color-base-content);
  text-decoration: none;
}
.kj-navbar-brand {
  font-weight: 800;
  font-size: 16px;
  letter-spacing: -0.5px;
}

.kj-navbar-link {
  padding: 6px 10px;
  border-radius: 6px;
  color: var(--kj-color-base-content);
  font-size: 13px;
  text-decoration: none;
}
.kj-navbar-link:hover { background: var(--kj-color-base-200); }
.kj-navbar-link.active {
  background: color-mix(in oklch, var(--kj-color-primary) 12%, transparent);
  color: var(--kj-color-primary);
}

.kj-navbar-spacer { flex: 1; }

.kj-navbar-search {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px 5px 10px;
  background: var(--kj-color-base-200);
  border: 1px solid var(--kj-color-base-300);
  border-radius: 6px;
  color: var(--kj-color-base-content);
  font-size: 12px;
  cursor: pointer;
  min-width: 180px;
}
.kj-navbar-search kbd {
  margin-left: auto;
  background: var(--kj-color-base-300);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
  font-family: var(--kj-font-mono, monospace);
}

.kj-navbar-version {
  display: inline-flex;
  align-items: center;
  background: var(--kj-color-base-200);
  border: 1px solid var(--kj-color-base-300);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11px;
  color: var(--kj-color-primary);
  font-family: var(--kj-font-mono, monospace);
}

.kj-navbar-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: var(--kj-color-base-content);
  text-decoration: none;
}
.kj-navbar-icon:hover { background: var(--kj-color-base-200); }

.kj-navbar-theme { position: relative; }
.kj-navbar-theme-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--kj-color-base-content);
  font-size: 12px;
  cursor: pointer;
}
.kj-navbar-theme-trigger:hover { background: var(--kj-color-base-200); border-color: var(--kj-color-base-300); }

.kj-navbar-theme-list {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 180px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--kj-color-base-100);
  border: 1px solid var(--kj-color-base-300);
  border-radius: 8px;
  padding: 4px;
  margin: 0;
  list-style: none;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  z-index: 60;
}
.kj-navbar-theme-option {
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  color: var(--kj-color-base-content);
}
.kj-navbar-theme-option:hover { background: var(--kj-color-base-200); }
.kj-navbar-theme-option.active {
  background: color-mix(in oklch, var(--kj-color-primary) 14%, transparent);
  color: var(--kj-color-primary);
  font-weight: 500;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter docs test --run navbar.spec`
Expected: PASS — 3 tests pass.

- [ ] **Step 5: Lint**

Run: `pnpm --filter docs lint`
Expected: All files pass linting.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/app/components/navbar/
git commit -m "feat(docs): add NavbarComponent (logo, links, search, theme picker, version, github, npm)"
```

---

## Task 2: Mount Navbar globally + fix landing CTA

**Files:**
- Modify: `apps/docs/src/app/app.ts`
- Modify: `apps/docs/src/app/pages/home/home.html`
- Modify: `apps/docs/src/app/pages/home/home.css` (remove styles for inline nav)
- Test: `apps/docs/e2e/nav.spec.ts` (new)

- [ ] **Step 1: Write the failing E2E**

Create `apps/docs/e2e/nav.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('navbar visible on landing and links work', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await expect(page.getByRole('link', { name: /^docs$/i })).toHaveAttribute('href', '/docs');
  await expect(page.getByRole('link', { name: /theme generator/i })).toHaveAttribute('href', '/theme-generator');
});

test('Get started CTA navigates to /docs/getting-started', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /get started/i }).click();
  await expect(page).toHaveURL(/\/docs\/getting-started$/);
});

test('navbar persists across landing → docs → theme-generator', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /^docs$/i }).first().click();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await page.getByRole('link', { name: /theme generator/i }).first().click();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
});
```

- [ ] **Step 2: Run E2E to verify failure**

Run: `pnpm test:e2e -- nav.spec`
Expected: FAIL — `getByRole('navigation', { name: 'Primary' })` resolves to multiple elements (existing landing has its own `<nav>`) or fails to find the CTA target.

- [ ] **Step 3: Mount the navbar at app root**

Modify `apps/docs/src/app/app.ts`:

```ts
import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingScreenComponent } from './components/loading-screen/loading-screen';
import { LoadingService } from './services/loading.service';
import { SearchComponent } from './components/search/search.component';
import { ThemeService } from './services/theme.service';
import { NavbarComponent } from './components/navbar/navbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoadingScreenComponent, SearchComponent, NavbarComponent],
  template: `
    @if (loading.isLoading()) {
      <kj-loading-screen />
    }
    <div class="app-shell" [class.content-hidden]="loading.isLoading()">
      <kj-navbar />
      <router-outlet />
    </div>
    <kj-search />
  `,
  styles: [`
    .content-hidden { visibility: hidden; }
    .app-shell { display: flex; flex-direction: column; min-height: 100dvh; }
  `],
})
export class App implements OnInit {
  protected readonly loading = inject(LoadingService);
  private readonly themeService = inject(ThemeService);

  ngOnInit(): void {
    setTimeout(() => this.loading.hide(), 1600);
  }
}
```

- [ ] **Step 4: Update home page CTA + drop the inline nav**

Read current `apps/docs/src/app/pages/home/home.html` first to find the exact `<nav>` block and CTA `routerLink`. Make two edits:

1. **Remove the inline `<nav>` block** at the top of the file (it duplicates the global navbar). Keep everything else (hero, CTA buttons).
2. **Change the primary CTA** `routerLink="/docs"` to `routerLink="/docs/getting-started"`.
3. **Add a secondary "Try theme generator" CTA** below or beside the primary, with `routerLink="/theme-generator"`. Match the visual treatment of the existing primary CTA but use `<kj-button variant="outline" size="lg">`.

Then in `apps/docs/src/app/pages/home/home.css`, delete any selectors scoped to the removed `<nav>` (e.g. `.nav-logo-link`, `nav { ... }`) so the file doesn't accumulate dead CSS.

- [ ] **Step 5: Run E2E to verify pass**

Run: `pnpm test:e2e -- nav.spec`
Expected: PASS — 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/app/app.ts apps/docs/src/app/pages/home/ apps/docs/e2e/nav.spec.ts
git commit -m "feat(docs): mount global navbar; landing CTA → /docs/getting-started"
```

---

## Task 3: DocsShellComponent + new DocsSidebar (Col A only)

**Files:**
- Create: `apps/docs/src/app/shells/docs-shell/docs-shell.{ts,html,css}`
- Rewrite: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.{ts,html,css,spec.ts}`
- Test: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.spec.ts` (rewrite)

This task replaces the current single-panel drill sidebar with a new component that renders Col A only (no children popout yet — added in Task 4). The shell wraps `/docs` children.

- [ ] **Step 1: Rewrite the unit tests**

Replace `apps/docs/src/app/components/docs-sidebar/docs-sidebar.spec.ts` with:

```ts
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { DocsSidebarComponent } from './docs-sidebar';

@Component({ standalone: true, template: '' })
class StubPage {}

const stubRoutes = [
  { path: 'docs', component: StubPage },
  { path: 'docs/getting-started', component: StubPage },
  { path: 'docs/headless', component: StubPage },
  { path: 'docs/components', component: StubPage },
];

describe('DocsSidebarComponent — Column A', () => {
  test('renders all three top-level rows', async () => {
    await render(DocsSidebarComponent, { providers: [provideRouter(stubRoutes)] });
    expect(screen.getByRole('link', { name: /getting started/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /headless/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /components/i })).toBeInTheDocument();
  });

  test('marks Headless as active when URL matches', async () => {
    const { fixture } = await render(DocsSidebarComponent, { providers: [provideRouter(stubRoutes)] });
    const router = fixture.debugElement.injector.get(Router);
    await router.navigateByUrl('/docs/headless');
    fixture.detectChanges();
    expect(screen.getByRole('link', { name: /headless/i })).toHaveAttribute('aria-current', 'page');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter docs test --run docs-sidebar.spec`
Expected: FAIL — old component doesn't expose this contract.

- [ ] **Step 3: Rewrite `docs-sidebar.ts`**

Replace `apps/docs/src/app/components/docs-sidebar/docs-sidebar.ts`:

```ts
import { Component, ChangeDetectionStrategy, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, startWith } from 'rxjs/operators';
import { DocsService, SidebarNode } from '../../services/docs.service';

export type DocsSection = 'getting-started' | 'headless' | 'components' | null;

interface ColARow {
  id: Exclude<DocsSection, null>;
  label: string;
  href: string;
  hasChildren: boolean;
}

@Component({
  selector: 'kj-docs-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './docs-sidebar.html',
  styleUrl: './docs-sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsSidebarComponent {
  private readonly router = inject(Router);
  private readonly docs = inject(DocsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly url = signal<string>(this.router.url);

  protected readonly rows: ColARow[] = [
    { id: 'getting-started', label: 'Getting Started', href: '/docs/getting-started', hasChildren: false },
    { id: 'headless',        label: 'Headless',        href: '/docs/headless',        hasChildren: true },
    { id: 'components',      label: 'Components',      href: '/docs/components',      hasChildren: true },
  ];

  protected readonly activeSection = computed<DocsSection>(() => {
    const u = this.url();
    if (u.startsWith('/docs/getting-started')) return 'getting-started';
    if (u.startsWith('/docs/headless')) return 'headless';
    if (u.startsWith('/docs/components')) return 'components';
    return null;
  });

  /** Column B is rendered when an active section has children. (Implemented in Task 4.) */
  protected readonly colBOpen = computed(() => {
    const s = this.activeSection();
    return s === 'headless' || s === 'components';
  });

  protected readonly colBTree = computed<SidebarNode[]>(() => {
    const s = this.activeSection();
    if (s !== 'headless' && s !== 'components') return [];
    const track = this.docs.getTracks().find(t => t.id === s);
    return track?.tree ?? [];
  });

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), startWith(null), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.url.set(this.router.url));
    this.docs.loadManifest().subscribe();
  }
}
```

- [ ] **Step 4: Rewrite `docs-sidebar.html` (Col A only — Col B added in Task 4)**

Replace `apps/docs/src/app/components/docs-sidebar/docs-sidebar.html`:

```html
<aside class="kj-docs-sidebar">
  <nav class="col-a" role="navigation" aria-label="Documentation sections">
    <p class="col-label">Docs</p>
    @for (row of rows; track row.id) {
      <a
        [routerLink]="row.href"
        class="col-a-row"
        [class.active]="activeSection() === row.id"
        [attr.aria-current]="activeSection() === row.id ? 'page' : null"
      >
        <span class="col-a-label">{{ row.label }}</span>
        @if (row.hasChildren) { <span class="col-a-chev" aria-hidden="true">›</span> }
      </a>
    }
  </nav>
</aside>
```

- [ ] **Step 5: Rewrite `docs-sidebar.css` (Col A styles only — Col B added in Task 4)**

Replace `apps/docs/src/app/components/docs-sidebar/docs-sidebar.css`:

```css
:host { display: contents; }

.kj-docs-sidebar {
  display: flex;
  align-self: stretch;
  background: var(--kj-color-base-100);
  border-right: 1px solid var(--kj-color-base-300);
}

.col-a {
  width: 200px;
  padding: 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.col-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: color-mix(in oklch, var(--kj-color-base-content) 60%, transparent);
  margin: 0 0 8px;
  padding: 0 8px;
}

.col-a-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  color: var(--kj-color-base-content);
  font-size: 13px;
  text-decoration: none;
}
.col-a-row:hover { background: var(--kj-color-base-200); }
.col-a-row.active {
  background: color-mix(in oklch, var(--kj-color-primary) 12%, transparent);
  color: var(--kj-color-primary);
  font-weight: 500;
}
.col-a-chev { margin-left: auto; opacity: 0.5; font-size: 12px; }
```

- [ ] **Step 6: Create the shell**

Create `apps/docs/src/app/shells/docs-shell/docs-shell.ts`:

```ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DocsSidebarComponent } from '../../components/docs-sidebar/docs-sidebar';

@Component({
  selector: 'kj-docs-shell',
  standalone: true,
  imports: [RouterOutlet, DocsSidebarComponent],
  templateUrl: './docs-shell.html',
  styleUrl: './docs-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsShellComponent {}
```

Create `apps/docs/src/app/shells/docs-shell/docs-shell.html`:

```html
<div class="docs-shell">
  <kj-docs-sidebar />
  <main class="docs-main">
    <router-outlet />
  </main>
</div>
```

Create `apps/docs/src/app/shells/docs-shell/docs-shell.css`:

```css
.docs-shell {
  display: flex;
  flex: 1;
  min-height: 0;
}
.docs-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}
```

- [ ] **Step 7: Run unit tests to verify pass**

Run: `pnpm --filter docs test --run docs-sidebar.spec`
Expected: PASS — 2 tests pass.

- [ ] **Step 8: Commit (don't wire into routes yet — Task 5 does that)**

```bash
git add apps/docs/src/app/components/docs-sidebar/ apps/docs/src/app/shells/docs-shell/
git commit -m "feat(docs): rewrite docs-sidebar with Col A; add DocsShellComponent"
```

---

## Task 4: Add Col B (children popout) to DocsSidebar

**Files:**
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.html`
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.css`
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.spec.ts` (add test)
- Test: `apps/docs/e2e/docs-sidebar.spec.ts` (new)

- [ ] **Step 1: Add the unit test for Col B presence**

Append to `apps/docs/src/app/components/docs-sidebar/docs-sidebar.spec.ts`:

```ts
describe('DocsSidebarComponent — Column B', () => {
  test('Col B is hidden on /docs/getting-started', async () => {
    const { fixture } = await render(DocsSidebarComponent, { providers: [provideRouter(stubRoutes)] });
    const router = fixture.debugElement.injector.get(Router);
    await router.navigateByUrl('/docs/getting-started');
    fixture.detectChanges();
    expect(screen.queryByLabelText(/getting started items/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/headless items/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/components items/i)).not.toBeInTheDocument();
  });

  test('Col B opens for /docs/headless with appropriate aria-label', async () => {
    const { fixture } = await render(DocsSidebarComponent, { providers: [provideRouter(stubRoutes)] });
    const router = fixture.debugElement.injector.get(Router);
    await router.navigateByUrl('/docs/headless');
    fixture.detectChanges();
    expect(screen.getByRole('navigation', { name: /headless items/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run unit test to verify failure**

Run: `pnpm --filter docs test --run docs-sidebar.spec`
Expected: FAIL — Col B markup not yet rendered.

- [ ] **Step 3: Add Col B markup**

Replace the contents of `apps/docs/src/app/components/docs-sidebar/docs-sidebar.html`:

```html
<aside class="kj-docs-sidebar">
  <nav class="col-a" role="navigation" aria-label="Documentation sections">
    <p class="col-label">Docs</p>
    @for (row of rows; track row.id) {
      <a
        [routerLink]="row.href"
        class="col-a-row"
        [class.active]="activeSection() === row.id"
        [attr.aria-current]="activeSection() === row.id ? 'page' : null"
        [attr.aria-expanded]="row.hasChildren ? (activeSection() === row.id) : null"
      >
        <span class="col-a-label">{{ row.label }}</span>
        @if (row.hasChildren) { <span class="col-a-chev" aria-hidden="true">›</span> }
      </a>
    }
  </nav>

  @if (colBOpen()) {
    <nav class="col-b" role="navigation" [attr.aria-label]="activeSection() + ' items'">
      @for (group of colBTree(); track group.label) {
        <p class="col-b-group">{{ group.label }}</p>
        @for (item of group.children; track item.slug) {
          <a
            [routerLink]="['/docs', activeSection(), item.slug]"
            class="col-b-item"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
          >{{ item.label }}</a>
        }
      }
    </nav>
  }
</aside>
```

Update the import line in `apps/docs/src/app/components/docs-sidebar/docs-sidebar.ts`:

```ts
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
```

And in the `imports:` array of the `@Component` decorator:

```ts
imports: [RouterLink, RouterLinkActive],
```

- [ ] **Step 4: Add Col B styles**

Append to `apps/docs/src/app/components/docs-sidebar/docs-sidebar.css`:

```css
.col-b {
  width: 280px;
  padding: 16px 8px;
  background: var(--kj-color-base-100);
  border-left: 1px solid var(--kj-color-base-300);
  animation: col-b-slide 180ms ease-out;
  display: flex;
  flex-direction: column;
}
@keyframes col-b-slide {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

.col-b-group {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: color-mix(in oklch, var(--kj-color-base-content) 60%, transparent);
  margin: 12px 0 4px;
  padding: 0 8px;
}
.col-b-group:first-of-type { margin-top: 0; }

.col-b-item {
  display: block;
  padding: 6px 10px;
  border-radius: 6px;
  color: color-mix(in oklch, var(--kj-color-base-content) 80%, transparent);
  font-size: 12px;
  text-decoration: none;
}
.col-b-item:hover { background: var(--kj-color-base-200); color: var(--kj-color-base-content); }
.col-b-item.active {
  background: color-mix(in oklch, var(--kj-color-primary) 12%, transparent);
  color: var(--kj-color-primary);
  font-weight: 500;
}
```

- [ ] **Step 5: Write the E2E for Col B**

Create `apps/docs/e2e/docs-sidebar.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('Col A always visible on /docs', async ({ page }) => {
  await page.goto('/docs');
  await expect(page.getByRole('navigation', { name: 'Documentation sections' })).toBeVisible();
  for (const label of ['Getting Started', 'Headless', 'Components']) {
    await expect(page.getByRole('link', { name: label })).toBeVisible();
  }
});

test('Col B closed on /docs/getting-started (leaf)', async ({ page }) => {
  await page.goto('/docs/getting-started');
  await expect(page.getByRole('navigation', { name: /headless items/i })).toBeHidden();
  await expect(page.getByRole('navigation', { name: /components items/i })).toBeHidden();
});

test('Col B opens with grouped items when entering /docs/headless', async ({ page }) => {
  await page.goto('/docs/headless');
  await expect(page.getByRole('navigation', { name: /headless items/i })).toBeVisible();
});
```

- [ ] **Step 6: Run unit + E2E tests (E2E will need Task 5's route wiring to fully pass)**

Run: `pnpm --filter docs test --run docs-sidebar.spec`
Expected: PASS — 4 tests pass.

E2E will be verified after Task 5 is complete.

- [ ] **Step 7: Commit**

```bash
git add apps/docs/src/app/components/docs-sidebar/ apps/docs/e2e/docs-sidebar.spec.ts
git commit -m "feat(docs): add Col B popout to docs-sidebar (drill into track items)"
```

---

## Task 5: Wire /docs through DocsShellComponent

**Files:**
- Modify: `apps/docs/src/app/app.routes.ts`

This task swaps the route structure so all `/docs/*` routes render inside the new shell. The old single-shell pattern (each page including `<kj-docs-sidebar />` itself) is replaced — going forward, only the shell renders the sidebar.

- [ ] **Step 1: Inspect current docs page templates for embedded sidebar**

Read these files and note any line that imports or renders `<kj-docs-sidebar />`:
- `apps/docs/src/app/pages/docs-index/docs-index.html`
- `apps/docs/src/app/pages/getting-started/getting-started.html`
- `apps/docs/src/app/pages/track-index/track-index.html`
- `apps/docs/src/app/pages/component-doc/component-doc.html`

For each occurrence of `<kj-docs-sidebar />` (or wrapping `<aside class="sidebar">`), the markup will be removed in Step 3 (since the shell now provides the sidebar).

- [ ] **Step 2: Update routes**

Replace `apps/docs/src/app/app.routes.ts`:

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
  },
  {
    path: 'docs',
    loadComponent: () => import('./shells/docs-shell/docs-shell').then(m => m.DocsShellComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/docs-index/docs-index').then(m => m.DocsIndexComponent),
      },
      {
        path: 'getting-started',
        loadComponent: () => import('./pages/getting-started/getting-started').then(m => m.GettingStartedComponent),
      },
      {
        path: 'headless',
        loadComponent: () => import('./pages/track-index/track-index').then(m => m.TrackIndexComponent),
        data: { trackId: 'headless' },
      },
      {
        path: 'components',
        loadComponent: () => import('./pages/track-index/track-index').then(m => m.TrackIndexComponent),
        data: { trackId: 'components' },
      },
      {
        path: 'headless/:slug',
        loadComponent: () => import('./pages/component-doc/component-doc').then(m => m.ComponentDocComponent),
      },
      {
        path: 'components/:slug',
        loadComponent: () => import('./pages/component-doc/component-doc').then(m => m.ComponentDocComponent),
      },
    ],
  },
  {
    path: 'theme-generator',
    loadComponent: () => import('./pages/theme-generator/theme-generator').then(m => m.ThemeGeneratorComponent),
  },
  { path: '**', redirectTo: '' },
];
```

- [ ] **Step 3: Strip embedded sidebars from docs page templates**

For each docs page template found in Step 1, remove the `<kj-docs-sidebar />` element and its wrapping `<aside>` (if any). Keep the page content (the actual doc body). Also remove the `DocsSidebarComponent` import from the page's `.ts` file's `imports:` array if it's there.

The shell now provides the sidebar uniformly.

- [ ] **Step 4: Run docs build to confirm no compile errors**

Run: `pnpm --filter docs build`
Expected: Application bundle generation complete. No errors.

- [ ] **Step 5: Run E2E tests**

Run: `pnpm test:e2e -- docs-sidebar.spec nav.spec`
Expected: PASS — all sidebar + nav E2E tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/app/app.routes.ts apps/docs/src/app/pages/
git commit -m "feat(docs): wire /docs routes through DocsShellComponent (single sidebar source)"
```

---

## Task 6: ThemeGeneratorSidebarComponent — Col A (themes list)

**Files:**
- Create: `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.{ts,html,css,spec.ts}`

This task creates the new sidebar component with Col A (themes list) only. Col B (token editor) is added in Task 7.

- [ ] **Step 1: Write failing unit test**

Create `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.spec.ts`:

```ts
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { ThemeGeneratorSidebarComponent } from './theme-generator-sidebar';
import { ThemeDraftService } from '../../services/theme-draft.service';

class StubDraftService {
  loadFork = vi.fn();
  loadSaved = vi.fn();
  list = () => [];
  setName = vi.fn();
  draft = () => ({ name: 'kouji' } as { name: string });
}

describe('ThemeGeneratorSidebarComponent — Col A', () => {
  test('renders all built-in themes', async () => {
    await render(ThemeGeneratorSidebarComponent, {
      providers: [provideRouter([]), { provide: ThemeDraftService, useClass: StubDraftService }],
    });
    for (const name of ['kouji', 'dark', 'retro', 'cyberpunk', 'corporate']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${name}$`, 'i') })).toBeInTheDocument();
    }
  });

  test('clicking a built-in calls draftService.loadFork', async () => {
    const stub = new StubDraftService();
    await render(ThemeGeneratorSidebarComponent, {
      providers: [provideRouter([]), { provide: ThemeDraftService, useValue: stub }],
    });
    await userEvent.click(screen.getByRole('button', { name: /^retro$/i }));
    expect(stub.loadFork).toHaveBeenCalledWith('retro');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter docs test --run theme-generator-sidebar.spec`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.ts`:

```ts
import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { BUILT_IN_NAMES, type BuiltInName } from '../../lib/theme/built-in-themes';

@Component({
  selector: 'kj-theme-generator-sidebar',
  standalone: true,
  templateUrl: './theme-generator-sidebar.html',
  styleUrl: './theme-generator-sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorSidebarComponent {
  private readonly draftService = inject(ThemeDraftService);

  protected readonly builtIns = BUILT_IN_NAMES;
  protected readonly mySaved = computed(() => this.draftService.list().map(t => t.name));
  protected readonly currentName = computed(() => this.draftService.draft().name);

  protected onForkBuiltIn(name: BuiltInName): void { this.draftService.loadFork(name); }
  protected onLoadSaved(name: string): void { this.draftService.loadSaved(name); }
  protected onNewTheme(): void { this.draftService.loadFork('light'); this.draftService.setName(''); }
}
```

Create `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.html` (Col A only — Col B added in Task 7):

```html
<aside class="kj-tg-sidebar">
  <nav class="col-a" role="navigation" aria-label="Themes">
    <p class="col-label">Themes</p>
    <p class="col-group">Built-in</p>
    @for (name of builtIns; track name) {
      <button
        type="button"
        class="theme-row"
        [class.active]="currentName() === name"
        (click)="onForkBuiltIn(name)"
      >
        <span class="swatch" [attr.data-theme]="name" aria-hidden="true"></span>
        <span class="theme-name">{{ name }}</span>
      </button>
    }

    @if (mySaved().length > 0) {
      <p class="col-group">My themes</p>
      @for (name of mySaved(); track name) {
        <button
          type="button"
          class="theme-row"
          [class.active]="currentName() === name"
          (click)="onLoadSaved(name)"
        >
          <span class="swatch saved" aria-hidden="true"></span>
          <span class="theme-name">{{ name }}</span>
        </button>
      }
    }

    <button type="button" class="new-theme" (click)="onNewTheme()">＋ New theme</button>
  </nav>
</aside>
```

Create `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.css`:

```css
:host { display: contents; }

.kj-tg-sidebar {
  display: flex;
  align-self: stretch;
  background: var(--kj-color-base-100);
  border-right: 1px solid var(--kj-color-base-300);
}

.col-a {
  width: 220px;
  padding: 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.col-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: color-mix(in oklch, var(--kj-color-base-content) 60%, transparent);
  margin: 0 0 8px;
  padding: 0 8px;
}
.col-group {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: color-mix(in oklch, var(--kj-color-base-content) 60%, transparent);
  margin: 12px 0 4px;
  padding: 0 8px;
}
.col-group:first-of-type { margin-top: 0; }

.theme-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  background: transparent;
  border: 0;
  color: var(--kj-color-base-content);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
}
.theme-row:hover { background: var(--kj-color-base-200); }
.theme-row.active {
  background: color-mix(in oklch, var(--kj-color-primary) 12%, transparent);
  color: var(--kj-color-primary);
  font-weight: 500;
}

.swatch {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  background: linear-gradient(135deg, var(--kj-color-primary, #b8f500) 50%, var(--kj-color-secondary, #00d4ff) 50%);
  flex-shrink: 0;
  border: 1px solid var(--kj-color-base-300);
}
.swatch.saved {
  background: linear-gradient(135deg, var(--kj-color-accent, #ff00aa) 50%, var(--kj-color-base-content, #fff) 50%);
}

.new-theme {
  margin-top: 12px;
  padding: 7px 10px;
  background: transparent;
  border: 1px dashed var(--kj-color-base-300);
  border-radius: 6px;
  color: var(--kj-color-primary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.new-theme:hover { border-color: var(--kj-color-primary); }
```

- [ ] **Step 4: Run unit tests**

Run: `pnpm --filter docs test --run theme-generator-sidebar.spec`
Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/components/theme-generator-sidebar/
git commit -m "feat(docs): add ThemeGeneratorSidebarComponent — Col A (themes list)"
```

---

## Task 7: Move token editor from theme-generator main into Sidebar Col B

**Files:**
- Modify: `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.html`
- Modify: `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.ts`
- Modify: `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.css`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.{ts,html,css}` (controls panel removed)

This task extracts the existing controls panel (`<section class="generator-body">` content) from `theme-generator.html` and moves it into Col B of the new sidebar. The main view becomes preview-only.

- [ ] **Step 1: Identify the controls block to move**

Read `apps/docs/src/app/pages/theme-generator/theme-generator.html` and locate the entire `<section class="generator-body">` block (it contains `<details>` for Colors, Spacing, Radii, Fonts, Motion). This is the markup to migrate.

Read `apps/docs/src/app/pages/theme-generator/theme-generator.ts` and identify the methods that the controls panel calls — `onColorChange`, `onContentChange`, `toggleDerivedOverride`, `toggleContentOverride`, etc. — and the data they read (`colorSlots`, `derivedSlots`, `derivedFor`, `hexFor`, `hexForDerived`, `hexForContent`, `contentFor`). These need to move to the sidebar component.

- [ ] **Step 2: Move state + methods into the sidebar component**

In `theme-generator-sidebar.ts`, add the controls-related state and methods that previously lived in `theme-generator.ts`. Inject the same services the main page used (typically `ThemeDraftService`, possibly a font service). The methods should remain semantically identical — same signatures, same effects. Only the host component changes.

Don't try to refactor the methods at the same time. A literal cut-and-paste is the goal; refactor later if needed.

- [ ] **Step 3: Add Col B markup to the sidebar template**

Append a `<section class="col-b">` block to `theme-generator-sidebar.html`, containing the `<details>` panels copied verbatim from `theme-generator.html`. Keep the same accessibility attributes, same aria labels.

- [ ] **Step 4: Add Col B styles**

Append matching CSS to `theme-generator-sidebar.css` for the new `<section class="col-b">` (width ~280px, scrollable, collapsible details). Also copy any styles from `theme-generator.css` that were scoped to `.generator-controls` etc., adapting selectors to the new component scope.

- [ ] **Step 5: Strip the controls block from the main page**

Edit `theme-generator.html` to delete the `<section class="generator-body">` block. Keep the `<header class="generator-bar">` (name + actions) and the preview component (`<kj-theme-generator-preview>` or similar — leave as-is).

Edit `theme-generator.ts` to delete the moved state + methods (`colorSlots`, `derivedSlots`, `onColorChange`, `onContentChange`, etc.). Keep `draft()`, `nameError()`, `onNameChange()`, `reset()`, `save()`, `copyCss()`, `downloadCss()`, `exportJson()`, `saveDisabled()` — these are the action-bar methods.

Edit `theme-generator.css` to delete styles that targeted the moved markup.

- [ ] **Step 6: Build to confirm no compile errors**

Run: `pnpm --filter docs build`
Expected: Application bundle generation complete. No errors.

- [ ] **Step 7: Manual smoke (dev server)**

Run: `pnpm --filter docs dev` and open `/theme-generator`. The sidebar should now show the Col B token editor, and the main area should show only the action bar + preview. Edit a color in Col B and confirm the preview updates live.

If `kj-theme-generator-sidebar` isn't yet imported into the page (it's wired up in Task 8), the page may render without a sidebar — that's expected at this point.

- [ ] **Step 8: Commit**

```bash
git add apps/docs/src/app/components/theme-generator-sidebar/ apps/docs/src/app/pages/theme-generator/
git commit -m "refactor(docs): move token editor from theme-generator main into sidebar Col B"
```

---

## Task 8: ThemeGeneratorShellComponent + wire route

**Files:**
- Create: `apps/docs/src/app/shells/theme-generator-shell/theme-generator-shell.{ts,html,css}`
- Modify: `apps/docs/src/app/app.routes.ts`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.html` (drop the now-unused `<kj-docs-sidebar />`, use whatever is left of action-bar + preview)
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.ts` (drop sidebar import)
- Test: `apps/docs/e2e/theme-generator.spec.ts` (new)

- [ ] **Step 1: Create the shell**

Create `apps/docs/src/app/shells/theme-generator-shell/theme-generator-shell.ts`:

```ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeGeneratorSidebarComponent } from '../../components/theme-generator-sidebar/theme-generator-sidebar';

@Component({
  selector: 'kj-theme-generator-shell',
  standalone: true,
  imports: [RouterOutlet, ThemeGeneratorSidebarComponent],
  templateUrl: './theme-generator-shell.html',
  styleUrl: './theme-generator-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorShellComponent {}
```

Create `apps/docs/src/app/shells/theme-generator-shell/theme-generator-shell.html`:

```html
<div class="tg-shell">
  <kj-theme-generator-sidebar />
  <main class="tg-main">
    <router-outlet />
  </main>
</div>
```

Create `apps/docs/src/app/shells/theme-generator-shell/theme-generator-shell.css`:

```css
.tg-shell {
  display: flex;
  flex: 1;
  min-height: 0;
}
.tg-main {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
```

- [ ] **Step 2: Strip embedded sidebar from theme-generator page**

In `apps/docs/src/app/pages/theme-generator/theme-generator.html`, delete any leftover `<kj-docs-sidebar />` element and its wrapping `<aside>`. The template's outermost element should be the action bar + preview only — no sidebar.

In `apps/docs/src/app/pages/theme-generator/theme-generator.ts`, remove the `DocsSidebarComponent` import and any reference to it in the `imports:` array.

- [ ] **Step 3: Wire the route**

Modify `apps/docs/src/app/app.routes.ts`. Replace the existing `/theme-generator` entry with:

```ts
  {
    path: 'theme-generator',
    loadComponent: () => import('./shells/theme-generator-shell/theme-generator-shell').then(m => m.ThemeGeneratorShellComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/theme-generator/theme-generator').then(m => m.ThemeGeneratorComponent),
      },
    ],
  },
```

- [ ] **Step 4: Write E2E**

Create `apps/docs/e2e/theme-generator.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('theme-generator renders sidebar Col A with built-in themes', async ({ page }) => {
  await page.goto('/theme-generator');
  await expect(page.getByRole('navigation', { name: 'Themes' })).toBeVisible();
  for (const name of ['kouji', 'dark', 'retro', 'cyberpunk', 'corporate']) {
    await expect(page.getByRole('button', { name: new RegExp(`^${name}$`, 'i') })).toBeVisible();
  }
});

test('clicking a built-in theme loads it (active state changes)', async ({ page }) => {
  await page.goto('/theme-generator');
  const retroBtn = page.getByRole('button', { name: /^retro$/i });
  await retroBtn.click();
  await expect(retroBtn).toHaveClass(/active/);
});

test('Col B token editor visible alongside main preview', async ({ page }) => {
  await page.goto('/theme-generator');
  await expect(page.locator('.col-b').first()).toBeVisible();
  await expect(page.locator('main.tg-main')).toBeVisible();
});
```

- [ ] **Step 5: Run build, unit tests, E2E**

Run: `pnpm --filter docs build && pnpm --filter docs test --run && pnpm test:e2e -- theme-generator.spec`
Expected: All green.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/app/shells/theme-generator-shell/ apps/docs/src/app/app.routes.ts apps/docs/src/app/pages/theme-generator/ apps/docs/e2e/theme-generator.spec.ts
git commit -m "feat(docs): wire /theme-generator through ThemeGeneratorShellComponent"
```

---

## Task 9: Mobile drawer behavior

**Files:**
- Modify: `apps/docs/src/app/components/navbar/navbar.{ts,html,css}` (add hamburger that toggles a drawer)
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.{ts,html,css}` (collapse to off-canvas under 768px)
- Modify: `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.{ts,html,css}` (collapse to drawer with tabs)

The desktop layout works by Task 8. This task adds responsive behavior under 768px.

- [ ] **Step 1: Decide hamburger placement**

The navbar already has spacers at smaller widths (search and version pills can collapse). Add a hamburger icon that, when on `/docs/*` or `/theme-generator`, toggles the corresponding sidebar's open state.

A simple approach: each sidebar component exposes an `open` signal. The navbar reads the current route and forwards hamburger clicks to a `SidebarToggleService` (a tiny shared service that exposes `toggle()` and `open: signal<boolean>`). Each sidebar listens to this service.

Create `apps/docs/src/app/services/sidebar-toggle.service.ts`:

```ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarToggleService {
  readonly open = signal(false);
  toggle(): void { this.open.update(v => !v); }
  close(): void { this.open.set(false); }
}
```

- [ ] **Step 2: Add hamburger to navbar (mobile only)**

Add a hamburger button to `navbar.html`, visible at `< 768px`, that calls `inject(SidebarToggleService).toggle()`. The button is hidden on `/` (no sidebar to open).

Update `navbar.ts` to inject the service and expose a `toggle()` method. Use `Router.events` to derive a `hasSidebar` signal (true when URL starts with `/docs` or `/theme-generator`).

In `navbar.css`, hide the hamburger above 768px:

```css
.kj-navbar-burger { display: none; }
@media (max-width: 767px) {
  .kj-navbar-burger { display: inline-flex; }
  .kj-navbar-search span,
  .kj-navbar-search kbd,
  .kj-navbar-version,
  .kj-navbar-icon[aria-label="GitHub repository"],
  .kj-navbar-icon[aria-label="npm package"] { display: none; }
}
```

- [ ] **Step 3: Make /docs sidebar an off-canvas drawer under 768px**

In `docs-sidebar.ts`, inject `SidebarToggleService` and bind `host.class.open` to its `open` signal. Add a host listener for navigation end events that calls `close()` after each route change so the drawer closes on selection.

In `docs-sidebar.css`, under `@media (max-width: 767px)`:

```css
@media (max-width: 767px) {
  .kj-docs-sidebar {
    position: fixed;
    inset: 56px 0 0 0; /* below navbar */
    z-index: 40;
    background: var(--kj-color-base-100);
    transform: translateX(-100%);
    transition: transform 200ms ease-out;
  }
  :host(.open) .kj-docs-sidebar { transform: translateX(0); }
  .col-a { width: 100%; }
  .col-b { width: 100%; border-left: 0; border-top: 1px solid var(--kj-color-base-300); }
}
```

For the drill behavior on mobile, the drawer shows Col A; tapping a parent row navigates and Col B renders below A (stacked). A back button is not strictly needed because the URL is the source of truth and tapping a different Col A row swaps Col B.

- [ ] **Step 4: Make /theme-generator sidebar a drawer with tabs**

Add a tabbed UI for mobile in `theme-generator-sidebar.html`, scoped to `@media (max-width: 767px)`. Tabs: `Themes` (Col A) and `Tokens` (Col B). Use a signal `mobileTab: 'themes' | 'tokens' = 'themes'` and toggle visibility.

Apply the same off-canvas drawer styles as the docs sidebar.

- [ ] **Step 5: Write E2E for mobile**

Append to `apps/docs/e2e/nav.spec.ts`:

```ts
test.describe('mobile (375x667)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('hamburger toggles docs sidebar', async ({ page }) => {
    await page.goto('/docs');
    const burger = page.getByRole('button', { name: /toggle navigation/i });
    await burger.click();
    await expect(page.getByRole('navigation', { name: 'Documentation sections' })).toBeVisible();
    await burger.click();
    // Drawer should close — sidebar may still exist in DOM but be off-screen.
    await expect(page.locator('.kj-docs-sidebar.open')).toHaveCount(0);
  });
});
```

- [ ] **Step 6: Run all checks**

Run: `pnpm --filter docs build && pnpm --filter docs test --run && pnpm test:e2e`
Expected: All green.

- [ ] **Step 7: Commit**

```bash
git add apps/docs/src/app/components/navbar/ apps/docs/src/app/components/docs-sidebar/ apps/docs/src/app/components/theme-generator-sidebar/ apps/docs/src/app/services/sidebar-toggle.service.ts apps/docs/e2e/nav.spec.ts
git commit -m "feat(docs): mobile drawer behavior for navbar + sidebars (< 768px)"
```

---

## Task 10: Final cleanup and full validation

**Files:**
- Possibly: `apps/docs/src/app/services/docs.service.ts` (if any helper became unused)
- Possibly: `apps/docs/src/app/components/docs-sidebar/` (any cruft from rewrite)

- [ ] **Step 1: Search for leftover dead code**

Search for references to the old `SidebarView` type, old `viewFromUrl` method, old localStorage `VIEW_STORAGE_KEY`. None should remain. If any do, delete them.

```bash
grep -rn "SidebarView\|VIEW_STORAGE_KEY\|viewFromUrl" apps/docs/src/
```

Expected: no matches (or, if matches exist, they're in tests / spec docs only).

- [ ] **Step 2: Run lint, full test suite, build**

```bash
pnpm lint && pnpm test && pnpm test:e2e && pnpm --filter docs build
```

Expected: all green; no warnings.

- [ ] **Step 3: Manual visual smoke**

Run `pnpm --filter docs dev` and walk through:
- `/` — landing renders, navbar visible, theme picker works, "Get started" → `/docs/getting-started`
- `/docs` — Col A visible, no Col B
- `/docs/getting-started` — leaf highlighted, no Col B
- `/docs/headless` — Col A highlights Headless, Col B opens with grouped items
- `/docs/headless/<some-slug>` — Col A still shows Headless active, Col B item highlighted
- `/docs/components` and `/docs/components/<slug>` — same behavior on Components track
- `/theme-generator` — Col A themes, Col B token editor, main preview, action bar; click a built-in theme → preview swaps; edit a Col B token → preview updates live
- Resize to 375px wide — hamburger appears, drawer toggles work
- Theme picker works from every surface

If anything looks broken, fix and re-run validation before final commit.

- [ ] **Step 4: Final commit (only if anything was changed in steps 1-3)**

```bash
git add -A
git commit -m "chore(docs): cleanup leftovers from navigation redesign"
```

- [ ] **Step 5: Push and trigger Render deploy**

Pre-push hook runs lint + test + build + changeset status. None of the changes touch publishable packages, so no changeset is required.

```bash
git push
```

Expected: hook passes; push succeeds; `deploy-docs.yml` triggers in GitHub Actions; Render redeploys.

---

## Self-Review

Spec → plan coverage check, run through every spec section:

- §1 Goal — covered by all tasks
- §2 Scope (in scope) — Navbar (T1+T2), DocsSidebar two-panel (T3+T4), wire /docs (T5), theme-gen Col A (T6), Col B + main refactor (T7), shell + route (T8), mobile drawer (T9), keyboard/a11y (built into each task — `aria-current`, `aria-expanded`, `role="navigation"`)
- §3 IA table — implemented across T3 (route awareness), T5 (route shape), T8 (route shape)
- §4.1 Component tree — exactly built across T1-T8
- §4.2 NavbarComponent — T1 + T2
- §4.3 DocsSidebarComponent — T3 + T4
- §4.4 ThemeGeneratorSidebarComponent — T6 + T7
- §4.5 Shells — T3 (DocsShell), T8 (ThemeGenShell)
- §5 Routes — T5 + T8
- §6 Mobile — T9
- §7 Theme picker — T1 (relocates intact)
- §8 Search — T1 (trigger pill in navbar)
- §9 Accessibility — every component task includes `aria-*` attributes; tests assert `aria-current` and `aria-expanded`
- §10 Migration — file diffs match T2-T8 exactly
- §11 Testing — E2E specs in T2/T4/T8/T9; unit specs in T1/T3/T6
- §12 Open questions — explicit deferrals, no implementation needed

No spec requirement is uncovered.

Placeholder scan: no "TBD" / "TODO" inside steps; every code step contains complete code blocks; every command step has the exact command.

Type consistency: `DocsSection`, `ColARow`, `SidebarToggleService.open`, all reuse the same names across tasks. `BUILT_IN_NAMES` and `Theme` come from the existing codebase. `ThemeDraftService.draft()` is used in T6 step 3 — verified against `apps/docs/src/app/services/theme-draft.service.ts`: the service exposes `draft = this._draft.asReadonly()` returning `DraftTheme` which has a `name: string` field.

Plan is ready for execution.
