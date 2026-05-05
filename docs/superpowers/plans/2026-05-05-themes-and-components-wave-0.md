# Wave 0 — Foundation: Themes & Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the three-package architecture (core / components / themes) works end-to-end with one styled component (`KjButtonComponent` wrapping core's `KjButton` directive) + one theme (`dark`), with passing token-contract tests and component unit tests.

**Architecture:** Two new pnpm workspace packages. `@kouji-ui/themes` is pure CSS (base primitives + theme files), tested by parsing CSS to verify each theme defines every required shared-layer token. `@kouji-ui/components` is an Angular library that wraps core directives via `hostDirectives` and ships token-driven CSS — `KjButtonComponent` is the proof. No docs UI changes in this wave (docs integration belongs to Wave 1).

**Tech Stack:** pnpm workspace, Angular 21, ng-packagr, vitest 4.x, `@analogjs/vite-plugin-angular`, jsdom, turbo, postcss (for theme CSS parsing in tests).

**Spec reference:** `docs/superpowers/specs/2026-05-05-themes-and-components-design.md` — Wave 0 row in §11 + §3 (token contract) + §5 (component anatomy).

**Branch:** `feat/themes-and-components` (already created and contains the spec commit).

**Scope deviation from spec:** Spec's Wave 0 mentions "docs progress: `/docs/components/button` works; theme selector wired but only one option". That docs integration is moved to Wave 1 to keep this plan focused on proving the package architecture. Docs continues to use existing `KjButton` directive for now; no docs files touched in this plan.

---

## File Structure

**New files (created in this plan):**

```
packages/themes/
  package.json                  # workspace package, CSS-only exports
  src/
    base.css                    # raw primitive tokens — palette, radii, spacing, type
    index.css                   # imports base.css + all themes (default barrel)
    themes/
      dark.css                  # the only theme this wave; defines all shared-layer tokens
    themes.spec.ts              # contract test: each theme defines every required token
  vite.config.ts                # vitest config (jsdom, no Angular plugin needed)
  tsconfig.spec.json            # for the spec file

packages/components/
  package.json                  # @kouji-ui/components, peer-dep on core
  ng-package.json               # ng-packagr build config
  tsconfig.lib.json
  tsconfig.lib.prod.json
  tsconfig.spec.json
  vite.config.ts                # vitest with @analogjs/vite-plugin-angular
  src/
    test-setup.ts               # mirrors core's test setup
    public-api.ts               # exports KjButtonComponent
    button/
      button.ts                 # KjButtonComponent — wraps KjButton via hostDirectives
      button.css                # component-layer tokens + structural CSS
      button.spec.ts            # unit test: host class, input forwarding, attribute routing
      index.ts                  # barrel re-export
```

**Modified files (in this plan):**

```
angular.json                    # add kj-components project (mirrors kj-core block)
vitest.workspace.ts             # add packages/themes + packages/components vite configs
package.json                    # add postcss devDependency (for the CSS parser used by contract test)
```

**Files NOT touched in this wave** (deferred to later waves):

```
packages/core/**                # no core changes — existing KjButton directive is what we wrap
apps/docs/**                    # no docs changes — Wave 1 work
packages/core/src/styles/docs-themes.css  # not deleted yet — Wave 1 deletes it after docs migrates off
packages/core/src/<comp>/<comp>.{finance,retro,sizes}.example.ts  # not deleted yet — Wave 1
```

---

## Task 1: Scaffold `@kouji-ui/themes` package — package.json + base.css

**Files:**
- Create: `packages/themes/package.json`
- Create: `packages/themes/src/base.css`

- [ ] **Step 1.1: Create `packages/themes/package.json`**

```json
{
  "name": "@kouji-ui/themes",
  "version": "0.0.1",
  "description": "Theme tokens and theme stylesheets for kouji-ui — pure CSS, swappable at runtime via data-theme.",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/kouji-dev/kouji-ui.git",
    "directory": "packages/themes"
  },
  "homepage": "https://kouji-ui.onrender.com",
  "bugs": { "url": "https://github.com/kouji-dev/kouji-ui/issues" },
  "keywords": ["css", "theme", "tokens", "design-system", "kouji"],
  "publishConfig": { "access": "public", "provenance": true },
  "sideEffects": ["**/*.css"],
  "files": ["src/"],
  "exports": {
    ".": "./src/index.css",
    "./base.css": "./src/base.css",
    "./themes/dark.css": "./src/themes/dark.css"
  },
  "scripts": {
    "build": "echo 'no build for css-only package'",
    "test": "vitest run",
    "lint": "echo 'no lint for css-only package'"
  }
}
```

- [ ] **Step 1.2: Create `packages/themes/src/base.css`**

```css
/* ─────────────────────────────────────────────────────────────
   @kouji-ui/themes — base layer
   Raw primitives. Themes pull values from here.
   Components MUST NOT read base tokens directly.
   ──────────────────────────────────────────────────────────── */

@layer kj.base, kj.shared, kj.component;

@layer kj.base {
  :root {
    /* ── color palette ── */
    --kj-base-gray-50:  oklch(98% 0    0);
    --kj-base-gray-100: oklch(95% 0    0);
    --kj-base-gray-200: oklch(90% 0    0);
    --kj-base-gray-300: oklch(82% 0    0);
    --kj-base-gray-500: oklch(60% 0    0);
    --kj-base-gray-700: oklch(35% 0    0);
    --kj-base-gray-800: oklch(22% 0    0);
    --kj-base-gray-900: oklch(15% 0    0);
    --kj-base-gray-950: oklch(8%  0    0);

    --kj-base-blue-400: oklch(70% 0.16 250);
    --kj-base-blue-500: oklch(62% 0.19 250);
    --kj-base-blue-600: oklch(55% 0.20 250);

    --kj-base-red-500:    oklch(63% 0.22  20);
    --kj-base-green-500:  oklch(70% 0.18 145);
    --kj-base-yellow-500: oklch(83% 0.16  90);

    /* ── radii ── */
    --kj-base-radius-0:    0px;
    --kj-base-radius-1:    0.25rem;
    --kj-base-radius-2:    0.5rem;
    --kj-base-radius-3:    1rem;
    --kj-base-radius-full: 9999px;

    /* ── spacing — 8-step scale ── */
    --kj-base-space-0: 0;
    --kj-base-space-1: 0.25rem;
    --kj-base-space-2: 0.5rem;
    --kj-base-space-3: 0.75rem;
    --kj-base-space-4: 1rem;
    --kj-base-space-5: 1.5rem;
    --kj-base-space-6: 2rem;
    --kj-base-space-8: 4rem;

    /* ── type ── */
    --kj-base-font-sans: system-ui, -apple-system, sans-serif;
    --kj-base-font-mono: 'JetBrains Mono', 'Fira Code', monospace;
    --kj-base-text-xs:   0.75rem;
    --kj-base-text-sm:   0.875rem;
    --kj-base-text-base: 1rem;
    --kj-base-text-lg:   1.125rem;
    --kj-base-text-xl:   1.25rem;
    --kj-base-text-2xl:  1.5rem;

    /* ── borders & motion ── */
    --kj-base-border-1: 1px;
    --kj-base-border-2: 2px;
    --kj-base-transition-fast: 0.12s ease;
    --kj-base-transition-base: 0.2s ease;
  }
}
```

- [ ] **Step 1.3: Verify the directory exists and files are correct**

Run: `ls packages/themes/src/base.css packages/themes/package.json`
Expected: both paths print without error.

- [ ] **Step 1.4: Commit**

```bash
git add packages/themes/package.json packages/themes/src/base.css
git commit -m "feat(themes): scaffold @kouji-ui/themes package + base layer"
```

---

## Task 2: Add the `dark` theme (shared layer) + index barrel

**Files:**
- Create: `packages/themes/src/themes/dark.css`
- Create: `packages/themes/src/index.css`

- [ ] **Step 2.1: Create `packages/themes/src/themes/dark.css`**

This file defines every required shared-layer token under `[data-theme="dark"]`. The token list MUST exactly match the contract enforced by Task 4's spec.

```css
/* ─────────────────────────────────────────────────────────────
   dark theme — shared layer
   Sets every shared-layer token from the contract.
   ──────────────────────────────────────────────────────────── */

@layer kj.shared {
  [data-theme="dark"] {
    /* ── color slots ── */
    --kj-color-base-100:     var(--kj-base-gray-950);
    --kj-color-base-200:     var(--kj-base-gray-900);
    --kj-color-base-300:     var(--kj-base-gray-800);
    --kj-color-base-content: var(--kj-base-gray-50);

    --kj-color-primary:         var(--kj-base-blue-500);
    --kj-color-primary-content: var(--kj-base-gray-50);

    --kj-color-secondary:         var(--kj-base-gray-700);
    --kj-color-secondary-content: var(--kj-base-gray-50);

    --kj-color-accent:         var(--kj-base-blue-400);
    --kj-color-accent-content: var(--kj-base-gray-950);

    --kj-color-neutral:         var(--kj-base-gray-200);
    --kj-color-neutral-content: var(--kj-base-gray-900);

    --kj-color-info:         var(--kj-base-blue-400);
    --kj-color-info-content: var(--kj-base-gray-950);

    --kj-color-success:         var(--kj-base-green-500);
    --kj-color-success-content: var(--kj-base-gray-950);

    --kj-color-warning:         var(--kj-base-yellow-500);
    --kj-color-warning-content: var(--kj-base-gray-950);

    --kj-color-destructive:         var(--kj-base-red-500);
    --kj-color-destructive-content: var(--kj-base-gray-50);

    /* ── shape ── */
    --kj-radius-box:      var(--kj-base-radius-2);
    --kj-radius-field:    var(--kj-base-radius-1);
    --kj-radius-selector: var(--kj-base-radius-1);
    --kj-border:          var(--kj-base-border-1);
    --kj-depth:           1;

    /* ── type ── */
    --kj-font-sans: var(--kj-base-font-sans);
    --kj-font-mono: var(--kj-base-font-mono);
    --kj-text-xs:   var(--kj-base-text-xs);
    --kj-text-sm:   var(--kj-base-text-sm);
    --kj-text-base: var(--kj-base-text-base);
    --kj-text-lg:   var(--kj-base-text-lg);
    --kj-text-xl:   var(--kj-base-text-xl);
    --kj-text-2xl:  var(--kj-base-text-2xl);

    /* ── spacing ── */
    --kj-space-1: var(--kj-base-space-1);
    --kj-space-2: var(--kj-base-space-2);
    --kj-space-3: var(--kj-base-space-3);
    --kj-space-4: var(--kj-base-space-4);
    --kj-space-5: var(--kj-base-space-5);
    --kj-space-6: var(--kj-base-space-6);
    --kj-space-8: var(--kj-base-space-8);

    /* ── motion ── */
    --kj-transition: var(--kj-base-transition-fast);
  }
}
```

- [ ] **Step 2.2: Create `packages/themes/src/index.css`**

```css
@import './base.css';
@import './themes/dark.css';
```

- [ ] **Step 2.3: Commit**

```bash
git add packages/themes/src/themes/dark.css packages/themes/src/index.css
git commit -m "feat(themes): add dark theme + index barrel"
```

---

## Task 3: Add postcss to the workspace devDeps + run pnpm install

`postcss` is used by Task 4's contract test to parse the theme CSS. It's a single-purpose dev dep — no runtime usage.

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 3.1: Add postcss to root devDependencies**

In `package.json`, find the `devDependencies` block and add:

```json
"postcss": "^8.4.47"
```

(Place it alphabetically among existing entries.)

- [ ] **Step 3.2: Install**

Run: `pnpm install`
Expected: `+ postcss 8.x.x` and `Done` line. The new `packages/themes` entry is also picked up automatically because `pnpm-workspace.yaml` already includes `packages/*`.

- [ ] **Step 3.3: Verify postcss is resolvable**

Run: `pnpm list postcss --depth=-1`
Expected: a line showing postcss installed at the root.

- [ ] **Step 3.4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add postcss devDep for theme contract test"
```

---

## Task 4: Theme contract test (TDD)

The contract test asserts that every theme file under `packages/themes/src/themes/` defines every required shared-layer token. This is the "missing token" alarm. It runs before any cascade test because cascade tests are pointless if tokens are missing.

**Files:**
- Create: `packages/themes/tsconfig.spec.json`
- Create: `packages/themes/vite.config.ts`
- Create: `packages/themes/src/themes.spec.ts`
- Modify: `vitest.workspace.ts`

- [ ] **Step 4.1: Create `packages/themes/tsconfig.spec.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "../../out-tsc/spec-themes",
    "types": ["vitest/globals", "node"]
  },
  "include": ["src/**/*.spec.ts"]
}
```

- [ ] **Step 4.2: Create `packages/themes/vite.config.ts`**

```ts
import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
  },
});
```

(`environment: 'node'` because the contract test reads files from disk and parses CSS; no DOM needed.)

- [ ] **Step 4.3: Add the new project to `vitest.workspace.ts`**

Find the `projects` array and add the themes config. After change:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/core/vite.config.ts',
      'packages/themes/vite.config.ts',
    ],
  },
});
```

- [ ] **Step 4.4: Write the failing contract test at `packages/themes/src/themes.spec.ts`**

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import { describe, expect, test } from 'vitest';

/**
 * The shared-layer token contract. Every theme MUST define every token in this list.
 * Update this list when §3.2 of the design spec changes.
 */
const REQUIRED_SHARED_TOKENS = [
  // color slots
  '--kj-color-base-100', '--kj-color-base-200', '--kj-color-base-300', '--kj-color-base-content',
  '--kj-color-primary', '--kj-color-primary-content',
  '--kj-color-secondary', '--kj-color-secondary-content',
  '--kj-color-accent', '--kj-color-accent-content',
  '--kj-color-neutral', '--kj-color-neutral-content',
  '--kj-color-info', '--kj-color-info-content',
  '--kj-color-success', '--kj-color-success-content',
  '--kj-color-warning', '--kj-color-warning-content',
  '--kj-color-destructive', '--kj-color-destructive-content',
  // shape
  '--kj-radius-box', '--kj-radius-field', '--kj-radius-selector',
  '--kj-border', '--kj-depth',
  // type
  '--kj-font-sans', '--kj-font-mono',
  '--kj-text-xs', '--kj-text-sm', '--kj-text-base', '--kj-text-lg', '--kj-text-xl', '--kj-text-2xl',
  // spacing
  '--kj-space-1', '--kj-space-2', '--kj-space-3', '--kj-space-4',
  '--kj-space-5', '--kj-space-6', '--kj-space-8',
  // motion
  '--kj-transition',
] as const;

const themesDir = resolve(__dirname, 'themes');

function discoverThemes(): { name: string; cssPath: string }[] {
  return readdirSync(themesDir)
    .filter(f => f.endsWith('.css'))
    .map(f => ({ name: f.replace(/\.css$/, ''), cssPath: resolve(themesDir, f) }));
}

function tokensDefinedInThemeBlock(cssText: string, themeName: string): Set<string> {
  const root = postcss.parse(cssText);
  const tokens = new Set<string>();
  root.walkRules(rule => {
    // Match either bare [data-theme="X"] or layered :where([data-theme="X"]).
    if (!rule.selector.includes(`[data-theme="${themeName}"]`)) return;
    rule.walkDecls(decl => {
      if (decl.prop.startsWith('--kj-')) tokens.add(decl.prop);
    });
  });
  return tokens;
}

describe('theme contract', () => {
  const themes = discoverThemes();

  test('at least one theme is present', () => {
    expect(themes.length).toBeGreaterThan(0);
  });

  for (const theme of themes) {
    describe(theme.name, () => {
      const css = readFileSync(theme.cssPath, 'utf-8');
      const defined = tokensDefinedInThemeBlock(css, theme.name);

      for (const token of REQUIRED_SHARED_TOKENS) {
        test(`defines ${token}`, () => {
          expect(defined).toContain(token);
        });
      }
    });
  }
});
```

- [ ] **Step 4.5: Run the test to verify it passes**

Run from repo root: `pnpm test --project @kouji-ui/themes`

If pnpm complains it doesn't recognize `--project`, fall back to running just the themes project directly:

Run: `cd packages/themes && pnpm test`

Expected: all `defines --kj-*` tests pass for the `dark` theme. Output ends with `Tests <N> passed`.

If a token is missing from `dark.css`, the failing test name will say which one (e.g., `defines --kj-color-warning > FAIL`). Fix `dark.css` until green.

- [ ] **Step 4.6: Verify the test actually catches missing tokens (sanity)**

Temporarily delete the `--kj-color-warning: ...` line from `packages/themes/src/themes/dark.css`.
Run: `cd packages/themes && pnpm test`
Expected: `defines --kj-color-warning` fails with "expected Set [...] to contain --kj-color-warning".
Restore the deleted line.
Re-run: `cd packages/themes && pnpm test`
Expected: all green again.

- [ ] **Step 4.7: Commit**

```bash
git add packages/themes/tsconfig.spec.json packages/themes/vite.config.ts \
        packages/themes/src/themes.spec.ts vitest.workspace.ts
git commit -m "test(themes): contract test — every theme defines every required shared token"
```

---

## Task 5: Scaffold `@kouji-ui/components` package configs

This task creates the package skeleton — package.json, ng-package.json, tsconfigs, vite.config — so the next tasks can write actual code.

**Files:**
- Create: `packages/components/package.json`
- Create: `packages/components/ng-package.json`
- Create: `packages/components/tsconfig.lib.json`
- Create: `packages/components/tsconfig.lib.prod.json`
- Create: `packages/components/tsconfig.spec.json`
- Create: `packages/components/vite.config.ts`
- Create: `packages/components/src/test-setup.ts`
- Create: `packages/components/src/public-api.ts`

- [ ] **Step 5.1: Create `packages/components/package.json`**

```json
{
  "name": "@kouji-ui/components",
  "version": "0.0.1",
  "description": "Opinionated styled Angular components built on @kouji-ui/core directives. Themed at runtime via @kouji-ui/themes.",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/kouji-dev/kouji-ui.git",
    "directory": "packages/components"
  },
  "homepage": "https://kouji-ui.onrender.com",
  "bugs": { "url": "https://github.com/kouji-dev/kouji-ui/issues" },
  "keywords": ["angular", "ui", "components", "themed", "kouji"],
  "publishConfig": { "access": "public", "provenance": true },
  "peerDependencies": {
    "@angular/common": "^21.0.0",
    "@angular/core": "^21.0.0",
    "@angular/cdk": "^21.0.0",
    "@kouji-ui/core": "*"
  },
  "sideEffects": false,
  "scripts": {
    "build": "ng-packagr -p ng-package.json",
    "test": "vitest run",
    "lint": "ng lint kj-components"
  }
}
```

- [ ] **Step 5.2: Create `packages/components/ng-package.json`**

```json
{
  "$schema": "../../node_modules/ng-packagr/ng-package.schema.json",
  "dest": "../../dist/kj-components",
  "lib": {
    "entryFile": "src/public-api.ts"
  }
}
```

- [ ] **Step 5.3: Copy core's lib tsconfigs as the starting point**

Look at `packages/core/tsconfig.lib.json` and `packages/core/tsconfig.lib.prod.json`. Create identical files at `packages/components/tsconfig.lib.json` and `packages/components/tsconfig.lib.prod.json` (paths inside them are relative — they extend `../../tsconfig.json` either way).

Concretely, run:
```bash
cp packages/core/tsconfig.lib.json packages/components/tsconfig.lib.json
cp packages/core/tsconfig.lib.prod.json packages/components/tsconfig.lib.prod.json
```

Then open both files. If either contains absolute references to `core` (it likely doesn't — they're generic), no edits needed.

- [ ] **Step 5.4: Create `packages/components/tsconfig.spec.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "../../out-tsc/spec",
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*.d.ts", "src/**/*.spec.ts"]
}
```

- [ ] **Step 5.5: Create `packages/components/vite.config.ts`**

Mirrors core's setup so the Angular plugin handles `*.spec.ts` correctly.

```ts
import { defineProject } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineProject({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/test-setup.ts'],
    },
  },
});
```

- [ ] **Step 5.6: Create `packages/components/src/test-setup.ts`**

Verbatim copy of core's test-setup.

```ts
import '@analogjs/vitest-angular/setup-zone';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import '@testing-library/jest-dom';

setupTestBed({ zoneless: false });
```

- [ ] **Step 5.7: Create `packages/components/src/public-api.ts`**

Empty for now (Task 7 adds the `Button` export).

```ts
// Public API for @kouji-ui/components
export const KJ_COMPONENTS_VERSION = '0.0.1';
```

- [ ] **Step 5.8: Verify pnpm picks up the new workspace package**

Run: `pnpm install`
Expected: pnpm reports adding `@kouji-ui/components` to the workspace (no errors).

Run: `pnpm list -r --depth=-1 | grep kouji-ui`
Expected: lists `@kouji-ui/core`, `@kouji-ui/themes`, and `@kouji-ui/components`.

- [ ] **Step 5.9: Commit**

```bash
git add packages/components/package.json packages/components/ng-package.json \
        packages/components/tsconfig.lib.json packages/components/tsconfig.lib.prod.json \
        packages/components/tsconfig.spec.json packages/components/vite.config.ts \
        packages/components/src/test-setup.ts packages/components/src/public-api.ts \
        pnpm-lock.yaml
git commit -m "feat(components): scaffold @kouji-ui/components package skeleton"
```

---

## Task 6: Wire `kj-components` project in `angular.json` + register vitest project

**Files:**
- Modify: `angular.json`
- Modify: `vitest.workspace.ts`

- [ ] **Step 6.1: Add the `kj-components` project to `angular.json`**

Open `angular.json`. Find the `projects` object — currently has `kj-core` and `docs`. Add `kj-components` between them, mirroring `kj-core` exactly except for paths and prefix.

The new entry:

```json
"kj-components": {
  "projectType": "library",
  "root": "packages/components",
  "sourceRoot": "packages/components/src",
  "prefix": "kj",
  "architect": {
    "build": {
      "builder": "@angular/build:ng-packagr",
      "configurations": {
        "production": {
          "tsConfig": "packages/components/tsconfig.lib.prod.json"
        },
        "development": {
          "tsConfig": "packages/components/tsconfig.lib.json"
        }
      },
      "defaultConfiguration": "production"
    },
    "test": {
      "builder": "@angular/build:unit-test",
      "options": {
        "tsConfig": "packages/components/tsconfig.spec.json"
      }
    },
    "lint": {
      "builder": "@angular-eslint/builder:lint",
      "options": {
        "lintFilePatterns": [
          "packages/components/**/*.ts",
          "packages/components/**/*.html"
        ]
      }
    }
  }
}
```

- [ ] **Step 6.2: Register the components vitest project in `vitest.workspace.ts`**

After change:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/core/vite.config.ts',
      'packages/themes/vite.config.ts',
      'packages/components/vite.config.ts',
    ],
  },
});
```

- [ ] **Step 6.3: Verify `pnpm build` builds all three packages**

Run: `pnpm build`
Expected: turbo runs build for `@kouji-ui/core`, `@kouji-ui/components`, `@kouji-ui/themes`, and `docs`. The themes "build" prints `no build for css-only package`. The other three produce dist artifacts. Exit code 0.

If `pnpm build` complains "@kouji-ui/components has no source files to build", that's expected at this point (public-api.ts only exports a version constant). It still emits an empty package.

- [ ] **Step 6.4: Verify `pnpm test` runs all three vitest projects**

Run: `pnpm test`
Expected: vitest runs core's tests, themes' contract test, and components' tests. Components has no tests yet, so it reports `Tests no tests` (handled by `--passWithNoTests`). Themes shows the contract test passing. Core shows existing tests.

- [ ] **Step 6.5: Commit**

```bash
git add angular.json vitest.workspace.ts
git commit -m "build(components): register kj-components in angular.json + vitest workspace"
```

---

## Task 7: `KjButtonComponent` — failing test first (TDD)

**Files:**
- Create: `packages/components/src/button/button.spec.ts`
- Create: `packages/components/src/button/button.ts` (minimal, intentionally incomplete to verify test fails)

- [ ] **Step 7.1: Write the failing spec at `packages/components/src/button/button.spec.ts`**

The spec verifies the element-wrapper pattern: `<kj-button>` is the host, an inner `<button kjButton>` is rendered by the component's template, and the component's signal inputs (`variant`, `size`, `disabled`) flow through template binding to the directive's `[kjVariant]`, `[kjSize]`, `[kjDisabled]`. Each test queries the inner `button[kjButton]` element.

```ts
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjButtonComponent } from './button';

@Component({
  standalone: true,
  imports: [KjButtonComponent],
  template: `<kj-button [variant]="variant" [size]="size" [disabled]="disabled">Click</kj-button>`,
})
class HostComponent {
  variant: 'default' | 'destructive' | 'ghost' | 'link' | 'outline' = 'default';
  size: 'sm' | 'md' | 'lg' | 'icon' = 'md';
  disabled = false;
}

describe('KjButtonComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders an inner <button> with the .kj-button class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const wrapper = fixture.nativeElement.querySelector('kj-button');
    expect(wrapper).not.toBeNull();
    const btn = wrapper.querySelector('button.kj-button');
    expect(btn).not.toBeNull();
  });

  test('forwards variant signal input to the inner KjButton directive (data-variant attr)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.variant = 'destructive';
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('kj-button button.kj-button');
    expect(btn.getAttribute('data-variant')).toBe('destructive');
  });

  test('forwards size signal input (data-size attr on inner button)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.size = 'lg';
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('kj-button button.kj-button');
    expect(btn.getAttribute('data-size')).toBe('lg');
  });

  test('forwards disabled signal input (aria-disabled attr on inner button)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('kj-button button.kj-button');
    expect(btn.getAttribute('aria-disabled')).toBe('true');
  });

  test('projects content into the inner button', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('kj-button button.kj-button');
    expect(btn.textContent.trim()).toBe('Click');
  });
});
```

Five tests now (the fifth — content projection — verifies `<ng-content />` works). The first one is split into "wrapper exists" + "inner button has class".

- [ ] **Step 7.2: Create a deliberately-incomplete `packages/components/src/button/button.ts`**

The stub renders no inner button at all (just `<ng-content />` directly), no signal inputs declared, no encapsulation override. This makes ALL tests fail at assertion level.

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'kj-button',
  standalone: true,
  template: '<ng-content />',
})
export class KjButtonComponent {}
```

- [ ] **Step 7.3: Run the spec; it should fail**

Run: `cd packages/components && pnpm test`

Expected:
- "renders an inner <button> with the .kj-button class" FAILS — no inner button in the stub
- variant/size/disabled forwarding tests FAIL — there's no inner button to query (queries return null, then attribute reads throw or return null)
- "projects content into the inner button" FAILS — same reason (no inner button)

NG0303 warnings about unknown `[variant]`, `[size]`, `[disabled]` properties on `<kj-button>` are expected because the stub declares no inputs. Will disappear in Task 8.

If tests pass accidentally, the test is wrong. Stop and re-examine.

- [ ] **Step 7.4: Commit (failing test + stub)**

```bash
git add packages/components/src/button/button.ts packages/components/src/button/button.spec.ts
git commit -m "test(components/button): failing spec — element wrapper composes KjButton via template"
```

---

## Task 8: Implement `KjButtonComponent` (template composition) to make the test pass

**Files:**
- Modify: `packages/components/src/button/button.ts` (replace the stub)
- Modify: `packages/components/vite.config.ts` (add resolve alias so vitest can find `@kouji-ui/core` from source — see Step 8.0)

### Step 8.0 (precondition): Resolve `@kouji-ui/core` for vitest

When `button.ts` imports `KjButton` from `@kouji-ui/core`, vitest needs to find it. Two paths:
- **Option A (current default):** rebuild core first via `pnpm build:core`, then run tests — works but slow for dev iteration.
- **Option B (recommended):** add a vite resolve alias so `@kouji-ui/core` maps to source. Lets `pnpm test` from inside `packages/components/` work without a fresh core build.

This step uses Option B. Edit `packages/components/vite.config.ts`:

```ts
import { defineProject } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import { resolve } from 'node:path';

export default defineProject({
  plugins: [angular()],
  resolve: {
    alias: {
      '@kouji-ui/core': resolve(__dirname, '../core/src/public-api.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/test-setup.ts'],
    },
  },
});
```

The alias points to core's TS source (`packages/core/src/public-api.ts`), so the Angular plugin compiles core directly during tests. Production builds (`pnpm build`) are unaffected — they go through ng-packagr which respects the published package layout.

### Step 8.1: Replace the contents of `button.ts` with the real implementation

```ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjButton, KjButtonVariant, KjButtonSize } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless KjButton directive.
 *
 * Element-wrapper pattern: the host `<kj-button>` is a structural shell with
 * `display: contents` (no layout box). The component template renders a real
 * inner `<button>` with the `kjButton` directive applied. Signal inputs on
 * the component (`variant`, `size`, `disabled`) flow through normal template
 * binding to the directive's `kjVariant` / `kjSize` / `kjDisabled` inputs.
 *
 * `ViewEncapsulation.None` makes the component's CSS (button.css) global so
 * theme overrides like `[data-theme="X"] .kj-button { ... }` and the
 * `@layer kj.component` cascade rules from the design spec actually apply.
 *
 * @example
 * ```html
 * <kj-button variant="destructive" size="lg" [disabled]="loading()">
 *   Delete
 * </kj-button>
 * ```
 */
@Component({
  selector: 'kj-button',
  standalone: true,
  imports: [KjButton],
  template: `
    <button
      kjButton
      class="kj-button"
      [kjVariant]="variant()"
      [kjSize]="size()"
      [kjDisabled]="disabled()"
    >
      <ng-content />
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjButtonComponent {
  readonly variant = input<KjButtonVariant>('default');
  readonly size = input<KjButtonSize>('md');
  readonly disabled = input(false);
}
```

Key non-obvious bits:
- `imports: [KjButton]` — the directive is used in the template, so it must be in the component's imports.
- `[kjVariant]="variant()"` — calling the signal in template binding is the idiomatic Angular 21 pattern.
- `encapsulation: ViewEncapsulation.None` — required for theme CSS in `@kouji-ui/themes` to override `.kj-button` rules. With Emulated encapsulation, `.kj-button` would be view-scoped and theme overrides outside the component wouldn't match.
- `host: { style: 'display: contents;' }` — the wrapper element is invisible to layout. Without this, every `<kj-button>` would be an `inline` box wrapping its inner button, breaking flexbox/grid alignment.

### Step 8.2: Run the spec; all 5 tests must pass

Run: `cd packages/components && pnpm test`
Expected output ends with: `Tests 5 passed (5)`. NG0303 warnings disappear because `variant`/`size`/`disabled` are now declared inputs on the component.

If a test still fails:
- "renders an inner <button> with the .kj-button class" failing → check the template renders `<button class="kj-button">` (note the literal `class` attribute, not `[class]`)
- "forwards variant signal input (data-variant attr)" failing → check the template uses `[kjVariant]="variant()"` (call the signal); also verify `KjButton` actually emits `data-variant` (it does, via its host binding `[attr.data-variant]="kjVariant()"` in core)
- "forwards disabled signal input (aria-disabled attr)" failing → `KjButton` composes `KjDisabled` which sets `aria-disabled` based on its `kjDisabled` input. Verify the template forwards `[kjDisabled]="disabled()"` and the import resolves
- Module-load errors about `@kouji-ui/core` → the vite resolve alias from Step 8.0 isn't in place; re-check `vite.config.ts`

### Step 8.3: Commit

```bash
git add packages/components/src/button/button.ts packages/components/vite.config.ts
git commit -m "feat(components/button): implement KjButtonComponent — element wrapper, template composition"
```

---

## Task 9: `button.css` — component-layer tokens + structural CSS

**Files:**
- Create: `packages/components/src/button/button.css`
- Modify: `packages/components/src/button/button.ts` (add `styleUrl`)

- [ ] **Step 9.1: Create `packages/components/src/button/button.css`**

```css
/* ─────────────────────────────────────────────────────────────
   .kj-button — component-layer tokens + structural CSS
   Tokens default to shared-layer values from @kouji-ui/themes.
   Variants/sizes/states retarget the component tokens; the
   structural rules below are the only place raw var(--kj-button-*)
   is read.
   ──────────────────────────────────────────────────────────── */

@layer kj.component {
  .kj-button {
    /* component knobs — themes/users can override any of these */
    --kj-button-bg:               var(--kj-color-primary);
    --kj-button-fg:               var(--kj-color-primary-content);
    --kj-button-border-color:     transparent;
    --kj-button-border-style:     solid;
    --kj-button-border-width:     var(--kj-border);
    --kj-button-radius:           var(--kj-radius-field);
    --kj-button-padding-x:        var(--kj-space-3);
    --kj-button-padding-y:        var(--kj-space-2);
    --kj-button-font:             var(--kj-font-sans);
    --kj-button-font-size:        var(--kj-text-sm);
    --kj-button-shadow:           none;
    --kj-button-shadow-active:    none;
    --kj-button-translate-active: none;

    /* the only place raw var(--kj-button-*) is read */
    display: inline-flex;
    align-items: center;
    gap: var(--kj-space-2);
    background: var(--kj-button-bg);
    color: var(--kj-button-fg);
    border: var(--kj-button-border-width) var(--kj-button-border-style) var(--kj-button-border-color);
    border-radius: var(--kj-button-radius);
    padding: var(--kj-button-padding-y) var(--kj-button-padding-x);
    font: var(--kj-button-font-size) / 1.2 var(--kj-button-font);
    box-shadow: var(--kj-button-shadow);
    transition: var(--kj-transition);
    cursor: pointer;
    text-decoration: none;
  }

  /* variants — flip component tokens, not component CSS */
  .kj-button[data-variant="destructive"] {
    --kj-button-bg: var(--kj-color-destructive);
    --kj-button-fg: var(--kj-color-destructive-content);
  }

  .kj-button[data-variant="ghost"] {
    --kj-button-bg: transparent;
    --kj-button-fg: var(--kj-color-base-content);
    --kj-button-border-color: transparent;
  }
  .kj-button[data-variant="ghost"]:hover {
    --kj-button-bg: var(--kj-color-base-200);
  }

  .kj-button[data-variant="outline"] {
    --kj-button-bg: transparent;
    --kj-button-fg: var(--kj-color-base-content);
    --kj-button-border-color: var(--kj-color-neutral);
  }

  .kj-button[data-variant="link"] {
    --kj-button-bg: transparent;
    --kj-button-fg: var(--kj-color-primary);
    --kj-button-padding-x: 0;
    --kj-button-padding-y: 0;
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  /* sizes */
  .kj-button[data-size="sm"] {
    --kj-button-padding-x: var(--kj-space-2);
    --kj-button-padding-y: 0.25rem;
    --kj-button-font-size: 0.8125rem;
  }
  .kj-button[data-size="lg"] {
    --kj-button-padding-x: var(--kj-space-4);
    --kj-button-padding-y: 0.625rem;
    --kj-button-font-size: 1rem;
  }
  .kj-button[data-size="icon"] {
    --kj-button-padding-x: var(--kj-space-2);
    --kj-button-padding-y: var(--kj-space-2);
  }

  /* states */
  .kj-button:hover {
    --kj-button-bg: color-mix(in oklab, var(--kj-button-bg) 88%, black);
  }
  .kj-button:active {
    transform: var(--kj-button-translate-active);
    box-shadow: var(--kj-button-shadow-active);
  }
  .kj-button:focus-visible {
    outline: 2px solid var(--kj-color-primary);
    outline-offset: 2px;
  }
  .kj-button[aria-disabled="true"] {
    opacity: 0.45;
    cursor: not-allowed;
    pointer-events: none;
  }
}
```

- [ ] **Step 9.2: Wire the CSS into the component**

Edit `packages/components/src/button/button.ts` and add a `styleUrl` field to the `@Component` decorator. The decorator block becomes:

```ts
@Component({
  selector: 'kj-button',
  standalone: true,
  imports: [KjButton],
  template: `
    <button
      kjButton
      class="kj-button"
      [kjVariant]="variant()"
      [kjSize]="size()"
      [kjDisabled]="disabled()"
    >
      <ng-content />
    </button>
  `,
  styleUrl: './button.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
```

(Only adds the `styleUrl` line to what Task 8 already produced.)

- [ ] **Step 9.3: Re-run tests; existing 4 tests should still pass**

Run: `cd packages/components && pnpm test`
Expected: still `Tests 4 passed (4)`. Adding the stylesheet should not break the unit tests.

- [ ] **Step 9.4: Commit**

```bash
git add packages/components/src/button/button.css packages/components/src/button/button.ts
git commit -m "feat(components/button): component-layer tokens + structural CSS"
```

---

## Task 10: Export `KjButtonComponent` from the package public API

**Files:**
- Create: `packages/components/src/button/index.ts`
- Modify: `packages/components/src/public-api.ts`

- [ ] **Step 10.1: Create `packages/components/src/button/index.ts`**

```ts
export * from './button';
```

- [ ] **Step 10.2: Update `packages/components/src/public-api.ts`**

```ts
// Public API for @kouji-ui/components
export const KJ_COMPONENTS_VERSION = '0.0.1';

export * from './button/index';
```

- [ ] **Step 10.3: Build the package and verify it emits `KjButtonComponent`**

Run: `pnpm build:core`  (builds core first since components depends on it)

Then:
Run: `pnpm exec turbo run build --filter=@kouji-ui/components`
Expected: ng-packagr completes; `dist/kj-components/` is produced; the dist's `index.d.ts` re-exports `KjButtonComponent`.

Verify the dist export:
Run: `grep -r 'KjButtonComponent' dist/kj-components/index.d.ts`
Expected: a line referencing `KjButtonComponent`.

- [ ] **Step 10.4: Run the full repo test suite to make sure nothing else broke**

Run: `pnpm test`
Expected: themes contract tests pass, components button spec passes, all existing core tests pass. Exit code 0.

- [ ] **Step 10.5: Run lint**

Run: `pnpm lint`
Expected: turbo runs lint for core, components, docs. Exit code 0.

If `pnpm lint` complains the `kj-components` project has no source files matching its patterns, that's fine — it still exits 0.

- [ ] **Step 10.6: Commit**

```bash
git add packages/components/src/button/index.ts packages/components/src/public-api.ts
git commit -m "feat(components): export KjButtonComponent from public API"
```

---

## Task 11: Final verification + handoff to Wave 1

**Files:**
- (no new files)

- [ ] **Step 11.1: Run the full pre-push gate locally**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: all three exit 0.

- [ ] **Step 11.2: Verify the husky pre-push hook will pass**

Run: `pnpm exec changeset status --since=origin/main`
Expected: "NO packages to be bumped at patch / minor / major". This is correct — the new packages are at `0.0.1` and have no changeset; they'll be bumped/released in a future Wave once the architecture stabilizes.

- [ ] **Step 11.3: Inventory the commits on the branch**

Run: `git log main..HEAD --oneline`
Expected: about 10 commits, one per task plus the spec commit, all on `feat/themes-and-components`. They roughly read:

```
docs(spec): themes-and-components architecture
feat(themes): scaffold @kouji-ui/themes package + base layer
feat(themes): add dark theme + index barrel
chore: add postcss devDep for theme contract test
test(themes): contract test — every theme defines every required shared token
feat(components): scaffold @kouji-ui/components package skeleton
build(components): register kj-components in angular.json + vitest workspace
test(components/button): failing spec — host class + input forwarding
feat(components/button): implement KjButtonComponent — composes KjButton, forwards inputs
feat(components/button): component-layer tokens + structural CSS
feat(components): export KjButtonComponent from public API
```

- [ ] **Step 11.4: Stop here — do NOT push or open a PR**

Per the user's standing instruction "don't push before I validate it", Wave 0 ends with the branch sitting locally. Wave 1's plan picks up next.

---

## What Wave 0 deliberately does NOT do

- **No docs changes.** `apps/docs` is untouched. The existing docs site continues to work with the existing `KjButton` directive. Wave 1 owns the docs migration (sidebar split, theme selector, killing per-theme example tabs).
- **No deletions in core.** `packages/core/src/styles/docs-themes.css` still exists. The `*.{finance,retro,sizes}.example.ts` files still exist. Wave 1 deletes them once the docs no longer reference them.
- **No additional themes.** Only `dark` ships in this wave. The full 5-theme set lands in Wave 2.
- **No additional components.** Only `KjButtonComponent`. Wave 1 adds the docs-shell components (Input, Card, Link, Kbd, Surface).
- **No cascade test.** Component-rendering-with-real-theme-applied is more reliably tested via Playwright in a real browser; jsdom's `@layer` support is incomplete. Wave 1's E2E layer covers this.
- **No changeset.** New packages are unpublished (`0.0.1`); they get changesets and a publish bump once the contract has settled across at least Wave 1.

---

## Success criteria

- [ ] `pnpm install` succeeds; both new packages appear in `pnpm list -r`.
- [ ] `pnpm build` builds core, components, themes, and docs without errors.
- [ ] `pnpm test` runs the themes contract test (≥ 38 token assertions × 1 theme = 38 tests + meta tests, all pass) and the components button spec (4 tests pass).
- [ ] `pnpm lint` exits 0.
- [ ] `dist/kj-components/index.d.ts` re-exports `KjButtonComponent`.
- [ ] No file in `apps/docs/` or `packages/core/src/` is modified.
- [ ] The branch `feat/themes-and-components` is local-only, not pushed.
