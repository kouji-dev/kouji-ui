# Token System Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to dispatch tasks, with **Tasks 11–15 dispatched in parallel** (one combined message with 5 Agent tool calls). All other tasks are sequential. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the kouji-ui color token system from ~11 flat `--kj-color-*` slots to a 47-token semantic taxonomy split across `--kj-bg-*` (surfaces), `--kj-fg-*` (foregrounds), `--kj-border-*` (edges), and `--kj-shadow-*` (elevation).

**Architecture:** Two-tier system. Tier 1 (`base.css` OKLCH primitives) unchanged. Tier 2 (per-theme semantic aliases in `packages/themes/src/themes/*.css`) gets the new vocabulary. Migration runs additively (new tokens added first, old tokens removed only at the end) so the build never breaks mid-rollout.

**Tech Stack:** CSS variables, pnpm workspaces, Angular components, Vitest unit tests, Playwright + axe-core (a11y verification).

**Spec:** [`docs/superpowers/specs/2026-05-13-token-system-design.md`](../specs/2026-05-13-token-system-design.md)
**Migration map:** [`docs/superpowers/specs/token-migration-map.md`](../specs/token-migration-map.md)

**Branch:** `feat/token-system` (already created, off `main`, in the main checkout — no worktree)

---

## File map

**Created** (Phase 0, already on disk pending commit):
- `docs/superpowers/specs/2026-05-13-token-system-design.md`
- `docs/superpowers/specs/token-migration-map.md`
- `docs/superpowers/plans/2026-05-13-token-system.md` (this file)

**Modified** (Phase 1 — themes):
- `packages/themes/src/themes/kouji.css`
- `packages/themes/src/themes/dark.css`
- `packages/themes/src/themes/light.css`
- `packages/themes/src/themes/retro.css`
- `packages/themes/src/themes/cyberpunk.css`
- `packages/themes/src/themes/corporate.css`
- `packages/themes/src/themes.spec.ts`

**Modified** (Phase 1.5 — theme-generator):
- `apps/docs/src/app/lib/theme/serialize-theme.ts` (+ spec)
- `apps/docs/src/app/components/theme-config-panel/panels/*.ts` (+ CSS)
- `apps/docs/src/app/components/theme-rail/theme-rail.css`
- `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.css`
- `apps/docs/src/app/pages/theme-generator/preview-tabs/search.ts`

**Modified** (Phase 2 — 5 parallel agents):
- All `packages/components/src/**/*.css`
- All `packages/core/src/**/*.css`
- All `apps/docs/src/**/*.css` (excluding files touched in Phase 1.5)

**Modified** (Phase 3 — cleanup):
- All theme files (remove old tokens)
- `packages/themes/src/themes.spec.ts` (require only new tokens)

---

## Task 1: Commit spec + migration map + plan

**Files:**
- Verify present: `docs/superpowers/specs/2026-05-13-token-system-design.md`
- Verify present: `docs/superpowers/specs/token-migration-map.md`
- Verify present: `docs/superpowers/plans/2026-05-13-token-system.md`

- [ ] **Step 1: Confirm branch + files**

Run:
```bash
git branch --show-current
ls docs/superpowers/specs/2026-05-13-token-system-design.md docs/superpowers/specs/token-migration-map.md docs/superpowers/plans/2026-05-13-token-system.md
```
Expected: branch is `feat/token-system`, all three files exist.

- [ ] **Step 2: Stage and commit**

```bash
git add docs/superpowers/specs/2026-05-13-token-system-design.md docs/superpowers/specs/token-migration-map.md docs/superpowers/plans/2026-05-13-token-system.md
git commit -m "docs(tokens): add design spec, migration map, and rollout plan"
```

---

## Task 2: Add new tokens additively to kouji theme

**Files:**
- Modify: `packages/themes/src/themes/kouji.css`

Old tokens stay (additive). The new tokens are appended inside the same `[data-theme="kouji"]` block.

- [ ] **Step 1: Read current file**

Read `packages/themes/src/themes/kouji.css` so you have the full context.

- [ ] **Step 2: Append the new token block**

Inside the `[data-theme="kouji"]` selector block, AFTER the existing token definitions but BEFORE the closing `}`, add:

```css
    /* ─── new token system (additive — old tokens above retained during migration) ─── */

    /* Neutral surfaces (7) */
    --kj-bg-body:        #0c0c0c;
    --kj-bg-surface:     #141414;
    --kj-bg-field:       #141414;
    --kj-bg-elevated:    #1a1a1a;
    --kj-bg-overlay:     rgba(0, 0, 0, 0.7);
    --kj-bg-inverse:     #f0ede6;
    --kj-bg-disabled:    #1a1a1a;

    /* Intent surfaces — primary */
    --kj-bg-primary:         #b8f500;
    --kj-bg-primary-subtle:  #2a3300;

    /* Intent surfaces — accent (kouji: same as primary) */
    --kj-bg-accent:          #b8f500;
    --kj-bg-accent-subtle:   #2a3300;

    /* Intent surfaces — info */
    --kj-bg-info:            var(--kj-base-blue-400);
    --kj-bg-info-subtle:     #0a1a2a;

    /* Intent surfaces — success */
    --kj-bg-success:         var(--kj-base-lime-500);
    --kj-bg-success-subtle:  #1a2a00;

    /* Intent surfaces — warning */
    --kj-bg-warning:         var(--kj-base-amber-500);
    --kj-bg-warning-subtle:  #2a1a00;

    /* Intent surfaces — danger */
    --kj-bg-danger:          var(--kj-base-red-500);
    --kj-bg-danger-subtle:   #2a0a0a;

    /* FG Class A — independent */
    --kj-fg-default:    #f0ede6;
    --kj-fg-muted:      #b8b3a3;
    --kj-fg-subtle:     #8a8578;
    --kj-fg-disabled:   #5a5648;

    /* FG Class B — paired */
    --kj-fg-on-primary:   #0c0c0c;
    --kj-fg-on-accent:    #0c0c0c;
    --kj-fg-on-info:      var(--kj-base-gray-950);
    --kj-fg-on-success:   var(--kj-base-gray-950);
    --kj-fg-on-warning:   var(--kj-base-gray-950);
    --kj-fg-on-danger:    var(--kj-base-gray-50);
    --kj-fg-on-inverse:   #0c0c0c;

    /* FG Class C — intent as text */
    --kj-fg-primary:    #b8f500;
    --kj-fg-accent:     #b8f500;
    --kj-fg-info:       var(--kj-base-blue-400);
    --kj-fg-success:    var(--kj-base-lime-500);
    --kj-fg-warning:    var(--kj-base-amber-500);
    --kj-fg-danger:     var(--kj-base-red-400);

    /* Borders */
    --kj-border-default:   #1a1a1a;
    --kj-border-muted:     #141414;
    --kj-border-strong:    #2a2a2a;
    --kj-border-focus:     #b8f500;
    --kj-border-disabled:  #1a1a1a;
    --kj-border-primary:   #b8f500;
    --kj-border-danger:    var(--kj-base-red-500);

    /* Shadows — kouji is brutalist/flat (depth 0) */
    --kj-shadow-sm:     0 0 0 1px #1a1a1a;
    --kj-shadow-md:     0 0 0 1px #1a1a1a;
    --kj-shadow-lg:     0 0 0 2px #1a1a1a;
    --kj-shadow-focus:  0 0 0 2px #b8f500;
```

- [ ] **Step 3: Verify CSS still parses**

Run:
```bash
pnpm --filter @kouji-ui/themes lint
```
Expected: no errors (themes package has `echo 'no lint for css-only package'` — just exits 0).

Then verify the build:
```bash
pnpm --filter docs build 2>&1 | tail -10
```
Expected: build succeeds (no missing-variable errors from any CSS that already references new tokens — there shouldn't be any yet).

- [ ] **Step 4: Commit**

```bash
git add packages/themes/src/themes/kouji.css
git commit -m "feat(themes): add new token slots to kouji (additive)"
```

---

## Task 3: Add new tokens to dark theme

**Files:**
- Modify: `packages/themes/src/themes/dark.css`

- [ ] **Step 1: Read current file**

- [ ] **Step 2: Append new tokens inside the `[data-theme="dark"]` block**

```css
    /* ─── new token system (additive) ─── */

    --kj-bg-body:        var(--kj-base-gray-900);
    --kj-bg-surface:     var(--kj-base-gray-800);
    --kj-bg-field:       var(--kj-base-gray-800);
    --kj-bg-elevated:    var(--kj-base-gray-700);
    --kj-bg-overlay:     rgba(0, 0, 0, 0.7);
    --kj-bg-inverse:     var(--kj-base-gray-50);
    --kj-bg-disabled:    var(--kj-base-gray-700);

    --kj-bg-primary:         var(--kj-base-blue-500);
    --kj-bg-primary-subtle:  oklch(28% 0.08 250);
    --kj-bg-accent:          var(--kj-base-blue-400);
    --kj-bg-accent-subtle:   oklch(28% 0.08 250);

    --kj-bg-info:            var(--kj-base-blue-400);
    --kj-bg-info-subtle:     oklch(28% 0.08 250);
    --kj-bg-success:         var(--kj-base-green-500);
    --kj-bg-success-subtle:  oklch(28% 0.08 145);
    --kj-bg-warning:         var(--kj-base-amber-500);
    --kj-bg-warning-subtle:  oklch(28% 0.08 60);
    --kj-bg-danger:          var(--kj-base-red-500);
    --kj-bg-danger-subtle:   oklch(28% 0.08 20);

    --kj-fg-default:    var(--kj-base-gray-50);
    --kj-fg-muted:      var(--kj-base-gray-300);
    --kj-fg-subtle:     var(--kj-base-gray-500);
    --kj-fg-disabled:   var(--kj-base-gray-700);

    --kj-fg-on-primary:   var(--kj-base-gray-50);
    --kj-fg-on-accent:    var(--kj-base-gray-950);
    --kj-fg-on-info:      var(--kj-base-gray-950);
    --kj-fg-on-success:   var(--kj-base-gray-950);
    --kj-fg-on-warning:   var(--kj-base-gray-950);
    --kj-fg-on-danger:    var(--kj-base-gray-50);
    --kj-fg-on-inverse:   var(--kj-base-gray-950);

    --kj-fg-primary:    var(--kj-base-blue-400);
    --kj-fg-accent:     var(--kj-base-blue-400);
    --kj-fg-info:       var(--kj-base-blue-400);
    --kj-fg-success:    var(--kj-base-green-500);
    --kj-fg-warning:    var(--kj-base-amber-500);
    --kj-fg-danger:     var(--kj-base-red-400);

    --kj-border-default:   var(--kj-base-gray-700);
    --kj-border-muted:     var(--kj-base-gray-800);
    --kj-border-strong:    var(--kj-base-gray-500);
    --kj-border-focus:     var(--kj-base-blue-400);
    --kj-border-disabled:  var(--kj-base-gray-700);
    --kj-border-primary:   var(--kj-base-blue-500);
    --kj-border-danger:    var(--kj-base-red-500);

    --kj-shadow-sm:     0 1px 2px rgba(0, 0, 0, 0.4);
    --kj-shadow-md:     0 4px 12px rgba(0, 0, 0, 0.5);
    --kj-shadow-lg:     0 16px 40px rgba(0, 0, 0, 0.6);
    --kj-shadow-focus:  0 0 0 3px oklch(70% 0.16 250 / 0.5);
```

- [ ] **Step 3: Verify build**

```bash
pnpm --filter docs build 2>&1 | tail -5
```
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add packages/themes/src/themes/dark.css
git commit -m "feat(themes): add new token slots to dark (additive)"
```

---

## Task 4: Add new tokens to light theme

**Files:**
- Modify: `packages/themes/src/themes/light.css`

- [ ] **Step 1: Read current file**

- [ ] **Step 2: Append new tokens inside the `[data-theme="light"]` block**

```css
    /* ─── new token system (additive) ─── */

    --kj-bg-body:        var(--kj-base-gray-50);
    --kj-bg-surface:     #ffffff;
    --kj-bg-field:       var(--kj-base-gray-100);
    --kj-bg-elevated:    #ffffff;
    --kj-bg-overlay:     rgba(0, 0, 0, 0.5);
    --kj-bg-inverse:     var(--kj-base-gray-900);
    --kj-bg-disabled:    var(--kj-base-gray-200);

    --kj-bg-primary:         var(--kj-base-blue-500);
    --kj-bg-primary-subtle:  oklch(95% 0.04 250);
    --kj-bg-accent:          var(--kj-base-blue-500);
    --kj-bg-accent-subtle:   oklch(95% 0.04 250);

    --kj-bg-info:            var(--kj-base-blue-500);
    --kj-bg-info-subtle:     oklch(95% 0.04 250);
    --kj-bg-success:         var(--kj-base-green-500);
    --kj-bg-success-subtle:  oklch(95% 0.06 145);
    --kj-bg-warning:         var(--kj-base-amber-500);
    --kj-bg-warning-subtle:  oklch(95% 0.06 60);
    --kj-bg-danger:          var(--kj-base-red-500);
    --kj-bg-danger-subtle:   oklch(95% 0.05 20);

    --kj-fg-default:    var(--kj-base-gray-900);
    --kj-fg-muted:      var(--kj-base-gray-700);
    --kj-fg-subtle:     var(--kj-base-gray-500);
    --kj-fg-disabled:   var(--kj-base-gray-300);

    --kj-fg-on-primary:   var(--kj-base-gray-50);
    --kj-fg-on-accent:    var(--kj-base-gray-50);
    --kj-fg-on-info:      var(--kj-base-gray-50);
    --kj-fg-on-success:   var(--kj-base-gray-50);
    --kj-fg-on-warning:   var(--kj-base-gray-950);
    --kj-fg-on-danger:    var(--kj-base-gray-50);
    --kj-fg-on-inverse:   var(--kj-base-gray-50);

    --kj-fg-primary:    var(--kj-base-blue-700);
    --kj-fg-accent:     var(--kj-base-blue-700);
    --kj-fg-info:       var(--kj-base-blue-700);
    --kj-fg-success:    oklch(45% 0.18 145);
    --kj-fg-warning:    oklch(50% 0.17 55);
    --kj-fg-danger:     var(--kj-base-red-600);

    --kj-border-default:   var(--kj-base-gray-200);
    --kj-border-muted:     var(--kj-base-gray-100);
    --kj-border-strong:    var(--kj-base-gray-300);
    --kj-border-focus:     var(--kj-base-blue-500);
    --kj-border-disabled:  var(--kj-base-gray-200);
    --kj-border-primary:   var(--kj-base-blue-500);
    --kj-border-danger:    var(--kj-base-red-500);

    --kj-shadow-sm:     0 1px 2px rgba(0, 0, 0, 0.08);
    --kj-shadow-md:     0 4px 12px rgba(0, 0, 0, 0.12);
    --kj-shadow-lg:     0 16px 40px rgba(0, 0, 0, 0.18);
    --kj-shadow-focus:  0 0 0 3px oklch(62% 0.19 250 / 0.4);
```

- [ ] **Step 3: Verify build**

```bash
pnpm --filter docs build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add packages/themes/src/themes/light.css
git commit -m "feat(themes): add new token slots to light (additive)"
```

---

## Task 5: Add new tokens to retro theme

**Files:**
- Modify: `packages/themes/src/themes/retro.css`

- [ ] **Step 1: Read current file**

- [ ] **Step 2: Append inside the `[data-theme="retro"]` block**

Retro is the theme where primary (`#ef9995`) FAILS as text on body (`#ede5d0` = 1.73:1). The new `--kj-fg-primary` must be a darker terracotta.

```css
    /* ─── new token system (additive) ─── */

    --kj-bg-body:        #ede5d0;
    --kj-bg-surface:     #e4d8b4;
    --kj-bg-field:       #f4ecd8;
    --kj-bg-elevated:    #fff8e4;
    --kj-bg-overlay:     rgba(40, 36, 37, 0.5);
    --kj-bg-inverse:     #282425;
    --kj-bg-disabled:    #d6c89a;

    --kj-bg-primary:         #ef9995;
    --kj-bg-primary-subtle:  #fce3df;
    --kj-bg-accent:          #7a9eb1;
    --kj-bg-accent-subtle:   #d6e2ea;

    --kj-bg-info:            #7a9eb1;
    --kj-bg-info-subtle:     #d6e2ea;
    --kj-bg-success:         #91b859;
    --kj-bg-success-subtle:  #dfecc8;
    --kj-bg-warning:         #e9b872;
    --kj-bg-warning-subtle:  #faedd5;
    --kj-bg-danger:          #c4625d;
    --kj-bg-danger-subtle:   #f3d4d2;

    --kj-fg-default:    #282425;
    --kj-fg-muted:      #5d4037;
    --kj-fg-subtle:     #8a6e60;
    --kj-fg-disabled:   #bdb098;

    --kj-fg-on-primary:   #282425;
    --kj-fg-on-accent:    #282425;
    --kj-fg-on-info:      #282425;
    --kj-fg-on-success:   #282425;
    --kj-fg-on-warning:   #282425;
    --kj-fg-on-danger:    #ede5d0;
    --kj-fg-on-inverse:   #ede5d0;

    /* fg.primary must meet AA on body — terracotta darkened from #ef9995 */
    --kj-fg-primary:    #8a3a36;
    --kj-fg-accent:     #3d5a6b;
    --kj-fg-info:       #3d5a6b;
    --kj-fg-success:    #4a6b2b;
    --kj-fg-warning:    #8a5a1f;
    --kj-fg-danger:     #8a2f2a;

    --kj-border-default:   #d6c89a;
    --kj-border-muted:     #e4d8b4;
    --kj-border-strong:    #b8a578;
    --kj-border-focus:     #7a9eb1;
    --kj-border-disabled:  #d6c89a;
    --kj-border-primary:   #ef9995;
    --kj-border-danger:    #c4625d;

    --kj-shadow-sm:     0 1px 3px rgba(93, 64, 55, 0.1);
    --kj-shadow-md:     0 4px 12px rgba(93, 64, 55, 0.18);
    --kj-shadow-lg:     0 16px 40px rgba(93, 64, 55, 0.25);
    --kj-shadow-focus:  0 0 0 3px rgba(122, 158, 177, 0.45);
```

- [ ] **Step 3: Verify build**

```bash
pnpm --filter docs build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add packages/themes/src/themes/retro.css
git commit -m "feat(themes): add new token slots to retro (additive, contrast-fixed fg.primary)"
```

---

## Task 6: Add new tokens to cyberpunk theme

**Files:**
- Modify: `packages/themes/src/themes/cyberpunk.css`

- [ ] **Step 1: Read current file**

- [ ] **Step 2: Append inside the `[data-theme="cyberpunk"]` block**

Cyberpunk's vivid pink `#ff007f` on yellow body `#ffee00` = 3.14:1 (FAIL). Pick a darker pink for `--kj-fg-primary`.

```css
    /* ─── new token system (additive) ─── */

    --kj-bg-body:        #ffee00;
    --kj-bg-surface:     #f0d808;
    --kj-bg-field:       #f8e604;
    --kj-bg-elevated:    #fff84e;
    --kj-bg-overlay:     rgba(10, 10, 10, 0.7);
    --kj-bg-inverse:     #0a0a0a;
    --kj-bg-disabled:    #d6c008;

    --kj-bg-primary:         #ff007f;
    --kj-bg-primary-subtle:  #ffd1e6;
    --kj-bg-accent:          #4d00b8;
    --kj-bg-accent-subtle:   #d8c4f2;

    --kj-bg-info:            #00f0ff;
    --kj-bg-info-subtle:     #c4f8fb;
    --kj-bg-success:         #39ff14;
    --kj-bg-success-subtle:  #d4f8ce;
    --kj-bg-warning:         #ff8c00;
    --kj-bg-warning-subtle:  #ffe1c4;
    --kj-bg-danger:          #ff0040;
    --kj-bg-danger-subtle:   #ffd2dc;

    --kj-fg-default:    #0a0a0a;
    --kj-fg-muted:      #1a1a1a;
    --kj-fg-subtle:     #3a3a3a;
    --kj-fg-disabled:   #8a8000;

    --kj-fg-on-primary:   #ffee00;
    --kj-fg-on-accent:    #ffee00;
    --kj-fg-on-info:      #0a0a0a;
    --kj-fg-on-success:   #0a0a0a;
    --kj-fg-on-warning:   #0a0a0a;
    --kj-fg-on-danger:    #ffee00;
    --kj-fg-on-inverse:   #ffee00;

    /* fg.primary must meet AA on yellow body — pink darkened from #ff007f */
    --kj-fg-primary:    #8c003f;
    --kj-fg-accent:     #2a0066;
    --kj-fg-info:       #006670;
    --kj-fg-success:    #1a7a08;
    --kj-fg-warning:    #6b3a00;
    --kj-fg-danger:     #8c0024;

    --kj-border-default:   #0a0a0a;
    --kj-border-muted:     #d6c008;
    --kj-border-strong:    #0a0a0a;
    --kj-border-focus:     #ff007f;
    --kj-border-disabled:  #d6c008;
    --kj-border-primary:   #ff007f;
    --kj-border-danger:    #ff0040;

    --kj-shadow-sm:     2px 2px 0 #0a0a0a;
    --kj-shadow-md:     4px 4px 0 #0a0a0a;
    --kj-shadow-lg:     8px 8px 0 #0a0a0a;
    --kj-shadow-focus:  0 0 0 3px #ff007f;
```

- [ ] **Step 3: Verify build**

```bash
pnpm --filter docs build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add packages/themes/src/themes/cyberpunk.css
git commit -m "feat(themes): add new token slots to cyberpunk (additive, contrast-fixed fg.primary)"
```

---

## Task 7: Add new tokens to corporate theme

**Files:**
- Modify: `packages/themes/src/themes/corporate.css`

- [ ] **Step 1: Read current file**

- [ ] **Step 2: Append inside the `[data-theme="corporate"]` block**

```css
    /* ─── new token system (additive) ─── */

    --kj-bg-body:        #f8f9fa;
    --kj-bg-surface:     #ffffff;
    --kj-bg-field:       #f1f3f5;
    --kj-bg-elevated:    #ffffff;
    --kj-bg-overlay:     rgba(24, 26, 42, 0.55);
    --kj-bg-inverse:     #181a2a;
    --kj-bg-disabled:    #e9ecef;

    --kj-bg-primary:         #4b6bfb;
    --kj-bg-primary-subtle:  #e9edff;
    --kj-bg-accent:          #67cba0;
    --kj-bg-accent-subtle:   #ddf3e8;

    --kj-bg-info:            #4b6bfb;
    --kj-bg-info-subtle:     #e9edff;
    --kj-bg-success:         #2eb872;
    --kj-bg-success-subtle:  #d4f0e2;
    --kj-bg-warning:         #f5a623;
    --kj-bg-warning-subtle:  #fde9c8;
    --kj-bg-danger:          #e74c3c;
    --kj-bg-danger-subtle:   #fbd9d5;

    --kj-fg-default:    #181a2a;
    --kj-fg-muted:      #4a4f5e;
    --kj-fg-subtle:     #7a7f8e;
    --kj-fg-disabled:   #adb5bd;

    --kj-fg-on-primary:   #ffffff;
    --kj-fg-on-accent:    #181a2a;
    --kj-fg-on-info:      #ffffff;
    --kj-fg-on-success:   #ffffff;
    --kj-fg-on-warning:   #181a2a;
    --kj-fg-on-danger:    #ffffff;
    --kj-fg-on-inverse:   #ffffff;

    /* fg.primary must meet AA on #f8f9fa — darker than #4b6bfb */
    --kj-fg-primary:    #2d4ad7;
    --kj-fg-accent:     #1f7a4a;
    --kj-fg-info:       #2d4ad7;
    --kj-fg-success:    #1f7a4a;
    --kj-fg-warning:    #a06800;
    --kj-fg-danger:     #b32e20;

    --kj-border-default:   #e9ecef;
    --kj-border-muted:     #f1f3f5;
    --kj-border-strong:    #ced4da;
    --kj-border-focus:     #4b6bfb;
    --kj-border-disabled:  #e9ecef;
    --kj-border-primary:   #4b6bfb;
    --kj-border-danger:    #e74c3c;

    --kj-shadow-sm:     0 1px 2px rgba(24, 26, 42, 0.06);
    --kj-shadow-md:     0 4px 12px rgba(24, 26, 42, 0.10);
    --kj-shadow-lg:     0 16px 40px rgba(24, 26, 42, 0.15);
    --kj-shadow-focus:  0 0 0 3px rgba(75, 107, 251, 0.35);
```

- [ ] **Step 3: Verify build**

```bash
pnpm --filter docs build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add packages/themes/src/themes/corporate.css
git commit -m "feat(themes): add new token slots to corporate (additive, contrast-fixed fg.primary)"
```

---

## Task 8: Update themes.spec.ts to validate new tokens

**Files:**
- Modify: `packages/themes/src/themes.spec.ts`

- [ ] **Step 1: Read current spec**

Confirm the existing token list and structure.

- [ ] **Step 2: Add new tokens to the validation array**

The spec currently has an array of expected token names. Append the 47 new tokens (preserving old ones for now). Find the array literal (it contains entries like `'--kj-color-primary', '--kj-color-primary-content'`) and add this block alongside it:

```ts
  // ─── new token system ───
  // Neutral surfaces
  '--kj-bg-body', '--kj-bg-surface', '--kj-bg-field',
  '--kj-bg-elevated', '--kj-bg-overlay', '--kj-bg-inverse', '--kj-bg-disabled',
  // Intent surfaces
  '--kj-bg-primary', '--kj-bg-primary-subtle',
  '--kj-bg-accent', '--kj-bg-accent-subtle',
  '--kj-bg-info', '--kj-bg-info-subtle',
  '--kj-bg-success', '--kj-bg-success-subtle',
  '--kj-bg-warning', '--kj-bg-warning-subtle',
  '--kj-bg-danger', '--kj-bg-danger-subtle',
  // FG Class A
  '--kj-fg-default', '--kj-fg-muted', '--kj-fg-subtle', '--kj-fg-disabled',
  // FG Class B
  '--kj-fg-on-primary', '--kj-fg-on-accent',
  '--kj-fg-on-info', '--kj-fg-on-success', '--kj-fg-on-warning', '--kj-fg-on-danger',
  '--kj-fg-on-inverse',
  // FG Class C
  '--kj-fg-primary', '--kj-fg-accent',
  '--kj-fg-info', '--kj-fg-success', '--kj-fg-warning', '--kj-fg-danger',
  // Borders
  '--kj-border-default', '--kj-border-muted', '--kj-border-strong',
  '--kj-border-focus', '--kj-border-disabled',
  '--kj-border-primary', '--kj-border-danger',
  // Shadows
  '--kj-shadow-sm', '--kj-shadow-md', '--kj-shadow-lg', '--kj-shadow-focus',
```

- [ ] **Step 3: Run the test**

```bash
pnpm --filter @kouji-ui/themes test
```
Expected: PASS — every theme defines every token in the (now extended) list.

- [ ] **Step 4: Commit**

```bash
git add packages/themes/src/themes.spec.ts
git commit -m "test(themes): require new token slots alongside legacy tokens"
```

---

## Task 9: Update serialize-theme to know about new tokens

**Files:**
- Modify: `apps/docs/src/app/lib/theme/serialize-theme.ts`
- Check: `apps/docs/src/app/lib/theme/serialize-theme.spec.ts`

- [ ] **Step 1: Read current files**

```bash
cat apps/docs/src/app/lib/theme/serialize-theme.ts | head -60
```

- [ ] **Step 2: Append new tokens to the token list constant**

Find the array of token names in `serialize-theme.ts` (it currently contains `'--kj-color-base-100', '--kj-color-primary'`, etc.) and add the same 47 new tokens (same block as Task 8 step 2).

If the spec exists, update it to also include the new tokens.

- [ ] **Step 3: Run the spec**

```bash
pnpm --filter docs test -- serialize-theme.spec
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/app/lib/theme/serialize-theme.ts apps/docs/src/app/lib/theme/serialize-theme.spec.ts
git commit -m "feat(theme-generator): serialize/deserialize new token system"
```

---

## Task 10: Update theme-config-panel + theme-rail + sidebar + search to consume new tokens

**Files:**
- Modify: `apps/docs/src/app/components/theme-config-panel/panels/*.{ts,css}`
- Modify: `apps/docs/src/app/components/theme-rail/theme-rail.css`
- Modify: `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.css`
- Modify: `apps/docs/src/app/components/theme-config-panel/panels/shape-motion-panel.css`
- Modify: `apps/docs/src/app/pages/theme-generator/preview-tabs/search.ts`

- [ ] **Step 1: Inventory current usage**

```bash
grep -rn "var(--kj-color-" apps/docs/src/app/components/theme-rail apps/docs/src/app/components/theme-generator-sidebar apps/docs/src/app/components/theme-config-panel apps/docs/src/app/pages/theme-generator
```

- [ ] **Step 2: Replace using the migration map**

For each `var(--kj-color-*)` reference in these files, apply the migration map (`docs/superpowers/specs/token-migration-map.md`):

- `--kj-color-base-100` → `--kj-bg-body`
- `--kj-color-base-200` → `--kj-bg-surface`
- `--kj-color-base-300` (bg) → `--kj-bg-elevated` (popovers/menus) or `--kj-bg-field` (inputs)
- `--kj-color-base-300` (border) → `--kj-border-default` or `--kj-border-muted`
- `--kj-color-base-content` → `--kj-fg-default`
- `--kj-color-neutral` (text) → `--kj-fg-muted`
- `--kj-color-primary` (bg) → `--kj-bg-primary`
- `--kj-color-primary` (text) → `--kj-fg-primary`
- `--kj-color-primary-content` → `--kj-fg-on-primary`
- `--kj-color-accent` (bg) → `--kj-bg-accent`
- `--kj-color-accent` (text) → `--kj-fg-accent`
- `--kj-color-accent-content` → `--kj-fg-on-accent`
- `--kj-color-destructive` (bg) → `--kj-bg-danger`
- `--kj-color-destructive` (text) → `--kj-fg-danger`
- `--kj-color-destructive-content` → `--kj-fg-on-danger`
- `--kj-color-info/success/warning` (bg) → `--kj-bg-{intent}`
- `--kj-color-info/success/warning` (text) → `--kj-fg-{intent}`

In `theme-rail.css` and `theme-generator-sidebar.css`, the brand gradient currently uses `--kj-color-accent`. Keep it pointed at `--kj-bg-accent`.

In `search.ts`, the colors map (`Research: 'var(--kj-color-accent)'` etc.) is a runtime mapping for swatches. Replace with new token names.

In `shape-motion-panel.css`, the `border: 1px solid var(--kj-color-accent)` becomes `border: 1px solid var(--kj-border-primary)` (it visualizes the selected radius, which is brand-themed).

- [ ] **Step 3: Verify lint + tests + visual smoke**

```bash
pnpm --filter docs lint
pnpm --filter docs test -- theme-generator
```
Expected: lint clean, tests pass.

Then start the dev server and open the theme generator page (`/theme-generator`), switch through each theme, and confirm:
- The theme rail swatches still render
- The color sliders in the sidebar still bind to working tokens
- The preview tabs render without missing-variable visual artifacts

```bash
pnpm --filter docs dev
# open http://localhost:4200/theme-generator
```

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/app/components/theme-rail apps/docs/src/app/components/theme-generator-sidebar apps/docs/src/app/components/theme-config-panel apps/docs/src/app/pages/theme-generator
git commit -m "feat(theme-generator): migrate UI to new token system"
```

---

## Task 11: PARALLEL Agent A — Components quarter 1 (accordion → combobox)

> **Dispatch alongside Tasks 12, 13, 14, 15 in a single batched message.** Each agent operates on a disjoint set of files; they cannot conflict.

**Files (`packages/components/src/<name>/`):**
- accordion, alert, avatar, badge, breadcrumb, button, button-group,
  calendar, card, carousel, cascade-select, chat, checkbox, color-picker, combobox

**Agent task body:**

For every `.css` file under each component directory listed above, replace `var(--kj-color-*)` references with the new token names per the migration map (`docs/superpowers/specs/token-migration-map.md`).

Disambiguation rules (recap):
- `background`/`background-color`/`fill` → `--kj-bg-*`
- `color`/`stroke`/`caret-color`/`text-decoration-color` → `--kj-fg-*`
- `border-color`/`outline-color` → `--kj-border-*`
- `box-shadow` depth (not a line) → `--kj-shadow-*`

Status renames:
- `destructive` → `danger` (e.g. `--kj-color-destructive` → `--kj-bg-danger` or `--kj-fg-danger`)

For component-layer token overrides (`--kj-button-bg: var(--kj-color-primary)`), keep the component token name (`--kj-button-bg`) and only update the right-hand `var()` reference to the new token.

If a `box-shadow` declaration uses hardcoded rgba/colors with depth purpose, replace with the appropriate `--kj-shadow-*` token. If it's a single-pixel outline-style shadow, treat as a border equivalent.

If you encounter any ambiguous case (see "Edge cases" in the migration map), DO NOT GUESS — record it in your task report and leave the old token in place.

After all 15 components are migrated:

```bash
pnpm --filter @kouji-ui/components lint
pnpm --filter @kouji-ui/components test
pnpm --filter @kouji-ui/components build
```

All three must pass.

Commit:
```bash
git add packages/components/src/{accordion,alert,avatar,badge,breadcrumb,button,button-group,calendar,card,carousel,cascade-select,chat,checkbox,color-picker,combobox}
git commit -m "refactor(components): migrate quarter 1 (accordion→combobox) to new token system"
```

Report back the list of ambiguous cases (if any).

---

## Task 12: PARALLEL Agent B — Components quarter 2 (command-palette → input-group)

**Files:**
- command-palette, confirm-popup, date-picker, dialog, divider, drawer,
  dropdown-menu, empty-state, field, file-upload, form, icon, input, input-group

Same migration rules and verification commands as Task 11.

Commit:
```bash
git add packages/components/src/{command-palette,confirm-popup,date-picker,dialog,divider,drawer,dropdown-menu,empty-state,field,file-upload,form,icon,input,input-group}
git commit -m "refactor(components): migrate quarter 2 (command-palette→input-group) to new token system"
```

---

## Task 13: PARALLEL Agent C — Components quarter 3 (input-mask → select)

**Files:**
- input-mask, input-otp, kbd, link, list, menubar, number-input,
  overlay-badge, pagination, password-input, popover, progress-bar, radio, select

Same migration rules and verification.

Commit:
```bash
git add packages/components/src/{input-mask,input-otp,kbd,link,list,menubar,number-input,overlay-badge,pagination,password-input,popover,progress-bar,radio,select}
git commit -m "refactor(components): migrate quarter 3 (input-mask→select) to new token system"
```

---

## Task 14: PARALLEL Agent D — Components quarter 4 + packages/core

**Files:**
- `packages/components/src/`: skeleton, slider, speed-dial, spinner, stepper, tabs, tag, textarea, time-picker, toast, toggle, tooltip, tree-select, typography
- All `.css` files under `packages/core/src/**`

Same migration rules. After migrating, also run:

```bash
pnpm --filter @kouji-ui/core lint
pnpm --filter @kouji-ui/core test
pnpm --filter @kouji-ui/core build
```

Commit:
```bash
git add packages/components/src/{skeleton,slider,speed-dial,spinner,stepper,tabs,tag,textarea,time-picker,toast,toggle,tooltip,tree-select,typography} packages/core
git commit -m "refactor(components,core): migrate quarter 4 + core to new token system"
```

---

## Task 15: PARALLEL Agent E — apps/docs CSS (excluding theme-generator)

**Files:** every `.css`/`.html`/`.ts` under `apps/docs/src/` that references `--kj-color-*`, **EXCLUDING** files already migrated in Task 10 (theme-rail, theme-generator-sidebar, theme-config-panel/panels, pages/theme-generator, lib/theme).

Find candidates:
```bash
grep -rln "var(--kj-color-" apps/docs/src \
  --exclude-dir=theme-rail \
  --exclude-dir=theme-generator-sidebar \
  --exclude-dir=theme-config-panel \
  --exclude-dir=theme-generator \
  --exclude-dir=theme
```

Apply the same migration rules. Pay special attention to:
- `apps/docs/src/app/pages/home/home.css` — has the `.hero-tag` `color: var(--kj-color-primary)` (should become `--kj-fg-primary`) and `.hero-desc` `color: var(--kj-color-neutral)` (should become `--kj-fg-muted`). These are the violations the a11y baseline flagged.
- `apps/docs/src/app/components/navbar/navbar.css` — `.kj-navbar-version` color (brand-as-text → `--kj-fg-primary`); background (`--kj-color-base-200` → `--kj-bg-surface`).
- `apps/docs/src/styles.css` — global page styles.

After migration:
```bash
pnpm --filter docs lint
pnpm --filter docs build
```

Commit:
```bash
git add apps/docs/src
git commit -m "refactor(docs): migrate app CSS to new token system"
```

---

## Task 16: Remove legacy tokens from themes

> **Sequential.** Only run after all 5 parallel agents (Tasks 11–15) report DONE and all their commits land on the branch.

**Files:**
- Modify: `packages/themes/src/themes/kouji.css`
- Modify: `packages/themes/src/themes/dark.css`
- Modify: `packages/themes/src/themes/light.css`
- Modify: `packages/themes/src/themes/retro.css`
- Modify: `packages/themes/src/themes/cyberpunk.css`
- Modify: `packages/themes/src/themes/corporate.css`
- Modify: `packages/themes/src/themes.spec.ts`

- [ ] **Step 1: Confirm no remaining usages of old tokens**

```bash
grep -rln "var(--kj-color-" packages apps 2>/dev/null
```
Expected: NO output. If any file still references `--kj-color-*`, fix that file before continuing (it was missed in Phase 2).

- [ ] **Step 2: Strip old token declarations from each theme**

In each of the 6 theme CSS files, delete every line declaring an old token:
- `--kj-color-base-100`, `--kj-color-base-200`, `--kj-color-base-300`, `--kj-color-base-content`
- `--kj-color-primary`, `--kj-color-primary-content`, `--kj-color-primary-hover`
- `--kj-color-secondary`, `--kj-color-secondary-content`
- `--kj-color-accent`, `--kj-color-accent-content`
- `--kj-color-neutral`, `--kj-color-neutral-content`
- `--kj-color-info`, `--kj-color-info-content`
- `--kj-color-success`, `--kj-color-success-content`
- `--kj-color-warning`, `--kj-color-warning-content`
- `--kj-color-destructive`, `--kj-color-destructive-content`, `--kj-color-destructive-hover`

Keep the new `--kj-bg-*` / `--kj-fg-*` / `--kj-border-*` / `--kj-shadow-*` declarations and all the non-color tokens (radius, type, spacing, motion).

- [ ] **Step 3: Strip old tokens from themes.spec.ts**

Remove every old-token string literal from the expected-tokens array. Keep only the 47 new tokens.

- [ ] **Step 4: Run tests + build**

```bash
pnpm --filter @kouji-ui/themes test
pnpm --filter docs build
pnpm lint
```
All must pass.

- [ ] **Step 5: Commit**

```bash
git add packages/themes
git commit -m "refactor(themes): remove legacy --kj-color-* tokens after migration"
```

---

## Task 17: Verify a11y improvement, push, open PR

**Files:**
- Verify: `reports/a11y/` (regenerated)

- [ ] **Step 1: Run the a11y pipeline against the new tokens**

```bash
pnpm a11y
```
Expected: 36 reports + `_summary.json`. Some Lighthouse misses tolerated (≤5/36).

- [ ] **Step 2: Diff the summary against the baseline on main**

```bash
git diff main -- reports/a11y/_summary.json | head -80
```
Expected: violation counts have dropped meaningfully (target: contrast violations ≥50% reduction).

- [ ] **Step 3: Commit the new baseline**

```bash
git add reports/a11y/
git commit -m "chore(a11y): record post-token-migration baseline"
```

- [ ] **Step 4: Add changeset**

```bash
pnpm changeset add --empty
git add .changeset/
git commit -m "chore(tokens): add empty changeset for theme/component-only changes"
```

(`--empty` is correct here: no published-package API changes — only internal CSS and styles.)

- [ ] **Step 5: Push the branch**

```bash
git push -u origin feat/token-system 2>&1 | tail -10
```

If the pre-push hook fails on lint or changeset, fix and re-push.

- [ ] **Step 6: Open PR via the URL printed by `git push`**

Title: `feat(tokens): replace --kj-color-* with --kj-bg-*/-fg-*/-border-*/-shadow-* taxonomy`

Body (paste):

```
## Summary
- Replaces ~11-token semantic slot system with a 47-token taxonomy:
  - 7 neutral surfaces (body, surface, field, elevated, overlay, inverse, disabled)
  - 12 intent surfaces (primary + accent + 4 statuses × 2 variants)
  - 17 foregrounds split into three classes (independent, paired, intent-as-text)
  - 7 borders + 4 shadows promoted to their own axes
- Fixes the structural causes of the 22 color-contrast violations/theme observed
  in the a11y baseline (see reports/a11y/_summary.json diff).

Spec: docs/superpowers/specs/2026-05-13-token-system-design.md
Plan: docs/superpowers/plans/2026-05-13-token-system.md

## Test plan
- [ ] pnpm install succeeds
- [ ] pnpm --filter @kouji-ui/themes test passes (themes.spec.ts validates new token set)
- [ ] pnpm --filter @kouji-ui/components test, lint, build all pass
- [ ] pnpm --filter @kouji-ui/core test, lint, build all pass
- [ ] pnpm --filter docs test, lint, build all pass
- [ ] pnpm a11y produces 36 reports; _summary.json shows reduced contrast violations vs main
- [ ] Theme generator at /theme-generator renders for all 6 themes
```

---

## Verification (final)

After Task 17 lands:

- [ ] All workspace tests pass (`pnpm test`)
- [ ] All workspace builds pass (`pnpm build`)
- [ ] All workspace lint passes (`pnpm lint`)
- [ ] `pnpm a11y` reports ≤10 contrast violations per theme (down from ~22)
- [ ] Theme generator at `/theme-generator` works for all 6 themes
- [ ] No `var(--kj-color-` remaining in the codebase: `grep -rn "var(--kj-color-" packages apps` returns empty
