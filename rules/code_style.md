# Code Style

## Before any new directive
1. Read WAI-ARIA pattern at https://www.w3.org/WAI/ARIA/apg/patterns/
2. Reference Angular Material, PrimeNG, ng-primitives for behavioural edge cases
3. API: atomic (one job), minimal inputs (YAGNI), consistent `kj` prefix

## Naming
- Classes: omit Angular type suffix unless collision (`KjButton` not `KjButtonDirective`; `KjToastService` kept because `KjToast` is the directive)
- Files: same rule — omit `.directive`, `.component`, `.service` unless collision
- Specs: `button.spec.ts` not `button.directive.spec.ts`
- All selectors, class names, tokens: `kj` prefix mandatory

A collision counts when the bare name is already an **export** of either
package, including a type: `KjRichTextFeatureDirective` keeps its suffix
because `KjRichTextFeature` is the feature type.

### A rename is a clean break — never an alias

Maintainer ruling, 2026-09-16. When a symbol is renamed, **the new name is the
only name**. Do not add:

- `export { KjCard as KjCardComponent }`
- `export const KjFooDirective = KjFoo`
- a duplicate input, output or method kept so an old binding keeps compiling
- `@deprecated … kept as an alias for one minor`

Rename outright, then migrate every reference in the repo — code, `.html`
templates, the design docs under `docs/component-analyses/`, and any pending
`.changeset/*.md`. A changeset describes the break as *old → new*; it never
promises a deprecation period. Zero references to the old name may remain.
(`CHANGELOG.md` files and `reports/review/` are records of what really
shipped and are left alone.)

`@deprecated` is still the right tag for a genuine design note — an API that is
discouraged but has no replacement name. It is never a compat shim.

Enforced by `packages/components/src/class-naming.spec.ts`.

### Export surface

Every public symbol is exported **exactly once**, from its feature folder's
`index.ts`; `public-api.ts` only aggregates those. No symbol is reachable under
two names, and no two feature barrels export the same name — that is how the
alias layer grew the first time, and how `KjDateRange` came to mean two
incompatible types at once.

## Binding names: `kj` prefix on directives, bare names on `<kj-*>` elements

The prefix exists to keep an *attribute* selector from colliding with a host
element's own attributes. An element component is already namespaced by its tag,
so it does not need it twice.

- **Attribute directives** (all of `@kouji-ui/core`, and any `[kj…]` directive
  in `@kouji-ui/components`): every `input()` / `output()` / `model()` exposes a
  `kj`-prefixed public name. No exceptions — `kjVariant`, `kjDisabled`,
  `kjAlertMode`.
- **Element components** (`<kj-button>`, `<kj-badge>`, `<kj-tabs>`, …): public
  bindings are **bare** — `variant`, `size`, `disabled`. A wrapper that forwards
  a core input renames it in `hostDirectives.inputs`
  (`{ directive: KjVariant, inputs: ['kjVariant: variant'] }`).

**One class must not mix the two.** Where an element component historically
carries both spellings, the bare name is the supported one and the prefixed one
is **deleted**, not aliased — see "A rename is a clean break" above. (Angular
rejects exposing a single *host-directive* input under two public names anyway,
NG0312, so a second entry in `hostDirectives.inputs` was never an option.)

Several shipped element components (`kj-button`, `kj-alert`, `kj-spinner`) are
still uniformly `kj`-prefixed. They are consistent within themselves, so they are
left alone rather than doubled; new inputs on them follow the class they are in.

## Boolean inputs: always coerce; a two-way boolean is always bound

A bare attribute binds the **empty string**, and `attr="false"` binds the
**string `"false"`**. So an uncoerced boolean input ignores both forms the docs
teach: `<div kjDivider kjStructural>` stayed decorative instead of reaching
`role="separator"`, and `kjShowSelectionColumn="false"` still rendered the
column. Only `booleanAttribute` reads them the way HTML boolean attributes do.

- Every boolean `input()` takes `{ transform: booleanAttribute }` from
  `@angular/core`. `kouji/boolean-input-transform` enforces it.
- A **tri-state** input — where "absent" is a third, meaningful value — writes
  its own transform instead, keeping `undefined` distinct from `false`:
  `transform: (v) => (v == null ? undefined : booleanAttribute(v))`.
  `KjLink.kjExternal` and `KjInputGroupAddon.kjAriaHidden` are the reference
  shapes; `<kj-table>`'s `kjVirtual` (`boolean | 'auto'`) is the variant that
  keeps a string state: `v === 'auto' ? 'auto' : booleanAttribute(v)`.
  Unions are never flagged by the rule — the third state is yours to preserve.
- A boolean whose third state is not a boolean at all (`KjSlider.kjTicks`,
  `readonly number[] | 'auto' | false`) stays untransformed and says so in its
  TSDoc; `booleanAttribute` would destroy the array.

**`model()` takes no transform.** Angular's `ModelOptions` is `{ alias,
debugName }` — there is no `transform` slot, and there is no way to add one. So
**a two-way boolean is bound, never written bare**: `[kjOpen]="true"`, not
`kjOpen`. Every boolean `model()` states that on its own TSDoc line. The lint
rule exempts `model()` because it has to; the documentation is the only gate,
which is why the line is mandatory rather than nice to have. Splitting one into
`input(…, { transform: booleanAttribute })` + `linkedSignal` + an explicit
`*Change` output is a public-API shape change and needs a deprecation, not a
sweep.

## Signal types — prefer inference
Don't write explicit generics when TypeScript can infer from default value. Exceptions: `[]` (infers `never[]`), `input.required<T>()`, ng-packagr `.d.ts` narrowing.

## Signals
- `input()`, `model()`, `output()` — never `@Input()`/`@Output()`
- State: `signal()`, `computed()`, `effect()` — no `BehaviorSubject`, no Observables
- Always `inject()` — no constructor parameters

## Lifecycle — no lifecycle interfaces
- No `ngOnInit`, `ngOnDestroy`, `ngAfterViewInit`
- DOM access → `afterNextRender()` / `afterRender()`
- Cleanup → `DestroyRef.onDestroy()`
- Init logic → `constructor()` with `inject()`
- Queries → `viewChild()` / `contentChildren()`, never `@ViewChild` / `@ContentChild`
- Host listeners → the `host` object, never `@HostListener`, so dispatch order
  is visible where the binding is declared

`no-restricted-syntax` in `eslint.config.js` enforces all of it across
`packages/*/src`, and both packages are currently at zero.

**The one exception, and it is not a hook.** A child that registers with its
parent must do so in *template order* — index-based numbering (`aria-label="N
of M"`), arrow-key roving and every id registry depend on it. Register from the
**constructor**, which runs in template order, and tear down on
`inject(DestroyRef).onDestroy`. `afterNextRender` is the wrong tool here: it
batches, so registrations arrive in render order, not declaration order. Only
work that genuinely touches the DOM (a measurement, an `IntersectionObserver`, a
live-region handover) belongs in `afterNextRender`.

## DOM globals — the library renders on a server

`document`, `window`, `navigator`, `localStorage` and `sessionStorage` do not
exist during SSR. Under `packages/*/src` (specs, examples and playgrounds
excepted) reach them one of three ways, in this order:

1. **`inject(DOCUMENT)`** — the default for anything that needs the document
   itself. It is the only form that also works in a second Angular root or a
   test that swaps the document.
2. **Inside `afterNextRender()`** — for measurement and DOM writes. The
   callback never runs on the server, so the global is safe by construction.
3. **Behind an explicit guard** — `typeof window !== 'undefined'`, an
   `isPlatformBrowser()` / `isBrowser` field, or one of the guarded helpers
   (`table-storage.ts` for web storage).

`no-restricted-globals` in `eslint.config.js` enforces this. A site that is
already correct but not statically provable — a private method every caller
guards — carries a targeted
`// eslint-disable-next-line no-restricted-globals -- <why>` on the line, with
the reason spelled out. A blanket file-level disable is not acceptable: the
point of the rule is that the next unguarded access is caught, and the review
found three that had already shipped.

## Change detection — zoneless only
- The supported mode is zoneless: apps call `provideZonelessChangeDetection()` (as `apps/docs` does) and every `test-setup.ts` runs `setupTestBed({ zoneless: true })` without importing `setup-zone`, so zone.js is never loaded
- No `fakeAsync` / `tick` in specs — await real timers or call `ApplicationRef.tick()`; `packages/core/src/zoneless.spec.ts` pins the contract
- Nothing may rely on zone-driven change detection: state changes go through signals, and DOM writes after async work happen inside `afterNextRender()` or an `effect()`

## General
- `standalone: true` always
- `const` over `let`; never `var`
- No barrel re-exports beyond `index.ts` — with one exception: a feature split
  across several files keeps a `<feature>.ts` aggregator that re-exports them,
  so the folder has a single import path (see
  [`architecture.md`](./architecture.md#one-directive-per-file))
- No directives that only add `data-*` with no behaviour

## CSS — reach for the base tokens and kj components first

Before adding ANY new style or markup, refer to `packages/themes/src/base.css`
to find the existing token, and to `packages/components/src/` for the existing
component or directive. Roll your own only when nothing fits.

**Tokens (mandatory):**
- **Spacing** (`padding` / `margin` / `gap` / `inset`): always use
  `--kj-base-space-*` (`xs 4 / sm 8 / md 12 / lg 16 / xl 24 / 2xl 32 / 3xl 48
  / 4xl 64 / 5xl 96 / 6xl 128`). Round off-token values to the nearest token —
  never ship raw `px`/`rem` for spacing. The only escape hatch is geometry
  that is meaningful at a specific px (icon hit area, hairline divider).
  This applies to **every** stylesheet under `packages/components/src/**` —
  including the table family (`table.css`, `table-toolbar` styles, filter /
  editor surfaces). Reach for the token first; only fall back to a literal
  with a comment explaining why a token doesn't apply.
- **Typography sizes**: prefer `--kj-text-*` (`xs / sm / base / lg / xl / 2xl`).
  For label-mono sizes below `xs` (12px) keep a rem literal — they have no
  token yet.
- **Colors / borders / radii / shadows**: always go through the themed
  `--kj-*` tokens. Hard-coded hex is allowed only inside theme-specific
  artwork (e.g. the per-theme loader figures).
- **Fonts**: `--kj-font-display` / `--kj-font-sans` / `--kj-font-mono`.
  Display headings also pair with `--kj-display-weight`,
  `--kj-display-italic`, `--kj-letter-spacing`.

**Components (prefer over custom markup):**
- Use `kj-button` / `kj-link` / `kj-tag` / `kj-badge` / `kj-select` /
  `kj-progress-bar` / `kj-card` / `kj-alert` / etc. before reaching for a
  native element + custom CSS. Native fallback is fine when the kj component
  doesn't match the semantic (e.g. a click-to-expand card is not `kj-card`).
- When you must extend a kj component, use the levers in "Customizing a
  component" below — do not reach into its internal class names. If you need
  more than a small visual delta, propose a new variant in the core package.

## Customizing a component

Three levers, in this order. Each is a real, tested contract — pick the first
one that fits and stop.

**1. CSS custom properties on the host.** Every styled component documents its
knobs in a `@doc-css-var` block. They inherit, so setting one on the host (or
any ancestor, including a `display: contents` wrapper host) reaches the styled
element:

```html
<kj-button style="--kj-button-radius: 0">Square</kj-button>
```

Caveat, and the reason lever 2 exists: **a custom property declared *on* an
element always beats an inherited one.** Variant and size rules declare knobs on
the styled element on purpose — that is the component's own logic — so an
ancestor value only reaches the knobs the *active* variant leaves undeclared. On
`<kj-button kjVariant="ghost">`, `--kj-button-bg` from the host is a no-op.

**2. `kjClass` — your class, on the styled element.** Every element component
whose host is `display: contents` takes a `kjClass` input and forwards it to the
inner root element. That is what makes "layer a single class" true for the whole
kit rather than only for the components whose host *is* the styled element:

```html
<kj-button kjClass="danger-zone" kjVariant="ghost">Delete</kj-button>
```
```css
/* unlayered, so it beats every rule in @layer kj.component */
.danger-zone { --kj-button-bg: hotpink; }
```

The rule must be **unlayered**. All component CSS lives in `@layer
kj.component`, and an unlayered declaration wins over a layered one whatever the
specificity — which is exactly what lets `.danger-zone` (0,1,0) beat
`.kj-button[data-variant="ghost"]` (0,2,0).

Two host contracts exist and you must know which one you are looking at:
`host: { class: 'kj-…' }` (the host *is* the styled element — card, alert,
tabs, spinner) and `host: { style: 'display: contents;' }` (the host is a
wrapper — button, badge, input, tab). `kjClass` is only meaningful on the
second; on the first, put the class on the element as usual. It keeps the `kj`
prefix despite being an element-component input because `class` itself is not a
bindable name. `kjClass` is not implemented on every
`display: contents` wrapper in the kit yet — `packages/components/src/button/host-class-contract.spec.ts`
lists the ones that have it and asserts the contract for each, so extending
coverage means adding a row there.

**3. A new preset value.** A structurally new variant is a config entry plus a
CSS rule, not a fork:

```ts
provideKjButton({ variants: [...KJ_BUTTON_DEFAULTS.variants, 'brand'] })
```
```css
.kj-button[data-variant="brand"] { --kj-button-bg: var(--brand-500); }
```

- Every stylistic union (`variant`, `size`, `animation`) is typed
  `KjExtensible<'a' | 'b'>` = `'a' | 'b' | (string & {})`: the shipped values
  autocomplete and any other string still type-checks. **Behavioural** enums
  (`orientation`, `activationMode`, `overflow`, `type`) stay closed — the
  directive branches on them and an unknown value has no meaning.
- Unknown values are reflected verbatim and warned about once in dev mode. The
  preset directive never silently falls back.
- `provideKj*` takes a **deep** partial and deep-merges over the shipped
  defaults through `mergeKjConfig`, so `provideKjButton({ defaults: { size:
  'lg' } })` keeps `defaults.variant`. Arrays replace — spread
  `KJ_*_DEFAULTS.<array>` to extend one. Route every new `provideKj*` through
  `mergeKjConfig`; `merge-config.spec.ts` holds the table of the ones that
  already are, and a provider still typed `Partial<Config>` is a bug, not a
  style choice.
- Building your own preset-driven component uses the same public mechanism:
  `hostDirectives: [KjVariant, KjSize]` + `providers: [...bindPresets(TOKEN)]`.
  See the `bindPresets` TSDoc for the full recipe.

**Strings are not a customization lever.** Every user-visible or assistive
string in `@kouji-ui/core` / `@kouji-ui/components` comes from the i18n catalog
(`EN_CATALOG`), resolved through `KjTranslateService`. Never hard-code English
in a template, a host binding or a config default: add a key to `en.ts`, read it
with `inject(KjTranslateService).translate('key')`, and let a per-component
config field (`KjPaginationConfig.previousLabel`, …) stay an *optional* override
that defaults to `undefined`.

## Encapsulation: global `@layer kj.component`, not scoped styles

**Every styled component uses `encapsulation: ViewEncapsulation.None`.** This
is the architecture, not drift — 92 components rely on it and an `Emulated`
component is the bug.

It follows from what this library is. The elements that must be painted are
rendered by *headless core directives* and, for the overlay family, portalled
into `.kj-overlay-container` at the end of `<body>`. Angular's emulated
encapsulation rewrites every selector with an `_ngcontent-xxx` attribute that
only the component's own template carries, so a scoped rule reaches neither a
projected child nor a portalled panel. Scoping the CSS would mean each wrapper
re-implementing what the shared stylesheet already says.

What replaces encapsulation as the isolation mechanism:

- **One cascade layer.** Every rule a component ships is wrapped in
  `@layer kj.component { … }`. Consumer CSS is unlayered by default and an
  unlayered declaration beats a layered one at any specificity, so a consumer
  overrides the kit with a plain class instead of an `!important` war. This is
  also what makes `kjClass` work (see "Customizing a component").
- **One namespace.** Every selector is anchored by something the library
  owns — a `.kj-` class, a `kj-*` element, a `[data-*]` state hook, `:root`,
  `:host` or `::backdrop`. Never a bare element or class selector (`button`,
  `ul`, `h2`, `.card`): with no encapsulation that restyles the consumer's
  whole page. A descendant selector qualifies through its anchor, which is how
  `.kj-prose h2` and `[dir="rtl"] .kj-chat` stay legal.
- **One file per component.** Styles live in a sibling `.css`, never in an
  inline `styles: [...]` array — an inline block is invisible to
  `pnpm lint:css`, which is what actually checks the two rules above. Most
  components reach that file with `styleUrl`. The overlay family
  (popover, tooltip, dropdown-menu, dialog, drawer, toast, confirm-popup,
  sheet, action-sheet) deliberately does **not**: its panels are rendered by
  headless core directives with no wrapper component guaranteed on the page,
  so its nine sheets ship through the registered
  `components/src/overlay/overlay.css` aggregator instead. Carrying
  `styleUrl` as well would deliver the same bytes a second time inside the
  component chunk, which is what `overlay-styles.spec.ts` now forbids.

Enforced by `kouji/component-styles-layered` (no inline `styles`; `styleUrl`
implies `ViewEncapsulation.None`) and by `kouji/layered` +
`kouji/known-tokens` + `kouji/namespaced` in `stylelint.config.mjs`
(`pnpm lint:css`; fixtures and a whole-library run in
`packages/themes/src/lint-css.spec.ts`). `kouji/layered` fixes where a rule
sits in the cascade, `kouji/namespaced` fixes how far it reaches. The
exemption list in `eslint.config.js` is debt to pay down, not a menu.

The trade-off is real and worth stating: a `.kj-*` class is a global
identifier with no compiler help, so a consumer authoring their own
`.kj-card` collides silently. That is the price of styling content the
component does not own, and it is why the `kj` prefix is mandatory rather
than decorative.
