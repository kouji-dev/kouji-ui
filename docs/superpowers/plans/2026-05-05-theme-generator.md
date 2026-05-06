# Theme Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/theme-generator` page (multi-theme save/load/delete, scoped live preview, font/shape/motion controls, JSON import / CSS export), the sidebar nav-pill rework that introduces it, and a small `kj-input` enhancement supporting `type="color"`.

**Architecture:** A single `ThemeDraftService` (Angular signals) owns the in-progress draft theme. Pure derivation/serialization functions compute resolved tokens and emit a scoped CSS block (`[data-theme="custom-draft"] { … }`) injected into `<head>`. The preview pane wraps its content in `<div data-theme="custom-draft">` so the cascade applies the draft only inside that scope, leaving the rest of the page on whatever global theme the user has selected.

**Tech Stack:** Angular 21 (signals, standalone components, `input()`), `@kouji-ui/components` (kj-input, kj-card, kj-button, kj-callout-equivalent), `@kouji-ui/themes`, vitest + @analogjs/vite-plugin-angular for tests, `culori` for OKLCH parsing/manipulation, `zod` for JSON import schema.

**Phasing:** Three phases — A (foundation), B (state + colors-only editor), C (full controls + import/export + preview polish). Phases are sequential; each phase ships working software.

---

## Setup (before any task)

- [ ] **S1: Confirm working directory & branch**

```bash
pwd                                       # /c/Users/narut/Desktop/projects/kouji
git status                                # ensure clean before starting
git checkout -b feat/theme-generator      # if not already on a feature branch
```

- [ ] **S2: Add new runtime deps to root**

```bash
pnpm add culori
pnpm add zod -F docs
pnpm add -D @types/culori -w
```

Expected: `culori` (≥4.0) added to root `dependencies`, `zod` to `apps/docs/package.json`, `@types/culori` to root devDeps.

---

## PHASE A — Foundation

Lands a working sidebar pill rework, the new route (placeholder page), and the `kj-input type="color"` capability. Nothing user-functional in the generator yet — but everything is wired so Phase B can plug into the surface.

### Task A1: `kj-input` — add `'color'` to type union + `data-type` host attr

**Files:**
- Modify: `packages/components/src/input/input.ts`
- Modify: `packages/components/src/input/input.css`
- Modify: `packages/components/src/input/input.spec.ts`

- [ ] **Step 1: Write failing tests for `type="color"` and `value` forwarding**

Replace the test file entirely (`packages/components/src/input/input.spec.ts`) so the host exercises both new capabilities:

```ts
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjInputComponent } from './input';

@Component({
  standalone: true,
  imports: [KjInputComponent],
  template: `<kj-input [type]="type" [value]="value" [placeholder]="placeholder" [invalid]="invalid" [disabled]="disabled" />`,
})
class HostComponent {
  type: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url' | 'color' = 'text';
  value = '';
  placeholder = '';
  invalid = false;
  disabled = false;
}

describe('KjInputComponent', () => {
  beforeEach(() => { TestBed.configureTestingModule({ imports: [HostComponent] }); });

  test('renders an inner <input> with the .kj-input class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input input.kj-input')).not.toBeNull();
  });

  test('forwards type to the inner element', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.type = 'email';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input input').getAttribute('type')).toBe('email');
  });

  test('renders <input type="color"> when type=color', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.type = 'color';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input input').getAttribute('type')).toBe('color');
  });

  test('mirrors type to data-type attr on host', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.type = 'color';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input').getAttribute('data-type')).toBe('color');
  });

  test('forwards value to the inner element', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.type = 'color';
    fixture.componentInstance.value = '#b8f500';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input input').value).toBe('#b8f500');
  });

  test('forwards placeholder', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.placeholder = 'you@example.com';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input input').getAttribute('placeholder')).toBe('you@example.com');
  });

  test('forwards invalid → aria-invalid (after blur)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.invalid = true;
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('kj-input input');
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  test('forwards disabled → aria-disabled', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input input').getAttribute('aria-disabled')).toBe('true');
  });
});
```

- [ ] **Step 2: Run tests — expect new ones to fail**

```bash
pnpm --filter @kouji-ui/components test -- input.spec
```

Expected: failures around `type="color"` not accepted by union, `data-type` attr missing, and `value` attr not forwarded.

- [ ] **Step 3: Update `input.ts` — widen union, add `value` input, add host `data-type` binding**

Replace `packages/components/src/input/input.ts` content:

```ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjInput } from '@kouji-ui/core';

export type KjInputType = 'text' | 'email' | 'password' | 'number'
                        | 'search' | 'tel' | 'url' | 'color';

/**
 * Styled wrapper around the headless KjInput directive.
 *
 * Element-wrapper pattern: <kj-input> is structural shell; inner <input>
 * carries native input semantics (focus, form integration, validation).
 *
 * @example
 * ```html
 * <kj-input type="email" placeholder="you@example.com" [invalid]="emailCtrl.invalid" />
 * <kj-input type="color" [(ngModel)]="hex" />
 * ```
 * @doc
 *   @doc-file input.example.ts
 *   @doc-file input.color.example.ts
 * @category Library/Base
 */
@Component({
  selector: 'kj-input',
  standalone: true,
  imports: [KjInput],
  template: `
    <input
      kjInput
      class="kj-input"
      [type]="type()"
      [placeholder]="placeholder()"
      [kjInvalid]="invalid()"
      [kjDisabled]="disabled()"
    />
  `,
  styleUrl: './input.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'style': 'display: contents;',
    '[attr.data-type]': 'type()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjInputComponent {
  readonly type = input<KjInputType>('text');
  readonly placeholder = input<string>('');
  readonly invalid = input(false);
  readonly disabled = input(false);
}
```

> **NOTE (revised during implementation):** A `value` input was originally planned but reverted — the headless `kjInput` directive in `@kouji-ui/core` implements `ControlValueAccessor` and actively writes the form-control value back to the native `.value` on every change detection cycle, so a wrapper-level `[value]` binding cannot win. Consumers must use `[(ngModel)]` / `[formControl]` for value binding. The theme generator (Phase B/C) consequently uses raw `<input type="color">` for its swatches, NOT `<kj-input type="color">`, since the generator wants direct DOM property control without form integration.

- [ ] **Step 4: Add color-input CSS to `input.css`**

Append to `packages/components/src/input/input.css` (inside `@layer kj.component { … }`):

```css
  .kj-input[type="color"] {
    inline-size: 44px;
    block-size: 32px;
    padding: 2px;
    cursor: pointer;
  }
```

- [ ] **Step 5: Run tests — expect all green**

```bash
pnpm --filter @kouji-ui/components test -- input.spec
```

Expected: all KjInputComponent tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/components/src/input/input.ts packages/components/src/input/input.css packages/components/src/input/input.spec.ts
git commit -m "feat(components): kj-input supports type=\"color\""
```

---

### Task A2: `kj-input` color example for docs

**Files:**
- Create: `packages/components/src/input/input.color.example.ts`

- [ ] **Step 1: Create the example component**

```ts
// packages/components/src/input/input.color.example.ts
import { Component, signal } from '@angular/core';
import { KjInputComponent } from './input';

/**
 * Color picker example — uses the native <input type="color"> swatch
 * via the shared kj-input wrapper. Two-way bound to a signal.
 */
@Component({
  selector: 'kj-input-color-example',
  standalone: true,
  imports: [KjInputComponent],
  styles: [`
    :host { display: flex; gap: var(--kj-space-md); align-items: center;
            padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    code { font: var(--kj-text-sm)/1 var(--kj-font-mono); color: var(--kj-color-neutral); }
  `],
  template: `
    <kj-input
      type="color"
      [value]="hex()"
      (input)="hex.set($any($event.target).value)" />
    <code>{{ hex() }}</code>
  `,
})
export class KjInputColorExample {
  readonly hex = signal('#b8f500');
}
```

- [ ] **Step 2: Verify it builds**

```bash
pnpm --filter @kouji-ui/components run build
```

Expected: build succeeds; `dist/kj-components/...` updated.

- [ ] **Step 3: Commit**

```bash
git add packages/components/src/input/input.color.example.ts
git commit -m "docs(components): add color example for kj-input"
```

---

### Task A3: Sidebar — add nav pills (`Docs` / `Theme Generator`)

**Files:**
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.ts`
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.html`
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.css`

- [ ] **Step 1: Extend the view union and add active-pill state in `docs-sidebar.ts`**

Replace the `SidebarView` type and add a `topSection` computed signal:

```ts
// Replace existing SidebarView export
export type TopSection = 'docs' | 'generator';
export type SidebarView = 'menu' | string;     // unchanged: 'menu' | trackId

// Inside DocsSidebarComponent class, add (after `view` signal):
protected readonly topSection = computed<TopSection>(() =>
  this.router.url.startsWith('/theme-generator') ? 'generator' : 'docs'
);
```

Also update the `trackFromUrl` method — when URL is `/theme-generator*`, return null (not a track), so docs view stays on whatever it was. No change needed; existing logic returns null for unknown prefixes. ✓

- [ ] **Step 2: Add pill markup at top of sidebar (between `.sidebar-top` and `.sidebar-nav`)**

Edit `apps/docs/src/app/components/docs-sidebar/docs-sidebar.html`. After the closing `</div>` of `.sidebar-top` (line 54), insert:

```html
<div class="sidebar-pills" role="tablist" aria-label="Sections">
  <a
    role="tab"
    [attr.aria-selected]="topSection() === 'docs'"
    [class.active]="topSection() === 'docs'"
    routerLink="/docs"
    class="sidebar-pill"
    (click)="close()"
  >Docs</a>
  <a
    role="tab"
    [attr.aria-selected]="topSection() === 'generator'"
    [class.active]="topSection() === 'generator'"
    routerLink="/theme-generator"
    class="sidebar-pill"
    (click)="close()"
  >Theme Generator</a>
</div>
```

- [ ] **Step 3: Add pill CSS**

Append to `apps/docs/src/app/components/docs-sidebar/docs-sidebar.css`:

```css
/* Top-section nav pills (Docs / Theme Generator) */
.sidebar-pills {
  flex-shrink: 0;
  display: flex;
  gap: var(--kj-space-xs);
  padding: var(--kj-space-md) var(--kj-space-xl);
  border-bottom: 1px solid var(--kj-color-base-300);
}
.sidebar-pill {
  flex: 1;
  text-align: center;
  padding: var(--kj-space-xs) var(--kj-space-sm);
  font: 0.75rem/1 var(--kj-font-mono);
  color: var(--kj-color-neutral);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--kj-radius-selector);
  text-decoration: none;
  cursor: pointer;
  transition: var(--kj-transition);
}
.sidebar-pill:hover { color: var(--kj-color-base-content); }
.sidebar-pill.active {
  color: var(--kj-color-base-content);
  background: var(--kj-color-base-200);
  border-color: var(--kj-color-base-300);
}
@media (max-width: 220px) {
  .sidebar-pills { flex-wrap: wrap; }
}
```

- [ ] **Step 4: Manual verify**

```bash
pnpm --filter docs run dev
```

Open http://localhost:4200/docs and http://localhost:4200/theme-generator (the second will 404 / redirect to home for now — that's fine; we just want to confirm the pill highlights correctly when URL prefix matches).

Expected: on `/docs/*` the "Docs" pill is highlighted; on `/theme-generator` the "Theme Generator" pill is highlighted. (Visiting /theme-generator before Task A4 will redirect; manually type the URL and check the pill state during the brief render.)

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/components/docs-sidebar/
git commit -m "feat(docs): add sidebar nav pills (Docs / Theme Generator)"
```

---

### Task A4: Skeleton `/theme-generator` route + page

**Files:**
- Create: `apps/docs/src/app/pages/theme-generator/theme-generator.ts`
- Create: `apps/docs/src/app/pages/theme-generator/theme-generator.html`
- Create: `apps/docs/src/app/pages/theme-generator/theme-generator.css`
- Modify: `apps/docs/src/app/app.routes.ts`

- [ ] **Step 1: Create the placeholder component**

`apps/docs/src/app/pages/theme-generator/theme-generator.ts`:

```ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DocsSidebarComponent } from '../../components/docs-sidebar/docs-sidebar';

@Component({
  selector: 'kj-theme-generator',
  standalone: true,
  imports: [DocsSidebarComponent],
  templateUrl: './theme-generator.html',
  styleUrl: './theme-generator.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorComponent {}
```

`apps/docs/src/app/pages/theme-generator/theme-generator.html`:

```html
<div class="docs-layout">
  <aside class="sidebar">
    <kj-docs-sidebar />
  </aside>
  <main class="generator-main">
    <p class="placeholder">Theme generator coming soon.</p>
  </main>
</div>
```

`apps/docs/src/app/pages/theme-generator/theme-generator.css`:

```css
.docs-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  height: 100vh;
  overflow: hidden;
}
.sidebar {
  background: var(--kj-color-base-200);
  border-right: 1px solid var(--kj-color-base-300);
  overflow: hidden;
}
.generator-main {
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.placeholder {
  color: var(--kj-color-neutral);
  font: var(--kj-text-sm) var(--kj-font-mono);
}
```

- [ ] **Step 2: Register the route (BEFORE the `**` wildcard)**

Edit `apps/docs/src/app/app.routes.ts`. After the last `docs/components/:slug` route (line 33) and BEFORE the `'**'` route, insert:

```ts
  {
    path: 'theme-generator',
    loadComponent: () => import('./pages/theme-generator/theme-generator')
      .then(m => m.ThemeGeneratorComponent),
  },
```

- [ ] **Step 3: Manual verify**

```bash
pnpm --filter docs run dev
```

Visit http://localhost:4200/theme-generator. Expected: sidebar renders on left with Theme Generator pill active, "Theme generator coming soon." centered in main.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/app/pages/theme-generator/ apps/docs/src/app/app.routes.ts
git commit -m "feat(docs): scaffold /theme-generator route + placeholder page"
```

---

### Task A5: Sidebar — `Theme Generator` section content (built-in + my-themes lists, scaffolded)

**Files:**
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.ts`
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.html`
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.css`

- [ ] **Step 1: Add a built-in theme list constant in `docs-sidebar.ts`**

At the top of the file (after imports), add a TEMPORARY constant — Task B6 step 4 will replace this with an import from `built-in-themes.ts` once that file exists:

```ts
// TEMPORARY — replaced in Phase B Task B6 by `import { BUILT_IN_NAMES } from '../../lib/theme/built-in-themes';`
const BUILT_IN_THEME_NAMES = ['kouji', 'dark', 'light', 'retro', 'cyberpunk', 'corporate'] as const;
type BuiltInName = typeof BUILT_IN_THEME_NAMES[number];
```

Inside `DocsSidebarComponent`, add:

```ts
protected readonly builtInThemes = BUILT_IN_THEME_NAMES;
// Stub for now; wired to ThemeDraftService in Phase B Task B6
protected readonly myThemes = signal<string[]>([]);

protected onForkBuiltIn(_name: BuiltInName): void { this.close(); }
protected onLoadSaved(_name: string): void { this.close(); }
protected onNewTheme(): void { this.close(); }
```

- [ ] **Step 2: Add the section markup in `docs-sidebar.html`**

After the existing `</nav>` closing tag (line 134), add a new section that's only visible when the Theme Generator pill is active:

```html
@if (topSection() === 'generator') {
  <nav class="sidebar-nav" aria-label="Theme generator navigation">
    <div class="sidebar-section">
      <button
        class="sidebar-category"
        type="button"
        [attr.aria-expanded]="!isCategoryCollapsed('gen-builtin')"
        (click)="toggleCategory('gen-builtin')"
      >
        <span>Built-in themes</span>
        <svg class="sidebar-chevron" [class.collapsed]="isCategoryCollapsed('gen-builtin')"
             width="10" height="10" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      @if (!isCategoryCollapsed('gen-builtin')) {
        <div class="sidebar-section-items">
          @for (name of builtInThemes; track name) {
            <a routerLink="/theme-generator" class="sidebar-link"
               (click)="onForkBuiltIn(name)">{{ name }}</a>
          }
        </div>
      }
    </div>

    <div class="sidebar-section">
      <button
        class="sidebar-category"
        type="button"
        [attr.aria-expanded]="!isCategoryCollapsed('gen-mine')"
        (click)="toggleCategory('gen-mine')"
      >
        <span>My themes</span>
        <svg class="sidebar-chevron" [class.collapsed]="isCategoryCollapsed('gen-mine')"
             width="10" height="10" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      @if (!isCategoryCollapsed('gen-mine')) {
        <div class="sidebar-section-items">
          @for (name of myThemes(); track name) {
            <a routerLink="/theme-generator" class="sidebar-link"
               (click)="onLoadSaved(name)">{{ name }}</a>
          } @empty {
            <p class="sidebar-empty">No saved themes yet.</p>
          }
          <a routerLink="/theme-generator" class="sidebar-link sidebar-link-special"
             (click)="onNewTheme()">+ New theme</a>
        </div>
      }
    </div>
  </nav>
}
```

Wrap the existing `<nav class="sidebar-nav" aria-label="Documentation navigation">` (line 56) in:

```html
@if (topSection() === 'docs') {
  <!-- existing nav unchanged -->
}
```

- [ ] **Step 3: Add `.sidebar-empty` CSS**

Append to `apps/docs/src/app/components/docs-sidebar/docs-sidebar.css`:

```css
.sidebar-empty {
  padding: var(--kj-space-sm) var(--kj-space-md);
  font: var(--kj-text-xs) var(--kj-font-mono);
  color: var(--kj-color-neutral);
  margin: 0;
}
```

- [ ] **Step 4: Manual verify**

```bash
pnpm --filter docs run dev
```

Visit http://localhost:4200/theme-generator. Expected: sidebar shows two collapsible groups (Built-in themes with 6 entries, My themes empty + "+ New theme" link). Click pills to switch between Docs / Theme Generator content.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/components/docs-sidebar/
git commit -m "feat(docs): theme generator sidebar section (built-in + my themes lists)"
```

---

### Phase A checkpoint

At this point: pills work, the new route renders, sidebar Theme Generator section shows with stub click handlers. No theme generation yet. Pause here if you want to land Phase A as a separate PR.

---

## PHASE B — Editor core (state, derivation, colors-only editor, scoped preview)

Lands the working editor for colors only — user can fork a built-in, edit color slots, see live preview in the scoped pane, save/load via localStorage. Shape/type/motion controls and import/export come in Phase C.

### Task B1: Vitest config for `apps/docs`

**Files:**
- Create: `apps/docs/vite.config.ts`
- Create: `apps/docs/src/test-setup.ts`
- Modify: `vitest.workspace.ts`
- Modify: `apps/docs/package.json`

- [ ] **Step 1: Create `apps/docs/vite.config.ts`**

```ts
import { defineProject } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import { resolve } from 'node:path';

export default defineProject({
  plugins: [angular()],
  resolve: {
    alias: {
      '@kouji-ui/core':       resolve(__dirname, '../../packages/core/src/public-api.ts'),
      '@kouji-ui/components': resolve(__dirname, '../../packages/components/src/public-api.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
  },
});
```

- [ ] **Step 2: Create `apps/docs/src/test-setup.ts`**

```ts
import '@analogjs/vite-plugin-angular/setup-vitest';
```

- [ ] **Step 3: Add docs project to `vitest.workspace.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/core/vite.config.ts',
      'packages/themes/vite.config.ts',
      'packages/components/vite.config.ts',
      'apps/docs/vite.config.ts',
    ],
  },
});
```

- [ ] **Step 4: Add `test` script to `apps/docs/package.json`**

In `apps/docs/package.json` `scripts`, add:

```json
    "test": "vitest run"
```

- [ ] **Step 5: Verify it runs (no tests yet)**

```bash
pnpm --filter docs test
```

Expected: vitest runs, reports "no tests found" or 0 passed without errors.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/vite.config.ts apps/docs/src/test-setup.ts apps/docs/package.json vitest.workspace.ts
git commit -m "build(docs): add vitest project for unit tests"
```

---

### Task B2: Pure derivation functions (`derive-tokens.ts`) + tests

**Files:**
- Create: `apps/docs/src/app/lib/theme/types.ts`
- Create: `apps/docs/src/app/lib/theme/derive-tokens.ts`
- Create: `apps/docs/src/app/lib/theme/derive-tokens.spec.ts`

- [ ] **Step 1: Create the types module**

`apps/docs/src/app/lib/theme/types.ts`:

```ts
export type ColorSlot =
  | 'base-100' | 'primary' | 'secondary' | 'accent' | 'neutral'
  | 'info' | 'success' | 'warning' | 'destructive';

export type ContentSlot =
  | 'base-content'
  | 'primary-content' | 'secondary-content' | 'accent-content' | 'neutral-content'
  | 'info-content' | 'success-content' | 'warning-content' | 'destructive-content';

export type ShapeKey   = 'radiusBox' | 'radiusField' | 'radiusSelector' | 'border' | 'depth';
export type FontKey    = 'fontSans'  | 'fontMono'    | 'fontDisplay';
export type MotionKey  = 'transition';

export interface DraftTheme {
  name: string;
  colors: Record<ColorSlot, string>;
  contentOverrides: Partial<Record<ContentSlot, string>>;
  shape:  Record<ShapeKey, number>;       // border + depth as numbers; radii in px
  type:   Record<FontKey, string>;        // CSS font-family stacks
  motion: Record<MotionKey, string>;      // CSS transition value
}

export interface ResolvedTokens {
  colors: Record<ColorSlot, string>;
  derivedBase: { base200: string; base300: string };
  contents: Record<ContentSlot, string>;
  shape:  Record<ShapeKey, string>;       // serialized w/ units
  type:   Record<FontKey, string>;
  motion: Record<MotionKey, string>;
}
```

- [ ] **Step 2: Write failing tests for derivation**

`apps/docs/src/app/lib/theme/derive-tokens.spec.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { deriveContent, deriveBaseShades, deriveTokens } from './derive-tokens';
import type { DraftTheme } from './types';

describe('deriveContent', () => {
  test('light slot (L > 60) → dark content', () => {
    const c = deriveContent('oklch(98% 0.002 247)');
    expect(c).toMatch(/^oklch\(15%/);
  });

  test('dark slot (L ≤ 60) → light content', () => {
    const c = deriveContent('oklch(20% 0.05 250)');
    expect(c).toMatch(/^oklch\(98%/);
  });

  test('hue is inherited from slot', () => {
    const c = deriveContent('oklch(50% 0.2 145)');
    expect(c).toContain('145');
  });
});

describe('deriveBaseShades', () => {
  test('light base → darker 200/300', () => {
    const { base200, base300 } = deriveBaseShades('oklch(98% 0.002 247)');
    expect(base200).toMatch(/^oklch\(94%/);
    expect(base300).toMatch(/^oklch\(90%/);
  });

  test('dark base → lighter 200/300', () => {
    const { base200, base300 } = deriveBaseShades('oklch(15% 0.01 0)');
    expect(base200).toMatch(/^oklch\(19%/);
    expect(base300).toMatch(/^oklch\(23%/);
  });
});

describe('deriveTokens — content overrides', () => {
  test('manual override wins over derivation', () => {
    const draft: DraftTheme = MOCK_DRAFT();
    draft.contentOverrides['primary-content'] = 'oklch(50% 0.1 0)';
    const out = deriveTokens(draft);
    expect(out.contents['primary-content']).toBe('oklch(50% 0.1 0)');
  });

  test('without override, content is derived from slot', () => {
    const draft = MOCK_DRAFT();
    draft.colors.primary = 'oklch(95% 0.05 240)';
    const out = deriveTokens(draft);
    expect(out.contents['primary-content']).toMatch(/^oklch\(15%/);
  });
});

function MOCK_DRAFT(): DraftTheme {
  return {
    name: 'test',
    colors: {
      'base-100':    'oklch(98% 0.002 247)',
      'primary':     'oklch(57% 0.245 27)',
      'secondary':   'oklch(44% 0.03 256)',
      'accent':      'oklch(60% 0.12 184)',
      'neutral':     'oklch(44% 0.03 256)',
      'info':        'oklch(54% 0.245 262)',
      'success':     'oklch(64% 0.2 131)',
      'warning':     'oklch(66% 0.179 58)',
      'destructive': 'oklch(57% 0.245 27)',
    },
    contentOverrides: {},
    shape:  { radiusBox: 8, radiusField: 4, radiusSelector: 4, border: 1, depth: 1 },
    type:   { fontSans: 'system-ui', fontMono: 'monospace', fontDisplay: 'system-ui' },
    motion: { transition: '0.2s ease' },
  };
}
```

- [ ] **Step 3: Run tests — expect failures (module not found)**

```bash
pnpm --filter docs test -- derive-tokens
```

Expected: cannot find module `./derive-tokens`.

- [ ] **Step 4: Implement `derive-tokens.ts`**

```ts
// apps/docs/src/app/lib/theme/derive-tokens.ts
import { oklch as parseOklch, formatCss } from 'culori';
import type { DraftTheme, ResolvedTokens, ColorSlot, ContentSlot } from './types';

const CONTENT_FOR: Record<Exclude<ColorSlot,'base-100'>, ContentSlot> = {
  primary: 'primary-content', secondary: 'secondary-content', accent: 'accent-content',
  neutral: 'neutral-content', info: 'info-content', success: 'success-content',
  warning: 'warning-content', destructive: 'destructive-content',
};

/** Parse an OKLCH string and return {l (0–100), c, h} or null if unparseable. */
function parseOklchTriple(css: string): { l: number; c: number; h: number } | null {
  const parsed = parseOklch(css);
  if (!parsed) return null;
  // culori returns l on [0,1]; normalize to 0–100 for our threshold logic.
  return { l: parsed.l * 100, c: parsed.c ?? 0, h: parsed.h ?? 0 };
}

/** Format an OKLCH back to the `oklch(XX% c h)` CSS string used in our themes. */
function formatOklch(l: number, c: number, h: number): string {
  return `oklch(${Math.round(l)}% ${c.toFixed(3)} ${Math.round(h)})`;
}

/** Light slot → dark content; dark slot → light content. Hue tinted from slot. */
export function deriveContent(slotCss: string): string {
  const t = parseOklchTriple(slotCss);
  if (!t) return 'oklch(15% 0 0)';
  return t.l > 60
    ? formatOklch(15, 0.02, t.h)
    : formatOklch(98, 0.02, t.h);
}

/** Derive base-200 / base-300 from base-100 by ±0.04 / ±0.08 lightness. */
export function deriveBaseShades(base100Css: string): { base200: string; base300: string } {
  const t = parseOklchTriple(base100Css);
  if (!t) return { base200: base100Css, base300: base100Css };
  const isLight = t.l > 50;
  const dir = isLight ? -1 : +1;
  return {
    base200: formatOklch(t.l + dir * 4, t.c, t.h),
    base300: formatOklch(t.l + dir * 8, t.c, t.h),
  };
}

export function deriveTokens(draft: DraftTheme): ResolvedTokens {
  const { base200, base300 } = deriveBaseShades(draft.colors['base-100']);

  const contents = { 'base-content': deriveContent(draft.colors['base-100']) } as Record<ContentSlot, string>;
  for (const slot of Object.keys(CONTENT_FOR) as Array<keyof typeof CONTENT_FOR>) {
    const contentKey = CONTENT_FOR[slot];
    contents[contentKey] = draft.contentOverrides[contentKey] ?? deriveContent(draft.colors[slot]);
  }
  // base-content can also be overridden manually
  if (draft.contentOverrides['base-content']) {
    contents['base-content'] = draft.contentOverrides['base-content']!;
  }

  return {
    colors: draft.colors,
    derivedBase: { base200, base300 },
    contents,
    shape: {
      radiusBox:      `${draft.shape.radiusBox}px`,
      radiusField:    `${draft.shape.radiusField}px`,
      radiusSelector: `${draft.shape.radiusSelector}px`,
      border:         `${draft.shape.border}px`,
      depth:          `${draft.shape.depth}`,
    },
    type:   draft.type,
    motion: draft.motion,
  };
}
```

- [ ] **Step 5: Run tests — expect green**

```bash
pnpm --filter docs test -- derive-tokens
```

Expected: all 7 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/app/lib/theme/
git commit -m "feat(docs): pure token derivation for theme generator"
```

---

### Task B3: Serialize tokens to scoped CSS block + tests

**Files:**
- Create: `apps/docs/src/app/lib/theme/serialize-theme.ts`
- Create: `apps/docs/src/app/lib/theme/serialize-theme.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
// apps/docs/src/app/lib/theme/serialize-theme.spec.ts
import { describe, expect, test } from 'vitest';
import postcss from 'postcss';
import { serializeToScopedBlock } from './serialize-theme';
import { deriveTokens } from './derive-tokens';
import type { DraftTheme } from './types';

const DRAFT: DraftTheme = {
  name: 'my-theme',
  colors: {
    'base-100': 'oklch(98% 0.002 247)', primary: 'oklch(57% 0.24 27)',
    secondary: 'oklch(44% 0.03 256)', accent: 'oklch(60% 0.12 184)',
    neutral: 'oklch(44% 0.03 256)', info: 'oklch(54% 0.24 262)',
    success: 'oklch(64% 0.2 131)', warning: 'oklch(66% 0.18 58)',
    destructive: 'oklch(57% 0.24 27)',
  },
  contentOverrides: {},
  shape:  { radiusBox: 8, radiusField: 4, radiusSelector: 4, border: 1, depth: 1 },
  type:   { fontSans: 'Inter, system-ui', fontMono: 'JetBrains Mono', fontDisplay: 'Syne' },
  motion: { transition: '0.2s ease' },
};

describe('serializeToScopedBlock', () => {
  test('emits a [data-theme="X"] rule', () => {
    const css = serializeToScopedBlock('my-theme', deriveTokens(DRAFT));
    expect(css).toContain('[data-theme="my-theme"]');
  });

  test('includes every required token', () => {
    const css = serializeToScopedBlock('x', deriveTokens(DRAFT));
    const required = [
      '--kj-color-base-100', '--kj-color-base-200', '--kj-color-base-300', '--kj-color-base-content',
      '--kj-color-primary', '--kj-color-primary-content',
      '--kj-color-secondary', '--kj-color-secondary-content',
      '--kj-color-accent', '--kj-color-accent-content',
      '--kj-color-neutral', '--kj-color-neutral-content',
      '--kj-color-info', '--kj-color-info-content',
      '--kj-color-success', '--kj-color-success-content',
      '--kj-color-warning', '--kj-color-warning-content',
      '--kj-color-destructive', '--kj-color-destructive-content',
      '--kj-radius-box', '--kj-radius-field', '--kj-radius-selector',
      '--kj-border', '--kj-depth',
      '--kj-font-sans', '--kj-font-mono', '--kj-font-display',
      '--kj-transition',
    ];
    for (const t of required) expect(css).toContain(t);
  });

  test('produces syntactically valid CSS', () => {
    const css = serializeToScopedBlock('x', deriveTokens(DRAFT));
    expect(() => postcss.parse(css)).not.toThrow();
  });

  test('sets color-scheme based on base-100 lightness', () => {
    const cssLight = serializeToScopedBlock('x', deriveTokens(DRAFT));
    expect(cssLight).toMatch(/color-scheme:\s*light/);

    const dark = { ...DRAFT, colors: { ...DRAFT.colors, 'base-100': 'oklch(15% 0.01 0)' } };
    const cssDark = serializeToScopedBlock('x', deriveTokens(dark));
    expect(cssDark).toMatch(/color-scheme:\s*dark/);
  });
});
```

- [ ] **Step 2: Run tests — expect "module not found"**

```bash
pnpm --filter docs test -- serialize-theme
```

- [ ] **Step 3: Implement `serialize-theme.ts`**

```ts
// apps/docs/src/app/lib/theme/serialize-theme.ts
import { oklch as parseOklch } from 'culori';
import type { ResolvedTokens } from './types';

function colorScheme(base100: string): 'light' | 'dark' {
  const parsed = parseOklch(base100);
  if (!parsed) return 'light';
  return parsed.l * 100 > 50 ? 'light' : 'dark';
}

/**
 * Serialize resolved tokens to a scoped CSS block:
 *
 *   [data-theme="<name>"] {
 *     color-scheme: light;
 *     --kj-color-base-100: oklch(...);
 *     ...
 *   }
 */
export function serializeToScopedBlock(name: string, t: ResolvedTokens): string {
  const lines: string[] = [];
  lines.push(`color-scheme: ${colorScheme(t.colors['base-100'])};`);

  // colors (slots + derived base shades + contents)
  lines.push(`--kj-color-base-100: ${t.colors['base-100']};`);
  lines.push(`--kj-color-base-200: ${t.derivedBase.base200};`);
  lines.push(`--kj-color-base-300: ${t.derivedBase.base300};`);
  lines.push(`--kj-color-base-content: ${t.contents['base-content']};`);
  for (const slot of ['primary','secondary','accent','neutral','info','success','warning','destructive'] as const) {
    lines.push(`--kj-color-${slot}: ${t.colors[slot]};`);
    lines.push(`--kj-color-${slot}-content: ${t.contents[`${slot}-content`]};`);
  }

  // shape
  lines.push(`--kj-radius-box: ${t.shape.radiusBox};`);
  lines.push(`--kj-radius-field: ${t.shape.radiusField};`);
  lines.push(`--kj-radius-selector: ${t.shape.radiusSelector};`);
  lines.push(`--kj-border: ${t.shape.border};`);
  lines.push(`--kj-depth: ${t.shape.depth};`);

  // type
  lines.push(`--kj-font-sans: ${t.type.fontSans};`);
  lines.push(`--kj-font-mono: ${t.type.fontMono};`);
  lines.push(`--kj-font-display: ${t.type.fontDisplay};`);

  // motion
  lines.push(`--kj-transition: ${t.motion.transition};`);

  return `[data-theme="${name}"] {\n  ${lines.join('\n  ')}\n}`;
}
```

- [ ] **Step 4: Run tests — expect green**

```bash
pnpm --filter docs test -- serialize-theme
```

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/lib/theme/serialize-theme.ts apps/docs/src/app/lib/theme/serialize-theme.spec.ts
git commit -m "feat(docs): serialize draft to scoped CSS block"
```

---

### Task B4: Built-in theme constants (`built-in-themes.ts`)

**Files:**
- Create: `apps/docs/src/app/lib/theme/built-in-themes.ts`

This is hand-written rather than build-time generated — only 6 themes, ~30 tokens each. The file is the single source of truth for the editor's "fork from built-in" feature. **Update this file when `packages/themes/src/themes/*.css` changes.**

- [ ] **Step 1: Create the constants file**

```ts
// apps/docs/src/app/lib/theme/built-in-themes.ts
import type { DraftTheme } from './types';

export type BuiltInName = 'kouji' | 'dark' | 'light' | 'retro' | 'cyberpunk' | 'corporate';
export const BUILT_IN_NAMES: readonly BuiltInName[] =
  ['kouji', 'dark', 'light', 'retro', 'cyberpunk', 'corporate'];

const SHARED_TYPE = {
  fontSans: 'system-ui, -apple-system, sans-serif',
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",
  fontDisplay: "'Syne', system-ui, sans-serif",
};
const SHARED_SHAPE = { radiusBox: 8, radiusField: 4, radiusSelector: 4, border: 1, depth: 1 };
const FAST = { transition: '0.12s ease' };

export const BUILT_IN_THEMES: Record<BuiltInName, DraftTheme> = {
  light: {
    name: 'light', shape: SHARED_SHAPE, type: SHARED_TYPE, motion: FAST,
    contentOverrides: {},
    colors: {
      'base-100':    'oklch(98% 0 0)',
      primary:       'oklch(55% 0.20 250)',
      secondary:     'oklch(82% 0 0)',
      accent:        'oklch(62% 0.19 250)',
      neutral:       'oklch(35% 0 0)',
      info:          'oklch(62% 0.19 250)',
      success:       'oklch(70% 0.18 145)',
      warning:       'oklch(83% 0.16 90)',
      destructive:   'oklch(63% 0.22 20)',
    },
  },

  dark: {
    name: 'dark', shape: SHARED_SHAPE, type: SHARED_TYPE, motion: FAST,
    contentOverrides: {},
    colors: {
      'base-100':    'oklch(15% 0 0)',
      primary:       'oklch(70% 0.16 250)',
      secondary:     'oklch(35% 0 0)',
      accent:        'oklch(70% 0.16 250)',
      neutral:       'oklch(60% 0 0)',
      info:          'oklch(70% 0.16 250)',
      success:       'oklch(70% 0.18 145)',
      warning:       'oklch(83% 0.16 90)',
      destructive:   'oklch(63% 0.22 20)',
    },
  },

  kouji: {
    name: 'kouji',
    shape: { radiusBox: 0, radiusField: 0, radiusSelector: 0, border: 1, depth: 0 },
    type: { fontSans: "'JetBrains Mono', monospace", fontMono: "'JetBrains Mono', monospace", fontDisplay: "'Syne', system-ui, sans-serif" },
    motion: FAST,
    contentOverrides: {
      'base-content':       'oklch(94% 0.01 80)',
      'primary-content':    'oklch(8% 0 0)',
      'accent-content':     'oklch(8% 0 0)',
    },
    colors: {
      'base-100':    'oklch(8% 0 0)',
      primary:       'oklch(91% 0.21 124)',
      secondary:     'oklch(35% 0 0)',
      accent:        'oklch(91% 0.21 124)',
      neutral:       'oklch(45% 0 0)',
      info:          'oklch(70% 0.16 250)',
      success:       'oklch(91% 0.21 124)',
      warning:       'oklch(83% 0.16 90)',
      destructive:   'oklch(63% 0.22 20)',
    },
  },

  retro: {
    name: 'retro',
    shape: { radiusBox: 8, radiusField: 8, radiusSelector: 8, border: 1, depth: 1 },
    type: SHARED_TYPE, motion: { transition: '0.2s ease' },
    contentOverrides: {},
    colors: {
      'base-100':    'oklch(91% 0.04 80)',
      primary:       'oklch(78% 0.10 25)',
      secondary:     'oklch(82% 0.13 60)',
      accent:        'oklch(67% 0.06 230)',
      neutral:       'oklch(38% 0.05 35)',
      info:          'oklch(67% 0.06 230)',
      success:       'oklch(72% 0.13 130)',
      warning:       'oklch(78% 0.13 80)',
      destructive:   'oklch(58% 0.13 25)',
    },
  },

  cyberpunk: {
    name: 'cyberpunk',
    shape: { radiusBox: 0, radiusField: 0, radiusSelector: 0, border: 2, depth: 0 },
    type: { fontSans: "'JetBrains Mono', monospace", fontMono: "'JetBrains Mono', monospace", fontDisplay: "'JetBrains Mono', monospace" },
    motion: FAST,
    contentOverrides: {
      'primary-content':    'oklch(95% 0.18 100)',
      'accent-content':     'oklch(95% 0.18 100)',
      'destructive-content':'oklch(95% 0.18 100)',
    },
    colors: {
      'base-100':    'oklch(95% 0.18 100)',
      primary:       'oklch(60% 0.27 0)',
      secondary:     'oklch(82% 0.18 200)',
      accent:        'oklch(35% 0.27 290)',
      neutral:       'oklch(20% 0 0)',
      info:          'oklch(82% 0.18 200)',
      success:       'oklch(85% 0.30 130)',
      warning:       'oklch(70% 0.18 60)',
      destructive:   'oklch(60% 0.27 18)',
    },
  },

  corporate: {
    name: 'corporate',
    shape: { radiusBox: 4, radiusField: 4, radiusSelector: 4, border: 1, depth: 1 },
    type: SHARED_TYPE, motion: FAST,
    contentOverrides: {},
    colors: {
      'base-100':    'oklch(100% 0 0)',
      primary:       'oklch(57% 0.20 265)',
      secondary:     'oklch(63% 0.06 250)',
      accent:        'oklch(75% 0.12 165)',
      neutral:       'oklch(20% 0.02 265)',
      info:          'oklch(73% 0.16 230)',
      success:       'oklch(77% 0.16 165)',
      warning:       'oklch(80% 0.16 75)',
      destructive:   'oklch(72% 0.16 20)',
    },
  },
};
```

- [ ] **Step 2: Add a sanity test that every built-in is present**

`apps/docs/src/app/lib/theme/built-in-themes.spec.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { BUILT_IN_THEMES, BUILT_IN_NAMES } from './built-in-themes';

describe('BUILT_IN_THEMES', () => {
  test.each(BUILT_IN_NAMES)('contains %s', (name) => {
    expect(BUILT_IN_THEMES[name]).toBeDefined();
    expect(BUILT_IN_THEMES[name].name).toBe(name);
  });

  test.each(BUILT_IN_NAMES)('%s defines all 9 color slots', (name) => {
    const t = BUILT_IN_THEMES[name];
    for (const slot of ['base-100','primary','secondary','accent','neutral','info','success','warning','destructive'] as const) {
      expect(t.colors[slot]).toMatch(/^oklch\(/);
    }
  });
});
```

- [ ] **Step 3: Run tests — expect green**

```bash
pnpm --filter docs test -- built-in-themes
```

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/app/lib/theme/built-in-themes.ts apps/docs/src/app/lib/theme/built-in-themes.spec.ts
git commit -m "feat(docs): hand-mirrored built-in theme constants"
```

---

### Task B5: `ThemeDraftService` — signal state, fork/load/save/delete

**Files:**
- Create: `apps/docs/src/app/services/theme-draft.service.ts`
- Create: `apps/docs/src/app/services/theme-draft.service.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
// apps/docs/src/app/services/theme-draft.service.spec.ts
import { describe, expect, test, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ThemeDraftService } from './theme-draft.service';
import { BUILT_IN_THEMES } from '../lib/theme/built-in-themes';

describe('ThemeDraftService', () => {
  let svc: ThemeDraftService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    svc = TestBed.inject(ThemeDraftService);
  });

  test('starts with a blank draft', () => {
    expect(svc.draft().name).toBe('');
  });

  test('loadFork seeds draft from a built-in', () => {
    svc.loadFork('kouji');
    expect(svc.draft().colors.primary).toBe(BUILT_IN_THEMES.kouji.colors.primary);
    expect(svc.draft().name).toBe('kouji-fork');
  });

  test('save blocks built-in names', () => {
    svc.loadFork('kouji');
    svc.setName('kouji');
    const result = svc.save();
    expect(result).toEqual({ ok: false, reason: 'reserved' });
  });

  test('save persists a new theme to localStorage', () => {
    svc.loadFork('kouji');
    svc.setName('my-cool-theme');
    const result = svc.save();
    expect(result.ok).toBe(true);
    expect(svc.list().map(t => t.name)).toContain('my-cool-theme');
  });

  test('save with same name overwrites', () => {
    svc.loadFork('dark'); svc.setName('mine'); svc.save();
    svc.setColor('primary', 'oklch(50% 0.1 0)');
    svc.save();
    expect(svc.list().filter(t => t.name === 'mine').length).toBe(1);
    expect(svc.list().find(t => t.name === 'mine')!.colors.primary).toBe('oklch(50% 0.1 0)');
  });

  test('loadSaved restores a saved theme into the draft', () => {
    svc.loadFork('dark'); svc.setName('mine'); svc.save();
    svc.loadFork('light');                                        // change draft
    expect(svc.draft().name).toBe('light-fork');
    svc.loadSaved('mine');
    expect(svc.draft().name).toBe('mine');
  });

  test('delete removes the theme; if active, draft falls back to blank', () => {
    svc.loadFork('dark'); svc.setName('mine'); svc.save();
    svc.delete('mine');
    expect(svc.list().map(t => t.name)).not.toContain('mine');
    expect(svc.draft().name).toBe('');
  });

  test('setColor mutates the draft', () => {
    svc.loadFork('light');
    svc.setColor('primary', 'oklch(50% 0.1 0)');
    expect(svc.draft().colors.primary).toBe('oklch(50% 0.1 0)');
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
pnpm --filter docs test -- theme-draft.service
```

- [ ] **Step 3: Implement the service**

```ts
// apps/docs/src/app/services/theme-draft.service.ts
import { Injectable, computed, signal } from '@angular/core';
import { BUILT_IN_THEMES, BUILT_IN_NAMES, type BuiltInName } from '../lib/theme/built-in-themes';
import { deriveTokens } from '../lib/theme/derive-tokens';
import { serializeToScopedBlock } from '../lib/theme/serialize-theme';
import type { DraftTheme, ColorSlot, ContentSlot, ShapeKey, FontKey, MotionKey } from '../lib/theme/types';

const STORAGE_KEY = 'kj-custom-themes';
const DRAFT_KEY   = 'kj-draft-current';

interface StoredEnvelope { version: 1; themes: SavedTheme[] }
export interface SavedTheme extends DraftTheme { savedAt: number }

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'reserved' | 'invalid-name' };

const BLANK_DRAFT: DraftTheme = {
  name: '',
  colors: { ...BUILT_IN_THEMES.light.colors },
  contentOverrides: {},
  shape:  { ...BUILT_IN_THEMES.light.shape },
  type:   { ...BUILT_IN_THEMES.light.type },
  motion: { ...BUILT_IN_THEMES.light.motion },
};

@Injectable({ providedIn: 'root' })
export class ThemeDraftService {
  private readonly _draft = signal<DraftTheme>(this.readDraft() ?? structuredClone(BLANK_DRAFT));
  readonly draft = this._draft.asReadonly();

  readonly resolvedTokens = computed(() => deriveTokens(this._draft()));
  readonly css = computed(() => serializeToScopedBlock('custom-draft', this.resolvedTokens()));

  loadFork(name: BuiltInName): void {
    const src = BUILT_IN_THEMES[name];
    this._draft.set({ ...structuredClone(src), name: `${name}-fork` });
    this.persistDraft();
  }

  loadSaved(name: string): void {
    const found = this.list().find(t => t.name === name);
    if (!found) return;
    const { savedAt: _omit, ...rest } = found;
    this._draft.set(structuredClone(rest));
    this.persistDraft();
  }

  setName(name: string): void {
    this._draft.update(d => ({ ...d, name }));
    this.persistDraft();
  }

  setColor(slot: ColorSlot, value: string): void {
    this._draft.update(d => ({ ...d, colors: { ...d.colors, [slot]: value } }));
    this.persistDraft();
  }

  setContentOverride(slot: ContentSlot, value: string | null): void {
    this._draft.update(d => {
      const next = { ...d.contentOverrides };
      if (value === null) delete next[slot]; else next[slot] = value;
      return { ...d, contentOverrides: next };
    });
    this.persistDraft();
  }

  setShape(key: ShapeKey, value: number): void {
    this._draft.update(d => ({ ...d, shape: { ...d.shape, [key]: value } }));
    this.persistDraft();
  }

  setFont(key: FontKey, value: string): void {
    this._draft.update(d => ({ ...d, type: { ...d.type, [key]: value } }));
    this.persistDraft();
  }

  setMotion(key: MotionKey, value: string): void {
    this._draft.update(d => ({ ...d, motion: { ...d.motion, [key]: value } }));
    this.persistDraft();
  }

  save(): SaveResult {
    const d = this._draft();
    if (!d.name || d.name.length > 32) return { ok: false, reason: 'invalid-name' };
    if ((BUILT_IN_NAMES as readonly string[]).includes(d.name)) return { ok: false, reason: 'reserved' };

    const env = this.read();
    const idx = env.themes.findIndex(t => t.name === d.name);
    const entry: SavedTheme = { ...structuredClone(d), savedAt: Date.now() };
    if (idx >= 0) env.themes[idx] = entry; else env.themes.push(entry);
    this.write(env);
    return { ok: true };
  }

  delete(name: string): void {
    const env = this.read();
    env.themes = env.themes.filter(t => t.name !== name);
    this.write(env);
    if (this._draft().name === name) {
      this._draft.set(structuredClone(BLANK_DRAFT));
      this.persistDraft();
    }
  }

  list(): SavedTheme[] {
    return this.read().themes;
  }

  resetToOriginal(): void {
    const name = this._draft().name;
    const baseName = name.endsWith('-fork') ? name.slice(0, -5) as BuiltInName : null;
    if (baseName && (BUILT_IN_NAMES as readonly string[]).includes(baseName)) {
      this.loadFork(baseName);
      return;
    }
    const saved = this.list().find(t => t.name === name);
    if (saved) {
      this.loadSaved(name);
      return;
    }
    this._draft.set(structuredClone(BLANK_DRAFT));
    this.persistDraft();
  }

  private read(): StoredEnvelope {
    if (typeof localStorage === 'undefined') return { version: 1, themes: [] };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, themes: [] };
    try {
      const parsed = JSON.parse(raw) as StoredEnvelope;
      if (parsed.version !== 1) return { version: 1, themes: [] };
      return parsed;
    } catch { return { version: 1, themes: [] }; }
  }
  private write(env: StoredEnvelope): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(env));
  }
  private readDraft(): DraftTheme | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as DraftTheme; } catch { return null; }
  }
  private persistDraft(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(this._draft()));
  }
}
```

- [ ] **Step 4: Run tests — expect green**

```bash
pnpm --filter docs test -- theme-draft.service
```

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/services/theme-draft.service.ts apps/docs/src/app/services/theme-draft.service.spec.ts
git commit -m "feat(docs): ThemeDraftService — draft state + persistence"
```

---

### Task B6: Generator page — sticky bar + colors-only controls + scoped preview

**Files:**
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.ts`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.html`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.css`

This is a single larger task because the controls, sticky bar, preview wrapper, and style injection are tightly coupled — you cannot meaningfully test one without the others. Phase C breaks them out for further iteration.

- [ ] **Step 1: Replace `theme-generator.ts`**

```ts
import { Component, ChangeDetectionStrategy, DestroyRef, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { converter, formatHex } from 'culori';
import { DocsSidebarComponent } from '../../components/docs-sidebar/docs-sidebar';
import { KjInputComponent } from '@kouji-ui/components';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { ClipboardService } from '../../services/clipboard.service';
import { serializeToScopedBlock } from '../../lib/theme/serialize-theme';
import type { ColorSlot } from '../../lib/theme/types';

const STYLE_TAG_ID = 'kj-draft-style';
const COLOR_SLOTS: readonly ColorSlot[] = [
  'base-100', 'primary', 'secondary', 'accent', 'neutral',
  'info', 'success', 'warning', 'destructive',
];

const toOklch = converter('oklch');
const toRgb   = converter('rgb');

function hexToOklch(hex: string): string {
  const c = toOklch(hex);
  if (!c) return 'oklch(50% 0 0)';
  return `oklch(${Math.round((c.l ?? 0) * 100)}% ${(c.c ?? 0).toFixed(3)} ${Math.round(c.h ?? 0)})`;
}
function oklchToHex(css: string): string {
  const rgb = toRgb(css);
  if (!rgb) return '#000000';
  return formatHex(rgb);
}

@Component({
  selector: 'kj-theme-generator',
  standalone: true,
  imports: [DocsSidebarComponent, KjInputComponent],
  templateUrl: './theme-generator.html',
  styleUrl: './theme-generator.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorComponent {
  private readonly draftService = inject(ThemeDraftService);
  private readonly clipboard = inject(ClipboardService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly draft = this.draftService.draft;
  protected readonly colorSlots = COLOR_SLOTS;
  protected readonly toast = signal<string | null>(null);

  // Inject/update the scoped draft style block — created in injection context (constructor).
  // Runs in the browser only; jsdom tests skip via the typeof check.
  private readonly styleSync = effect(() => {
    const css = this.draftService.css();
    if (typeof document === 'undefined') return;
    let tag = this.document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
    if (!tag) {
      tag = this.document.createElement('style');
      tag.id = STYLE_TAG_ID;
      this.document.head.appendChild(tag);
    }
    tag.textContent = css;
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.document.getElementById(STYLE_TAG_ID)?.remove();
    });
  }

  protected hexFor(slot: ColorSlot): string {
    return oklchToHex(this.draft().colors[slot]);
  }
  protected onColorChange(slot: ColorSlot, hex: string): void {
    this.draftService.setColor(slot, hexToOklch(hex));
  }

  protected onNameChange(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value
      .toLowerCase().trim().replace(/\s+/g, '-').slice(0, 32);
    this.draftService.setName(v);
  }

  protected save(): void {
    const result = this.draftService.save();
    this.flash(result.ok ? `Saved "${this.draft().name}"`
                         : result.reason === 'reserved'
                           ? 'That name is reserved by a built-in theme'
                           : 'Pick a name first');
  }

  protected reset(): void {
    this.draftService.resetToOriginal();
    this.flash('Reset');
  }

  async copyCss(): Promise<void> {
    const css = serializeToScopedBlock(this.draft().name || 'custom', this.draftService.resolvedTokens());
    const ok = await this.clipboard.copy(css);
    this.flash(ok ? 'CSS copied to clipboard' : 'Copy failed');
  }

  private flash(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 2500);
  }
}
```

- [ ] **Step 2: Replace `theme-generator.html`**

```html
<div class="docs-layout">
  <aside class="sidebar">
    <kj-docs-sidebar />
  </aside>

  <main class="generator-main">
    <header class="generator-bar">
      <input
        class="generator-name"
        type="text"
        placeholder="theme-name"
        [value]="draft().name"
        (input)="onNameChange($event)"
        aria-label="Theme name"
      />
      <div class="generator-actions">
        <button type="button" class="generator-btn" (click)="reset()">Reset</button>
        <button type="button" class="generator-btn primary" (click)="save()">Save</button>
        <button type="button" class="generator-btn" (click)="copyCss()">Copy CSS</button>
      </div>
    </header>

    <section class="generator-body">
      <div class="generator-controls" role="region" aria-label="Theme controls">
        <details open>
          <summary>Colors</summary>
          @for (slot of colorSlots; track slot) {
            <label class="control-row">
              <span class="control-label">{{ slot }}</span>
              <kj-input
                type="color"
                [value]="hexFor(slot)"
                (input)="onColorChange(slot, $any($event.target).value)"
              />
            </label>
          }
        </details>
      </div>

      <div class="generator-preview" data-theme="custom-draft">
        <h1 class="preview-h1">Heading sample</h1>
        <p class="preview-body">Body text rendered with the in-progress theme.</p>
        <div class="preview-row">
          <button class="kj-button" data-variant="primary">Primary</button>
          <button class="kj-button" data-variant="default">Default</button>
        </div>
      </div>
    </section>

    @if (toast(); as msg) {
      <div class="generator-toast" role="status" aria-live="polite">{{ msg }}</div>
    }
  </main>
</div>
```

- [ ] **Step 3: Replace `theme-generator.css`**

```css
.docs-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  height: 100vh;
  overflow: hidden;
}
.sidebar {
  background: var(--kj-color-base-200);
  border-right: 1px solid var(--kj-color-base-300);
  overflow: hidden;
}

.generator-main {
  position: relative;
  height: 100vh;
  overflow: hidden;
  display: grid;
  grid-template-rows: 56px 1fr;
}

.generator-bar {
  display: flex;
  align-items: center;
  gap: var(--kj-space-md);
  padding: 0 var(--kj-space-xl);
  border-bottom: 1px solid var(--kj-color-base-300);
  background: var(--kj-color-base-100);
}
.generator-name {
  flex: 0 0 240px;
  background: var(--kj-color-base-200);
  border: 1px solid var(--kj-color-base-300);
  border-radius: var(--kj-radius-field);
  color: var(--kj-color-base-content);
  padding: var(--kj-space-xs) var(--kj-space-sm);
  font: var(--kj-text-sm) var(--kj-font-mono);
}
.generator-actions {
  margin-left: auto;
  display: flex;
  gap: var(--kj-space-xs);
}
.generator-btn {
  background: var(--kj-color-base-200);
  border: 1px solid var(--kj-color-base-300);
  color: var(--kj-color-base-content);
  padding: var(--kj-space-xs) var(--kj-space-md);
  border-radius: var(--kj-radius-selector);
  font: var(--kj-text-sm) var(--kj-font-mono);
  cursor: pointer;
  transition: var(--kj-transition);
}
.generator-btn.primary {
  background: var(--kj-color-primary);
  color: var(--kj-color-primary-content);
  border-color: var(--kj-color-primary);
}
.generator-btn:hover { filter: brightness(1.1); }

.generator-body {
  display: grid;
  grid-template-columns: 380px 1fr;
  overflow: hidden;
}
.generator-controls {
  overflow-y: auto;
  padding: var(--kj-space-lg);
  border-right: 1px solid var(--kj-color-base-300);
}
.generator-controls details {
  border: 1px solid var(--kj-color-base-300);
  border-radius: var(--kj-radius-field);
  padding: var(--kj-space-sm);
  margin-bottom: var(--kj-space-md);
}
.generator-controls summary {
  cursor: pointer;
  font: var(--kj-text-sm) var(--kj-font-mono);
  color: var(--kj-color-base-content);
  padding: var(--kj-space-xs);
  user-select: none;
}
.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--kj-space-sm);
  padding: var(--kj-space-xs) var(--kj-space-sm);
}
.control-label {
  font: var(--kj-text-sm) var(--kj-font-mono);
  color: var(--kj-color-neutral);
}

.generator-preview {
  overflow-y: auto;
  padding: var(--kj-space-2xl);
  background: var(--kj-color-base-100);
  color: var(--kj-color-base-content);
}
.preview-h1 { font: var(--kj-text-2xl) var(--kj-font-display); margin: 0 0 var(--kj-space-md); }
.preview-body { font: var(--kj-text-base) var(--kj-font-sans); margin: 0 0 var(--kj-space-lg); }
.preview-row { display: flex; gap: var(--kj-space-sm); }

.generator-toast {
  position: absolute;
  bottom: var(--kj-space-lg);
  right: var(--kj-space-lg);
  background: var(--kj-color-base-300);
  color: var(--kj-color-base-content);
  padding: var(--kj-space-sm) var(--kj-space-md);
  border-radius: var(--kj-radius-field);
  font: var(--kj-text-sm) var(--kj-font-mono);
}
```

- [ ] **Step 4: Wire sidebar handlers to draft service (replaces Phase A stubs)**

Edit `apps/docs/src/app/components/docs-sidebar/docs-sidebar.ts`:

a. Add imports:

```ts
import { ThemeDraftService } from '../../services/theme-draft.service';
import { BUILT_IN_NAMES, type BuiltInName } from '../../lib/theme/built-in-themes';
```

b. **Delete** the temporary constant introduced in Phase A Task A5:

```ts
// REMOVE these two lines added in Phase A:
// const BUILT_IN_THEME_NAMES = ['kouji', 'dark', 'light', ...] as const;
// type BuiltInName = typeof BUILT_IN_THEME_NAMES[number];
```

c. Add the service injection:

```ts
private readonly draftService = inject(ThemeDraftService);
```

d. Replace the stubbed handlers and `builtInThemes` constant:

```ts
protected readonly builtInThemes = BUILT_IN_NAMES;        // was: BUILT_IN_THEME_NAMES
protected readonly myThemes = computed(() => this.draftService.list().map(t => t.name));

protected onForkBuiltIn(name: BuiltInName): void {
  this.draftService.loadFork(name);
  this.close();
}
protected onLoadSaved(name: string): void {
  this.draftService.loadSaved(name);
  this.close();
}
protected onNewTheme(): void {
  this.draftService.loadFork('light');
  this.draftService.setName('');
  this.close();
}
```

- [ ] **Step 5: Manual smoke test**

```bash
pnpm --filter docs run dev
```

Visit /theme-generator. Click a built-in name in the sidebar. Expected:
- The 9 color swatches in the controls panel populate with that theme's colors.
- The preview pane re-renders with those colors (heading + buttons reflect changes).
- Editing a swatch updates the preview live.
- The page chrome (sidebar, top bar) stays in your globally selected theme.
- Click Save with a unique name → saved, appears in My themes group on next render.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/app/pages/theme-generator/ apps/docs/src/app/components/docs-sidebar/docs-sidebar.ts
git commit -m "feat(docs): theme generator MVP — colors editor + scoped preview"
```

---

### Task B7: Generator page integration smoke test

**Files:**
- Create: `apps/docs/src/app/pages/theme-generator/theme-generator.spec.ts`

- [ ] **Step 1: Write the integration test**

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, test, beforeEach } from 'vitest';
import { ThemeGeneratorComponent } from './theme-generator';
import { ThemeDraftService } from '../../services/theme-draft.service';

describe('ThemeGeneratorComponent (integration)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.getElementById('kj-draft-style')?.remove();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  test('mounts and the kj-draft-style tag is created', () => {
    const fixture = TestBed.createComponent(ThemeGeneratorComponent);
    fixture.detectChanges();
    const tag = document.getElementById('kj-draft-style') as HTMLStyleElement | null;
    expect(tag).not.toBeNull();
    expect(tag!.textContent).toContain('[data-theme="custom-draft"]');
  });

  test('editing draft updates the style tag content', () => {
    const fixture = TestBed.createComponent(ThemeGeneratorComponent);
    fixture.detectChanges();
    const svc = TestBed.inject(ThemeDraftService);

    svc.loadFork('kouji');
    fixture.detectChanges();
    const cssAfter = document.getElementById('kj-draft-style')!.textContent!;
    expect(cssAfter).toContain(svc.draft().colors.primary);
  });

  test('preview wrapper has data-theme="custom-draft"', () => {
    const fixture = TestBed.createComponent(ThemeGeneratorComponent);
    fixture.detectChanges();
    const wrapper = fixture.nativeElement.querySelector('.generator-preview');
    expect(wrapper.getAttribute('data-theme')).toBe('custom-draft');
  });

  test('destroying the component removes the style tag', () => {
    const fixture = TestBed.createComponent(ThemeGeneratorComponent);
    fixture.detectChanges();
    expect(document.getElementById('kj-draft-style')).not.toBeNull();
    fixture.destroy();
    expect(document.getElementById('kj-draft-style')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect green**

```bash
pnpm --filter docs test -- theme-generator.spec
```

Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/app/pages/theme-generator/theme-generator.spec.ts
git commit -m "test(docs): theme generator integration smoke test"
```

---

### Phase B checkpoint

Working color-only editor: fork a built-in, edit colors, see live scoped preview, save/load via localStorage. Integration smoke test verifies the style-injection lifecycle. Pause here if you want to land Phase B as a separate PR.

---

## PHASE C — Full controls, persistence polish, import/export, preview content

### Task C1: Shape, motion, and font controls

**Files:**
- Create: `apps/docs/src/app/lib/theme/font-catalog.ts`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.ts`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.html`

- [ ] **Step 1: Create the curated font catalog**

```ts
// apps/docs/src/app/lib/theme/font-catalog.ts
export interface CuratedFont {
  id: string;
  family: string;            // CSS font-family value (single name, no fallbacks)
  category: 'sans' | 'mono' | 'display' | 'serif';
  // Google Fonts CSS2 query (used by FontLoaderService).
  query: string;
}

export const CURATED_FONTS: readonly CuratedFont[] = [
  // sans
  { id: 'inter',          family: 'Inter',           category: 'sans',    query: 'family=Inter:wght@400;500;600;700' },
  { id: 'roboto',         family: 'Roboto',          category: 'sans',    query: 'family=Roboto:wght@400;500;700' },
  { id: 'manrope',        family: 'Manrope',         category: 'sans',    query: 'family=Manrope:wght@400;600;700' },
  { id: 'outfit',         family: 'Outfit',          category: 'sans',    query: 'family=Outfit:wght@400;600;700' },
  { id: 'geist',          family: 'Geist',           category: 'sans',    query: 'family=Geist:wght@400;600;700' },
  { id: 'plex-sans',      family: 'IBM Plex Sans',   category: 'sans',    query: 'family=IBM+Plex+Sans:wght@400;600' },
  { id: 'space-grotesk',  family: 'Space Grotesk',   category: 'sans',    query: 'family=Space+Grotesk:wght@400;600' },
  { id: 'figtree',        family: 'Figtree',         category: 'sans',    query: 'family=Figtree:wght@400;600' },
  // mono
  { id: 'jetbrains-mono', family: 'JetBrains Mono',  category: 'mono',    query: 'family=JetBrains+Mono:wght@400;600' },
  { id: 'fira-mono',      family: 'Fira Mono',       category: 'mono',    query: 'family=Fira+Mono:wght@400;700' },
  { id: 'plex-mono',      family: 'IBM Plex Mono',   category: 'mono',    query: 'family=IBM+Plex+Mono:wght@400;600' },
  { id: 'space-mono',     family: 'Space Mono',      category: 'mono',    query: 'family=Space+Mono:wght@400;700' },
  // display
  { id: 'syne',           family: 'Syne',            category: 'display', query: 'family=Syne:wght@600;700;800' },
  { id: 'fraunces',       family: 'Fraunces',        category: 'display', query: 'family=Fraunces:wght@600;700' },
  { id: 'playfair',       family: 'Playfair Display',category: 'display', query: 'family=Playfair+Display:wght@600;700' },
  { id: 'lora',           family: 'Lora',            category: 'display', query: 'family=Lora:wght@600;700' },
  // serif
  { id: 'plex-serif',     family: 'IBM Plex Serif',  category: 'serif',   query: 'family=IBM+Plex+Serif:wght@400;600' },
  { id: 'georgia',        family: 'Georgia',         category: 'serif',   query: '' },                            // system
  // generic
  { id: 'system-ui',      family: 'system-ui',       category: 'sans',    query: '' },
  { id: 'monospace',      family: 'monospace',       category: 'mono',    query: '' },
];
```

- [ ] **Step 2: Add `FontLoaderService`**

```ts
// apps/docs/src/app/services/font-loader.service.ts
import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { CURATED_FONTS } from '../lib/theme/font-catalog';

@Injectable({ providedIn: 'root' })
export class FontLoaderService {
  private readonly document = inject(DOCUMENT);
  private readonly loaded = new Set<string>();

  ensureLoaded(fontId: string): void {
    if (this.loaded.has(fontId)) return;
    const font = CURATED_FONTS.find(f => f.id === fontId);
    if (!font || !font.query) { this.loaded.add(fontId); return; }      // system / serif fallback
    const link = this.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${font.query}&display=swap`;
    this.document.head.appendChild(link);
    this.loaded.add(fontId);
  }
}
```

- [ ] **Step 3: Add Shape / Type / Motion control groups**

Append to `theme-generator.html` inside `.generator-controls` (after the existing `<details>` for Colors):

```html
<details>
  <summary>Shape</summary>
  <label class="control-row">
    <span class="control-label">radius-box</span>
    <input type="range" min="0" max="32" [value]="draft().shape.radiusBox"
           (input)="onShape('radiusBox', +$any($event.target).value)" />
    <span class="control-value">{{ draft().shape.radiusBox }}px</span>
  </label>
  <label class="control-row">
    <span class="control-label">radius-field</span>
    <input type="range" min="0" max="32" [value]="draft().shape.radiusField"
           (input)="onShape('radiusField', +$any($event.target).value)" />
    <span class="control-value">{{ draft().shape.radiusField }}px</span>
  </label>
  <label class="control-row">
    <span class="control-label">radius-selector</span>
    <input type="range" min="0" max="32" [value]="draft().shape.radiusSelector"
           (input)="onShape('radiusSelector', +$any($event.target).value)" />
    <span class="control-value">{{ draft().shape.radiusSelector }}px</span>
  </label>
  <label class="control-row">
    <span class="control-label">border</span>
    <select [value]="draft().shape.border" (change)="onShape('border', +$any($event.target).value)">
      <option [value]="0">0px</option><option [value]="1">1px</option>
      <option [value]="2">2px</option><option [value]="4">4px</option>
    </select>
  </label>
  <label class="control-row">
    <span class="control-label">depth</span>
    <select [value]="draft().shape.depth" (change)="onShape('depth', +$any($event.target).value)">
      <option [value]="0">0</option><option [value]="1">1</option><option [value]="2">2</option>
    </select>
  </label>
</details>

<details>
  <summary>Type</summary>
  <label class="control-row">
    <span class="control-label">font-sans</span>
    <select [value]="fontIdFor('fontSans')" (change)="onFont('fontSans', $any($event.target).value)">
      @for (f of fonts; track f.id) { <option [value]="f.id">{{ f.family }}</option> }
    </select>
  </label>
  <label class="control-row">
    <span class="control-label">font-mono</span>
    <select [value]="fontIdFor('fontMono')" (change)="onFont('fontMono', $any($event.target).value)">
      @for (f of fonts; track f.id) { <option [value]="f.id">{{ f.family }}</option> }
    </select>
  </label>
  <label class="control-row">
    <span class="control-label">font-display</span>
    <select [value]="fontIdFor('fontDisplay')" (change)="onFont('fontDisplay', $any($event.target).value)">
      @for (f of fonts; track f.id) { <option [value]="f.id">{{ f.family }}</option> }
    </select>
  </label>
</details>

<details>
  <summary>Motion</summary>
  <label class="control-row">
    <span class="control-label">transition</span>
    <select [value]="draft().motion.transition"
            (change)="onMotion('transition', $any($event.target).value)">
      <option value="0s">none</option>
      <option value="0.12s ease">fast</option>
      <option value="0.2s ease">base</option>
      <option value="0.4s ease">slow</option>
    </select>
  </label>
</details>
```

- [ ] **Step 4: Add control handlers in `theme-generator.ts`**

Inject FontLoaderService and add handlers:

```ts
import { FontLoaderService } from '../../services/font-loader.service';
import { CURATED_FONTS, type CuratedFont } from '../../lib/theme/font-catalog';
import type { ShapeKey, FontKey, MotionKey } from '../../lib/theme/types';

// inside class:
private readonly fontLoader = inject(FontLoaderService);
protected readonly fonts: readonly CuratedFont[] = CURATED_FONTS;

protected fontIdFor(key: FontKey): string {
  const family = this.draft().type[key];
  return CURATED_FONTS.find(f => family.includes(f.family))?.id ?? 'system-ui';
}

protected onShape(key: ShapeKey, value: number): void {
  this.draftService.setShape(key, value);
}
protected onFont(key: FontKey, fontId: string): void {
  const font = CURATED_FONTS.find(f => f.id === fontId);
  if (!font) return;
  this.fontLoader.ensureLoaded(fontId);
  // Emit a CSS stack so applications inherit a sensible fallback
  const stack = font.category === 'mono'
    ? `'${font.family}', monospace`
    : font.category === 'serif'
      ? `'${font.family}', serif`
      : `'${font.family}', system-ui, sans-serif`;
  this.draftService.setFont(key, stack);
}
protected onMotion(key: MotionKey, value: string): void {
  this.draftService.setMotion(key, value);
}
```

- [ ] **Step 5: Add minimal CSS for control rows**

Append to `theme-generator.css`:

```css
.control-row input[type="range"] {
  flex: 1;
  accent-color: var(--kj-color-primary);
}
.control-row select {
  background: var(--kj-color-base-200);
  border: 1px solid var(--kj-color-base-300);
  color: var(--kj-color-base-content);
  padding: var(--kj-space-xs) var(--kj-space-sm);
  border-radius: var(--kj-radius-field);
  font: var(--kj-text-sm) var(--kj-font-mono);
}
.control-value {
  font: var(--kj-text-xs) var(--kj-font-mono);
  color: var(--kj-color-neutral);
  min-width: 40px;
  text-align: right;
}
```

- [ ] **Step 6: Smoke test**

```bash
pnpm --filter docs run dev
```

Edit a shape slider, verify preview updates. Switch font dropdown to "Syne" — verify the heading in the preview re-renders in Syne (network tab shows the Google Fonts CSS request once).

- [ ] **Step 7: Commit**

```bash
git add apps/docs/src/app/lib/theme/font-catalog.ts apps/docs/src/app/services/font-loader.service.ts apps/docs/src/app/pages/theme-generator/
git commit -m "feat(docs): theme generator — shape/type/motion controls + font loader"
```

---

### Task C2: Export — Download .css + Export JSON

**Files:**
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.ts`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.html`

- [ ] **Step 1: Add download helpers + JSON export to `theme-generator.ts`**

```ts
// inside class
downloadCss(): void {
  const css = this.exportedCss();
  this.download(`${this.draft().name || 'custom'}.kj-theme.css`, css, 'text/css');
}
exportJson(): void {
  const json = JSON.stringify(this.draft(), null, 2);
  this.download(`${this.draft().name || 'custom'}.kj-theme.json`, json, 'application/json');
}
private exportedCss(): string {
  const name = this.draft().name || 'custom';
  const importLines = this.fontImports();
  return [importLines, serializeToScopedBlock(name, this.draftService.resolvedTokens())]
    .filter(Boolean).join('\n\n');
}
private fontImports(): string {
  const used = new Set<string>();
  for (const k of ['fontSans','fontMono','fontDisplay'] as const) {
    const family = this.draft().type[k];
    const f = CURATED_FONTS.find(c => family.includes(c.family));
    if (f && f.query) used.add(`@import url('https://fonts.googleapis.com/css2?${f.query}&display=swap');`);
  }
  return [...used].join('\n');
}
private download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = this.document.createElement('a');
  a.href = url; a.download = filename;
  this.document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
```

Also update `copyCss()` to use `exportedCss()` so it includes `@import` lines:

```ts
async copyCss(): Promise<void> {
  const ok = await this.clipboard.copy(this.exportedCss());
  this.flash(ok ? 'CSS copied to clipboard' : 'Copy failed');
}
```

- [ ] **Step 2: Add buttons to the sticky bar**

Replace the `.generator-actions` block in `theme-generator.html`:

```html
<div class="generator-actions">
  <button type="button" class="generator-btn" (click)="reset()">Reset</button>
  <button type="button" class="generator-btn primary" (click)="save()">Save</button>
  <button type="button" class="generator-btn" (click)="copyCss()">Copy CSS</button>
  <button type="button" class="generator-btn" (click)="downloadCss()">Download .css</button>
  <button type="button" class="generator-btn" (click)="exportJson()">Export JSON</button>
</div>
```

- [ ] **Step 3: Smoke test**

In dev, click each export button. Expected: clipboard copy works (paste into a text editor and confirm content); .css and .json files download with correct filenames; opened files contain the draft tokens.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/app/pages/theme-generator/
git commit -m "feat(docs): theme generator — CSS + JSON export"
```

---

### Task C3: JSON import (Zod schema + sidebar Import button)

**Files:**
- Create: `apps/docs/src/app/lib/theme/import-schema.ts`
- Create: `apps/docs/src/app/lib/theme/import-schema.spec.ts`
- Modify: `apps/docs/src/app/services/theme-draft.service.ts`
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.ts`
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.html`

- [ ] **Step 1: Write the Zod schema with tests**

`apps/docs/src/app/lib/theme/import-schema.ts`:

```ts
import { z } from 'zod';

const COLOR_SLOTS = ['base-100','primary','secondary','accent','neutral','info','success','warning','destructive'] as const;
const CONTENT_SLOTS = ['base-content','primary-content','secondary-content','accent-content','neutral-content','info-content','success-content','warning-content','destructive-content'] as const;

const colorsObj   = z.object(Object.fromEntries(COLOR_SLOTS.map(s => [s, z.string()])) as Record<typeof COLOR_SLOTS[number], z.ZodString>);
const contentsObj = z.object(Object.fromEntries(CONTENT_SLOTS.map(s => [s, z.string().optional()])) as Record<typeof CONTENT_SLOTS[number], z.ZodOptional<z.ZodString>>).partial();

export const DraftThemeSchema = z.object({
  name: z.string().max(32),
  colors: colorsObj,
  contentOverrides: contentsObj.default({}),
  shape: z.object({
    radiusBox: z.number(), radiusField: z.number(), radiusSelector: z.number(),
    border: z.number(), depth: z.number(),
  }),
  type:   z.object({ fontSans: z.string(), fontMono: z.string(), fontDisplay: z.string() }),
  motion: z.object({ transition: z.string() }),
});

export type ParsedDraft = z.infer<typeof DraftThemeSchema>;
```

`apps/docs/src/app/lib/theme/import-schema.spec.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { DraftThemeSchema } from './import-schema';
import { BUILT_IN_THEMES } from './built-in-themes';

describe('DraftThemeSchema', () => {
  test('accepts every built-in theme', () => {
    for (const t of Object.values(BUILT_IN_THEMES)) {
      expect(() => DraftThemeSchema.parse(t)).not.toThrow();
    }
  });

  test('rejects missing color slot', () => {
    const broken: any = structuredClone(BUILT_IN_THEMES.light);
    delete broken.colors.primary;
    expect(() => DraftThemeSchema.parse(broken)).toThrow();
  });

  test('rejects name > 32 chars', () => {
    const broken: any = structuredClone(BUILT_IN_THEMES.light);
    broken.name = 'x'.repeat(33);
    expect(() => DraftThemeSchema.parse(broken)).toThrow();
  });
});
```

- [ ] **Step 2: Run tests — expect green**

```bash
pnpm --filter docs test -- import-schema
```

- [ ] **Step 3: Add `importJson(text)` to `ThemeDraftService`**

Append to the service class:

```ts
import { DraftThemeSchema } from '../lib/theme/import-schema';

// inside class
importJson(text: string): { ok: true } | { ok: false; reason: string } {
  let parsed: unknown;
  try { parsed = JSON.parse(text); }
  catch { return { ok: false, reason: 'Not valid JSON' }; }
  const result = DraftThemeSchema.safeParse(parsed);
  if (!result.success) return { ok: false, reason: 'Invalid theme shape' };
  this._draft.set(result.data as DraftTheme);
  this.persistDraft();
  return { ok: true };
}
```

- [ ] **Step 4: Add Import button to sidebar's My themes group**

Update `docs-sidebar.html` — replace the `+ New theme` link section with:

```html
<a routerLink="/theme-generator" class="sidebar-link sidebar-link-special"
   (click)="onNewTheme()">+ New theme</a>
<button type="button" class="sidebar-link sidebar-link-special" (click)="fileInput.click()">
  Import JSON
</button>
<input #fileInput type="file" accept=".json,application/json" hidden
       (change)="onImportFile($event)" />
```

Add the handler in `docs-sidebar.ts`:

```ts
protected onImportFile(ev: Event): void {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  file.text().then(text => {
    const result = this.draftService.importJson(text);
    if (!result.ok) console.warn('[theme-import]', result.reason);
    input.value = '';                                          // allow re-import of same file
  });
  this.router.navigateByUrl('/theme-generator');
  this.close();
}
```

- [ ] **Step 5: Smoke test**

In dev: edit a theme → Export JSON → delete from My themes → Import the file back. Expected: theme reloads exactly as exported (round-trip).

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/app/lib/theme/import-schema.ts apps/docs/src/app/lib/theme/import-schema.spec.ts apps/docs/src/app/services/theme-draft.service.ts apps/docs/src/app/components/docs-sidebar/
git commit -m "feat(docs): theme generator — JSON import (Zod-validated)"
```

---

### Task C4: Auto-derive `*-content` swatches with manual override toggle

**Files:**
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.ts`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.html`

- [ ] **Step 1: Expose derived content + override state in component**

Add to `theme-generator.ts`:

```ts
import type { ContentSlot } from '../../lib/theme/types';

// inside class
protected contentFor(slot: ColorSlot): { value: string; isOverride: boolean } {
  if (slot === 'base-100') {
    return {
      value: this.draftService.resolvedTokens().contents['base-content'],
      isOverride: !!this.draft().contentOverrides['base-content'],
    };
  }
  const key = `${slot}-content` as ContentSlot;
  return {
    value: this.draftService.resolvedTokens().contents[key],
    isOverride: !!this.draft().contentOverrides[key],
  };
}

protected toggleContentOverride(slot: ColorSlot): void {
  const key = (slot === 'base-100' ? 'base-content' : `${slot}-content`) as ContentSlot;
  const current = this.draft().contentOverrides[key];
  if (current) {
    this.draftService.setContentOverride(key, null);
  } else {
    this.draftService.setContentOverride(key, this.contentFor(slot).value);
  }
}

protected onContentChange(slot: ColorSlot, hex: string): void {
  const key = (slot === 'base-100' ? 'base-content' : `${slot}-content`) as ContentSlot;
  this.draftService.setContentOverride(key, hexToOklch(hex));
}

protected hexForContent(slot: ColorSlot): string {
  return oklchToHex(this.contentFor(slot).value);
}
```

- [ ] **Step 2: Update the colors row template**

Replace the `<label class="control-row">` block inside the Colors `<details>`:

```html
@for (slot of colorSlots; track slot) {
  <div class="control-row">
    <span class="control-label">{{ slot }}</span>
    <kj-input
      type="color"
      [value]="hexFor(slot)"
      (input)="onColorChange(slot, $any($event.target).value)" />
    <button
      type="button"
      class="content-swatch"
      [class.locked]="contentFor(slot).isOverride"
      [style.background]="contentFor(slot).value"
      [attr.aria-label]="contentFor(slot).isOverride
        ? slot + ' content (manual override — click to revert)'
        : slot + ' content (auto-derived — click to override)'"
      (click)="toggleContentOverride(slot)">
    </button>
    @if (contentFor(slot).isOverride) {
      <kj-input
        type="color"
        [value]="hexForContent(slot)"
        (input)="onContentChange(slot, $any($event.target).value)" />
    }
  </div>
}
```

- [ ] **Step 3: CSS for `.content-swatch`**

Append to `theme-generator.css`:

```css
.content-swatch {
  width: 22px; height: 22px;
  border: 1px solid var(--kj-color-base-300);
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
}
.content-swatch.locked { box-shadow: 0 0 0 2px var(--kj-color-primary); }
```

- [ ] **Step 4: Smoke test**

Edit primary color → small content circle next to it auto-updates. Click the circle → second swatch appears for manual override. Edit it → preview's primary-content reflects override. Click the locked circle → revert to derived.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/pages/theme-generator/
git commit -m "feat(docs): theme generator — auto-derived *-content with manual override"
```

---

### Task C5: Full preview content (sample page)

**Files:**
- Create: `apps/docs/src/app/pages/theme-generator/preview/theme-generator-preview.ts`
- Create: `apps/docs/src/app/pages/theme-generator/preview/theme-generator-preview.html`
- Create: `apps/docs/src/app/pages/theme-generator/preview/theme-generator-preview.css`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.ts`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.html`

- [ ] **Step 1: Create the preview component**

`apps/docs/src/app/pages/theme-generator/preview/theme-generator-preview.ts`:

```ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjInputComponent } from '@kouji-ui/components';

@Component({
  selector: 'kj-theme-generator-preview',
  standalone: true,
  imports: [KjInputComponent],
  templateUrl: './theme-generator-preview.html',
  styleUrl: './theme-generator-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorPreviewComponent {}
```

`apps/docs/src/app/pages/theme-generator/preview/theme-generator-preview.html`:

```html
<section class="sample-hero">
  <h1>Preview heading</h1>
  <p>Body paragraph in <code>font-sans</code>. Inline <code>code</code> uses <code>font-mono</code>.</p>
</section>

<section class="sample-buttons">
  <h2 class="sample-h2">Buttons</h2>
  <div class="buttons-grid">
    <button class="kj-button" data-variant="default">Default</button>
    <button class="kj-button" data-variant="primary">Primary</button>
    <button class="kj-button" data-variant="secondary">Secondary</button>
    <button class="kj-button" data-variant="accent">Accent</button>
    <button class="kj-button" data-variant="ghost">Ghost</button>
    <button class="kj-button" data-variant="destructive">Destructive</button>
    <button class="kj-button" data-variant="link">Link</button>
  </div>
  <div class="buttons-grid">
    <button class="kj-button is-force-hover" data-variant="primary">Primary :hover</button>
    <button class="kj-button is-force-hover" data-variant="default">Default :hover</button>
    <button class="kj-button is-force-hover" data-variant="destructive">Destr :hover</button>
  </div>
</section>

<section class="sample-form">
  <h2 class="sample-h2">Form</h2>
  <div class="form-card">
    <label>Email
      <kj-input type="email" placeholder="you@example.com" />
    </label>
    <label>Color
      <kj-input type="color" value="#b8f500" />
    </label>
    <label>Focused (forced)
      <kj-input type="text" placeholder="Focus state" />
    </label>
    <div class="form-actions">
      <button class="kj-button" data-variant="primary">Submit</button>
      <button class="kj-button" data-variant="ghost">Cancel</button>
    </div>
  </div>
</section>

<section class="sample-callouts">
  <h2 class="sample-h2">Callouts</h2>
  <div class="callout info">Info: this is the info color slot.</div>
  <div class="callout success">Success: action completed.</div>
  <div class="callout warning">Warning: heads up.</div>
  <div class="callout destructive">Destructive: irreversible.</div>
</section>

<section class="sample-inline">
  <h2 class="sample-h2">Inline</h2>
  <p>
    Press <kbd>⌘</kbd><kbd>K</kbd> to search.
    <a href="#">A link</a> renders in primary.
    <span class="muted">Muted neutral text.</span>
  </p>
</section>

<section class="sample-surfaces">
  <h2 class="sample-h2">Surfaces</h2>
  <div class="surface s-100">base-100
    <div class="surface s-200">base-200
      <div class="surface s-300">base-300</div>
    </div>
  </div>
</section>
```

`apps/docs/src/app/pages/theme-generator/preview/theme-generator-preview.css`:

```css
:host {
  display: block;
  padding: var(--kj-space-2xl);
  color: var(--kj-color-base-content);
  background: var(--kj-color-base-100);
  font: var(--kj-text-base) var(--kj-font-sans);
}
:host * { pointer-events: none; }
:host kj-input { pointer-events: auto; }                     /* allow color picker to open */
.sample-hero h1 { font: var(--kj-text-2xl) var(--kj-font-display); margin: 0 0 var(--kj-space-sm); }
.sample-hero code { font: var(--kj-text-sm) var(--kj-font-mono); color: var(--kj-color-neutral); }
.sample-h2 { font: var(--kj-text-xl) var(--kj-font-display); margin: var(--kj-space-2xl) 0 var(--kj-space-md); }

.buttons-grid {
  display: flex; flex-wrap: wrap; gap: var(--kj-space-sm);
  margin-bottom: var(--kj-space-md);
}

.form-card {
  display: grid; gap: var(--kj-space-md);
  background: var(--kj-color-base-200);
  border: var(--kj-border) solid var(--kj-color-base-300);
  border-radius: var(--kj-radius-box);
  padding: var(--kj-space-lg);
  max-width: 480px;
}
.form-card label { display: grid; gap: var(--kj-space-xs); font: var(--kj-text-sm) var(--kj-font-mono); }
.form-actions { display: flex; gap: var(--kj-space-sm); }

.callout {
  padding: var(--kj-space-md) var(--kj-space-lg);
  border-radius: var(--kj-radius-box);
  border-left: 4px solid;
  margin-bottom: var(--kj-space-sm);
  background: var(--kj-color-base-200);
}
.callout.info        { border-color: var(--kj-color-info); }
.callout.success     { border-color: var(--kj-color-success); }
.callout.warning     { border-color: var(--kj-color-warning); }
.callout.destructive { border-color: var(--kj-color-destructive); }

.sample-inline a { color: var(--kj-color-primary); }
.muted { color: var(--kj-color-neutral); }

.surface { padding: var(--kj-space-md); border: 1px solid var(--kj-color-base-300); border-radius: var(--kj-radius-box); margin-bottom: var(--kj-space-sm); }
.s-100 { background: var(--kj-color-base-100); }
.s-200 { background: var(--kj-color-base-200); }
.s-300 { background: var(--kj-color-base-300); }

/* Forced hover — duplicates :hover styles for buttons in the demo row */
.kj-button.is-force-hover { filter: brightness(1.05); transform: translateY(-1px); }
```

- [ ] **Step 2: Replace placeholder preview content in generator**

In `theme-generator.html`, replace the `.generator-preview` block with:

```html
<div class="generator-preview" data-theme="custom-draft">
  <kj-theme-generator-preview />
</div>
```

In `theme-generator.ts`, add to imports:

```ts
import { ThemeGeneratorPreviewComponent } from './preview/theme-generator-preview';
// add to @Component imports array
imports: [DocsSidebarComponent, KjInputComponent, ThemeGeneratorPreviewComponent],
```

- [ ] **Step 3: Smoke test**

Reload /theme-generator. Expected: preview pane now shows hero, buttons grid (every variant), form card, callouts, inline kbd/link/muted, and surface stack — all themed by the draft.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/app/pages/theme-generator/preview/ apps/docs/src/app/pages/theme-generator/theme-generator.ts apps/docs/src/app/pages/theme-generator/theme-generator.html
git commit -m "feat(docs): theme generator — full sample preview content"
```

---

### Task C6: Sidebar — delete saved themes with 5s undo

**Files:**
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.ts`
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.html`
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.css`

- [ ] **Step 1: Add undo state to sidebar**

```ts
// in docs-sidebar.ts class
protected readonly pendingDelete = signal<{ name: string; theme: any; timer: number } | null>(null);

protected onDeleteSaved(name: string, ev: MouseEvent): void {
  ev.stopPropagation(); ev.preventDefault();
  const theme = this.draftService.list().find(t => t.name === name);
  if (!theme) return;
  this.draftService.delete(name);
  const timer = window.setTimeout(() => this.pendingDelete.set(null), 5000);
  this.pendingDelete.set({ name, theme, timer });
}

protected undoDelete(): void {
  const p = this.pendingDelete();
  if (!p) return;
  clearTimeout(p.timer);
  // Re-import via the draft service then save
  this.draftService.importJson(JSON.stringify(p.theme));
  this.draftService.save();
  this.pendingDelete.set(null);
}
```

- [ ] **Step 2: Update My themes row markup**

Replace the `@for (name of myThemes(); track name)` block with:

```html
@for (name of myThemes(); track name) {
  <div class="sidebar-row">
    <a routerLink="/theme-generator" class="sidebar-link sidebar-link-flex"
       (click)="onLoadSaved(name)">{{ name }}</a>
    <button type="button" class="sidebar-row-delete"
            [attr.aria-label]="'Delete ' + name"
            (click)="onDeleteSaved(name, $event)">×</button>
  </div>
} @empty {
  <p class="sidebar-empty">No saved themes yet.</p>
}
```

After the `@empty`, add the undo banner:

```html
@if (pendingDelete(); as p) {
  <div class="sidebar-undo" role="status" aria-live="polite">
    Deleted "{{ p.name }}".
    <button type="button" (click)="undoDelete()">Undo</button>
  </div>
}
```

- [ ] **Step 3: CSS**

Append to `docs-sidebar.css`:

```css
.sidebar-row {
  display: flex;
  align-items: center;
  position: relative;
}
.sidebar-row .sidebar-link-flex { flex: 1; }
.sidebar-row-delete {
  opacity: 0;
  background: transparent;
  border: none;
  color: var(--kj-color-neutral);
  cursor: pointer;
  padding: 0 var(--kj-space-sm);
  font-size: 1.25rem;
}
.sidebar-row:hover .sidebar-row-delete { opacity: 1; }
.sidebar-row-delete:hover { color: var(--kj-color-destructive); }
.sidebar-undo {
  margin: var(--kj-space-sm);
  padding: var(--kj-space-xs) var(--kj-space-sm);
  font: var(--kj-text-xs) var(--kj-font-mono);
  background: var(--kj-color-base-300);
  color: var(--kj-color-base-content);
  border-radius: var(--kj-radius-field);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sidebar-undo button {
  background: none; border: none; color: var(--kj-color-primary); cursor: pointer;
  font: inherit;
}
```

- [ ] **Step 4: Smoke test**

Save a theme → hover over its row in My themes → click ×. Expected: row disappears, undo banner shows for 5s, click Undo → theme returns.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/components/docs-sidebar/
git commit -m "feat(docs): theme generator sidebar — delete with 5s undo"
```

---

### Task C7: A11y polish + accessibility review

**Files:**
- Modify: `apps/docs/src/app/components/docs-sidebar/docs-sidebar.ts`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.html`

- [ ] **Step 1: Arrow-key roving tabindex on pills**

In `docs-sidebar.ts`, add a host listener:

```ts
@HostListener('keydown', ['$event'])
onSidebarKeydown(ev: KeyboardEvent): void {
  if (!(ev.target as HTMLElement).matches('.sidebar-pill')) return;
  if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
  ev.preventDefault();
  const pills = Array.from(this.document.querySelectorAll<HTMLElement>('.sidebar-pill'));
  const idx = pills.indexOf(ev.target as HTMLElement);
  const next = ev.key === 'ArrowRight' ? (idx + 1) % pills.length : (idx - 1 + pills.length) % pills.length;
  pills[next].focus();
}
```

- [ ] **Step 2: Add helper text + name validation feedback**

In `theme-generator.html`, replace the name input block with:

```html
<div class="generator-name-wrap">
  <input
    class="generator-name"
    type="text"
    placeholder="theme-name"
    [value]="draft().name"
    [attr.aria-invalid]="nameError() !== null"
    aria-describedby="name-helper"
    (input)="onNameChange($event)"
    aria-label="Theme name"
  />
  <span id="name-helper" class="generator-name-helper" [class.error]="nameError() !== null">
    {{ nameError() ?? 'kebab-case, max 32 chars' }}
  </span>
</div>
```

In `theme-generator.ts`, add:

```ts
import { BUILT_IN_NAMES } from '../../lib/theme/built-in-themes';

protected readonly nameError = computed<string | null>(() => {
  const n = this.draft().name;
  if (!n) return null;
  if ((BUILT_IN_NAMES as readonly string[]).includes(n)) return 'Reserved built-in name';
  if (n.length > 32) return 'Max 32 characters';
  if (!/^[a-z0-9-]+$/.test(n)) return 'Use lowercase letters, digits, and hyphens';
  return null;
});
```

Add `import { computed } from '@angular/core';` at the top.

CSS append to `theme-generator.css`:

```css
.generator-name-wrap { display: flex; flex-direction: column; gap: 2px; }
.generator-name-helper { font: var(--kj-text-xs) var(--kj-font-mono); color: var(--kj-color-neutral); }
.generator-name-helper.error { color: var(--kj-color-destructive); }
.generator-name[aria-invalid="true"] { border-color: var(--kj-color-destructive); }
```

Disable Save when nameError is set:

```html
<button type="button" class="generator-btn primary"
        [disabled]="nameError() !== null || !draft().name"
        (click)="save()">Save</button>
```

- [ ] **Step 3: Manual a11y check**

Run through the WCAG 2.1 checklist from CLAUDE.md against the new surfaces. Specifically verify:
- Tab order on the generator page: name input → action buttons → controls (in DOM order) → preview
- Pills are keyboard-reachable and navigable with arrow keys
- Color picker buttons have associated labels (label wraps the kj-input)
- Toast announces via `aria-live="polite"`
- Name input error announced via `aria-describedby`

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/app/components/docs-sidebar/ apps/docs/src/app/pages/theme-generator/
git commit -m "feat(docs): theme generator — a11y (pill arrow nav, name validation)"
```

---

### Task C8: Changeset + final smoke

**Files:**
- Create: `.changeset/theme-generator.md`

- [ ] **Step 1: Add changeset**

```markdown
---
'@kouji-ui/components': minor
---

`kj-input` now supports `type="color"`, exposing the native HTML color picker through the kouji-ui input wrapper. Includes `data-type` host attribute for CSS targeting and a small built-in style normalization (44×32px swatch). Backwards compatible — all existing `type` values continue to work.

This unlocks the new in-app theme generator at `/theme-generator` in the docs site.
```

- [ ] **Step 2: Final manual smoke (full path)**

```bash
pnpm --filter docs run dev
```

Walk through the full happy path:
1. Visit /theme-generator → sidebar Theme Generator pill is active.
2. Click "kouji" in Built-in themes → preview re-renders in the kouji palette.
3. Edit primary color in controls panel → preview button updates live.
4. Tweak radius slider → preview cards/buttons reflect new corners.
5. Switch font-display dropdown to "Syne" → preview heading changes (network shows fonts.googleapis.com request once).
6. Set theme name to `my-cool-theme` → Save → My themes group shows it.
7. Reload page → my-cool-theme persists in sidebar; reloading /theme-generator restores the draft.
8. Switch global theme picker (sidebar header) to `dark` → page chrome re-themes; preview pane stays on the draft (scoped).
9. Click Copy CSS → paste into a scratch file → contains `[data-theme="my-cool-theme"]` block + (if Syne selected) `@import url('https://fonts.googleapis.com/...Syne...');`.
10. Click Export JSON → downloaded file → delete from My themes → Import the file back → theme reappears identically.
11. Hover row in My themes → × button → click → row disappears with undo banner → click Undo → row returns.
12. Try to save with name `kouji` → Save button disabled, helper text "Reserved built-in name".

- [ ] **Step 3: Run full test + lint sweep**

```bash
pnpm test                                  # all packages incl. docs
pnpm --filter docs run lint
```

Expected: green across the board.

- [ ] **Step 4: Commit changeset**

```bash
git add .changeset/theme-generator.md
git commit -m "chore: changeset for kj-input type=color"
```

---

## Plan complete

When all phases are merged:
- `/theme-generator` lives behind the new sidebar pill.
- Users can fork built-in themes, edit colors/shape/type/motion, save multiple drafts to localStorage, and export as CSS or JSON (with auto Google Fonts `@import` lines).
- Preview is properly scoped — global theme picker stays in control of page chrome.
- `kj-input` now exposes native color picker support for any consumer.

Follow-ups not in scope:
- E2E tests (no Playwright harness yet).
- Custom OKLCH color wheel.
- Live Google Fonts API search.
- Theme marketplace / cloud sync.
