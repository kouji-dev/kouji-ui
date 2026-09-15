# Customization / Extensibility API Review

> **Adversarially verified 2026-09-15.** Findings below marked *(severity corrected during verification)* were re-checked against the source; corrections are inline. Refuted findings are preserved in **Refuted during verification** at the end of the findings list, not deleted.

Scope: `packages/core/src/presets/*`, DI config tokens across `packages/core` + `packages/components`,
content projection / template escape hatches, i18n + locale, icon registry, motion, directionality,
CSS override mechanism, and the declared vs actual public API surface.
Micro-frontend (MFE) co-existence treated as a first-class constraint.

---

## Verdict

There is not *one* customization story here — there are **four**, and they do not agree.
(1) An **open, DI-driven string-preset system** (`bindPresets` + `KJ_VARIANT_PRESET`/`KJ_SIZE_PRESET` +
`provideKj<Component>()`) that is genuinely good: three-level resolution (explicit input > cascade
context > configured default), works at root / route / component-subtree, dev-mode allowlist warning.
(2) A **closed TypeScript union** story (`KjBadgeVariant`, `KjInputVariant`, `KjToastVariant`,
`card`'s inline `'default' | 'outline' | 'subtle'`) on ~10 components that no `provideKj*` can touch.
(3) A **CSS-custom-property / `@layer`** story that is the only real per-instance escape hatch — and is
silently defeated on every non-default variant because variant rules declare the knobs on the element.
(4) A **typed i18n catalog** (`KjTranslateService`, `EN_CATALOG`) that only three components use, while
pagination, breadcrumb, spinner, color-picker, command-palette and date-picker keep a *second,
duplicate* copy of the same English strings inside their config tokens — `EN_CATALOG['pagination.next']`
and `KJ_PAGINATION_DEFAULTS.nextLabel` are both `'Next page'`, and the pagination directive reads the
latter, so switching locale does nothing for it.

**Post-verification correction to this paragraph.** The original verdict claimed the global surfaces
are broadly unscopable and that two MFEs would fight over them. Adversarial verification cut that
down substantially. What survives: `KjLocale` is `providedIn: 'root'`, so `provideKjLocale`'s TSDoc
promise of route-level sub-tree scoping (`locale.config.ts:49-50`) is false — a one-line doc fix
(F-1, low), and the design spec says locale is deliberately a global concern. What was **refuted**:
`provideIcons` documents and tests "later calls win on key collision" (no scoping promise to break);
translation catalogs are `multi: true` and merge additively **keyed by locale tag**, so they never
collide; listing `KjLocale` in a route's `providers` is a working one-line escape hatch today; and
two bootstrapped apps get separate root injectors anyway. The scroll lock **is** token-driven
(`KJ_OVERLAY_SCROLL_LOCK_STRATEGY`, `tokens.ts:51`) and `<html dir>` has an opt-in seam
(`provideKjDocumentDirection` is separately registered; `provideKjLocale({direction:'rtl'})` scopes
without it) — so the original F-2 was refuted in full. The redeeming detail stands: the *preset*
system, the toast strategy, the overlay strategy tokens and the table filter/editor contracts are all
plain `Provider`s and do scope correctly.

**Grade: C**

*Post-verification: F-1 critical → low (scope cut to one TSDoc sentence), F-2 **refuted** and re-filed as a low container-seam nit. No critical findings remain in this dimension.*

---

## What works

- **`bindPresets` is the right shape.** `packages/core/src/presets/bind-presets.ts:24-43` translates a
  per-component config token into the two shared preset tokens via `useFactory` + `inject`, so the
  lookup walks the **element** injector chain. Because `provideKjButton` returns `Provider[]`
  (`packages/core/src/button/config.ts:38`), it drops into a component's own `providers: []` — real
  per-subtree override, not just per-app.
- **Three-level resolution is explicit and tested.** `resolvedVariant = kjVariant() || fallback?.() ||
  preset.default` (`packages/core/src/presets/variant.ts:88-90`), with `KJ_VARIANT_FALLBACK` for
  compound parents (button-group, pagination). `variant.spec.ts:51-74` covers cascade-vs-explicit
  precedence directly.
- **The unset-vs-empty distinction is deliberate.** `transform: (v?: string) => v || undefined`
  (`variant.ts:81`) keeps `""` from masquerading as a choice, with a comment explaining the ng-packagr
  `.d.ts` narrowing that forced the explicit field annotation (`variant.ts:72-78`).
- **Dev-mode allowlist warning.** `variant.ts:93-102` / `size.ts:88-97` name the offending value *and*
  print the allowed set.
- **`@layer kj.reset, kj.base, kj.shared, kj.component` (`packages/themes/src/base.css:7`)** is the
  correct answer to specificity wars — consumer CSS outside a layer beats everything the library ships,
  regardless of selector weight.
- **The `var(--knob, default)` discipline in `button.css`** (`packages/components/src/button/button.css:11-34`)
  is a genuinely sophisticated fix: knobs are read at their use site instead of declared on `.kj-button`,
  so an ancestor (including the `display:contents` host) can set them. It is guarded by a real postcss
  test (`packages/components/src/button/button.css.spec.ts:21-45`).
- **Strategy tokens are a proper headless seam.** `packages/core/src/primitives/overlay/tokens.ts:47-54`
  exposes mount / position / backdrop / focus-trap / scroll-lock / live-announcer / trigger-event as
  swappable interfaces, and they are exported (`primitives/overlay/index.ts:2`).
- **Toast has a three-tier extension ladder** — named preset, preset + overrides, fully custom
  (`packages/core/src/toast/toast.strategy.ts:84,99,107`). This is the model the rest of the library
  should copy.
- **Table filter / editor plugin contracts are excellent.** `KjFilterParams`
  (`packages/core/src/table/filter-params.ts:27-42`) accepts a component *or* a `TemplateRef`, with
  `injectKjFilterParams()` and a deliberately unexported token so consumers cannot provide a malformed
  value (`filter-params.ts:52-57`). `KJ_EDITOR_CONTRACT`
  (`packages/components/src/table/table-editors/index.ts:33-35`) is the same idea for cell editors.
- **`provideKjChat`** (`packages/core/src/chat/chat-registry.ts:65`) is a clean type→component registry
  returning a plain `Provider`, so it scopes to a route *or* a component.
- **i18n keys are compile-checked** — `KjTranslationKey = keyof typeof EN_CATALOG`
  (`packages/core/src/i18n/catalogs/en.ts:42`) means a typo in a translated catalog fails `tsc`.

---

## Findings

### F-1 `provideKjLocale` TSDoc claims route-level sub-tree scoping that `providedIn:'root'` cannot deliver

**Severity:** low *(corrected during verification: was critical; scope cut from three subsystems to one doc sentence)* &nbsp;|&nbsp; **Confidence:** high &nbsp;|&nbsp; **Effort:** S

**Files:** `packages/core/src/locale/locale.config.ts:49-50`, `packages/core/src/locale/locale.ts:76-80`,
`packages/core/src/i18n/translate.config.ts:28`

**Evidence**

```ts
// locale.config.ts:49-50 (doc comment)
 * Call once at the application scope (`bootstrapApplication`'s `providers`) or
 * on a route to scope a sub-tree.
```
```ts
// locale.ts:76-80 — the only reader
@Injectable({ providedIn: 'root' })
export class KjLocale {
  private readonly config = inject(KJ_LOCALE_CONFIG);
```

Because `KjLocale` is `providedIn: 'root'` it always instantiates in the root environment injector and reads root's `KJ_LOCALE_CONFIG`, so a route-level `provideKjLocale(...)` is silently ignored. That matches the **stated design intent** — `docs/superpowers/specs/2026-07-07-locale-provider-design.md:137` says "app/route-scoped (**locale is a global concern**)"; the "route" half of that phrase leaked into the TSDoc. Only the doc sentence is wrong.

**Verification corrections — the original finding was massively over-scoped. Three of its six cited files carry no contradicted promise.**

- **REFUTED: the icon registry.** `provideIcons` (`icon.providers.ts:12-16`) documents exactly the behaviour the finding called a defect — "Call multiple times to compose icon sets; **later calls win on key collision**" — and `icon.providers.spec.ts` asserts it ("merges multiple provideIcons calls (last wins on collision)"). The quoted `icon.tokens.ts:26-31` contains no scoping claim whatsoever. Drop the icon registry from this finding entirely.
- **REFUTED: the i18n consequence.** `KJ_TRANSLATION_CATALOGS` is `multi: true` and the service merges every group into a map **keyed by locale tag** (`translate.service.ts:59-66`). Two consumers shipping `fr` and `en-GB` catalogs both register and both work; `selectCatalog()` picks by the active tag. There is no last-writer-wins collision for translations, and `register()` is a public runtime API for adding catalogs later. `provideKjTranslations`'s "for the enclosing injector" is loose wording; its own `@example` shows `bootstrapApplication`, not a route.
- **REFUTED: "no re-provisioning escape hatch exists."** The `grep 'provide: KjLocale'` used as proof shows nothing — listing a `providedIn:'root'` class in a child injector's `providers` array is standard Angular and creates a scoped instance whose constructor resolves `KJ_LOCALE_CONFIG` from *that* injector. `providers: [KjLocale, provideKjLocale({locale:'de-DE'})]` on a route works today with zero library change. Two further hatches already ship and are tested: per-element inputs (`kjLocale` / `kjCurrency` on `KjNumberInput` at `number-input.ts:141-146`, `locale` on `KjDatePicker`; `locale.spec.ts` asserts "an explicit kjLocale still overrides the provider"), and the runtime `setLocale` / `setDirection` / `setCurrency` API.
- **REFUTED: the multi-MFE framing.** Two MFEs that bootstrap separate Angular applications have separate root injectors and therefore separate `KjLocale` instances — `fr-FR` beside `en-GB` is trivially satisfiable.

Nothing crashes; there is no data, a11y or security impact; the sole real call site is `provideKjLocale()` at root (`apps/docs/src/app/app.config.ts:34`); the workaround is one line.

**Fix.**
1. Drop "or on a route to scope a sub-tree" from `locale.config.ts:49-50` and say the provider is application-scoped. Optionally add one line noting that a consumer who genuinely needs a scoped instance can list `KjLocale` alongside it in the route's `providers`.
2. Apply the same wording tightening to `provideKjTranslations` (`translate.config.ts:28`, "for the enclosing injector" → "for the application").

---

### F-2 Service-launched overlays bypass the mount strategy when choosing their root container

**Severity:** low *(corrected during verification: the original critical finding was **refuted** — see "Refuted during verification" below; this is the residual accurate nit)* &nbsp;|&nbsp; **Confidence:** high &nbsp;|&nbsp; **Effort:** S

**Files:** `packages/core/src/primitives/overlay/builder.ts:118`, `packages/core/src/primitives/overlay/container.ts:19-41`,
`packages/core/src/primitives/overlay/tokens.ts:17`

```ts
// builder.ts:118 — goes straight to the module global
getOverlayContainer()?.appendChild(wrapperRef.location.nativeElement);
```

The builder never goes through the injected `KJ_OVERLAY_MOUNT_STRATEGY.resolveContainer()` seam (`tokens.ts:17`) that the declarative overlays use — and that seam *is* provided per component in 9+ places (select, tooltip, popover, date-picker, color-picker, tree-select, combobox, cascade-select, dropdown-menu).

**Consequence.** An app that wants dialogs, drawers, sheets or toasts rooted somewhere other than `document.body` — a shadow root, a fullscreen element, an MFE-owned host node — can override the container for popovers and tooltips but **not** for the builder-launched family.

**Fix.** Have the builder call `config.mount.resolveContainer()` with `getOverlayContainer()` as the fallback, or add a `KJ_OVERLAY_CONTAINER` token whose default factory is `getOverlayContainer`.

---

### F-3 Per-instance CSS override is silently defeated by every non-default variant

**Severity:** high &nbsp;|&nbsp; **Confidence:** high &nbsp;|&nbsp; **Effort:** M

**Files:** `packages/components/src/button/button.css:77-135`,
`packages/components/src/button/button.ts:135-136`,
`packages/components/src/button/button.css.spec.ts:47-50`

**Evidence**

```css
/* button.css:85-90 — a variant rule DECLARES the knob on the element */
  .kj-button[data-variant="ghost"] {
    --kj-button-bg: transparent;
    --kj-button-fg: var(--kj-fg-default);
    --kj-button-border-color: transparent;
  }
```
```ts
// button.ts:135-136 — the host paints nothing; the inner <button> does
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
```
```css
/* button.css:111-114 — the authors hit this and patched exactly one variant */
     The on-state pulls through `--kj-segmented-bg-on` / `-fg-on` rather than
     naming the surface directly: variant rules declare knobs on the element
     and would otherwise beat a consumer's ancestor value, which is the one
     thing this variant needs to stay themable. */
```

**Why it matters.** A custom property declared **on** an element always beats an inherited one. The only
element a consumer can reach is `<kj-button>` — the `display:contents` host — so
`<kj-button kjVariant="ghost" style="--kj-button-bg: hotpink">` works for `default` (whose knobs are
undeclared) and is a no-op for `ghost`, `outline`, `destructive`, `link` and `segmented`. The documented
`@doc-css-var` list on `button.ts:69-89` ("Background fill. Variant rules set this; override to
brand-paint a one-off") promises behaviour that only holds for one variant. The `segmented` case was
patched with a second indirection knob (`--kj-segmented-bg-on`) — a per-variant one-off, not a pattern.
`button.css.spec.ts:47-50` codifies the *opposite* invariant ("variant and size rules DO still declare
knobs on the element"), so the gap is deliberate but undocumented as a limitation.

**Fix.** Pick one and apply it library-wide:
- **(a)** Variant rules set a *second-tier* knob read with the public knob as the outer fallback:
  `--kj-button-bg: var(--kj-button-bg-user, var(--kj-button-bg-variant))` — generalising the
  `--kj-segmented-*` trick; or
- **(b)** Ship an explicit, documented "per-instance override" hatch: a `kjClass`/`kjStyle` input (or a
  documented `kj-button > .kj-button { … }` unlayered rule) and state in `@doc-css-var` that ancestor
  custom properties only reach knobs the active variant does not declare.

Whichever is chosen, extend `button.css.spec.ts`'s postcss assertions to every component stylesheet.

---

### F-4 10 of 69 component stylesheets are unlayered, breaking the override contract

**Severity:** high &nbsp;|&nbsp; **Confidence:** high &nbsp;|&nbsp; **Effort:** S

**Files:** `packages/components/src/calendar/calendar.css`, `…/command-palette/command-palette.css`,
`…/date-picker/date-picker.css`, `…/date-range-presets/date-range-presets.css`,
`…/datetime-picker/datetime-picker.css`, `…/editor/editor.css`, `…/input-mask/input-mask.css`,
`…/overlay/overlay.css`, `…/table/table-filters/filters.css`, `…/table/table.css`;
`packages/themes/src/base.css:7`; `packages/components/package.json` (peerDependencies)

**Evidence**

```
$ for f in $(find packages/components/src -name "*.css"); do grep -q "@layer" "$f" || echo "$f"; done
packages/components/src/calendar/calendar.css
packages/components/src/command-palette/command-palette.css
packages/components/src/date-picker/date-picker.css
packages/components/src/date-range-presets/date-range-presets.css
packages/components/src/datetime-picker/datetime-picker.css
packages/components/src/editor/editor.css
packages/components/src/input-mask/input-mask.css
packages/components/src/overlay/overlay.css
packages/components/src/table/table-filters/filters.css
packages/components/src/table/table.css
```
```css
/* packages/themes/src/base.css:7 — the ONLY place the layer order is declared */
@layer kj.reset, kj.base, kj.shared, kj.component;
```

`packages/components/package.json` peerDependencies list `@kouji-ui/core`, `@angular/*`, lexical,
`lucide-static`, `rxjs` — **`@kouji-ui/themes` is not a dependency or peer dependency of components.**

**Why it matters.** Two compounding problems.
(1) Unlayered CSS always beats layered CSS. The 10 files above therefore outrank every
`@layer kj.component` rule *and* any consumer override that a consumer politely put in their own layer —
so the merge order is "59 components behave one way, 10 (including table and every date component, the
ones people most want to restyle) behave another", with nothing documenting which is which.
(2) The layer-order statement lives in `@kouji-ui/themes`, which `@kouji-ui/components` does not depend
on. A consumer installing only `core` + `components` (the "headless + styled wrappers, bring your own
tokens" path the Getting Started page advertises) never evaluates that statement, so `kj.component`'s
position relative to their own layers is decided by first-appearance order — non-deterministic across
bundlers and code-split chunks.

**Fix.**
1. Wrap the 10 unlayered stylesheets in `@layer kj.component { … }`.
2. Move the `@layer kj.reset, kj.base, kj.shared, kj.component;` statement into a tiny
   `@kouji-ui/components` entry stylesheet (or emit it at the top of every component stylesheet — the
   statement is idempotent) so layer order does not depend on `@kouji-ui/themes` being installed.
3. Add a lint/test step asserting every `packages/components/src/**/*.css` is fully inside `@layer kj.*`.

---

### F-5 Four competing variant/size mechanisms; ~10 components are closed to extension

**Severity:** high &nbsp;|&nbsp; **Confidence:** high &nbsp;|&nbsp; **Effort:** L

**Files:** `packages/core/src/badge/badge.ts:3`, `packages/core/src/toast/toast.service.ts:11,14`,
`packages/components/src/input/input.ts:20,25`, `packages/components/src/card/card.ts:82,107`,
`packages/components/src/empty-state/empty-state.ts:17`, `packages/components/src/chat/chat.ts:24,35`,
vs. `packages/core/src/button/config.ts:13-17` and 10 sibling `config.ts` files

**Evidence**

```ts
// core/src/badge/badge.ts:3 — closed union, no config token, no provideKjBadge
export type KjBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';
```
```ts
// components/src/card/card.ts:82,107 — closed AND anonymous (not even an exported type)
  readonly variant = input<'default' | 'outline' | 'subtle'>('default');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
```
```ts
// core/src/textarea/config.ts:10-19 — doc claims parity with input, values disagree
 * Default Textarea presets shipped by kouji-ui. Variant list mirrors `KjInput`
 * — outlined / filled …
export const KJ_TEXTAREA_DEFAULTS: KjTextareaConfig = {
  variants: ['outlined', 'filled'],
```
```ts
// components/src/input/input.ts:20 — the actual KjInput variants
export type KjInputVariant = 'default' | 'sunken';
```

Only 11 directives call `bindPresets` (`button`, `breadcrumb`, `chat-bubble`, `link`, `pagination`,
`progress-bar`, `spinner`, `tabs`, `tag`, `textarea`, `alert`), while `grep -rlo data-variant
packages/components/src --include=*.css` shows 20 component families keying CSS on `data-variant` —
badge, button-group, card, divider, empty-state, input, list, overlay-badge, table and toast have
variant-driven CSS with **no** config token at all.

**Why it matters.** "Can I add a brand variant without forking?" has three different answers depending on
which component you point at: yes via `provideKjX({variants:[...DEFAULTS.variants,'brand']})`; no, edit
the union and rebuild; or no, and the union is inline so you cannot even name the type in your own code.
The `fix(button): allow "segmented" as a variant` commit (`fd6dd34e`) is a direct symptom: `segmented`
CSS and the button-group shell shipped, and the runtime allowlist in `KJ_BUTTON_DEFAULTS.variants` was
never widened — nothing in CI ties the CSS `[data-variant="…"]` selectors to the config allowlist.
(Note: the commit message says the variant "fell back to `default`"; reading `variant.ts:88-102`, the
validator only `console.warn`s and still reflects the value, so the real symptom was a warning flood
plus whatever the button-group cascade resolved. The structural point — a runtime allowlist maintained
by hand, untested against the CSS — stands either way.)
The textarea/input doc-vs-code mismatch above is a second symptom of the same split.

**Fix.**
1. Give every variant-bearing component a `config.ts` + `provideKj<X>` + `bindPresets`, and deprecate the
   closed unions to `string` (keeping the union exported as a *documented default set*, e.g.
   `type KjBadgeVariant = 'default' | 'secondary' | … | (string & {})` for autocomplete without closure).
2. Add a build-time test per component: every `[data-variant="X"]` / `[data-size="X"]` selector in the
   component's CSS must appear in that component's `*_DEFAULTS`, and vice versa. That single test would
   have caught `segmented` before release.
3. Reconcile `KJ_TEXTAREA_DEFAULTS.variants` with `KjInputVariant`, or fix the doc comment.

---

### F-6 The i18n catalog and the config-token label fields duplicate the same strings; the catalog loses

**Severity:** high &nbsp;|&nbsp; **Confidence:** high &nbsp;|&nbsp; **Effort:** M

**Files:** `packages/core/src/i18n/catalogs/en.ts:20-33`,
`packages/core/src/pagination/config.ts:44-58`,
`packages/core/src/pagination/pagination-previous.ts:46`, `…/pagination-next.ts:45`,
`packages/core/src/breadcrumb/config.ts:44-56`,
`packages/core/src/color-picker/color-picker.ts:472,573,614,657`,
`packages/core/src/command-palette/command-list.ts:19`, `…/command-palette-dialog.ts:70`,
`packages/core/src/date-picker/date-picker-calendar.ts:50`

**Evidence**

```ts
// i18n/catalogs/en.ts:21-28
  'pagination.nav': 'Pagination',
  'pagination.previous': 'Previous page',
  'pagination.next': 'Next page',
  …
  'pagination.pageOf': 'Page {page} of {total}',
```
```ts
// pagination/config.ts:48-56 — the SAME strings, a second time
  navigationLabel: 'Pagination',
  previousLabel: 'Previous page',
  nextLabel: 'Next page',
  …
  infoTemplate: (page, totalPages) => `Page ${page} of ${totalPages}`,
```
```ts
// pagination-previous.ts:46 — and this is the copy that actually renders
    '[attr.aria-label]': 'config.previousLabel',
```
```ts
// color-picker.ts:472 — a third pattern: not translatable at all
    '[attr.aria-label]': '"Color saturation and value"',
```

`grep -rln "KjTranslateService|kjTranslate"` over both packages (excluding specs/examples) matches only
`core/src/toast/toast.ts`, `components/src/avatar/avatar-group.ts` and `components/src/tag/tag.ts`.

**Why it matters.** `provideKjLocale({locale:'fr-FR'}) + provideKjTranslations({fr: FR_CATALOG})` — the
documented i18n path (`translate.config.ts:35-45`) — leaves pagination, breadcrumb, spinner's
`ariaLabel`, the color picker, the command palette and the date picker in English. The consumer's only
recourse is to *also* call `provideKjPagination({previousLabel: '…'})` per component per language, and
for the hard-coded `'[attr.aria-label]': '"Hue"'` cases there is no recourse at all short of forking.
Three mechanisms for one concern, and the one with the type-checked keys and locale reactivity is the
least used. (The repo's own memory notes "route all internal strings through i18n" as a post-merge
follow-up — it is still open.)

**Fix.**
1. Make the config-token label fields *optional overrides* over the catalog: default them to `undefined`
   and have each directive resolve `config.previousLabel ?? i18n.translate('pagination.previous')`.
   That keeps the per-instance/per-subtree override and makes locale switching work.
2. Add catalog keys for the color-picker / command-palette / date-picker hard-coded labels and route them
   through `KjTranslateService`.
3. Add an ESLint rule (or a grep test) banning string literals in `'[attr.aria-label]'` host bindings.

---

### F-7 `provideKj*` naming, token-description naming, and the `kj` input prefix are all inconsistent

**Severity:** medium &nbsp;|&nbsp; **Confidence:** high &nbsp;|&nbsp; **Effort:** M

**Files:** `packages/components/src/tabs/tabs.ts:138`, `…/badge/badge.ts:90-91`, `…/card/card.ts:82,107`,
`…/input/input.ts:129`, `…/toast/toast.ts:131`, `…/toggle/toggle.ts:104,112`, `…/avatar/avatar.ts:97`,
`…/checkbox/checkbox.ts:107`, `…/tree-select/tree-select.ts:121`;
`packages/core/src/icon/icon.providers.ts:19,34,45`; `packages/core/src/chart/echarts.ts:74`;
`packages/core/src/editor/editor.providers.ts:25`

**Evidence**

```ts
// components/src/tabs/tabs.ts:138 — bare `variant`, while <kj-button> uses kjVariant
  readonly variant = input<string | undefined>(undefined);
```

12 bare style inputs in total vs 23 `kj`-prefixed ones:
`avatar.size`, `badge.variant`, `badge.size`, `card.variant`, `card.size`, `checkbox.size`,
`input.variant`, `tabs.variant`, `toast.variant`, `toggle.size`, `toggle.appearance`, `tree-select.size`.

`rules/code_style.md`: *"Every `input()`, `model()`, `output()` exposes a `kj`-prefixed name externally.
**No exceptions.** Applies to both core directives and styled wrappers."*

Provider function naming splits too: `provideKjButton` / `provideKjLocale` / `provideKjTranslations`
(prefixed) vs `provideIcons` / `provideIconResolver` / `provideIconLoader` / `provideECharts` /
`provideMonaco` / `provideMonacoLanguages` / `provideLucideIcons` (unprefixed).
Token *descriptions* use three conventions simultaneously: `'kj.button.config'`, `'KjAccordion'`,
`'KJ_OVERLAY_MOUNT_STRATEGY'`.

**Why it matters.** The prefix is the library's collision-avoidance story — the thing that lets a kouji
component sit next to another library's directive in an MFE host template. An unprefixed `variant` /
`size` / `appearance` input is exactly the name a competing library will also want. It is also a pure
learnability tax: `<kj-button kjVariant>` vs `<kj-tabs variant>` vs `<kj-card variant>` for the same
concept. Token descriptions only surface in DI error messages, but three conventions make those
messages harder to grep.

**Fix.** Rename the 12 bare inputs to `kjVariant` / `kjSize` / `kjAppearance` with a deprecation alias
(`{alias: 'variant'}`) for one minor, rename the unprefixed `provide*` functions with re-exported
deprecated aliases, and settle token descriptions on the dotted `'kj.<feature>.<thing>'` form used by the
newer config tokens. Add an ESLint rule for the input prefix so it stops regressing.

---

### F-8 `bindPresets` lives in core for 10 components and in components for tabs; `KjIconDirective` breaks the naming rule

**Severity:** medium &nbsp;|&nbsp; **Confidence:** high &nbsp;|&nbsp; **Effort:** S

**Files:** `packages/components/src/tabs/tabs.ts:114-120`, vs `packages/core/src/button/button.ts`,
`packages/core/src/pagination/pagination.ts:70`, etc.; `packages/core/src/icon/icon.directive.ts:75`

**Evidence**

```ts
// components/src/tabs/tabs.ts:118-120 — the ONLY bindPresets call outside packages/core
    { directive: KjVariant, inputs: ['kjVariant: variant'] },
…
  providers: [...bindPresets(KJ_TABS_CONFIG)],
```

`grep -rln bindPresets packages/core/src` → 11 directives; `grep -rn KJ_TABS_CONFIG packages/core` →
only `tabs/config.ts` itself. So `@kouji-ui/core`'s `KjTabs` directive is **not** preset-aware; a
headless consumer of core gets no `data-variant` on tabs at all, and `provideKjTabs` silently does
nothing unless they use the styled `<kj-tabs>`.

```ts
// icon/icon.directive.ts:75 — CLAUDE.md: drop the suffix unless a collision exists
export class KjIconDirective {
```

There is no `icon.ts` / `KjIcon` in `packages/core/src/icon/`, so there is no collision to justify either
the `.directive` file suffix or the `Directive` class suffix.

**Why it matters.** The tabs split means the headless/styled boundary is not where the docs say it is:
"`@kouji-ui/core` — directives only" (`rules/architecture.md`) is true for markup but not for
configuration, and a headless consumer discovers the gap only at runtime. The `KjIconDirective` name is
a public-API wart that cannot be fixed without a major.

**Fix.** Move `bindPresets(KJ_TABS_CONFIG)` and the `KjVariant` host directive onto core's `KjTabs`, and
have the styled wrapper forward. Rename `KjIconDirective` → `KjIcon` / `icon.directive.ts` → `icon.ts`
with a deprecated alias export.

---

### F-9 `provideKj*` config functions are not re-exported from `@kouji-ui/components`

**Severity:** medium &nbsp;|&nbsp; **Confidence:** high &nbsp;|&nbsp; **Effort:** S

**Files:** `packages/components/src/public-api.ts:73-130`,
`packages/components/src/button/index.ts`, `…/tag/index.ts`, `…/tabs/index.ts` (all `export * from './x'`)

**Evidence**

`packages/components/src/public-api.ts` re-exports exactly 15 classes and 37 types from
`@kouji-ui/core` (lines 77-130) — chosen, per the comment on lines 73-76, only to satisfy AOT template
type-checking (NG3004). **No `provideKj*` function and no `KJ_*_CONFIG` / `KJ_*_DEFAULTS` symbol is in
that list.** A consumer must write:

```ts
import { KjButtonComponent } from '@kouji-ui/components';
import { provideKjButton, KJ_BUTTON_DEFAULTS } from '@kouji-ui/core'; // <- second package
```

(`@kouji-ui/core` *is* a peer dependency of components, so the package is present — but it is not a
declared direct dependency of the consumer's app, and nothing in their `@kouji-ui/components`
autocomplete hints that these functions exist.)

**Why it matters.** The customization entry point is split across two packages with no barrel, which is
the single biggest discoverability problem in the whole surface: a consumer reading
`<kj-button kjVariant="…">` in the docs has no path from the component to its configuration function.
It also means the "styled" install path advertised on the Getting Started page
(`apps/docs/src/app/pages/getting-started/getting-started.html:13-15`) is not self-sufficient for
configuration. There is no `theming` or `customization` route in `apps/docs/src/app/app.routes.ts` at
all — only `getting-started`, `headless`, `components`, `theme-generator`, `roadmap`.

**Fix.** Re-export every `provideKj*`, `KJ_*_CONFIG` and `KJ_*_DEFAULTS` from
`packages/components/src/public-api.ts` (or, better, from each `components/src/<x>/index.ts` alongside
the component it configures), and add a "Customization" docs page listing the provider per component,
the three override levels, and the CSS merge order from F-3/F-4.

---

### F-10 `provideKjChat`'s doc promises a merge over built-in defaults that does not exist

**Severity:** medium &nbsp;|&nbsp; **Confidence:** high &nbsp;|&nbsp; **Effort:** S

**Files:** `packages/core/src/chat/chat-registry.ts:27-49,65-67`,
`packages/components/src/chat/chat-thread.ts:124-127`

**Evidence**

```ts
// chat-registry.ts:28-32 (doc on `renderers`)
   * Renderers by item `type`. Merged OVER the built-in defaults, so naming a
   * built-in type replaces it and any other name adds one.
```
```ts
// chat-registry.ts:46-49 — there are no built-in defaults
export const KJ_CHAT_CONFIG = new InjectionToken<KjChatConfig>('KJ_CHAT_CONFIG', {
  providedIn: 'root',
  factory: () => ({ renderers: {} }),
});
// chat-registry.ts:65-67 — and nothing merges
export function provideKjChat(config: KjChatConfig): Provider {
  return { provide: KJ_CHAT_CONFIG, useValue: config };
}
```
```ts
// chat-thread.ts:126 — plain lookup, no merge with any default map
    return this.config.renderers[message.type] ?? this.config.fallback ?? null;
```

Also: `provideKjChat` takes `KjChatConfig` (not `Partial<>`), so a nested `provideKjChat` on a route
*replaces* the parent's renderer map entirely rather than extending it — the opposite of the `multi:true`
composition used by `provideIcons` (`icon.providers.ts:22-24`) and `provideKjTranslations`
(`translate.config.ts:53-55`).

**Why it matters.** Two MFEs, or a route that wants "the app's renderers plus one more", cannot compose.
The API reads as additive and behaves as replacing, and the doc comment actively asserts the additive
behaviour. Low blast radius today (the default map is empty) but it will bite the moment built-in
renderers are added, which the recent `feat(chat): … type -> component item registry` work implies.

**Fix.** Either make `provideKjChat` `multi: true` with a merging factory (matching `provideIcons`), or
take `Partial<KjChatConfig>` and merge over an exported `KJ_CHAT_DEFAULTS`. Correct the doc either way.

---

### F-11 `provideKj*` merge semantics are inconsistent across the 11 config tokens

**Severity:** medium &nbsp;|&nbsp; **Confidence:** high &nbsp;|&nbsp; **Effort:** S

**Files:** `packages/core/src/breadcrumb/config.ts:73-84` vs `packages/core/src/pagination/config.ts:70-82`
and the 9 other `config.ts` files

**Evidence**

```ts
// breadcrumb/config.ts:77-81 — deep-merges the nested `defaults`
      useValue: {
        ...KJ_BREADCRUMB_DEFAULTS,
        ...config,
        defaults: { ...KJ_BREADCRUMB_DEFAULTS.defaults, ...(config.defaults ?? {}) },
      },
```
```ts
// pagination/config.ts:71-79 — doc says "Shallow-merges", code does NOT merge `defaults`
 * Configures the Pagination presets / labels for the enclosing injector.
 * Shallow-merges over the defaults — pass only the fields you want to override.
…
      useValue: { ...KJ_PAGINATION_DEFAULTS, ...config },
```

`Partial<KjPaginationConfig>` only widens the *top* level, so `defaults` — if supplied at all — must be
supplied complete (`{variant, size, siblingCount, boundaryCount}`). To change only `siblingCount` a
consumer must restate three unrelated fields; to change only a breadcrumb `linkUnderline` they need not.

**Why it matters.** Not a runtime bug (TypeScript catches a partial `defaults`), but it makes the
provider API unlearnable: the same call shape has different ergonomics per component, and the pagination
doc comment is wrong about its own behaviour. It also makes every future field added to a `defaults`
object a breaking change for anyone who overrode that object.

**Fix.** Extract one `mergeKjConfig<T>(defaults, partial)` helper that deep-merges the `defaults`
sub-object, type the parameter as a recursive `DeepPartial<T>`, and use it in all 11 `provideKj*`
functions. Fix the pagination doc comment.

---

### F-12 `ViewEncapsulation.None` on 81 components leaks global CSS across micro-frontends

**Severity:** medium &nbsp;|&nbsp; **Confidence:** medium &nbsp;|&nbsp; **Effort:** L

**Files:** `packages/components/src/button/button.ts:135` and 80 other components;
`CLAUDE.md` / `rules/code_style.md` ("Encapsulation")

**Evidence**

```ts
// components/src/button/button.ts:135-136
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
```
```
$ grep -rln "ViewEncapsulation.None" packages/components/src --include=*.ts | grep -v spec | wc -l
81
$ grep -rln "@Component" packages/components/src --include=*.ts | grep -v spec | grep -v example | wc -l
152
$ grep -rn "display: contents" packages/components/src --include=*.ts | grep -v spec | wc -l
91
```

`rules/code_style.md`: *"Do not use `encapsulation: ViewEncapsulation.None`. Component styles must stay
scoped. The only exception is generated SVG that needs global classes."*

**Why it matters (MFE).** With `None`, every `.kj-*` rule is injected into the document head. Two MFEs on
one page running **different versions** of `@kouji-ui/components` inject two competing `.kj-button` rule
sets into the same global cascade; since both live in `@layer kj.component`, the winner is whichever
bundle's `<style>` was appended last — i.e. load order, which is not under either team's control. It is
also how F-4's unlayered files become a cross-MFE problem rather than a local one.

Confidence is **medium** on severity, not on the facts: the choice is clearly deliberate (it is what makes
`display:contents` + `.kj-button` styling work at all, and it gives the CSS-custom-property theming its
reach), and a full move to scoped styles is a redesign, not a fix. What is *not* deliberate is that the
project's own rule file forbids it with no recorded exception.

**Fix (in order of cost).**
1. Immediately: record the decision and its MFE consequences in `rules/code_style.md` — either carve out
   a documented exception for styled wrappers, or open an issue to migrate. A rule 81 files violate is
   worse than no rule.
2. Document the "one kouji-ui version per page" constraint for MFE consumers, and consider a build flag
   that prefixes the class namespace (`.kj-button` → `.kj-v1-button`) for side-by-side deployments.
3. Longer term, evaluate `:host`-scoped styles + a `display:contents`-free host for the components whose
   styling does not need to cross into projected content.

---

### F-13 Motion has no configuration surface at all

**Severity:** low &nbsp;|&nbsp; **Confidence:** high &nbsp;|&nbsp; **Effort:** S

**Files:** `packages/core/src/motion/motion.ts:158-179`, `packages/core/src/motion/index.ts:1-2`

**Evidence**

```ts
// motion.ts:172 — free-form string, no preset token, no allowlist, no dev warning
  readonly kjMotion = input.required<string>();
```
```ts
// motion/index.ts — the whole public surface
export { KjReducedMotion } from './reduced-motion';
export { KjMotion, type KjMotionState } from './motion';
```

There is no `KJ_MOTION_CONFIG`, no `provideKjMotion`, and no `KJ_MOTION_PRESET` — unlike variant and
size, which both get a token, an allowlist and a dev-mode warning. Preset names
(`fade`, `slide-up-fade`, `scale-spring`, …) exist only as prose in the TSDoc at `motion.ts:121-123` and
as keyframes in `motion.css`.

**Why it matters.** Motion is the one place where the *same* preset mechanism would obviously apply
(named preset → `data-kj-motion` attribute → CSS), and it is the one place it was not used. A typo in
`kjMotion="slide-up-fde"` is silent; there is no app-level "our brand uses `scale-spring` everywhere"
default; and consumers cannot register a custom preset name in a way the library acknowledges (though,
because there is no validation, an unknown name does work — it just reflects and relies on the consumer's
own CSS). Inconsistency more than breakage.

**Fix.** Add `KJ_MOTION_CONFIG` + `provideKjMotion({presets, default})` and route `KjMotion` through a
preset directive mirroring `KjVariant`/`KjSize`, including the dev-mode allowlist warning. Reuse
`bindPresets` by generalising it to arbitrary preset axes (see work item 6).

---

### F-14 `@angular/cdk` is a peer dependency of both packages despite the no-CDK policy

**Severity:** low &nbsp;|&nbsp; **Confidence:** high &nbsp;|&nbsp; **Effort:** S

**Files:** `packages/core/package.json` (peerDependencies), `packages/components/package.json`
(peerDependencies), `rules/stack.md`

**Evidence**

```json
// packages/components/package.json
  "peerDependencies": {
    "@angular/cdk": "^22.0.0",
```
```json
// packages/core/package.json
  "peerDependencies": {
    "@angular/common": "^22.0.0",
    "@angular/core": "^22.0.0",
    "@angular/cdk": "^22.0.0",
```

`rules/stack.md`: *"Zero external UI deps. No Angular CDK. No floating-ui. No third-party UI primitives."*
`packages/core/package.json`'s own `description` also still reads *"Headless Angular 21 UI primitives —
directives over CDK"* while the peers pin `^22.0.0`.

**Why it matters for customization.** A peer dependency is part of the public contract: consumers must
install CDK to use kouji-ui, and MFE hosts must reconcile a CDK version they were told the library does
not use. It also muddies the "headless core is usable standalone" claim — which is already weakened by
core shipping five stylesheets (`icon/icon.css`, `motion/motion.css`, `primitives/overlay/overlay.css`,
`styles.css`, `typography/prose.css`) against `rules/architecture.md`'s "directives only, zero CSS".

**Fix.** If CDK is genuinely unused, drop it from both peer dependency lists and fix core's `description`.
If it is used, amend `rules/stack.md` to record the exception and say where. Separately, either move
core's stylesheets to `@kouji-ui/themes` or amend the "zero CSS" rule.

---

## Refuted during verification

### F-2 (original) "Overlay container and scroll lock are module-level globals with no DI seam" — **REFUTED** (was: critical)

The original finding is preserved verbatim at the end of this section. It was refuted during adversarial verification: its own cited evidence contradicts it on 2 of 3 files, and the central mechanism ("a DI seam would fix this") does not hold.

1. **The scroll lock IS token-driven** — it is line 51 of the very token list the finding cites as proof it "was left out": `KJ_OVERLAY_SCROLL_LOCK_STRATEGY = new InjectionToken<KjScrollLockStrategy>(…)` (`primitives/overlay/tokens.ts:51`). `panel.ts:71` injects it (`inject(KJ_OVERLAY_SCROLL_LOCK_STRATEGY, { optional: true })`) and `builder.ts:101` provides it per-overlay from config. Three built-ins ship (`css-clip.ts`, `html-overflow.ts`, `none.ts`) and consumers already swap them per component — `command-palette-dialog.ts:62` provides `htmlOverflow()` instead of the default. `_count`/`_saved` are private state of one implementation, and they **must** be module-shared: `document.documentElement.style.overflow` is a single page-global slot, so nested/concurrent overlays inside one app need one refcount. Hoisting the counter into DI would break nested dialogs, not fix anything.
2. **`<html dir>` has a seam, and it is opt-in.** `provideKjDocumentDirection()` is a separate, explicitly-registered provider ("Register once at the application scope"); an MFE that must not own `<html dir>` simply does not register it. Per-scope direction is fully representable without it: `provideKjLocale({ direction: 'rtl' })` is `EnvironmentProviders`, and `KjLocale.direction` (`locale.ts:97-106`) returns the explicit value and never consults `KjDirectionality`/`<html dir>` unless direction is `'auto'`. The RTL CSS is subtree-scoped descendant selectors (`[dir="rtl"] .kj-breadcrumb-list …`, `[dir="rtl"] .kj-progress-bar__fill`, overlay-badge) plus CSS logical properties across 19 stylesheets — none require `<html dir>`. So "an RTL MFE beside an LTR MFE is unrepresentable" is **false**: set `dir="rtl"` on the MFE root and provide `direction: 'rtl'`. The effect is also idempotent by design and SSR-guarded, with all three behaviours covered in `document-direction.spec.ts`.
3. **The MFE consequence does not follow from the claimed cause.** Two separately-bundled copies of `@kouji-ui/core` also mean two copies of every `InjectionToken` and two root injectors — token identity is per-module-instance. Adding `KJ_OVERLAY_CONTAINER` would produce two distinct tokens in two distinct injectors and coordinate exactly nothing. The only real remedy for cross-copy coordination is document-level shared state (a refcount on an `<html>` dataset attribute, or a `globalThis` registry) — a different fix from the one proposed. Nothing in the repo indicates multi-copy MFE hosting is a supported scenario.
4. **The container claims are overstated.** `getOverlayContainer()` self-heals (`if (_root && _root.isConnected) return _root`), and the declarative path is already overridable through `KjMountStrategy.resolveContainer()` behind `KJ_OVERLAY_MOUNT_STRATEGY`. Stacking is token-driven in CSS (`z-index: var(--kj-overlay-z-index, 1000)`), and two sibling `position:fixed; inset:0; pointer-events:none` roots do not compete destructively — children carry `pointer-events:auto` and ties resolve by insertion order.

**Disposition.** The residual accurate nit was re-filed as **F-2 (low)** above. The cross-page-state coordination gap (the `<html>` overflow refcount and container dedupe across duplicate library copies) is tracked in the micro-frontend dimension (`05-micro-frontends.md` F-3), where it belongs — and its fix is a document-level registry, not an injection token.

<details>
<summary>Original F-2 text, preserved</summary>

**F-2 (original, refuted) Overlay container and scroll lock are module-level globals with no DI seam**

**Severity as originally filed:** critical &nbsp;|&nbsp; **Confidence:** high &nbsp;|&nbsp; **Effort:** M

**Files:** `packages/core/src/primitives/overlay/container.ts:19-41`,
`packages/core/src/primitives/overlay/strategies/scroll-lock/css-clip.ts:3-37`,
`packages/core/src/locale/document-direction.ts:41-59`

**Evidence**

```ts
// container.ts:19-28
let _root: HTMLElement | null = null;
export function getOverlayContainer(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  if (_root && _root.isConnected) return _root;
  _root = document.createElement('div');
  _root.className = 'kj-overlay-container';
  document.body.appendChild(_root);
```
```ts
// css-clip.ts:3-16
let _count = 0;
let _saved: string | null = null;
…
      if (_count === 1) {
        _saved = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'clip';
      }
```
```ts
// document-direction.ts:50-55 — writes <html dir> from an env initializer
      effect(() => {
        const dir = locale.direction();
        const html = doc.documentElement;
        if (html.getAttribute('dir') !== dir) html.setAttribute('dir', dir);
```

**Why it matters.** `_root`, `_count` and `_saved` are per-**module-instance**, not per-app. Two MFEs
each bundling `@kouji-ui/core` get two independent copies: two `.kj-overlay-container` divs competing for
z-stacking, and two scroll-lock counters that both believe they own `documentElement.style.overflow` —
MFE-A closing its dialog restores `overflow: ''` while MFE-B's modal is still open, so the page scrolls
behind an open modal. `<html dir>` is worse: it is single-valued page state, so an RTL MFE next to an
LTR MFE is unrepresentable. The whole rest of the overlay system is token-driven
(`primitives/overlay/tokens.ts:47-54`) — the container and scroll lock are the two pieces that were left
out, and the file's own doc comment even enshrines the global ("Per-overlay code MUST go through
`getOverlayContainer`", `container.ts:8-11`).

**Fix.**
1. Add `KJ_OVERLAY_CONTAINER = new InjectionToken<() => HTMLElement>(…)` with a root factory that keeps
   today's behaviour, and a `provideKjOverlayContainer(el | () => el)` so an MFE can mount overlays
   inside its own shadow/DOM subtree. Replace the `let _root` module state with a service.
2. Move the scroll-lock refcount into an injectable (root-scoped by default) so nested/concurrent locks
   are counted per app, not per module copy.
3. Note in `document-direction.ts` that it is explicitly single-app-only, and offer a subtree
   alternative that sets `dir` on the MFE's own root element instead of `<html>`.

---
</details>

---

## Recommended work items

Ordered by MFE risk, then by how many downstream decisions they unblock.

*Post-verification the two former critical items were removed from this list: F-1 collapsed to a one-line TSDoc fix and F-2 was refuted. Fold both into item 8 (doc accuracy) plus the residual low F-2 container-seam nit.*

1. **Fix the CSS override contract.** (F-4 then F-3) First wrap the 10 unlayered stylesheets in
   `@layer kj.component` and move the layer-order statement out of `@kouji-ui/themes` — cheap, and it
   unblocks everything else. Then pick one per-instance override mechanism (generalise the
   `--kj-segmented-*` two-tier knob, or ship an explicit `kjClass`/`kjStyle` hatch), apply it library-wide,
   and write the merge order down: *unlayered consumer CSS > `kj.component` > `kj.shared` (themes) >
   `kj.base` > `kj.reset`; within a component, element-declared knobs beat inherited ones.*
2. **Close the i18n fork.** (F-6) Make config-token label fields optional overrides that default to
   `KjTranslateService` lookups; add catalog keys for the hard-coded color-picker / command-palette /
   date-picker labels; add a lint rule banning literals in `'[attr.aria-label]'`.
3. **One variant story.** (F-5, F-8) `config.ts` + `provideKj<X>` + `bindPresets` for every
   variant-bearing component, in **core** (including tabs); soften the closed unions to
   `'a' | 'b' | (string & {})`; add the CSS-selector ⇄ `*_DEFAULTS` parity test that would have caught
   `segmented`.
4. **Generalise `bindPresets` to N axes and unify merge semantics.** (F-11, F-13) Today it hard-codes
   `variants`/`sizes`; spinner already needs a third axis (`animations`, `spinner/config.ts:23`) and
   motion needs a fourth. A `bindPreset(configToken, 'animations', KJ_ANIMATION_PRESET)` form plus a
   shared deep-merging `mergeKjConfig<T>` helper covers both.
5. **Make the components package self-sufficient.** (F-9) Re-export every `provideKj*` / `KJ_*_CONFIG` /
   `KJ_*_DEFAULTS` from `@kouji-ui/components`, and add a Customization docs page listing the provider
   per component and the three override levels.
6. **Naming cleanup with deprecation aliases.** (F-7, F-8) `kj`-prefix the 12 bare style inputs,
   `Kj`-prefix the 7 unprefixed `provide*` functions, rename `KjIconDirective` → `KjIcon`, settle token
   descriptions on `'kj.<feature>.<thing>'`. Add an ESLint rule for the input prefix.
7. **Fix `provideKjChat` composition** (F-10) — `multi: true` with a merging factory, or
   `Partial<>` + `KJ_CHAT_DEFAULTS`. Correct the doc either way.
8. **Record or retire the policy violations.** (F-12, F-14) Either carve documented exceptions into
    `rules/code_style.md` / `rules/stack.md` for `ViewEncapsulation.None`, the CDK peer dep and core's
    five stylesheets, or open migration issues. Also publish the "one kouji-ui version per page" MFE
    constraint.

---

## Open questions

1. **Is multi-MFE co-existence actually a target?** Nothing in `rules/*.md` mentions it. Several findings
   (F-1, F-2, F-12) are non-issues for a single-app consumer and expensive to fix. If MFE support is in
   scope it should be a stated rule with a conformance test; if not, it should be documented as
   unsupported so consumers do not discover it the hard way.
2. **Was `ViewEncapsulation.None` + `display:contents` a considered trade against the `rules/code_style.md`
   ban, or drift?** The `button.css` comments show deep awareness of the custom-property consequences,
   which reads as deliberate — but no ADR or rule exception records it.
3. **Should `KjTranslationKey` stay closed?** It is correct for library-owned strings, but if config-token
   labels move behind the catalog (work item 4), consumers overriding one string will need either a
   per-key override map or an open key space. Which?
4. **Is `@angular/cdk` actually imported anywhere**, or is the peer dependency vestigial? I did not audit
   imports — that belongs to the dependency/architecture aspect.
5. **Does `provideKjButton` in a component's `providers` survive `ng-packagr` + AOT in a consumer app?**
   `bindPresets` uses `useFactory` + `inject`, which is fine in source; I did not verify the emitted
   `.d.ts` / partial-compilation output, and `variant.ts:72-78` shows ng-packagr has already surprised
   this codebase once on this exact file.
6. **What is the intended headless story for tabs?** Core's `KjTabs` has no `KjVariant` host directive
   (F-8), so a core-only consumer gets no `data-variant`. Is that intentional (tabs chrome is
   "styled-only") or an oversight?
