# Theme generator layout (tabs spine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three-column sidebar (theme list + token editor + scorecard) with a two-area shell (theme rail + tabbed configuration panel) plus the existing preview canvas, freeing horizontal space and surfacing every configuration area in one click.

**Architecture:** Keep `ThemeGeneratorShellComponent` as the page shell. Split today’s `ThemeGeneratorSidebarComponent` Col B into per-tab focused panel components (`colors-panel`, `shape-motion-panel`, `type-panel`, `a11y-panel`). The sidebar shrinks to the theme rail (Col A) only. Page-level toolbar moves into a new `theme-toolbar` component glued to the configure panel. Tabs use `<kj-tabs>` from `@kouji-ui/components`. Mobile uses a CDK-based drawer on the same component tree.

**Tech Stack:** Angular 20 (signals, OnPush), `@kouji-ui/components` (tabs, button, input, dialog), CDK focus-trap (already used in `kj-dialog`), CSS layers in line with `rules/architecture.md`.

**Spec:** [`docs/superpowers/specs/2026-05-09-theme-generator-layout-design.md`](../specs/2026-05-09-theme-generator-layout-design.md)

**Companion:** Run after (or parallel to) [`2026-05-09-theme-token-accessibility.md`](./2026-05-09-theme-token-accessibility.md). The Accessibility tab consumes that plan’s `ContrastScorecard` refactor; if this plan executes first, the existing scorecard still renders inside the new tab — no behavioural blockers.

---

## File Structure

**Create**

- `apps/docs/src/app/components/theme-toolbar/theme-toolbar.ts` — header strip (name, palette, save/share/export, a11y chip)
- `apps/docs/src/app/components/theme-toolbar/theme-toolbar.html`
- `apps/docs/src/app/components/theme-toolbar/theme-toolbar.css`
- `apps/docs/src/app/components/theme-toolbar/theme-toolbar.spec.ts`
- `apps/docs/src/app/components/theme-rail/theme-rail.ts` — Col A only (built-ins + my themes + new)
- `apps/docs/src/app/components/theme-rail/theme-rail.html`
- `apps/docs/src/app/components/theme-rail/theme-rail.css`
- `apps/docs/src/app/components/theme-rail/theme-rail.spec.ts`
- `apps/docs/src/app/components/theme-config-panel/theme-config-panel.ts` — `<kj-tabs>` host with the four panels
- `apps/docs/src/app/components/theme-config-panel/theme-config-panel.html`
- `apps/docs/src/app/components/theme-config-panel/theme-config-panel.css`
- `apps/docs/src/app/components/theme-config-panel/theme-config-panel.spec.ts`
- `apps/docs/src/app/components/theme-config-panel/panels/colors-panel.ts` (+ html/css/spec)
- `apps/docs/src/app/components/theme-config-panel/panels/shape-motion-panel.ts` (+ html/css/spec)
- `apps/docs/src/app/components/theme-config-panel/panels/type-panel.ts` (+ html/css/spec)
- `apps/docs/src/app/components/theme-config-panel/panels/a11y-panel.ts` (+ html/css/spec)

**Modify**

- `apps/docs/src/app/shells/theme-generator-shell/theme-generator-shell.ts/html/css` — switch to rail + main layout; main hosts toolbar + tabs + preview
- `apps/docs/src/app/pages/theme-generator/theme-generator.ts/html/css` — page becomes a thin host (toolbar wired here, drawer trigger on mobile)
- `apps/docs/src/app/components/theme-generator-sidebar/*` — kept only if the rail extracts incrementally; otherwise marked deprecated and removed in the final task
- `apps/docs/src/app/services/sidebar-toggle.service.ts` — rename behaviour to “configure drawer” (still drives `open()` signal); name kept for diff continuity (no rename in this plan)
- `apps/docs/e2e/theme-generator.spec.ts` — switch to tab-based selectors
- `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.spec.ts` — removed in the deletion task

---

## Task 1: Extract `ThemeRail` (Col A only)

**Files:**
- Create: `apps/docs/src/app/components/theme-rail/theme-rail.ts`
- Create: `apps/docs/src/app/components/theme-rail/theme-rail.html`
- Create: `apps/docs/src/app/components/theme-rail/theme-rail.css`
- Create: `apps/docs/src/app/components/theme-rail/theme-rail.spec.ts`

- [ ] **Step 1: Write failing component spec**

```ts
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { provideRouter } from '@angular/router';
import { ThemeRail } from './theme-rail';
import { BUILT_IN_NAMES } from '../../lib/theme/built-in-themes';

describe('ThemeRail', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  test('renders one row per built-in theme', () => {
    const fixture = TestBed.createComponent(ThemeRail);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('button.theme-row');
    expect(rows.length).toBeGreaterThanOrEqual(BUILT_IN_NAMES.length);
  });

  test('exposes a “New theme” button', () => {
    const fixture = TestBed.createComponent(ThemeRail);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button.new-theme');
    expect(btn?.textContent).toMatch(/new theme/i);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm --filter @kouji-ui/docs test theme-rail`
Expected: FAIL — file missing.

- [ ] **Step 3: Implement the component**

`theme-rail.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { BUILT_IN_NAMES, type BuiltInName } from '../../lib/theme/built-in-themes';

@Component({
  selector: 'kj-theme-rail',
  standalone: true,
  templateUrl: './theme-rail.html',
  styleUrl: './theme-rail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeRail {
  private readonly draftService = inject(ThemeDraftService);

  protected readonly builtIns = BUILT_IN_NAMES;
  protected readonly mySaved   = computed(() => this.draftService.list().map(t => t.name));
  protected readonly currentName = computed(() => this.draftService.draft().name);

  protected readonly activeBase = computed<string>(() => {
    const n = this.currentName();
    if (n.endsWith('-fork')) {
      const base = n.slice(0, -5);
      if ((BUILT_IN_NAMES as readonly string[]).includes(base as BuiltInName)) return base;
    }
    return n;
  });

  protected onForkBuiltIn(name: BuiltInName): void { this.draftService.loadFork(name); }
  protected onLoadSaved(name: string): void { this.draftService.loadSaved(name); }
  protected onNewTheme(): void { this.draftService.loadFork('light'); this.draftService.setName(''); }
}
```

`theme-rail.html`:

```html
<nav class="rail" role="navigation" aria-label="Themes">
  <p class="rail-label">Themes</p>
  <p class="rail-group">Built-in</p>
  @for (name of builtIns; track name) {
    <button type="button"
            class="theme-row"
            [class.active]="activeBase() === name"
            (click)="onForkBuiltIn(name)">
      <span class="swatch" [attr.data-theme]="name" aria-hidden="true"></span>
      <span class="theme-name">{{ name }}</span>
    </button>
  }

  @if (mySaved().length > 0) {
    <p class="rail-group">My themes</p>
    @for (name of mySaved(); track name) {
      <button type="button"
              class="theme-row"
              [class.active]="currentName() === name"
              (click)="onLoadSaved(name)">
        <span class="swatch saved" aria-hidden="true"></span>
        <span class="theme-name">{{ name }}</span>
      </button>
    }
  }

  <button type="button" class="new-theme" (click)="onNewTheme()">＋ New theme</button>
</nav>
```

`theme-rail.css` — port the Col A rules from `theme-generator-sidebar.css` lines 11–82 (label, group, theme-row, swatch, new-theme), replacing `.col-a` with `.rail` and `.col-label`/`.col-group` with `.rail-label`/`.rail-group`.

```css
:host { display: block; height: 100%; min-height: 0; }

.rail {
  width: 220px;
  padding: 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  height: 100%;
  background: var(--kj-color-base-100);
  border-right: 1px solid var(--kj-color-base-300);
}

.rail-label, .rail-group {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: color-mix(in oklch, var(--kj-color-base-content) 60%, transparent);
  margin: 0 0 8px;
  padding: 0 8px;
}
.rail-group { margin: 12px 0 4px; }
.rail-group:first-of-type { margin-top: 0; }

.theme-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; border-radius: 6px;
  background: transparent; border: 0;
  color: var(--kj-color-base-content);
  font: inherit; font-size: 12px;
  cursor: pointer; text-align: left;
  min-height: 44px;
}
.theme-row:hover  { background: var(--kj-color-base-200); }
.theme-row:focus-visible { outline: 2px solid var(--kj-color-primary); outline-offset: 2px; }
.theme-row.active {
  background: color-mix(in oklch, var(--kj-color-primary) 12%, transparent);
  color: var(--kj-color-primary);
  font-weight: 500;
}

.swatch {
  width: 16px; height: 16px; border-radius: 3px;
  background: linear-gradient(135deg, var(--kj-color-primary, #b8f500) 50%, var(--kj-color-secondary, #00d4ff) 50%);
  flex-shrink: 0;
  border: 1px solid var(--kj-color-base-300);
}
.swatch.saved {
  background: linear-gradient(135deg, var(--kj-color-accent, #ff00aa) 50%, var(--kj-color-base-content, #fff) 50%);
}

.new-theme {
  margin-top: 12px; padding: 7px 10px;
  background: transparent;
  border: 1px dashed var(--kj-color-base-300);
  border-radius: 6px;
  color: var(--kj-color-primary);
  font: inherit; font-size: 12px;
  cursor: pointer; min-height: 44px;
}
.new-theme:hover { border-color: var(--kj-color-primary); }
```

- [ ] **Step 4: Run — expect pass**

Run: `pnpm --filter @kouji-ui/docs test theme-rail`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/components/theme-rail
git commit -m "feat(theme-gen): extract ThemeRail (theme list only)"
```

---

## Task 2: `ThemeToolbar` — name + palette + actions + a11y chip

**Files:**
- Create: `apps/docs/src/app/components/theme-toolbar/theme-toolbar.ts`
- Create: `apps/docs/src/app/components/theme-toolbar/theme-toolbar.html`
- Create: `apps/docs/src/app/components/theme-toolbar/theme-toolbar.css`
- Create: `apps/docs/src/app/components/theme-toolbar/theme-toolbar.spec.ts`

- [ ] **Step 1: Write failing component spec**

```ts
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { provideRouter } from '@angular/router';
import { ThemeToolbar } from './theme-toolbar';

describe('ThemeToolbar', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  test('emits requestA11y when the a11y chip is activated', () => {
    const fixture = TestBed.createComponent(ThemeToolbar);
    let received = false;
    fixture.componentInstance.requestA11y.subscribe(() => { received = true; });
    fixture.detectChanges();
    const chip = fixture.nativeElement.querySelector('button.a11y-chip');
    chip.click();
    expect(received).toBe(true);
  });

  test('renders Save / Copy CSS / Copy link / Import / Download / Export buttons', () => {
    const fixture = TestBed.createComponent(ThemeToolbar);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('kj-button');
    const labels = Array.from(buttons).map((b: any) => b.textContent.trim().toLowerCase());
    for (const expected of ['save', 'copy css', 'copy link', 'import', 'download', 'export']) {
      expect(labels.some(l => l.includes(expected))).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm --filter @kouji-ui/docs test theme-toolbar`
Expected: FAIL.

- [ ] **Step 3: Implement the component**

`theme-toolbar.ts`:

```ts
import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { KjButtonComponent } from '@kouji-ui/components';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { ContrastScoreService } from '../../services/contrast-score.service';
import { ClipboardService } from '../../services/clipboard.service';
import { ThemeUrlService } from '../../services/theme-url.service';
import { FontLoaderService } from '../../services/font-loader.service';
import { CURATED_FONTS } from '../../lib/theme/font-catalog';
import { serializeToScopedBlock } from '../../lib/theme/serialize-theme';
import { BUILT_IN_NAMES } from '../../lib/theme/built-in-themes';
import { deriveFromSeed, randomAccessiblePalette } from '../../lib/theme/palette-derive';

@Component({
  selector: 'kj-theme-toolbar',
  standalone: true,
  imports: [KjButtonComponent],
  templateUrl: './theme-toolbar.html',
  styleUrl: './theme-toolbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToolbar {
  private readonly draftService = inject(ThemeDraftService);
  private readonly score = inject(ContrastScoreService);
  private readonly clipboard = inject(ClipboardService);
  private readonly url = inject(ThemeUrlService);
  private readonly fontLoader = inject(FontLoaderService);
  private readonly document = inject(DOCUMENT);

  /** Fired when the user activates the a11y summary chip. The host should focus the Accessibility tab. */
  @Output() readonly requestA11y = new EventEmitter<void>();
  /** Fired when the user activates the Import button. */
  @Output() readonly requestImport = new EventEmitter<void>();

  protected readonly draft = this.draftService.draft;
  protected readonly toast = signal<string | null>(null);

  protected readonly nameError = computed<string | null>(() => {
    const n = this.draft().name;
    if (!n) return null;
    if ((BUILT_IN_NAMES as readonly string[]).includes(n)) return 'Reserved built-in name';
    if (n.length > 32) return 'Max 32 characters';
    if (!/^[a-z0-9-]+$/.test(n)) return 'Use lowercase letters, digits, and hyphens';
    return null;
  });
  protected readonly saveDisabled = computed(() => !this.draft().name || this.nameError() !== null);

  protected readonly summary = computed(() =>
    this.score.buildReport(this.draftService.resolvedTokens(), this.draftService.draft()).summary,
  );

  protected onNameChange(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value
      .toLowerCase().trim().replace(/\s+/g, '-').slice(0, 32);
    this.draftService.setName(v);
  }

  protected save(): void {
    const r = this.draftService.save();
    this.flash(r.ok ? `Saved "${this.draft().name}"`
                    : r.reason === 'reserved' ? 'That name is reserved by a built-in theme'
                    : 'Pick a name first');
  }

  protected reset(): void { this.draftService.resetToOriginal(); this.flash('Reset'); }

  protected randomize(): void { this.draftService.setColors(randomAccessiblePalette()); }
  protected rederive(): void {
    const seed = this.draftService.draft().colors.primary;
    this.draftService.setColors(deriveFromSeed(seed, { mode: 'light' }));
  }

  async copyCss(): Promise<void> {
    const ok = await this.clipboard.copy(this.exportedCss());
    this.flash(ok ? 'CSS copied to clipboard' : 'Copy failed');
  }
  async copyLink(): Promise<void> {
    const ok = await this.clipboard.copy(this.url.copyShareLink());
    this.flash(ok ? 'Link copied' : 'Copy failed');
  }
  downloadCss(): void {
    const filename = `${this.draft().name || 'custom'}.kj-theme.css`;
    this.download(filename, this.exportedCss(), 'text/css');
  }
  exportJson(): void {
    const filename = `${this.draft().name || 'custom'}.kj-theme.json`;
    this.download(filename, JSON.stringify(this.draft(), null, 2), 'application/json');
  }

  private exportedCss(): string {
    const name = this.draft().name || 'custom';
    const importLines = this.fontImports();
    return [importLines, serializeToScopedBlock(name, this.draftService.resolvedTokens())]
      .filter(Boolean).join('\n\n');
  }
  private fontImports(): string {
    const used = new Set<string>();
    for (const k of ['fontSans', 'fontMono', 'fontDisplay'] as const) {
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
  private flash(msg: string): void { this.toast.set(msg); setTimeout(() => this.toast.set(null), 2500); }
}
```

`theme-toolbar.html`:

```html
<header class="toolbar">
  <div class="name-wrap">
    <input class="name"
           type="text"
           placeholder="theme-name"
           [value]="draft().name"
           [attr.aria-invalid]="nameError() !== null"
           aria-describedby="toolbar-name-helper"
           aria-label="Theme name"
           (input)="onNameChange($event)" />
    <span id="toolbar-name-helper" class="name-helper" [class.error]="nameError() !== null">
      {{ nameError() ?? 'kebab-case, max 32 chars' }}
    </span>
  </div>

  <div class="palette">
    <kj-button kjVariant="outline" kjSize="sm" (click)="randomize()" aria-label="Randomize palette">🎲 Random</kj-button>
    <kj-button kjVariant="outline" kjSize="sm" (click)="rederive()" aria-label="Re-derive secondary, accent, neutral, and semantic colors from primary">Re-derive</kj-button>
  </div>

  <div class="actions">
    <kj-button kjVariant="ghost"   kjSize="sm" (click)="reset()">Reset</kj-button>
    <kj-button kjVariant="default" kjSize="sm" [kjDisabled]="saveDisabled()" (click)="save()">Save</kj-button>
    <kj-button kjVariant="outline" kjSize="sm" (click)="copyCss()">Copy CSS</kj-button>
    <kj-button kjVariant="outline" kjSize="sm" (click)="copyLink()" aria-label="Copy share link">Copy link</kj-button>
    <kj-button kjVariant="outline" kjSize="sm" (click)="requestImport.emit()" aria-label="Import theme">Import…</kj-button>
    <kj-button kjVariant="outline" kjSize="sm" (click)="downloadCss()">Download .css</kj-button>
    <kj-button kjVariant="outline" kjSize="sm" (click)="exportJson()">Export JSON</kj-button>
  </div>

  <button type="button"
          class="a11y-chip"
          (click)="requestA11y.emit()"
          [attr.aria-label]="'Accessibility: ' + summary().aaaNormalPass + ' of ' + summary().aaaNormalTotal + ' pairs pass AAA. Open Accessibility tab.'">
    <span class="chip-bar">AAA {{ summary().aaaNormalPass }}/{{ summary().aaaNormalTotal }}</span>
    <span class="chip-bar chip-bar--ui">UI {{ summary().nonTextPass }}/{{ summary().nonTextTotal }}</span>
    <span class="chip-bar chip-bar--worst">min {{ summary().worstRatio.toFixed(2) }}:1</span>
  </button>
</header>

@if (toast(); as msg) {
  <div class="toolbar-toast" role="status" aria-live="polite">{{ msg }}</div>
}
```

`theme-toolbar.css`:

```css
:host { display: block; }

.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--kj-space-md);
  padding: var(--kj-space-sm) var(--kj-space-lg);
  border-bottom: 1px solid var(--kj-color-base-300);
  background: var(--kj-color-base-100);
}

.name-wrap { display: flex; flex-direction: column; gap: 2px; flex: 0 0 280px; min-width: 200px; }
.name {
  background: var(--kj-color-base-200);
  border: 1px solid var(--kj-color-base-300);
  border-radius: var(--kj-radius-field);
  color: var(--kj-color-base-content);
  padding: var(--kj-space-xs) var(--kj-space-sm);
  font: var(--kj-text-sm) var(--kj-font-mono);
  min-height: 44px;
}
.name[aria-invalid="true"] { border-color: var(--kj-color-destructive); }
.name-helper { font: var(--kj-text-xs) var(--kj-font-mono); color: var(--kj-color-neutral); }
.name-helper.error { color: var(--kj-color-destructive); }

.palette, .actions { display: flex; gap: var(--kj-space-xs); flex-wrap: wrap; }
.actions { margin-left: auto; }

.a11y-chip {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.25rem 0.625rem;
  border: 1px solid var(--kj-color-base-300);
  border-radius: 999px;
  background: var(--kj-color-base-200);
  color: var(--kj-color-base-content);
  cursor: pointer;
  min-height: 44px;
  font: var(--kj-text-xs) var(--kj-font-mono);
}
.a11y-chip:focus-visible { outline: 2px solid var(--kj-color-primary); outline-offset: 2px; }
.chip-bar { padding: 0.125rem 0.4rem; border-radius: 999px; background: var(--kj-color-success); color: var(--kj-color-success-content); }
.chip-bar--ui    { background: var(--kj-color-info); color: var(--kj-color-info-content); }
.chip-bar--worst { background: var(--kj-color-base-300); color: var(--kj-color-base-content); }

.toolbar-toast {
  position: fixed; right: var(--kj-space-lg); bottom: var(--kj-space-lg);
  background: var(--kj-color-base-300); color: var(--kj-color-base-content);
  padding: var(--kj-space-sm) var(--kj-space-md); border-radius: var(--kj-radius-field);
  font: var(--kj-text-sm) var(--kj-font-mono);
}
```

- [ ] **Step 4: Run — expect pass**

Run: `pnpm --filter @kouji-ui/docs test theme-toolbar`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/components/theme-toolbar
git commit -m "feat(theme-gen): add ThemeToolbar (name, palette, actions, a11y chip)"
```

---

## Task 3: `ColorsPanel`

**Files:**
- Create: `apps/docs/src/app/components/theme-config-panel/panels/colors-panel.ts`
- Create: `apps/docs/src/app/components/theme-config-panel/panels/colors-panel.html`
- Create: `apps/docs/src/app/components/theme-config-panel/panels/colors-panel.css`
- Create: `apps/docs/src/app/components/theme-config-panel/panels/colors-panel.spec.ts`

- [ ] **Step 1: Write failing spec**

```ts
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { provideRouter } from '@angular/router';
import { ColorsPanel } from './colors-panel';
import { ThemeDraftService } from '../../../services/theme-draft.service';

describe('ColorsPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  test('renders one row per color slot', () => {
    const fixture = TestBed.createComponent(ColorsPanel);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.control-row');
    expect(rows.length).toBeGreaterThanOrEqual(9);
  });

  test('updates draft when a color input changes', () => {
    const fixture = TestBed.createComponent(ColorsPanel);
    fixture.detectChanges();
    const draft = TestBed.inject(ThemeDraftService);
    const before = draft.draft().colors.primary;
    const input = fixture.nativeElement.querySelector('input[type="color"][data-slot="primary"]') as HTMLInputElement;
    input.value = '#ff00aa';
    input.dispatchEvent(new Event('input'));
    expect(draft.draft().colors.primary).not.toBe(before);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm --filter @kouji-ui/docs test colors-panel`
Expected: FAIL.

- [ ] **Step 3: Implement the panel**

Port the **Colors** `<details>` body from [`theme-generator-sidebar.html`](apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.html) lines 36–101 plus the related handlers from [`theme-generator-sidebar.ts`](apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.ts) lines 80–166 into a focused component.

`colors-panel.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { converter, formatHex } from 'culori';
import { KjInputComponent } from '@kouji-ui/components';
import { ThemeDraftService } from '../../../services/theme-draft.service';
import { SeedSwatchGrid } from '../../seed-swatch-grid/seed-swatch-grid';
import { deriveFromSeed, randomAccessiblePalette } from '../../../lib/theme/palette-derive';
import type { ColorSlot, ContentSlot } from '../../../lib/theme/types';

const COLOR_SLOTS: readonly ColorSlot[] = [
  'base-100', 'primary', 'secondary', 'accent', 'neutral',
  'info', 'success', 'warning', 'destructive',
];
const DERIVED_SLOTS: readonly ContentSlot[] = ['base-200', 'base-300', 'base-content'];

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
  selector: 'kj-colors-panel',
  standalone: true,
  imports: [KjInputComponent, SeedSwatchGrid],
  templateUrl: './colors-panel.html',
  styleUrl: './colors-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorsPanel {
  private readonly draftService = inject(ThemeDraftService);

  protected readonly draft = this.draftService.draft;
  protected readonly colorSlots = COLOR_SLOTS;
  protected readonly derivedSlots = DERIVED_SLOTS;

  protected readonly activeSeed = computed<string | null>(() => {
    if (this.draftService.dirtySlots().size > 0) return null;
    return this.draft().colors.primary;
  });

  protected onSeedPicked(hex: string): void {
    const derived = deriveFromSeed(hex, { mode: 'light' });
    this.draftService.setColors(derived);
  }
  protected randomize(): void { this.draftService.setColors(randomAccessiblePalette()); }
  protected rederive(): void {
    const seed = this.draft().colors.primary;
    this.draftService.setColors(deriveFromSeed(seed, { mode: 'light' }));
  }

  protected hexFor(slot: ColorSlot): string { return oklchToHex(this.draft().colors[slot]); }
  protected onColorChange(slot: ColorSlot, hex: string): void {
    this.draftService.setColor(slot, hexToOklch(hex));
  }

  protected contentFor(slot: ColorSlot): { value: string; isOverride: boolean } {
    const key: ContentSlot = slot === 'base-100' ? 'base-content' : `${slot}-content` as ContentSlot;
    return {
      value: this.draftService.resolvedTokens().contents[key],
      isOverride: !!this.draft().contentOverrides[key],
    };
  }
  protected hexForContent(slot: ColorSlot): string { return oklchToHex(this.contentFor(slot).value); }
  protected toggleContentOverride(slot: ColorSlot): void {
    const key: ContentSlot = slot === 'base-100' ? 'base-content' : `${slot}-content` as ContentSlot;
    if (this.draft().contentOverrides[key]) {
      this.draftService.setContentOverride(key, null);
    } else {
      this.draftService.setContentOverride(key, this.contentFor(slot).value);
    }
  }
  protected onContentChange(slot: ColorSlot, hex: string): void {
    const key: ContentSlot = slot === 'base-100' ? 'base-content' : `${slot}-content` as ContentSlot;
    this.draftService.setContentOverride(key, hexToOklch(hex));
  }

  protected derivedFor(slot: ContentSlot): { value: string; isOverride: boolean } {
    const tokens = this.draftService.resolvedTokens();
    let value: string;
    if (slot === 'base-200')      value = tokens.derivedBase.base200;
    else if (slot === 'base-300') value = tokens.derivedBase.base300;
    else                          value = tokens.contents[slot];
    return { value, isOverride: !!this.draft().contentOverrides[slot] };
  }
  protected hexForDerived(slot: ContentSlot): string { return oklchToHex(this.derivedFor(slot).value); }
  protected toggleDerivedOverride(slot: ContentSlot): void {
    if (this.draft().contentOverrides[slot]) {
      this.draftService.setContentOverride(slot, null);
    } else {
      this.draftService.setContentOverride(slot, this.derivedFor(slot).value);
    }
  }
  protected onDerivedChange(slot: ContentSlot, hex: string): void {
    this.draftService.setContentOverride(slot, hexToOklch(hex));
  }
}
```

`colors-panel.html`:

```html
<section class="colors-panel" aria-label="Colors">
  <kj-seed-swatch-grid
    [activeHex]="activeSeed()"
    (seedPicked)="onSeedPicked($event)" />

  <h3 class="group-heading">Surfaces</h3>
  @for (slot of derivedSlots; track slot) {
    <div class="control-row">
      <span class="control-label">{{ slot }}</span>
      <button type="button"
              class="content-swatch"
              [class.locked]="derivedFor(slot).isOverride"
              [style.background]="derivedFor(slot).value"
              [attr.aria-label]="derivedFor(slot).isOverride
                ? slot + ' (manual override — click to revert to auto-derive)'
                : slot + ' (auto-derived — click to override)'"
              (click)="toggleDerivedOverride(slot)"></button>
      @if (derivedFor(slot).isOverride) {
        <kj-input type="color"
                  [value]="hexForDerived(slot)"
                  (input)="onDerivedChange(slot, $any($event.target).value)" />
      }
    </div>
  }

  <h3 class="group-heading">Semantic fills</h3>
  @for (slot of colorSlots; track slot) {
    <div class="control-row">
      <span class="control-label">{{ slot }}</span>
      <input type="color"
             [attr.data-slot]="slot"
             [value]="hexFor(slot)"
             (input)="onColorChange(slot, $any($event.target).value)" />
      <button type="button"
              class="content-swatch"
              [class.locked]="contentFor(slot).isOverride"
              [style.background]="contentFor(slot).value"
              [attr.aria-label]="contentFor(slot).isOverride
                ? slot + ' content (manual override — click to revert to auto)'
                : slot + ' content (auto-derived — click to override)'"
              (click)="toggleContentOverride(slot)"></button>
      @if (contentFor(slot).isOverride) {
        <kj-input type="color"
                  [value]="hexForContent(slot)"
                  (input)="onContentChange(slot, $any($event.target).value)" />
      }
    </div>
  }
</section>
```

`colors-panel.css` — port `.col-b .control-row`, `.control-label`, `.content-swatch` rules from `theme-generator-sidebar.css` (lines 110–146) into this file. The selectors no longer need the `.col-b` prefix.

```css
:host { display: block; }

.colors-panel { padding: var(--kj-space-lg); }

.group-heading {
  margin: var(--kj-space-md) 0 var(--kj-space-xs);
  font: var(--kj-text-xs) var(--kj-font-mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: color-mix(in oklch, var(--kj-color-base-content) 60%, transparent);
}

.control-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--kj-space-sm);
  padding: var(--kj-space-xs) var(--kj-space-sm);
  min-height: 44px;
}
.control-label {
  font: var(--kj-text-sm) var(--kj-font-mono);
  color: var(--kj-color-neutral);
}
.content-swatch {
  width: 22px; height: 22px;
  border: 1px solid var(--kj-color-base-300);
  border-radius: 50%;
  cursor: pointer; padding: 0;
}
.content-swatch.locked { box-shadow: 0 0 0 2px var(--kj-color-primary); }
```

- [ ] **Step 4: Run — expect pass**

Run: `pnpm --filter @kouji-ui/docs test colors-panel`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/components/theme-config-panel/panels/colors-panel*
git commit -m "feat(theme-gen): ColorsPanel extracted from sidebar"
```

---

## Task 4: `ShapeMotionPanel`

**Files:**
- Create: `apps/docs/src/app/components/theme-config-panel/panels/shape-motion-panel.ts`
- Create: `apps/docs/src/app/components/theme-config-panel/panels/shape-motion-panel.html`
- Create: `apps/docs/src/app/components/theme-config-panel/panels/shape-motion-panel.css`
- Create: `apps/docs/src/app/components/theme-config-panel/panels/shape-motion-panel.spec.ts`

- [ ] **Step 1: Write failing spec**

```ts
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { ShapeMotionPanel } from './shape-motion-panel';
import { ThemeDraftService } from '../../../services/theme-draft.service';

describe('ShapeMotionPanel', () => {
  beforeEach(() => { localStorage.clear(); TestBed.configureTestingModule({}); });

  test('writes radiusBox changes through to the draft service', () => {
    const fixture = TestBed.createComponent(ShapeMotionPanel);
    fixture.detectChanges();
    const range = fixture.nativeElement.querySelector('input[data-shape="radiusBox"]') as HTMLInputElement;
    range.value = '12';
    range.dispatchEvent(new Event('input'));
    expect(TestBed.inject(ThemeDraftService).draft().shape.radiusBox).toBe(12);
  });

  test('renders a transition selector', () => {
    const fixture = TestBed.createComponent(ShapeMotionPanel);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('select[data-motion="transition"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm --filter @kouji-ui/docs test shape-motion-panel`
Expected: FAIL.

- [ ] **Step 3: Implement**

`shape-motion-panel.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeDraftService } from '../../../services/theme-draft.service';
import type { ShapeKey, MotionKey } from '../../../lib/theme/types';

@Component({
  selector: 'kj-shape-motion-panel',
  standalone: true,
  templateUrl: './shape-motion-panel.html',
  styleUrl: './shape-motion-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShapeMotionPanel {
  private readonly draftService = inject(ThemeDraftService);
  protected readonly draft = this.draftService.draft;
  protected onShape(key: ShapeKey, value: number): void { this.draftService.setShape(key, value); }
  protected onMotion(key: MotionKey, value: string): void { this.draftService.setMotion(key, value); }
}
```

`shape-motion-panel.html` — port the Shape and Motion `<details>` bodies from [`theme-generator-sidebar.html`](apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.html) lines 103–177 with bindings unchanged; add `data-shape` / `data-motion` attributes for tests; replace `details/summary` with grouped headings:

```html
<section class="shape-motion-panel" aria-label="Shape & motion">
  <h3 class="group-heading">Shape</h3>

  <label class="control-row">
    <span class="control-label">radius-box</span>
    <input type="range" min="0" max="32" data-shape="radiusBox"
           [value]="draft().shape.radiusBox"
           (input)="onShape('radiusBox', +$any($event.target).value)" />
    <span class="control-value">{{ draft().shape.radiusBox }}px</span>
  </label>

  <label class="control-row">
    <span class="control-label">radius-field</span>
    <input type="range" min="0" max="32" data-shape="radiusField"
           [value]="draft().shape.radiusField"
           (input)="onShape('radiusField', +$any($event.target).value)" />
    <span class="control-value">{{ draft().shape.radiusField }}px</span>
  </label>

  <label class="control-row">
    <span class="control-label">radius-selector</span>
    <input type="range" min="0" max="32" data-shape="radiusSelector"
           [value]="draft().shape.radiusSelector"
           (input)="onShape('radiusSelector', +$any($event.target).value)" />
    <span class="control-value">{{ draft().shape.radiusSelector }}px</span>
  </label>

  <label class="control-row">
    <span class="control-label">border</span>
    <select data-shape="border"
            [value]="draft().shape.border"
            (change)="onShape('border', +$any($event.target).value)">
      <option [value]="0">0px</option><option [value]="1">1px</option>
      <option [value]="2">2px</option><option [value]="4">4px</option>
    </select>
  </label>

  <label class="control-row">
    <span class="control-label">depth</span>
    <select data-shape="depth"
            [value]="draft().shape.depth"
            (change)="onShape('depth', +$any($event.target).value)">
      <option [value]="0">0</option><option [value]="1">1</option><option [value]="2">2</option>
    </select>
  </label>

  <h3 class="group-heading">Motion</h3>
  <label class="control-row">
    <span class="control-label">transition</span>
    <select data-motion="transition"
            [value]="draft().motion.transition"
            (change)="onMotion('transition', $any($event.target).value)">
      <option value="0s">none</option>
      <option value="0.12s ease">fast</option>
      <option value="0.2s ease">base</option>
      <option value="0.4s ease">slow</option>
    </select>
  </label>
</section>
```

`shape-motion-panel.css`:

```css
:host { display: block; }
.shape-motion-panel { padding: var(--kj-space-lg); }

.group-heading {
  margin: var(--kj-space-md) 0 var(--kj-space-xs);
  font: var(--kj-text-xs) var(--kj-font-mono);
  text-transform: uppercase; letter-spacing: 0.06em;
  color: color-mix(in oklch, var(--kj-color-base-content) 60%, transparent);
}
.control-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--kj-space-sm); padding: var(--kj-space-xs) var(--kj-space-sm); min-height: 44px;
}
.control-label { font: var(--kj-text-sm) var(--kj-font-mono); color: var(--kj-color-neutral); }
.control-row input[type="range"] { flex: 1; accent-color: var(--kj-color-primary); }
.control-row select {
  background: var(--kj-color-base-200);
  border: 1px solid var(--kj-color-base-300);
  color: var(--kj-color-base-content);
  padding: var(--kj-space-xs) var(--kj-space-sm);
  border-radius: var(--kj-radius-field);
  font: var(--kj-text-sm) var(--kj-font-mono);
  min-height: 44px;
}
.control-value {
  font: var(--kj-text-xs) var(--kj-font-mono);
  color: var(--kj-color-neutral); min-width: 40px; text-align: right;
}
```

- [ ] **Step 4: Run — expect pass**

Run: `pnpm --filter @kouji-ui/docs test shape-motion-panel`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/components/theme-config-panel/panels/shape-motion-panel*
git commit -m "feat(theme-gen): ShapeMotionPanel extracted from sidebar"
```

---

## Task 5: `TypePanel` (also exposes typography sliders)

**Files:**
- Create: `apps/docs/src/app/components/theme-config-panel/panels/type-panel.ts`
- Create: `apps/docs/src/app/components/theme-config-panel/panels/type-panel.html`
- Create: `apps/docs/src/app/components/theme-config-panel/panels/type-panel.css`
- Create: `apps/docs/src/app/components/theme-config-panel/panels/type-panel.spec.ts`

- [ ] **Step 1: Write failing spec**

```ts
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { TypePanel } from './type-panel';
import { ThemeDraftService } from '../../../services/theme-draft.service';

describe('TypePanel', () => {
  beforeEach(() => { localStorage.clear(); TestBed.configureTestingModule({}); });

  test('renders a select for each font key', () => {
    const fixture = TestBed.createComponent(TypePanel);
    fixture.detectChanges();
    const selects = fixture.nativeElement.querySelectorAll('select[data-font]');
    expect(selects.length).toBe(3);
  });

  test('writes bodyRem changes through to the draft service', () => {
    const fixture = TestBed.createComponent(TypePanel);
    fixture.detectChanges();
    const range = fixture.nativeElement.querySelector('input[data-typography="bodyRem"]') as HTMLInputElement;
    range.value = '1.125';
    range.dispatchEvent(new Event('input'));
    expect(TestBed.inject(ThemeDraftService).draft().typography.bodyRem).toBeCloseTo(1.125, 3);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm --filter @kouji-ui/docs test type-panel`
Expected: FAIL.

- [ ] **Step 3: Implement**

`type-panel.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeDraftService } from '../../../services/theme-draft.service';
import { FontLoaderService } from '../../../services/font-loader.service';
import { CURATED_FONTS, type CuratedFont } from '../../../lib/theme/font-catalog';
import type { FontKey, TypographyKey } from '../../../lib/theme/types';

@Component({
  selector: 'kj-type-panel',
  standalone: true,
  templateUrl: './type-panel.html',
  styleUrl: './type-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypePanel {
  private readonly draftService = inject(ThemeDraftService);
  private readonly fontLoader = inject(FontLoaderService);

  protected readonly draft = this.draftService.draft;
  protected readonly fonts: readonly CuratedFont[] = CURATED_FONTS;

  protected fontIdFor(key: FontKey): string {
    const family = this.draft().type[key];
    return CURATED_FONTS.find(f => family.includes(f.family))?.id ?? 'system-ui';
  }

  protected onFont(key: FontKey, fontId: string): void {
    const font = CURATED_FONTS.find(f => f.id === fontId);
    if (!font) return;
    this.fontLoader.ensureLoaded(fontId);
    const stack = font.category === 'mono'
      ? `'${font.family}', monospace`
      : `'${font.family}', system-ui, sans-serif`;
    this.draftService.setFont(key, stack);
  }

  protected onTypography(key: TypographyKey, value: number): void {
    this.draftService.setTypography(key, value);
  }
}
```

`type-panel.html`:

```html
<section class="type-panel" aria-label="Type">
  <h3 class="group-heading">Fonts</h3>

  <label class="control-row">
    <span class="control-label">font-sans</span>
    <select data-font="fontSans"
            [value]="fontIdFor('fontSans')"
            (change)="onFont('fontSans', $any($event.target).value)">
      @for (f of fonts; track f.id) { <option [value]="f.id">{{ f.family }}</option> }
    </select>
  </label>

  <label class="control-row">
    <span class="control-label">font-mono</span>
    <select data-font="fontMono"
            [value]="fontIdFor('fontMono')"
            (change)="onFont('fontMono', $any($event.target).value)">
      @for (f of fonts; track f.id) { <option [value]="f.id">{{ f.family }}</option> }
    </select>
  </label>

  <label class="control-row">
    <span class="control-label">font-display</span>
    <select data-font="fontDisplay"
            [value]="fontIdFor('fontDisplay')"
            (change)="onFont('fontDisplay', $any($event.target).value)">
      @for (f of fonts; track f.id) { <option [value]="f.id">{{ f.family }}</option> }
    </select>
  </label>

  <h3 class="group-heading">Sizes</h3>

  <label class="control-row">
    <span class="control-label">body</span>
    <input type="range" min="0.75" max="1.25" step="0.0625" data-typography="bodyRem"
           [value]="draft().typography.bodyRem"
           (input)="onTypography('bodyRem', +$any($event.target).value)" />
    <span class="control-value">{{ draft().typography.bodyRem }}rem</span>
  </label>

  <label class="control-row">
    <span class="control-label">small</span>
    <input type="range" min="0.625" max="1" step="0.0625" data-typography="smallRem"
           [value]="draft().typography.smallRem"
           (input)="onTypography('smallRem', +$any($event.target).value)" />
    <span class="control-value">{{ draft().typography.smallRem }}rem</span>
  </label>
</section>
```

`type-panel.css` — same skeleton as `shape-motion-panel.css` (group-heading, control-row, control-label, control-value, range/select styles). Copy verbatim.

- [ ] **Step 4: Run — expect pass**

Run: `pnpm --filter @kouji-ui/docs test type-panel`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/components/theme-config-panel/panels/type-panel*
git commit -m "feat(theme-gen): TypePanel with font selectors and typography sliders"
```

---

## Task 6: `A11yPanel` — host the scorecard

**Files:**
- Create: `apps/docs/src/app/components/theme-config-panel/panels/a11y-panel.ts`
- Create: `apps/docs/src/app/components/theme-config-panel/panels/a11y-panel.html`
- Create: `apps/docs/src/app/components/theme-config-panel/panels/a11y-panel.css`
- Create: `apps/docs/src/app/components/theme-config-panel/panels/a11y-panel.spec.ts`

- [ ] **Step 1: Write failing spec**

```ts
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { A11yPanel } from './a11y-panel';

describe('A11yPanel', () => {
  beforeEach(() => { localStorage.clear(); TestBed.configureTestingModule({}); });

  test('renders the contrast scorecard', () => {
    const fixture = TestBed.createComponent(A11yPanel);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-contrast-scorecard')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm --filter @kouji-ui/docs test a11y-panel`
Expected: FAIL.

- [ ] **Step 3: Implement**

`a11y-panel.ts`:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ContrastScorecard } from '../../contrast-scorecard/contrast-scorecard';

@Component({
  selector: 'kj-a11y-panel',
  standalone: true,
  imports: [ContrastScorecard],
  templateUrl: './a11y-panel.html',
  styleUrl: './a11y-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class A11yPanel {}
```

`a11y-panel.html`:

```html
<section class="a11y-panel" aria-label="Theme accessibility checks">
  <p class="caption">
    Theme token checks. These verify the colors and typography in your draft against WCAG 2.1 thresholds.
    They do not audit component behavior.
  </p>
  <kj-contrast-scorecard />
</section>
```

`a11y-panel.css`:

```css
:host { display: block; }
.a11y-panel { padding: var(--kj-space-lg); }
.caption {
  margin: 0 0 var(--kj-space-md);
  font: var(--kj-text-xs) var(--kj-font-mono);
  color: color-mix(in oklch, var(--kj-color-base-content) 70%, transparent);
}
```

- [ ] **Step 4: Run — expect pass**

Run: `pnpm --filter @kouji-ui/docs test a11y-panel`
Expected: 1 test passes.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/components/theme-config-panel/panels/a11y-panel*
git commit -m "feat(theme-gen): A11yPanel hosts the contrast scorecard"
```

---

## Task 7: `ThemeConfigPanel` — tabs container

**Files:**
- Create: `apps/docs/src/app/components/theme-config-panel/theme-config-panel.ts`
- Create: `apps/docs/src/app/components/theme-config-panel/theme-config-panel.html`
- Create: `apps/docs/src/app/components/theme-config-panel/theme-config-panel.css`
- Create: `apps/docs/src/app/components/theme-config-panel/theme-config-panel.spec.ts`

- [ ] **Step 1: Write failing spec**

```ts
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { ThemeConfigPanel } from './theme-config-panel';

describe('ThemeConfigPanel', () => {
  beforeEach(() => { localStorage.clear(); TestBed.configureTestingModule({}); });

  test('renders four tabs (Colors, Shape & motion, Type, Accessibility)', () => {
    const fixture = TestBed.createComponent(ThemeConfigPanel);
    fixture.detectChanges();
    const tabs = fixture.nativeElement.querySelectorAll('kj-tab');
    expect(tabs.length).toBe(4);
    const labels = Array.from(tabs).map((t: any) => t.textContent.trim().toLowerCase());
    expect(labels).toEqual(['colors', 'shape & motion', 'type', 'accessibility']);
  });

  test('switches the active tab when activate() is called', () => {
    const fixture = TestBed.createComponent(ThemeConfigPanel);
    fixture.detectChanges();
    fixture.componentInstance.activate('a11y');
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('a11y');
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm --filter @kouji-ui/docs test theme-config-panel`
Expected: FAIL.

- [ ] **Step 3: Implement**

`theme-config-panel.ts`:

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent } from '@kouji-ui/components';
import { ColorsPanel } from './panels/colors-panel';
import { ShapeMotionPanel } from './panels/shape-motion-panel';
import { TypePanel } from './panels/type-panel';
import { A11yPanel } from './panels/a11y-panel';

export type ConfigTab = 'colors' | 'shape-motion' | 'type' | 'a11y';

@Component({
  selector: 'kj-theme-config-panel',
  standalone: true,
  imports: [
    KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent,
    ColorsPanel, ShapeMotionPanel, TypePanel, A11yPanel,
  ],
  templateUrl: './theme-config-panel.html',
  styleUrl: './theme-config-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeConfigPanel {
  private readonly _active = signal<ConfigTab>('colors');
  readonly active = this._active.asReadonly();

  /** Programmatic tab switch (used by toolbar a11y chip). */
  activate(tab: ConfigTab): void { this._active.set(tab); }

  protected onValueChange(v: string): void {
    if (v === 'colors' || v === 'shape-motion' || v === 'type' || v === 'a11y') {
      this._active.set(v);
    }
  }
}
```

`theme-config-panel.html`:

```html
<kj-tabs
  [value]="active()"
  (valueChange)="onValueChange($event)">
  <kj-tab-list>
    <kj-tab value="colors">Colors</kj-tab>
    <kj-tab value="shape-motion">Shape & motion</kj-tab>
    <kj-tab value="type">Type</kj-tab>
    <kj-tab value="a11y">Accessibility</kj-tab>
  </kj-tab-list>

  <kj-tab-panel value="colors">       <kj-colors-panel /> </kj-tab-panel>
  <kj-tab-panel value="shape-motion"> <kj-shape-motion-panel /> </kj-tab-panel>
  <kj-tab-panel value="type">         <kj-type-panel /> </kj-tab-panel>
  <kj-tab-panel value="a11y">         <kj-a11y-panel /> </kj-tab-panel>
</kj-tabs>
```

`theme-config-panel.css`:

```css
:host { display: flex; flex-direction: column; min-height: 0; flex: 1; overflow: hidden; }
kj-tabs { display: flex; flex-direction: column; min-height: 0; flex: 1; }
kj-tab-list { position: sticky; top: 0; z-index: 1; background: var(--kj-color-base-100); border-bottom: 1px solid var(--kj-color-base-300); }
kj-tab-panel { overflow-y: auto; flex: 1; min-height: 0; }
```

- [ ] **Step 4: Run — expect pass**

Run: `pnpm --filter @kouji-ui/docs test theme-config-panel`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/components/theme-config-panel/theme-config-panel*
git commit -m "feat(theme-gen): ThemeConfigPanel with four tabs"
```

---

## Task 8: Wire shell + page to the new layout

**Files:**
- Modify: `apps/docs/src/app/shells/theme-generator-shell/theme-generator-shell.html`
- Modify: `apps/docs/src/app/shells/theme-generator-shell/theme-generator-shell.css`
- Modify: `apps/docs/src/app/shells/theme-generator-shell/theme-generator-shell.ts`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.ts`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.html`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.css`

- [ ] **Step 1: Replace shell template**

`theme-generator-shell.html`:

```html
<div class="tg-shell">
  <kj-theme-rail />
  <main class="tg-main">
    <router-outlet />
  </main>
</div>
```

- [ ] **Step 2: Update shell component imports**

`theme-generator-shell.ts`:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeRail } from '../../components/theme-rail/theme-rail';

@Component({
  selector: 'kj-theme-generator-shell',
  standalone: true,
  imports: [RouterOutlet, ThemeRail],
  templateUrl: './theme-generator-shell.html',
  styleUrl: './theme-generator-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorShellComponent {}
```

- [ ] **Step 3: Update shell CSS**

`theme-generator-shell.css` (full replacement):

```css
:host { display: flex; flex: 1; min-height: 0; }
.tg-shell { display: flex; flex: 1; min-height: 0; overflow: hidden; }
.tg-main  { flex: 1; min-width: 0; overflow: hidden; display: flex; flex-direction: column; }
```

- [ ] **Step 4: Replace the page template + class**

`theme-generator.ts`:

```ts
import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { ThemeToolbar } from '../../components/theme-toolbar/theme-toolbar';
import { ThemeConfigPanel, type ConfigTab } from '../../components/theme-config-panel/theme-config-panel';
import { ThemeGeneratorPreviewComponent } from './preview/theme-generator-preview';
import { ThemeImportDialog } from '../../components/theme-import-dialog/theme-import-dialog';
import { ThemeUrlService } from '../../services/theme-url.service';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { DOCUMENT } from '@angular/common';
import { DestroyRef } from '@angular/core';
import { effect } from '@angular/core';

const STYLE_TAG_ID = 'kj-draft-style';

@Component({
  selector: 'kj-theme-generator',
  standalone: true,
  imports: [ThemeToolbar, ThemeConfigPanel, ThemeGeneratorPreviewComponent, ThemeImportDialog],
  templateUrl: './theme-generator.html',
  styleUrl: './theme-generator.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorComponent {
  private readonly url = inject(ThemeUrlService);
  private readonly draftService = inject(ThemeDraftService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly importOpen = signal(false);

  @ViewChild(ThemeConfigPanel) protected configPanel?: ThemeConfigPanel;

  protected onRequestA11y(): void { this.configPanel?.activate('a11y'); }
  protected onRequestImport(): void { this.importOpen.set(true); }
  protected onImportClosed(_ev: { imported: boolean }): void { this.importOpen.set(false); }

  // Keep the existing draft-style sync from old component.
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
    this.url.startSync();
    this.destroyRef.onDestroy(() => {
      this.document.getElementById(STYLE_TAG_ID)?.remove();
    });
  }
}
```

`theme-generator.html`:

```html
<kj-theme-toolbar
  (requestA11y)="onRequestA11y()"
  (requestImport)="onRequestImport()" />

<div class="tg-body">
  <kj-theme-config-panel class="tg-config" />

  <div class="tg-preview" data-theme="custom-draft">
    <kj-theme-generator-preview />
  </div>
</div>

<kj-theme-import-dialog [open]="importOpen()" (closed)="onImportClosed($event)" />
```

`theme-generator.css` (full replacement):

```css
:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }

.tg-body {
  display: flex; flex: 1; min-height: 0; overflow: hidden;
}

.tg-config {
  width: 380px; min-width: 320px;
  border-right: 1px solid var(--kj-color-base-300);
  background: var(--kj-color-base-100);
}

.tg-preview {
  flex: 1; min-width: 0; min-height: 0; overflow-y: auto;
  padding: var(--kj-space-2xl);
  background: var(--kj-color-base-100);
  color: var(--kj-color-base-content);
}

@media (max-width: 900px) {
  .tg-config { display: none; }
}
```

- [ ] **Step 5: Run docs unit tests**

Run: `pnpm --filter @kouji-ui/docs test`
Expected: existing tests pass; failing assertions in old `theme-generator-sidebar.spec.ts` are addressed in Task 10.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/app/shells/theme-generator-shell apps/docs/src/app/pages/theme-generator
git commit -m "feat(theme-gen): rail + main(toolbar+tabs+preview) layout"
```

---

## Task 9: Mobile drawer wraps `ThemeConfigPanel`

**Files:**
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.ts`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.html`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.css`

- [ ] **Step 1: Add an open state + trigger**

In `theme-generator.ts`, add:

```ts
protected readonly drawerOpen = signal(false);
protected toggleDrawer(): void { this.drawerOpen.update(v => !v); }
```

Update the host import list to include `KjButtonComponent`.

- [ ] **Step 2: Update template**

Replace the `.tg-body` block in `theme-generator.html`:

```html
<div class="tg-body">
  <kj-theme-config-panel class="tg-config" />

  <div class="tg-preview" data-theme="custom-draft">
    <kj-theme-generator-preview />
  </div>
</div>

<button type="button"
        class="tg-drawer-trigger"
        aria-label="Edit theme"
        [attr.aria-expanded]="drawerOpen()"
        aria-controls="tg-drawer-config"
        (click)="toggleDrawer()">Edit theme</button>

@if (drawerOpen()) {
  <div class="tg-drawer-backdrop" (click)="drawerOpen.set(false)"></div>
  <div id="tg-drawer-config"
       class="tg-drawer"
       role="dialog"
       aria-modal="true"
       aria-label="Configure theme">
    <button type="button" class="tg-drawer-close" aria-label="Close" (click)="drawerOpen.set(false)">×</button>
    <kj-theme-config-panel />
  </div>
}
```

- [ ] **Step 3: Update CSS for the drawer**

Append to `theme-generator.css`:

```css
.tg-drawer-trigger {
  display: none;
  position: fixed; right: var(--kj-space-md); bottom: var(--kj-space-md); z-index: 30;
  padding: 0 var(--kj-space-md); min-height: 44px;
  background: var(--kj-color-primary); color: var(--kj-color-primary-content);
  border: 0; border-radius: var(--kj-radius-field);
  font: var(--kj-text-sm) var(--kj-font-mono); cursor: pointer;
}
.tg-drawer-backdrop {
  position: fixed; inset: 0; z-index: 40;
  background: color-mix(in oklch, var(--kj-color-base-content) 50%, transparent);
}
.tg-drawer {
  position: fixed; inset: 0 0 0 auto; z-index: 41;
  width: min(420px, 100vw);
  background: var(--kj-color-base-100);
  border-left: 1px solid var(--kj-color-base-300);
  display: flex; flex-direction: column; min-height: 0;
}
.tg-drawer-close {
  align-self: flex-end; padding: 8px 12px;
  background: transparent; border: 0; color: var(--kj-color-base-content);
  font-size: 1.5rem; cursor: pointer; min-height: 44px;
}

@media (max-width: 900px) {
  .tg-drawer-trigger { display: inline-block; }
}
```

- [ ] **Step 4: Add ESC + focus restoration via existing `KjDialog`?**

Use the simpler approach in this plan: native `role="dialog"` with `aria-modal`, plus an effect that listens for ESC. Add this in `theme-generator.ts`:

```ts
import { HostListener } from '@angular/core';
// ...
@HostListener('document:keydown.escape')
protected onEsc(): void { this.drawerOpen.set(false); }
```

When the drawer closes, the implementer must restore focus to `.tg-drawer-trigger`. Add a `@ViewChild('drawerTrigger')` ref and call `.focus()` on close. If a follow-up wants a full focus-trap experience, replace this with `kj-dialog` later.

Required edits in template — change `<button class="tg-drawer-trigger" ...>` to:

```html
<button #drawerTrigger ...>Edit theme</button>
```

…and in the class:

```ts
@ViewChild('drawerTrigger') protected drawerTrigger?: ElementRef<HTMLButtonElement>;
constructor() {
  // existing constructor body...
  effect(() => {
    if (!this.drawerOpen() && typeof document !== 'undefined') {
      this.drawerTrigger?.nativeElement.focus();
    }
  });
}
```

(Remember the effect must be in an injection context — keep it as a class field or run inside the constructor.)

- [ ] **Step 5: Run docs unit tests**

Run: `pnpm --filter @kouji-ui/docs test`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/app/pages/theme-generator
git commit -m "feat(theme-gen): mobile drawer wraps ThemeConfigPanel"
```

---

## Task 10: Remove the old sidebar

**Files:**
- Delete: `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.ts`
- Delete: `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.html`
- Delete: `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.css`
- Delete: `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.spec.ts`

- [ ] **Step 1: Confirm no other consumers**

Run: `rg -n ThemeGeneratorSidebarComponent apps/docs/src apps/docs/e2e`
Expected: only the four sidebar files reference the symbol.

- [ ] **Step 2: Delete the four files**

```bash
rm apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.ts
rm apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.html
rm apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.css
rm apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.spec.ts
```

(If the directory becomes empty, remove it as well.)

- [ ] **Step 3: Run docs unit tests + typecheck**

Run: `pnpm --filter @kouji-ui/docs typecheck && pnpm --filter @kouji-ui/docs test`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add -A apps/docs/src/app/components/theme-generator-sidebar
git commit -m "chore(theme-gen): remove legacy sidebar (replaced by rail + tabs)"
```

---

## Task 11: Update e2e selectors

**Files:**
- Modify: `apps/docs/e2e/theme-generator.spec.ts`

- [ ] **Step 1: Update selectors**

Find tests using `kj-theme-generator-sidebar` and update them to the new layout. For each test that currently does `await page.locator('kj-theme-generator-sidebar')`:

- Replace with `await page.locator('kj-theme-rail')` for theme-list assertions.
- Replace with `await page.locator('kj-theme-toolbar')` for save/copy/export assertions.
- Replace with `await page.locator('kj-theme-config-panel')` for the config area; activate the Accessibility tab via `await page.getByRole('tab', { name: /accessibility/i }).click()` before asserting on `kj-contrast-scorecard`.

If a specific assertion targets the legacy `details > summary` open state, replace with a tab click (`getByRole('tab')`).

- [ ] **Step 2: Run e2e**

Run: `pnpm --filter @kouji-ui/docs e2e --grep "theme-generator"`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/e2e/theme-generator.spec.ts
git commit -m "test(e2e): update theme-generator selectors for tabs layout"
```

---

## Task 12: Final verification + changeset

**Files:**
- Create: `.changeset/theme-generator-layout.md`

- [ ] **Step 1: Add changeset**

```md
---
'@kouji-ui/docs': minor
---

theme generator: tabs-based configuration (Colors / Shape & motion / Type / Accessibility), persistent toolbar with a11y summary chip, mobile drawer; legacy sidebar removed.
```

- [ ] **Step 2: Run the full docs check**

Run: `pnpm --filter @kouji-ui/docs lint && pnpm --filter @kouji-ui/docs test && pnpm --filter @kouji-ui/docs typecheck && pnpm --filter @kouji-ui/docs e2e`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add .changeset/theme-generator-layout.md
git commit -m "chore(changeset): theme-generator layout (tabs spine)"
```

---

## Self-review

- **Spec coverage:**
  - Tabs spine (Colors / Shape & motion / Type / Accessibility) — Tasks 3–7.
  - Persistent toolbar (name + palette + actions + a11y chip) — Task 2.
  - Theme rail kept compact — Task 1.
  - A11y as its own tab + chip activates it — Tasks 6, 7 (`activate('a11y')`), 2.
  - Mobile drawer reusing the same panel — Task 9.
  - Legacy sidebar removed — Task 10.
  - E2E and changeset — Tasks 11–12.

- **Placeholders:** None — every step shows code, commands, or explicit deletions. The “if a follow-up wants a full focus-trap experience” note in Task 9 is intentional scope guidance, not a placeholder for required work in this plan.

- **Type consistency:**
  - `ConfigTab` defined in Task 7 and consumed by `activate('a11y')` in Task 8.
  - `ThemeRail`, `ThemeToolbar`, `ThemeConfigPanel`, `ColorsPanel`, `ShapeMotionPanel`, `TypePanel`, `A11yPanel` selectors and class names match across creation, imports, and template usage.
  - `setTypography` referenced in Task 5 is provided by the a11y plan’s Task 5; if the a11y plan has not yet executed when this plan runs, run a11y plan Tasks 1–5 first to add the types/service surface — this is the single cross-plan prerequisite.
