# Customization / Extensibility API Review

Aspect: customization & extensibility, with micro-frontend (MFE) usage as a first-class constraint.
Scope audited at HEAD (`9aee150a`, rebased on `origin/main`): `packages/core/src/presets/*`, every
`InjectionToken` / `provide*` in `packages/core` + `packages/components`, content-projection slots,
`packages/core/src/i18n`, `packages/core/src/locale`, the icon registry, motion, directionality, and
both `public-api.ts` files.

## Verdict

There is not one customization story — there are **four**, and they contradict each other. (1) A
DI-driven preset system (`KjVariant` / `KjSize` + `bindPresets(KJ_*_CONFIG)` + `provideKj*`) that is
genuinely good, genuinely per-subtree overridable, and covers about a dozen components. (2) A
hand-rolled copy of that same system in `KjAlert`, whose own TSDoc claims it uses (1) and does not.
(3) Closed TypeScript literal unions (`KjBadgeVariant`, `'default' | 'outline' | 'subtle'`, …) on
roughly twenty styled components, with no config token at all — extending those means CSS custom
properties in a parallel class namespace rather than the library's own `data-variant` slot
*(corrected during verification: these are **not** fork-or-`$any()`; see F-2)*. (4)
Hard-coded English strings and hard-coded defaults inside component templates that no token, input, or
catalog can reach. Story (1) should win everywhere. The MFE picture is narrower than this review first claimed
*(corrected during verification — see F-1)*: `KjLocale`, `KjTranslateService` and `KJ_ICON_REGISTRY`
are `providedIn: 'root'` singletons that read their config token from the **root** injector, so
`provideKjLocale()`, `provideKjTranslations()` and `provideIcons()` placed on a **route or a sub-app
inside a single host injector tree** are silently ignored — but independently bootstrapped remotes
each own a root injector and configure all three normally, `provideIconResolver` /
`provideIconLoader` work at route level, `KJ_OVERLAY_Z_BASE` is correctly a document-level app-wide
token, and exactly one docstring (`locale.config.ts:50`) promises the scoping that does not work. The
class-override escape hatch documented in `rules/code_style.md` ("layer a
single class on the host") is inert for the ~90 components whose host is `display: contents`. Nothing
here makes the library unusable — the preset system, the theme `[data-theme]` scoping, the chat
renderer registry, and the overlay strategy tokens are real, well-built extension points — but the
surface is inconsistent enough that a consumer will hit a dead end within a day, and an MFE consumer
will hit a silent one.

**Grade: C**

> **Verification pass applied.** F-1 was corrected high → low (scope cut from four singletons to one
> docstring sentence plus one loose phrase); F-2 and F-3 were corrected high → medium. Each correction
> is folded into the finding under "Verification correction(s)", with withdrawn claims named
> explicitly. Nothing was refuted outright in this dimension.

## What works

- **The preset system is the right design.** `packages/core/src/presets/variant.ts:88-90` and
  `size.ts:83-85` resolve `explicit input > KJ_*_FALLBACK context > preset default`, the fallback
  token lets a compound parent cascade (`packages/core/src/button/button.ts:90-103` bridges the button
  group), and `bindPresets` (`packages/core/src/presets/bind-presets.ts:24-43`) puts the config
  translation on the *directive's* `providers`, so an element-injector override actually works. Both
  directives have real spec coverage for every branch of the chain
  (`variant.spec.ts:51-86`, `size.spec.ts:46-69`).
- **Per-subtree preset override genuinely works** and is demonstrated:
  `packages/components/src/button/_examples/button.configured.example.ts:9-14` puts
  `provideKjButton({ variants: [...KJ_BUTTON_DEFAULTS.variants, 'brand', 'warning'], … })` on a
  *component's* `providers` array. This is the one config mechanism in the library that is
  MFE-safe by construction.
- **Variant/size values are open strings, not closed unions, in the preset path.**
  `kjVariant: InputSignalWithTransform<string | undefined, string | undefined>` — a consumer adds
  `brand` with a CSS rule and a `provideKjButton` call and never forks.
- **Themes are attribute-scoped, not `:root`-scoped.** `packages/themes/src/themes/kouji.css:7-13`
  keys on `[data-theme="kouji"]` inside `@layer kj.shared`; density
  (`packages/themes/src/density.css:32-38`) uses inherited registered custom properties. Two MFEs on
  one page *can* run different themes and different densities by putting `data-theme` /
  `--kj-density` on their own root element. This is the strongest MFE story in the repo.
- **The chat renderer registry is the customization API done right.**
  `packages/core/src/chat/chat-registry.ts:46-67` — plain `Provider`, consumed by direct `inject()`
  in the component (`packages/components/src/chat/chat-thread.ts:113`), so "the nearest injector
  wins" is true as documented.
- **Overlay behaviour is fully strategy-swappable** via eight tokens
  (`packages/core/src/primitives/overlay/tokens.ts:47-54`) with published interfaces — a consumer can
  replace positioning, backdrop, focus trap or mount target without touching the component.
- **Cascade layers protect consumer CSS.** Component rules live in `@layer kj.component`
  (`packages/components/src/button/button.css:10`), declared last in
  `packages/themes/src/base.css:7`, so any *unlayered* consumer rule beats them regardless of
  specificity.

## Findings

### F-1 `provideKjLocale`'s docstring promises route-level scoping that the root-scoped `KjLocale` cannot honour

**Severity:** low *(corrected during verification: was high; scope cut from four singletons to one docstring sentence plus one loose phrase)* · **Confidence:** high · **Effort:** S

**Files:** `packages/core/src/locale/locale.ts`, `packages/core/src/locale/locale.config.ts`,
`packages/core/src/i18n/translate.service.ts`, `packages/core/src/i18n/translate.config.ts`,
`packages/core/src/icon/icon.tokens.ts`

**Evidence**

```ts
// packages/core/src/locale/locale.ts:76-80
@Injectable({ providedIn: 'root' })
export class KjLocale {
  private readonly defaultLocale = inject(LOCALE_ID);
  private readonly directionality = inject(KjDirectionality);
  private readonly config = inject(KJ_LOCALE_CONFIG);
```

```ts
// packages/core/src/locale/locale.config.ts:50  ← the claim
 * Call once at the application scope (`bootstrapApplication`'s `providers`) or
 * on a route to scope a sub-tree.
```

A `providedIn: 'root'` record is materialised in the root `EnvironmentInjector`, so `inject(KJ_LOCALE_CONFIG)` (`locale.ts:80`) resolves against **root** and a `provideKjLocale({...})` placed in a lazy route's `providers` is silently ignored. `provideKjLocale` returns `EnvironmentProviders` (`locale.config.ts:68-74`), so route-level use type-checks, compiles, and does nothing.

Root scoping is the deliberate design — `locale.ts:52` calls `KjLocale` the "Application-wide source of truth" and exposes `setLocale` / `setDirection` / `setCurrency` for runtime changes. **The fix is therefore to delete the "or on a route to scope a sub-tree" clause, not to rearchitect the service.**

**Secondary, same root cause, no doc claims it works.** `KjTranslateService` (`translate.service.ts:52,60`) reads `KJ_TRANSLATION_CATALOGS` once in its root-scoped constructor, so a route-level `provideKjTranslations` is likewise ignored. `translate.config.ts:28`'s "Registers … for the enclosing injector" is loose phrasing — it should read "for the application" — and its only worked example is `bootstrapApplication`, not a route. Mitigated by the public `register(locale, catalog)` escape hatch (`translate.service.ts:71-75`), which is the supported way to add a catalog late.

**One-line note on icons.** `KJ_ICON_REGISTRY`'s factory (`icon.tokens.ts:29-34`) runs in root, so route-level `provideIcons` entries never reach it. The registry is a shared mutable signal that the async loader writes into (`icon.resolver.ts:23-40`), i.e. global by design, so the right fix is a docstring line on `provideIcons` saying it is application-scoped.

**Verification corrections (high → low).** The Angular mechanism is stated correctly and the quotes exist, but nearly everything layered on top fails checking.

- **"Three document the opposite" is false — exactly one docstring does.** `stack.ts:34` says "Override per app via DI" and `stack.ts:95` says "Change the base app-wide with `KJ_OVERLAY_Z_BASE` (DI)" — the docs state exactly what the code does. `icon.providers.ts:14-18` (`provideIcons`) says nothing about routes or remotes. Only `locale.config.ts:50` actively instructs a pattern that no-ops. A grep of every `.md` and `.ts` outside `reports/review/` for `provideKjLocale|provideKjTranslations|provideIcons` near route/lazy/remote/MFE returns **zero** hits; the only place that documents route/remote scoping is this review report itself.
- **`KJ_OVERLAY_Z_BASE` is dropped from the finding entirely.** `KjOverlayStack` is a document-level coordinator — one set of document `keydown` / `pointerdown` listeners, one stack array, one monotonic z-ladder. A per-route base would be semantically incoherent (two sub-trees issuing overlapping z-indices into one document defeats the stack's purpose), and the token is already documented as app-wide. Counting it as an affected singleton was padding.
- **`provideIconResolver` / `provideIconLoader` are dropped — they DO work at route and remote level.** A route `EnvironmentInjector` holds an explicit record for `KJ_ICON_RESOLVER` / `KJ_ICON_LOADER`, and `R3Injector` checks its own records before falling back to the token's `providedIn: 'root'` ɵprov, so a directive under that route gets the route's override. Only `KJ_ICON_REGISTRY` — never explicitly provided anywhere — ignores route-level `provideIcons`. "Two remotes cannot have different icon sets" is overstated.
- **The MFE framing is withdrawn.** Independently bootstrapped remotes each own their own root `EnvironmentInjector`, so `provideKjLocale` in each remote's `bootstrapApplication` works correctly. The limitation applies only to sub-apps or routes mounted **inside a single host injector tree** — a real but much narrower case than "MFE is broken".
- **"Completely silent, no recourse" is overstated.** Root scoping is self-documented on the services, and `KjTranslateService.register()` exists precisely so catalogs can be added after construction.
- The specs (`icon.providers.spec.ts:16-42`, `locale.spec.ts:8-16`) cover root only — but those specs match the *intended* root-scoped contract, so their scope is not itself evidence of a gap. Nothing in `fd6dd34e..HEAD` touches any of this.

What is left is one misleading docstring sentence and one loose phrase, affecting an advanced scoping scenario that is otherwise undocumented. Every documented primary path works. That is a docs fix.

**Fix.**
1. Delete "or on a route to scope a sub-tree" from `locale.config.ts:50`; say the provider is application-scoped. Optionally add one line noting that a consumer who genuinely needs a scoped instance can list `KjLocale` alongside it in the route's `providers`.
2. Change `translate.config.ts:28` from "for the enclosing injector" to "for the application", and point at `register()` for late catalogs.
3. Add one line to `provideIcons`' TSDoc stating that the registry is application-scoped.

---

### F-2 Variant/size extensibility splits across two undocumented mechanisms; the components package's ~19 closed unions are extensible only via CSS custom properties, not the `data-variant` slot

**Severity:** medium *(corrected during verification: was high — consumers are not blocked)* · **Confidence:** high · **Effort:** L

**Files:** `packages/core/src/badge/badge.ts`, `packages/components/src/card/card.ts`,
`packages/components/src/checkbox/checkbox.ts`, `packages/components/src/toggle/toggle.ts`,
`packages/components/src/input/input.ts`, `packages/components/src/table/table.ts`,
`packages/components/src/divider/divider.ts`, `packages/core/src/toast/toast.service.ts`, and the
preset-driven counterparts in `packages/core/src/presets/*`

**Evidence** (re-verified verbatim at HEAD)

Preset-driven (open, configurable, cascade-aware):

```ts
// packages/core/src/presets/variant.ts:79-82
readonly kjVariant: InputSignalWithTransform<string | undefined, string | undefined> = input(
  undefined as string | undefined,
  { transform: (v?: string) => v || undefined },
);
```

Closed-union (no config token, no `provideKj*`, no fallback chain):

```ts
// packages/core/src/badge/badge.ts:3
export type KjBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

// packages/components/src/card/card.ts:82,107
readonly variant = input<'default' | 'outline' | 'subtle'>('default');
readonly size = input<'sm' | 'md' | 'lg'>('md');

// packages/components/src/table/table.ts:600
readonly kjVariant = input<'bordered' | 'striped' | 'clean'>('bordered');

// packages/components/src/toggle/toggle.ts:104,112
readonly size = input<'sm' | 'md' | 'lg'>('md');
readonly appearance = input<'press' | 'switch'>('press');
```

Counted at HEAD: `bindPresets` is used by 11 directives/components
(`button`, `link`, `tag`, `textarea`, `spinner`, `progress-bar`, `chat-bubble`, `breadcrumb`,
`pagination`, `tabs`, plus the spec fixture). Against that, an independent sweep found 18 inline
stylistic closed unions plus ~5 alias-typed ones — so "~19" is, if anything, conservative.

The `segmented` fix in `fd6dd34e` was a symptom of the *other* half of the same problem: the variant
value shipped with CSS but was missing from `KJ_BUTTON_DEFAULTS.variants`, so it produced a dev-mode
warning. (Note the commit message's claim that the button "fell back to `default`" is not what the
code does — `variant.ts:88-97` only `console.warn`s in dev mode and still reflects the unknown value.
The fix was correct; the diagnosis in the message was not, and the message is worth correcting.)

**Why it matters — corrected.** Consumers are **not** blocked. Every cited component ships its CSS in
`@layer kj.component`, where each variant rule does nothing but reassign custom properties, and those
properties are a documented public contract via `@doc-css-var` (card, badge, checkbox, input, toggle
and divider all carry one). `card.ts` documents `--kj-card-bg` with the literal text "Background fill.
Variant rules set this; override to brand-paint a one-off" — so the headline scenario, a brand card, is
an explicitly supported path: `<kj-card class="brand-card">` plus `.brand-card { --kj-card-bg: … }` in
an unlayered consumer rule. No `$any()`, no fork. Same for a subtle badge via
`--kj-badge-bg` / `-fg` / `-border-color`.

The real cost is threefold:

1. **Consumers cannot reuse the library's own `data-variant` slot.** Their extensions live in a
   parallel class namespace, and a structurally-*new* variant (a new toggle appearance, say) still
   needs hand-written CSS rather than a config entry.
2. **Which mechanism a component uses is discoverable only by reading the source.** There is no
   theming or customization doc, and `rules/architecture.md` documents the package split without
   mentioning variant extensibility at all.
3. **`KjBadge` (`packages/core/src/badge/badge.ts:3`) and `KjToast` are the genuine inconsistencies** —
   stylistic variants living in the zero-CSS *core* package but typed closed against CSS that ships in
   `packages/components`.

There is also a coherent, if unwritten, rationale for the split: core is zero-CSS so the *theme* owns
the vocabulary (open preset + `provideKj*`), while components own their CSS so the union is closed
against what actually ships. The closed unions in core are almost all behavioural enums
(`kjOrientation`, `kjMaskMode`, `kjFormat`, `kjSelectionMode`), not style variants.

**Note the one component with no escape hatch:** `packages/components/src/table/table.ts` is the only
cited component with **no `@doc-css-var` block**, so it lacks even the CSS-custom-property route.

**Verification correction (high → medium).** Every quoted line is verbatim-accurate; the counts hold;
the two mechanisms genuinely exist and are documented nowhere. What does not hold is the load-bearing
consequence — "their only options are `$any()` in the template or forking the component" — which the
`@doc-css-var` contract contradicts. This is an API-consistency and documentation gap, not a blocked
consumer.

**Fix.**
1. Document the core-open / components-closed rule in `rules/architecture.md`, and state the three
   supported levers in order (CSS custom properties on the host → `provideKj*` where it exists → an
   unlayered global rule).
2. Add a `@doc-css-var` block to `packages/components/src/table/table.ts`.
3. Move `badge` and `toast` onto `bindPresets` to match the rest of core.
4. Longer term, migrate the remaining closed unions onto the preset system: add
   `packages/core/src/<c>/config.ts` following `button/config.ts`, compose
   `{ directive: KjVariant, inputs: ['kjVariant'] }` / `KjSize` via `hostDirectives`, spread
   `bindPresets(KJ_*_CONFIG)` into `providers`, widen the input to `string | undefined`, and keep the
   literal union as a documentation alias only. Add a lint/CI check that a component with a
   `data-variant` or `data-size` host binding composes `KjVariant` / `KjSize`.
5. Correct `fd6dd34e`'s commit message — the preset validator warns, it does not fall back.

---

### F-3 `KjSpinnerConfig.animations` is never read, and the closed `kjAnimation` type blocks the extension its TSDoc recommends

**Severity:** medium *(corrected during verification: was high)* · **Confidence:** high · **Effort:** S

**Files:** `packages/core/src/spinner/config.ts`, `packages/core/src/spinner/spinner.ts`,
`packages/components/src/spinner/spinner.ts`, `docs/component-analyses/feedback/spinner.md:307`

**Evidence** (all exact at HEAD)

```ts
// packages/core/src/spinner/config.ts:7
export type KjSpinnerAnimation = 'spin' | 'dots' | 'pulse' | 'bars';

// packages/core/src/spinner/config.ts:16-19
/**
 * Default Spinner presets shipped by kouji-ui. Exported so consumers can
 * spread them when extending: `[...KJ_SPINNER_DEFAULTS.animations, 'ring']`.
 */

// packages/core/src/spinner/config.ts:36-39
 * Configures the Spinner presets for the enclosing injector. Replaces (does
 * not merge) `variants`, `sizes`, and `animations`; spread
 * `KJ_SPINNER_DEFAULTS.*` to extend.
```

```ts
// packages/core/src/spinner/spinner.ts:66-68
readonly kjAnimation = input<KjSpinnerAnimation>(
  (this.config.defaults.animation as KjSpinnerAnimation) ?? 'spin',
);

// packages/components/src/spinner/spinner.ts:148
readonly kjAnimation = input<KjSpinnerAnimation>('spin');
```

`animations: string[]` (`config.ts:12`) is consumed by **nothing**: `bindPresets`
(`packages/core/src/presets/bind-presets.ts`) translates only `variants`, `sizes`,
`defaults.variant` and `defaults.size` into the shared preset tokens. The field is not validated, not
reflected, not consulted anywhere.

Its evident intended purpose was dev-mode validation: `KjVariant` / `KjSize` warn on unknown values
against their preset lists (see `packages/core/src/presets/size.spec.ts`, "warns once in dev mode for
an unknown value"), and `kjAnimation` has no equivalent. Meanwhile the TSDoc at `config.ts:17-18` and
`:37-39`, echoed at `docs/component-analyses/feedback/spinner.md:307`, tells consumers to extend the
list — but `input<KjSpinnerAnimation>` is a closed literal union in both the core directive
(`spinner.ts:66-68`) and the styled wrapper (`components/spinner.ts:148`), under
`"strictTemplates": true` (`tsconfig.json:33`), so `<kj-spinner kjAnimation="ring">` is a compile
error. The `as KjSpinnerAnimation` cast at `spinner.ts:67` is the code admitting the mismatch.

**The partial escape hatch the original write-up omitted.** `defaults.animation` **is** read, at
`spinner.ts:67`, and the cast means `provideKjSpinner({ defaults: { animation: 'ring' } })` does
reflect `data-animation="ring"` at runtime. So the *global default* is extensible even though the
per-instance input and the `animations` list are not — the config is not wholly inert.

**Why it matters.** The library ships a config field, documents exactly how to extend it, and makes
the per-instance extension a compile error. A consumer following the TSDoc writes code that does not
compile against a config field that has no effect.

**Verification correction (high → medium).** The core claim holds line-for-line and no guard, test or
recent commit addresses it; spinner is the only core config with a preset list beyond
`variants` / `sizes`, so it is an isolated oversight rather than a systemic one. Severity drops
because there is no runtime breakage, no regression, and no accessibility or correctness impact: the
`defaults.animation` route works, and the blast radius is one optional field on one component, reached
only by a consumer attempting a niche custom-keyframe extension. That is a docs/DX defect with a
trivial fix.

**Fix.** Either/or:
- **(a)** Widen to `KjSpinnerAnimation | (string & {})` on both the directive and the wrapper
  (defaulting from `config.defaults.animation`) and wire dev-mode validation against
  `config.animations`, mirroring the `KjSize` / `KjVariant` warn at `presets/size.ts:87-98`; or
- **(b)** Drop the `animations` field entirely and correct both docstrings plus
  `docs/component-analyses/feedback/spinner.md:307`.

Not a runtime bug — no existing behaviour is broken either way. (The generalised version of (a) is a
third preset directive, `KjPresetAttr`, so `animation`, `appearance`, `tone` and friends all ride the
same resolution chain instead of each growing a bespoke field.)

---

### F-4 `provideKj*` takes `Partial<Config>`, which is one level deep — changing a single default forces restating all of them, and two providers disagree on merge depth

**Severity:** medium · **Confidence:** high · **Effort:** S

**Files:** `packages/core/src/pagination/config.ts`, `packages/core/src/breadcrumb/config.ts`,
`packages/core/src/button/config.ts`, `packages/core/src/spinner/config.ts` (and every other
`config.ts`)

**Evidence**

```ts
// packages/core/src/pagination/config.ts:70-81
/**
 * Configures the Pagination presets / labels for the enclosing injector.
 * Shallow-merges over the defaults — pass only the fields you want to
 * override.
 */
export function provideKjPagination(config: Partial<KjPaginationConfig>): Provider[] {
  return [
    {
      provide: KJ_PAGINATION_CONFIG,
      useValue: { ...KJ_PAGINATION_DEFAULTS, ...config },
    },
  ];
}
```

```ts
// packages/core/src/breadcrumb/config.ts:73-83  ← the sibling does it differently
export function provideKjBreadcrumb(config: Partial<KjBreadcrumbConfig>): Provider[] {
  return [
    {
      provide: KJ_BREADCRUMB_CONFIG,
      useValue: {
        ...KJ_BREADCRUMB_DEFAULTS,
        ...config,
        defaults: { ...KJ_BREADCRUMB_DEFAULTS.defaults, ...(config.defaults ?? {}) },
      },
    },
  ];
}
```

`Partial<T>` makes `defaults` optional but keeps *its* members required. So
`provideKjSpinner({ defaults: { animation: 'dots' } })` is a type error — the caller must also restate
`variant`, `size` and `ariaLabel` (`config.ts:13`). Breadcrumb's deep merge at line 80 is therefore
unreachable through the typed signature; pagination's docstring promise at line 72-73 ("pass only the
fields you want to override") is false for the whole `defaults` sub-object.

**Why it matters.** The most common customization request — "make `lg` the default button size" —
requires the consumer to copy the other defaults out of the source and keep them in sync forever. A
library minor that adds a field to `defaults` silently reverts every consumer that pinned it. And two
sibling providers behave differently, so the consumer cannot learn one rule.

**Fix.** Type every provider as a deep-partial and deep-merge in one shared helper:

```ts
type KjDeepPartial<T> = { [K in keyof T]?: T[K] extends object ? KjDeepPartial<T[K]> : T[K] };
function mergeConfig<T>(defaults: T, config: KjDeepPartial<T>): T { /* 2-level merge */ }
```

Then `provideKjX(config) => [{ provide: TOKEN, useValue: mergeConfig(DEFAULTS, config) }]` for all of
them, and fix the `variants` / `sizes` doc lines to say arrays still *replace* (the intended
behaviour). Spec it once against the helper.

---

### F-5 The documented "layer a single class on the host" escape hatch is inert for ~90 of ~130 styled components

**Severity:** medium · **Confidence:** high · **Effort:** M

**Files:** `rules/code_style.md`, `packages/components/src/button/button.ts`,
`packages/components/src/button/button.css`, and 88 other components

**Evidence**

```
rules/code_style.md:68-70
- When you must extend a kj component, layer a single class on the host —
  do not override its internal classes. If you find yourself needing more
  than a small visual delta, propose a new variant in the core package.
```

```ts
// packages/components/src/button/button.ts:114-136
    <button
      [type]="kjType()"
      kjButton
      class="kj-button"
      ...
  host: { style: 'display: contents;' },
```

The component's own CSS already documents the consequence:

```
packages/components/src/button/button.css:12-19
    /* Component knobs are NOT declared here.
       A custom property declared on an element always beats an inherited one,
       so declaring the knobs on .kj-button made them unreachable from an
       ancestor — including the <kj-button> host, which is display:contents and
       is the only thing a consumer can put an inline style on. …
```

`grep -c "display: contents"` over `packages/components/src` (excluding specs/examples/playgrounds)
returns **90**; `grep -c "host: { class:"` returns **42**. So there are two host contracts:
host-is-the-styled-element (tabs `tabs.ts:124`, spinner `spinner.ts:121`, alert `alert.ts:129`) and
host-is-a-`display:contents`-wrapper (button, badge, card, calendar…). On the second group,
`<kj-button class="danger-zone">` puts the class on an element that paints nothing; the visual element
is the inner `.kj-button` and the only selector that reaches it is `.danger-zone .kj-button`, i.e.
exactly the "override its internal classes" the rule forbids. Which group a component is in is not
documented anywhere.

**Why it matters.** The rule is the project's own answer to "the component is 90% right, what now?",
and for two thirds of the kit the answer silently does nothing. Consumers will discover the
`display:contents` split by trial and error and end up writing global `!important` rules.

**Fix.** Pick one contract. Either move the styled element onto the host everywhere (delete the
`display:contents` wrappers; `host: { class: 'kj-button' }` on a `<kj-button>` that *is* the button),
or — cheaper and non-breaking — add a documented `kjClass` input on every wrapper that forwards to the
inner element's `[class]`, plus a short "Overriding a single instance" doc page stating the three
supported levers in order: (1) CSS custom properties on the host (inherits through
`display: contents`), (2) `kjClass` on the inner element, (3) an unlayered global rule, which always
beats `@layer kj.component`. Document the merge order explicitly — it is nowhere today.

---

### F-6 `KjAlert` hand-rolls the preset system, and its config TSDoc claims it uses `bindPresets` when it does not

**Severity:** medium · **Confidence:** high · **Effort:** S

**Files:** `packages/core/src/alert/config.ts`, `packages/core/src/alert/alert.ts`

**Evidence**

```ts
// packages/core/src/alert/config.ts:3-8  ← the claim
/**
 * Shape of the Alert preset configuration. Mirrors `KjButtonConfig` —
 * `bindPresets(KJ_ALERT_CONFIG)` translates this into the shared
 * `KJ_VARIANT_PRESET` / `KJ_SIZE_PRESET` tokens consumed by the
 * `KjVariant` / `KjSize` host directives composed on `KjAlert`.
 */
```

```ts
// packages/core/src/alert/alert.ts:58-81 — no hostDirectives, no bindPresets
@Directive({
  selector: '[kjAlert]',
  standalone: true,
  exportAs: 'kjAlert',
  providers: [
    { provide: KJ_ALERT, useExisting: KjAlert },
  ],
  host: {
    ...
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
```

```ts
// packages/core/src/alert/alert.ts:100-109 — a second implementation of the same resolution
readonly kjVariant: InputSignalWithTransform<string, string | undefined> = input(
  this.preset.defaults.variant,
  { transform: (v?: string) => v || this.preset.defaults.variant },
);
```

```ts
// packages/core/src/alert/alert.ts:217-227 — a second copy of the dev-mode warn
        if (!this.preset.variants.includes(v)) {
          console.warn(
            `[kj-alert] unknown variant "${v}". Allowed values: ${this.preset.variants.join(', ')}.`,
```

`grep -n "hostDirectives\|bindPresets" packages/core/src/alert/alert.ts` confirms neither appears in
the `KjAlert` decorator (the only `hostDirectives` in the file is `[KjButton]` on the dismiss
directive at line 388).

**Why it matters.** Third mechanism, third behaviour. Because `kjVariant` defaults to a concrete value
rather than `undefined`, `KjAlert` cannot participate in the `KJ_VARIANT_FALLBACK` cascade at all — an
alert can never inherit a variant from a compound parent the way a button can. And the TSDoc sends a
maintainer looking for `bindPresets` wiring that isn't there.

**Fix.** Convert `KjAlert` to `hostDirectives: [{ directive: KjVariant, inputs: ['kjVariant'] },
{ directive: KjSize, inputs: ['kjSize'] }]` + `providers: [...bindPresets(KJ_ALERT_CONFIG)]`, delete
the duplicated inputs and the duplicated warn effect, and expose `variant`/`size` for
`KjAlertContext` from the composed directives. If the alert genuinely needs the variant value in TS
(it does — `mode()` derives from it at `alert.ts:150+`), inject `KjVariant` and read
`resolvedVariant()`.

---

### F-7 The i18n catalog is not the source of truth it claims to be; component labels are a second, competing i18n surface and many are not overridable at all

**Severity:** medium · **Confidence:** high · **Effort:** L

**Files:** `packages/core/src/i18n/catalogs/en.ts`, `packages/core/src/pagination/config.ts`,
`packages/core/src/breadcrumb/config.ts`, `packages/core/src/spinner/config.ts`,
`packages/components/src/calendar/calendar.ts`, `packages/components/src/chat/prompt-input.ts`

**Evidence**

```ts
// packages/core/src/i18n/catalogs/en.ts:1-6  ← the claim
/**
 * Canonical English (`en`) message catalog — the **source of truth** for
 * kouji-ui's visible / assistive-text strings. Every translation key the
 * library understands is spelled exactly once here; …
```

The catalog has 13 keys (`en.ts:11-34`), and only three non-i18n files consume `KjTranslateService`:
`packages/core/src/toast/toast.ts`, `packages/components/src/avatar/avatar-group.ts`,
`packages/components/src/tag/tag.ts`.

The same strings are simultaneously hard-coded in a config token, which pagination actually reads:

```ts
// packages/core/src/pagination/config.ts:48-56
  navigationLabel: 'Pagination',
  previousLabel: 'Previous page',
  nextLabel: 'Next page',
  firstLabel: 'First page',
  lastLabel: 'Last page',
  ellipsisLabel: 'More pages',
  pageItemLabel: (page) => `Page ${page}`,
  infoTemplate: (page, totalPages) => `Page ${page} of ${totalPages}`,
```

```ts
// packages/core/src/pagination/pagination.ts:73
    '[attr.aria-label]': 'config.navigationLabel',
```

— duplicating `en.ts:21-28` (`'pagination.nav'`, `'pagination.previous'`, …) key for key, while
`pagination.ts` never touches `KjTranslateService`.

And a third tier is not overridable by anything:

```html
<!-- packages/components/src/calendar/calendar.ts:99 -->
          aria-label="Previous month"
<!-- packages/components/src/chat/prompt-input.ts:87 -->
            aria-label="Stop generating"
```

`grep -rn 'aria-label="[A-Z]'` over `packages/components/src` (excluding specs/examples/playgrounds)
returns 24 hits.

**Why it matters.** A French consumer must (a) call `provideKjTranslations({ fr: FR_CATALOG })` for
toast/tag/avatar, (b) call `provideKjPagination({ previousLabel: 'Page précédente', … })` and
`provideKjBreadcrumb(…)` and `provideKjSpinner(…)` for the config-token tier — each requiring the full
`defaults` object per F-4 — and (c) fork the calendar and the prompt input. Three mechanisms, one of
which has no escape hatch, for one job. `MEMORY.md` already records "route all internal strings
through i18n" as a post-merge follow-up; this finding is the concrete inventory.

**Fix.** Make the catalog the only surface. Add the missing keys to `EN_CATALOG`
(`breadcrumb.*`, `spinner.loading`, `calendar.prevMonth`, `calendar.nextMonth`, `chat.stop`,
`chat.typing`, `chat.sources`, `alert.dismiss`, …), have `KjPagination` / `KjBreadcrumb` /
`KjSpinner` read them through `KjTranslateService`, and delete the label fields from those config
tokens (keep the `(page, total) => string` *formatters* only where interpolation genuinely differs
per locale — the catalog's `{page}` / `{total}` placeholders already cover most of them). Add a CI
grep that fails on a literal `aria-label="…"` in `packages/components/src` templates.

---

### F-8 `provideIcons()` is silently dead below the root injector while `provideLucideIcons()` works anywhere but writes to a page-global registry

**Severity:** medium · **Confidence:** high · **Effort:** M

**Files:** `packages/core/src/icon/icon.tokens.ts`, `packages/core/src/icon/icon.providers.ts`,
`packages/components/src/icon/lucide/provide-lucide-icons.ts`

**Evidence**

```ts
// packages/core/src/icon/icon.providers.ts:12-25
/**
 * Register a map of icon names to CSS-ready values. Call multiple times to
 * compose icon sets; later calls win on key collision.
 */
export function provideIcons(map: Record<string, string>): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: KJ_ICON_ENTRIES, useValue: map, multi: true },
  ]);
}
```

```ts
// packages/components/src/icon/lucide/provide-lucide-icons.ts:98-105
export function provideLucideIcons(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      const registry = inject(KJ_ICON_REGISTRY);
      registry.update((m) => ({ ...m, ...buildLucideRegistry() }));
    }),
  ]);
}
```

`KJ_ICON_REGISTRY` is `providedIn: 'root'` (`icon.tokens.ts:29`) and merges `KJ_ICON_ENTRIES` in its
root-scoped factory (lines 31-44). So `provideIcons()` on a route or remote contributes entries to a
`KJ_ICON_ENTRIES` multi-provider the root factory never reads. `provideLucideIcons()` takes the
opposite route — an environment initializer that *mutates* the root registry signal — so it "works"
from any injector, but by writing into shared page-global state where a second remote's icon named
`close` overwrites the first's.

**Why it matters.** Two icon-registration APIs with opposite and undocumented scoping semantics, one
of which fails silently. In an MFE, remotes cannot own their icon namespace at all.

**Fix.** Make `KJ_ICON_REGISTRY` injector-scoped: drop `providedIn: 'root'` and have `provideIcons()`
(and a new `provideKjIconRegistry()` for the root default) register the registry alongside the entries,
so `injectKjIconResolver()` (`icon.resolver.ts:22-25`) resolves the nearest registry and a child
registry can chain to its parent for misses. Convert `provideLucideIcons()` to a plain
`provideIcons(buildLucideRegistry())` so both APIs share one mechanism. Add a spec that provides
different icon maps on two sibling child environment injectors and asserts each resolves its own.

---

### F-9 `--kj-overlay-z-base` on `:root` overrides the DI token, so a host page can silently retarget every remote's overlay stack

**Severity:** medium · **Confidence:** high · **Effort:** S

**Files:** `packages/core/src/primitives/overlay/stack.ts`

**Evidence**

```ts
// packages/core/src/primitives/overlay/stack.ts:161-173
  /**
   * Base level of the stack: `--kj-overlay-z-base` on `:root` when it holds
   * a number, otherwise the `KJ_OVERLAY_Z_BASE` token (default `1000`).
   */
  get baseZIndex(): number {
    if (this.isBrowser && typeof getComputedStyle === 'function') {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--kj-overlay-z-base').trim();
      const n = raw === '' ? NaN : Number(raw);
      if (Number.isFinite(n)) return n;
    }
    return this.configuredBase;
  }
```

The read is unconditionally against `document.documentElement` — the page root, not the overlay's own
subtree — and the CSS value *wins* over the explicit DI token.

**Why it matters.** In an MFE, the base z-index is a shared, page-global setting that whichever bundle
happens to write `:root { --kj-overlay-z-base }` owns. A remote that deliberately sets
`KJ_OVERLAY_Z_BASE` via DI to sit above the host's chrome is silently overruled. Combined with F-1
(`KJ_OVERLAY_Z_BASE` is root-only), there is no per-remote overlay layering at all.

**Fix.** Read the custom property from the overlay's own container element (or the nearest ancestor
that declares it) rather than `documentElement`, and invert the precedence: an explicit DI token
should win over a stylesheet default. At minimum, resolve the DI token first and fall back to the CSS
property, and say so in the TSDoc at lines 34-36.

---

### F-10 Documentation examples on `_examples` barrels leak into the published package API (and drag the 1 600-name Lucide list with them)

**Severity:** medium · **Confidence:** high · **Effort:** S

**Files:** `packages/components/src/icon/index.ts`, `packages/components/src/input-mask/index.ts`,
`packages/components/src/icon/_examples/index.ts`

**Evidence**

```ts
// packages/components/src/icon/index.ts
export * from './lucide/index';
export {
  KjIconGalleryExample,
  KjIconUsageExample,
} from './_examples';
```

```ts
// packages/components/src/input-mask/index.ts
export { KjInputMaskComponent } from './input-mask';
export {
  KjInputMaskExample,
  KjInputMaskUsageExample,
  KjInputMaskCreditCardExample,
  KjInputMaskDateExample,
  KjInputMaskValidationExample,
  KjInputMaskCustomTokensExample,
} from './_examples';
```

```ts
// packages/components/src/icon/_examples/index.ts:1-2  ← says it is docs-only
// AUTO-GENERATED by scripts/migrate-examples.mjs (manually augmented)
// One barrel per component folder — used by the docs app as a lazy chunk.
```

Both barrels are reachable from `packages/components/src/public-api.ts:33,36`, which is the
`ng-package.json` `entryFile`. `icon.gallery.example.ts:12` imports `LUCIDE_ICON_NAMES` from the
30 KB generated `icon-names.generated.ts`, so that array lands in the package's main entry point.
No other component barrel does this — `grep "_examples" packages/components/src/*/index.ts` returns
only these two.

**Why it matters.** Eight demo components become part of the supported public API (semver-bound, and
now the consumer's problem to tree-shake), and the docs-only Lucide name list is pulled into every
app that imports anything from `@kouji-ui/components`.

**Fix.** Delete the `_examples` re-exports from both `index.ts` files; the docs app should import them
via the `@kouji-ui/components/*` deep path or the dedicated `example-components.ts` entry, exactly as
the other 60-odd components already do. Add a CI check that `public-api.ts`'s transitive import graph
contains no `_examples/` or `*.playground.ts` file.

---

### F-11 The preset system's own extension points are marked `@internal` but exported, so a consumer building a kouji-style component has no supported entry

**Severity:** medium · **Confidence:** medium · **Effort:** S

**Files:** `packages/core/src/presets/bind-presets.ts`, `packages/core/src/presets/variant.ts`,
`packages/core/src/presets/size.ts`, `packages/core/src/presets/index.ts`,
`packages/core/src/public-api.ts`, `packages/core/tsconfig.lib.json`

**Evidence**

```ts
// packages/core/src/presets/bind-presets.ts:17-26
/**
 * Returns providers that translate a per-component config token into the
 * shared preset tokens (`KJ_VARIANT_PRESET`, `KJ_SIZE_PRESET`). Spread into a
 * consumer directive's `providers` array.
 *
 * @internal
 */
export function bindPresets<T extends KjBindablePresetConfig>(
```

```ts
// packages/core/src/presets/variant.ts:52-62
 * Internal preset directive composed via `hostDirectives` by every stylistic
 * component to expose a configurable `variant` input … App code does not
 * import this directly.
 *
 * @internal
 */
```

```ts
// packages/core/src/public-api.ts
// -- Internal presets (composed via hostDirectives; filtered from docs) --
export * from './presets/index';
```

Neither `tsconfig.lib.json` nor `tsconfig.lib.prod.json` sets `stripInternal`, so `KjVariant`,
`KjSize`, `bindPresets`, `KjBindablePresetConfig`, `KJ_VARIANT_PRESET`, `KJ_SIZE_PRESET`,
`KJ_VARIANT_FALLBACK` and `KJ_SIZE_FALLBACK` all ship in the published `.d.ts` and are importable.
(`KJ_ICON_ENTRIES` at `icon.tokens.ts:9-12` is the same contradiction.)

**Why it matters.** `bindPresets` + a config token is exactly what a consumer needs to build their own
`<acme-chip>` that participates in the same `provideKj*` story, and the docstring says "consumer
directive's `providers` array" in one breath and `@internal` / "App code does not import this
directly" in the next. The symbols are shipped either way, so the only effect of the tag is to tell
consumers not to use the thing they need.

**Fix.** Decide. Either promote `KjVariant` / `KjSize` / `bindPresets` / the four tokens to supported
public API — drop `@internal`, write the "build your own preset-driven component" doc, and treat their
shape as semver-bound — or set `stripInternal: true` in `tsconfig.lib.prod.json` and accept that
`hostDirectives` composition across package boundaries breaks. Promoting is the right call; it is the
one mechanism worth standardising on (see F-2).

---

### F-12 Input naming is inconsistent across (and within) components: `variant` vs `kjVariant`

**Severity:** low · **Confidence:** high · **Effort:** M

**Files:** `packages/components/src/input/input.ts`, `packages/components/src/badge/badge.ts`,
`packages/components/src/card/card.ts`, `packages/components/src/toggle/toggle.ts`,
`packages/components/src/tabs/tabs.ts`, `CLAUDE.md`, `rules/architecture.md`

**Evidence**

```ts
// packages/components/src/input/input.ts:129-130  ← both conventions, same class
readonly variant = input<KjInputVariant>('default');
readonly kjSize = input<KjInputSize>('md');
```

```ts
// packages/components/src/badge/badge.ts:90-91
readonly variant = input<KjBadgeVariant>('default');
readonly size = input<'xs' | 'sm' | 'md' | 'lg'>('md');

// packages/components/src/tabs/tabs.ts:138
readonly variant = input<string | undefined>(undefined);

// packages/components/src/button/button.ts:146-148
readonly kjVariant = input<string | undefined>(undefined);
readonly kjSize = input<string | undefined>(undefined);
```

`rules/architecture.md` ("Host directives") states: "All forwarded inputs keep the `kj` prefix."
`tabs.ts:118` forwards `{ directive: KjVariant, inputs: ['kjVariant: variant'] }` — i.e. it explicitly
*strips* the prefix, against the rule.

**Why it matters.** A consumer cannot write `<kj-badge kjVariant="…">` or `<kj-button variant="…">`;
which spelling a component takes is memorised per component. Content-projection slot names have the
same split — `[kjAlertIcon]` (`alert.ts:118`), `[kjBulkAction]` (`table-toolbar.ts:150`),
`[secondary]` (`empty-state.ts:258`), `[prefix]`/`[suffix]` (`field.ts:229,235`),
`[kj-file-upload-actions]` (`file-upload.ts:154`) — camel-prefixed, bare, and kebab-prefixed in the
same package.

**Fix.** Standardise on `kj`-prefixed for both inputs and projection-slot attribute selectors. Ship the
rename with deprecated aliases (`inputs: ['kjVariant', 'kjVariant: variant']` is not legal, so add an
explicitly deprecated second input that forwards) for one minor, then drop them. Fold this into the
F-2 migration so each component is touched once.

---

### F-13 Documentation-truth defects in `provide*` / config TSDoc

**Severity:** low · **Confidence:** high · **Effort:** S

**Files:** `packages/components/src/button/button.ts`, `packages/core/src/tag/config.ts`,
`packages/core/src/badge/badge.ts`, `packages/core/src/chat/chat-registry.ts`

**Evidence**

```ts
// packages/components/src/button/button.ts:50-52  ← wrong config shape
 * @doc-example Configured presets
 *   `provideKjButton({ variant: 'primary' })` sets the default for every
 *   button in the injection scope.
```

`KjButtonConfig` (`packages/core/src/button/config.ts:3-7`) has no `variant` field — the correct call
is `provideKjButton({ defaults: { variant: …, size: … } })`, as the linked example file itself does
(`button.configured.example.ts:10-13`). `'primary'` is also not in `KJ_BUTTON_DEFAULTS.variants`
(`config.ts:14`).

```ts
// packages/core/src/tag/config.ts:10-15  ← claim
/**
 * Default Tag presets shipped by kouji-ui. Variant list is intentionally
 * kept in lock-step with `KjBadge` … a non-interactive Tag and a Badge with
 * the same `kjVariant` must look identical.
 */
```

```ts
// packages/core/src/tag/config.ts:17-27     → default, primary, secondary, success,
//                                             warning, danger, info, outline, ghost
// packages/core/src/badge/badge.ts:3        → default, secondary, destructive, outline
```

Only `default`, `secondary` and `outline` are shared; `destructive` exists on Badge and not on Tag
(Tag's CSS aliases it at `packages/components/src/tag/tag.css:40-41`), and six Tag variants have no
Badge counterpart. They are not in lock-step and cannot be — Badge has no config token to widen (F-2).

```ts
// packages/core/src/chat/chat-registry.ts:28-32  ← claim
   * Renderers by item `type`. Merged OVER the built-in defaults, so naming a
   * built-in type replaces it and any other name adds one.
```

There are no built-in defaults: the token factory is `() => ({ renderers: {} })` (line 48) and
`provideKjChat` does `useValue: config` (line 66) — a straight replace, with no merge of any kind.

**Why it matters.** Each of these sends a consumer down a path that does not compile, does not match,
or does not merge. TSDoc is the only customization documentation the library has (there is no theming
or customization guide in `apps/docs` — `getting-started.html:15` is a single line about
`[data-theme]`), so it has to be right.

**Fix.** Correct the three docstrings. For Tag/Badge, either add `provideKjBadge` and genuinely share
one variant list between them, or delete the lock-step claim.

---

### F-14 Wrapper components re-declare host-directive inputs "for the docs extractor", publishing a `.d.ts` default that contradicts the configurable one

**Severity:** low · **Confidence:** medium · **Effort:** S

**Files:** `packages/components/src/alert/alert.ts`, `packages/components/src/spinner/spinner.ts`,
`packages/components/src/tabs/tabs.ts`

**Evidence**

```ts
// packages/components/src/alert/alert.ts:132-137
export class KjAlertComponent {
  // Inputs are forwarded via `hostDirectives.inputs` above. Re-declared here
  // only to surface them in the docs extractor (which inspects the wrapper
  // class). The actual signal lives on the composed directive.
  readonly kjVariant = input<string>('info');
  readonly kjSize = input<string>('md');
```

```ts
// packages/components/src/spinner/spinner.ts:148,156
readonly kjAnimation = input<KjSpinnerAnimation>('spin');
readonly kjAriaLabel = input<string>('Loading');
```

The composed directive's copies are config-driven (`packages/core/src/alert/alert.ts:100-109`,
`packages/core/src/spinner/spinner.ts:66-76`), so behaviour is correct — but the wrapper's shadow
inputs are separate signal instances with hard-coded defaults that appear in the published types and
in the generated docs. In the spinner's case the wrapper's copy is also what renders:
`spinner.ts:117` interpolates `{{ kjAriaLabel() }}` — the hard-coded `'Loading'` — into the
visually-hidden label, while the host's `aria-label` comes from the directive's config-driven copy. A
`provideKjSpinner({ defaults: { …, ariaLabel: 'Chargement' } })` therefore produces
`aria-label="Chargement"` on the host and a hidden span reading "Loading".

**Why it matters.** The published API lies about the default (`'info'` / `'spin'` / `'Loading'` are
presented as fixed when they are configurable), and the spinner ships two different accessible-name
sources that can disagree. It also doubles the input signals instantiated per component.

**Fix.** Teach the docs extractor to follow `hostDirectives` (it already has to, for
`KjVariant`/`KjSize` forwarding) and delete the shadow inputs. Until then, have the spinner template
read the directive's signal — `inject(KjSpinner).kjAriaLabel()` — not its own copy.

---

### F-15 No per-subtree direction: `KjDirectionality` reads only `<html dir>` / `<body dir>` and `provideKjDocumentDirection()` writes only `<html dir>`

**Severity:** low · **Confidence:** high · **Effort:** M

**Files:** `packages/core/src/primitives/directionality/directionality.ts`,
`packages/core/src/locale/document-direction.ts`

**Evidence**

```ts
// packages/core/src/primitives/directionality/directionality.ts:81-88
  private read(): KjDirection {
    const doc = this.doc;
    if (!doc) return 'ltr';
    const htmlDir = doc.documentElement?.getAttribute('dir');
    const bodyDir = doc.body?.getAttribute('dir');
    const value = (htmlDir ?? bodyDir ?? '').toLowerCase();
    return value === 'rtl' ? 'rtl' : 'ltr';
  }
```

```ts
// packages/core/src/locale/document-direction.ts:50-56
      effect(() => {
        const dir = locale.direction();
        const html = doc.documentElement;
        if (html.getAttribute('dir') !== dir) {
          html.setAttribute('dir', dir);
        }
      });
```

The service is `providedIn: 'root'` (line 33) with a `MutationObserver` on `documentElement` only
(lines 65-69), so a `dir="rtl"` on an intermediate wrapper is invisible to it. The one place in the kit
that *does* honour a nearest ancestor is `packages/core/src/a11y/roving-tabindex.ts:134`
(`el.closest('[dir]')`) — which means arrow-key direction and visual direction can disagree inside an
RTL subtree.

**Why it matters.** A page hosting an Arabic widget beside an English one cannot be expressed: the
direction is a single global, `KjLocale` is a root singleton (F-1), and the only writer targets
`<html>`. CSS logical properties would make per-subtree direction work for free if the TS side agreed.

**Fix.** Make `KjDirectionality` element-aware: `inject(ElementRef).nativeElement.closest('[dir]')`
first, falling back to the document read, observing that ancestor. Keep the root service as the
document-level default. Scope `provideKjDocumentDirection()`'s write to an opt-in target element.

---

## Carried forward from the 2026-09-06 review

Filed in the previous pass (report at `9aee150a`, audited at `fd6dd34e`), **not** re-filed by this
audit, and re-verified as still true at HEAD. Ids F-1…F-15 above are unchanged.

### F-16 Per-instance CSS override is silently defeated by every non-default variant — on the `display:contents` components

**Severity:** medium · **Confidence:** high · *(carried forward — prev F-3; the half of it that current F-2 and F-5 between them leave uncovered)*
**Files:** `packages/components/src/button/button.css:10-31,80-94`, `packages/components/src/button/button.ts:135-136`, `packages/components/src/button/button.css.spec.ts:47-50`

A custom property declared **on** an element always beats an inherited one. `button.css` says so itself, at `:10-22`, and then states the exception that is the defect:

```
packages/components/src/button/button.css:21-22
       Variant and size rules still DECLARE knobs on the element on purpose:
       that is the component's own logic and must win.
```

```css
/* button.css:85-88 */
  .kj-button[data-variant="ghost"] {
    --kj-button-bg: transparent;
    --kj-button-fg: var(--kj-fg-default);
```

For a component whose host is `display: contents` — button, and the other ~89 counted in F-5 — the only element a consumer can reach is the host, so `<kj-button kjVariant="ghost" style="--kj-button-bg: hotpink">` works for `default` (whose knobs are deliberately left undeclared) and is a **no-op** for `ghost`, `outline`, `destructive`, `link` and `segmented`. The authors hit this and patched exactly one variant with a second indirection knob (`--kj-segmented-bg-on`, `button.css:111-114`) — a per-variant one-off, not a pattern. `button.css.spec.ts:47-50` codifies the *opposite* invariant, so the gap is deliberate but undocumented as a limitation.

**Why this is not already covered.** Current **F-5** covers the *class*-on-the-host half (a class on a `display:contents` host reaches nothing). Current **F-2**'s verification block establishes that the CSS-custom-property route *does* work — but its worked example is `<kj-card>`, whose host **is** the styled element (`card.ts:70-77`, `host: { 'class': 'kj-card' }`), so an unlayered `.brand-card { --kj-card-bg: … }` lands on the same element and wins. That reasoning does **not** transfer to the `display:contents` group, where the consumer's declaration is on an ancestor and the variant rule's declaration is on the element. Both statements are true; which one applies depends on which host contract the component uses, and nothing documents that.

**Fix:** pick one and apply it library-wide — (a) variant rules set a second-tier knob read with the public knob as the outer fallback (`--kj-button-bg: var(--kj-button-bg-user, var(--kj-button-bg-variant))`, generalising the `--kj-segmented-*` trick), or (b) ship an explicit documented per-instance hatch (`kjClass` / `kjStyle` forwarding to the inner element) and state in every `@doc-css-var` block that ancestor custom properties only reach knobs the active variant does not declare. Extend `button.css.spec.ts`'s postcss assertions to every component stylesheet. **Effort:** M

---

### F-17 Service-launched overlays bypass the mount strategy when choosing their root container

**Severity:** low · **Confidence:** high · *(carried forward — prev F-2)*
**Files:** `packages/core/src/primitives/overlay/builder.ts:118`, `packages/core/src/primitives/overlay/container.ts`, `packages/core/src/primitives/overlay/tokens.ts:17`

Unchanged at HEAD:

```ts
// builder.ts:118 — goes straight to the module global
getOverlayContainer()?.appendChild(wrapperRef.location.nativeElement);
```

The builder never goes through the injected `KJ_OVERLAY_MOUNT_STRATEGY.resolveContainer()` seam (`tokens.ts:17`) that the declarative overlays use — and that seam *is* provided per component in 9+ places (select, tooltip, popover, date-picker, color-picker, tree-select, combobox, cascade-select, dropdown-menu). So an app that wants dialogs, drawers, sheets or toasts rooted somewhere other than `document.body` — a shadow root, a fullscreen element, an MFE-owned host node — can override the container for popovers and tooltips but not for the builder-launched family.

**Fix:** have the builder call `config.mount.resolveContainer()` with `getOverlayContainer()` as the fallback, or add a `KJ_OVERLAY_CONTAINER` token whose default factory is `getOverlayContainer`. **Effort:** S

---

### F-18 `bindPresets` lives in core for 11 directives but in components for tabs; `KjIconDirective` breaks the naming rule

**Severity:** medium · **Confidence:** high · *(carried forward — prev F-8)*
**Files:** `packages/components/src/tabs/tabs.ts:15,120`, `packages/core/src/icon/icon.directive.ts:75`

Re-verified at HEAD: `grep -rn "bindPresets" packages/components/src --include=*.ts` (excluding specs) returns exactly **two** hits — `tabs.ts:15` (the import) and `tabs.ts:120` (`providers: [...bindPresets(KJ_TABS_CONFIG)]`) — plus a comment in `tag.ts:125`. Every other `bindPresets` call site is in `packages/core`. So `@kouji-ui/core`'s tabs directive is not preset-aware: a headless consumer of core gets no `data-variant` on tabs, and `provideKjTabs` does nothing for them.

Separately `packages/core/src/icon/icon.directive.ts:75` declares `export class KjIconDirective`, which breaks `CLAUDE.md`'s class-naming rule (drop the Angular type suffix unless two things in the same feature would collide) — and the file name `icon.directive.ts` breaks the matching file-name rule.

**Fix:** move the tabs preset wiring into the core `KjTabs` directive so all 12 live in one place; rename `KjIconDirective` → `KjIcon` and `icon.directive.ts` → `icon.ts` (or document the collision that justifies the suffix). **Effort:** S

---

### F-19 `provideKj*` config functions are not re-exported from `@kouji-ui/components`

**Severity:** medium · **Confidence:** high · *(carried forward — prev F-9)*
**Files:** `packages/components/src/public-api.ts`

Re-verified at HEAD: `grep -c "provideKj" packages/components/src/public-api.ts` returns **0**. The file re-exports a hand-picked set of classes and types from `@kouji-ui/core` purely to satisfy AOT template type-checking (NG3004); no `provideKj*` function and no `KJ_*_CONFIG` / `KJ_*_DEFAULTS` symbol is in that list. A consumer of the styled package must import from a second package to configure the component they just imported:

```ts
import { KjButtonComponent } from '@kouji-ui/components';
import { provideKjButton, KJ_BUTTON_DEFAULTS } from '@kouji-ui/core'; // ← second package
```

This is the discoverability half of F-2: the preset system is the good mechanism, and the package a consumer actually installs does not surface it.

**Fix:** re-export every `provideKj*`, `KJ_*_CONFIG` and `KJ_*_DEFAULTS` from `packages/components/src/public-api.ts`, and add a CI check that each component barrel exports its own config trio. **Effort:** S

---

### F-20 Motion has no configuration surface at all

**Severity:** low · **Confidence:** high · *(carried forward — prev F-13)*
**Files:** `packages/core/src/motion/motion.ts`, `packages/core/src/motion/index.ts`

`kjMotion` is a free-form `input.required<string>()` with no preset token, no allowlist and no dev warning, and the whole public surface of the motion module is two exports (`KjReducedMotion`, `KjMotion` + `KjMotionState`). There is no `provideKjMotion`, so a consumer cannot register a named animation, cannot override a built-in one, and gets no feedback for a typo — the opposite of every other stylistic axis in the library. (Cross-reference: `02-styles-theming.md` Open question 5 notes `kjMotion` has zero usages in `packages/components` and `apps/docs`, and `motion.css` is registered by nothing.)

**Fix:** give motion the same preset shape as variant/size — `KJ_MOTION_CONFIG` + `provideKjMotion({ animations, defaults })` — or state in the TSDoc that the token is a raw CSS-animation-name passthrough and that registering keyframes is the consumer's job. **Effort:** S

---

### F-21 `@angular/cdk` is a peer dependency of both packages despite the no-CDK policy

**Severity:** low · **Confidence:** high · *(carried forward — prev F-14)*
**Files:** `packages/core/package.json:32`, `packages/components/package.json:28`, `rules/stack.md`

Unchanged at HEAD: `"@angular/cdk": "^22.0.0"` is declared in both `peerDependencies` blocks, and `packages/core/package.json:20` even lists `cdk` in its npm `keywords` while the description reads "Headless Angular 21 UI primitives — directives over CDK". `rules/stack.md:8-11` forbids CDK, and the `01-overlay.md` audit re-confirmed that nothing under `packages/core/src/primitives/overlay/**` imports it. So every consumer is forced to install a package the library does not use, and the package metadata advertises the opposite of the stated architecture.

**Fix:** verify with a repo-wide `@angular/cdk` import grep, then drop the peer dependency from both packages, remove the `cdk` keyword, and correct the core package description. **Effort:** S

---

## Changed since the 2026-09-06 review

Previous report: `git show 9aee150a:reports/review/03-customization.md`, audited at `fd6dd34e`.
Range since: `fd6dd34e..HEAD` (8 commits). Every claim below was verified against the code at HEAD.

### Fixed

**Nothing.** None of the 14 previous customization findings is fixed at HEAD. The eight commits in the
range are three `chore: version packages` releases and four overlay / list / CSS-packaging fixes
(`415123ad` #67, `2948c5b5` #69, `fb1d1956` #71, `e6aa28a5` #73), none of which touches the preset
system, the config tokens, the i18n surface, the icon registry, the public-api barrels or the package
manifests. Spot-verified at HEAD for the findings most likely to have drifted:

- `builder.ts:118` still calls `getOverlayContainer()` directly (prev F-2 → F-17 above).
- `button.css:21-22` still states "Variant and size rules still DECLARE knobs on the element on purpose" (prev F-3 → F-16 above).
- `grep -c "provideKj" packages/components/src/public-api.ts` = 0 (prev F-9 → F-19 above).
- `chat-registry.ts:28-29` still promises "Merged OVER the built-in defaults" while `:48`'s factory is `() => ({ renderers: {} })` and `provideKjChat` (`:65-67`) is a bare `useValue` with no merge (prev F-10).
- `breadcrumb/config.ts:80` deep-merges `defaults` while `pagination/config.ts` does not (prev F-11).
- `grep -rln "ViewEncapsulation.None" packages/components/src --include=*.ts | grep -v spec | wc -l` = **81** (prev F-12).
- `@angular/cdk` still in both peer blocks (prev F-14 → F-21 above).

### Still open

| prev id | prev title (abbreviated) | current id |
|---|---|---|
| F-1 | `provideKjLocale` TSDoc claims route-level scoping | **F-1** — and the two passes now converge: this audit filed it at high across four singletons, verification cut it back to essentially the prev pass's own scope and severity (one docstring sentence, low). The prev pass was right the first time. |
| F-2 | Service-launched overlays bypass the mount strategy | **F-17** (carried forward above) |
| F-3 | Per-instance CSS override defeated by every non-default variant | **F-5** (the class-on-host half) + **F-16** (the custom-property half, carried forward above) |
| F-4 | 10 of 69 component stylesheets are unlayered | still open, **not re-filed here** — covered in `02-styles-theming.md` **F-7**. The prev finding's *second* half is not covered there either: the `@layer` order statement lives only in `@kouji-ui/themes/base.css:7`, and `@kouji-ui/components` does not depend on `@kouji-ui/themes` (re-verified — its `peerDependencies` list `@kouji-ui/core`, `@angular/*`, lexical, `lucide-static`, `rxjs`, and no themes package), so a consumer on the "core + components, bring your own tokens" path never evaluates it and `kj.component`'s position is decided by first-appearance order. Worth adding to `02-styles-theming.md` F-7. |
| F-5 | Four competing variant/size mechanisms; ~10 components closed | **F-2** (recounted at two mechanisms and ~19 closed unions) |
| F-6 | i18n catalog and config-token labels duplicate; catalog loses | **F-7** |
| F-7 | `provideKj*` / token-description / `kj` prefix naming inconsistent | **F-12** |
| F-8 | `bindPresets` in components for tabs; `KjIconDirective` naming | **F-18** (carried forward above) |
| F-9 | `provideKj*` not re-exported from `@kouji-ui/components` | **F-19** (carried forward above) |
| F-10 | `provideKjChat`'s doc promises a merge that does not exist | **F-13** (folded into the documentation-truth finding) |
| F-11 | `provideKj*` merge semantics inconsistent across 11 config tokens | **F-4** |
| F-12 | `ViewEncapsulation.None` on 81 components leaks global CSS across MFEs | still open, **not re-filed** — out of this pass's scope; tracked in `05-micro-frontends.md`. Count re-verified at 81. Current F-5 covers the `display:contents` consequence of the same host contract but not the cross-MFE leakage. |
| F-13 | Motion has no configuration surface | **F-20** (carried forward above) |
| F-14 | `@angular/cdk` peer dependency despite the no-CDK policy | **F-21** (carried forward above) |
| F-2 (original) | "Overlay container and scroll lock are module-level globals with no DI seam" | **refuted in the previous pass** and correctly not revived. This audit independently reached the same place: current "What works" lists the eight overlay strategy tokens as a real extension point, and the residual page-global-state concern is `05-micro-frontends.md`'s, not this dimension's. |

### Not reproduced

- **Fixed:** none.
- **Missed by this pass and now restored:** prev F-2, F-3 (partially), F-8, F-9, F-13, F-14 — re-filed above as F-16…F-21. Honest cause: this pass organised itself around the preset system, the config-token merge semantics and the i18n surface, and did not re-walk the overlay builder's container seam, the barrel exports, the motion module or the package manifests.
- **Deliberately deferred to another dimension:** prev F-4 (unlayered stylesheets → `02-styles-theming.md` F-7) and prev F-12 (`ViewEncapsulation.None` leakage → `05-micro-frontends.md`). Both are still true at HEAD; neither is dropped, but neither is re-argued here.
- **Wrong in the previous pass:** nothing. The one previously-refuted item (original F-2 on module-level globals) stayed refuted.
- **Where this pass was wrong and the prev pass was right:** current F-1. This audit widened prev F-1 from one docstring sentence at low back out to four root singletons at high, including `KJ_OVERLAY_Z_BASE` (which is correctly app-wide) and `provideIconResolver` / `provideIconLoader` (which do work at route level), and revived the "two remotes cannot have different locales" framing the prev pass had already refuted. Verification has reverted it. Recording it so the regression is visible rather than silently re-corrected.

### New since then

- **F-3 — `KjSpinnerConfig.animations` is never read and `kjAnimation` is closed.** New; the sharpest single instance of the closed-union problem and the only core config with a preset list beyond `variants` / `sizes`.
- **F-5 — the "layer a single class on the host" escape hatch is inert for ~90 of ~130 components.** New as a *rule-vs-reality* finding. The prev pass found the custom-property half (prev F-3); the class half, the 90/42 host-contract split, and the fact that `rules/code_style.md` prescribes the inert lever are new.
- **F-6 — `KjAlert` hand-rolls the preset system and its TSDoc claims otherwise.** New. Prev F-5 counted alert among the closed components but did not catch that it *reimplements* `bindPresets` while documenting that it uses it.
- **F-8 — `provideIcons()` dead below root while `provideLucideIcons()` works anywhere but writes to a page-global registry.** New; prev F-1's verification explicitly *removed* the icon registry from scope, and this pass found the asymmetry between the two provider functions, which is a different (and real) point.
- **F-9 — `--kj-overlay-z-base` on `:root` overrides the DI token.** New, and only reachable after `2948c5b5` (#69) introduced `KJ_OVERLAY_Z_BASE` and the CSS-custom-property read at `stack.ts:162-167`. A genuinely post-`fd6dd34e` finding.
- **F-10 — `_examples` barrels leak into the published package API** (dragging the 1,600-name Lucide list). New.
- **F-11 — the preset system's own extension points are `@internal` but exported.** New; the corollary of F-2's "the preset system should win everywhere".
- **F-14 — wrapper components re-declare host-directive inputs "for the docs extractor".** New.
- **F-15 — no per-subtree direction.** New here, though the prev pass's refutation of original-F-2 argued the opposite case (that `provideKjLocale({direction:'rtl'})` plus `dir` on the MFE root is sufficient). These two need reconciling: current F-15 says `KjDirectionality` reads only `<html dir>` / `<body dir>`, which is a narrower and checkable claim than "RTL subtrees are unrepresentable" — the CSS is subtree-scoped either way, so the open question is whether the *service* needs to be element-aware or whether the explicit-direction provider is the supported answer.

## Recommended work items

Ordered by (MFE blast radius × cheapness).

1. **Correct every false `provide*` / config docstring.** F-1 (`locale.config.ts:50`'s "or on a
   route to scope a sub-tree", `translate.config.ts:28`'s "enclosing injector", plus a scope line on
   `provideIcons`), F-6 (alert `bindPresets`), F-13 (button `variant:`, Tag/Badge lock-step, chat
   "merged over defaults"). Pure doc change, no behaviour risk, kills the worst consumer-misleading —
   and after verification this *is* the whole of F-1. — *F-1, F-6, F-13* · S
2. **Fix the spinner `animations` contradiction.** Widen `kjAnimation` to `string | undefined` on both
   directive and wrapper, add the dev-mode warn against `config.animations`. Smallest concrete
   instance of the closed-union problem; ships as a patch. — *F-3* · S
3. **Remove the `_examples` re-exports from `icon/index.ts` and `input-mask/index.ts`** and add a CI
   check on `public-api.ts`'s import graph. — *F-10* · S
4. **Introduce `mergeConfig` / `KjDeepPartial` and retype every `provideKj*`.** One helper + one spec,
   then a mechanical sweep of the 14 config files; also unifies breadcrumb's divergent merge. — *F-4* · S/M
5. **Decide the root-vs-scoped question for `KjLocale`, `KjTranslateService` and
   `KJ_ICON_REGISTRY`** for the sub-app-inside-one-injector-tree case, and add child-
   `EnvironmentInjector` specs for each. *(Corrected during verification: `KJ_OVERLAY_Z_BASE` is
   correctly app-wide and is dropped from this item; separately bootstrapped remotes already work, so
   this is a scoping nicety rather than the MFE blocker it was billed as — item 1 is the actual fix
   for the documented promise.)* — *F-1, F-8, F-9* · M
6. **Promote `KjVariant` / `KjSize` / `bindPresets` / the four preset tokens to supported public API**
   (drop `@internal`, document "build your own preset-driven component"). Prerequisite for item 7. —
   *F-11* · S
7. **Migrate every closed-union variant/size/appearance input to the preset system**, one component per
   changeset, standardising the `kj` prefix in the same pass. Add a CI rule: a `data-variant` /
   `data-size` host binding requires the composed preset directive. Do the cheap half first: document
   the core-open / components-closed rule in `rules/architecture.md`, add the missing `@doc-css-var`
   block to `table.ts`, and move `badge` / `toast` onto `bindPresets`. — *F-2, F-12* · L
8. **Settle the host contract and write the missing "Overriding a single instance" doc page** — the
   three levers, their merge order, and the `display:contents` split. Add `kjClass` forwarding to the
   wrappers if the `display:contents` hosts stay. — *F-5* · M
9. **Route all component labels through `KjTranslateService`**, add the missing `EN_CATALOG` keys,
   delete the duplicate label fields from the pagination / breadcrumb / spinner configs, and CI-grep
   for literal `aria-label="…"`. — *F-7* · L
10. **Convert `KjAlert` to the composed preset directives** and delete its duplicated resolution and
    warn effect. — *F-6* · S
11. **Delete the shadow inputs on the alert / spinner / tabs wrappers** once the docs extractor follows
    `hostDirectives`; fix the spinner's hidden-label source immediately regardless. — *F-14* · S
12. **Make `KjDirectionality` element-aware** so an RTL subtree is expressible. — *F-15* · M

## Open questions

- Is MFE (two remotes, one page, one Angular root) a supported target, or is the target "one app per
  page, possibly with lazy routes"? The severity of F-1, F-8 and F-9 differs by a grade between those
  two answers, and nothing in `CLAUDE.md` or `rules/` states which it is.
- Are the closed unions (`KjBadgeVariant`, card/checkbox/toggle/table) a deliberate "this component's
  design does not admit new variants" call, or just components that predate `bindPresets`? If
  deliberate, the docs should say "not extensible by design" rather than leaving the consumer to
  discover it from `strictTemplates`.
- `rules/code_style.md:72-76` forbids `ViewEncapsulation.None`, yet every component in
  `packages/components` uses it. Is that rule scoped to `apps/docs` only? If so it should say so; if
  not, the F-5 host-contract decision changes shape.
- Does the docs extractor's inability to read `hostDirectives` inputs have a tracked issue? Three
  components carry shadow-input workarounds for it (F-14), and the same limitation is what drove
  `tabs.ts:118` to strip the `kj` prefix (F-12).
- Should `KjTranslationKey` stay a closed union derived from `EN_CATALOG`? It is the right call for
  the library's own strings, but it means a consumer cannot add their own keys to the same service —
  is a second, consumer-owned catalog namespace wanted, or is that explicitly out of scope?
