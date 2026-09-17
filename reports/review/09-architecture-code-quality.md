# Architecture, Directive Design & Code Quality Review

## Verdict

One coherent architecture, described by a rules set that has fallen behind it in three specific, load-bearing places. The *code* is genuinely modern and largely consistent: signal inputs everywhere (only 7 decorator holdovers across ~750 source files), zero `Renderer2`, real reusable primitives (`primitives/list/{navigator,selection,filterable-list,scope}`, `primitives/overlay/{controller,stack,panel,strategies}`) that feature directives actually compose rather than re-implement, a clean strategy-based overlay with no duplicated positioning math, and 1,366 real behavioural tests. The *rules* say core has zero CSS (it ships 592 lines and 16 `@Component`s), say `ViewEncapsulation.None` is banned (188 uses), and say every public binding carries a `kj` prefix "no exceptions" (102 unprefixed bindings in `@kouji-ui/components`, 7 classes mixing both conventions). None of those three rules is machine-enforced — ESLint checks only the selector prefix, there is no stylelint, and CI has not run a single test since 2026-05-07, under which gate 47 of the repo's 50 release tags shipped. The one finding a consumer will trip over today is the missing `booleanAttribute` transform on ~95 boolean inputs, which silently no-ops the bare-attribute form the library teaches elsewhere — including in the `<kj-tag kjTagSelectable>` TSDoc snippet (IDE hover on the published `.d.ts`; **not** the docs site, which renders only correctly-bound `@doc-example` files). **Grade: B−** — good bones, unpoliced edges, and a release pipeline that publishes without testing.

> **Verification (2026-09-15).** F-1 was attacked on every axis and **held at high** — its scale claim was in fact *understated* (274 spec files / 2,042 `it()` blocks, not 214 / 1,366). F-2 was **downgraded high → medium**: the mechanism is real but the "published example is broken" framing, one cited snippet, the `tabindex="0"` claim, and the 105 count all overstate it. Correction notes are inline in each finding. Statistics elsewhere in this verdict (188 `ViewEncapsulation.None`, 102 unprefixed bindings, 592 lines of core CSS, 1,366 tests) were **not** re-verified in this pass — the test count above is now known to be wrong, so treat the others as unaudited.

## What works

- **Dependency direction is clean.** `packages/core/src` contains zero imports from `@kouji-ui/components` or `@kouji-ui/themes` (only prose references inside TSDoc); `packages/components` imports `@kouji-ui/core` through the public entry point 228 times and never deep-imports `../../core/src`.
- **Context pattern is uniform and idiomatic.** All 34 `*.context.ts` files follow one shape — an exported `interface Kj*Context` of `Signal<…>` + methods, and an `InjectionToken` beside it (`packages/core/src/tabs/tabs.context.ts:14-32`, `packages/core/src/field/field.context.ts:8-28`). Roots provide with `useExisting: forwardRef(() => Self)` (52 sites); children inject the token, never the class. `skipSelf` is used correctly where a root can nest inside itself (`packages/core/src/button/button.ts:88`).
- **Overlay is a real strategy system, not copy-paste.** `KjPopoverContent` and `KjTooltipContent` differ only in provider values (`packages/core/src/popover/popover-content.ts:18-23` vs `packages/core/src/tooltip/tooltip-content.ts:20-23`) — mount, position and focus-trap behaviour all come from injected strategies.
- **List primitives are genuinely shared.** `KjFilterableList` is composed by both filtering consumers (`combobox-root.ts:77`, `command-palette.ts:65`); `scope.ts` / `ownListItems` (added since `fd6dd34e`) fixed nested-list bleed once, centrally, for all seven list roots.
- **Modern lifecycle dominates.** 113 `afterNextRender`/`afterRender` sites and 72 `DestroyRef` sites against 34 legacy lifecycle hooks — and the surviving hooks carry written justifications (`packages/core/src/chat/chat.ts:33-37`, `packages/core/src/tabs/tabs.ts:217-221`).
- **Core test coverage and test quality.** 145 spec files in `packages/core/src` over 68 features; only `overflow/` has none. Specs assert behaviour, not existence — `packages/components/src/overlay/overlay-styles.spec.ts` walks `document.styleSheets` for a rule that both matches and fills the panel, and asserts `ng-package.json` actually ships the sheet.
- **TSDoc discipline at class level is high**: 253/260 exported `Kj*` classes in core and 248/257 in components carry a leading TSDoc block (the 9 misses in components are all `*.playground.ts` demo hosts).
- **A docs bundle budget exists and is enforced** — `angular.json:124-133` (`initial` 800 kB warn / 1500 kB error), and CI does run `pnpm build`.

## Findings

### F-1 CI runs no tests; 47 of 50 releases shipped under a lint-and-build-only gate

**Severity:** high · **Confidence:** high
**Files:** `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.husky/pre-push`

> **Verification (2026-09-15).** Refutation attempted on every axis; the finding **held at
> high**. Quotes are verbatim, the git claims reproduce exactly (`4b7487fe`, 2026-05-07,
> "chore(ci): disable test + e2e steps temporarily"; 50 `@kouji-ui/*` tags total, 47 after
> that timestamp), and no mitigation exists anywhere — the only test invocations under
> `.github/` are the three commented lines, `pre-push` is the only husky hook, and there is
> no alternate CI config at the repo root. One causal overreach in "why it matters" is
> corrected below; it does not touch the finding's substance or severity.

```yaml
# .github/workflows/ci.yml:28-40
      - name: Lint
        run: pnpm lint

      - name: Build
        run: pnpm build

      # NOTE: Test + E2E temporarily disabled — being fixed in a separate scope.
      # - name: Install Playwright browsers
      #   run: pnpm exec playwright install --with-deps chromium
      # - name: Test
      #   run: pnpm test
      # - name: E2E
      #   run: pnpm test:e2e
```

```yaml
# .github/workflows/release.yml:4-14
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]
...
    if: ${{ github.event.workflow_run.conclusion == 'success' && ... }}
```

Quantified: the disabling commit is `4b7487fe` (2026-05-07). 47 of the repo's 50 `@kouji-ui/*` tags point at commits dated after it — i.e. every release from `@kouji-ui/core@0.1.1` / `@kouji-ui/components@0.1.1` onward was published to npm with the entire test suite unexecuted. The gate `release.yml` waits on is `CI`, and `CI` is `pnpm lint && pnpm build`.

The fallback is also empty: `.husky/pre-push` runs `pnpm lint` and `changeset status` only, and its own comment says it skips in CI because "the workflow already enforces" these gates — true for lint, false for tests.

**Why it matters:** **274** spec files carrying **2,042** `it()`/`test()` blocks, plus
**22** Playwright specs under `apps/docs/e2e/`, are dead weight in the pipeline.
*(Counts recounted at HEAD; the first draft said 214 spec files / 1,366 blocks / 23 e2e
specs — the scale was **understated**, not exaggerated.)*

The team writes substantial regression specs alongside every fix — `backdrop-press.spec.ts`
(243 lines) and `dismiss-press.spec.ts` (154 lines) in `e6aa28a5`; `nested-list-scope.spec.ts`
(274), `overlay-styles.spec.ts` (208) and `list/scope.spec.ts` (99) in `fb1d1956` — yet the
pipeline will never execute one of them. Those specs were authored *as part of* the fixes, so
they did not pre-exist to catch the bugs; the real consequence is forward-looking: **these
exact bugs can regress silently into a subsequent publish with nothing to catch them.**
*(An earlier draft implied the overlay/backdrop/list-scoping regressions "reached npm first"
because the suite was not running. That causal claim is withdrawn — it is not what happened.)*

Two aggravating details:

- **The docs deploy rides the same gate.** `.github/workflows/deploy-docs.yml:4-8` also keys
  on `workflow_run: workflows: ["CI"]` with `conclusion == 'success'` (`:18`), so the Render
  docs deploy is gated on lint-and-build only too.
- **The hook's stated rationale is now false.** `.husky/pre-push:3-4` says it skips in CI
  because "the workflow already enforces" these gates — true for lint, false for tests. No
  layer — local hook, CI, or release — runs the suite, and the hook's comment actively
  conceals that.

Finally, the steps were **not** disabled for lack of working scripts: `"test": "turbo run test"`
and `"test:e2e": "turbo run test:e2e"` are live tasks in the root `package.json:7,10`. Re-enabling
is a matter of uncommenting plus fixing whatever failures prompted `4b7487fe`. The "temporarily"
in the comment has now spanned 2026-05-07 → 2026-09-15 — just over four months and 47 releases.

**Fix:** Re-enable `pnpm test` in `ci.yml`. If some specs are currently red, quarantine those *files* explicitly (a `vitest --exclude` list checked into the config with a tracking issue per entry) rather than the whole step; a named quarantine list shrinks, a commented-out step does not. Add `pnpm test:e2e` as a separate job so a flaky browser run cannot block publishing on its own. **Effort: S** (the step already exists; the work is triaging whatever is red).

---

### F-2 ~95 boolean inputs omit `booleanAttribute`, so the bare-attribute form the library teaches elsewhere silently no-ops

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/tag/tag.ts:41,59,82,95,114,125-131,134-137,140-145,175,200`,
`packages/components/src/tag/tag.ts:43`, `packages/core/src/a11y/disabled.ts:24,31`,
`packages/core/src/button/button.ts:125-131`, `apps/docs/src/lib/examples.ts:45-47`

> **Verification (2026-09-15).** The core defect is real and every quoted line is accurate.
> **Downgraded high → medium**: four overstatements did not survive — the "published
> `@example` is broken" framing, one of the two cited broken snippets, the `tabindex="0"`
> claim, and the count. Net: one genuinely broken artifact (a TSDoc snippet visible on IDE
> hover) plus a real latent API-surface inconsistency across ~95 inputs.

**The mechanism (confirmed).** `booleanAttribute` is applied to **225** inputs and omitted
on roughly **95** — 34 `input(false)`, 1 `input(true)`, and ~58 `input<boolean>(…)`.
*(The first draft's 105 double-counts multi-line declarations that **do** carry a transform:
`confirm-popup.ts:71`, `field.ts:59/65/72`, `input-group-addon.ts:68`, `toast.ts:231`.)*

A bare attribute binds the string `''`, which is falsy, so an untransformed input stays
`false`. Angular does **not** type-check static attributes against inputs, so there is no
compile error. Meanwhile shipped examples do teach the bare form on inputs that *do*
transform (`dropdown-menu/_examples/dropdown-menu.disabled.example.ts:15`,
`cascade-select/_examples/cascade-select.disabled.example.ts:43`). The same attribute name
therefore works on one directive and silently no-ops on another.

The contrast proves the mechanism: `accordion.ts:88` has the transform and
`accordion.spec.ts:202,229` drive real focus assertions through the bare form, whereas
`list.ts:160` lacks it and `list.spec.ts:136` bare-attributes `kjArrowNavigation` in a test
that asserts nothing about the flag. No lint rule, no policy doc, no fix in history, no
selector fallback.

**(a) The shipped `@example` — correctly scoped.** `packages/components/src/tag/tag.ts:43`
(mirrored at `packages/core/src/tag/tag.ts:41`) ships:

```
 * <kj-tag kjTagSelectable [(kjTagSelected)]="on">Filter</kj-tag>
```

With `tag.ts:82` (`readonly kjTagSelectable = input(false);`) untransformed,
`computedRole()` at `:129` never returns `'button'` and `computedPressed()` at `:142` stays
`null` — so the chip in that snippet is not interactive.

*But the "published docs are broken" framing fails.* `apps/docs/src/lib/examples.ts:45-47`
states plainly that plain `@example` tags "are **NOT** used as doc site previews", and
`getJsDocExamples` has **zero call sites** in `apps/`. Every rendered `@doc-example` file
uses the correct bound form — `[kjTagSelectable]="true"` at
`tag.selectable.example.ts:24-26`, `tag.list.example.ts:24-28`, `tag.usage.example.ts:47-49`.
**The exposure is IDE hover on the emitted `.d.ts`, not the docs site.**

**(b) `kjTagDisabled` has two owners with divergent transforms — the real API bug.**

```ts
// packages/core/src/tag/tag.ts:59
{ directive: KjDisabled, inputs: ['kjDisabled: kjTagDisabled'] },   // KjDisabled DOES transform (disabled.ts:31)
// packages/core/src/tag/tag.ts:95
readonly kjTagDisabled = input(false);                              // this copy does NOT
// packages/core/src/tag/tag.ts:114
readonly disabled: Signal<boolean> = computed(() => this.kjTagDisabled() || …);
```

`KjTag.disabled()` gates `computedTabindex()` (`:135`), `onClick()` (`:175`) and `remove()`
(`:200`), and both owners host-bind `[attr.aria-disabled]` on the **same element**
(`tag.ts:67` vs `disabled.ts:24`). Under a bare attribute the two disagree.

**Withdrawn (did not survive verification)**

- *The second "broken snippet".* `tag-list.ts:32-33` nests its chips under
  `kjTagListRole="listbox"`, so `computedRole()` returns `'option'` at `tag.ts:127` **before**
  the `kjTagSelectable` branch at `:129` is reached, and `onClick` toggles on `'option'`
  (`tag.ts:180`). That snippet is fine.
- *"The tag keeps `tabindex="0"`."* Wrong in the case described: with bare `kjTagDisabled`
  alone, `computedRole()` is `null`, so `computedTabindex()` returns `null` at `:135` — no
  `tabindex` is emitted at all. The focusable-but-unguarded chip requires the **mixed** form
  `<kj-tag [kjTagSelectable]="true" kjTagDisabled>`, which nothing in the repo writes.
- *The button case is latent, not live.* There are **zero** bare-attribute uses of
  `kjDisabled` / `kjLoading` / `kjFullWidth` on `<kj-button>` anywhere in the repo;
  `button.ts:125-131` is inconsistency waiting to be tripped, not a live defect.

**Fix:** Add `transform: booleanAttribute` across the untransformed boolean inputs, starting
with `tag.ts:82` and `:95` so the two `kjTagDisabled` owners agree — better, delete the
duplicate `kjTagDisabled` field and read the composed `KjDisabled` instance
(`inject(KjDisabled).disabled`) so one public name has one owner. Add an ESLint rule or a
docgen check enforcing the transform (`eslint.config.js` has none today). Add one spec per
affected directive exercising the **bare-attribute** form: `tag.spec.ts` only ever uses the
bound form (lines 22, 35, 56, 83, 97), and `list.spec.ts:136` bare-attributes
`kjArrowNavigation` in a test that asserts nothing about it. **Effort: M**

---

### F-3 `@angular/cdk` is a required peer dependency of both published packages and nothing imports it

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/package.json`, `packages/components/package.json`, `rules/stack.md`

```jsonc
// packages/core/package.json:4
  "description": "Headless Angular 21 UI primitives — directives over CDK with WCAG 2.1 AAA semantics and zero CSS.",
// packages/core/package.json:20
    "cdk",
// packages/core/package.json:32  (inside peerDependencies, NOT peerDependenciesMeta)
    "@angular/cdk": "^22.0.0",
```

```
rules/stack.md:9   No Angular CDK. No floating-ui. No third-party UI primitives.
```

`grep -rn "@angular/cdk\|Cdk" packages/core/src packages/components/src --include=*.ts --include=*.html` returns **zero** matches. Twelve other peers are marked optional in `peerDependenciesMeta`; CDK is not. `packages/components/package.json:28` repeats it.

Note `CLAUDE.md` also still instructs "Is focus trapped in modals (`CdkFocusTrap`)?" while the actual implementation is `packages/core/src/a11y/focus-trap.ts`.

**Why it matters:** every consumer of `@kouji-ui/core` is forced to install (or is auto-installed, under npm 7+ peer auto-install) an Angular CDK they will never load, and a CDK major that lags the consumer's Angular produces a hard peer conflict on a dependency the library does not use. The package description and keywords advertise a CDK relationship the no-CDK rule explicitly forbids.

**Fix:** Delete `@angular/cdk` from both `peerDependencies` blocks and from the root `package.json` dependency if nothing in `apps/docs` needs it; drop the `cdk` keyword; rewrite the core description ("Angular 21" is also stale — the peer range is `^22.0.0`). Update the `CdkFocusTrap` mention in `CLAUDE.md` to `KjFocusTrap`. **Effort: S**

---

### F-4 `kjOffset` transform swallows `0` at six overlay anchor points

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/{popover/popover-content,tooltip/tooltip-content,select/select-content,combobox/combobox-listbox,tree-select/tree-select-content,date-picker/date-picker-calendar}.ts`

```ts
// packages/core/src/popover/popover-content.ts:32
  readonly kjOffset = input<number, unknown>(8, { transform: (v) => Number(v) || 8 });
// packages/core/src/tooltip/tooltip-content.ts:32
  readonly kjOffset = input<number, unknown>(8, { transform: (v) => Number(v) || 8 });
// packages/core/src/select/select-content.ts:56-58
  readonly kjOffset = input<number, unknown>(4, {
    transform: v => Number(v) || 4,
  });
```

(identical shape at `combobox-listbox.ts:41`, `tree-select-content.ts:106`, `date-picker-calendar.ts:59`)

**Why it matters:** `[kjOffset]="0"` — a flush-to-trigger panel, exactly what a select listbox or segmented dropdown wants — is coerced to the default gap. So is any expression that evaluates to `0`. There is no error; the panel just sits 4 or 8 px away from where the consumer asked. `NaN` is correctly caught by the same expression, which is presumably why it was written this way.

**Fix:** Replace all six with one shared helper in `primitives/overlay`, e.g. `const pxOffset = (fallback: number) => (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };`. While there, factor the whole repeated trio (`kjSide` / `kjAlign` / `kjOffset` plus the `inject(KJ_OVERLAY_POSITION_STRATEGY) as ReturnType<typeof anchoredTo>` cast, which appears in 8 files) into a `withAnchoredPosition()` helper — it would also delete 9 unchecked `as ReturnType<typeof …>` casts. **Effort: S**

---

### F-5 `ViewEncapsulation.None` is banned by the rules and used 188 times — undocumented deliberate decision, not drift

**Severity:** medium · **Confidence:** high
**Files:** `rules/code_style.md:72-77`, 81 files in `packages/components/src`, 11 in `packages/core/src`, 4 in `apps/docs`

```
rules/code_style.md:73-77
**Encapsulation:**
- Do not use `encapsulation: ViewEncapsulation.None`. Component styles
  must stay scoped. The only exception is generated SVG that needs
  global classes ...
```

188 occurrences. Of 174 components in `packages/components/src` that declare an `encapsulation` key, 81 files use `None`; only 2 uses of `Emulated` exist in the whole repo. The core uses are all overlay panels (`packages/core/src/primitives/overlay/wrapper.ts:36`, `popover/popover-content.ts:25`, `tooltip/tooltip-content.ts:26`, `select/select-content.ts:44`, `dialog/dialog.ts:20`, `drawer/drawer.ts:43`, `sheet/sheet.ts:52`, `toast/toast.ts:475`, `dropdown-menu/dropdown-menu-content.ts:143`, `tree-select/tree-select-content.ts:79`, `command-palette/command-palette-dialog.ts:68`).

**This is a deliberate architecture, not accidental drift.** It is the direct consequence of two documented design choices: (a) every component's CSS is authored as `@layer kj.component { .kj-* { … } }` in a shared cascade layer — 80 of 93 stylesheets do this; (b) the panels that must be painted are rendered by *headless core directives*, so a wrapper-scoped style would never reach them. `packages/components/src/overlay/overlay.css:13-26` spells the reasoning out at length, and `overlay-styles.spec.ts` pins it. Emulated encapsulation would break the whole model.

**Why it matters as written:** the rule as stated is simply false, which makes the rules file untrustworthy and makes future review of it noise. Practically, `None` everywhere means every `.kj-*` class is a global identifier with no compiler help: a consumer (or a second copy of the package) authoring `.kj-card` collides silently, and nothing in the build detects it. It also blocks ever adopting `:host`-scoped theming without a repo-wide rewrite.

**Fix:** Rewrite `rules/code_style.md:72-77` to state the real policy — *component styles ship as global `@layer kj.component` rules under the `.kj-` namespace; `ViewEncapsulation.None` is required, not forbidden; every selector must be prefixed `.kj-`* — and add the one genuine constraint that follows (no unprefixed class selectors under `packages/*/src/**/*.css`). Back it with a spec that parses every stylesheet and fails on a top-level selector not matching `.kj-` / `:root` / `[data-…]`, which today nothing checks. **Effort: S** for the rule, **M** for the guard.

---

### F-6 `@kouji-ui/core` is not headless: 592 lines of themed CSS and 16 `@Component`s, and its own aggregator never ships

**Severity:** medium · **Confidence:** high
**Files:** `rules/architecture.md:4`, `packages/core/src/styles.css`, `packages/core/src/typography/prose.css`, `packages/core/ng-package.json`, `packages/core/package.json`

```
rules/architecture.md:4
- `@kouji-ui/core` — directives only, zero CSS, zero components
```

Actual: 6 stylesheets totalling 592 lines (`typography/prose.css` 312, `motion/motion.css` 90, `styles/docs-themes.css` 82, `primitives/overlay/overlay.css` 47, `icon/icon.css` 40, `styles.css` 21), with 60 `var(--kj-…)` theme-token references between them — so the "headless" package is also theme-coupled. And 16 files declare `@Component`, not `@Directive`.

Four of the six are exported (`packages/core/package.json` `exports`) and copied by `packages/core/ng-package.json` `assets`. **`styles.css` is neither** — yet it advertises itself as the entry point:

```css
/* packages/core/src/styles.css:1-9 */
   @kouji-ui/core — aggregated global stylesheet
   --------------------------------------------------------------
   Single entry-point for the core-only global CSS pieces that
   ship without a corresponding Angular component ...
```
```css
/* packages/core/src/styles.css:19-21 */
@import "./primitives/overlay/overlay.css";
@import "./typography/prose.css";
@import "./icon/icon.css";
```

`ng-package.json` copies the three imported files to *flattened* output dirs (`overlay/`, `typography/`, `icon/`), so even if `styles.css` were shipped its relative `@import`s would not resolve from `node_modules`.

**Why it matters:** a consumer following that header registers a file that does not exist in the tarball. More broadly, the zero-CSS claim is the load-bearing promise of a headless package — it is what lets someone adopt `@kouji-ui/core` and bring their own styling system. `prose.css` alone restyles every `h1`–`h6`, `p`, `a`, `blockquote`, `code`, `pre`, `ul`, `ol`, `table` under `.kj-prose` against kouji tokens; that is a design system, not a primitive.

**Fix:** Two options — pick one and write it down. (a) Keep the CSS and correct `rules/architecture.md:4` to "directives plus a small set of opt-in, separately-exported stylesheets; no component-scoped styles", then either publish `styles.css` (add it to `assets` with dist-relative imports) or delete it and document the four individual entry points. (b) Move `prose.css` + `styles/docs-themes.css` into `@kouji-ui/themes` where token-coupled CSS belongs, leaving core with only the two behaviour-critical sheets (overlay chrome, icon mask). **Effort: M**

---

### F-7 102 unprefixed public bindings in `@kouji-ui/components`, 7 classes mixing both conventions

**Severity:** medium · **Confidence:** high
**Files:** 25 files under `packages/components/src`; `rules/code_style.md:14-15`

```
rules/code_style.md:14-15
## `kj` prefix on all public bindings
Every `input()`, `output()`, `model()` exposes a `kj`-prefixed name externally. No exceptions. Applies to both core directives and styled wrappers.
```

```ts
// packages/components/src/input/input.ts:128-138
  readonly type = input<KjInputType>('text');
  readonly variant = input<KjInputVariant>('default');
  readonly kjSize = input<KjInputSize>('md');
  readonly value = input<string>('');
  readonly placeholder = input<string>('');
  readonly invalid = input(false);
  readonly disabled = input(false);
```
```ts
// packages/components/src/select/select.ts:99-102
  readonly placeholder = input<string>('Select…');
  readonly disabled = input(false);
  readonly multiple = input(false);
  readonly kjSize = input<'xs' | 'sm' | 'md' | 'lg'>('md');
```

102 unprefixed `input`/`model`/`output` declarations across 25 component files. Core is nearly clean: 7, of which `packages/core/src/primitives/list/item.ts:68` (`activate`) and `packages/core/src/rich-text/rich-text-editor.ts:128-134` (`valueChange`, `textChange`, `jsonChange`, `announce`) are real public outputs. Seven classes mix both styles in one API: `input/input.ts`, `select/select.ts`, `chat/chat-thread.ts`, `rich-text/rich-text-editor.ts`, `table/table.ts`, `table/table-cell-editor-outlet.ts`, `time-picker/time-picker.ts`.

Meanwhile 53 component files *do* use the prefix consistently (`color-picker.ts` has `kjDisabled`/`kjInvalid`; `pagination.ts` has `kjDisabled`), so `<kj-select [disabled]>` and `<kj-color-picker [kjDisabled]>` are both correct API today.

**Why it matters:** this is the most consumer-visible inconsistency in the library. There is no way to guess the right spelling; you must look it up per component. It also makes any future standardisation a breaking change across half the package.

**Fix:** Decide the real policy — a strong case exists for "element components (`<kj-*>`) use bare names because the element is already namespaced; attribute directives use `kj*`" — write it into `rules/code_style.md`, then normalise the 7 mixed classes to whichever side wins, keeping the old name as a deprecated alias (`input(…, { alias: 'kjSize' })`) for one minor. **Effort: M**

---

### F-8 Components package test shape: 15 features with zero specs, 3 of the 69 spec files are pure `it.todo`

**Severity:** medium · **Confidence:** high
**Files:** `packages/components/src/**`

`packages/components/src`: 318 source files, 69 spec files (core, for contrast: 431 / 145). Features with **zero** spec file: `cascade-select`, `checkbox`, `command-palette`, `dialog`, `icon`, `input-group`, `input-mask`, `input-otp`, `menubar`, `overflow`, `radio`, `sheet`, `toast`, `toggle`, `tree-select`.

Three more are stubs:

```ts
// packages/components/src/popover/popover.spec.ts (entire file)
import { describe, it } from 'vitest';

describe('KjPopover (wrapper)', () => {
  it.todo('rewrite for new overlay API (KjPopoverTrigger / KjPopoverContent primitives)');
});
```
(identical at `dropdown-menu/dropdown-menu.spec.ts:4` and `tooltip/tooltip.spec.ts:4`)

Plus three skipped a11y assertions in core: `packages/core/src/cascade-select/cascade-select.spec.ts:44`, `packages/core/src/dropdown-menu/dropdown-menu.spec.ts:49` and `:60` (`it.skip(... aria-haspopup ...)`).

Quality where specs exist is good — `packages/components/src/skip-link/skip-link.spec.ts` asserts role, text, href and class; `table/table-export.spec.ts` asserts CSV escaping of commas, quotes and newlines; only 71 `toBeTruthy()` / "should create"-style assertions exist across 1,366 tests.

**Why it matters:** the gaps are not random. `dialog`, `sheet`, `toast`, `command-palette`, `menubar` and the three `it.todo` wrappers are precisely the overlay family — the subsystem that has taken four bug-fix releases in the last week (`fb1d1956`, `e6aa28a5`, and the `stack.ts` / `dismiss-press.ts` work in `fd6dd34e..HEAD`). Core covers the mechanism; nothing covers the wrapper composition consumers actually type.

**Fix:** Write the three `it.todo` specs against the current trigger/content API first — the shape already exists in `packages/components/src/overlay/backdrop-press.spec.ts` and `overlay-stacking.spec.ts`, so it is largely a copy of the host-component pattern. Then one behavioural spec each for `dialog`, `sheet`, `toast`, `command-palette` (open → focus lands → Escape → focus returns). Resolve or delete the three `it.skip` a11y cases. **Effort: M**

---

### F-9 Only one of seven rules files is machine-enforced; no stylelint over 93 stylesheets

**Severity:** medium · **Confidence:** high
**Files:** `eslint.config.js`, `packages/themes/package.json`, `rules/*`

`eslint.config.js` (83 lines) configures exactly two project-specific rules beyond the recommended sets:

```js
// eslint.config.js:26-41
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'kj', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'kj', style: 'kebab-case' }],
```

So of the seven rules files, the only mechanically enforced clause is `code_style.md:12` ("All selectors … `kj` prefix mandatory"). Everything else is prose CI cannot see: the `kj` prefix on *bindings* (F-7), the `ViewEncapsulation` ban (F-5), "zero CSS in core" (F-6), "no `ngOnInit`" and "no `@Input()`/`@Output()`" (F-13), "one directive per file" (F-12), the class/file naming rule (F-11), the whole of `rules/tsdoc.md` (F-10), and every token rule in `code_style.md:43-61`.

There is no stylelint config anywhere (`.stylelintrc*` / `stylelint.config.*` absent), and `packages/themes/package.json` sets `"lint": "echo 'no lint for css-only package'"` — so 93 CSS files, including all of `@kouji-ui/themes`, get zero static checking.

On the specific questions asked:
- **No test asserts the `@layer` convention** — and 13 stylesheets sit outside it: `components/src/{calendar,command-palette,date-picker,date-range-presets,datetime-picker,editor,input-mask,overlay}.css`, `components/src/table/table.css`, `components/src/table/table-filters/filters.css`, `core/src/icon/icon.css`, `core/src/styles.css`, `themes/src/index.css`. Their rules outrank every layered rule in the cascade regardless of specificity.
- **No test asserts theme contrast.** `packages/themes/src/themes.spec.ts` and `density.spec.ts` exist but check token structure and density scaling, not ratios.
- **Tarball contents *are* partially asserted** — `overlay-styles.spec.ts:166-196` checks both packages' `ng-package.json` assets and core's `exports` map.
- **No library size budget exists.** The only budget is the docs app (`angular.json:124-133`).

**Fix:** Add the cheap, high-value ESLint rules first — a `no-restricted-syntax` set banning `ngOnInit`/`ngOnDestroy`/`ngAfterViewInit` declarations, `@Input(`/`@Output(`, and `Renderer2` under `packages/*/src`, plus a rule for the binding prefix once F-7 settles the policy. Add stylelint with `selector-class-pattern: ^kj-` and a required `@layer kj.*`. Move the clauses that cannot be linted (design process, WAI-ARIA reading) into a PR checklist so the rules files contain only enforceable statements. **Effort: M**

---

### F-10 TSDoc input/output coverage: 7% missing in core, 29% missing in components

**Severity:** low · **Confidence:** high
**Files:** `rules/tsdoc.md:4,68-69`, `packages/components/src/**`

```
rules/tsdoc.md:4      All exported directives, classes, interfaces, type aliases, enums, methods, inputs, outputs.
rules/tsdoc.md:68-69  ## Inputs/outputs — Single-line `/** */`. State purpose + default value.
```

Measured over public `input`/`model`/`output` declarations (excluding `private`/`protected`, specs, examples, playgrounds): **core 37 of 511 undocumented (7%)**, **components 143 of 482 undocumented (29%)**.

```ts
// packages/components/src/alert/alert.ts:136-140  — five consecutive, none documented
  readonly kjVariant = input<string>('info');
  readonly kjSize = input<string>('md');
  readonly kjAlertMode = input<KjAlertMode | undefined>(undefined);
  readonly kjAlertStatic = input(false, { transform: booleanAttribute });
  readonly kjAlertRole = input<string | undefined>(undefined);
```
```ts
// packages/core/src/popover/popover-content.ts:30-33  — the entire public surface of the panel
  readonly kjSide   = input<KjSide>('bottom');
  readonly kjAlign  = input<KjAlign>('center');
  readonly kjOffset = input<number, unknown>(8, { transform: (v) => Number(v) || 8 });
  readonly kjTrap   = input(false, { transform: booleanAttribute });
```

`@doc-description` (the one-line page summary the docs site renders in lists and search) appears 60 times against 68 `@doc-is-main` markers in components — 8 primary pages ship with no summary.

On the "`@doc-*` asserting behaviour with no spec" question: the `@doc-keyboard` / `@doc-aria` blocks in the 15 zero-spec component features (F-8) do describe real keyboard contracts — e.g. `packages/components/src/menubar/menubar.ts:40` documents wrapping on `[kjLoop]` — but in every case checked, the mechanism *is* exercised by the core spec (`packages/core/src/menubar/menubar.spec.ts:331` asserts exactly that wrap). The wrapper-level claim is unverified; the underlying behaviour is not. The genuine untested doc-claim is `packages/components/src/toast/toast.ts:37-41`, whose `F6` / `Escape` lines are hedged with "when the host app wires it" / "Optional" and correspond to nothing in either package.

**Fix:** Documenting an input is a one-line change; do it per file as each is touched, and add an ESLint rule scoped to `PropertyDefinition` whose initialiser is `input`/`model`/`output` so the number cannot grow. Add the 8 missing `@doc-description` lines. Rewrite the `toast` `@doc-keyboard` block to state only what the library does. **Effort: M**

---

### F-11 34 classes carry an Angular type suffix with no collision; `icon.directive.ts` breaks the file rule too

**Severity:** low · **Confidence:** medium
**Files:** `CLAUDE.md` "Class Naming Rule", `rules/code_style.md:8-11`, `packages/core/src/icon/`, `packages/components/src/**`

Of 169 `Kj*Component` / `Kj*Directive` / `Kj*Service` classes, 135 have a same-base counterpart somewhere in the two packages (so the suffix is earned) and **34 do not**: `KjCardComponent` + 6 siblings (`packages/components/src/card/card.ts:81,106,124,139,154,172,192`), `KjEmptyStateComponent` + 4 (`empty-state/empty-state.ts:136,185,212,232,268`), `KjTableToolbarComponent` (`table/table-toolbar.ts:189`), `KjTablePaginationComponent` (`table/table-pagination.ts:139`), `KjTableStatusBarComponent` (`table/table-status-bar.ts:56`), `KjTableSidePanelComponent` (`table/table-side-panel.ts:211`), `KjCellTemplateDirective` (`table/table-cell-template.ts:29`), `KjDatetimePickerComponent` (`datetime-picker/datetime-picker.ts:114`), `KjRovingTabindexItemDirective` (`packages/core/src/a11y/roving-tabindex.ts:38`), `KjRichTextExtensionDirective` (`packages/core/src/rich-text/rich-text-extension.ts:29`), and 15 more.

The clearest one also breaks the file-name half of the rule:

```
packages/core/src/icon/icon.directive.ts       → class KjIconDirective (icon.directive.ts:75)
packages/core/src/icon/icon.directive.spec.ts
```

No `KjIcon` class and no `icon.ts` exist in that folder, so nothing collides — and `rules/tsdoc.md:41-55` uses this very directive as its worked example, documenting it as `@doc-name icon`. It is also the only `*.directive.ts` / `*.component.ts` / `*.pipe.ts` file left in either package.

`KjRovingTabindexItemDirective` is a near-miss worth deciding by hand: `KjRovingTabindex` exists, but the base name `KjRovingTabindexItem` does not, so by the letter of the rule the suffix should go. That is the kind of call CLAUDE.md says to "discuss before deciding" — hence medium confidence on the exact count.

**Why it matters:** low impact, but it is the single most mechanically checkable rule in `CLAUDE.md`, and 34 exported public names disagree with it — the same story as F-5 and F-7: the rules file is no longer a description of the code.

**Fix:** Rename `icon.directive.ts` → `icon.ts`, `icon.directive.spec.ts` → `icon.spec.ts`, `KjIconDirective` → `KjIcon` (a breaking export rename — bundle it with the next minor and keep a deprecated alias export for one release). For the other 33, either rename or relax the rule to "element components keep `Component`" and say so; do not leave 34 silent exceptions. **Effort: M**

---

### F-12 "One directive per file" is violated by ~30 files, several holding 7–9 directives in 400–900 lines

**Severity:** low · **Confidence:** high
**Files:** `rules/architecture.md:25-26` and the files listed below

```
rules/architecture.md:25-26
## One directive per file
Exception: tightly-coupled pair where child is never used standalone and both are < 30 lines.
```

Files with more than two `@Directive`/`@Component` declarations (count · lines · path):

```
9 · 919L · packages/core/src/carousel/carousel.ts
9 · 434L · packages/components/src/pagination/pagination.ts
8 · 582L · packages/components/src/command-palette/command-palette.ts
8 · 399L · packages/components/src/carousel/carousel.ts
7 · 698L · packages/core/src/color-picker/color-picker.ts
7 · 544L · packages/core/src/stepper/stepper.ts
7 · 284L · packages/components/src/breadcrumb/breadcrumb.ts
7 · 279L · packages/components/src/confirm-popup/confirm-popup.ts
7 · 194L · packages/components/src/card/card.ts
6 · 417L · packages/core/src/alert/alert.ts
… 20 more with 3–6
```

Directly alongside features that *do* follow the rule: `packages/core/src/select/` splits into `select-root.ts` / `select-trigger.ts` / `select-content.ts` / `select-option.ts`, and `packages/core/src/breadcrumb/` into six files. The two shapes coexist feature-by-feature with no visible principle — the clearest evidence in the codebase of two authoring eras layered on each other.

Related, minor: six files are pure re-export barrels that are not `index.ts`, against `code_style.md:34` ("No barrel re-exports beyond `index.ts`") — `packages/core/src/{select/select.ts, combobox/combobox.ts, cascade-select/cascade-select.ts, tree-select/tree-select.ts, popover/popover.ts, tooltip/tooltip.ts}`. These exist to give the split-file features a single import path, so the rule, not the files, is probably what is wrong.

**Fix:** Split the 900- and 700-line files at minimum (`core/carousel`, `core/color-picker`, `core/stepper`, `components/command-palette`) following the `select/` layout, which gives each directive its own spec target too. Then amend `rules/architecture.md:25-26` to the threshold you will actually hold ("a file declares at most one *root* directive plus its non-standalone children, and stays under ~300 lines"), and restate the barrel clause to permit the `<feature>.ts` aggregator pattern. **Effort: L**

---

### F-13 Scattered pre-signal holdovers: 34 lifecycle hooks, 6 `@Output()`, 4 `@ViewChild`, 3 `@HostListener`

**Severity:** low · **Confidence:** high
**Files:** see below; `rules/code_style.md:20-29`

```
rules/code_style.md:21     - `input()`, `model()`, `output()` — never `@Input()`/`@Output()`
rules/code_style.md:26-29  - No `ngOnInit`, `ngOnDestroy`, `ngAfterViewInit` · DOM access → `afterNextRender()` · Cleanup → `DestroyRef.onDestroy()`
```

```ts
// packages/core/src/file-upload/file-upload.ts:139-145
  @Output() readonly kjSelect = new EventEmitter<File[]>();
  @Output() readonly kjReject = new EventEmitter<KjFileRejection[]>();
  @Output() readonly kjRemove = new EventEmitter<KjUploadableFile>();
```
(mirrored verbatim at `packages/components/src/file-upload/file-upload.ts:252-254`)

```ts
// packages/components/src/input/input.ts:140-141
  @ViewChild(KjInput, { static: true })
  protected innerInput?: KjInput;
```
(also `components/src/carousel/carousel.ts:161`, `components/src/color-picker/color-picker.ts:194`, `components/src/file-upload/file-upload.ts:257`)

```ts
// packages/core/src/drawer/drawer.ts:118 · sheet/sheet.ts:140 · command-palette/command-input.ts:72
  @HostListener('keydown.escape')
```
— against `rules/architecture.md:14` ("ARIA / host bindings always in the `host` object").

34 real lifecycle-hook bodies remain. Most are *justified in writing* — parent/child registration ordering (`packages/core/src/chat/chat.ts:33-37` explains why DOM traversal beat a registry; `packages/core/src/tabs/tabs.ts:217-221` explains why a capture-phase listener must attach before the composed `KjRovingTabindex` host binding) — so this is a documented, bounded exception rather than neglect. The genuinely stale ones are resource-cleanup hooks that `DestroyRef` already covers elsewhere in the same codebase:

```ts
// packages/components/src/file-upload/file-upload.ts:293-296
  ngOnDestroy(): void {
    for (const url of this.previewCache.values()) URL.revokeObjectURL(url);
    this.previewCache.clear();
  }
```

against 72 sites that use `inject(DestroyRef).onDestroy(…)` (e.g. `packages/core/src/primitives/overlay/wrapper.ts:46`).

Note the `ngOnInit` + `addEventListener` pattern (`tabs.ts:217`, `carousel.ts:452`, `input-otp.ts:163`, `combobox-input.ts:89`, `command-input.ts:64`) also executes during server rendering, unlike the `afterNextRender` form used everywhere else — an SSR-consistency concern flagged here and owned by the SSR review.

**Fix:** Convert the 6 `@Output()`/`EventEmitter` pairs to `output<T>()` (drop-in), the 4 `@ViewChild`s to `viewChild.required()`, the 3 `@HostListener`s to `host: { '(keydown.escape)': … }`. Convert the pure-cleanup `ngOnDestroy`s to `DestroyRef.onDestroy`. Leave the registration/ordering hooks and add a line to `rules/code_style.md` naming that exception explicitly, so it stops reading as 34 violations. **Effort: S**

---

### F-14 Misuse diagnostics are inconsistent and mostly untree-shakeable; missing-parent errors come from Angular, not the library

**Severity:** low · **Confidence:** high
**Files:** `packages/core/src/form/form.ts:162`, 25 `isDevMode()` sites, 34 `*.context.ts`

Two dev-guard idioms coexist. One is tree-shaken out of production builds:

```ts
// packages/core/src/form/form.ts:161-166
      if (typeof ngDevMode !== 'undefined' && ngDevMode) {
        console.warn(
          '[KjForm] <form kjForm> has no `[formGroup]` or `ngForm` binding. ...',
        );
      }
```

The other — used 25 times, and the only one used outside `form.ts` — is a runtime function call the optimiser cannot fold away, so both the branch and its message strings ship to production:

```ts
// packages/core/src/alert/alert.ts:213-221
    if (isDevMode()) {
      effect(() => {
        const v = this.kjVariant();
        if (!this.preset.variants.includes(v)) {
          console.warn(
            `[kj-alert] unknown variant "${v}". Allowed values: ${this.preset.variants.join(', ')}.`,
          );
```

Where diagnostics exist they are good — `packages/core/src/progress-bar/progress-bar.ts:182-210` throws on `kjMin >= kjMax` and warns once on out-of-range values; `packages/core/src/list/list.ts:188-200` warns that a `kjAs="nav"` list is an unnamed landmark. But they cover only ~12 of ~68 features (alert, breadcrumb, form, kbd, list, pagination, presets/size, presets/variant, progress-bar and a few more), and the library contains just 4 `throw new Error` sites in total.

The gap that matters most is the context contract. Children inject their parent token non-optionally (`packages/core/src/tabs/tabs.ts:200,260,342`; `packages/core/src/calendar/calendar-day.ts:53`; `packages/core/src/breadcrumb/breadcrumb-item.ts:29`), so misuse *does* fail loudly — but with Angular's generic `NG0201: No provider for InjectionToken KjTabs`, which names neither the child directive nor the parent selector the author needs to add. Several of these also cast a token typed as an interface straight to the implementing class (`packages/core/src/accordion/accordion.ts:241` `inject(KJ_ACCORDION) as KjAccordion`; `carousel/carousel.ts:440,555,637`), which defeats the interface boundary the context pattern exists to create.

**Fix:** Standardise on `ngDevMode` and migrate the 25 `isDevMode()` guards (mechanical; also removes their strings from production bundles). Add a shared `injectParent(TOKEN, { child: 'KjTab', parent: '[kjTabs]' })` helper in `primitives/` that throws an `ngDevMode`-guarded message naming both, and route the 34 contexts through it. Replace the `as KjAccordion` / `as KjCarousel` casts by widening the context interface to include what children actually need. **Effort: M**

---

### F-15 `KJ_COMPONENTS_VERSION` reports `0.0.1` for a package at `0.9.3`

**Severity:** low · **Confidence:** high
**Files:** `packages/components/src/public-api.ts`, `packages/components/package.json`

```ts
// packages/components/src/public-api.ts:1-2
// Public API for @kouji-ui/components
export const KJ_COMPONENTS_VERSION = '0.0.1';
```
```jsonc
// packages/components/package.json:3
  "version": "0.9.3",
```

Nothing in the repo reads it (`grep -rn KJ_COMPONENTS_VERSION` returns only the declaration), so it is a published export whose only effect is to be wrong. `@kouji-ui/core` has no equivalent.

Related barrel note, for the record: both public APIs are otherwise in sync with their folders — the only unexported directories are `packages/core/src/styles/` (docs-only CSS) and `packages/components/src/overlay/` (the aggregator stylesheet plus four spec files), both correct.

**Fix:** Delete the export, or generate it at build time from `package.json` and add the equivalent to `@kouji-ui/core`. Deleting is one line and one changeset. **Effort: S**

---

### F-16 `KjDisabled` is composed by 26 directives and hand-rolled by 15

**Severity:** low · **Confidence:** high
**Files:** `packages/core/src/primitives/interaction/disabled.ts` and the 15 consumers listed below

The primitive exists and is exactly what `rules/architecture.md:11` prescribes:

```ts
// packages/core/src/primitives/interaction/disabled.ts:20-31
@Directive({
  selector: '[kjDisabled]',
  host: {
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export class KjDisabled {
  readonly disabled = input<boolean, unknown>(false, { alias: 'kjDisabled', transform: booleanAttribute });
}
```

26 core files compose it. 15 declare their own `kjDisabled` input and re-bind `aria-disabled` / `data-disabled` by hand instead: `button/button.ts`, `link/link.ts:99`, `button-group/button-group.ts`, `field/field.ts`, `file-upload/file-upload.ts`, `menubar/menubar-item.ts`, `number-input/number-stepper.ts`, `pagination/pagination-item.ts`, `password-input/password-input.ts`, `popover/popover-trigger.ts`, `select/select-trigger.ts`, `speed-dial/speed-dial.ts`, `time-picker/time-picker-meridiem.ts`, `tree-select/tree-select-trigger.ts`, `breadcrumb/breadcrumb-ellipsis.ts`. `[attr.aria-disabled]` appears in 37 separate host blocks.

Some hand-rolls are justified (`KjButton` OR-s in a group's cascading disabled and intercepts clicks in the capture phase — `packages/core/src/button/button.ts:145-165`; `packages/core/src/select/select-trigger.ts:72` calls its own flag "advisory"), but most are not, and each one is an independent chance to forget `booleanAttribute` — which is precisely how F-2 happened.

**Fix:** For the directives with no extra semantics (`select-trigger`, `tree-select-trigger`, `popover-trigger`, `pagination-item`, `menubar-item`, `time-picker-meridiem`, `number-stepper`, `breadcrumb-ellipsis`), replace the local input with `hostDirectives: [{ directive: KjDisabled, inputs: ['kjDisabled'] }]` and read `inject(KjDisabled).disabled`. For the ones that compose extra state (`KjButton`, `KjTagList`), compose `KjDisabled` for the attribute reflection and keep only the `effectiveDisabled` computed locally. **Effort: M**

---

## Recommended work items

1. **Re-enable tests in CI.** Uncomment `pnpm test` in `.github/workflows/ci.yml`; quarantine red *files* by name in the vitest config with an issue each, never the whole step. Add `test:e2e` as its own job. → **F-1**
2. **Sweep `booleanAttribute` onto every boolean input in both packages**, then delete the duplicate `kjTagDisabled` field in `KjTag` so one public name has one owner. Add a bare-attribute spec per directive touched. → **F-2**, unblocks **F-16**
3. **Drop the phantom CDK peer dependency** from both `package.json` files, fix the core description and keywords (`Angular 21` → 22, remove `cdk`), and correct the `CdkFocusTrap` reference in `CLAUDE.md`. → **F-3**
4. **Extract `withAnchoredPosition()`** into `primitives/overlay`: one `pxOffset` transform that respects `0`, one typed strategy accessor, six call sites deleted, nine unchecked casts gone. → **F-4**
5. **Reconcile the three false rules with the code they describe** — `rules/code_style.md:72-77` (encapsulation), `rules/architecture.md:4` (zero CSS), `rules/code_style.md:14-15` (binding prefix). Each becomes either a corrected statement of the real design or a tracked migration; nothing stays as prose the code contradicts. → **F-5**, **F-6**, **F-7**
6. **Publish or delete `packages/core/src/styles.css`.** If published, add it to `ng-package.json` assets and rewrite its `@import`s for the flattened dist layout; if deleted, document the four individual CSS entry points in the core README. → **F-6**
7. **Make the surviving rules machine-enforced**: ESLint `no-restricted-syntax` for lifecycle hooks / `@Input` / `@Output` / `Renderer2`; a binding-prefix rule once item 5 settles the policy; stylelint with `selector-class-pattern: ^kj-` and a required `@layer kj.*`; a spec that fails on an unlayered or unprefixed stylesheet. → **F-9**, guards **F-5**, **F-7**, **F-13**
8. **Close the overlay-family test gap in components**: rewrite the three `it.todo` wrapper specs against the trigger/content API, add one behavioural spec each for `dialog`, `sheet`, `toast`, `command-palette`, and resolve the three `it.skip` a11y cases in core. → **F-8**
9. **Split the four largest multi-directive files** (`core/carousel` 919L, `core/color-picker` 698L, `core/stepper` 544L, `components/command-palette` 582L) along the `select/` layout, then restate `rules/architecture.md:25-26` as the threshold you will actually hold. → **F-12**
10. **Standardise dev diagnostics** on `ngDevMode` and add an `injectParent(TOKEN, { child, parent })` helper that throws a message naming the missing parent selector; route all 34 contexts through it and drop the `as Kj*` casts. → **F-14**
11. **Mechanical cleanups**, one PR: 6 `@Output()` → `output()`, 4 `@ViewChild` → `viewChild.required()`, 3 `@HostListener` → `host`, pure-cleanup `ngOnDestroy` → `DestroyRef`, delete `KJ_COMPONENTS_VERSION`. → **F-13**, **F-15**
12. **Naming**: rename `icon.directive.ts` / `KjIconDirective` → `icon.ts` / `KjIcon` with a deprecated alias export, and decide (then document) whether element components keep the `Component` suffix. → **F-11**

## Open questions

1. **Is the `ViewEncapsulation.None` + global `@layer kj.component` model the intended permanent architecture?** Everything in the code says yes and `rules/code_style.md` says no. If yes, the rule needs rewriting *and* the `.kj-` namespace needs a lint guard, because it is the only thing preventing collisions. If no, this is a repo-wide migration, not a rule violation.
2. **What is the real binding-naming policy for `@kouji-ui/components`?** "Element components use bare names, attribute directives use `kj*`" would justify 102 of the 109 unprefixed bindings and is defensible — but seven classes currently do both, so somebody has to pick. Is a deprecation cycle acceptable for the renames?
3. **Why was CDK ever a peer dependency?** Nothing imports it and `rules/stack.md` forbids it. Is there an unlanded plan that needs it, or is it a leftover from a pre-rewrite era (the core description still says "directives over CDK")?
4. **Are the three `it.todo` overlay wrapper specs waiting on an API decision**, or just unwritten? The message says "rewrite for new overlay API", but that API landed and has been through four bug-fix releases since.
5. **Should `prose.css` live in core at all?** It is 312 lines that restyle every HTML text element against `--kj-*` tokens — the single biggest contradiction of "headless". Moving it to `@kouji-ui/themes` would make the zero-CSS claim nearly true again.
6. **Is `@layer` omission on the 13 unlayered stylesheets deliberate** (a deliberate escape from the layer cascade for `table.css`, `calendar.css`, `editor.css`) **or an oversight?** Those files currently outrank every layered rule regardless of specificity, which either is the point or is a latent theming bug.

---

## Changed since the 2026-09-06 review

Previous review: `reports/review/09-architecture-code-quality.md` at commit `9aee150a`,
auditing `fd6dd34e`. `main` has since advanced 8 commits. Every claim below was verified
against the code at HEAD.

### Fixed

**Nothing fully fixed.** One partial improvement, verified:

- **prev F-5 — "19 component features have zero real tests, including every overlay
  wrapper" — *partially improved*.** `fb1d1956` added
  `packages/components/src/overlay/overlay-styles.spec.ts` (208 lines), which walks
  `document.styleSheets` for a rule that both matches and fills the panel and asserts
  `ng-package.json` actually ships the sheet — a real behavioural spec for a feature that
  had none. The same range added `packages/core/src/primitives/list/scope.spec.ts` (99),
  `dismiss-press.spec.ts` (154) and `backdrop-press.spec.ts` (243), and extended
  `stack.spec.ts` and `confirm-popup.spec.ts`. This pass counts **15** component features
  with zero specs (current F-8), down from prev's 19. The gap is narrower, not closed —
  and, per F-1, none of these specs is executed by CI.

No other previous finding is addressed by `fd6dd34e..HEAD`. The range is four bug fixes
plus two version-packages commits; it contains no lint-config, naming, prefix,
encapsulation, TSDoc or packaging work.

### Still open

| prev | current | note |
| --- | --- | --- |
| prev F-1 — CI has not run a test since 2026-05-07, every publish gated on it | **F-1** | Unchanged and independently re-verified this pass. Prev's scale figures were **understated** — 274 spec files / 2,042 `it()` blocks, not prev's counts. Two aggravators added: `deploy-docs.yml` rides the same gate, and `.husky/pre-push`'s stated rationale is now false. |
| prev F-3 — 101 public inputs in `components` have no `kj` prefix | **F-7** | Unchanged; this pass counts 102 and adds 7 classes mixing both conventions. |
| prev F-4 — 26 boolean inputs in `components` lack `booleanAttribute` | **F-2** | Same defect, widened to both packages (~95 inputs). Prev scoped it to `components` only and missed the `kjTagDisabled` two-owner divergence, which is the sharpest instance. |
| prev F-5 — 19 component features with zero real tests | **F-8** | Partially improved; see *Fixed*. |
| prev F-7 — two naming eras coexist; the CLAUDE.md naming rule is inverted in components | **F-11** | Unchanged (34 classes carrying an Angular type suffix with no collision). |
| prev F-8 — `@angular/cdk` is a peer dependency of both packages with zero CDK imports | **F-3** | Unchanged. |
| prev F-9 — `core` is not headless | **F-6** | Unchanged; this pass quantifies it as 592 lines of themed CSS and 16 `@Component`s. |
| prev F-10 — `ViewEncapsulation.None` used 183 times against an explicit rule | **F-5** | Unchanged; count now 188 — it **grew**. |
| prev F-13 — dev-mode diagnostics in 12 of ~74 core features, four message prefixes | **F-14** | Unchanged; this pass adds that the diagnostics are mostly untree-shakeable. |
| prev F-14 — 30% of component inputs undocumented; themed-example system unused | **F-10** | Unchanged (7% missing in core, 29% in components). |
| prev F-15 — ESLint enforces none of the seven rules files | **F-9** | Unchanged, and still the root cause of most drift findings in both reviews. |
| prev F-16 — public-API drift (stale version constant, 8 examples published, wildcard path) | **F-15** + (lazy report) **F-7** | Split: the stale `KJ_COMPONENTS_VERSION` is F-15 here; the published example components are F-7 in `07-lazy-loading-bundle.md`. |

### Not reproduced

Six previous findings have no counterpart in this pass. **All six were re-checked at HEAD
and all six are still true.** This is an attention gap in the new audit — none of them was
fixed, and none of them was wrong. All six are re-filed below.

- **prev F-2 — `afterOpened$` is public API on three overlay refs and never emits.** Still
  true, and this is the most serious of the six. `grep -rn "_afterOpened" packages` returns
  **only the declaration and the `asObservable()` line** in each of
  `dialog/dialog.ref.ts:10,12`, `drawer/drawer.ref.ts:20,23` and `sheet/sheet.ref.ts:21,24`.
  There is no `.next()` anywhere. Re-filed as **F-17**.
- **prev F-6 — `KjTabList` fights its own composed primitive with an event-swallowing
  hack.** Still true: `tabs.ts:220` still carries the comment *"so we can swallow off-axis
  arrow keys per the parent KjTabs orientation"* above a capture-phase
  `stopImmediatePropagation` filter. Re-filed as **F-18**.
- **prev F-11 — five bespoke `ControlValueAccessor`s bypass `KjFormControl`.** Still true:
  `grep -rln ControlValueAccessor` returns `primitives/forms/form-control.ts` plus exactly
  five bespoke implementations — `core/rich-text/rich-text-editor.ts`,
  `components/color-picker/color-picker.ts`, `components/input/input.ts`,
  `components/input-otp/input-otp.ts`, `components/textarea/textarea.ts`. Re-filed as
  **F-19**.
- **prev F-12 — concrete duplication (identical overlay refs, five copy-pasted cell
  editors, two competing navigation primitives).** Still true: `drawer.ref.ts` and
  `sheet.ref.ts` remain near-identical, and all five editors are still present
  (`table/table-editors/{text,number,date,select,boolean}-editor.ts`). This pass files only
  the `KjDisabled` duplication (F-16) and misses the rest. Re-filed as **F-20**.
- **prev F-17 — `kj-menubar` is published but functionally incomplete, per its own TODO,
  with zero tests.** Half true and re-filed corrected: the TODO survives verbatim at
  `packages/components/src/menubar/menubar.ts:126` ("menubar+dropdown-menu wiring pending
  overlay-migration follow-up") and `packages/components/src/menubar/` still has **no
  spec**. But the *headless* `packages/core/src/menubar/` does have one —
  `menubar.spec.ts`, 16.3 KB, added in `9acdb072`, i.e. **before** `fd6dd34e`. Prev's
  "zero tests" was too broad. Re-filed, corrected, as **F-21**.
- **prev F-18 — shared filter contract lives inside one sibling's file instead of a
  `*.context.ts`.** Still true: `KJ_FILTER_CONTEXT` is still declared in
  `table-filters/text-filter.ts` and imported from there by `date-filter.ts:11`,
  `number-filter.ts:13` and `select-filter.ts:12`. Re-filed as **F-22**.

### New since then

- **F-4** — `kjOffset` transform swallows `0` at six overlay anchor points. No prev
  counterpart; a genuine behavioural bug the previous pass missed.
- **F-12** — "one directive per file" violated by ~30 files, several holding 7+.
- **F-16** — `KjDisabled` is composed by 26 directives and hand-rolled by 15. Overlaps prev
  F-12's duplication theme but is a distinct, larger instance.

### Re-filed from the previous review

Correct at `fd6dd34e`, still correct at HEAD, missed by this pass. Ids continue this
report's sequence.

#### F-17 `afterOpened$` is public API on three overlay refs and never emits *(carried over from prev F-2)*

**Severity:** high · **Confidence:** high · **Effort:** S
**Files:** `packages/core/src/dialog/dialog.ref.ts:10,12`,
`packages/core/src/drawer/drawer.ref.ts:20,23`, `packages/core/src/sheet/sheet.ref.ts:21,24`

Each ref declares `private readonly _afterOpened = new Subject<void>()` and exposes
`readonly afterOpened$: Observable<void> = this._afterOpened.asObservable()`. A repo-wide
`grep -rn "_afterOpened" packages --include=*.ts` returns **six lines — the three
declarations and the three `asObservable()` calls.** `.next()` is never called, and
`.complete()` is never called, anywhere.

**Why it matters.** This is shipped public API on three of the library's most-used overlay
services. A consumer wiring `ref.afterOpened$.subscribe(() => input.focus())` gets code
that compiles, type-checks, runs, and silently never fires — the worst failure shape a
library can ship, because there is no error to debug. It is also a semver trap: fixing it
changes observable behaviour for anyone who has already worked around it.

**Fix.** Either emit it — call `_afterOpened.next()` from the same place the open
transition completes (the overlay controller's open path, after the panel is attached and
the focus trap is armed) and `complete()` it on close — or delete it from all three refs in
the next major. Do not leave it declared-and-dead. Add a spec per ref asserting the
subscriber fires exactly once per open, which is the test that would have caught this.

#### F-18 `KjTabList` swallows its own composed primitive's events instead of configuring it *(carried over from prev F-6)*

**Severity:** medium · **Confidence:** high · **Effort:** S
**Files:** `packages/core/src/tabs/tabs.ts:~178-228` (comment at `:220`),
`packages/core/src/a11y/roving-tabindex.ts`

`KjTabList` composes `KjRovingTabindex` via `hostDirectives` but forwards no inputs to it.
Instead it installs a capture-phase `keydown` listener on its own host whose only purpose is
to `stopImmediatePropagation()` off-axis arrow keys before the composed primitive sees them —
the comment at `tabs.ts:220` says so explicitly ("so we can swallow off-axis arrow keys per
the parent KjTabs orientation").

**Why it matters.** This is a directive fighting the primitive it deliberately composed,
which is exactly the coupling `rules/architecture.md`'s primitive pattern exists to prevent.
`stopImmediatePropagation` on a capture listener is also a blunt instrument: it silences
every other capture-phase listener on that element, present and future. Prev additionally
found the TSDoc describing an input-forwarding mechanism that does not exist — verify that
doc block is still inaccurate when fixing this.

**Fix.** Give `KjRovingTabindex` an orientation input (it may already accept one) and forward
it through `hostDirectives: [{ directive: KjRovingTabindex, inputs: ['kjRovingOrientation'] }]`
bound from the `KJ_TABS` context, then delete the keydown filter and the manual
`addEventListener`/`removeEventListener` pair. Update the TSDoc to describe what the code
does.

#### F-19 Five bespoke `ControlValueAccessor`s bypass `KjFormControl` *(carried over from prev F-11)*

**Severity:** medium · **Confidence:** high · **Effort:** M
**Files:** `packages/core/src/primitives/forms/form-control.ts`,
`packages/core/src/rich-text/rich-text-editor.ts`,
`packages/components/src/{color-picker/color-picker,input/input,input-otp/input-otp,textarea/textarea}.ts`

The repo ships a `KjFormControl` primitive and then five components implement
`ControlValueAccessor` by hand instead of composing it. That is five independent
implementations of `writeValue` / `registerOnChange` / `registerOnTouched` / `setDisabledState`,
five chances to diverge on touched-state timing, disabled propagation, and
`NG_VALUE_ACCESSOR` provider shape — and five places to fix whenever Angular's forms
semantics shift.

**Fix.** Audit what each bespoke CVA needs that `KjFormControl` does not provide, extend the
primitive to cover it, then migrate the five. Where a component genuinely cannot compose it
(rich-text's async engine load is the plausible exception), document why in the class TSDoc so
the exception is deliberate rather than accidental. Add a lint rule forbidding a raw
`NG_VALUE_ACCESSOR` provider outside `primitives/forms/`.

#### F-20 Concrete duplication beyond `KjDisabled`: overlay refs and table cell editors *(carried over from prev F-12)*

**Severity:** medium · **Confidence:** high · **Effort:** M
**Files:** `packages/core/src/drawer/drawer.ref.ts` vs `packages/core/src/sheet/sheet.ref.ts`
vs `packages/core/src/dialog/dialog.ref.ts`;
`packages/components/src/table/table-editors/{text,number,date,select,boolean}-editor.ts`

- **(a)** `KjDrawerRef` and `KjSheetRef` are near-identical apart from names, doc sentences
  and an error string; `KjDialogRef` is the same shape minus the state signals. All three
  carry the dead `afterOpened$` of F-17, which is itself evidence of copy-paste.
- **(b)** The five table cell editors re-implement the same commit state machine —
  `settled` / `mounted` flags, the identical `cancel()` and `onFocusOut()` bodies, and the
  identical `constructor() { this.draft.set(…); afterNextRender(() => { this.X()?.focus(); this.mounted = true; }); }`.

This pass files the `KjDisabled` instance (F-16) but not these. They are the same pathology:
a shared behaviour that was copied rather than extracted, in a codebase that is otherwise
good at extracting primitives.

**Fix.** Extract one `KjOverlayRef<TState>` base and have dialog/drawer/sheet parameterise it.
Extract a `KjCellEditorBase` (or a `useCellEditor()` composable) holding the settle/commit/
focus-out state machine, leaving each editor with only its input rendering and value parsing.
Both are mechanical and well covered by `editors.spec.ts`.

#### F-21 `kj-menubar` is published while functionally incomplete, and the styled wrapper has no spec *(carried over from prev F-17, corrected)*

**Severity:** medium · **Confidence:** high · **Effort:** M
**Files:** `packages/components/src/menubar/menubar.ts:126`,
`packages/components/src/menubar/` (no `*.spec.ts`),
`packages/components/src/menubar/menubar.usage.example.ts:9`

The TODO survives verbatim at HEAD: *"TODO: menubar+dropdown-menu wiring pending
overlay-migration follow-up"*, with a matching `TODO(overlay-migration)` in the usage example
at `:9`. `packages/components/src/menubar/` contains `index.ts`, `menubar.css`,
`menubar.playground.ts`, `menubar.ts`, `menubar.usage.example.ts` and `_examples/` — and **no
spec file** — while the component is exported from `public-api.ts` and published.

**Correction to the previous review:** prev said "with zero tests". The *headless*
`packages/core/src/menubar/` does have `menubar.spec.ts` (16.3 KB), added in `9acdb072`,
before `fd6dd34e`. The gap is the styled wrapper only.

**Why it matters.** A published component whose own source says its primary composition
(menubar + dropdown-menu) is not wired is a semver commitment to something that does not work
yet, and the wrapper has no test to say which parts do. The overlay migration the TODO waits
on has since landed substantially (`2948c5b5`, `fb1d1956`, `e6aa28a5`), so the blocker may
already be gone.

**Fix.** Either finish the dropdown-menu wiring now that the overlay work has landed and add a
`menubar.spec.ts` covering the wrapper, or mark the component `@experimental` in its TSDoc and
say so in the README until it is complete.

#### F-22 Shared filter contract lives inside one sibling's file instead of a `*.context.ts` *(carried over from prev F-18)*

**Severity:** low · **Confidence:** high · **Effort:** S
**Files:** `packages/components/src/table/table-filters/text-filter.ts` (declares
`KJ_FILTER_CONTEXT` + `KjFilterContext`), imported from there by `date-filter.ts:11`,
`number-filter.ts:13`, `select-filter.ts:12`, and re-exported via `table-filters/index.ts:2`

`rules/architecture.md`'s folder layout mandates `<component>.context.ts`, and all 34 other
context files in the repo follow it. This is the only place the convention is broken: three
sibling filters import a peer filter purely to get a token — a needless edge in the import
graph and a latent cycle if `text-filter` ever needs something from a sibling. Prev also noted
the token description is `'kj.filter.context'` while every core context token uses the
class-name form (`'KjSlider'`, `'KjAccordion'`).

**Fix.** Move `KjFilterContext` + `KJ_FILTER_CONTEXT` into
`table-filters/filters.context.ts`, keep the re-export from `table-filters/index.ts`, and
normalise the token description to `'KjTableFilter'`. `filters.spec.ts` already imports the
token from the barrel, so the spec needs no change.
