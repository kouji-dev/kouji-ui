# Styles & Theming Review

## Verdict

The token architecture is real and better than most: three genuine tiers (`--kj-base-*` primitives → semantic `--kj-bg/fg/border/shadow-*` → per-component `--kj-<component>-*` knobs), a machine-enforced per-theme contract (`themes.spec.ts` checks 47 required tokens; all 15 themes in fact declare an identical 61-token superset), an explicit `@layer` order, and `density.css` / `overlay-styles.spec.ts` are unusually well-reasoned pieces of CSS engineering. What lets it down is the gap between what the comments claim and what the cascade actually does. Four independent places reference tokens that exist nowhere (`--kj-primary`, `--kj-focus-ring-color`, `--kj-space-2xs`, `--kj-font-size-*`), and in two of them the `var()` chain bottoms out with no literal fallback, so the whole declaration goes invalid-at-computed-value-time and silently disappears — including two focus rings. No theme declares `color-scheme`, so all the dark themes render light native widgets and scrollbars. Contrast is good in 13 of 15 themes, but `orrery-light` ships six intent colours between 3.79:1 and 3.85:1 against its own body (its in-file comments quote ratios that match no background declared in the file — they are stale, not white-referenced) and `retro`'s focus ring is 2.27:1 on its body and 2.01:1 on its surface. Ten globally-injected stylesheets sit outside `@layer` entirely, and `base.css`'s layer statement — which `density.spec.ts` pins as the contract consumers re-declare — omits three layers that `prose.css` actually uses. None of this makes the library unusable; all of it is a consumer-visible defect. **Grade: B-**

> **Verification pass applied.** F-1 was upheld at high with two secondary claims corrected; F-2 and F-3 were corrected high → medium. Each correction is folded into the finding under "Verification corrections", with withdrawn claims named explicitly. Nothing was refuted outright in this dimension.

## What works

- **Token contract is enforced, not aspirational.** `packages/themes/src/themes.spec.ts:10-45` lists 47 required shared tokens and asserts each theme declares every one. A mechanical diff of all 15 theme files confirms a *common* set of 61 tokens — no theme is missing anything another theme has except deliberate optional overrides (`--kj-font-display`, `--kj-button-bg-hover`, `--kj-hover-translate`, `--kj-display-italic`, `--kj-radius-box-lg`, `--kj-font-sans/mono`), each of which has a `:root` default in `base.css:103-164`. This audit found **zero** genuinely-missing per-theme tokens.
- **Three-tier layering is respected in themes.** `base.css:31-94` holds only raw primitives; `base.css:4` states "Components MUST NOT read base tokens directly" and component CSS broadly honours it.
- **Nested-theme handling is thought through.** `base.css:9-26` resets `--kj-button-shadow*` on every `[data-theme]` so a nested theme doesn't inherit brutalist chrome; `kouji.css:127` uses `@scope ([data-theme="kouji"]) to ([data-theme]:not([data-theme="kouji"]))` so a preview swatch of another theme escapes kouji's button override; `packages/core/src/primitives/overlay/strategies/mount/body-portal.ts:57-61` copies the nearest ancestor `data-theme` onto the portalled wrapper so overlays keep their subtree's theme. Two themes genuinely can coexist on one page.
- **`density.css` is correct where it applies.** The `@property` rationale (`density.css:22-31`) — register the scalars so JS can read a resolved px value, but *not* `--kj-space-*` / `--kj-text-*` because registration makes invalid-at-computed-value-time *apply* and would silently eat a consumer override — is right, and `density.spec.ts:55-64` pins it.
- **`overlay-styles.spec.ts` is a real regression test,** not a smoke test: it flattens the `@import` graph, asserts a rule both matches and fills the panel through the live cascade, asserts every overlay-family sheet is in the aggregator, and asserts the `ng-package.json` asset glob that makes the relative imports survive publication (`overlay-styles.spec.ts:96-196`).
- **`motion.css` is exemplary** — fully `@layer kj.component`, entirely `.kj-`prefixed, tokenised with inline fallbacks, and reduced-motion-aware (`motion.css:82-89`).
- **Colour-pair contrast is strong in 13/15 themes.** Every `fg-on-<intent>` / `bg-<intent>` pair passes AA in 14 of 15 themes; `terminal`, `cyberpunk` and `bauhaus` clear AAA on almost every pair.

## Findings

### F-1 Two focus rings resolve to nothing — `outline` goes invalid-at-computed-value-time

Severity: **high** *(upheld during verification; two secondary claims corrected)* · Confidence: **high** · Effort: **S**

Files: `packages/components/src/sheet/sheet.css:71-75`, `packages/components/src/action-sheet/action-sheet.css:45-49`, `packages/components/src/overlay/overlay.css:44-45`

```css
/* sheet.css:71 */
  .kj-sheet__handle:focus-visible {
    outline: var(--kj-focus-ring-width, 2px) solid var(--kj-focus-ring-color, var(--kj-primary));
    outline-offset: -4px;
    border-radius: var(--kj-radius-sm);
  }
/* action-sheet.css:45 */
  .kj-action-sheet__item:focus-visible,
  .kj-action-sheet__cancel:focus-visible {
    outline: var(--kj-focus-ring-width, 2px) solid var(--kj-focus-ring-color, var(--kj-primary));
    outline-offset: 2px;
  }
```

Neither `--kj-focus-ring-color` nor `--kj-focus-ring-width` nor `--kj-primary` is declared anywhere: a repo-wide grep for `--kj-(primary|focus-ring-color|focus-ring-width)\s*:` across every `.css`, `.ts`, `.scss` and `.html` outside `node_modules` returns **zero declarations**. So the fallback of `var(--kj-focus-ring-color, …)` is taken, that fallback is `var(--kj-primary)`, which is the guaranteed-invalid value — the whole `outline` shorthand becomes invalid at computed-value time, each longhand computes to `unset`, and because `outline-*` are non-inherited that is `outline-style: none`. It remains an author-origin declaration, so it also suppresses the UA `:focus-visible` ring. The element gets **no visible focus indicator at all**.

Nothing rescues it elsewhere: `packages/themes/src/base.css` contains no `focus` or `outline` rule, there is no global `:focus-visible` reset in `packages/core/src/styles/` or `packages/themes/`, and no guard or test covers it — `packages/components/src/action-sheet/action-sheet.spec.ts` contains no focus assertion and `packages/components/src/sheet/` has no spec file at all, which is why this shipped in #20 and survived to HEAD. `fd6dd34e..HEAD` touched these files only via `2948c5b5`, a z-index stacking fix.

**This reaches the consumer through the documented path, and only through it.** `action-sheet.css` is attached via `styleUrl` on `KjActionSheetComponent` (`kj-action-sheet-shell`), a documentation-only shell that the real `KjActionSheet` never renders. So `packages/components/src/overlay/overlay.css:44-45` — the two `@import` lines in the aggregator whose own header instructs consumers to register it — is the **only** route by which these rules reach an app. The defect therefore bites in precisely the supported registration, and `KjActionSheet`'s own TSDoc advertises a "Tab / Shift+Tab cycles focus across the action rows" contract that the missing ring silently breaks.

**Why it matters** — WCAG 2.1 **2.4.7 Focus Visible** (Level A) and **1.4.11 Non-text Contrast** (AA), in a library whose `CLAUDE.md` mandates WCAG 2.1 AAA. The sheet drag handle is the keyboard affordance for resizing a bottom sheet; action-sheet items are its primary menu, and its cancel button is the escape route. A keyboard user has nothing to track on any of them.

**Verification corrections (severity upheld at high).**
1. **The real token is `--kj-border-focus`, not `--kj-bg-primary`.** The established focus token in this repo is `--kj-border-focus` alone — declared in all 15 files under `packages/themes/src/themes/` and used correctly at `packages/components/src/button/button.css:239-241` (`outline: 2px solid var(--kj-border-focus);`). `--kj-bg-primary` is unrelated and should not be named here.
2. **`sheet.css:74`'s `border-radius: var(--kj-radius-sm)` is a separate cosmetic nit, not "the same class of problem".** An invalid `border-radius` resolves to `0` — a square corner on an element drawn with `outline-offset: -4px`, with no accessibility consequence. Its shipped counterparts are `--kj-radius-field` / `--kj-radius-box` (`packages/themes/src/themes/light.css:11-13`), not the docs-only `--kj-radius-sm`.
3. **`direction-toggle.css:44-45` is not a third instance.** It uses the same `--kj-focus-ring-*` names but terminates in a valid `currentColor` fallback, so it degrades gracefully. Exactly two files are broken.

**Fix** — replace both with the token the rest of the library already uses: `outline: 2px solid var(--kj-border-focus);` (what `button.css:239-241`, `checkbox.css:64`, `accordion.css:36` and ~20 others do). If a `--kj-focus-ring-*` knob is genuinely wanted, declare it in `base.css` under `kj.base` as `--kj-focus-ring-width: 2px; --kj-focus-ring-color: var(--kj-border-focus);` and keep the use sites. Add a focus assertion to `action-sheet.spec.ts`, a spec file for `sheet/`, and a lint rule that rejects any `var(--kj-…)` chain in `packages/**/*.css` whose innermost fallback is itself an undeclared `var()`.

---

### F-2 `orrery-light`: `fg-subtle` and the class-C intent tokens miss AA as text on `bg-body` / `bg-surface` / `bg-field`

Severity: **medium** *(corrected during verification: was high)* · Confidence: **high** · Effort: **M**

Files: `packages/themes/src/themes/orrery-light.css:30,56-78`; `packages/components/src/link/link.css:12`; `packages/core/src/typography/prose.css:104`

The strongest, unambiguous call site first: `packages/components/src/link/link.css:12` sets `--kj-link-fg: var(--kj-fg-primary)` and `packages/core/src/typography/prose.css:104` sets `.kj-prose a { color: var(--kj-fg-primary) }`. On this theme that renders **normal-size link text at 3.84:1** against the body — below AA's 4.5:1.

Computed ratios (sRGB, WCAG 2.x formula; validator sanity-checked at black-on-white = 21.00), reproduced independently during verification:

| token | value | vs `--kj-bg-body: #dedede` | in-file comment claims | verdict |
|---|---|---|---|---|
| `--kj-fg-subtle` | `#6e6e6e` | **3.79:1** | `/* 4.6:1 */` (l.59) | fails AA 4.5 |
| `--kj-fg-primary` / `--kj-fg-accent` | `#8d4dcc` | **3.84:1** | `/* 4.6:1 */` (l.73) | fails AA 4.5 |
| `--kj-fg-info` | `#1c6dc8` | **3.83:1** | — | fails AA 4.5 |
| `--kj-fg-success` | `#1e7d3e` | **3.85:1** | — | fails AA 4.5 |
| `--kj-fg-warning` | `#996100` | **3.84:1** | — | fails AA 4.5 |
| `--kj-fg-danger` | `#bf4240` | **3.84:1** | — | fails AA 4.5 |
| `--kj-fg-default` | `#3b3b3b` | 8.33:1 | `/* 10.0:1 */` (l.57) | passes AAA |
| `--kj-fg-muted` | `#515151` | 5.90:1 | `/* 7.1:1 */` (l.58) | passes AA (see note below) |

```css
/* orrery-light.css:30 */    --kj-bg-body:      #dedede;
/* orrery-light.css:59 */    --kj-fg-subtle:   #6e6e6e;  /*  4.6:1 */
/* orrery-light.css:73 */    --kj-fg-primary: #8d4dcc;  /* 4.6:1 */
```

The inline annotations at l.57, l.58, l.59 and l.73 are **stale or unverified** — they match no background declared in the file (the closest is `--kj-bg-elevated` `#f7f7f7` at 10.46 / 7.41 / 4.76 / 3.14) — and should be corrected or dropped.

**Scoping facts that bound the impact.** `orrery-light` is opt-in: it appears nowhere in TypeScript (no theme registry, no picker entry, not a default), ships as CSS via `packages/themes/src/index.css`, and activates only when a consumer sets `data-theme="orrery-light"`. It is 1 of 16 themes. `--kj-fg-disabled` (2.50:1) is explicitly exempt under the WCAG 1.4.3 inactive-control exception, and the file says so at l.60. On `--kj-bg-elevated` (`#f7f7f7` — popovers, dropdowns, menus) the class-C tokens reach 4.82:1 and **do** pass AA; the failure is specific to body (`#dedede`), surface (`#e8e8e8`) and field (`#e4e4e4`).

**No gate catches this.** `packages/themes/src/themes.spec.ts` asserts token *presence* only (`REQUIRED_SHARED_TOKENS`), never contrast. `tools/a11y/src/contrast-utils.ts` exports `auditTokens` / `suggestFgs` and **nothing calls them** (grep for `auditTokens` across the repo: zero call sites). `apps/docs/.../contrast-score.service.ts` scores only a user's `DraftTheme` in the theme builder, not shipped themes. Nothing in `fd6dd34e..HEAD` touches this file.

**Why it matters** — WCAG **1.4.3 Contrast (Minimum)** AA, against a repo-stated AAA target (`CLAUDE.md`, `rules/accessibility.md`).

**Verification corrections (high → medium).** The arithmetic is exactly right and reproduces; three pieces of the original evidence do not survive and they were what inflated the severity.

1. **The `l.39-41` citation is withdrawn.** That comment sits inside the `/* ── intent surfaces ── */` block (l.38-54) and describes the `--kj-bg-*` fills: "these keep its muted character while clearing 4.6:1. They are dark enough to carry white ink." White on those fills measures 7.59 (`#752cb3`), 5.16 (`#1c6dc8`), 5.17 (`#1e7d3e`), 5.17 (`#996100`), 5.16 (`#bf4240`) — the comment is **accurate as written** and makes no claim about the class-C `--kj-fg-*` tokens against the body.
2. **"Every quoted ratio was measured against white … scaling each down by ~26%" is withdrawn.** Against white the tokens measure 11.20 / 7.94 / 5.10 / 3.36 — not the quoted 10.0 / 7.1 / 4.6 / 3.0. The annotations match no background in the file; they are stale, not white-referenced. The prescribed fix is to darken the foregrounds, not to re-derive the comments against white.
3. **The `alert.css:33-36` citation is replaced.** Those lines set `--kj-alert-accent`, consumed at l.20 / l.42 as a 4px `border-left` / `border-top` and at l.89 as an icon `color` — graphical objects under WCAG **1.4.11**, whose bar is 3:1, which 3.84 *passes*. The accent is used as text only at **`alert.css:72`** (`.kj-alert__title`), which is the line to cite. The same applies to most other `--kj-fg-primary` consumers: `breadcrumb.css:106`, `input-mask.css:26-28`, `input-otp.css:44/53/55`, `menubar.css:52` are `outline`, `border-color` and `caret-color` — all 1.4.11 at 3:1, all passing.

An opt-in theme with a ~15% shortfall against the bar, roughly half the originally cited call sites passing the correct criterion, and a third of the quoted evidence misread: medium, not high.

**Separate, lower-priority note.** `--kj-fg-muted` at 5.90:1 clears AA but misses the repo's stated AAA target of 7:1 — a target miss, not a conformance failure.

**Fix** — darken the class-C tokens by roughly 15% so each clears 4.5:1 on `#dedede` (not on white), and `--kj-fg-subtle` likewise; note that class C need not share hexes with the class-B `--kj-bg-*` fills, since the two serve opposite roles. Correct or delete the stale annotations at l.57-59 and l.73. Worth pairing with wiring the already-written, unused `auditTokens` helper into `themes.spec.ts` so every theme's fg/bg pairs are asserted — that catches this class of drift across all 16 themes rather than patching one.

---

### F-3 `retro`: focus ring at 2.27:1 and destructive-button text at 3.18:1

Severity: **medium** *(corrected during verification: was high)* · Confidence: **high** · Effort: **S**

Files: `packages/themes/src/themes/retro.css:25,44,58,72`

```css
/* retro.css */
25:    --kj-bg-body:        #ede5d0;
44:    --kj-bg-danger:          #c4625d;
58:    --kj-fg-on-danger:    #ede5d0;
72:    --kj-border-focus:     #7a9eb1;
```

Both items re-verified exact at HEAD:

1. **`--kj-border-focus: #7a9eb1` measures 2.27:1 on `--kj-bg-body` (`#ede5d0`) and 2.01:1 on `--kj-bg-surface` (`#e4d8b4`)** — below the WCAG **1.4.11** 3:1 non-text floor, and the worst pair in the library. `--kj-border-focus` is *the* focus-indicator token: 33 call sites draw the ring as `outline: 2px solid var(--kj-border-focus); outline-offset: 2px` (`button.css:240`, `checkbox.css:64`, `accordion.css:36`, `combobox.css:18`, `carousel.css:87,144,165`, `cascade-select.css:26`, `color-picker.css:26,61,136,168,172`, `date-picker.css:27`, `calendar.css:107`, `chat-ai.css:136,294`, …). Because of the `outline-offset: 2px`, the gap exposes the *page background*, so the adjacent colour for 1.4.11 is `bg-body` / `bg-surface` — the worst case, not the control fill. Every focus indicator in the library is invisible-grade on retro.
2. **`--kj-fg-on-danger: #ede5d0` on `--kj-bg-danger: #c4625d` measures 3.18:1** — failing WCAG **1.4.3** for the destructive button label at `button.css:79` and the seven other `fg-on-danger` consumers (badge, tag, toast, stepper, chat, overlay-badge).

**The library self-fails its own written rule.** `apps/docs/src/app/lib/theme/theme-a11y-report.ts` lists `{ fg: 'fg-on-danger', bg: 'bg-danger' }` in `AA_NORMAL_PAIRS` at 4.5:1 — retro does not meet the standard the repo itself declares.

**Nothing validates theme token *values*.** `packages/themes/src/themes.spec.ts` checks token **presence** only. `theme-a11y-report.ts` computes contrast but runs solely over `DraftTheme` objects from the docs theme generator and never sees the hand-authored built-in theme CSS; its `NON_TEXT_PAIRS` list holds only two `bg-elevated` pairs, so **`border-focus` is checked by nothing, anywhere**. Retro ships via `packages/themes/src/index.css:6`, and nothing in `fd6dd34e..HEAD` touched `packages/themes`.

**Why it matters** — WCAG **1.4.11 Non-text Contrast** (focus indicator) and **1.4.3 Contrast (Minimum)**.

**Verification corrections (high → medium).**
- **Scope is retro alone.** A sweep of all 15 themes shows retro is the sole outlier on `bg-body` (next-worst is cyberpunk at 3.15). The **forest** items are demoted to a separate low / informational note below: forest's own focus ring is 6.46:1, and its two cited pairs (`fg-danger` / `bg-body` 4.33:1, `fg-subtle` / `bg-surface` 4.14:1) are sub-0.4 near-misses of AA on an otherwise healthy theme. Billing forest as a co-equal affected file alongside retro's 2.01:1 overstates the blast radius; `packages/themes/src/themes/forest.css` is removed from this finding's file list.
- **The calibration parenthetical was incomplete.** cyberpunk (3.15) and dark (3.21) clear 3:1 on `bg-body` but **fall under it on `bg-surface`** (2.61 and 2.90) — so there is no enforced 3:1 floor to appeal to. That is the systemic point worth reporting, and it is the same root cause as above.
- **Containment:** one opt-in theme out of 15, with the defaults clean (light 17.4, kouji 16.5, orrery 4.70) and a three-token fix. Medium, not high.

**Explicitly not findings:** `fg-disabled` on `bg-disabled` measures 1.28–2.82:1 in all 15 themes, but WCAG 1.4.3 exempts inactive user-interface components. `border-default` on `bg-body` (1.12–1.63:1 in 13 themes) is exempt where the border is decorative — see Open Question 1 for the case where it is not.

**Low / informational note (forest).** `forest.css:68` `--kj-fg-danger: #d96550` on `forest.css:26` `--kj-bg-body: #1a2820` = 4.33:1, and `fg-subtle` / `bg-surface` = 4.14:1 — both just under AA 4.5. Worth a one-step lightening, not a focus-indicator failure.

**Fix** — retro: darken `--kj-border-focus` until it clears 3:1 on `#ede5d0` (aim for ≥ 4.5:1 so it also works as a border colour), and either darken `--kj-bg-danger` or swap `--kj-fg-on-danger` to a near-black ink. Then make it machine-enforced: add `border-focus × bg-body` and `border-focus × bg-surface` edges to `NON_TEXT_PAIRS` in `theme-a11y-report.ts`, and extend `packages/themes/src/themes.spec.ts` to parse each built-in theme's hex values and assert the same thresholds — which catches retro *and* the cyberpunk / dark surface dips in CI.

---

### F-4 No theme declares `color-scheme` — dark themes get light native UI

Severity: **medium** · Confidence: **high** · Effort: **S**

Files: all of `packages/themes/src/themes/*.css` (15 files); `packages/themes/src/base.css`

```
$ grep -rc 'color-scheme' packages/themes/src/     ->  0 matches in 0 files
$ grep -rn 'prefers-color-scheme' packages/        ->  0 matches
```

The only `color-scheme` in the repo is emitted by the docs' *custom-theme serializer* (`apps/docs/src/app/lib/theme/serialize-theme.ts:26`), i.e. for user-generated themes only — the shipped presets don't get it.

Several themes are light-text-on-dark (`kouji #0c0c0c`, `dark #1a1a1a`, `forest #1a2820`, `nord #2e3440`, `terminal`, `orrery`). Without `color-scheme: dark` on the theme root the UA keeps its light scheme: native `<select>` popups, date/colour/file pickers, `<input>` autofill chrome, the default scrollbar, form-control borders, `::selection` and the canvas background behind the document all render light.

**Why it matters** — white flashes on overscroll and during navigation, unreadable native dropdown lists over dark app chrome, and `accent-color` / caret defaults that fight the theme. It is also what lets the browser's own forced-colors and reduced-transparency heuristics behave sensibly.

**Fix** — add `color-scheme: light` or `dark` to each `[data-theme="X"]` block. The classification already exists, hardcoded in `apps/docs/src/app/services/theme.service.ts:24-38` (`THEME_SCHEME`). Extend `themes.spec.ts` with a companion assertion that every theme block declares `color-scheme`.

---

### F-5 With no `[data-theme]` the library renders unstyled — no `:root` fallback, no `prefers-color-scheme` default

Severity: **medium** · Confidence: **high** · Effort: **M**

Files: `packages/themes/src/base.css:29-184`; every `packages/themes/src/themes/*.css`

`base.css`'s `:root` block declares only primitives (`--kj-base-*`), font/space/text aliases, motion and icon tokens. Not one of `--kj-bg-body`, `--kj-bg-surface`, `--kj-fg-default`, `--kj-border-default`, `--kj-shadow-md`, `--kj-radius-box`, `--kj-transition` has a `:root` value — each exists **only** inside a `[data-theme="X"]` rule:

```
$ grep -rn 'kj-bg-body\s*:' --include=*.css packages/
packages/themes/src/themes/bauhaus.css:27    --kj-bg-body:        #f5efe1;
packages/themes/src/themes/corporate.css:26  --kj-bg-body:        #f5f7fa;
...(15 theme files, nothing else)
```

An app that installs `@kouji-ui/themes` and forgets `data-theme` on `<html>` gets `background: var(--kj-bg-body)` → guaranteed-invalid → transparent; `border: var(--kj-border) solid var(--kj-border-default)` → invalid-at-computed-value-time → `border: unset` (no border at all); `box-shadow: var(--kj-card-shadow)` → nothing. The library's own docs app documents this failure mode in a comment (`apps/docs/src/app/app.ts:64-67`: *"Without this the landing page never sets data-theme on `<html>`, leaving every `--kj-color-*` unresolved"*) — and papered over it by force-injecting `ThemeService` rather than fixing the CSS.

**Why it matters** — the first-run experience for a new consumer is a blank page with invisible controls and no console error to explain it. There is also no `@media (prefers-color-scheme: dark)` anywhere, so "respect the OS" is not offered even as an opt-in.

**Fix** — add a bare `:root` default set in `base.css` (aliasing one theme, e.g. `light`) so unthemed usage degrades to something readable, plus optionally `@media (prefers-color-scheme: dark) { :root:not([data-theme]) { … } }` aliasing `dark`. `kj.shared` already outranks `kj.base`, so an explicit `[data-theme]` keeps winning for free.

---

### F-6 `--kj-bg-overlay` is a dead token; every scrim and hover tint is hardcoded

Severity: **medium** · Confidence: **high** · Effort: **S**

Files: `packages/components/src/dialog/dialog.css:5`, `drawer/drawer.css:55`, `command-palette/command-palette.css:16`, `packages/core/src/primitives/overlay/overlay.css:44`, `alert/alert.css:123`, `toast/toast.css:113`

```css
/* dialog.css:2-5 */         .kj-dialog-overlay { position: fixed; inset: 0; background: rgb(0 0 0 / 0.5); … }
/* drawer.css:51-56 */       [data-kj-drawer-container]::before { … background: rgb(0 0 0 / 0.5); … }
/* command-palette.css:16 */ background: rgba(0, 0, 0, 0.7);
/* core overlay.css:40-46 */ .kj-backdrop, .kj-overlay-backdrop { background: var(--kj-backdrop-bg, rgb(0 0 0 / 0.5)); }
```

`--kj-bg-overlay` is declared by all 15 themes and is **item 5 of `REQUIRED_SHARED_TOKENS`** (`themes.spec.ts:13`), yet a repo-wide grep finds it consumed by exactly zero stylesheets — only by the docs' theme serializer. `--kj-backdrop-bg` (the core primitive's knob) is likewise never declared by anything. So a theme cannot change its own scrim: `light.css:33` carefully sets `--kj-bg-overlay: rgba(26, 26, 26, 0.5)` and `orrery-light.css:34` sets `rgba(30, 30, 30, 0.34)`, and both are ignored.

Two hover tints have the same problem with a visible symptom on dark themes:

```css
/* alert.css:123 */  .kj-alert__dismiss:hover { opacity: 1; background: rgb(0 0 0 / 0.06); }
/* toast.css:113 */  .kj-toast-close:hover   { opacity: 1; background: rgb(0 0 0 / 0.08); }
```

6–8% black over a `#0c0c0c` (kouji) or `#1a1a1a` (dark) surface is imperceptible — the hover affordance on the alert and toast dismiss buttons does not exist in any dark theme.

**Fix** — point every scrim at the token: `background: var(--kj-bg-overlay, rgb(0 0 0 / 0.5))`, and derive `--kj-backdrop-bg` from it in `base.css`. Replace the two hover tints with `color-mix(in oklch, var(--kj-fg-default) 8%, transparent)` so the tint follows the theme's ink. Add a themes-side spec that fails when a `REQUIRED_SHARED_TOKENS` entry has no consumer.

---

### F-7 Ten globally-injected stylesheets sit outside `@layer` and outrank everything

Severity: **medium** · Confidence: **high** · Effort: **M**

Files (no `@layer` anywhere in the file): `packages/components/src/table/table.css`, `table/table-filters/filters.css`, `calendar/calendar.css`, `date-picker/date-picker.css`, `datetime-picker/datetime-picker.css`, `date-range-presets/date-range-presets.css`, `command-palette/command-palette.css`, `editor/editor.css`, `input-mask/input-mask.css`, `packages/core/src/icon/icon.css`

83 components in `packages/components/src` declare `encapsulation: ViewEncapsulation.None`, verified for every owner of the files above:

```
$ grep -h encapsulation packages/components/src/{table,calendar,date-picker,command-palette,input-mask,date-range-presets,datetime-picker}/*.ts
  encapsulation: ViewEncapsulation.None,   (x7)
```

So each of these stylesheets is injected into `document.head` as **global, unlayered** CSS the moment the component instantiates. Per the cascade, unlayered author rules beat *every* layered author rule regardless of specificity or source order. Consequences:

1. A consumer who does the recommended thing — wrapping their overrides in a named layer so kouji-ui can be overridden predictably — cannot override anything in these ten files.
2. Theme-level component overrides can't reach them either: `kouji.css:126-134` puts its button override in `@layer kj.component`, which loses to any unlayered rule.
3. `icon.css` is worse because it is a *published, permanently-registered* global (`core/package.json:57` exports `./icon/icon.css`; `angular.json:104` registers it via `styles.css`), so `.kj-icon { display: inline-block; width: 1em; … }` (`icon.css:13-20`) is unconditionally un-overridable by layered host CSS.

**Fix** — wrap all ten in `@layer kj.component { … }`, matching the other 65 component stylesheets. Add a spec (mirroring `density.spec.ts`'s style) that walks `packages/{core,components}/src/**/*.css` and asserts every rule-bearing file opens with a `@layer kj.*` block.

---

### F-8 `base.css`'s `@layer` statement omits three layers that `prose.css` actually uses

Severity: **medium** · Confidence: **high** · Effort: **S**

Files: `packages/themes/src/base.css:7`; `packages/core/src/typography/prose.css:31,257,291`; `packages/themes/src/density.spec.ts:32-38`

```css
/* base.css:7 */
@layer kj.reset, kj.base, kj.shared, kj.component;
```

```css
/* prose.css:31  */ @layer kj.prose    { .kj-prose { … } }
/* prose.css:257 */ @layer kj.tone     { [data-tone='lead'] { … } }
/* prose.css:291 */ @layer kj.truncate { [data-truncate='1'] { … } }
```

`kj.prose`, `kj.tone` and `kj.truncate` are never named in the order statement, so they register on first encounter — i.e. **after** `kj.component`, giving prose typography and the tone/truncate attributes higher cascade priority than every component stylesheet. That is almost certainly backwards: `.kj-prose p` beating `.kj-card p` is a surprise, and a component that wants to restyle a `[data-tone="code"]` span inside itself cannot.

Worse, the position is *load-order dependent*. `density.spec.ts:32-38` documents the statement as a published contract (*"Editing the `@layer kj.reset, kj.base, kj.shared, kj.component` statement desyncs consumers who re-declare it"*) — but a consumer who faithfully re-declares those four names still ends up with three unpinned kouji-ui layers whose position depends on import order. `packages/core/src/styles/docs-themes.css:6` adds a fourth and fifth unpinned name (`@layer kj.tokens, kj.theme;`).

**Fix** — either fold prose into `kj.component` (simplest — it is component CSS), or extend the statement to `@layer kj.reset, kj.base, kj.shared, kj.prose, kj.component, kj.tone, kj.truncate;` and update `density.spec.ts:37`. Document the final order in the themes README so consumers re-declare the right thing. Either way, add an assertion that every `@layer` *name* used under `packages/` appears in `base.css`'s statement.

---

### F-9 `.kj-card[data-shadow="lift"]` is a no-op in all 15 themes

Severity: **medium** · Confidence: **high** · Effort: **S**

Files: `packages/components/src/card/card.css:14,21,40-46`, `packages/themes/src/base.css:9-25`

```css
/* card.css:40-46 */
  /* Lift modifier — borrows the theme's button-shadow value so cards in
     brutalist themes (kouji / bauhaus) get the same hard offset block as
     primary buttons. Themes without an offset signature fall back to
     `--kj-shadow-md` so the card still reads as elevated. */
  .kj-card[data-shadow="lift"] {
    --kj-card-shadow: var(--kj-button-shadow, var(--kj-shadow-md));
```

```css
/* base.css:21-25 — @layer kj.reset */
  [data-theme] {
    --kj-button-shadow:        none;
    --kj-button-shadow-hover:  none;
    --kj-button-shadow-active: none;
  }
```

`--kj-button-shadow` is a *declared, inherited* custom property on the theme root, so on any themed page `var(--kj-button-shadow, …)` resolves to `none` and the `--kj-shadow-md` fallback is unreachable. `box-shadow: var(--kj-card-shadow)` (`card.css:21`) therefore renders `none` — `data-shadow="lift"` does nothing, everywhere.

The comments also describe behaviour that no longer exists. `base.css:18-19` says *"kouji + bauhaus set their offset blocks in their own `[data-theme="X"]` declarations"*, and `button.css:26` names *"kouji's `6px 6px 0 #2a2a2a` offset block"* — but a full grep shows **no theme file declares `--kj-button-shadow` at all**:

```
$ grep -rn 'kj-button-shadow' --include=*.css packages/themes/
packages/themes/src/base.css:22   --kj-button-shadow:        none;
packages/themes/src/base.css:23   --kj-button-shadow-hover:  none;
packages/themes/src/base.css:24   --kj-button-shadow-active: none;
```

So the `kj.reset` block neutralises an override that was removed, and three code comments are stale. (The button itself is fine — a page can still set `--kj-button-shadow` at a scope *below* the theme root, which is what `button.css:224-234` and `speed-dial.css:57,119` rely on.)

**Fix** — either drop the `kj.reset` `[data-theme]` block so `--kj-button-shadow` is genuinely unset (which makes both the card fallback and the button `var(name, none)` sites correct), or change `card.css:45` to `--kj-card-shadow: var(--kj-shadow-md);` and stop borrowing the button token. Correct `base.css:18-19` and `button.css:23-30`.

---

### F-10 `--kj-space-2xs` doesn't exist — `.kj-menubar` renders with no padding and no gap

Severity: **medium** · Confidence: **high** · Effort: **S**

Files: `packages/components/src/menubar/menubar.css:7-8,13,19`

```css
  .kj-menubar {
    …
    --kj-menubar-padding:      var(--kj-space-2xs);
    --kj-menubar-gap:          var(--kj-space-2xs);
    …
    gap: var(--kj-menubar-gap);
    …
    padding: var(--kj-menubar-padding);
```

The spacing ladder runs `--kj-space-1 … --kj-space-11` plus t-shirts `xs/sm/md/lg/xl/2xl…6xl` (`density.css:50-73`) — there is no `2xs`. (The *type* ramp does have `--kj-text-2xs` and `--kj-text-3xs`, `density.css:81-82`, which is presumably where the name came from.) With no literal fallback, `--kj-menubar-padding` and `--kj-menubar-gap` are guaranteed-invalid, so `padding` and `gap` are invalid-at-computed-value-time and resolve to `unset` → `0` and `normal`.

`menubar.ts:71-72` documents both as consumer knobs, so a consumer who sets them gets a working menubar and a consumer who doesn't gets a squashed one — hard to diagnose.

**Fix** — `var(--kj-space-xs)` (4px, the intended value), or add `--kj-space-2xs: var(--kj-space-1)` (2px) to `density.css`'s `:root` if a sub-4px step is wanted. The lint in F-1 catches this class.

---

### F-11 Density scales spacing and type but not control heights — 3 of 69 stylesheets participate

Severity: **medium** · Confidence: **high** · Effort: **L**

Files: `packages/themes/src/density.css:98-110`; 66 of 69 stylesheets under `packages/components/src`

`density.css:98-102` states the intent: *"sm/md/lg stay each component's semantic API; this shared ladder is what those variants resolve to, so density scales every variant uniformly instead of each component hardcoding a rem value."* Actual adoption:

```
$ grep -rl -e '--kj-ctl-h-' -e '--kj-row-h' --include=*.css packages/components/src
packages/components/src/button/button.css
packages/components/src/input/input.css
packages/components/src/table/table.css
```

Three files. Meanwhile 74 declarations hardcode a control height and 56 hardcode spacing:

```
packages/components/src/alert/alert.css:118                       min-height: 2.75rem;
packages/components/src/cascade-select/cascade-select.css:23,78   min-height: 2.75rem; /* 44px touch target */
packages/components/src/chat/chat.css:77                          height: 2.25rem;
packages/components/src/chat/chat-ai.css:287                      height: 2.75rem; /* WCAG 2.5.5 target */
packages/components/src/action-sheet/action-sheet.css:29          min-height: 44px;
packages/components/src/carousel/carousel.css:120                 min-height: 44px;
packages/components/src/color-picker/color-picker.css:10          height: 44px;
packages/components/src/alert/alert.css:110                       padding: 4px 8px;
packages/components/src/cascade-select/cascade-select.css:42,60   padding: 4px;
packages/components/src/combobox/combobox.css:45                  padding: 4px;
packages/components/src/chat/chat-ai.css:124                      padding: 0.25rem 0.6rem;
packages/components/src/color-picker/color-picker.css:157         gap: 6px;
...(56 raw padding/margin/gap declarations in total)
```

The raw-spacing ones also violate `rules/code_style.md` (*"never ship raw `px`/`rem` for spacing … This applies to **every** stylesheet under `packages/components/src/**`"*). The 44px touch-target floors are a legitimate escape hatch — WCAG 2.5.5 is an absolute minimum that must not shrink under `compact`.

**Why it matters** — `[data-density="compact"]` produces a half-scaled UI: padding and type shrink, but selects, combobox triggers, chat composers, cascade-selects and alerts keep their fixed heights. Rows stop aligning with adjacent controls, which is precisely the dense-IDE use case `density.css` was written for.

**Fix** — sweep `packages/components/src/**/*.css`, replacing control heights with `var(--kj-ctl-h-{sm,md,lg})` and spacing literals with `--kj-space-*`, keeping (and commenting) the WCAG 2.5.5 floors as `max(var(--kj-ctl-h-md), 44px)`. Add a spec listing which stylesheets are allowed raw length literals.

---

### F-12 `prose.css` reads a token namespace no theme defines — typography is permanently on hardcoded fallbacks

Severity: **medium** · Confidence: **high** · Effort: **M**

Files: `packages/core/src/typography/prose.css:17-28, 31-39, 268-273`

```css
/* prose.css:24-28 — the file's own token manifest */
     --kj-font-sans / --kj-font-mono / --kj-font-display
     --kj-font-size-xs / sm / md / lg / xl / 2xl / 3xl / 4xl
     --kj-line-height-tight / snug / normal / relaxed / loose
     --kj-radius-sm / md
     --kj-prose-max-width ...................... opt-out for CJK
```

```css
/* prose.css:32-38 */
  .kj-prose {
    color: var(--kj-fg-default);
    font-family: var(--kj-font-sans);
    font-size: var(--kj-font-size-md, 1rem);
    line-height: var(--kj-line-height-relaxed, 1.7);
    max-width: var(--kj-prose-max-width, 65ch);
```

Counts in the file: **13** references to `--kj-font-size-*`, **10** to `--kj-line-height-*`, **3** to `var(--kj-radius-*)`, and **0** to `--kj-text-*` and **0** to `--kj-space-*`. None of `--kj-font-size-*`, `--kj-line-height-*`, `--kj-radius-sm/md` or `--kj-prose-max-width` is declared by `base.css`, `density.css` or any theme — the real names are `--kj-text-*` (`density.css:81-91`) and `--kj-radius-{box,field,selector}`.

Consequence: every prose heading, paragraph, code block and blockquote is locked to its literal fallback. `.kj-prose` does not respond to `--kj-type-scale` (so `[data-density]` is a no-op for all long-form content), does not respond to a theme's radius identity (inline code always gets 4px corners, including in brutalist `kouji`/`bauhaus` which are radius-0), and none of the "themes can override" knobs its header advertises actually exist. `prose.css:22-23` also documents `--kj-color-link` / `--kj-color-link-visited`, which the rules never use — the real anchor rule is `prose.css:104`, using `--kj-fg-primary`.

**Fix** — re-point onto the real taxonomy: `--kj-font-size-md` → `--kj-text-base`, `--kj-font-size-lg` → `--kj-text-lg`, `--kj-font-size-3xl/4xl` → `--kj-text-3xl/4xl` (both exist), `--kj-radius-sm` → `--kj-radius-field`, `--kj-radius-md` → `--kj-radius-box`. Add `--kj-line-height-*` and `--kj-prose-max-width` to `base.css` (they have no equivalent yet) and rewrite the header manifest to match.

---

### F-13 Unprefixed global attribute selectors ship in the published CSS

Severity: **medium** · Confidence: **high** · Effort: **M**

Files: `packages/core/src/typography/prose.css:258,264,268,277,292,302-308`; `packages/themes/src/density.css:120,125,130-131`

```css
/* prose.css — @layer kj.tone / kj.truncate, both unpinned (F-8) */
258:  [data-tone='lead']       { color: …; font-size: …; line-height: …; }
264:  [data-tone='muted']      { color: …; }
268:  [data-tone='code']       { background-color: …; border-radius: …; font-family: …; padding: …; }
277:  [data-tone='blockquote'] { border-inline-start: 4px solid …; font-style: italic; … }
292:  [data-truncate='1']      { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
302:  [data-truncate]:not([data-truncate='1']) { display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; }
```

These are the only unprefixed selectors in the shipped globals (checked across `prose.css`, `icon.css`, `motion.css`, core `overlay.css` and all nine sheets in the components overlay aggregator — everything else is `.kj-*` or `[data-kj-*]`). `prose.css` ships as `@kouji-ui/core/typography/prose.css` and is registered globally (`angular.json:104`, via `core/src/styles.css`).

`data-tone` and `data-truncate` are extremely generic attribute names. A host app that already uses `data-tone` for anything — chart series tone, notification tone, its own design system — will find kouji-ui restyling its elements with `font-style: italic`, a 4px inline-start border, or `white-space: nowrap`. Because `kj.tone` / `kj.truncate` register after `kj.component` (F-8), the host's own layered CSS loses.

`density.css:120-134` has the milder version: `[data-density="compact"|"standard"|"comfortable"|"comfy"]` — global and unprefixed, but it only writes `--kj-*` custom properties, so a collision changes nothing visible unless the host also uses kouji-ui spacing.

**Fix** — prefix to `[data-kj-tone]` / `[data-kj-truncate]` (matching the `[data-kj-motion]`, `[data-kj-icon-mode]`, `[data-kj-drawer-container]` convention already in use) and update the `KjLead` / `KjMuted` / `KjCode` / `KjBlockquote` / `KjTruncate` host bindings. This is a breaking change for anyone hand-typing the attribute, so pair it with a minor bump and keep the old selectors for one release. `[data-density]` can stay, but say so explicitly in the README.

---

### F-14 `core/src/styles.css` is documented as the entry point but is neither shipped nor shippable; `@kouji-ui/components` has no `exports` map

Severity: **medium** · Confidence: **medium** · Effort: **M**

Files: `packages/core/src/styles.css:1-21`, `packages/core/ng-package.json:7-27`, `packages/core/package.json:55-70`, `packages/components/package.json`, `packages/components/ng-package.json:7-13`

```css
/* core/src/styles.css:2-6 */
   @kouji-ui/core — aggregated global stylesheet
   Single entry-point for the core-only global CSS pieces that
   ship without a corresponding Angular component …
/* :19-21 */
@import "./primitives/overlay/overlay.css";
@import "./typography/prose.css";
@import "./icon/icon.css";
```

`core/ng-package.json` copies four individual files to *flattened* output folders (`typography/prose.css`, `icon/icon.css`, `motion/motion.css`, `overlay/overlay.css`) and `core/package.json:55-70` exports exactly those four subpaths. `styles.css` is in neither list. Even if it were added as an asset, its three relative `@import`s point at `./primitives/overlay/…` and `./typography/…` — paths that don't exist in the flattened published layout, so they would resolve to nothing.

Net effect: the "single entry-point" the file advertises does not exist for an installed consumer, who must instead register three or four raw `node_modules/...` paths by hand (as `components/src/overlay/overlay.css:7-11` correctly instructs). The docs app works only because `angular.json:104` registers the *source* path. `motion.css` is exported but pulled in by nothing — not by `styles.css`, not by `angular.json` — and `kjMotion` has zero usages in `packages/components` or `apps/docs`, so the motion presets are dead weight in practice.

Asymmetry worth noting: `core/package.json` declares an `exports` map (CSS subpaths, but **no `"."` entry** — relying on ng-packagr to merge in the JS entry), while `components/package.json` declares **no `exports` map at all**. The documented consumer path `node_modules/@kouji-ui/components/src/overlay/overlay.css` is a filesystem path in `angular.json`, so Node's exports gate doesn't apply and it works — but `import '@kouji-ui/components/src/overlay/overlay.css'` from a bundler that honours `exports` would not resolve. `overlay-styles.spec.ts:182-196` asserts core's export entry exists but has no matching assertion for components.

No cross-package relative `@import` exists — every `@import` under `packages/` stays inside its own package root, verified across all 30 of them.

**Fix** — either (a) delete `styles.css` and document the four registerable files, or (b) keep it, ship it at the package root, and rewrite its imports to the *published* paths (`./overlay/overlay.css`, `./typography/prose.css`, `./icon/icon.css`, `./motion/motion.css`) via a build step. Add `"./src/overlay/overlay.css"` (or a `"./src/*.css"` wildcard) to `components/package.json` exports and extend `overlay-styles.spec.ts` to cover it. Decide whether `motion.css` belongs in the aggregator.

---

### F-15 Docs ship a hardcoded theme in the static HTML — guaranteed flash for every returning user; two themes unreachable

Severity: **low** · Confidence: **high** · Effort: **S**

Files: `apps/docs/src/index.html:2`, `apps/docs/src/app/services/theme.service.ts:7-16,49-67`

```html
<!-- index.html:2 -->
<html lang="en" data-theme="kouji">
```

```ts
/* theme.service.ts:49-66 */
  constructor() {
    afterNextRender(() => {
      const fromUrl = new URLSearchParams(window.location.search).get('theme');
      const fromStorage = localStorage.getItem('kj-theme');
      …
```

`outputMode: "static"` (`angular.json:109`) prerenders every page with `data-theme="kouji"` (near-black). A returning visitor whose `localStorage.kj-theme` is `light`, `sakura` or `dune` sees the dark brand theme paint first, then flip after hydration — a full-page colour inversion, not a subtle flash. There is no blocking inline script in `<head>` to read storage before first paint.

Separately, `Theme` / `AVAILABLE_THEMES` / `THEME_SCHEME` (`theme.service.ts:7-38`) list **13** themes. `packages/themes/src/index.css:16-17` ships **15** — `orrery` and `orrery-light` are imported into the bundle but have no entry in the union, so they cannot be selected in the docs, are absent from the theme picker, and have no directory under `reports/a11y/`. That is very likely why F-2's failures went unnoticed.

**Fix** — add a small inline `<script>` in `index.html` `<head>` that reads `localStorage.kj-theme` / `?theme=` and sets `documentElement.dataset.theme` before the first stylesheet applies (and, once F-4 lands, `style.colorScheme` too). Add `orrery` and `orrery-light` to the three constants.

---

### F-16 `--kj-color-icon-*` are frozen to the root theme, so `[kjIconColor]` ignores nested themes

Severity: **low** · Confidence: **high** · Effort: **S**

Files: `packages/themes/src/base.css:29,166-177`; `packages/core/src/icon/icon.directive.ts:107`

```css
/* base.css:29 + 172-177 — inside `:root`, @layer kj.base */
    --kj-color-icon-muted:   var(--kj-fg-muted);
    --kj-color-icon-primary: var(--kj-fg-primary);
    --kj-color-icon-success: var(--kj-fg-success);
    --kj-color-icon-warning: var(--kj-fg-warning);
    --kj-color-icon-danger:  var(--kj-fg-danger);
    --kj-color-icon-info:    var(--kj-fg-info);
```

```ts
/* icon.directive.ts:107 */
    return c && c !== 'inherit' ? `var(--kj-color-icon-${c})` : null;
```

Custom-property `var()` substitution happens at the element carrying the declaration. These six are declared on `:root`, so they resolve against `:root`'s `--kj-fg-*` and then inherit that *already-resolved colour* down the tree. Inside a nested `[data-theme]` subtree — the theme-generator preview stage, or an overlay whose wrapper got `data-theme` copied by `body-portal.ts:57-61` — an icon with `[kjIconColor]="'danger'"` paints the **outer** theme's danger colour, not the subtree's. Every other semantic token is immune, because themes declare them directly on the `[data-theme]` element.

If no `data-theme` is set at all (F-5) they are guaranteed-invalid and `color: var(--kj-color-icon-danger)` becomes `unset` → inherited colour, so coloured icons silently lose their colour.

**Fix** — move the six declarations out of `:root` and into `base.css`'s existing `@layer kj.reset { [data-theme] { … } }` block, so each theme root re-resolves them against its own `--kj-fg-*`.

---

### F-17 `core/src/styles/docs-themes.css` is a rival token namespace living inside the library source

Severity: **low** · Confidence: **medium** · Effort: **S**

Files: `packages/core/src/styles/docs-themes.css:6-33`; 20+ `packages/core/src/*/_examples/*.ts`

```css
/* docs-themes.css:6-31 */
@layer kj.tokens, kj.theme;
@layer kj.tokens {
  :root,
  .kj-theme-default {
    --kj-bg: #0c0c0c;  --kj-surface: #1a1a1a;  --kj-text: #f0ede6;
    --kj-border: #333;
    --kj-radius-sm: 0px;  --kj-radius-md: 0px;  --kj-radius-lg: 0px;
    --kj-shadow-sm: none;  --kj-shadow-md: none;  --kj-shadow-hard: none;
    --kj-transition: opacity 0.15s;
```

Four of these names — `--kj-border`, `--kj-shadow-sm`, `--kj-shadow-md`, `--kj-transition` — are entries in `themes.spec.ts`'s `REQUIRED_SHARED_TOKENS`, with completely different meanings and values. The file is pulled in by `styleUrls: ['../../styles/docs-themes.css']` on ~20 example components (`button.example.ts:8`, `dialog.example.ts:72`, …).

Under Angular's default emulated encapsulation the `:root` selector is rewritten with the component's content attribute and never matches, so today this does **not** leak — the shadow/border/transition tokens stay inside the example. That is why this is low, not high. But it is a live hazard: the moment one of those examples adds `ViewEncapsulation.None` (83 components in `packages/components` already do), `--kj-border: #333`, `--kj-shadow-sm: none` and `--kj-transition: opacity 0.15s` land on the real `:root` and break the theme contract globally.

It is also the reason `--kj-radius-sm` *looks* declared (three declarations in this file) while being undeclared for any consumer — which is what `sheet.css:74` is relying on (F-1).

**Fix** — move the file under `apps/docs` (it is docs-only; core's `ng-package.json` correctly doesn't ship it), rename its tokens off the `--kj-` prefix (`--docs-*`), and change the examples to use the real taxonomy so they double as documentation of the token system rather than contradicting it.

---

### F-18 Roughly fifteen invented token names in component CSS that resolve to nothing

Severity: **low** · Confidence: **high** · Effort: **M**

Beyond the two load-bearing cases in F-1 / F-10, component CSS reaches for token names that exist nowhere in `base.css`, `density.css` or any theme. These all have literal fallbacks, so nothing visibly breaks — but each is a documented-looking override hook that a consumer cannot actually use, and each is a naming-drift signal:

```
packages/components/src/action-sheet/action-sheet.css:33        var(--kj-bg-subtle, transparent)
packages/components/src/action-sheet/action-sheet.css:42,77     var(--kj-bg-muted, var(--kj-border-muted))
packages/components/src/action-sheet/action-sheet.css:57        var(--kj-danger-fg, var(--kj-danger, #d92d20))
packages/components/src/action-sheet/action-sheet.css:60        var(--kj-danger-bg-subtle, …)
packages/components/src/direction-toggle/direction-toggle.css:12  var(--kj-border-color, currentColor)
packages/components/src/direction-toggle/direction-toggle.css:39  var(--kj-bg-subtle-hover, …)
packages/components/src/date-range-presets/date-range-presets.css:8  var(--kj-border-subtle, transparent)
packages/components/src/table/table.css:63                      var(--kj-table-header-bg, var(--kj-bg-surface))
packages/components/src/table/table.css:444                     var(--kj-fg-error, var(--kj-fg-default))
packages/components/src/button/button.css:129,134               var(--kj-segmented-bg-on, …) / var(--kj-segmented-fg-on, …)
packages/components/src/rich-text/rich-text-editor.css:119      var(--kj-bg-subtle, var(--kj-bg-body))
```

Note `--kj-fg-error` vs the contract's `--kj-fg-danger`, `--kj-border-color` vs `--kj-border-default`, `--kj-danger` vs `--kj-fg-danger` / `--kj-bg-danger`. One fallback is also numerically wrong: `command-palette.css:60,104` use `var(--kj-space-lg, 1.25rem)` where `--kj-space-lg` is 1rem.

**Fix** — either promote the useful ones (`--kj-table-header-bg`, `--kj-segmented-bg-on/fg-on` are reasonable component knobs — declare them alongside the other `--kj-<component>-*` knobs in the same file) or delete them in favour of the existing semantic tokens. The F-1 lint (reject a `var()` chain whose innermost fallback isn't a literal; warn on any `--kj-` name absent from a known-token manifest) catches the whole class.

---

### F-19 `reports/a11y/_summary.json` cannot substantiate the theme contrast claims

Severity: **low** · Confidence: **high** · Effort: **S**

Files: `reports/a11y/_summary.json`, `reports/a11y/<theme>/*.json`

```json
{ "schemaVersion": 1, "timestamp": "2026-05-13T20:56:31.125Z",
  "themes": { "mint": { "axeViolationsByImpact": {"critical":0,"serious":1,"moderate":0,"minor":0},
                        "fontWarnings": 29, "lighthouseAvg": {"performance": 41} } } }
```

Reconciliation against this audit:

- The summary carries **one theme** (`mint`), though 13 theme directories exist on disk — and `orrery` / `orrery-light`, the two themes this audit found failing (F-2), have no directory at all, consistent with F-15's missing union entries.
- Timestamp is 2026-05-13, roughly four months before HEAD; it predates every change in `fd6dd34e..HEAD` (the overlay stack rework, list scoping, the core CSS export).
- Coverage is six docs pages (`/`, `getting-started`, `theme-generator`, `docs-button`, `docs-dialog`, `docs-tag`). axe's `color-contrast` rule only evaluates *rendered* nodes, so a token pair never painted on those six pages is untested — which is exactly why `retro`'s `fg-on-danger` and `orrery-light`'s class-C colours show clean.
- The per-page payload records `axe.violations`, `fonts.samples` and `lighthouse`. It records **no computed contrast ratios**, so it cannot be diffed against the numbers in F-2 / F-3.
- `mint/home.json` reports `violations: []`, `passes: 32` — a true result for that page, not evidence about the theme.

The one interesting signal it does carry: `mint/home.json` shows `h1 { font-family: "system-ui, -apple-system, sans-serif" }` while `body` is JetBrains Mono — i.e. `--kj-font-display` falling through to the `base.css:105` sans default. Correct by design, but worth knowing when reading the 29 `fontWarnings`.

**Fix** — replace or augment this with a static contrast spec in `packages/themes` that parses every theme file, resolves `var()` / `oklch()` / `color-mix()`, and asserts the documented pairs. Static analysis covers all 15 themes in milliseconds and needs no browser; keep axe for the DOM-shaped rules it is actually good at.

## Carried forward from the 2026-09-06 review

Filed in the previous pass (report at `9aee150a`, audited at `fd6dd34e`), **not** re-filed by this
audit, and re-verified as still true at HEAD. Ids F-1…F-19 above are unchanged.

### F-20 `--kj-border-default` fails WCAG 1.4.11 (3:1) in 13 of 15 themes — it is the sole boundary of every idle input and unchecked checkbox

**Severity:** medium · **Confidence:** high · *(carried forward — prev F-4; this pass demoted it to Open question 1, which this reconciliation does not endorse)*
**Files:** 13 of 15 in `packages/themes/src/themes/`, `packages/components/src/input/input.css:11`, `packages/components/src/checkbox/checkbox.css:24`

Re-verified at HEAD: `input.css:11` is `--kj-input-border-color: var(--kj-border-default);` and it is the element's **only** boundary (`input.css:31`, `border: … var(--kj-input-border-color)`); `checkbox.css:24` is `--kj-checkbox-border: var(--kj-border-default);` consumed at `:34`. Sample values unchanged: `kouji.css:88` `#1a1a1a` on `:27` `#0c0c0c` = 1.12:1; `light.css:79` `#e8e6e0` on `:29` `#ffffff` = 1.25:1; `retro.css:69` `#d6c89a` on `:25` `#ede5d0` = 1.33:1. The prev pass computed 1.12–1.63:1 across 13 themes, with only bauhaus (15.18) and cyberpunk (16.48) passing.

The prev pass also established the two things that make this a real 1.4.11 failure rather than a decorative-border exemption, and both still hold: `--kj-border-strong` is no usable fallback (it misses 3:1 in 12 of 15), and no fill cue rescues identification — `--kj-bg-field` vs `--kj-bg-body` is 1.06–1.45:1 in every theme, and the unchecked `.kj-checkbox-box` is `bg-body` plus a 1px `border-default`. Where the control has **no perceivable boundary at all**, 1.4.11 applies; that is not the decorative case.

This audit reached the same facts (Open question 1 quotes the same 1.12/1.14/1.25/1.26/1.63 figures and the same `light.css` field-on-body example) but filed them as a question rather than a finding. The prior pass verified it and is restored here as a finding.

**Fix:** darken/lighten `--kj-border-default` per theme to ≥ 3:1 against both `bg-body` and `bg-field`, or introduce `--kj-border-control` for control boundaries and keep `--kj-border-default` decorative. Then machine-enforce it: `apps/docs/src/app/lib/theme/theme-a11y-report.ts` already models 1.4.11 but its `NON_TEXT_PAIRS` covers only `bg-elevated × bg-body/bg-surface` — add `border-default × bg-body` and `border-default × bg-field`, plus a contrast assertion in `packages/themes/src/themes.spec.ts`. (Same guard as F-3's fix; do them together.) **Effort:** M

---

### F-21 ~28 KB of overlay CSS is shipped twice

**Severity:** medium · **Confidence:** high · *(carried forward — prev F-13; now *more* live than when filed, because #71 shipped the aggregator)*
**Files:** `packages/components/src/overlay/overlay.css:37-45`, `angular.json` (docs `styles` array), `packages/components/src/{dialog,popover,tooltip,dropdown-menu,drawer,toast,confirm-popup,sheet,action-sheet}/*.ts`

The aggregator imports nine stylesheets (`overlay.css:37-45`), and every one is *also* a `styleUrl` on its wrapper component with `ViewEncapsulation.None` — re-verified at HEAD: `dialog.ts:77`, `popover.ts:93`, `tooltip.ts:97`, `sheet.ts:81`, `action-sheet.ts:128` (and `dropdown-menu.ts`, `drawer.ts`, `toast.ts` twice, `confirm-popup.ts` twice). Those nine files totalled 27,943 bytes at the prev pass — ~9% of all component CSS — emitted once into the global bundle and again inlined into component chunks.

Worth re-filing precisely *because* prev F-1 was fixed: before `fb1d1956` the aggregator shipped nowhere, so the duplication was in-repo only. Now `packages/components/ng-package.json` copies `src/**/*.css` into the tarball and the aggregator's header tells consumers to register it, so a consumer who follows the documented setup **and** renders the wrapper components genuinely downloads both copies.

Also: universal `ViewEncapsulation.None` means a component's CSS only exists in the document once that component has rendered, so a lazy route that first mounts a themed component paints unstyled for a frame.

**Fix:** pick one delivery path — drop the `styleUrl` from the nine wrappers and let the aggregator be the single source, or drop the aggregator and document per-component CSS imports. Whichever wins, `overlay.css`'s own header must say so. **Effort:** M

---

### F-22 `color-picker` hard-codes achromatic chrome that breaks in dark themes

**Severity:** low · **Confidence:** high · *(carried forward — prev F-14)*
**Files:** `packages/components/src/color-picker/color-picker.css:73-74,122-123,131-132`

Unchanged at HEAD:

```css
/* :73-74 */
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px #000, 0 0 4px rgb(0 0 0 / 0.4);
/* :122-123 and :131-132 */
    background: #fff;
    border: 2px solid #000;
```

The spectrum gradients and the alpha checkerboard are legitimately raw — they *are* the colour space. The thumb/handle chrome is not: `#fff` on a near-white swatch and `#000` rails against kouji's `#0c0c0c` both disappear. This is the only component CSS in the repo with truly un-tokenised colour; everywhere else a hex literal appears it is a `var(--kj-…, #hex)` fallback.

**Fix:** source thumb chrome from `var(--kj-bg-elevated)` / `var(--kj-border-strong)`, or keep the double-ring trick with both rings tokenised. **Effort:** S

---

### F-23 The theme generator emits two dead tokens and omits six required ones

**Severity:** low · **Confidence:** high · *(carried forward — prev F-15)*
**Files:** `apps/docs/src/app/lib/theme/serialize-theme.ts:44-45,47-104`, `packages/themes/src/themes.spec.ts:15-20`

Unchanged at HEAD — `serialize-theme.ts:44-45` still pushes `--kj-text-body` and `--kj-text-small`, names nothing in the library reads (the real names are `--kj-text-base` / `--kj-text-sm`, `packages/themes/src/density.css:84-85`), so the generator's typography sliders produce CSS that changes nothing. Conversely `REQUIRED_SHARED_TOKENS` mandates the six `--kj-bg-*-subtle` surfaces and `serializeToScopedBlock` emits none of them, so every generated theme fails the contract the built-in themes are held to. The generated block is also a raw unlayered `<style>`, so it outranks even `kj.component` — unlike a built-in theme in `kj.shared`.

Note this interacts with F-2 and F-3's fix: `serialize-theme.ts:26` *does* emit `color-scheme` (it is the only place in the repo that does — see F-4), so the generator is ahead of the shipped themes on one axis and behind on several others.

**Fix:** emit `--kj-text-base` / `--kj-text-sm`; derive and emit the six `*-subtle` surfaces; wrap the block in `@layer kj.shared`; add `--kj-chart-*`, `--kj-radius-box-lg` and `color-scheme` to `REQUIRED_SHARED_TOKENS`; and run `serializeToScopedBlock`'s output through that same assertion. **Effort:** M

---

## Changed since the 2026-09-06 review

Previous report: `git show 9aee150a:reports/review/02-styles-theming.md`, audited at `fd6dd34e`.
Range since: `fd6dd34e..HEAD` (8 commits). Every "Fixed" claim was verified against the code at HEAD.

### Fixed

- **prev F-1 — "Overlay primitive CSS and the documented overlay aggregator ship in no tarball — service-launched overlays lose their backdrop; sheets lose their skin."** Fixed by `fb1d1956` *fix(list,overlay): scope list items to their own container; publish the overlay surface CSS (#71)*. Verified at HEAD on all four counts the prev finding raised:
  - `packages/core/ng-package.json` now carries a fourth `assets` entry — `{ "input": "src/primitives/overlay", "glob": "overlay.css", "output": "overlay" }` — alongside typography/icon/motion.
  - `packages/core/package.json`'s `exports` map now opens with `"./overlay/overlay.css": { "style": "./overlay/overlay.css", "default": "./overlay/overlay.css" }`, so the backdrop rule (`packages/core/src/primitives/overlay/overlay.css:39-45`, `.kj-backdrop, .kj-overlay-backdrop { position:absolute; inset:0; background: var(--kj-backdrop-bg, …); pointer-events:auto }`) is installable. Service-launched dialog / drawer / sheet / command-palette backdrops now have a dim and a hit area.
  - `packages/components/ng-package.json` now has `assets: [{ "input": "src", "glob": "**/*.css", "output": "src" }]`, so the aggregator and every component stylesheet are emitted — which is why service-launched sheets and action sheets are no longer unstyled.
  - The cross-package relative `@import "../../../core/src/primitives/overlay/overlay.css"` is **gone**. `packages/components/src/overlay/overlay.css` now imports nine sibling paths only (`:37-45`) and its header explicitly documents why (`:27-34`: "The core primitive is NOT imported from here — CSS cannot reach across packages by relative path once installed").
  - The guard the prev finding asked for exists: `packages/components/src/overlay/overlay-stacking.spec.ts:96-196` flattens the `@import` graph, asserts every overlay-family sheet is in the aggregator, and asserts the `ng-package.json` asset glob that makes the relative imports survive publication.

  **One half is still open** and is re-filed as current **F-14**: `packages/core/src/styles.css` is still documented as an entry point but is neither shipped nor shippable, and `packages/components/package.json` still declares **no `exports` map at all** (verified — the file has `peerDependencies`, `dependencies`, `publishConfig` and no `exports` key), so the components CSS is reachable only by deep path into `node_modules/@kouji-ui/components/src/…`.

No other previous styles finding is fixed. `2948c5b5` (#69) touched `sheet.css` / `action-sheet.css` only for the z-index migration.

### Still open

| prev id | prev title (abbreviated) | current id |
|---|---|---|
| F-2 | Ten globally-injected style sources skip `@layer kj.component` | **F-7** |
| F-3 | `kj.prose` / `kj.tone` / `kj.truncate` not in the canonical `@layer` statement | **F-8** |
| F-4 | `--kj-border-default` fails 1.4.11 in 13 of 15 themes | **F-20** (carried forward above; this pass had it as Open question 1) |
| F-5 | `orrery-light` `fg-subtle` + six class-C intents below AA | **F-2** |
| F-6 | A second, undefined token vocabulary — seven component families un-themed | split across **F-18** (the ~15 invented names), **F-1** (`--kj-focus-ring-*` / `--kj-primary`, the two that go invalid), **F-10** (`--kj-space-2xs`), **F-12** (the `prose.css` namespace), **F-6** (`--kj-bg-overlay`) |
| F-7 | No `color-scheme`; no theme at all without `data-theme` | split into **F-4** (`color-scheme`) and **F-5** (no `:root` / `prefers-color-scheme` default) |
| F-8 | `--kj-color-icon-*` resolved at `:root`, nested `[data-theme]` gets wrong icons | **F-16** |
| F-9 | SSR + FOUC: theme hard-coded in `index.html` | **F-15** |
| F-10 | Density scales two components; 36 sheets hard-code 99 font sizes | **F-11** |
| F-11 | `docs-themes.css` writes contract token names into `:root` from a later layer | **F-17** |
| F-12 | `[data-tone]` / `[data-truncate]` bare global attribute selectors | **F-13** |
| F-13 | ~28 KB of overlay CSS shipped twice | **F-21** (carried forward above) |
| F-14 | `color-picker` hard-codes achromatic chrome | **F-22** (carried forward above) |
| F-15 | Theme generator emits two dead tokens, omits six required ones | **F-23** (carried forward above) |

### Not reproduced

- **Fixed:** prev F-1 only (and only the packaging half — see the caveat above, re-filed as current F-14).
- **Missed by this pass and now restored:** prev F-13, F-14 and F-15. All three were re-verified true at HEAD and re-filed above as F-21…F-23. Honest cause: this pass worked from the token/cascade/contrast angle and did not re-walk delivery-path duplication, the one un-tokenised stylesheet, or the docs-side generator. prev F-13 in particular got *worse*, not better, because the aggregator now actually ships.
- **Deliberately demoted rather than dropped:** prev F-4, filed this pass as Open question 1. The prev pass verified the ratios, verified that `--kj-border-strong` is no fallback, and verified that no fill cue rescues identification — that is a finding, and it is restored as F-20.
- **Wrong in the previous pass:** nothing was refuted by this audit's evidence. Two prev findings were *narrowed* rather than contradicted: prev F-5's "measured against white" root-cause claim is withdrawn in current F-2's verification block (the annotations match no background in the file), and prev F-4's per-theme count (13 of 15, not 15) was already corrected in the prev pass's own verification.
- **Out of this dimension's scope:** none — every prev finding is accounted for above.

### New since then

- **F-1 — two focus rings resolve to nothing.** New as a *finding*, though the prev pass found the mechanism: prev F-6 noted in passing that "because `--kj-focus-ring-color` falls back to `var(--kj-primary)` — also undefined — the entire `outline` shorthand is invalid". This pass promotes it to its own high finding with the full invalid-at-computed-value-time chain, the two exact files, and the crucial packaging detail the prev pass could not have known: after `#71` the aggregator ships, so `overlay.css:44-45` is now a live delivery path to consumers rather than a docs-only one.
- **F-3 — `retro`'s focus ring at 2.27:1 and `fg-on-danger` at 3.18:1.** The prev pass listed both figures inside F-4's verification block as items to "split out into separate, lower-severity findings". This pass did that split. Counts as new only in the sense of being filed; the prior pass identified the values.
- **F-5 — with no `[data-theme]` the library renders unstyled.** Separated from prev F-7 into its own finding.
- **F-6 — `--kj-bg-overlay` is a dead token; every scrim and hover tint is hardcoded.** New.
- **F-9 — `.kj-card[data-shadow="lift"]` is a no-op in all 15 themes.** New.
- **F-14 — `core/src/styles.css` is neither shipped nor shippable; `@kouji-ui/components` has no `exports` map.** New, and it is the residue of prev F-1 that `#71` did not cover.
- **F-19 — `reports/a11y/_summary.json` cannot substantiate the theme contrast claims.** New; the prev pass touched the a11y artefacts only to correct a "0 serious" reconciliation sentence.

## Recommended work items

1. **Fix the two dead focus rings and the dead menubar spacing** (F-1, F-10) — four one-line edits: `sheet.css:72` and `action-sheet.css:47` → `outline: 2px solid var(--kj-border-focus)`; `sheet.css:74` → `var(--kj-radius-field)`; `menubar.css:7-8` → `var(--kj-space-xs)`.
2. **Add a token-resolution spec** (F-1, F-10, F-18) — walk `packages/**/*.css`, collect declarations and `var()` uses, fail on any chain whose innermost fallback is an undeclared `var()`, warn on undeclared names. Highest-leverage item on this list: it would have caught three of these findings mechanically.
3. **Fix the contrast failures** (F-2, F-3) — `orrery-light` class-C + `fg-subtle`; `retro` `border-focus` + `fg-on-danger`; `forest` `fg-danger`. Correct the misleading inline ratio comments in the same pass.
4. **Add a static contrast spec** (F-19, F-2, F-3) next to `themes.spec.ts`, covering all 15 themes and the pair list used above.
5. **Declare `color-scheme` in every theme** (F-4) and assert it in `themes.spec.ts`.
6. **Give `base.css` a `:root` fallback theme** (F-5) so an unthemed app degrades to readable instead of transparent.
7. **Wrap the ten unlayered stylesheets in `@layer kj.component`** and pin the layer order (F-7, F-8) — including `icon.css` — and decide where `kj.prose` / `kj.tone` / `kj.truncate` belong. Update `density.spec.ts:37`.
8. **Wire the scrims and hover tints to tokens** (F-6): `--kj-bg-overlay` into dialog / drawer / command-palette / core backdrop; `color-mix` for the alert and toast dismiss hovers.
9. **Fix `.kj-card[data-shadow="lift"]`** and clean up the stale `--kj-button-shadow` comments in `base.css:18-19` / `button.css:23-30` (F-9).
10. **Re-point `prose.css` onto the real token taxonomy** (F-12) and prefix `[data-tone]` / `[data-truncate]` (F-13) in the same breaking-change window.
11. **Settle the packaging story** (F-14): fix or delete `core/src/styles.css`; add an `exports` map to `@kouji-ui/components`; extend `overlay-styles.spec.ts` to cover it; decide whether `motion.css` joins the aggregator.
12. **Density sweep of `packages/components/src/**/*.css`** (F-11) — control heights onto `--kj-ctl-h-*`, spacing onto `--kj-space-*`, WCAG 2.5.5 floors kept as explicit `max()` with a comment.
13. **Docs housekeeping** (F-15, F-16, F-17): pre-paint theme script in `index.html`; add `orrery` / `orrery-light` to the three theme constants; move `docs-themes.css` into `apps/docs` and rename its tokens; move `--kj-color-icon-*` into the `[data-theme]` reset block.

## Open questions

1. *(Answered by reconciliation: the prior pass verified this and it is now filed as **F-20**, not a question.)* **Is a 1.1–1.6:1 `--kj-border-default` on `bg-body` intentional?** Thirteen of fifteen themes sit there (`kouji` 1.12, `orrery-light` 1.14, `light` 1.25, `corporate` 1.26 … `forest` 1.63). Decorative borders are exempt from 1.4.11, but `input.css`, `select.css` and friends use `--kj-border-default` as the *only* boundary of a text field. Where the field's fill also matches the page (`light.css`: `bg-field #f6f6f4` on `bg-body #ffffff`) the control has no perceivable boundary at all and 1.4.11 does apply. Should there be a separate `--kj-border-control` held at ≥ 3:1?
2. **What is the intended cascade position of `kj.prose` / `kj.tone` / `kj.truncate`?** Before or after `kj.component`? The answer decides whether a component can restyle prose inside itself, and it needs to be in the published layer statement either way.
3. **Is `@scope` (`kouji.css:127`) inside the stated browser-support baseline?** It has no fallback path; in an engine without `@scope` the whole block is dropped and kouji's lime button hover disappears.
4. **Should `--kj-button-shadow` still exist as a concept?** No theme sets it, `base.css` resets it, `button.css` documents pages opting in at their own scope, and `card.css` tries (and fails) to borrow it. Either give kouji/bauhaus their offset blocks back or retire the token.
5. **`kjMotion` has zero usages** in `packages/components` and `apps/docs`, and `motion.css` is registered by nothing. Is the motion library staged for adoption, or should it absorb the hand-rolled `@keyframes` currently living in overlay / toast / drawer / command-palette CSS?
6. **Were `orrery` / `orrery-light` meant to ship in `index.css` yet?** They are in the CSS bundle but absent from the docs theme union and from every a11y artefact — an intentional soft launch, or an incomplete landing?
