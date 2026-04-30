# Mobile-Friendly Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the docs site fully usable on mobile — angular.dev-style hamburger top bar, slide-in sidebar drawer, body scroll lock, and Escape key to close.

**Architecture:** The existing `DocsSidebarComponent` gains an `open` signal with `toggle()`/`close()` methods. Both layout pages (`component-doc`, `docs-index`) get a `viewChild` reference to the sidebar, add a mobile top bar + backdrop in their templates, and bind the `.sidebar` aside CSS class to the drawer state. CSS `position: fixed` on `.sidebar` at ≤768px takes the element out of grid flow so content fills the full width.

**Tech Stack:** Angular 21 signals, `viewChild`, `DOCUMENT`, CSS transitions (`transform: translateX`)

---

## File Map

| File | Change |
|---|---|
| `apps/docs/src/app/components/docs-sidebar/docs-sidebar.ts` | Add `open` signal, `toggle()`, `close()`, body scroll lock effect, Escape key listener |
| `apps/docs/src/app/components/docs-sidebar/docs-sidebar.html` | Add close (×) button, `(click)="close()"` on all nav links |
| `apps/docs/src/app/components/docs-sidebar/docs-sidebar.css` | Show close button on mobile only |
| `apps/docs/src/app/pages/component-doc/component-doc.ts` | Add `viewChild` for sidebar ref |
| `apps/docs/src/app/pages/component-doc/component-doc.html` | Add mobile top bar + backdrop |
| `apps/docs/src/app/pages/component-doc/component-doc.css` | Mobile drawer, top bar, backdrop CSS |
| `apps/docs/src/app/pages/docs-index/docs-index.ts` | Add `viewChild` for sidebar ref |
| `apps/docs/src/app/pages/docs-index/docs-index.html` | Add mobile top bar + backdrop |
| `apps/docs/src/app/pages/docs-index/docs-index.css` | Mobile drawer, top bar, backdrop CSS |

---

## Task 1: Add drawer state to DocsSidebarComponent

**Files:**
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.ts`

- [ ] **Step 1: Replace the full file content**

```typescript
import { Component, computed, effect, HostListener, inject, OnInit, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DocsService, SidebarNode } from '../../services/docs.service';
import { SearchService } from '../search/search.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'kj-docs-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './docs-sidebar.html',
  styleUrl: './docs-sidebar.css',
})
export class DocsSidebarComponent implements OnInit {
  private readonly docs = inject(DocsService);
  private readonly search = inject(SearchService);
  private readonly themeService = inject(ThemeService);
  private readonly document = inject(DOCUMENT);

  protected readonly tree = signal<SidebarNode[]>([]);
  protected readonly isDark = computed(() => this.themeService.theme() === 'dark');
  readonly open = signal(false);

  constructor() {
    effect(() => {
      this.document.body.style.overflow = this.open() ? 'hidden' : '';
    });
  }

  ngOnInit(): void {
    this.docs.loadManifest().subscribe(() => {
      this.tree.set(this.docs.getSidebarTree());
    });
  }

  toggle(): void { this.open.update(v => !v); }
  close(): void { this.open.set(false); }

  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.open()) this.close(); }

  protected openSearch(): void { this.search.open(); }
  protected toggleTheme(): void { this.themeService.toggle(); }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm --filter docs exec tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/app/components/docs-sidebar/docs-sidebar.ts
git commit -m "feat(docs): add open signal and toggle/close to DocsSidebarComponent"
```

---

## Task 2: Update sidebar template — close button and link dismiss

**Files:**
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.html`

- [ ] **Step 1: Replace the full file content**

```html
<div class="sidebar-top">
  <div class="sidebar-top-row">
    <a routerLink="/" class="sidebar-home" aria-label="kouji home" (click)="close()">
      <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="10" y1="10" x2="10" y2="54" stroke="#b8f500" stroke-width="6" stroke-linecap="round"/>
        <line x1="10" y1="32" x2="34" y2="10" stroke="#b8f500" stroke-width="6" stroke-linecap="round"/>
        <line x1="10" y1="32" x2="34" y2="54" stroke="#b8f500" stroke-width="6" stroke-linecap="round"/>
        <path d="M50 24 L50 48 Q50 56 42 56 Q38 56 36 54" stroke="#f0ede6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="50" cy="14" r="4" fill="#f0ede6"/>
      </svg>
    </a>
    <div class="sidebar-top-actions">
      <button class="theme-toggle" (click)="toggleTheme()" [title]="isDark() ? 'Switch to light mode' : 'Switch to dark mode'" type="button">
        @if (isDark()) {
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        } @else {
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        }
      </button>
      <button class="sidebar-close-btn" (click)="close()" aria-label="Close navigation" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </div>
</div>

<nav class="sidebar-nav" aria-label="Documentation navigation">
  <button class="sidebar-search-btn" (click)="openSearch()">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
    Search
    <kbd>⌘K</kbd>
  </button>

  <div class="sidebar-section">
    <a routerLink="/docs/getting-started" routerLinkActive="active" class="sidebar-link sidebar-link-special" (click)="close()">
      Getting Started
    </a>
    <a routerLink="/docs" [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="active" class="sidebar-link sidebar-link-special" (click)="close()">
      All Components
    </a>
  </div>

  @for (pkg of tree(); track pkg.label) {
    <div class="sidebar-package">
      <span class="sidebar-package-label">{{ pkg.label }}</span>
      @for (cat of pkg.children; track cat.label) {
        <div class="sidebar-section">
          <span class="sidebar-category">{{ cat.label }}</span>
          @for (item of cat.children; track item.slug) {
            @if (item.slug) {
              <a
                [routerLink]="['/docs/components', item.slug]"
                routerLinkActive="active"
                class="sidebar-link"
                (click)="close()"
              >
                {{ item.label }}
              </a>
            }
          }
        </div>
      }
    </div>
  }
</nav>
```

- [ ] **Step 2: Commit**

```bash
git add apps/docs/src/app/components/docs-sidebar/docs-sidebar.html
git commit -m "feat(docs): sidebar close on nav link + close button"
```

---

## Task 3: Sidebar CSS — show close button on mobile only

**Files:**
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.css`

- [ ] **Step 1: Replace `.sidebar-top-row` rule and add new rules**

Find the existing `.sidebar-top-row` rule and replace:
```css
.sidebar-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```
Replace with:
```css
.sidebar-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-top-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.sidebar-close-btn {
  display: none;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}
.sidebar-close-btn:hover { color: var(--text); }

@media (max-width: 768px) {
  .sidebar-close-btn {
    display: flex;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/docs/src/app/components/docs-sidebar/docs-sidebar.css
git commit -m "feat(docs): sidebar close button visible on mobile"
```

---

## Task 4: Mobile layout — component-doc

**Files:**
- Modify: `apps/docs/src/app/pages/component-doc/component-doc.ts`
- Modify: `apps/docs/src/app/pages/component-doc/component-doc.html`
- Modify: `apps/docs/src/app/pages/component-doc/component-doc.css`

- [ ] **Step 1: Add `viewChild` for sidebar to component-doc.ts**

Replace the existing file with:
```typescript
import { ApplicationRef, Component, inject, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map, filter, take } from 'rxjs/operators';
import { DocsService } from '../../services/docs.service';
import { DocsSidebarComponent } from '../../components/docs-sidebar/docs-sidebar';
import { CodePreviewComponent } from '../../components/code-preview/code-preview';
import { CodeEditorComponent } from '../../components/code-editor/code-editor';
import { PageTocDirective } from '../../components/page-toc/page-toc.directive';
import { PageTocComponent } from '../../components/page-toc/page-toc';

@Component({
  selector: 'app-component-doc',
  standalone: true,
  imports: [
    RouterLink,
    DocsSidebarComponent,
    CodePreviewComponent,
    CodeEditorComponent,
    PageTocDirective,
    PageTocComponent,
  ],
  templateUrl: './component-doc.html',
  styleUrl: './component-doc.css',
})
export class ComponentDocComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly docs = inject(DocsService);
  private readonly appRef = inject(ApplicationRef);

  protected readonly component = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) =>
        this.docs.loadManifest().pipe(map(() => this.docs.getComponent(params.get('slug') ?? ''))),
      ),
    ),
  );

  protected readonly sidebar = viewChild.required<DocsSidebarComponent>('sidebar');
  private readonly pageToc = viewChild(PageTocDirective);

  constructor() {
    toObservable(this.component).pipe(
      filter(Boolean),
      switchMap(() => this.appRef.isStable.pipe(filter(Boolean), take(1))),
    ).subscribe(() => this.pageToc()?.refresh());
  }
}
```

- [ ] **Step 2: Update component-doc.html — add top bar and backdrop**

Replace the full file with:
```html
<div class="docs-layout">
  <!-- Mobile top bar -->
  <header class="mobile-topbar">
    <button
      class="hamburger"
      type="button"
      [attr.aria-label]="sidebar().open() ? 'Close navigation' : 'Open navigation'"
      [attr.aria-expanded]="sidebar().open()"
      (click)="sidebar().toggle()"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>
    <a routerLink="/" class="topbar-logo" aria-label="kouji home">
      <svg width="20" height="20" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="10" y1="10" x2="10" y2="54" stroke="#b8f500" stroke-width="6" stroke-linecap="round"/>
        <line x1="10" y1="32" x2="34" y2="10" stroke="#b8f500" stroke-width="6" stroke-linecap="round"/>
        <line x1="10" y1="32" x2="34" y2="54" stroke="#b8f500" stroke-width="6" stroke-linecap="round"/>
        <path d="M50 24 L50 48 Q50 56 42 56 Q38 56 36 54" stroke="#f0ede6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="50" cy="14" r="4" fill="#f0ede6"/>
      </svg>
      <span class="topbar-name">kouji</span>
    </a>
  </header>

  <!-- Backdrop (mobile only) -->
  <div
    class="sidebar-backdrop"
    [class.visible]="sidebar().open()"
    (click)="sidebar().close()"
    aria-hidden="true"
  ></div>

  <aside class="sidebar" [class.drawer-open]="sidebar().open()">
    <kj-docs-sidebar #sidebar />
  </aside>

  <main class="doc-main" kjPageToc #pageToc="kjPageToc">
    @if (component(); as comp) {
      <header class="doc-header">
        <span class="tag">{{ comp.category }}</span>
        <h1>{{ comp.name }}</h1>
        @if (comp.description) {
          <p class="doc-desc">{{ comp.description }}</p>
        }
      </header>

      @for (directive of comp.directives; track directive.className) {
        <section
          class="directive-section"
          [id]="directive.className"
          [attr.data-toc-entry]="directive.selector"
          data-toc-level="2"
        >
          <div class="directive-header">
            <code class="directive-selector">{{ directive.selector }}</code>
            <span class="directive-class">{{ directive.className }}</span>
          </div>

          @if (directive.description) {
            <p class="directive-desc">{{ directive.description }}</p>
          }

          @if (directive.inputs.length) {
            <div class="inputs-block">
              <h3 class="block-title">Inputs</h3>
              <div class="inputs-table">
                <div class="inputs-header">
                  <span>Name</span>
                  <span>Type</span>
                  <span>Default</span>
                  <span>Description</span>
                </div>
                @for (inp of directive.inputs; track inp.name) {
                  <div class="input-row">
                    <code class="inp-name">
                      {{ inp.name }}
                      @if (inp.required) {<span class="required">*</span>}
                    </code>
                    <code class="inp-type">{{ inp.type }}</code>
                    <code class="inp-default">{{ inp.defaultValue ?? '—' }}</code>
                    <span class="inp-desc">{{ inp.description || '—' }}</span>
                  </div>
                }
              </div>
              <p class="required-note">* required</p>
            </div>
          }

          @if (directive.docExamples.length) {
            <div class="examples-block">
              <h3 class="block-title">Examples</h3>
              @for (docEx of directive.docExamples; track docEx.label; let i = $index) {
                <div
                  class="example-section"
                  [id]="directive.className + '-ex-' + i"
                  [attr.data-toc-entry]="'○ ' + docEx.label"
                  data-toc-level="3"
                >
                  <div class="example-label">{{ docEx.label }}</div>
                  <kj-code-preview
                    [docExamples]="[docEx]"
                    [componentName]="comp.name"
                  />
                </div>
              }
            </div>
          } @else if (directive.examples.length || directive.exampleFiles.length) {
            <div class="examples-block">
              <h3 class="block-title">Example</h3>
              @if (directive.exampleFiles.length) {
                <kj-code-preview
                  [examples]="directive.exampleFiles"
                  [themedExamples]="directive.themedExamples"
                  [componentName]="comp.name"
                />
              } @else if (directive.examples.length) {
                @for (ex of directive.examples; track $index) {
                  <kj-code-editor
                    [code]="ex"
                    [lang]="ex.trimStart().startsWith('<') ? 'html' : 'ts'"
                  />
                }
              }
            </div>
          }
        </section>
      }
    } @else {
      <div class="not-found">
        <p>Component not found.</p>
        <a routerLink="/docs">← Back to docs</a>
      </div>
    }
  </main>

  <aside class="toc-col">
    <kj-page-toc [toc]="pageToc" />
  </aside>
</div>
```

- [ ] **Step 3: Update component-doc.css — add mobile styles**

Append to the end of the existing CSS file (after the last `@media` block):
```css
/* ── Mobile top bar ── */
.mobile-topbar {
  display: none;
}

/* ── Sidebar backdrop ── */
.sidebar-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 150;
  opacity: 0;
  transition: opacity 0.25s ease;
}
.sidebar-backdrop.visible {
  opacity: 1;
}

/* ── Mobile responsive overrides ── */
@media (max-width: 768px) {
  .docs-layout {
    grid-template-columns: 1fr;
    padding-top: 56px;
  }

  .mobile-topbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 56px;
    padding: 0 1rem;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
    z-index: 100;
  }

  .hamburger {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.375rem;
    display: flex;
    align-items: center;
    transition: color 0.15s;
    flex-shrink: 0;
  }
  .hamburger:hover { color: var(--text); }

  .topbar-logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    opacity: 0.85;
    transition: opacity 0.15s;
  }
  .topbar-logo:hover { opacity: 1; }

  .topbar-name {
    font-family: 'Syne', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.02em;
  }

  .sidebar-backdrop {
    display: block;
  }

  /* Sidebar becomes a fixed drawer */
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100dvh;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    background: var(--bg-surface);
    border-right: 1px solid var(--border);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }

  .sidebar.drawer-open {
    transform: translateX(0);
  }

  .doc-main {
    padding: 2rem 1.25rem 4rem;
  }

  h1 {
    font-size: 2.25rem;
  }

  .inputs-header, .input-row {
    grid-template-columns: 130px 120px 90px 1fr;
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm --filter docs exec tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/pages/component-doc/
git commit -m "feat(docs): mobile top bar and sidebar drawer for component-doc page"
```

---

## Task 5: Mobile layout — docs-index

**Files:**
- Modify: `apps/docs/src/app/pages/docs-index/docs-index.ts`
- Modify: `apps/docs/src/app/pages/docs-index/docs-index.html`
- Modify: `apps/docs/src/app/pages/docs-index/docs-index.css`

- [ ] **Step 1: Add `viewChild` for sidebar to docs-index.ts**

Replace the full file with:
```typescript
import { Component, inject, OnInit, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocsService, ComponentDoc } from '../../services/docs.service';
import { DocsSidebarComponent } from '../../components/docs-sidebar/docs-sidebar';

@Component({
  selector: 'app-docs-index',
  standalone: true,
  imports: [RouterLink, DocsSidebarComponent],
  templateUrl: './docs-index.html',
  styleUrl: './docs-index.css',
})
export class DocsIndexComponent implements OnInit {
  protected readonly docs = inject(DocsService);
  protected readonly categories = ['base', 'inputs', 'navigation', 'overlays', 'data', 'display', 'a11y'] as const;
  protected readonly components = this.docs.components;
  protected readonly sidebar = viewChild.required<DocsSidebarComponent>('sidebar');

  ngOnInit(): void {
    this.docs.loadManifest().subscribe();
  }

  protected byCategory(cat: string): ComponentDoc[] {
    return this.docs.byCategory(cat as ComponentDoc['category']);
  }
}
```

- [ ] **Step 2: Update docs-index.html — add top bar and backdrop**

Replace the full file with:
```html
<div class="docs-layout">
  <!-- Mobile top bar -->
  <header class="mobile-topbar">
    <button
      class="hamburger"
      type="button"
      [attr.aria-label]="sidebar().open() ? 'Close navigation' : 'Open navigation'"
      [attr.aria-expanded]="sidebar().open()"
      (click)="sidebar().toggle()"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>
    <a routerLink="/" class="topbar-logo" aria-label="kouji home">
      <svg width="20" height="20" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="10" y1="10" x2="10" y2="54" stroke="#b8f500" stroke-width="6" stroke-linecap="round"/>
        <line x1="10" y1="32" x2="34" y2="10" stroke="#b8f500" stroke-width="6" stroke-linecap="round"/>
        <line x1="10" y1="32" x2="34" y2="54" stroke="#b8f500" stroke-width="6" stroke-linecap="round"/>
        <path d="M50 24 L50 48 Q50 56 42 56 Q38 56 36 54" stroke="#f0ede6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="50" cy="14" r="4" fill="#f0ede6"/>
      </svg>
      <span class="topbar-name">kouji</span>
    </a>
  </header>

  <!-- Backdrop (mobile only) -->
  <div
    class="sidebar-backdrop"
    [class.visible]="sidebar().open()"
    (click)="sidebar().close()"
    aria-hidden="true"
  ></div>

  <aside class="sidebar" [class.drawer-open]="sidebar().open()">
    <kj-docs-sidebar #sidebar />
  </aside>

  <main class="docs-main">
    <div class="docs-hero">
      <span class="tag">Documentation</span>
      <h1>Components</h1>
      <p>{{ components().length }} components across {{ categories.length }} categories. All headless, all WCAG AAA.</p>
    </div>
    @for (cat of categories; track cat) {
      @if (byCategory(cat).length) {
        <section class="category-section">
          <h2 class="category-title">{{ cat }}</h2>
          <div class="component-grid">
            @for (comp of byCategory(cat); track comp.slug) {
              <a [routerLink]="['/docs/components', comp.slug]" class="component-card">
                <span class="card-name">{{ comp.name }}</span>
                <span class="card-count">{{ comp.directives.length }} directive{{ comp.directives.length !== 1 ? 's' : '' }}</span>
                <p class="card-desc">{{ comp.description || comp.directives[0]?.description }}</p>
                <span class="card-arrow">→</span>
              </a>
            }
          </div>
        </section>
      }
    }
  </main>
  <aside class="toc-col"></aside>
</div>
```

- [ ] **Step 3: Update docs-index.css — add mobile styles**

Append to the end of the existing CSS file (after the last `@media` block):
```css
/* ── Mobile top bar ── */
.mobile-topbar {
  display: none;
}

/* ── Sidebar backdrop ── */
.sidebar-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 150;
  opacity: 0;
  transition: opacity 0.25s ease;
}
.sidebar-backdrop.visible {
  opacity: 1;
}

/* ── Mobile responsive overrides ── */
@media (max-width: 768px) {
  .docs-layout {
    grid-template-columns: 1fr;
    padding-top: 56px;
  }

  .mobile-topbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 56px;
    padding: 0 1rem;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
    z-index: 100;
  }

  .hamburger {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.375rem;
    display: flex;
    align-items: center;
    transition: color 0.15s;
    flex-shrink: 0;
  }
  .hamburger:hover { color: var(--text); }

  .topbar-logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    opacity: 0.85;
    transition: opacity 0.15s;
  }
  .topbar-logo:hover { opacity: 1; }

  .topbar-name {
    font-family: 'Syne', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.02em;
  }

  .sidebar-backdrop {
    display: block;
  }

  /* Sidebar becomes a fixed drawer */
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100dvh;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    background: var(--bg-surface);
    border-right: 1px solid var(--border);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }

  .sidebar.drawer-open {
    transform: translateX(0);
  }

  .docs-main {
    padding: 2rem 1.25rem 4rem;
  }

  h1 {
    font-size: 2.25rem;
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm --filter docs exec tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/pages/docs-index/
git commit -m "feat(docs): mobile top bar and sidebar drawer for docs-index page"
```

---

## Task 6: Manual verification

- [ ] **Step 1: Start dev server**

Run from workspace root: `pnpm --filter docs dev`

- [ ] **Step 2: Open browser DevTools → device emulation (iPhone 390px)**

Navigate to `http://localhost:4200/docs`

Expected:
- Top bar visible with hamburger (☰) and kouji logo
- Desktop sidebar not visible
- Content fills full width

- [ ] **Step 3: Test hamburger open/close**

- Tap hamburger → sidebar slides in from left, backdrop appears
- Tap backdrop → sidebar slides out
- Open sidebar, tap a nav link → sidebar closes, page navigates

- [ ] **Step 4: Test Escape key**

- Open sidebar → press Escape → sidebar closes

- [ ] **Step 5: Test body scroll lock**

- Open sidebar → try scrolling the page behind it → page should not scroll

- [ ] **Step 6: Test on component page**

Navigate to any component (e.g. `/docs/components/button`) — same top bar and drawer should work

- [ ] **Step 7: Verify desktop unchanged**

Resize to >768px → sidebar appears in left rail as before, top bar hidden

- [ ] **Final commit (if any fixes needed)**

```bash
git add -p
git commit -m "fix(docs): mobile layout adjustments"
```
