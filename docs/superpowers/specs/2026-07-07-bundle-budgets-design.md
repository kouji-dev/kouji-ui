# Per-Component Bundle Budgets in CI — Design Spec

**Date:** 2026-07-07
**Status:** Approved
**Roadmap:** [v0.2 — Per-component bundle budgets](../../../apps/docs/src/app/pages/roadmap/items/v0.2-bundle-budget.md)

---

## Purpose

Lock a maximum **gzipped** size for each component so that an accidental
regression — a stray side-effect import, an eager DI provider, a fat transitive
dependency — fails CI instead of silently shipping to users. Two guarantees:

1. **Per-component budgets** — importing a single component (tree-shaken) stays
   under a committed limit. A broken tree-shake balloons the number far past the
   budget, so the budget check *is* the tree-shaking regression check.
2. **Side-effect metadata guard** — every publishable package keeps its
   `sideEffects` flag correct (`false` for JS packages, CSS-only allowlist for
   themes), so bundlers can drop unused exports.

Non-goals (YAGNI): historical trend graphs, PR size-diff comments, per-browser
numbers, budgets on every one of ~120 exports. We budget a curated,
representative flagship set per package plus a whole-package ceiling, and the
config is the trivially-extensible place to add more.

---

## Tool choice: `size-limit` + `@size-limit/preset-small-lib`

**Chosen:** [`size-limit`](https://github.com/ai/size-limit) with the
`preset-small-lib` (esbuild bundler + gzip calculator).

**Why over a custom gzipped-measure script:**

- A naive "gzip the whole FESM" script measures the *entire* barrel, not a
  single component — it cannot express a per-component budget, which is the
  whole point of the roadmap item.
- To measure one component we must bundle a `{ KjX }` named import and
  tree-shake the rest. That is exactly what `size-limit`'s `import` entry does
  (esbuild bundles the named import, drops the rest, gzips the result). A custom
  script would re-implement esbuild bundling + tree-shaking + gzip + a
  CI-friendly diff/exit-code table — i.e. re-implement `size-limit`.
- `size-limit` gives per-entry `limit` thresholds, a clean table, and a non-zero
  exit on regression out of the box.

**Bundler config:** each entry marks Angular + rxjs (framework peers the host
app provides) as `ignore` (external). Third-party runtime deps (`@tanstack/*`,
`lucide-static`) are intentionally *not* ignored — if a component accidentally
pulls one in, that is a regression worth catching. Budgets therefore measure
our shipped code plus its real bundled dependencies. See *Where budgets are
declared* below for the package-name resolution subtlety that makes tree-shaking
actually happen.

---

## Where budgets are declared

Single source of truth: `tools/size/budgets.mjs` (repo root tooling, not inside
any publishable package). One row per budgeted component:

```js
{ name: 'core: KjButton', pkg: '@kouji-ui/core', symbol: 'KjButton', limit: '2 kB' }
```

- One row per flagship component per package (curated representative set; the
  file is the trivially-extensible place to add more).
- `limit` sits ~30% above the current measured gzipped size, so normal churn
  passes and a real regression fails.

### Why a generator, not a hand-written `.size-limit.json`

**Load-bearing finding:** esbuild only honours a package's `sideEffects: false`
(and therefore tree-shakes) when the module is resolved **by package name**.
Pointing `size-limit` `path` straight at `dist/kj-*/fesm2022/*.mjs` (a file path)
skips that resolution and pulls the **whole barrel** — every entry measured the
same ~500 kB, i.e. no tree-shaking. Verified empirically:

| import form                                   | KjButton gzipped |
| --------------------------------------------- | ---------------- |
| `{ KjButton } from '@kouji-ui/core'` (name)   | **1.49 kB**      |
| `from './dist/…/kouji-ui-core.mjs'` (file)    | 97 kB            |

So `tools/size/prepare.mjs` emits, for each budget, a tiny entry file
`export { KjButton } from '@kouji-ui/core';` and a derived `.size-limit.json`
pointing at those entries. `pnpm size` = `prepare.mjs && size-limit`. The
generated `tools/size/.gen/` dir is git-ignored (rebuilt each run, and in CI
after the Build step). Budgets thus measure the real published artifact
(`dist/kj-*`, resolved via the workspace symlink) with correct tree-shaking.

---

## How CI fails on regression

`.github/workflows/ci.yml` gains two steps after the existing **Build** step
(reusing the freshly built `dist/`):

1. **Tree-shaking / side-effects guard** — `pnpm sideeffects:check` runs
   `scripts/check-sideeffects.mjs`, asserting each publishable package's
   `package.json` still declares the expected `sideEffects` value. Missing or
   loosened metadata → non-zero exit.
2. **Bundle budgets** — `pnpm size` runs `size-limit`. Any entry over its
   `limit` → non-zero exit → red CI.

Both run on every push/PR to `main`. No new job (fresh runners rebuild; a step
reuses the build already produced), keeping cost minimal.

---

## Files touched

- `package.json` (root, **private** — not published): add `size-limit` +
  `@size-limit/preset-small-lib` devDeps and `size` / `size:why` /
  `sideeffects:check` scripts.
- `tools/size/budgets.mjs`: the budgets (source of truth) + ignore list.
- `tools/size/prepare.mjs`: generates per-component entries + size-limit config.
- `scripts/check-sideeffects.mjs`: the metadata guard.
- `.gitignore`: ignore `tools/size/.gen/`.
- `.github/workflows/ci.yml`: two new steps after Build.

No publishable `packages/*/package.json` change is required — `core` and
`components` already ship `sideEffects: false` and `themes` ships the CSS
allowlist. Therefore **no package changeset is needed**; the change is
CI/tooling only.
