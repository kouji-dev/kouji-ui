# Architecture, Directive Design & Code Quality Review

> **Adversarially verified 2026-09-15.** Findings below marked *(severity corrected during verification)* were re-checked against the source; corrections are inline. Refuted findings are preserved in **Refuted during verification** at the end of the findings list, not deleted.

Aspect: architecture / directive design / code quality
Scope: `packages/core` (603 .ts), `packages/components` (764 .ts), judged against
`CLAUDE.md`, `RULES.md`, `rules/architecture.md`, `rules/code_style.md`,
`rules/tsdoc.md`, `rules/stack.md`, then against Angular 22 practice.
Method: static read + grep only. No builds, no test runs, no source edits.

---

## Verdict

`@kouji-ui/core` is a genuinely good headless library: one overlay engine with a
clean strategy/token design used by all 15 overlay families, a real list-behaviour
primitive set (`navigator` / `selection` / `type-ahead` / `filterable-list`) that
14 features compose rather than re-implement, a disciplined import graph (227 of
~260 cross-directory edges point at `primitives/`), 1,270 test cases, zero
`Renderer2`, zero `@angular/cdk` imports, and ~99% compliance with the mandatory
`kj` input prefix. `@kouji-ui/components` is a different animal: 70% TSDoc
coverage on inputs, 101 unprefixed public inputs, 26 boolean inputs that silently
do nothing when used as bare attributes, 19 features with zero real tests, three
`it.todo` placeholder specs, and two visibly different naming/composition eras
sitting side by side. The decisive problem is governance, not craft: **CI has not
run a single test since 2026-05-07** and ESLint enforces none of the seven rules
files, so every rule in `rules/` is advisory prose that the codebase drifts away
from at exactly the rate you would predict. This is not one coherent architecture —
it is a very strong core primitive layer (era 3), a large mid-era styled wrapper
layer that predates the current conventions (era 2), and a small recent slice
(chat, table, direction-toggle) that follows them (era 3 again), with the rules
files describing a fourth thing that nobody enforces.

**Grade: B-** — core alone would be an A-; components and the unenforced/unrun
quality gates pull it down hard.

---


*Post-verification: F-1 upheld at critical and widened — `release.yml` triggers on a green CI, so ~20 npm releases since 2026-05-07, `core@1.0.0` included, were published behind a gate that ran no tests. No other finding in this dimension was re-rated.*

## What works

- **One overlay engine, universally adopted.** `packages/core/src/primitives/overlay/`
  (builder / controller / stack / panel / trigger + `strategies/{mount,position,
  backdrop,focus-trap,scroll-lock,live-announcer,trigger-event}`) is composed by
  all 15 overlay-ish features — `select-content.ts`, `dropdown-menu-content.ts`,
  `tooltip-content.ts`, `popover-content.ts`, `dialog.ts`, `drawer.ts`, `sheet.ts`,
  `toast.ts`, `date-picker-calendar.ts`, `color-picker.ts`, `cascade-select-panel.ts`,
  `combobox-listbox.ts`, `command-palette-dialog.ts`, `confirm-popup-content.ts`,
  `tree-select-content.ts`. `rules/architecture.md`'s "never reimplement per
  component" is actually honoured.
- **Real list primitives.** `packages/core/src/primitives/list/` (navigator 9.5K,
  selection 12.7K, item 9.5K, group, type-ahead, filterable-list) each with its own
  spec, consumed by select / combobox / command-palette / dropdown-menu / menubar /
  cascade-select / tree-select.
- **Clean dependency direction.** Zero `@kouji-ui/components` imports in
  `packages/core/src` (the two hits are prose in TSDoc). No relative cross-package
  imports. Zero `@angular/cdk` imports anywhere in source despite the no-CDK rule
  being easy to break.
- **`host` object discipline.** Zero `Renderer2` usages in either package; ARIA is
  bound in `host` exactly as `rules/architecture.md` demands (see
  `packages/core/src/slider/slider-thumb.ts:49-70`, 20 host bindings, no DOM writes).
- **Injection context is correct.** Every `effect()` outside a constructor is
  properly wrapped — `dialog.service.ts:48` / `drawer.service.ts` / `sheet.service.ts`
  / `toast.service.ts` use `runInInjectionContext(this.env, …)`;
  `locale/document-direction.ts:41-57` uses `provideEnvironmentInitializer`.
  I found no injection-context violations.
- **Core signal API is modern and consistent.** 511 `input()`/`model()`/`output()`
  declarations, 25 `input.required`, 130 `booleanAttribute` / 17 `numberAttribute`
  transforms, and only 7 unprefixed public members across 603 files.
- **The context (`*.context.ts`) pattern is real and consistent.** 34 context files,
  97 `InjectionToken`s, interface-typed tokens with `useExisting: forwardRef(...)`
  from the root — e.g. `slider.context.ts` documents a 25-member contract that four
  sibling directives consume without touching the concrete class.
- **Core test suite is substantive, not ceremonial.** 1,270 cases across 143 specs;
  spot-checks are behavioural (`accordion.spec.ts:227` "skips disabled items during
  arrow navigation", `menubar.spec.ts:279` "ArrowRight skips a disabled bar item",
  `navigator.spec.ts`, `type-ahead.spec.ts`).
- **Barrel hygiene at the top level is clean.** Every feature folder in both packages
  is exported from `public-api.ts` except the two CSS-only folders (`core/src/styles`,
  `components/src/overlay`).

---

## Findings

### F-1 CI has not run a single test since 2026-05-07 — and every npm publish since then was gated on it

**Severity:** critical *(upheld during verification; consequence widened)* · **Confidence:** high
**Files:** `.github/workflows/ci.yml:34-40`, `.github/workflows/release.yml`, `.github/workflows/deploy-docs.yml`, `.husky/pre-push`

```yaml
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

`git log -S "temporarily disabled" -- .github/workflows/ci.yml` → `2026-05-07 4b7487fe chore(ci): disable test + e2e steps temporarily`. That commit is both the one that disabled them **and the most recent commit touching `ci.yml`** — it was never reverted, and 369 commits have landed since. The job now runs only Install / Lint / Build.

**The release-pipeline consequence (added during verification).** `.github/workflows/release.yml` triggers on `workflow_run: workflows: ["CI"], conclusion == 'success'` and runs `changesets/action@v1` with `publish: pnpm release`. Because a green CI now means lint + build only, **every npm publish since 2026-05-07 has been gated on a check that executed zero tests**. Roughly 20 `chore: version packages` release commits have shipped under that gate, including `core@1.0.0` / `components@1.0.0` (2026-07-03) and five in the last two weeks (#57, #59, #62, #64, #65). `deploy-docs.yml` chains off the same CI success signal. The blast radius is **published packages consumed downstream**, not merely an internal quality gap.

**No compensating control exists.** The repo has exactly three workflows (`ci.yml`, `deploy-docs.yml` which only curls Render, `release.yml` which only runs changesets) and none invokes a test runner. `.husky/pre-push` never ran tests even before the disable — it runs `pnpm lint` and `changeset status --since=origin/main`, and self-skips when `$CI`/`$GITHUB_ACTIONS` is set. So the disable removed the only automated test execution anywhere in the repo. The scripts are live, not vestigial (root `package.json`: `"test": "turbo run test"`, `"test:e2e": "turbo run test:e2e"`).

**Volume (counts corrected).** ~1,292 core + ~478 components test cases — ~1,770 total across 143 + 65 spec files, plus 20+ Playwright e2e specs under `apps/docs/e2e`. (The originally reported 1,270 / 476 is a counting-methodology delta that does not change the conclusion.) Every other finding in this report is downstream of this one: 3 `it.skip` in core (`cascade-select.spec.ts:44`, `dropdown-menu.spec.ts:49` and `:60`), 3 `it.todo` stubs in components (`dropdown-menu`, `popover`, `tooltip` — each a single "rewrite for new overlay API" line), and the whole components coverage hole below survived precisely because nothing red-flags them. Two further `test.skip` calls in `apps/docs/e2e` are legitimate conditional env guards, **not** rot — do not count them. "Temporarily" is now the longest-standing architectural decision in the repo.

**Fix:** Re-enable the `Test` step first — it needs no browser download and it gates the release path. Treat E2E as a separate follow-up. Make `release.yml` depend on a CI run that includes tests **before the next publish**. If some specs are genuinely broken, quarantine them explicitly (`test.fails`, or a named `vitest --exclude` list checked into `vitest.workspace.ts` with an owner) rather than disabling the whole gate. Add `pnpm test` to `pre-push` behind a changed-package filter so the "run only what's relevant" rule still holds locally.
**Effort:** M

---

### F-2 `afterOpened$` is public API on three overlay refs and never emits

**Severity:** high · **Confidence:** high
**Files:** `packages/core/src/dialog/dialog.ref.ts:10-12`,
`packages/core/src/drawer/drawer.ref.ts:20-23`,
`packages/core/src/sheet/sheet.ref.ts:21-24`

```ts
  private readonly _afterOpened = new Subject<void>();
  private readonly _afterClosed = new Subject<R | undefined>();
  /** Emits once after the drawer has finished opening. */
  readonly afterOpened$: Observable<void> = this._afterOpened.asObservable();
```

`grep -rn "_afterOpened" packages/` returns exactly these six lines — the declaration
and the `asObservable()` in each of the three files. **`.next()` is never called.**
`_afterClosed` is correctly fired in `close()`; `_afterOpened` is not fired anywhere.

**Why it matters:** A documented, typed, published API (`@doc-category Core/Overlay`)
that silently never emits. A consumer awaiting `afterOpened$` hangs forever with no
error. This is the kind of defect a test would have caught instantly — see F-1 and
the zero-test dialog/drawer/sheet wrappers in F-5.

**Fix:** Emit from the controller's state transition to `'open'` (the refs already
mirror `controller.state`), or delete `afterOpened$` from all three and point
consumers at `state()` / `isOpen()`. Then add the spec.
**Effort:** S

---

### F-3 101 public inputs in `@kouji-ui/components` have no `kj` prefix

**Severity:** high · **Confidence:** high
**Files:** `packages/components/src/**` — e.g. `badge/badge.ts:90-98`,
`card/card.ts:82,107,108,173,193`, `avatar/avatar.ts:88-103`,
`accordion/accordion.ts:104,135,136`, `chart/chart.ts:93-109`,
`cascade-select/cascade-select.ts:129,132`, `checkbox/checkbox.ts:105,106`,
`input/input.ts:127-137`

```ts
// packages/components/src/badge/badge.ts:90
  readonly variant = input<KjBadgeVariant>('default');
  readonly size = input<'xs' | 'sm' | 'md' | 'lg'>('md');
  readonly dot = input(false, { transform: booleanAttribute });
  readonly bg = input<string>('');
```

`rules/code_style.md`: *"Every `input()`, `output()`, `model()` exposes a
`kj`-prefixed name externally. **No exceptions.** Applies to both core directives
and styled wrappers."* Counts: components 377 prefixed / 101 unprefixed (79%);
core 504 prefixed / 7 unprefixed (99%). None of the 101 uses an `alias: 'kj…'`
escape hatch (checked: 0 matches).

`input/input.ts` shows the incoherence inside a single class — `kjSize` is prefixed
while `type`, `variant`, `value`, `placeholder`, `invalid`, `disabled`,
`autocomplete`, `inputmode` are not.

**Why it matters:** Two conventions in one published API surface. `[variant]` and
`[bg]` on `kj-badge` will collide with consumer directives and with any future
Angular-native attribute. Fixing it later is a major breaking change for every
consumer; fixing it now, at 0.9.0, is cheap.

**Fix:** Add `alias: 'kjX'` to all 101 in one pass (non-breaking: keeps the class
member name, changes only the template-facing name), ship as a `minor` with a
codemod note, then drop the old names at 1.0. Enforce with a custom ESLint rule
(see F-15) so it cannot regress.
**Effort:** M

---

### F-4 26 boolean inputs in `components` lack `booleanAttribute`, so bare-attribute usage silently does nothing

**Severity:** high · **Confidence:** high
**Files:** `packages/components/src/button/button.ts:149-151`,
`accordion/accordion.ts:104,136`, `card/card.ts:173`, `checkbox/checkbox.ts:105,106`,
`cascade-select/cascade-select.ts:132`, `chat/prompt-input.ts:122,124`,
`color-picker/color-picker.ts:177,181`, `breadcrumb/breadcrumb.ts:223`, +14 more

```ts
// packages/components/src/button/button.ts:149
  readonly kjDisabled = input(false);
  readonly kjLoading = input(false);
  readonly kjFullWidth = input(false);
```

The *core* directive these forward to (`packages/core/src/primitives/interaction/
disabled.ts:30`) does it correctly:

```ts
  readonly disabled = input<boolean, unknown>(false, { alias: 'kjDisabled', transform: booleanAttribute });
```

96 other inputs in `packages/components` do use `booleanAttribute`, so this is
inconsistency, not policy.

**Why it matters:** `<kj-button kjLoading>` — the natural, documented-looking HTML —
resolves to the empty string, which is falsy, so the spinner never renders and the
button is not disabled. The developer gets no error. Only `[kjLoading]="true"` works.
Same for `<kj-card padded>`, `<kj-checkbox indeterminate>`, `<kj-accordion-item
disabled>`.

**Fix:** Add `{ transform: booleanAttribute }` to all 26. Mechanical, safe
(`booleanAttribute(true) === true`), one commit.
**Effort:** S

---

### F-5 19 component features have zero real tests, including every overlay wrapper

**Severity:** high · **Confidence:** high
**Files:** `packages/components/src/{cascade-select,checkbox,command-palette,dialog,
icon,input-group,input-mask,input-otp,menubar,overflow,overlay,radio,sheet,toast,
toggle,tree-select}/` (no spec file at all), plus three placeholder specs:

```ts
// packages/components/src/popover/popover.spec.ts (entire file, 5 lines)
import { describe, it } from 'vitest';

describe('KjPopover (wrapper)', () => {
  it.todo('rewrite for new overlay API (KjPopoverTrigger / KjPopoverContent primitives)');
});
```

Identical stubs at `components/src/dropdown-menu/dropdown-menu.spec.ts:4` and
`components/src/tooltip/tooltip.spec.ts:4`. Core also carries 3 `it.skip`:
`core/src/cascade-select/cascade-select.spec.ts:44`,
`core/src/dropdown-menu/dropdown-menu.spec.ts:49,60`.

Shape: core 143 specs / 1,270 cases across 72 features (2 uncovered: `overflow`,
`styles`). Components 65 specs / 476 cases across 73 features — 19 uncovered, and
the median covered feature has 5 cases. 41 of 476 assertions are `should create` /
bare `toBeTruthy()`.

**Why it matters:** The uncovered set is exactly the highest-risk surface —
focus traps, scroll lock, Escape routing, portal mount/unmount, live-region
announcements. `dialog`, `sheet`, `toast`, `tooltip`, `popover`, `dropdown-menu`,
`tree-select`, `menubar` are all untested at the wrapper layer, and F-2 is the proof
that something is already broken there.

**Fix:** Per `CLAUDE.md`'s own per-feature test rule, add one behavioural spec per
uncovered feature (open/close, focus restore, Escape, ARIA wiring), and convert the
three `it.todo` stubs against the current overlay API. Do it in priority order:
dialog → sheet → toast → tooltip/popover/dropdown-menu → the rest.
**Effort:** L

---

### F-6 `KjTabList` fights its own composed primitive with an event-swallowing hack, and its TSDoc documents a mechanism that does not exist

**Severity:** high · **Confidence:** high
**Files:** `packages/core/src/tabs/tabs.ts:178-228`, `packages/core/src/a11y/roving-tabindex.ts:111`

The doc block claims:

```ts
 * Orientation is read from the parent `KJ_TABS` context and forwarded to the
 * roving primitive through its `kjRovingOrientation` input via a host binding
 * on the exposed input.
```

The implementation does no such thing:

```ts
@Directive({
  selector: '[kjTabList]',
  hostDirectives: [KjRovingTabindex],      // ← no `inputs:` forwarding
  host: { '[attr.role]': '"tablist"', … }, // ← no kjRovingOrientation binding
})
export class KjTabList implements OnInit, OnDestroy {
  private readonly keydownFilter = (event: KeyboardEvent): void => {
    const orientation = this.tabs.orientation();
    if (orientation === 'horizontal') {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        // Off-axis: prevent the composed KjRovingTabindex from acting.
        event.stopImmediatePropagation();
      }
    } …
  };

  ngOnInit(): void {
    this.el.nativeElement.addEventListener('keydown', this.keydownFilter, true);
  }
  ngOnDestroy(): void {
    this.el.nativeElement.removeEventListener('keydown', this.keydownFilter, true);
  }
}
```

`KjRovingTabindex` has had the exact input needed since the same commit
(`roving-tabindex.ts:111`, `readonly kjRovingOrientation = input<'horizontal' |
'vertical' | 'both'>('both')`), and three siblings use it correctly:
`core/src/list/list.ts:100` and `core/src/stepper/stepper.ts:71`
(`inputs: ['kjRovingOrientation: kjOrientation']`), `core/src/tag/tag-list.ts:45`.

**Why it matters:** Triple violation in one class — banned lifecycle interfaces
(`rules/code_style.md`: "No `ngOnInit`, `ngOnDestroy`"), manual DOM listener where
a host binding + `DestroyRef` is the house style, and a capture-phase
`stopImmediatePropagation` that will swallow *any* other consumer keydown handler
on the tablist. Worst of all, the TSDoc asserts the clean design while the code does
the dirty one, so a reader auditing the file believes it is fine.

**Fix:** Replace the whole class body with
`hostDirectives: [{ directive: KjRovingTabindex, inputs: [] }]` plus a host binding
that feeds `tabs.orientation()` into `kjRovingOrientation`, exactly as `stepper.ts`
does. Delete `keydownFilter`, `ngOnInit`, `ngOnDestroy`. Keep the doc block.
**Effort:** S

---

### F-7 Two naming eras coexist; the CLAUDE.md naming rule is followed in core and inverted in components

**Severity:** medium · **Confidence:** high
**Files:** 160 classes across `packages/components/src/**` vs 27 that omit the suffix

`CLAUDE.md`: *"Omit the Angular type suffix (`Directive`, `Component`, `Service`,
`Pipe`) from class names **unless** two things in the same feature would otherwise
share the same base name."*

Era A (majority, 160 classes) keeps the suffix unconditionally:
`KjBadgeComponent`, `KjCardComponent`, `KjCardCoverComponent`, `KjCardHeaderComponent`,
`KjCardTitleComponent`, `KjCarouselViewportComponent`, `KjBreadcrumbListComponent`, …
Era B (27 classes, all recent) follows the rule: `KjChatMessage`, `KjChatThread`,
`KjPromptInput`, `KjDirectionToggle`, `KjTableVirtual`, `KjTextEditor`,
`KjNumberFilter`, `KjBulkAction`, `KjTableEmptyTemplate`. `git log` dates confirm the
split (card.ts 2026-05-15, badge.ts 2026-07-03 vs chat-message.ts 2026-09-06).

Four classes keep `Directive` with **no** collision at all:
- `packages/core/src/icon/icon.directive.ts:75` — `KjIconDirective` (also the only
  `.directive.ts` filename in core; nothing else in that folder is named `icon`)
- `packages/core/src/a11y/roving-tabindex.ts:38` — `KjRovingTabindexItemDirective`
- `packages/core/src/rich-text/rich-text-extension.ts:29` — `KjRichTextExtensionDirective`
- `packages/components/src/table/table-cell-template.ts:29` — `KjCellTemplateDirective`

**Why it matters:** The rule exists to make the public API predictable; with both
conventions live, a consumer cannot guess whether the symbol is `KjSelect` or
`KjSelectComponent`. If the *real* policy is "core drops the suffix, components keep
it to disambiguate across packages", that is a defensible design — but it is not what
`CLAUDE.md` says, so either the rule or the code is wrong.

**Fix:** Decide and write it down. Recommended: amend `CLAUDE.md` to state the
cross-package disambiguation explicitly ("a styled wrapper over a core directive of
the same name keeps `Component`"), then fix the 27 Era-B outliers to match, and drop
the gratuitous `Directive` suffix from the four classes above (+ rename
`icon.directive.ts` → `icon.ts`).
**Effort:** M

---

### F-8 `@angular/cdk` is a peer dependency of both published packages despite zero CDK imports

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/package.json:23,32`, `packages/components/package.json:28`

```json
  "description": "Headless Angular 21 UI primitives — directives over CDK with WCAG 2.1 AAA semantics and zero CSS.",
  "keywords": ["angular","ui","headless","directives","cdk","a11y","wcag"],
  "peerDependencies": { "@angular/cdk": "^22.0.0", … }
```

`grep -rn "from '@angular/cdk" packages apps` → **0 matches.** `rules/stack.md`:
*"Zero external UI deps. No Angular CDK."* The code obeys; the manifest does not.
The description also still says "Angular 21" while peers require `^22.0.0`, and
`CLAUDE.md`'s accessibility checklist still tells authors to use `CdkFocusTrap`
(the real one is
`packages/core/src/primitives/overlay/strategies/focus-trap/`).

Related unapproved deps: `rules/stack.md`'s approved table lists only
`@tanstack/angular-table` and `apache-echarts`, yet `packages/components/package.json`
ships `marked` and `@tanstack/virtual-core` as runtime `dependencies`, and both
packages carry the `lexical` (9 packages) and `monaco-editor` peer families.

**Why it matters:** Every consumer is forced to install a large dependency the
library never loads, and the npm page advertises the opposite of the project's
headline technical differentiator ("zero external UI deps").

**Fix:** Drop `@angular/cdk` from both `peerDependencies`, from the root
`dependencies`, and from `keywords`; rewrite the two `description` strings
("Angular 22", "no CDK"); remove the `CdkFocusTrap` reference from `CLAUDE.md`.
Update `rules/stack.md`'s approved table to list what actually ships, or remove the
deps that should not.
**Effort:** S

---

### F-9 `core` is not headless: 17 hard-coded class names, 2 inline style declarations, 5 stylesheets, 12 element components

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/overlay-badge/overlay-badge.ts:56`,
`overlay-badge/overlay-badge-content.ts:46`, `dropdown-menu/dropdown-menu-*.ts`,
`select/select-option.ts:31`, `sheet/sheet.ts:41`, `drawer/drawer.ts:33`,
`popover/popover-title.ts:32`, `command-palette/command-item.ts:46`,
`combobox/combobox-option.ts:30`, `confirm-popup/confirm-popup-message.ts:30`;
`core/src/styles.css`, `core/src/icon/icon.css`, `core/src/typography/prose.css`,
`core/src/motion/motion.css`, `core/src/primitives/overlay/overlay.css`

```ts
// packages/core/src/overlay-badge/overlay-badge-content.ts:46
    'style': 'position: absolute; pointer-events: none;',
// packages/core/src/overlay-badge/overlay-badge.ts:56
    'style': 'position: relative;',
// packages/core/src/dropdown-menu/dropdown-menu-content.ts:144
    'class': 'kj-dropdown-menu',
```

`rules/architecture.md`: *"`@kouji-ui/core` — directives only, zero CSS, zero
components."* Reality: 17 literal `class: 'kj-*'` hosts, 2 literal inline `style`
declarations, 5 CSS files (3 of them shipped as package `exports`), and 12
element-selector `@Component`s (`kj-dialog`, `kj-drawer`, `kj-sheet`, `kj-toast`,
`kj-select-content`, `kj-popover-content`, `kj-tooltip-content`,
`kj-dropdown-menu-content`, `kj-tree-select-content`, `kj-backdrop`,
`kj-overlay-wrapper`, `kj-command-palette-dialog`).

To be fair: the ~40 `[style.--kj-*]` custom-property bindings (slider fractions,
progress fraction, avatar-group count, carousel slides-per-view) are *correct*
headless practice — they publish a data channel, not a look. The problem is only the
literal class names and the two inline `style` strings, which hard-wire the styled
layer's class contract into the headless one. `core/src/styles/docs-themes.css` is a
docs-app concern living in the library source (referenced only by `_examples/` and
`apps/docs/src/lib/examples.ts:39`).

**Why it matters:** A consumer using core headlessly gets `class="kj-dropdown-menu"`
on their element whether they want it or not, and cannot reproduce
`kj-overlay-badge`'s layout without knowing that core already set
`position: relative`. It also means the "zero CSS" selling point in the package
description is false.

**Fix:** Move the 17 class names and 2 inline styles into the `@kouji-ui/components`
wrappers (or to `data-kj-*` attributes if the CSS needs a hook that survives the
headless path). Either genuinely hold the line or amend `rules/architecture.md` to
say "core ships structural CSS for the overlay/icon/prose primitives only" — which is
the honest description of the current design. Move `docs-themes.css` under
`apps/docs/`.
**Effort:** M

---

### F-10 `ViewEncapsulation.None` used 183 times against an explicit "do not use" rule

**Severity:** medium · **Confidence:** high
**Files:** 172 occurrences in `packages/components/src` (80 files), 11 in
`packages/core/src`, 4 in `apps/docs/src` — e.g.
`components/src/action-sheet/action-sheet.ts:129`, `button/button.ts:134`,
`input/input.ts:119`

`rules/code_style.md`: *"Do not use `encapsulation: ViewEncapsulation.None`.
Component styles must stay scoped. The only exception is generated SVG that needs
global classes."*

**Why it matters:** This is not drift, it is the library's actual styling
architecture (every wrapper is `host: { style: 'display: contents;' }` + a global
`.kj-*` class from a `styleUrl`), applied 183 times. A rule that 100% of the styled
layer violates is worse than no rule — it trains authors to ignore `rules/`. It also
means the `styleUrl` CSS files are effectively global, which is why F-9's core class
names leak in the first place.

**Fix:** Rewrite the rule to describe the real policy: "styled wrappers use
`ViewEncapsulation.None` with a `@layer kj.component` stylesheet and `kj-`-prefixed
class names; app-level components must stay scoped." Then add a lint rule that
enforces the `@layer` + `kj-` prefix requirement, which is the property you actually
care about.
**Effort:** S (rule) / M (if you instead decide to scope the styles)

---

### F-11 Five bespoke `ControlValueAccessor`s bypass `KjFormControl`, and `KjFormControl` exposes half of what the rules promise

**Severity:** medium · **Confidence:** high
**Files:** `packages/components/src/input/input.ts:96-102,127,140,155-168`,
`components/src/textarea/textarea.ts:146`, `components/src/input-otp/input-otp.ts:103`,
`components/src/color-picker/color-picker.ts:107`,
`core/src/rich-text/rich-text-editor.ts:97`;
`packages/core/src/primitives/forms/form-control.ts:43-51`

`rules/architecture.md`: *"All form inputs compose `KjFormControl` via
`hostDirectives`. Single `ControlValueAccessor`. Exposes: `value`, `disabled`,
`touched`, `dirty`, `valid`, `invalid`."*

`KjFormControl` exposes three of those six — `value`, `disabled`, `touched`.
`dirty`, `valid`, `invalid` do not exist. And five other classes register their own
`NG_VALUE_ACCESSOR`, forwarding by hand:

```ts
// packages/components/src/input/input.ts:140
  @ViewChild(KjInput, { static: true })
  protected innerInput?: KjInput;
  …
  writeValue(val: unknown): void { this.innerInput?.formCtrl.writeValue(val); }
  registerOnChange(fn: (value: unknown) => void): void { this.innerInput?.formCtrl.registerOnChange(fn); }
```

Note the same class uses `viewChild()` (signal) for `nativeInput` two lines above and
the `@ViewChild` decorator here — two eras in nine lines.

**Why it matters:** Five hand-written CVA shims are five places to get `touched`,
`disabled` propagation, or `setDisabledState` subtly wrong, and the missing
`dirty`/`valid`/`invalid` means wrapper authors reach for `formCtrl.touched() &&
kjInvalid()` ad hoc (`core/src/input/input.ts:61-62`) instead of a shared contract.

**Fix:** Add `dirty`, `valid`, `invalid` to `KjFormControl` (it already owns the
`_onChange` hook, so `dirty` is a one-liner). Replace the five bespoke CVAs with
`hostDirectives: [KjFormControl]` + `exportAs`, or, where the wrapper must forward,
extract a single `KjFormControlProxy` directive instead of copying the shim.
**Effort:** M

---

### F-12 Concrete duplication: two identical overlay refs, five copy-pasted cell editors, two competing navigation primitives

**Severity:** medium · **Confidence:** high

**(a) `KjDrawerRef` and `KjSheetRef` are byte-identical apart from names.**
`packages/core/src/drawer/drawer.ref.ts` (63 lines) vs
`packages/core/src/sheet/sheet.ref.ts` (64 lines) — `diff` differs only in the class
name, the three doc sentences, and the error string. `KjDialogRef` (42 lines) is the
same shape minus the state signals. All three carry the dead `afterOpened$` of F-2.

**(b) Five table cell editors re-implement the same commit state machine.**
`packages/components/src/table/table-editors/{text,number,date,select,boolean}-editor.ts`:

```ts
// text-editor.ts:40-80 — and, verbatim, in number-editor.ts:40-89
  private settled = false;
  private mounted = false;
  …
  protected cancel(): void {
    if (this.settled) return;
    this.settled = true;
    this.ctx.cancel();
  }
  protected onFocusOut(event: FocusEvent): void {
    if (!this.mounted || this.settled) return;
    const next = event.relatedTarget as Node | null;
    if (next && this.hostEl.nativeElement.contains(next)) return;
    this.commit();
  }
```

plus the identical
`constructor() { this.draft.set(…); afterNextRender(() => { this.X()?.focus(); this.mounted = true; }); }`.

**(c) Two competing roving/navigation primitives.** `core/src/a11y/roving-tabindex.ts`
(DI-registered, used by list, stepper, tag-list, tabs, carousel, date-range-presets)
and `core/src/primitives/list/navigator.ts` (used by select, combobox, command-palette,
dropdown-menu, menubar, cascade-select, tree-select). Both own arrow-key handling,
disabled-skipping, and orientation. Twelve more files hand-roll `'ArrowDown'`
handling on top: `calendar-grid.ts`, `color-picker.ts`, `date-picker-trigger.ts`,
`number-input.ts`, `time-picker-segment.ts`, `time-picker-meridiem.ts`,
`table-keyboard.ts`, `tree-select-trigger.ts`, `accordion.ts`, `carousel.ts`,
`menubar.ts`, `tabs.ts`.

**Why it matters:** (a) and (b) are pure copy-paste — a fix to the focus-out guard
lands in one of five files. (c) is the more expensive one: two primitives with
overlapping responsibility means every new composite widget author must first work
out which one applies, and the answer is currently "whichever era the neighbouring
feature was written in".

**Fix:** (a) Extract `KjOverlayRef<T, R>` in `primitives/overlay/` and have
`KjDialogRef`/`KjDrawerRef`/`KjSheetRef` extend it (keeps the three token identities
for DI). (b) Extract a `KjCellEditorHost` host-directive owning
`settled`/`mounted`/`onFocusOut`/`commit`/`cancel`; each editor keeps only its
`draft` type and template. (c) Decide which primitive is canonical, document the
split (`roving-tabindex` = static composite toolbars; `list/navigator` = collections
with selection/type-ahead), and make the other delegate.
**Effort:** (a) S · (b) M · (c) L

---

### F-13 Dev-mode diagnostics exist in 12 of ~74 core features, with four different message prefixes

**Severity:** medium · **Confidence:** high
**Files:** only `core/src/{alert,breadcrumb,kbd,list,pagination,presets/size,
presets/variant,progress-bar,typography/blockquote,typography/code,typography/lead,
typography/truncate}.ts` guard with `isDevMode()`; plus `core/src/form/form.ts:162`
(the single `ngDevMode` usage) and `core/src/rich-text/engine.ts` (`console.error`).

The good pattern, from `packages/core/src/progress-bar/progress-bar.ts:183-214`:

```ts
    if (isDevMode()) {
      effect(() => {
        const lo = this.kjMin(); const hi = this.kjMax();
        if (lo >= hi) {
          throw new Error(`[kj] KjProgressBar: kjMin (${lo}) must be less than kjMax (${hi}).`);
        }
      });
```

and `alert.ts:213-260`, which warns on unknown variant, unknown size, missing
accessible name, empty content, and `assertive`+`success`. That is excellent.

Everywhere else, misuse is silent. A `[kjSliderThumb]` outside `[kjSlider]` produces
Angular's raw `NG0201: No provider for InjectionToken KjSlider` — and 50
`inject(..., { optional: true })` calls across core mean many parent/child mistakes
produce no error at all, just a dead widget. Message prefixes are inconsistent:
`[kj-alert]`, `[kj] KjProgressBar:`, `[KjForm]`, `[KjRichTextEditor]`.

**Why it matters:** For a primitives library, misuse diagnostics *are* the API
documentation. 84% of features give none.

**Fix:** Add a tiny `assertParent(token, childName, parentSelector)` helper in
`core/src/a11y/` or `primitives/` that throws a formatted message under
`ngDevMode`, and use it at every non-optional context `inject()` site (~80 call
sites, mechanical). Standardise on `ngDevMode` rather than `isDevMode()` so the
blocks are tree-shaken out of production bundles, and on one prefix format
(`[kjSliderThumb]` — the selector, which is what the developer typed).
**Effort:** M

---

### F-14 TSDoc: 30% of component inputs undocumented, and the themed-example system is essentially unused

**Severity:** medium · **Confidence:** high
**Files:** `rules/tsdoc.md` vs `packages/**`

Measured (declarations of `input`/`model`/`output` with a preceding `/** */`):
- core: **474/511 (92.8%)** documented
- components: **339/482 (70.3%)** documented — e.g. `button/button.ts:149-151`
  (`kjDisabled`, `kjLoading`, `kjFullWidth` all bare, while `kjVariant` and `kjSize`
  immediately above have full blocks), `alert/alert.ts:136-140`,
  `accordion/accordion.ts:104,135,136`

`@doc-*` tag coverage:

| tag | core | components |
|---|---|---|
| unique `@doc-name` pages | 70 | 69 |
| `@doc-is-main` | 65 | 68 |
| `@doc-description` | 72 | 60 |
| `@doc-theme` | **7** | **0** |
| `@doc-keyboard` | 2 | 58 |
| `@doc-aria` | 3 | 67 |

- **`@doc-theme` is used by exactly two symbols** — `core/src/button/button.ts:61-65`
  and `core/src/toast/toast.ts:27-31` — despite `rules/tsdoc.md` devoting a whole
  section ("Themed example references": shadcn / retroui.dev / Ant Design) to it.
- **Six themed example files are orphaned**: `core/src/dialog/_examples/dialog.{retro,
  finance}.example.ts`, `popover/_examples/popover.{retro,finance}.example.ts`,
  `tooltip/_examples/tooltip.{retro,finance}.example.ts` are registered in
  `core/src/example-components.ts:43,44,50,51,56,58` but referenced by no
  `@doc-file`/`@doc-theme` tag anywhere — they render on no docs page.
- 5 core pages have a `@doc-name` but no `@doc-is-main`.
- `core/src/radio/radio.context.ts` is a 3-line file with zero TSDoc, while every
  other context file documents each member (contrast `slider.context.ts`).
- **`rules/tsdoc.md` documents 7 tags; the generator supports ~20.**
  `grep -rho "doc-[a-z-]*" tools scripts apps/docs` yields `doc-a11y`, `doc-aria`,
  `doc-blocks`, `doc-callout`, `doc-css-var`, `doc-import`, `doc-keyboard`,
  `doc-order`, `doc-prereqs`, `doc-related`, `doc-tags`, `doc-title`, `doc-touch`,
  `doc-typo` — none of which the rules file mentions.

**Why it matters:** Authors follow `rules/tsdoc.md`, which is missing two-thirds of
the vocabulary; the richest tags (`@doc-keyboard`, `@doc-aria`, `@doc-touch`) are
therefore near-absent from core, where the keyboard contracts actually live.

**Fix:** (1) Regenerate the tag table in `rules/tsdoc.md` from the extractor's
supported set, with a one-line purpose each. (2) Close the 143 undocumented
components inputs. (3) Either wire the six orphaned retro/finance examples into
`@doc-theme` blocks or delete them. (4) Add an extractor check that fails the build
on a `@doc-name` page with no `@doc-is-main` or no `@doc-description`.
**Effort:** M

---

### F-15 ESLint enforces none of the seven rules files — this is the root cause of every drift finding

**Severity:** medium · **Confidence:** high
**Files:** `eslint.config.js` (whole file, 82 lines)

The only project-specific rules configured are `@angular-eslint/directive-selector`
and `component-selector` (the `kj` prefix on *selectors*). Nothing checks:

| Rule in `rules/` | Enforced? | Drift found |
|---|---|---|
| `kj` prefix on every input/output/model | no | 101 violations (F-3) |
| No `@Input()`/`@Output()` | no | 6 `@Output` + `EventEmitter` in `core/file-upload/file-upload.ts:139-145`, `components/file-upload/file-upload.ts:252-254` |
| No lifecycle interfaces | no | 23 classes `implements OnInit/OnDestroy/AfterViewInit/AfterContentInit` |
| No `ViewEncapsulation.None` | no | 183 (F-10) |
| Class/file suffix rule | no | 187 (F-7) |
| One directive per file | no | 33 files with 3+ (`core/src/carousel/carousel.ts` = 9 directives in 919 lines) |
| No Observables / `Subject` for state | no | 6 `Subject`s in the three overlay refs; `rxjs/operators` `debounceTime` in `components/src/table/table-filters/text-filter.ts:12` |
| Always `inject()`, no constructor params | no | 6 (`drawer.ref.ts:32`, `sheet.ref.ts:33`, `input-mask.engine.ts:38`, …) |
| Decorator queries → signal queries | no | 4 `@ViewChild` (`components/{carousel:161,color-picker:194,file-upload:257,input:140}`), 3 `@HostListener` (`core/{command-input:72,drawer:118,sheet:140}`) |

**Why it matters:** Prose rules with no enforcement decay monotonically. The measured
gap between core (written when the rules were fresh and small) and components
(written across three eras) is exactly what an unenforced style guide produces.

**Fix:** Add, in rough order of value/effort: `@angular-eslint/prefer-signals`,
`no-input-rename`, `use-component-view-encapsulation`, `prefer-output-emitter-ref`,
plus two ~30-line custom rules — "public signal members must match `/^kj[A-Z]/` (or
carry an `alias:` that does)" and "boolean-defaulted `input()` must declare
`transform: booleanAttribute`". Land them as `warn` first, burn the backlog, then
flip to `error`.
**Effort:** M

---

### F-16 Public-API drift: stale version constant, 8 example components published, an unpublishable wildcard import path

**Severity:** medium · **Confidence:** high
**Files:** `packages/components/src/public-api.ts:2`,
`packages/components/src/icon/index.ts:2-5`,
`packages/components/src/input-mask/index.ts:3-10`, `tsconfig.json:12-17`,
`packages/core/package.json` (`exports`)

```ts
// packages/components/src/public-api.ts:2
export const KJ_COMPONENTS_VERSION = '0.0.1';   // package.json says 0.9.0
```

```ts
// packages/components/src/icon/index.ts — demo code in the published API
export { KjIconGalleryExample, KjIconUsageExample } from './_examples';
// packages/components/src/input-mask/index.ts — six more
export { KjInputMaskExample, KjInputMaskUsageExample, KjInputMaskCreditCardExample,
         KjInputMaskDateExample, KjInputMaskValidationExample,
         KjInputMaskCustomTokensExample } from './_examples';
```

```jsonc
// tsconfig.json:14 — resolves in-repo, does not exist in the published package
"@kouji-ui/core/*": ["packages/core/src/*"],
```

`packages/core/package.json`'s `exports` map lists only three CSS subpaths; ng-packagr
emits one flat FESM. Any `@kouji-ui/core/<subpath>` import therefore typechecks
locally and fails for consumers. Today only `apps/docs/src/app/services/
example-registry.service.ts:9` uses it (`@kouji-ui/core/examples`), but the wildcard
also lets any package file bypass `public-api.ts` silently.

**Why it matters:** `KJ_COMPONENTS_VERSION` is a lie any consumer can read; 8 demo
components inflate the published bundle and appear in IDE autocomplete; the wildcard
path is a build-passes-then-breaks-for-users trap.

**Fix:** Generate `KJ_COMPONENTS_VERSION` from `package.json` at build time or delete
it. Drop the `_examples` re-exports from the two `index.ts` files (the docs app reads
them through `example-components.ts`, not the barrel). Replace
`"@kouji-ui/core/*"` with explicit entries for the paths you actually intend
(`/examples`, the three CSS files) and mirror them in each package's `exports` map.
**Effort:** S

---

### F-17 `kj-menubar` is published but functionally incomplete, per its own TODO, with zero tests

**Severity:** low · **Confidence:** high
**Files:** `packages/components/src/menubar/menubar.ts:126-129`,
`packages/components/src/public-api.ts`

```ts
 * TODO: menubar+dropdown-menu wiring pending overlay-migration follow-up.
 * In this version, menubar items are plain action buttons without submenu
 * support. Submenu wiring will be reintroduced via the new dropdown-menu
 * API (`<kj-dropdown-menu-content [kjFor]="t">` on the panel side).
```

`components/src/menubar/` has no spec file. `core/src/menubar/` does (`menubar.spec.ts`).

**Why it matters:** A menubar without menus is shipped at 0.9.0 under a name that
promises otherwise, and nothing tests the reduced behaviour either. Related stale
TODO: `core/src/stepper/stepper.ts:23` references "when the Progress Bar primitive
lands at `packages/core/src/feedback/progress-bar/`" — the primitive exists, at
`packages/core/src/progress-bar/`.

**Fix:** Either finish the dropdown wiring or mark the export experimental and say so
on the docs page. Delete the stale stepper TODO.
**Effort:** S (label) / M (finish)

---

### F-18 Shared filter contract lives inside one sibling's file instead of a `*.context.ts`

**Severity:** low · **Confidence:** high
**Files:** `packages/components/src/table/table-filters/text-filter.ts:19-30`,
imported by `select-filter.ts:12`, `date-filter.ts`, `number-filter.ts`

```ts
// declared in text-filter.ts
export const KJ_FILTER_CONTEXT = new InjectionToken<KjFilterContext>('kj.filter.context');
// consumed in select-filter.ts:12
import { KJ_FILTER_CONTEXT, type KjFilterContext } from './text-filter';
```

`rules/architecture.md`'s folder layout mandates `<component>.context.ts`. Also note
the token string is `'kj.filter.context'` while all 34 core context tokens use the
class-name form (`'KjSlider'`, `'KjAccordion'`).

**Why it matters:** Three filters import a peer filter purely for a token —
a needless edge in the import graph and a latent cycle if `text-filter` ever needs
something from a sibling. It is also the only place in the repo where the context
convention is broken.

**Fix:** Move `KjFilterContext` + `KJ_FILTER_CONTEXT` to
`table-filters/filters.context.ts`, re-export from `table-filters/index.ts`, and
normalise the token description to `'KjTableFilter'`.
**Effort:** S

---

## Recommended work items

Ordered by (risk removed ÷ effort).

1. **Re-enable tests in CI, before the next publish** — F-1. `release.yml` triggers on a
   green CI, so every npm publish since 2026-05-07 (including `core@1.0.0`) shipped
   untested. Nothing else on this list is durable until a red build is possible
   again. Quarantine broken specs explicitly.
2. **Fix or remove `afterOpened$`** on the three overlay refs, and add the spec —
   F-2. One hour, removes a live API lie.
3. **Add `booleanAttribute` to the 26 boolean inputs** — F-4. Mechanical, fixes
   `<kj-button kjLoading>` and 25 siblings.
4. **Rewrite `KjTabList`** to forward `kjRovingOrientation` through `hostDirectives`,
   deleting `keydownFilter` + the two lifecycle hooks — F-6, F-15.
5. **Manifest cleanup** — drop `@angular/cdk` peers/keywords, fix the "Angular 21"
   and "over CDK" descriptions, generate `KJ_COMPONENTS_VERSION`, drop the eight
   `_examples` re-exports, tighten the tsconfig path map — F-8, F-16.
6. **Land the lint rules as warnings** — F-15. Two custom rules (kj-prefix,
   booleanAttribute) plus four stock Angular ESLint rules. This is what stops
   findings F-3/F-4/F-7/F-10/F-18 from reappearing.
7. **Alias the 101 unprefixed component inputs** — F-3. Non-breaking as an alias
   pass; schedule the member renames for 1.0.
8. **Reconcile the rules files with reality** — F-7 (naming), F-9 (core CSS policy),
   F-10 (`ViewEncapsulation.None`), F-11 (`KjFormControl` member list), F-14
   (`@doc-*` tag table). Half of these are a rules edit, not a code change; do the
   edit deliberately rather than leaving rules that are 100% violated.
9. **Extract the three duplication primitives** — F-12: `KjOverlayRef` base (S),
   `KjCellEditorHost` (M), then the roving-vs-navigator decision (L).
10. **Add `assertParent()` dev diagnostics** at the ~80 non-optional context inject
    sites, standardising on `ngDevMode` and the selector-name prefix — F-13.
11. **Close the components test hole** — F-5. Priority order: dialog, sheet, toast,
    tooltip/popover/dropdown-menu, tree-select, menubar, then the rest.
12. **TSDoc backfill** — F-14: 143 component inputs, the five missing
    `@doc-is-main`, `radio.context.ts`, and the six orphaned themed examples.
13. **Small cleanups** — F-17 (menubar label + stale stepper TODO), F-18
    (`filters.context.ts`).

---

## Open questions

1. **Is the `Component` suffix on styled wrappers intentional cross-package
   disambiguation?** If yes, `CLAUDE.md` should say so and the 27 Era-B classes are
   the bugs. If no, 160 classes need renaming before 1.0. This decision blocks F-7
   and should be made before any more components are added.
2. **Is `ViewEncapsulation.None` + global `.kj-*` classes the intended styling
   architecture?** 183 usages say yes; `rules/code_style.md` says no. If yes, F-9's
   core class names become defensible and the rule needs rewriting; if no, the
   styled layer needs a large refactor.
3. **Which navigation primitive is canonical** — `KjRovingTabindex` or
   `KjListNavigator`? Without an answer, F-12(c) cannot be scoped and the next
   composite widget will pick a third path.
4. **Why were tests disabled on 2026-05-07?** The commit says "being fixed in a
   separate scope". Knowing how many specs actually fail today changes F-1 from
   "flip a flag" to a multi-day effort — worth measuring before planning.
5. **Are `lexical`, `monaco-editor`, `marked`, `@tanstack/virtual-core` and
   `culori` approved?** `rules/stack.md` lists only `@tanstack/angular-table` and
   `apache-echarts`, with "New dep needs → raise explicitly. Default: no." Five
   unlisted runtime/peer deps ship today. Either the table is stale or the policy
   was bypassed.
6. **Should `docs-themes.css` and the `_examples/` trees live inside the published
   packages at all?** They are currently compiled as part of the library source tree
   and two of them leak into the public API.
