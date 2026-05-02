# Docs Theme Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a shared `docs-themes.css` token file, refactor all example components to use CSS variables instead of hardcoded values, and expose the CSS file in the code preview.

**Architecture:** One CSS file at `packages/core/src/styles/docs-themes.css` defines three themes via `@layer` and CSS custom properties. Each example component gains `styleUrls: ['../styles/docs-themes.css']` and a `host: { class: 'kj-theme-*' }` binding. The docs extractor detects `styleUrls` referencing this file and appends it as an extra `ExampleFile` tab.

**Tech Stack:** CSS `@layer`, CSS custom properties, Angular `styleUrls`, ts-morph extractor at `apps/docs/scripts/extract-docs.ts`

---

## File Map

| File | Change |
|---|---|
| `packages/core/src/styles/docs-themes.css` | NEW — all theme tokens |
| `apps/docs/scripts/extract-docs.ts` | Append CSS file when example has `styleUrls` referencing `docs-themes.css` |
| `packages/core/src/button/button.example.ts` | `styleUrls` + tokens |
| `packages/core/src/button/button.retro.example.ts` | `styleUrls` + `host.class` + tokens |
| `packages/core/src/button/button.finance.example.ts` | `styleUrls` + `host.class` + tokens |
| `packages/core/src/button/button.sizes.example.ts` | `styleUrls` + tokens |
| `packages/core/src/dialog/dialog.example.ts` | `styleUrls` + tokens |
| `packages/core/src/dialog/dialog.retro.example.ts` | `styleUrls` + `host.class` + tokens |
| `packages/core/src/dialog/dialog.finance.example.ts` | `styleUrls` + `host.class` + tokens |
| `packages/core/src/dialog/dialog.confirm.example.ts` | `styleUrls` + tokens |
| `packages/core/src/toast/toast.example.ts` | `styleUrls` + tokens |
| `packages/core/src/toast/toast.retro.example.ts` | `styleUrls` + `host.class` + tokens |
| `packages/core/src/toast/toast.finance.example.ts` | `styleUrls` + `host.class` + tokens |
| `packages/core/src/tooltip/tooltip.example.ts` | `styleUrls` + tokens |
| `packages/core/src/tooltip/tooltip.retro.example.ts` | `styleUrls` + `host.class` + tokens |
| `packages/core/src/tooltip/tooltip.finance.example.ts` | `styleUrls` + `host.class` + tokens |
| `packages/core/src/popover/popover.example.ts` | `styleUrls` + tokens |
| `packages/core/src/popover/popover.retro.example.ts` | `styleUrls` + `host.class` + tokens |
| `packages/core/src/popover/popover.finance.example.ts` | `styleUrls` + `host.class` + tokens |

---

## Task 1: Create docs-themes.css

**Files:**
- Create: `packages/core/src/styles/docs-themes.css`

- [ ] **Step 1: Create the file**

```css
/* ─────────────────────────────────────────────────────────────
   kouji-ui docs example themes
   Three theme layers: kj.tokens (defaults) + kj.theme (overrides)
   ──────────────────────────────────────────────────────────── */

@layer kj.tokens, kj.theme;

/* ── Default (dark) tokens — applied to :root and .kj-theme-default ── */
@layer kj.tokens {
  :root,
  .kj-theme-default {
    --kj-bg: #0c0c0c;
    --kj-surface: #1a1a1a;
    --kj-text: #f0ede6;
    --kj-text-muted: #888;
    --kj-border: #333;
    --kj-accent: #b8f500;
    --kj-accent-on: #0c0c0c;
    --kj-destructive: #ef4444;
    --kj-radius-sm: 0px;
    --kj-radius-md: 0px;
    --kj-radius-lg: 0px;
    --kj-shadow-sm: none;
    --kj-shadow-md: none;
    --kj-shadow-hard: none;
    --kj-font: 'JetBrains Mono', monospace;
    --kj-btn-border: none;
    --kj-backdrop: rgba(0, 0, 0, 0.75);
    --kj-transition: opacity 0.15s;
  }
}

/* ── Theme overrides ── */
@layer kj.theme {
  .kj-theme-retro {
    --kj-bg: #fef9c3;
    --kj-surface: #fef9c3;
    --kj-text: #000;
    --kj-text-muted: #444;
    --kj-border: #000;
    --kj-accent: #16a34a;
    --kj-accent-on: #fff;
    --kj-destructive: #dc2626;
    --kj-radius-sm: 0px;
    --kj-radius-md: 0px;
    --kj-radius-lg: 0px;
    --kj-shadow-sm: 2px 2px 0 #000;
    --kj-shadow-md: 4px 4px 0 #000;
    --kj-shadow-hard: 6px 6px 0 #000;
    --kj-font: 'Courier New', monospace;
    --kj-btn-border: 2px solid #000;
    --kj-backdrop: rgba(0, 0, 0, 0.6);
    --kj-transition: transform 0.08s, box-shadow 0.08s;
  }

  .kj-theme-finance {
    --kj-bg: #f9fafb;
    --kj-surface: #fff;
    --kj-text: #111827;
    --kj-text-muted: #6b7280;
    --kj-border: #e5e7eb;
    --kj-accent: #3b82f6;
    --kj-accent-on: #fff;
    --kj-destructive: #ef4444;
    --kj-radius-sm: 4px;
    --kj-radius-md: 6px;
    --kj-radius-lg: 12px;
    --kj-shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.1);
    --kj-shadow-md: 0 8px 30px rgba(0, 0, 0, 0.1);
    --kj-shadow-hard: 0 20px 60px rgba(0, 0, 0, 0.12);
    --kj-font: system-ui, -apple-system, sans-serif;
    --kj-btn-border: 1px solid transparent;
    --kj-backdrop: rgba(0, 0, 0, 0.4);
    --kj-transition: background 0.12s;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/styles/docs-themes.css
git commit -m "feat(core): add docs-themes.css with CSS layer token system for default/retro/finance themes"
```

---

## Task 2: Update extractor to expose docs-themes.css in code preview

**Files:**
- Modify: `apps/docs/scripts/extract-docs.ts`

The extractor's `readExampleFile` function is at line ~57. After it reads a `.ts` file, check if the content contains `styleUrls` referencing `docs-themes.css`. If so, also read the CSS file and return both.

- [ ] **Step 1: Read the current `readExampleFile` function and replace it**

Find the function starting at `/** Reads a co-located example file from disk...` and replace with:

```typescript
const DOCS_THEMES_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../packages/core/src/styles/docs-themes.css'
);

/** Reads a co-located example file from disk, returning one or more ExampleFiles. */
function readExampleFiles(dirPath: string, filename: string): ExampleFile[] {
  const fullPath = join(dirPath, filename);
  try {
    const content = readFileSync(fullPath, 'utf-8');
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'ts';
    const lang: ExampleFile['lang'] = (['ts', 'html', 'css'] as string[]).includes(ext)
      ? (ext as ExampleFile['lang'])
      : 'ts';
    const exportName = extractExportName(content);
    const files: ExampleFile[] = [{ lang, filename, content, exportName }];

    // If the example references docs-themes.css via styleUrls, append it as a CSS file tab
    if (content.includes('docs-themes.css')) {
      try {
        const cssContent = readFileSync(DOCS_THEMES_PATH, 'utf-8');
        files.push({ lang: 'css', filename: 'docs-themes.css', content: cssContent });
      } catch { /* CSS file not found — skip */ }
    }

    return files;
  } catch {
    return [];
  }
}
```

Also add the `fileURLToPath` import at the top if not already present:
```typescript
import { fileURLToPath } from 'node:url';
```

- [ ] **Step 2: Update all callers of `readExampleFile` to use `readExampleFiles`**

Search for `readExampleFile(` in the file (there are 2-3 calls). Replace each:

```typescript
// Before:
const file = readExampleFile(dir, filename);
if (file) exampleFiles.push(file);

// After:
const files = readExampleFiles(dir, filename);
exampleFiles.push(...files);
```

And in `parseDocThemes`:
```typescript
// Before:
const file = readExampleFile(dir, filename);
if (file) files.push(file);

// After:
const newFiles = readExampleFiles(dir, filename);
files.push(...newFiles);
```

- [ ] **Step 3: Run extraction to verify**

```bash
cd C:\Users\narut\Desktop\projects\kouji\apps\docs && pnpm run extract-docs
```
Expected: completes without error, manifest generated.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/scripts/extract-docs.ts
git commit -m "feat(docs): extractor appends docs-themes.css to examples that reference it"
```

---

## Task 3: Refactor button examples

**Files:**
- Modify: `packages/core/src/button/button.example.ts`
- Modify: `packages/core/src/button/button.retro.example.ts`
- Modify: `packages/core/src/button/button.finance.example.ts`

- [ ] **Step 1: Replace `packages/core/src/button/button.example.ts`**

```typescript
import { Component } from '@angular/core';
import { KjButton } from './button';

@Component({
  selector: 'kj-example-button',
  standalone: true,
  imports: [KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: block; padding: 2rem; background: var(--kj-bg); font-family: var(--kj-font); }
    .row { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
    button[kjButton] { padding: 0.5rem 1.25rem; font-family: var(--kj-font); font-size: 0.875rem; border: var(--kj-btn-border); cursor: pointer; transition: var(--kj-transition); }
    [data-variant="default"] { background: var(--kj-accent); color: var(--kj-accent-on); }
    [data-variant="destructive"] { background: var(--kj-destructive); color: #fff; }
    [data-variant="outline"] { background: transparent; color: var(--kj-text); border: 1px solid var(--kj-border); }
    [data-variant="ghost"] { background: transparent; color: var(--kj-text-muted); }
    [aria-disabled="true"] { opacity: 0.4; cursor: not-allowed; }
  `],
  template: `
    <div class="row">
      <button kjButton [kjVariant]="'default'">Default</button>
      <button kjButton [kjVariant]="'destructive'">Destructive</button>
      <button kjButton [kjVariant]="'outline'">Outline</button>
      <button kjButton [kjVariant]="'ghost'">Ghost</button>
      <button kjButton [kjDisabled]="true">Disabled</button>
    </div>
  `,
})
export class ButtonExample {}
```

- [ ] **Step 2: Replace `packages/core/src/button/button.retro.example.ts`**

```typescript
import { Component } from '@angular/core';
import { KjButton } from './button';

@Component({
  selector: 'kj-example-button-retro',
  standalone: true,
  imports: [KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: block; padding: 2rem; background: var(--kj-bg); font-family: var(--kj-font); color: var(--kj-text); }
    .row { display: flex; gap: 0.625rem; flex-wrap: wrap; }
    button[kjButton] {
      padding: 0.35rem 0.875rem; font-family: var(--kj-font); font-size: 0.75rem;
      font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
      border: var(--kj-btn-border); border-radius: var(--kj-radius-md); cursor: pointer;
      box-shadow: var(--kj-shadow-sm); transition: var(--kj-transition);
    }
    button[kjButton]:hover { transform: translate(-1px, -1px); box-shadow: var(--kj-shadow-md); }
    [data-variant="default"] { background: var(--kj-text); color: var(--kj-bg); }
    [data-variant="destructive"] { background: var(--kj-destructive); color: #fff; }
    [data-variant="outline"] { background: var(--kj-bg); color: var(--kj-text); }
    [aria-disabled="true"] { opacity: 0.4; pointer-events: none; }
  `],
  host: { class: 'kj-theme-retro' },
  template: `
    <div class="row">
      <button kjButton [kjVariant]="'default'">Default</button>
      <button kjButton [kjVariant]="'destructive'">Destructive</button>
      <button kjButton [kjVariant]="'outline'">Outline</button>
      <button kjButton [kjDisabled]="true">Disabled</button>
    </div>
  `,
})
export class ButtonRetroExample {}
```

- [ ] **Step 3: Replace `packages/core/src/button/button.finance.example.ts`**

```typescript
import { Component } from '@angular/core';
import { KjButton } from './button';

@Component({
  selector: 'kj-example-button-finance',
  standalone: true,
  imports: [KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: block; padding: 2rem; background: var(--kj-bg); font-family: var(--kj-font); color: var(--kj-text); }
    .row { display: flex; gap: 0.625rem; flex-wrap: wrap; }
    button[kjButton] {
      padding: 0.4rem 1rem; font-family: var(--kj-font); font-size: 0.8125rem; font-weight: 500;
      border: var(--kj-btn-border); border-radius: var(--kj-radius-md); cursor: pointer;
      transition: var(--kj-transition); line-height: 1.5;
    }
    [data-variant="default"] { background: var(--kj-accent); color: var(--kj-accent-on); border-color: var(--kj-accent); }
    [data-variant="default"]:hover { background: #2563eb; }
    [data-variant="destructive"] { background: var(--kj-destructive); color: #fff; border-color: var(--kj-destructive); }
    [data-variant="outline"] { background: transparent; color: var(--kj-text); border: 1px solid var(--kj-border); }
    [data-variant="outline"]:hover { background: var(--kj-bg); }
    [data-variant="ghost"] { background: transparent; color: var(--kj-text-muted); border-color: transparent; }
    [aria-disabled="true"] { opacity: 0.45; cursor: not-allowed; }
  `],
  host: { class: 'kj-theme-finance' },
  template: `
    <div class="row">
      <button kjButton [kjVariant]="'default'">Default</button>
      <button kjButton [kjVariant]="'destructive'">Destructive</button>
      <button kjButton [kjVariant]="'outline'">Outline</button>
      <button kjButton [kjVariant]="'ghost'">Ghost</button>
      <button kjButton [kjDisabled]="true">Disabled</button>
    </div>
  `,
})
export class ButtonFinanceExample {}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd C:\Users\narut\Desktop\projects\kouji && pnpm --filter @kouji-ui/core exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/button/
git commit -m "refactor(button): examples use docs-themes.css CSS variables"
```

---

## Task 4: Refactor dialog examples

**Files:**
- Modify: `packages/core/src/dialog/dialog.example.ts`
- Modify: `packages/core/src/dialog/dialog.retro.example.ts`
- Modify: `packages/core/src/dialog/dialog.finance.example.ts`
- Modify: `packages/core/src/dialog/dialog.confirm.example.ts`

- [ ] **Step 1: Replace `dialog.example.ts`**

```typescript
import { Component } from '@angular/core';
import { KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle, KjDialogClose } from './dialog';
import { KjButton } from '../button/button';

@Component({
  selector: 'kj-example-dialog-basic',
  standalone: true,
  imports: [KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle, KjDialogClose, KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 3rem 2rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 160px; }
    button[kjButton] { padding: 0.5rem 1.5rem; border: var(--kj-btn-border); cursor: pointer; font-family: var(--kj-font); font-size: 0.875rem; transition: var(--kj-transition); }
    [data-variant="default"] { background: var(--kj-accent); color: var(--kj-accent-on); }
    [data-variant="outline"] { background: transparent; color: var(--kj-text); border: 1px solid var(--kj-border); }
    ::ng-deep .kj-dialog-backdrop { background: var(--kj-backdrop); }
    ::ng-deep .kj-dialog-panel { background: transparent; box-shadow: none; }
    ::ng-deep [kjDialogOverlay] { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; }
    ::ng-deep [kjDialog] { background: var(--kj-surface); border: 1px solid var(--kj-border); border-radius: var(--kj-radius-lg); padding: 1.5rem; min-width: 20rem; color: var(--kj-text); font-family: var(--kj-font); box-shadow: var(--kj-shadow-hard); }
    ::ng-deep [kjDialogTitle] { margin: 0 0 0.5rem; font-size: 1.125rem; color: var(--kj-text); }
    ::ng-deep .dialog-body { margin: 0 0 1.5rem; font-size: 0.875rem; color: var(--kj-text-muted); line-height: 1.6; }
    ::ng-deep .dialog-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
    ::ng-deep .dialog-actions button[kjButton] { padding: 0.4rem 1rem; font-size: 0.8125rem; }
  `],
  template: `
    <button kjButton [kjVariant]="'default'" [kjDialogTrigger]="myDialog">Open Dialog</button>
    <ng-template #myDialog>
      <div kjDialogOverlay>
        <div kjDialog>
          <h2 kjDialogTitle>Edit Profile</h2>
          <p class="dialog-body">Make changes to your profile settings here.</p>
          <div class="dialog-actions">
            <button kjButton [kjVariant]="'outline'" kjDialogClose>Cancel</button>
            <button kjButton [kjVariant]="'default'" kjDialogClose>Save Changes</button>
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class DialogBasicExample {}
```

- [ ] **Step 2: Replace `dialog.retro.example.ts`**

```typescript
import { Component } from '@angular/core';
import { KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle, KjDialogClose } from './dialog';

@Component({
  selector: 'kj-example-dialog-retro',
  standalone: true,
  imports: [KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle, KjDialogClose],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 3rem 2rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 160px; color: var(--kj-text); }
    button {
      padding: 0.4rem 1rem; font-family: var(--kj-font); font-size: 0.8rem; font-weight: 700;
      letter-spacing: 0.06em; text-transform: uppercase; background: var(--kj-surface); color: var(--kj-text);
      border: var(--kj-btn-border); cursor: pointer;
      box-shadow: var(--kj-shadow-sm); transition: var(--kj-transition);
    }
    button:hover { transform: translate(-1px, -1px); box-shadow: var(--kj-shadow-md); }
    ::ng-deep .kj-dialog-backdrop { background: var(--kj-backdrop); }
    ::ng-deep .kj-dialog-panel { background: transparent; box-shadow: none; }
    ::ng-deep [kjDialogOverlay] { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; }
    ::ng-deep [kjDialog] { background: var(--kj-surface); border: var(--kj-btn-border); padding: 1.5rem; min-width: 20rem; box-shadow: var(--kj-shadow-hard); font-family: var(--kj-font); color: var(--kj-text); }
    ::ng-deep [kjDialogTitle] { margin: 0 0 0.5rem; font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid var(--kj-border); padding-bottom: 0.5rem; color: var(--kj-text); }
    ::ng-deep .dialog-body { margin: 0.75rem 0 1.5rem; font-size: 0.8rem; color: var(--kj-text-muted); line-height: 1.6; }
    ::ng-deep .dialog-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
    ::ng-deep [kjDialogOverlay] button { font-size: 0.75rem; padding: 0.3rem 0.875rem; box-shadow: var(--kj-shadow-sm); }
    ::ng-deep [kjDialogOverlay] button:hover { box-shadow: var(--kj-shadow-md); }
    ::ng-deep .btn-primary { background: var(--kj-accent); color: var(--kj-accent-on); }
  `],
  host: { class: 'kj-theme-retro' },
  template: `
    <button [kjDialogTrigger]="myDialog">Open Dialog</button>
    <ng-template #myDialog>
      <div kjDialogOverlay>
        <div kjDialog>
          <h2 kjDialogTitle>Edit Profile</h2>
          <p class="dialog-body">Make changes to your profile settings here.</p>
          <div class="dialog-actions">
            <button kjDialogClose>Cancel</button>
            <button class="btn-primary" kjDialogClose>Save Changes</button>
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class DialogRetroExample {}
```

- [ ] **Step 3: Replace `dialog.finance.example.ts`**

```typescript
import { Component } from '@angular/core';
import { KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle, KjDialogClose } from './dialog';

@Component({
  selector: 'kj-example-dialog-finance',
  standalone: true,
  imports: [KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle, KjDialogClose],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 3rem 2rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 160px; }
    button {
      padding: 0.45rem 1.125rem; background: var(--kj-accent); color: var(--kj-accent-on);
      border: var(--kj-btn-border); border-color: var(--kj-accent);
      border-radius: var(--kj-radius-md); cursor: pointer; font-family: var(--kj-font); font-size: 0.875rem; font-weight: 500;
    }
    button:hover { background: #2563eb; }
    ::ng-deep .kj-dialog-backdrop { background: var(--kj-backdrop); }
    ::ng-deep .kj-dialog-panel { background: transparent; box-shadow: none; }
    ::ng-deep [kjDialogOverlay] { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; }
    ::ng-deep [kjDialog] { background: var(--kj-surface); border: 1px solid var(--kj-border); border-radius: var(--kj-radius-lg); padding: 1.5rem; min-width: 22rem; box-shadow: var(--kj-shadow-hard); font-family: var(--kj-font); color: var(--kj-text); }
    ::ng-deep [kjDialogTitle] { margin: 0 0 0.375rem; font-size: 1.0625rem; font-weight: 600; color: var(--kj-text); }
    ::ng-deep .dialog-body { margin: 0 0 1.5rem; font-size: 0.875rem; color: var(--kj-text-muted); line-height: 1.6; }
    ::ng-deep .dialog-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
    ::ng-deep [kjDialogOverlay] button { padding: 0.4rem 1rem; font-size: 0.8125rem; font-weight: 500; border-radius: var(--kj-radius-md); }
    ::ng-deep .btn-cancel { background: var(--kj-surface); color: var(--kj-text); border: 1px solid var(--kj-border); }
    ::ng-deep .btn-cancel:hover { background: var(--kj-bg); }
    ::ng-deep .btn-primary { background: var(--kj-accent); color: var(--kj-accent-on); border-color: var(--kj-accent); }
    ::ng-deep .btn-primary:hover { background: #2563eb; }
  `],
  host: { class: 'kj-theme-finance' },
  template: `
    <button [kjDialogTrigger]="myDialog">Open Dialog</button>
    <ng-template #myDialog>
      <div kjDialogOverlay>
        <div kjDialog>
          <h2 kjDialogTitle>Edit Profile</h2>
          <p class="dialog-body">Make changes to your profile settings here.</p>
          <div class="dialog-actions">
            <button class="btn-cancel" kjDialogClose>Cancel</button>
            <button class="btn-primary" kjDialogClose>Save Changes</button>
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class DialogFinanceExample {}
```

- [ ] **Step 4: Replace `dialog.confirm.example.ts`**

```typescript
import { Component, signal } from '@angular/core';
import { KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle } from './dialog';
import { KjButton } from '../button/button';

@Component({
  selector: 'kj-example-dialog-confirm',
  standalone: true,
  imports: [KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle, KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 3rem 2rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 160px; flex-direction: column; color: var(--kj-text); }
    .status { font-size: 0.8125rem; color: var(--kj-text-muted); min-height: 1.25rem; }
    .status.confirmed { color: var(--kj-accent); }
    .status.cancelled { color: var(--kj-destructive); }
    button[kjButton] { padding: 0.5rem 1.5rem; border: var(--kj-btn-border); cursor: pointer; font-family: var(--kj-font); font-size: 0.875rem; }
    [data-variant="destructive"] { background: var(--kj-destructive); color: #fff; }
    [data-variant="outline"] { background: transparent; color: var(--kj-text); border: 1px solid var(--kj-border); }
    ::ng-deep .kj-dialog-backdrop { background: var(--kj-backdrop); }
    ::ng-deep .kj-dialog-panel { background: transparent; box-shadow: none; }
    ::ng-deep [kjDialogOverlay] { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; }
    ::ng-deep [kjDialog] { background: var(--kj-surface); border: 1px solid var(--kj-border); border-radius: var(--kj-radius-lg); padding: 1.5rem; min-width: 22rem; color: var(--kj-text); font-family: var(--kj-font); box-shadow: var(--kj-shadow-hard); }
    ::ng-deep [kjDialogTitle] { margin: 0 0 0.5rem; font-size: 1.125rem; color: var(--kj-text); }
    ::ng-deep .dialog-body { margin: 0 0 1.5rem; font-size: 0.875rem; color: var(--kj-text-muted); line-height: 1.6; }
    ::ng-deep .dialog-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
    ::ng-deep .dialog-actions button[kjButton] { padding: 0.4rem 1rem; font-size: 0.8125rem; }
  `],
  template: `
    <button kjButton [kjVariant]="'destructive'"
            [kjDialogTrigger]="confirmDialog"
            (kjDialogClosed)="onResult($event)">
      Delete Account
    </button>
    <ng-template #confirmDialog>
      <div kjDialogOverlay>
        <div kjDialog #dlg="kjDialog">
          <h2 kjDialogTitle>Are you absolutely sure?</h2>
          <p class="dialog-body">This action cannot be undone. All your data will be permanently removed.</p>
          <div class="dialog-actions">
            <button kjButton [kjVariant]="'outline'" (click)="dlg.close('cancelled')">Cancel</button>
            <button kjButton [kjVariant]="'destructive'" (click)="dlg.close('confirmed')">Yes, delete</button>
          </div>
        </div>
      </div>
    </ng-template>
    <span class="status"
          [class.confirmed]="result() === 'confirmed'"
          [class.cancelled]="result() === 'cancelled'">
      {{ result() === 'confirmed' ? '✓ Account deleted' : result() === 'cancelled' ? '✕ Cancelled' : '' }}
    </span>
  `,
})
export class DialogConfirmExample {
  readonly result = signal<'confirmed' | 'cancelled' | null>(null);
  onResult(value: unknown): void {
    if (value === 'confirmed' || value === 'cancelled') this.result.set(value);
  }
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd C:\Users\narut\Desktop\projects\kouji && pnpm --filter @kouji-ui/core exec tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/dialog/
git commit -m "refactor(dialog): examples use docs-themes.css CSS variables"
```

---

## Task 5: Refactor toast, tooltip, and popover examples

**Files:**
- Modify: `packages/core/src/toast/toast.example.ts`
- Modify: `packages/core/src/toast/toast.retro.example.ts`
- Modify: `packages/core/src/toast/toast.finance.example.ts`
- Modify: `packages/core/src/tooltip/tooltip.example.ts`
- Modify: `packages/core/src/tooltip/tooltip.retro.example.ts`
- Modify: `packages/core/src/tooltip/tooltip.finance.example.ts`
- Modify: `packages/core/src/popover/popover.example.ts`
- Modify: `packages/core/src/popover/popover.retro.example.ts`
- Modify: `packages/core/src/popover/popover.finance.example.ts`

For each file: read the current content, add `styleUrls: ['../styles/docs-themes.css']`, add `host: { class: 'kj-theme-retro' }` or `host: { class: 'kj-theme-finance' }` for themed variants, and replace:
- `#0c0c0c` / `#1a1a1a` → `var(--kj-bg)` / `var(--kj-surface)`
- `#f0ede6` → `var(--kj-text)`
- `#888` / `#444` → `var(--kj-text-muted)`
- `#333` / `#000` (border) → `var(--kj-border)`
- `#b8f500` / `#16a34a` / `#3b82f6` (accent) → `var(--kj-accent)`
- `#0c0c0c` / `#fff` (on accent) → `var(--kj-accent-on)`
- `#ef4444` / `#dc2626` → `var(--kj-destructive)`
- `'JetBrains Mono', monospace` / `'Courier New', monospace` / `system-ui...` → `var(--kj-font)`
- `rgba(0,0,0,0.75)` / `0.6` / `0.4` → `var(--kj-backdrop)`
- Hard shadows (`3px 3px 0 #000`) → `var(--kj-shadow-sm)` / `var(--kj-shadow-md)` / `var(--kj-shadow-hard)`
- Soft shadows (`0 4px 12px...`) → `var(--kj-shadow-sm)` / `var(--kj-shadow-md)`
- `border-radius: 6px` → `var(--kj-radius-md)`, `12px` → `var(--kj-radius-lg)`, `4px` → `var(--kj-radius-sm)`
- `opacity 0.15s` → `var(--kj-transition)`, `background 0.12s` → `var(--kj-transition)`
- `2px solid #000` (border style) → `var(--kj-btn-border)`
- `#fef9c3` / `#f9fafb` (host bg) → `var(--kj-bg)`

- [ ] **Step 1: Refactor `toast.example.ts`** — Add `styleUrls: ['../styles/docs-themes.css']`, replace all tokens per the mapping above. Keep toast variant colours (success `#4ade80`, warning `#fb923c`, etc.) as-is since they are semantic, not theme tokens.

- [ ] **Step 2: Refactor `toast.retro.example.ts`** — Same + `host: { class: 'kj-theme-retro' }`.

- [ ] **Step 3: Refactor `toast.finance.example.ts`** — Same + `host: { class: 'kj-theme-finance' }`.

- [ ] **Step 4: Refactor `tooltip.example.ts`** — `styleUrls` + token replacement. Tooltip background: `var(--kj-accent)`, text: `var(--kj-accent-on)`.

- [ ] **Step 5: Refactor `tooltip.retro.example.ts`** — `host: { class: 'kj-theme-retro' }`. Retro tooltip: bg `var(--kj-text)` (inverted), text `var(--kj-bg)`.

- [ ] **Step 6: Refactor `tooltip.finance.example.ts`** — `host: { class: 'kj-theme-finance' }`. Finance tooltip bg: `#1f2937` (dark, stays as-is — not a theme token).

- [ ] **Step 7: Refactor `popover.example.ts`** — `styleUrls` + token replacement.

- [ ] **Step 8: Refactor `popover.retro.example.ts`** — `host: { class: 'kj-theme-retro' }` + tokens.

- [ ] **Step 9: Refactor `popover.finance.example.ts`** — `host: { class: 'kj-theme-finance' }` + tokens.

- [ ] **Step 10: Verify TypeScript compiles**

```bash
cd C:\Users\narut\Desktop\projects\kouji && pnpm --filter @kouji-ui/core exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add packages/core/src/toast/ packages/core/src/tooltip/ packages/core/src/popover/
git commit -m "refactor(toast,tooltip,popover): examples use docs-themes.css CSS variables"
```

---

## Task 6: Re-run extractor and verify docs

- [ ] **Step 1: Re-run docs extractor**

```bash
cd C:\Users\narut\Desktop\projects\kouji\apps\docs && pnpm run extract-docs
```
Expected: succeeds, no errors.

- [ ] **Step 2: Run all tests**

```bash
cd C:\Users\narut\Desktop\projects\kouji && pnpm test
```
Expected: all tests pass.

- [ ] **Step 3: Restart dev server and navigate to dialog page**

Open `http://localhost:4200/docs/components/dialog` in browser. Verify:
- Default theme renders with dark bg + lime accent
- Retro theme renders with yellow bg + black borders + hard shadows
- Finance theme renders with light bg + blue accent + rounded corners
- "Show code" panel has a `docs-themes.css` tab alongside the component tab

- [ ] **Step 4: Final commit**

```bash
cd C:\Users\narut\Desktop\projects\kouji && git add -A && git commit -m "refactor(core,docs): centralize example theme tokens in docs-themes.css"
```
