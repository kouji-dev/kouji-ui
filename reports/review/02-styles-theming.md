# Styles & Theming Review

> **Adversarially verified 2026-09-15.** Findings below marked *(severity corrected during verification)* were re-checked against the source; corrections are inline. Refuted findings are preserved in **Refuted during verification** at the end of the findings list, not deleted.

Aspect: **02-styles-theming** · Scope: `packages/themes/src/**`, `packages/core/src/**/*.css`,
`packages/components/src/**/*.css` + inline component styles, `apps/docs/src/styles.css`,
`angular.json` style wiring. Read-only static analysis (no builds, no suites).
Contrast ratios below were computed from the theme sources with a WCAG 2.x relative-luminance
implementation (oklch → sRGB → luminance); the script lives only in the session scratchpad.

---

## Verdict

The token *architecture* is genuinely good — a three-tier `--kj-base-*` → semantic → `--kj-<component>-*`
ladder, a real `@layer kj.reset, kj.base, kj.shared, kj.component` statement, a postcss-driven
contract test that every theme must satisfy, a density system built on two inherited `@property`
scalars with `round()` snapping, and `@scope` used correctly in `kouji.css` to stop a theme override
at a nested `[data-theme]` boundary. `button.css` in particular is one of the most carefully reasoned
component stylesheets in the repo. But the discipline is not enforced anywhere it matters. Ten
component stylesheets ship **outside** the layer system and therefore outrank every layered rule
including theme overrides; four undeclared layers (`kj.prose`, `kj.tone`, `kj.truncate`, `kj.tokens`)
are appended *after* `kj.component` and win by accident of import order; a whole second, undefined
token vocabulary (`--kj-radius-sm/md/lg`, `--kj-font-size-*`, `--kj-line-height-*`, `--kj-bg-subtle`,
`--kj-danger`, `--kj-focus-ring-*`, `--kj-space-2xs`) is consumed by prose, sheet, action-sheet,
file-upload, editor, time-picker and calendar and silently falls through to hard-coded literals, so
those surfaces are simply not themed. On the shipping side the published `@kouji-ui/components`
tarball contains **no CSS at all** (no `assets` in `ng-package.json`, no CSS `exports` in
`package.json`) and the overlay primitive stylesheet is only reachable via a relative cross-package
`@import "../../../core/src/..."` that cannot resolve for any consumer. On the a11y side,
`--kj-border-default` — the border of every text input and unchecked checkbox — fails WCAG 1.4.11's
3:1 in **all 15 themes** (1.12:1 in `kouji`, 1.14:1 in `orrery-light`), and every ratio comment in
`orrery-light.css` was measured against white instead of that theme's own `#dedede` body. No theme
declares `color-scheme`, so native controls, scrollbars and autofill stay light in the six dark
themes. Density scales button and input only: 2 of 69 component stylesheets read the `--kj-ctl-h-*`
ladder and 36 of them hard-code 99 literal `font-size` values that `--kj-type-scale` cannot touch.

**Grade: C**

*Post-verification: F-1 critical → high, F-2 high → medium, F-3 high → low, F-4 high → medium, F-5 high → medium. No critical findings remain in this dimension. Corrections are inline in each finding.*

---

## What works

- **Layer statement + reset strategy is correct.** `packages/themes/src/base.css:7` declares the full
  order once, and `packages/themes/src/base.css:21-25` puts theme-scoped resets in the *lowest* layer so
  a nested `[data-theme]` starts clean. `apps/docs/src/styles.css:17-27` correctly re-opens `kj.reset`
  for the universal `* { margin: 0 }` so the app reset cannot wipe component padding. That is the
  right instinct, well documented.
- **Density mechanism is the right design.** Two inherited scalars instead of per-component selectors
  (`packages/themes/src/density.css:6-11`), `@property` registration only for the values JS must read
  back (`density.css:30-38`), and the deliberate *non*-registration of `--kj-space-*`/`--kj-text-*` to
  avoid turning a consumer override into a silently-discarded invalid value (`density.css:26-29`).
  `density.spec.ts:55-64` locks that in.
- **`@scope` for nested themes.** `packages/themes/src/themes/kouji.css:127` —
  `@scope ([data-theme="kouji"]) to ([data-theme]:not([data-theme="kouji"]))` — is exactly the right
  primitive for micro-frontend / preview-stage subtree theming, and the comment explains why.
- **Component-knob discipline in `button.css`.** `packages/components/src/button/button.css:10-34`
  explains, correctly, why knobs must be read as `var(name, default)` at the use site rather than
  declared on `.kj-button` (an element-level custom property beats an inherited one). That is a
  non-obvious CSS fact and the code acts on it.
- **A machine-checked theme contract.** `packages/themes/src/themes.spec.ts:10-45` enumerates 40+
  required shared tokens and asserts every discovered theme defines them; all 15 themes pass, and all
  15 also define the full `--kj-chart-1..6` palette.
- **Chart palette + `--kj-motion-*` primitives** are consistently defined base → semantic → consumer,
  with `packages/core/src/chart/chart-tokens.ts:19` reading `--kj-chart-N` with per-slot fallback.

---

## Findings

### F-1 Overlay primitive CSS and the documented overlay aggregator ship in no tarball — service-launched overlays lose their backdrop; sheets lose their skin

**Severity:** high *(corrected during verification: was critical)* · **Confidence:** high
**Files:** `packages/components/ng-package.json`, `packages/components/package.json`,
`packages/components/src/overlay/overlay.css:20-24`, `packages/core/ng-package.json`,
`packages/core/package.json`, `packages/core/src/primitives/overlay/overlay.css:35-41`, `angular.json:105`

Two stylesheets are unreachable from an installed package.

`packages/components/ng-package.json` has no `assets` block:

```json
{
  "$schema": "../../node_modules/ng-packagr/ng-package.schema.json",
  "dest": "../../dist/kj-components",
  "lib": { "entryFile": "src/public-api.ts" },
  "allowedNonPeerDependencies": ["@tanstack/virtual-core", "marked"]
}
```

so the aggregator `packages/components/src/overlay/overlay.css` — whose own header (lines 20-22) instructs consumers to "Register this file once in your build configuration" — is never emitted to `dist/kj-components`, and `packages/components/package.json` declares no CSS `exports` entry. `packages/core/ng-package.json` copies only `typography/prose.css`, `icon/icon.css` and `motion/motion.css`, matching the three entries in `packages/core/package.json`'s `exports`, so `packages/core/src/primitives/overlay/overlay.css` and the `packages/core/src/styles.css` aggregate ship nowhere either. The aggregator's cross-package `@import "../../../core/src/primitives/overlay/overlay.css"` (`overlay.css:24`) is a relative path out of the package and would break even if the file *were* copied. Nothing fails in-repo because `angular.json:105` registers the source paths directly.

**Verification corrections — scope it correctly. Two of the original claims are refuted.**

- **REFUTED: "no component CSS from `@kouji-ui/components` is installable at all."** Every themed overlay stylesheet is attached via `styleUrl` on its wrapper component (`dialog.ts:77`, `tooltip.ts:97`, `popover.ts:93`, `dropdown-menu.ts:123`, `drawer.ts:80`, `toast.ts:73/103`, `confirm-popup.ts` ×7, `sheet.ts:81`, `action-sheet.ts:128`), all with `ViewEncapsulation.None`. ng-packagr inlines `styleUrl` content into the FESM bundle, so a consumer importing `<kj-dialog>` gets `dialog.css` injected at runtime with **no build config at all**.
- **REFUTED: "every dialog, drawer, popover, tooltip and toast would render unpositioned with no backdrop."** False on all five. `dialog.css:2-10` carries `position:fixed; inset:0` **plus its own scrim** and `z-index:1000`; `drawer.css:9,16,50-58` carries `position:fixed`, `z-index:1000` and a `[data-kj-drawer-container]::before` scrim; `toast.css:4-21` carries `position:fixed` + `z-index`. Popover/tooltip/dropdown panels are positioned by JavaScript, not CSS (`strategies/position/anchored-to.ts:98`, `corner.ts:13`) — `popover.css:16` even documents it. A missing `.kj-overlay-container` rule leaves a `position:static`, zero-height `<div>` at the end of `<body>`, which cannot mis-position or clip `position:fixed` descendants.

**What is actually broken (the real, narrower defect):**

1. **Backdrops on every service-launched overlay.** `.kj-backdrop, .kj-overlay-backdrop { position:absolute; inset:0; background: var(--kj-backdrop-bg, rgb(0 0 0/.5)); pointer-events:auto }` exists in exactly one file repo-wide (`core/src/primitives/overlay/overlay.css:35-41`) and ships nowhere. `solidBackdrop()` / `blurredBackdrop()` mount `<kj-backdrop class="kj-backdrop">` (`backdrop.ts:12,26`) for `KjDialogService` (`dialog.service.ts:30`), `KjDrawerService` (`drawer.service.ts:63`), `KjSheetService` (`sheet.service.ts:78`) and the command palette (`command-palette-dialog.ts:56`). Unstyled it is an inline custom element with a zero box: **no dim, and `closeOnClick: true` has no hit area to click.** (`<kj-dialog>`/`<kj-drawer>` used as components are unaffected — they carry their own scrims.)
2. **Service-launched sheets and action sheets render unstyled.** `packages/components/CHANGELOG.md:405` states the sheet/action-sheet wrapper components are "docs-only shell wrapper components, which a real consumer never instantiates" — so for `KjSheetService` / `KjActionSheetService` the unshipped aggregator is the **only** CSS route, meaning that changelog entry's claimed fix does not reach any consumer.
3. **Lost isolation and tokens:** `.kj-overlay-container` / `.kj-overlay-wrapper` `pointer-events` isolation (clickable app content behind a non-modal overlay) and the `--kj-overlay-z-index` override, plus a documented public CSS entry point that exists in neither tarball.

**Fix:** add `assets` entries for `src/primitives/overlay/overlay.css` (core) and `src/overlay/overlay.css` (components); export them as `"./primitives/overlay/overlay.css"` and `"./overlay/overlay.css"`; replace the cross-package relative `@import` (`overlay.css:24`) with the package specifier. Add a packaging smoke test asserting the built `dist/kj-core` and `dist/kj-components` contain the expected `.css` files — `angular.json` registering source paths is what hides this whole class of bug.
**Effort:** M

---

### F-2 Ten globally-injected component style sources skip `@layer kj.component`, breaking the documented override contract

**Severity:** medium *(corrected during verification: was high)* · **Confidence:** high
**Files:** `packages/components/src/calendar/calendar.css`,
`packages/components/src/command-palette/command-palette.css`,
`packages/components/src/date-picker/date-picker.css`,
`packages/components/src/date-range-presets/date-range-presets.css`,
`packages/components/src/datetime-picker/datetime-picker.css`,
`packages/components/src/input-mask/input-mask.css`,
`packages/components/src/table/table-filters/filters.css`, `packages/core/src/icon/icon.css:13`,
`packages/components/src/table/table-pagination.ts:63`, `packages/components/src/table/table-toolbar.ts:154`

Most component stylesheets open with `@layer kj.component { … }`. Ten globally-injected sources do not — eight CSS files plus two inline `styles: []` blocks, all on `ViewEncapsulation.None` components and therefore part of the document cascade:

```css
/* packages/core/src/icon/icon.css:13 */
.kj-icon {
  display: inline-block;
```

`grep -c '@layer'` returns 0 for all ten. The canonical layer order is declared once at `packages/themes/src/base.css:7` (`@layer kj.reset, kj.base, kj.shared, kj.component;`) and nothing in the build wraps component CSS, so unlayered declarations sit **above every named layer** — including the `@layer kj.component { @scope (…) { … } }` theme-override hatch at `packages/themes/src/themes/kouji.css:125-134`. No lint rule or spec enforces the convention.

**Verification corrections — scope and headline evidence were both wrong.**

- **REFUTED: the `!important` cluster is not a layer symptom.** The 11 `!important` declarations at `packages/components/src/table/table.css:182-206` exist for the reason the file's own comment (lines 177-181) gives: they override the editor/input components' **inline** `style="display: contents"` host bindings (`input.ts:122`, `select.ts:165`, `number-input.ts:157`). Inline style-attribute declarations outrank every author stylesheet declaration regardless of cascade layer; `@layer` orders author-origin stylesheets only. Wrapping `table.css` in `@layer kj.component` would remove exactly zero of those `!important`s. Citing them as "the symptom" is a cascade error.
- **REMOVED from scope: `table.css`, `editor.css`, `table-status-bar.ts`.** All three are deliberately view-encapsulated — `table.ts:580` and `table-status-bar.ts:54` set `ViewEncapsulation.Emulated` explicitly, `editor.ts` defaults to it. They are `:host`-scoped, `[_ngcontent-*]`-private styles that opted out of the global-cascade contract on purpose; `docs/superpowers/specs/2026-05-05-components-package-expansion-design.md:79` ties the two together ("`ViewEncapsulation.None` — so `[data-theme="X"] .kj-<comp>` overrides work and the `@layer kj.component` cascade applies"). Adding a layer there is not the fix. This also explains why the original finding's two counts disagreed ("63 of 73", then "10 of 69").
- **OVERSTATED: no shipped theme is actually blocked today.** Grepping all of `packages/themes/src/`, no theme file targets `.kj-table`, `.kj-calendar`, `.kj-icon`, `.kj-editor`, `.kj-date-picker`, `.kj-datetime-picker`, `.kj-input-mask`, `.kj-command-palette`, `.kj-date-range-presets` or `.kj-text-filter` with any rule. The only hits are token declarations on the theme root (`--kj-icon-size-*` at `base.css:179-183`, `--kj-table-row-height` at `density.css:4`), and `icon.css` declares no `--kj-icon-size-*` at all (it hardcodes `width: 1em; height: 1em`). The `kouji.css` `@scope` hatch only ever targets `.kj-button`, which *is* layered.

**Why it matters:** the breakage is **latent, for a downstream consumer overriding structural CSS**, not live in this repo. It is a consistency gap in the public override contract that a consumer discovers only after their override silently does nothing.

**Fix:** wrap the eight sheets and two inline blocks in `@layer kj.component { … }`. Add the guard the original finding missed: there is no lint rule or spec asserting that every `ViewEncapsulation.None` component's stylesheet opens with `@layer kj.component`. Adding that check is what prevents the next drift.
**Effort:** S

---

### F-3 `kj.prose` / `kj.tone` / `kj.truncate` are not named in the canonical `@layer` statement, so their position depends on stylesheet registration order

**Severity:** low *(corrected during verification: was high)* · **Confidence:** high
**Files:** `packages/core/src/typography/prose.css:31`, `:257`, `:291`, `packages/themes/src/base.css:7`

`packages/core/src/typography/prose.css` opens `kj.prose` (`:31`), `kj.tone` (`:257`) and `kj.truncate` (`:291`); `packages/themes/src/base.css:7` declares only `@layer kj.reset, kj.base, kj.shared, kj.component;`. An undeclared layer is appended at first encounter.

**Verification corrections — the mechanical fact holds but nearly every consequence was wrong.**

- **The harm is inverted.** `kj.tone` styles `[data-tone]` and `kj.truncate` styles `[data-truncate]` — opt-in attributes written by the consumer via `kjMuted` / `kjTruncate` — which **must** sort above `kj.component` to work at all. With the shipped registration order (`angular.json:103-104` loads `themes/index.css` before `core/styles.css`) the three land above `kj.component`, which is the **correct and intended** order. `docs/component-analyses/data-display/typography.md:153` documents shipping `kj-prose` as a deliberate separate CSS layer.
- **REFUTED: "beats every component rule inside a prose container."** Prose targets only bare element selectors under `.kj-prose`; class-based component CSS (`.kj-button`, `.kj-card`) is never matched. The only real overlap in-repo is `.kj-prose a { text-decoration: underline }` defeating `.kj-link[data-underline="none"]`, which contradicts the doc note at `packages/core/src/link/link.ts:55` and is worth a separate one-line note. `.kj-prose` is used in exactly two non-example places (`typography.playground.ts`, `apps/docs/src/app/pages/roadmap/roadmap.html:2`).
- **REFUTED: the `docs-themes.css` evidence, twice.** `packages/core/src/styles/docs-themes.css` is never loaded as a stylesheet — `angular.json:103-106` registers only `themes/index.css`, `core/styles.css`, `components/overlay/overlay.css` and `apps/docs/src/styles.css`, and no `index.html` links it; `apps/docs/src/lib/examples.ts:39,130` merely reads it from disk to render a code tab. And even if it were loaded, `@layer kj.tokens, kj.theme;` names a set **disjoint** from `base.css`'s, and CSS layer statements are additive and merge deterministically — a conflict requires contradictory ordering of *shared* names, which does not exist here.
- **Out of scope of the change under review.** `git diff main...HEAD` is empty; `prose.css` last changed in `3279ee23` (2026-05-15, 174 commits back), `docs-themes.css` in `cb592bdd`, `base.css` in `63cda2ed`.

**What survives:** a robustness nit. Because the names are undeclared, a consumer who registers `@kouji-ui/core/styles.css` **before** `@kouji-ui/themes/index.css` gets `kj.prose`/`kj.tone`/`kj.truncate` *first* and silently loses `kjTruncate` clamping and `kjMuted` colour against component rules.

**Fix:** extend `base.css:7` to `@layer kj.reset, kj.base, kj.shared, kj.component, kj.prose, kj.tone, kj.truncate;`. Assert the statement's exact text in `themes.spec.ts` the way `density.spec.ts:37` already does.
**Effort:** S

---

### F-4 `--kj-border-default` fails WCAG 1.4.11 (3:1) in 13 of 15 themes — it is the sole boundary of every idle input and unchecked checkbox

**Severity:** medium *(corrected during verification: was high)* · **Confidence:** high
**Files:** 13 of 15 in `packages/themes/src/themes/`, `packages/components/src/input/input.css:11`,
`packages/components/src/checkbox/checkbox.css:24`

```css
/* packages/components/src/input/input.css:11 */
    --kj-input-border-color:     var(--kj-border-default);
/* packages/components/src/checkbox/checkbox.css:24 */
    --kj-checkbox-border:      var(--kj-border-default);
```

Computed `--kj-border-default` vs `--kj-bg-body` (3:1 required for UI-component boundaries) — independently reproduced during verification to two decimals:

| theme | ratio | theme | ratio |
|---|---|---|---|
| kouji | **1.12** | retro | **1.33** |
| orrery-light | **1.14** | nord | **1.45** |
| light | **1.25** | dune | **1.46** |
| corporate | **1.26** | dark | **1.53** |
| sakura | **1.26** | terminal | **1.54** |
| mint | **1.29** | orrery | **1.56** |
| | | forest | **1.63** |

Every mitigation that would have refuted this is absent, and verification **strengthened** the finding on two points:

- **`--kj-border-strong` is not a usable fallback** — it also misses 3:1 in 12 of 15 (corporate 1.83, kouji 1.36, orrery-light 1.44, light 1.74, retro 1.92, sakura 2.03, mint 2.12, dune 2.43, terminal 2.45, forest 2.68, nord 1.69, orrery 1.94); only dark (4.41), bauhaus and cyberpunk clear it.
- **No fill cue rescues identification** — `--kj-bg-field` vs `--kj-bg-body` is only 1.06–1.45 in every theme, and the unchecked `.kj-checkbox-box` is `bg-body` + a 1px `border-default`, so on a body-background page the border is genuinely its only identifying mark. There is no `forced-colors` or `prefers-contrast` CSS anywhere in `packages/`, and `input.css`/`checkbox.css` have no hover border upgrade.

**Verification corrections.**

- **REFUTED: "all 15 themes."** The original finding's own 13-theme evidence list contradicted its headline. **bauhaus** (`#1a1a1a` on `#f5efe1`) = **15.18:1** and **cyberpunk** (`#0a0a0a` on `#ffee00`) = **16.48:1** both pass comfortably and must not be counted.
- **REFUTED: the `--kj-fg-disabled` bullet is not a violation at all.** WCAG 1.4.3 and 1.4.11 both exempt inactive user-interface components, and the repo documents the intent at `orrery.css:61` and `orrery-light.css:60` ("3.0:1 — non-text / disabled only").
- **Split out — the finding bundled four distinct success criteria under one id.** Move these to separate, lower-severity findings: retro `--kj-fg-on-danger` `#ede5d0` on `--kj-bg-danger` `#c4625d` = **3.18** (1.4.3); forest `--kj-fg-danger` **4.33** on `bg-body` / **3.99** on `danger-subtle`; sakura `--kj-fg-success` **4.03** on `success-subtle`; retro `--kj-border-focus` **2.27** on `bg-body` — and note this last one affects `checkbox.css:63` **only**, since `input.css:52` focuses with `outline: 2px solid var(--kj-bg-primary)`, not `--kj-border-focus`.
- **Not a regression from the change under review** — `HEAD` and `main` are the same SHA, `git diff main...HEAD` is empty, and the theme/input/checkbox files were last touched in already-merged commits (`01f65ef1`, `b1729083`, `be6386db`).
- **Reconciliation sentence corrected:** `reports/a11y/*/*.json` holds 13 `scrollable-region-focusable` entries all at `"impact": "serious"`, so "0 serious" is wrong. The underlying point stands — axe-core does not evaluate 1.4.11 component boundaries, and the scan covered six docs routes, none rendering a bare checkbox or an idle input on `bg-body`.

**Fix:** darken/lighten `--kj-border-default` per theme until ≥ 3:1 against both `bg-body` and `bg-field` (or introduce `--kj-border-interactive` for control boundaries and keep `--kj-border-default` decorative). Then make it machine-enforced: `apps/docs/src/app/lib/theme/theme-a11y-report.ts` already models 1.4.11 (`EdgeRequirement 'non-text'`, `requiredMin 3`) but its `NON_TEXT_PAIRS` covers only `bg-elevated × bg-body/bg-surface` — add `border-default × bg-body` and `border-default × bg-field` there, plus a contrast assertion in `packages/themes/src/themes.spec.ts`, which today checks token presence only.
**Effort:** M

---

### F-5 `orrery-light` is the only light theme whose `fg-subtle` and all six class-C intent tokens fall below AA on its own `#dedede` body

**Severity:** medium *(corrected during verification: was high)* · **Confidence:** high
**Files:** `packages/themes/src/themes/orrery-light.css:30`, `:56-60`, `:73`, `apps/docs/src/app/services/theme.service.ts:7-16`

```css
/* packages/themes/src/themes/orrery-light.css:30 */
    --kj-bg-body:      #dedede;
…
/* :56-60 */
    --kj-fg-subtle:   #6e6e6e;  /*  4.6:1 */
    --kj-fg-disabled: #8c8c8c;  /*  3.0:1 — non-text / disabled only */
/* :73 */
    --kj-fg-primary: #8d4dcc;  /* 4.6:1 */
```

Against the theme's own body:

| token | commented | vs `--kj-bg-body` `#dedede` |
|---|---|---|
| `--kj-fg-default` `#3b3b3b` | 10.0:1 | 8.33 (passes) |
| `--kj-fg-muted` `#515151` | 7.1:1 | 5.90 (passes) |
| `--kj-fg-subtle` `#6e6e6e` | 4.6:1 | **3.79 FAIL** |
| `--kj-fg-disabled` `#8c8c8c` | 3.0:1 | 2.50 (non-text, fine) |
| `--kj-fg-primary` / `--kj-fg-accent` `#8d4dcc` | 4.6:1 | **3.84 FAIL** |
| `--kj-fg-info` `#1c6dc8` | — | **3.83 FAIL** |
| `--kj-fg-success` `#1e7d3e` | — | **3.85 FAIL** |
| `--kj-fg-warning` `#996100` | — | **3.84 FAIL** |
| `--kj-fg-danger` `#bf4240` | — | **3.84 FAIL** |

Every `*-subtle` surface is a `color-mix(… 12%, #dedede)` (`:43-54`), so intent-on-subtle is marginally worse still.

**Verification corrections — the headline diagnosis was factually wrong.**

- **REFUTED: "measured against white."** Recomputing every annotated ratio against six candidate grounds, the comments (10.0 / 7.1 / 4.6 / 3.0 / 4.6) match a **~`#f3f3f3`** ground almost exactly (10.10 / 7.15 / 4.60 / 3.03 / 4.65) — **not** white (11.20 / 7.94 / 5.10 / 3.36 / 5.16) and not `--kj-bg-elevated` `#f7f7f7` (10.46 / 7.41 / 4.76 / 3.14 / 4.82). The original finding's own evidence disproved its title: it reported `fg-subtle` at 5.10 vs white while the comment says 4.6, and never reconciled the gap. Most likely an earlier, lighter `--kj-bg-body` was later darkened to `#dedede` at `:30` without re-deriving the foregrounds. **The prescribed fix ("recompute every annotation against the theme's own surface") is therefore the wrong fix — the foregrounds need darkening, not the comments.**
- **REMOVED from scope: the `:38-41` block.** "clearing 4.6:1" there is a correct statement about white ink on the intent **fills** (`--kj-fg-on-*` are all `#ffffff`; actual 5.16–7.59) and is rightly measured against white.
- **Not systemic — this theme is the outlier.** Every other light theme clears AA on its own `bg-body` for the same six tokens: light 5.41–17.40, retro 4.69–6.63, corporate 7.00–14.48, sakura 4.69–7.49, mint 5.40–7.86, bauhaus 5.74–7.03, dune 5.11–10.55. Only orrery-light fails all six, at 3.79–3.85.
- **Containment (and the reason severity drops):** the shortfalls are near-misses (3.79–3.85 vs 4.5, all clearing AA-large 3:1); the same tokens pass on `bg-surface` `#e8e8e8` (4.16–4.22) and `bg-elevated` `#f7f7f7` (4.76–4.83), where much intent text actually renders; and `orrery` / `orrery-light` are genuinely absent from `AVAILABLE_THEMES` and `THEME_SCHEME` (`theme.service.ts:7-16` lists 13 while `packages/themes/src/index.css` imports 15), so the theme is reachable by no picker in the repo and has never been scanned into `reports/a11y/`. That limits exposure today — and also means nothing will catch a regression.
- **Pre-existing, not diff-new:** `HEAD == main`, the theme landed in `01f65ef1`.

**No guard exists:** `packages/themes/src/themes.spec.ts` is a presence-only postcss token contract with no ratio assertions, and `contrast-score.service.ts` / `theme-a11y-report.ts` score *draft* themes in the generator UI, not shipped theme CSS.

**Fix:** darken `orrery-light`'s `fg-subtle` and the six class-C intents (or lighten `bg-body`) until ≥ 4.5:1 on the theme's own body, matching peer themes; then update the comments to match. Add `orrery` / `orrery-light` to `AVAILABLE_THEMES` and `THEME_SCHEME` so the a11y scan covers them. Extend `packages/themes/src/themes.spec.ts` with a per-theme WCAG check of class-A and class-C foregrounds against that theme's own `--kj-bg-body`, which would have caught this.
**Effort:** M

---

### F-6 A second, entirely undefined token vocabulary — seven component families are effectively un-themed

**Severity:** high · **Confidence:** high
**Files:** `packages/core/src/typography/prose.css:18-28,35,37,163,172,243,270`,
`packages/components/src/action-sheet/action-sheet.css:19,32,33,42,47,57,60,77`,
`packages/components/src/sheet/sheet.css:72,74`,
`packages/components/src/file-upload/file-upload.css:11,113,188`,
`packages/components/src/editor/editor.css:4`,
`packages/components/src/time-picker/time-picker.css:71`,
`packages/components/src/date-range-presets/date-range-presets.css:8`,
`packages/components/src/direction-toggle/direction-toggle.css:10,12,39,44-45`,
`packages/components/src/table/table.css:63,444`

Cross-referencing every `var(--kj-…)` consumed in `packages/{core,components}/src` against every
`--kj-…:` declared anywhere in the repo, these names are **read but never defined by
`@kouji-ui/themes`**:

`--kj-radius-sm`, `--kj-radius-md`, `--kj-radius-lg`, `--kj-font-size-sm|md|lg|xl|2xl|3xl|4xl`,
`--kj-line-height-tight|snug|normal|relaxed|loose`, `--kj-color-link`, `--kj-color-link-visited`,
`--kj-prose-max-width`, `--kj-bg-subtle`, `--kj-bg-subtle-hover`, `--kj-bg-muted`,
`--kj-border-subtle`, `--kj-border-color`, `--kj-danger`, `--kj-danger-fg`, `--kj-danger-bg-subtle`,
`--kj-primary`, `--kj-primary-contrast`, `--kj-fg-error`, `--kj-focus-ring-color`,
`--kj-focus-ring-width`, `--kj-space-2xs`, `--kj-table-header-bg`, `--kj-overlay-z-index`,
`--kj-backdrop-bg`.

`--kj-radius-sm/md/lg` exist only in `packages/core/src/styles/docs-themes.css:20-22,46-48,69-71`, a
docs-examples fixture that is not shipped. So:

```css
/* packages/components/src/action-sheet/action-sheet.css:32-60 */
    border-radius: var(--kj-radius-md, 0.5rem);
    background: var(--kj-bg-subtle, transparent);
…
    outline: var(--kj-focus-ring-width, 2px) solid var(--kj-focus-ring-color, var(--kj-primary));
…
    color: var(--kj-danger-fg, var(--kj-danger, #d92d20));
```

Every one of those resolves to the *fallback*, always, in every theme. `action-sheet` therefore has a
fixed 8px radius and a hard-coded `#d92d20` destructive colour in `kouji` (radius 0, danger
`oklch(55% .22 20)`) and in `retro` alike. And because `--kj-focus-ring-color` falls back to
`var(--kj-primary)` — also undefined — the entire `outline` shorthand is invalid, so the focus ring on
action-sheet items and on the sheet handle does not render at all (a WCAG 2.4.7 failure).

`prose.css`'s own header (`:18-28`) lists these names under "Tokens read from the kouji theme layer" —
the list is aspirational, not real, so prose type scale, link colour and code radius are unthemeable.

One case has no fallback at all and is therefore dead:

```css
/* packages/components/src/sheet/sheet.css:74 */
    border-radius: var(--kj-radius-sm);
```

`var()` with an undefined property and no fallback is invalid-at-computed-value-time → `border-radius`
computes to its initial value.

**Why it matters:** seven component families look correct in the docs (where `docs-themes.css` happens
to be loaded by example components) and lose their theming entirely in a consumer app. It also
fractures the naming contract: `--kj-radius-md` vs `--kj-radius-field`, `--kj-font-size-md` vs
`--kj-text-base`, `--kj-danger` vs `--kj-bg-danger`, `--kj-primary` vs `--kj-bg-primary`.

**Fix:** pick one vocabulary. Either map the aliases in `base.css`
(`--kj-radius-md: var(--kj-radius-box)`, `--kj-font-size-md: var(--kj-text-base)`,
`--kj-focus-ring-color: var(--kj-border-focus)`, …) or rewrite the seven stylesheets onto the
canonical names — the latter is cleaner. Then add a build-time check: collect every `var(--kj-*)` in
`packages/*/src/**` and fail if a name is neither declared in `@kouji-ui/themes` nor a documented
component knob. (Runtime-written properties — `--kj-slider-start`, `--kj-progress-fraction`,
`--kj-toast-index`, `--kj-color-picker-x/y/hue`, `--kj-sheet-drag-offset`, `--kj-resize-delta`,
`--kj-carousel-slides-per-view` — are legitimate and belong on the check's allowlist.)
**Effort:** L

---

### F-7 No theme declares `color-scheme`, and there is no theme at all without `data-theme`

**Severity:** high · **Confidence:** high
**Files:** all 15 in `packages/themes/src/themes/`, `packages/themes/src/base.css:29-184`,
`apps/docs/src/app/lib/theme/serialize-theme.ts:26`, `apps/docs/src/app/app.ts:63-65`

Grepping `color-scheme` across `packages/` returns **zero** hits. The only place it appears is the
docs' own theme *generator*:

```ts
// apps/docs/src/app/lib/theme/serialize-theme.ts:26
  lines.push(`color-scheme: ${isDark ? 'dark' : 'light'};`);
```

So a user-generated theme gets `color-scheme` and none of the 15 first-party themes do. In `kouji`,
`dark`, `forest`, `nord`, `terminal` and `orrery` (all light-on-dark), the UA keeps light-mode
defaults for scrollbars, `<input type="date">` / `type="color"` pickers, `<select>` popups,
`::selection`, form-control chrome and Chrome's autofill highlight — white widgets on a `#0c0c0c`
page.

Separately, `base.css`'s `:root` block (`:29-184`) defines only `--kj-base-*`, the spacing/type/motion
aliases and the icon tokens. Not one semantic colour token has a `:root` default and there is no
`@media (prefers-color-scheme: dark)` block anywhere. The app code admits the consequence:

```ts
// apps/docs/src/app/app.ts:63-65
  // Inject the ThemeService here so it bootstraps on app start (not just when
  // a child component happens to inject it). Without this the landing page
  // never sets data-theme on <html>, leaving every --kj-color-* unresolved
```

A consumer who installs the packages and forgets `data-theme` gets transparent backgrounds and
initial-value text colours on every component, with no console signal.

**Why it matters:** `color-scheme` is one line per theme and is the difference between a dark theme
that looks finished and one that leaks white native chrome. The missing default turns a one-line setup
mistake into a completely unstyled app.

**Fix:** add `color-scheme: dark|light` to each `[data-theme]` block and add it to the
`themes.spec.ts` contract. Ship a `:root` default that aliases the light theme, plus
`@media (prefers-color-scheme: dark)` aliasing dark, both in `kj.base` so any `[data-theme]` in
`kj.shared` still wins.
**Effort:** S

---

### F-8 `--kj-color-icon-*` is resolved at `:root`, so nested `[data-theme]` subtrees get the wrong icon colours

**Severity:** medium · **Confidence:** high
**Files:** `packages/themes/src/base.css:172-177`, `packages/core/src/icon/icon.directive.ts:107`

```css
/* packages/themes/src/base.css:172-177 — inside @layer kj.base { :root { … } } */
    --kj-color-icon-muted:   var(--kj-fg-muted);
    --kj-color-icon-primary: var(--kj-fg-primary);
    --kj-color-icon-success: var(--kj-fg-success);
    --kj-color-icon-warning: var(--kj-fg-warning);
    --kj-color-icon-danger:  var(--kj-fg-danger);
    --kj-color-icon-info:    var(--kj-fg-info);
```

```ts
// packages/core/src/icon/icon.directive.ts:107
    return c && c !== 'inherit' ? `var(--kj-color-icon-${c})` : null;
```

Custom-property substitution happens **at the element that declares the property**, not at the use
site. Because these are declared on `:root`, `--kj-color-icon-danger` computes once against the root
theme's `--kj-fg-danger` and then inherits that *literal colour* everywhere. No theme redeclares them
(grep `color-icon` under `packages/themes/src` returns only these six lines). Concretely: the docs set
`<html data-theme="kouji">` (`apps/docs/src/index.html:2`) so icons resolve to the kouji palette;
inside the theme generator's `data-theme="custom-draft"` preview stage
(`apps/docs/src/app/pages/theme-generator/theme-generator.html:56`) every `[kjIconColor]` icon keeps
the *outer* kouji palette instead of the draft's. The same applies to any micro-frontend that themes a
subtree, and to a nested preview swatch.

**Why it matters:** this is precisely the per-subtree theming case the `@scope` work in
`kouji.css:121-125` was written to support, defeated by six lines in `base.css`.

**Fix:** move the six declarations from `:root` into the `[data-theme]` reset block
(`base.css:21-25`, `@layer kj.reset`) so each theme boundary re-resolves them. `[data-theme]` in
`kj.reset` still loses to any theme that wants to pin a brand icon palette in `kj.shared`, which is
the documented intent. Add a spec that renders a nested `[data-theme]` and asserts the computed icon
colour.
**Effort:** S

---

### F-9 SSR + FOUC: the theme is hard-coded in `index.html` and the real theme is applied only after hydration

**Severity:** medium · **Confidence:** high
**Files:** `apps/docs/src/index.html:2`, `apps/docs/src/app/services/theme.service.ts:49-67`, `:93-97`

```html
<!-- apps/docs/src/index.html:2 -->
<html lang="en" data-theme="kouji">
```

```ts
// apps/docs/src/app/services/theme.service.ts:49-61
  constructor() {
    afterNextRender(() => {
      const fromUrl = new URLSearchParams(window.location.search).get('theme');
      const fromStorage = localStorage.getItem('kj-theme');
      …
      } else if (isValid(fromStorage)) {
        this.apply(fromStorage);
```

`afterNextRender` runs after hydration. A returning visitor whose stored theme is `light` gets the
full SSR document painted in `kouji` (`--kj-bg-body: #0c0c0c`) and then a whole-page flip to
`#ffffff` — the maximum-contrast version of FOUC. The same applies to the `?theme=` query parameter,
which is the mechanism the a11y pipeline itself uses (`reports/a11y/mint/home.json` →
`"url": "http://localhost:4200/?theme=mint"`): the scan measures a page whose first paint was kouji.
There is no inline `<script>` in `<head>` reading `localStorage` or the query param before first
paint, and `apps/docs/src/server.ts` does not rewrite `data-theme` from a cookie.

`applyTransient` (`:93-97`) sets the signal then returns early on the server, so the SSR HTML can
never carry the right attribute even if the theme were known.

**Why it matters:** this is the reference implementation consumers will copy, and the docs site is the
product demo. It also makes the automated a11y numbers less trustworthy than they look.

**Fix:** move theme resolution to a blocking inline script in `index.html`
(`try { document.documentElement.dataset.theme = new URLSearchParams(location.search).get('theme') || localStorage.getItem('kj-theme') || 'kouji' } catch {}`),
persist the choice to a cookie, and read that cookie in `server.ts` so the SSR document ships the
right `data-theme`. Document the snippet in getting-started.
**Effort:** M

---

### F-10 Density scales two components; 36 stylesheets hard-code 99 font sizes it cannot reach

**Severity:** medium · **Confidence:** high
**Files:** `packages/themes/src/density.css:98-110`, `packages/components/src/table/table.css:23-26`,
`packages/components/src/{alert,avatar,badge,breadcrumb,calendar,card,cascade-select,…}/*.css`

`density.css:103-110` publishes the whole point of the system:

```css
    --kj-ctl-h-xs: round(calc(1.75rem * var(--kj-density)), 1px); /* 28px */
    …
    --kj-row-h: var(--kj-ctl-h-md);
```

Exactly **two** of 69 component stylesheets read that ladder — `button.css` and `input.css`. Every
other control (select trigger, combobox, date-picker field, tag, pagination button, tabs, menubar
item, cascade-select row…) hard-codes its height, e.g.
`packages/components/src/cascade-select/cascade-select.css:23` `min-height: 2.75rem`,
`packages/components/src/calendar/calendar.css:91` `height: 2rem`,
`packages/components/src/carousel/carousel.css:119-120` `min-width/min-height: 44px`. Likewise 99
literal `font-size` declarations across 36 files (`alert.css:50` `0.8125rem`, `avatar.css:57-69`,
`badge.css:9,51,56,58`, `breadcrumb.css:19-25`, `button.css:163-184`, `calendar.css:10,24,41,73,95`,
…) bypass `--kj-text-*` and so ignore `--kj-type-scale` entirely. Only 20 of 69 stylesheets reference
any `var(--kj-text-…)` (57 of 69 do use `var(--kj-space-…)`, which is the one axis that works).

The table then implements a *second*, conflicting density mechanism:

```css
/* packages/components/src/table/table.css:23-26 */
  --kj-table-row-height: var(--kj-row-h);
:host([data-density="compact"])     { --kj-table-row-height: 1.75rem; }
:host([data-density="comfortable"]) { --kj-table-row-height: 2.75rem; }
```

At `compact`, `--kj-row-h` is `round(2.25rem × 0.85)` ≈ 31px while the table pins 28px; at
`comfortable`, `round(2.25rem × 1.18)` ≈ 42px vs the table's 44px. Rows desync from every other
control at both ends — and these `:host([data-density])` rules are unlayered (F-2), so they also beat
the scalar unconditionally.

**Why it matters:** `[data-density="compact"]` visibly changes two components and half-changes a
third. A consumer reasonably expects it to change the app. The mechanism is sound; the adoption is not.

**Fix:** sweep component stylesheets onto `--kj-ctl-h-*` for control heights and `--kj-text-*` for
type; delete `table.css:25-26` and let `--kj-row-h` drive it. Add a spec asserting no
`packages/components/src/**/*.css` contains a literal `font-size` or a literal control-root `height`.
**Effort:** L

---

### F-11 `docs-themes.css` writes contract token names into `:root` from a later layer

**Severity:** medium · **Confidence:** medium
**Files:** `packages/core/src/styles/docs-themes.css:6,10-32`

```css
/* packages/core/src/styles/docs-themes.css:6-31 */
@layer kj.tokens, kj.theme;

@layer kj.tokens {
  :root,
  .kj-theme-default {
    …
    --kj-border: #333;
    --kj-shadow-sm: none;
    --kj-shadow-md: none;
    --kj-transition: opacity 0.15s;
```

`--kj-border`, `--kj-shadow-sm`, `--kj-shadow-md` and `--kj-transition` are four of the 40+ names in
`themes.spec.ts`'s `REQUIRED_SHARED_TOKENS` (`:31-40`). Because `kj.tokens` is undeclared in the
canonical statement it sorts after `kj.shared`, so a `:root` write here beats `[data-theme="X"]` in
every theme — layer order beats selector specificity. The file is `styleUrls`-imported by ~20 core
`_examples` components (`packages/core/src/button/_examples/button.example.ts:8`,
`packages/core/src/dialog/_examples/dialog.example.ts:72`, …), and those use
`ViewEncapsulation.None`, so mounting any one of them injects the `:root` block globally.

Confidence is medium only because I did not run the app to observe the flattening; the cascade rules
make it the expected outcome.

It is also dead weight in `packages/core/src` — a docs fixture in a published library's source tree,
excluded from `ng-package.json` assets but still compiled into the examples that ship with the docs.

**Why it matters:** an examples fixture silently flattens every theme's shadow, border and transition
tokens page-wide the moment one example renders.

**Fix:** rename its private tokens out of the `--kj-*` contract namespace (e.g. `--kjdocs-*`), drop
the `:root` selector in favour of `.kj-theme-default` only, delete the `@layer kj.tokens, kj.theme;`
statement (F-3), and move the file out of the published source tree into `apps/docs`.
**Effort:** S

---

### F-12 `[data-tone]` / `[data-truncate]` are bare global attribute selectors in a published package

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/typography/prose.css:257-284`, `:291+`

```css
/* packages/core/src/typography/prose.css:257-275 */
@layer kj.tone {
  [data-tone='lead'] { … }

  [data-tone='muted'] {
    color: var(--kj-fg-muted, var(--kj-fg-default));
  }

  [data-tone='code'] {
    background-color: var(--kj-bg-surface, transparent);
    border-radius: var(--kj-radius-sm, 4px);
```

`data-tone` and `data-truncate` are generic, unprefixed attribute names claimed globally by a library
stylesheet — and, per F-3, from a layer that outranks `kj.component`. Any host app or third-party
widget already using `data-tone` (a common name in editor/chat/design-token code) gets silently
restyled, with no way to opt out short of `!important`.

`prose.css` is otherwise well-scoped (every element rule is a `.kj-prose` descendant), and a sweep for
bare element selectors across `packages/{core,components}/src/**/*.css` found none, so this is the one
real leak.

**Why it matters:** the packages are framed as drop-in, and global attribute selectors are the classic
way a component library breaks a host app.

**Fix:** namespace to `[data-kj-tone]` / `[data-kj-truncate]` (matching the `data-kj-motion`,
`data-kj-detent`, `data-kj-dragging` convention already used elsewhere), update the five directives
that reflect them, and keep a deprecation alias for one minor.
**Effort:** S

---

### F-13 ~28 KB of overlay CSS is shipped twice

**Severity:** medium · **Confidence:** high
**Files:** `packages/components/src/overlay/overlay.css:26-34`, `angular.json` (docs `styles` array),
`packages/components/src/{dialog,popover,tooltip,dropdown-menu,drawer,toast,confirm-popup,sheet,action-sheet}/*.ts`

The aggregator imports nine stylesheets:

```css
/* packages/components/src/overlay/overlay.css:26-34 */
@import "../popover/popover.css";
@import "../tooltip/tooltip.css";
…
@import "../action-sheet/action-sheet.css";
```

and every one of those nine is *also* a `styleUrl` on its wrapper component (`dialog.ts:77`,
`popover.ts:93`, `tooltip.ts:97`, `dropdown-menu.ts:123`, `drawer.ts:80`, `toast.ts:73` **and**
`:103`, `confirm-popup.ts:107` **and** `:136`, `sheet.ts:81`, `action-sheet.ts:128`) with
`ViewEncapsulation.None` (184 of 186 components in the two packages use `None`; only `table.ts:580`
and `table-status-bar.ts:54` use `Emulated`). Those nine files total **27,943 bytes** — ~9% of all
component CSS (316,108 bytes) — emitted once into the global `styles.css` bundle and again inlined
into the component chunks. `toast.ts` and `confirm-popup.ts` each name their stylesheet twice, adding
two more copies to the JS bundle.

**Why it matters:** bytes on the critical path, and two copies of the same rules at different points
in the cascade make override behaviour harder to reason about. Universal `ViewEncapsulation.None` also
means a component's CSS only exists in the document once that component has rendered, so a lazy route
that first mounts a themed component paints unstyled for a frame.

**Fix:** pick one delivery path. Given `ViewEncapsulation.None` is already universal, drop the
`styleUrl` from the nine wrappers and let the aggregator be the single source, or drop the aggregator
and document per-component CSS imports. Either way, resolve F-1 first so the chosen path actually
ships.
**Effort:** M

---

### F-14 `color-picker` hard-codes achromatic chrome that breaks in dark themes

**Severity:** low · **Confidence:** high
**Files:** `packages/components/src/color-picker/color-picker.css:73-74,122-123,131-132`

```css
/* :73-74 */
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px #000, 0 0 4px rgb(0 0 0 / 0.4);
/* :122-123 */
    background: #fff;
    border: 2px solid #000;
```

The spectrum gradients (`:93,99` `#ff0000, #ffff00, …`) and the alpha checkerboard
(`:19,106,113` `conic-gradient(#ccc 25%, #fff 0 50%, …)`) are legitimately raw — they are the colour
space, not chrome. The thumb/handle borders and backgrounds are not: `#fff` on a near-white swatch and
`#000` rails against `kouji`'s `#0c0c0c` both disappear.

This is the only component CSS in the repo with truly un-tokenised colour; everywhere else a hex
literal appears it is a `var(--kj-…, #hex)` fallback (e.g. `alert.css:33-37`, `chat.css:128-153`,
`file-upload.css:12-13`), which is defensible though it duplicates the palette in ~40 places.

**Fix:** use `var(--kj-bg-elevated)` / `var(--kj-border-strong)` for thumb chrome, or keep the
double-ring trick but source both rings from tokens.
**Effort:** S

---

### F-15 The theme generator emits two dead tokens and omits six required ones

**Severity:** low · **Confidence:** high
**Files:** `apps/docs/src/app/lib/theme/serialize-theme.ts:44-45`, `:47-104`,
`packages/themes/src/themes.spec.ts:15-20`

```ts
// apps/docs/src/app/lib/theme/serialize-theme.ts:44-45
  lines.push(`--kj-text-body: ${t.typography.bodyRem};`);
  lines.push(`--kj-text-small: ${t.typography.smallRem};`);
```

Grepping `--kj-text-body` / `--kj-text-small` across the repo returns only this file and its spec —
nothing reads them. The real names are `--kj-text-base` / `--kj-text-sm`
(`packages/themes/src/density.css:84-85`). So the generator's typography sliders produce CSS that
changes nothing.

Conversely, `REQUIRED_SHARED_TOKENS` (`themes.spec.ts:15-20`) mandates `--kj-bg-primary-subtle`,
`--kj-bg-accent-subtle`, `--kj-bg-info-subtle`, `--kj-bg-success-subtle`, `--kj-bg-warning-subtle` and
`--kj-bg-danger-subtle`, and `serializeToScopedBlock` emits **none** of the six. Every generated theme
therefore fails the contract the built-in themes are held to, and `alert` / `badge` / `tag` subtle
surfaces resolve to invalid → transparent.

Two smaller gaps: the generated block is a raw `<style>` (unlayered, so it outranks even
`kj.component`, unlike a built-in theme in `kj.shared`), and `--kj-chart-1..6` and
`--kj-radius-box-lg` — present in all 15 themes — are absent from both `REQUIRED_SHARED_TOKENS` and
the generator output, so the contract test would not catch a theme that dropped them.

**Fix:** emit `--kj-text-base` / `--kj-text-sm`, derive and emit the six `*-subtle` surfaces
(`color-mix(in oklch, <intent> 12%, var(--kj-bg-body))` matches what `orrery-light.css:43-54` does),
wrap the block in `@layer kj.shared`, add `--kj-chart-*` / `--kj-radius-box-lg` / `color-scheme` to
`REQUIRED_SHARED_TOKENS`, and run `serializeToScopedBlock`'s output through that same assertion.
**Effort:** M

---

## Recommended work items

1. **Ship the overlay CSS** — F-1. Add `assets` + CSS `exports` to both packages, replace the
   cross-package relative `@import`, add a `dist/` smoke test. Without it, service-launched dialogs,
   drawers, sheets and the command palette have no backdrop hit-area and service-launched sheets are
   unstyled. *(high, M)*
2. **Close the cascade holes** — F-2, F-3, F-11. Wrap the eight unlayered `ViewEncapsulation.None`
   stylesheets and two inline blocks in `@layer kj.component` (NOT `table.css` / `editor.css` /
   `table-status-bar.ts` — those are deliberately `Emulated`); append `kj.prose, kj.tone, kj.truncate`
   *after* `kj.component` in the canonical statement at `base.css:7`. Add the "first at-rule must be
   `@layer`" lint. Do **not** expect `table.css`'s 11 `!important`s to go away — they override inline
   `display:contents` host bindings, which no layer can reach. *(medium, S)*
3. **Fix the contrast failures and make them enforceable** — F-4, F-5. Raise `--kj-border-default` to
   ≥ 3:1 on `bg-body` and `bg-field` in the 13 failing themes (bauhaus and cyberpunk already pass);
   darken `orrery-light`'s `fg-subtle` + six class-C intents to ≥ 4.5:1 on `#dedede`; fix `retro`'s
   `checkbox` `border-focus` (2.27:1) and `fg-on-danger` (3.18:1). Extend `theme-a11y-report.ts`'s
   `NON_TEXT_PAIRS` with `border-default × bg-body` / `× bg-field`, and add a per-theme contrast
   assertion to `themes.spec.ts`. Register `orrery` / `orrery-light` in `theme.service.ts` so
   `reports/a11y/` covers them, and re-run the scan on all 15. *(medium, M)*
4. **Unify the token vocabulary** — F-6. Decide canonical names, rewrite the seven offending
   stylesheets, add the "every `var(--kj-*)` must be declared" build check with a runtime-written
   allowlist. Fix `sheet.css:74 border-radius: var(--kj-radius-sm)` (no fallback → dead) and the
   invalid focus-ring `outline` shorthands in `action-sheet.css:47` / `sheet.css:72`. *(high, L)*
5. **Add `color-scheme` and a default theme** — F-7. One line per theme plus a `:root` light default
   and a `prefers-color-scheme: dark` alias in `kj.base`. *(high, S)*
6. **Fix per-subtree theming** — F-8. Move `--kj-color-icon-*` from `:root` into the `[data-theme]`
   block in `kj.reset`; add a nested-theme spec. *(medium, S)*
7. **Kill the FOUC** — F-9. Inline head script + cookie + `server.ts` read. Re-run the a11y scan
   afterwards so its numbers reflect a correctly-painted first frame. *(medium, M)*
8. **Make density real** — F-10. Sweep control heights onto `--kj-ctl-h-*` and type onto
   `--kj-text-*`; delete the table's competing `:host([data-density])` rules. *(medium, L)*
9. **Stop leaking globals and bytes** — F-12, F-13. Namespace `[data-tone]` / `[data-truncate]` to
   `data-kj-*`; pick one delivery path for the nine overlay stylesheets. *(medium, S + M)*
10. **Polish** — F-14, F-15. Token-ise the colour-picker thumb chrome; fix the generator's dead and
    missing tokens and hold generated themes to `REQUIRED_SHARED_TOKENS`. *(low, S + M)*

---

## Open questions

- Is `--kj-fg-disabled` deliberately exempt from 4.5:1 (WCAG 1.4.3's disabled-control exception)? It
  is below 4.5:1 in all 15 themes; if intentional it belongs in `rules/accessibility.md` and in a
  comment in `base.css`, because right now it reads as 15 independent oversights.
- Are `orrery` / `orrery-light` intended to ship, or in-progress? They are imported by `index.css` (so
  they ship) but absent from `AVAILABLE_THEMES`, `THEME_SCHEME` and every a11y report; the
  getting-started copy still says "the 13 themes".
- What is the intended contract for `@kouji-ui/core`? `rules/architecture.md` says "directives only,
  zero CSS", but the package ships `prose.css`, `icon.css`, `motion.css`,
  `primitives/overlay/overlay.css` and `styles/docs-themes.css`. Either the rule or the package needs
  updating.
- Was `--kj-radius-sm/md/lg` meant to be a public shipped scale (it exists only in the docs fixture)
  or should the seven consumers move to `--kj-radius-field` / `-box` / `-box-lg`?
- Is per-subtree theming a supported guarantee? `kouji.css`'s `@scope` block implies yes; F-8 breaks
  it for icons. If supported, it needs a documented list of what does and does not re-resolve at a
  nested `[data-theme]`.
- Does `apps/docs`'s `body { font-family: var(--kj-font-mono) }` (`apps/docs/src/styles.css:35`)
  intentionally override each theme's `--kj-font-sans`? The a11y samples show body text in JetBrains
  Mono under `mint` (`reports/a11y/mint/home.json`), which makes the docs a poor preview of what a
  consumer sees. Related: 29 font warnings under `mint`, several of the form "computed font-family
  resolved to system fallback 'system-ui' — theme web font may have failed to load", plus an `h1`
  line-height ratio of 0.90 flagged against WCAG 1.4.12.
- `reports/a11y/_summary.json` carries only one theme (`mint`) and a `lighthouseAvg.performance` of
  41. Is the summary meant to aggregate all themes, and is the perf number a CSS-delivery symptom
  (F-13) or unrelated?
