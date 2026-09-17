# Micro-Frontend Readiness Review

## Verdict

**Micro-frontends are not a declared, supported target anywhere in this repo.** I grepped every `*.md`, `*.json` and `*.ts` outside `node_modules`/`reports` for `micro-frontend`, `module federation`, `native federation`, `mfe`, `web component`, `custom element`, `createCustomElement` — the only hits are the word "component" inside prose. `rules/stack.md` names Angular 21+, Turborepo and pnpm; `rules/architecture.md` describes one app per page (`@kouji-ui/core` directives + `@kouji-ui/components` wrappers); `apps/docs/src/app/app.config.ts` is a single `bootstrapApplication`. There is no federation config, no `sharedMappings`, no `APP_ID` usage (`grep -rn APP_ID packages/ apps/` returns nothing), and no version-scoping hook in the CSS. So everything below is framed as **what must change to support two or more independently-deployed Angular apps on one page**, not as defects against a stated contract.

The good news: the library is not architecturally hostile to it. There is zero `window`/`globalThis` namespace pollution, zero `customElements.define`, no CDK coupling in code, consistent `kj-` class prefixing, `[data-theme]`-scoped theme values, and it is zone-agnostic (no `NgZone` anywhere). The bad news is concentrated in three places: **~43 module-scope id counters plus a per-root `KjId`, none of which carries an app-scoped namespace**; **document-level coordination (`<html>` scroll lock, Escape/pointerdown capture listeners, the overlay container) that has no cross-instance protocol**; and **unversioned global class names plus a bare-`:root` token layer, so two *different versions* of the library in one document overwrite each other**.

Two framings from the first pass did not survive verification and are corrected in place. The cascade problem is **not** about `@layer` — the layers are neutral, removing them changes nothing, and versioning the layer names would make the winner *less* predictable; the colliding identifiers are the class names (F-5, refuted and re-filed at low). And the overlay layer already has the DI mount seam the first pass said was missing — `KJ_OVERLAY_MOUNT_STRATEGY` + the public, tested `inContainer()` — so the real gap is only that shipped components pin `bodyPortal()` in component-level providers (F-4, now low). Thirteen stylesheets shipping with no `@layer` at all (F-6) is a live single-app customization hazard and stands.

**Grade: C−** — readiness is low, but lower-stakes than the first pass concluded: nothing here breaks a single-app consumer, most of the remediation is a documented topology contract plus a DI-seeded id scheme, and the two items originally sized as architectural rewrites (the cascade, the overlay container) turn out to be a docs line and a provider indirection.

## What works

- **No global namespace pollution.** `grep -rn "customElements|window\.__|globalThis\.__|\(window as any\)|createCustomElement" packages/*/src` returns nothing. Nothing registers itself on `window` or the custom-element registry, so two copies cannot throw `NotSupportedError` or clobber each other's globals.
- **Consistent `kj-` class prefixing.** Every class token across all 93 stylesheets is `.kj-*`; the only non-`kj-` selectors are `:root` (3 files), `[data-theme]` (`packages/themes/src/base.css:21`) and `.monaco-editor` overrides. No unprefixed class offenders found.
- **Theme *values* are subtree-scopable.** Every theme file scopes to `[data-theme="X"]` (`packages/themes/src/themes/corporate.css:10`, `bauhaus.css:10`, …), so two MFEs *can* run different themes side by side by stamping `data-theme` on their own roots — provided they resolve the same token names.
- **`@layer` is used by 80 of 93 stylesheets**, with the order declared once at `packages/themes/src/base.css:7` (`@layer kj.reset, kj.base, kj.shared, kj.component;`). The mechanism to make load order deterministic already exists; it just isn't complete or namespaced.
- **Zone-agnostic.** No `NgZone`, `provideZoneChangeDetection` or `provideZonelessChangeDetection` appears in `packages/*/src` — all reactivity is signals + `afterNextRender`. The library imposes no zone choice on a host, so a zoneless shell and a zone-based remote can both consume it.
- **Every DOM touch is SSR-guarded** (`isPlatformBrowser` / `typeof document === 'undefined'`), and the heavy deps are behind DI + dynamic import (`packages/core/src/chart/chart.ts:135` `await import('echarts')`, `packages/core/src/editor/editor.loader.ts:63` `await import('@monaco-editor/loader')`), both overridable via `provideECharts` / `provideMonaco`.
- **The recent overlay work is genuinely better for this target.** `packages/core/src/primitives/overlay/stack.ts:59-79` moves stacking onto per-wrapper `--kj-overlay-z` + inline `z-index` instead of hard-coded component `z-index`, and `packages/core/src/primitives/list/scope.ts:35-43` (`ownListItems`) fixes cross-composite content-query bleed. Both reduce the surface a second instance can disturb.

## Findings

### F-1 No app-scoped namespace for generated ids — collides only when two Angular roots share a document

**Severity:** medium *(corrected during verification: filed as high)* · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/id.ts:10-16`, `packages/core/src/primitives/overlay/panel.ts:65`, `packages/core/src/primitives/overlay/trigger.ts:47`, `packages/core/src/field/field.ts:10, 84, 87`, `packages/core/src/field/field-error.ts:4, 54`, `packages/core/src/field/field-help.ts:4, 39`, `packages/core/src/primitives/list/item.ts:17, 108`, `packages/core/src/combobox/combobox-root.ts:32` (+ ~38 more module-scope counters)

**Evidence**

```ts
// packages/core/src/primitives/overlay/id.ts:10-16
@Injectable({ providedIn: 'root' })
export class KjId {
  private _counter = 0;
  mint(prefix = ''): string {
    const id = ++this._counter;
    return prefix ? `kj-${prefix}-${id}` : `kj-${id}`;
  }
}
```

```ts
// packages/core/src/field/field.ts:10, 84
let kjFieldIdCounter = 0;
readonly controlId = computed(() => this.kjFieldId() ?? `kj-field-${this.uid}`);
```

~43 module-scope counters across `packages/core` and `packages/components`, plus `KjId` (`providedIn: 'root'`), each start at `0` per bundle copy / per root injector. There is no `APP_ID` seed and no prefix token anywhere in the repo.

**Why it matters, split by deployment shape** — IDREF resolution (`document.getElementById`) is document-wide, so the two mechanisms fail under opposite conditions and must not be conflated:

- **Shared-singleton federation** (the common shape). The module counters are shared and therefore safe; only `KjId` collides, because it is per root injector. Its sole DOM-visible output is `kj-panel-N` (`panel.ts:65`, bound `[id]`), consumed by `overlay/trigger.ts:47` as `aria-controls` — an advisory IDREF with weak AT support. Low real-world harm. The other two `mint()` call sites are bookkeeping keys, not DOM ids: `controller.ts:40` (`controller.id`) and `command-palette.ts:258` feed `KjOverlayStack` (`stack.ts:136, 150, 158`) and never reach the DOM.
- **Duplicate-bundle / multi-Angular-root pages.** The module counters collide too, and this is where the genuine exposure lives: `field-label.ts:22` binds a real `for=`, and the field-error / field-help ids feed `aria-describedby`, so app B's `<label for="kj-field-3">` can label app A's input and app B's description can resolve to app A's error text — silent WCAG 1.3.1 / 4.1.2 failures that no smoke test catches.

**Mitigations that already exist** (the finding as filed said there were none): per-element id overrides at `kjFieldId` / `kjFieldLabelId` (`field.ts:84, 87`), `kjFieldErrorId` (`field-error.ts:54`), `kjFieldHelpId` (`field-help.ts:39`), and `KjListItem` honours a pre-existing host `id` (`item.ts:108`). `KjId` itself is a plain class with one public method, so an app-level `{ provide: KjId, useValue: <prefixed subclass> }` replaces it wholesale — exactly as its TSDoc at `id.ts:7-8` says. No seed parameter is needed to swap a one-method class. The real gap is the inverse: the ~40 module-scope counters have **no** override mechanism at all.

**Scope** Zero impact on every single-app consumer, which is the only usage the repo documents. Nothing in the repo claims micro-frontend support, and `docs/component-analyses/actions/context-menu.md:611-613` already records multi-Angular-app pages as a known, accepted-for-v1 risk. Frame this as MFE-readiness hardening, not a live defect.

**Fix** Inject `APP_ID` into `KjId` and route the module-scope counters through it — the pattern Angular CDK adopted as `_IdGenerator` in v19. Add a lint rule banning `let <name>Id/Uid/Counter = 0` at module scope in `packages/*/src`, and a spec that bootstraps two TestBed roots and asserts no minted id repeats.

**Effort:** M

---

### F-2 Scroll-lock refcount is module-scoped, so duplicated bundles can strand `<html>` overflow

**Severity:** medium *(corrected during verification: filed as high)* · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/strategies/scroll-lock/html-overflow.ts:3-5, 13-19`, `packages/core/src/primitives/overlay/strategies/scroll-lock/css-clip.ts:3-4, 14-17, 23-26`, `packages/core/src/primitives/overlay/container.ts:24`

**Evidence**

```ts
// packages/core/src/primitives/overlay/strategies/scroll-lock/html-overflow.ts:3-5
let _count = 0;
let _savedOverflow: string | null = null;
let _savedPaddingRight: string | null = null;
```

```ts
// packages/core/src/primitives/overlay/strategies/scroll-lock/css-clip.ts:3-4, 15
let _count = 0;
let _saved: string | null = null;
  _saved = document.documentElement.style.overflow;
```

Both strategies keep their refcount and saved value in **module scope** while mutating the **page-scoped** `document.documentElement.style`. When two independently bundled copies of `@kouji-ui/core` share a page and their locks overlap, the second copy captures the *first copy's applied value* as its "original" (`html-overflow.ts:13-14`, `css-clip.ts:15`).

**The precondition the finding omitted: non-LIFO release.** LIFO self-heals — A opens saving `''`, B opens saving `'hidden'`, B closes restoring `'hidden'` (still correct while A is open), A closes restoring `''`. Only A-closing-before-B strands the page: the last release writes back `'hidden'` / `'clip'`, leaving the page unscrollable with no overlay open until a reload or until app code resets `overflow`.

> **Correction:** the double-padding claim is false and is dropped. Copy B computes `scrollbarWidth = window.innerWidth - html.clientWidth` **after** copy A has already set `overflow: hidden`, which removes the document scrollbar, so `clientWidth === innerWidth`, `scrollbarWidth === 0`, and the `if (scrollbarWidth > 0)` guard at `html-overflow.ts:16` short-circuits — the `getComputedStyle(html).paddingRight` read at `:17` is never reached by the second copy.

**Not scroll-lock-specific.** `packages/core/src/primitives/overlay/container.ts:24` (`let _root: HTMLElement | null = null;`) is the same module-singleton-vs-page-resource pattern and is documented as deliberate. This is a systemic "one copy of `@kouji-ui/core` per page" assumption rather than an isolated defect — which, together with the duplicated-bundle + concurrent-overlays + non-LIFO-close trigger chain and zero impact on single-bundle consumers, is why high overstates it.

**Fix** Key the refcount and saved values off a cross-realm global (e.g. a `Symbol.for('kj-scroll-lock')` record on `globalThis`) so every copy shares one counter, or have each release read the live computed value instead of a module-cached snapshot — and state the single-copy assumption explicitly if MFE duplication is out of scope. Neither `css-clip.spec.ts` nor `html-overflow.spec.ts` covers nesting or a second strategy instance.

**Effort:** M

---

### F-3 `KjOverlayStack` does not coordinate across multiple Angular root injectors (documented-limitation gap)

**Severity:** low *(corrected during verification: filed as high)* · **Confidence:** high *(on the mechanism; the user-visible consequence needs two apps with overlays open at the same instant)*
**Files:** `packages/core/src/primitives/overlay/stack.ts:81-107, 183-188, 202-207`, `docs/component-analyses/actions/context-menu.md:612-615`

**Evidence**

```ts
// packages/core/src/primitives/overlay/stack.ts:107
@Injectable({ providedIn: 'root' })
export class KjOverlayStack {
```

```ts
// packages/core/src/primitives/overlay/stack.ts:183-188
  private ensureListeners(): void {
    if (this._listenersInstalled) return;
    document.addEventListener('keydown', this._onKeydown, true);
    document.addEventListener('pointerdown', this._onPointerDown, true);
```

```ts
// packages/core/src/primitives/overlay/stack.ts:202-207
  private handleKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;
    const top = this.topmost();
    if (!top || !top.opts.closeOnEsc) return;
    top.opts.onClose();
  }
```

`providedIn: 'root'` instantiates per **root injector**, so a page hosting several *independently bootstrapped* Angular apps gets one stack and one pair of `document` capture listeners per app. `KjOverlayController.beginOpen()` registers unconditionally, so a single Escape can dismiss the topmost overlay in each app, and each stack independently starts its z-index at `KJ_OVERLAY_Z_BASE` (1000), so cross-app overlay layering is also undefined.

**Scope it correctly.** This does **not** affect the common Module Federation shape — one shell app lazy-loading federated routes or components into the shell's injector — which has a single root injector and behaves exactly as designed, even with `@kouji-ui/core` shared as a singleton. It affects only multi-`bootstrapApplication` / custom-element hosts.

**Why it is low, not high**

- **Not a claimed capability.** A full grep of the repo turns up exactly one mention of micro-frontends anywhere (`docs/component-analyses/actions/context-menu.md:612-615`); there is no MFE entry point, no MFE doc, no MFE spec, and `rules/stack.md` / `rules/architecture.md` say nothing about cross-root coordination.
- **Already triaged in-repo.** That same file raises this exact issue for the sibling `KjContextMenuRegistry`: *"Provided in 'root' so all triggers across the app coordinate. Risk: micro-frontend or multi-Angular-app pages might have two registries and lose the 'one open at a time' guarantee. Acceptable for v1; document."* This is a knowingly accepted design tradeoff. The only genuine gap is that the `KjOverlayStack` docstring does not carry the same caveat.
- **Consequence is cosmetic and recoverable** — over-dismissal of a second app's overlay. No data loss, no a11y regression, no stuck state, no security impact. Two independently bootstrapped apps would exhibit the same over-dismissal with *any* dialog implementation, since neither can see the other's overlays without a `window`-keyed global.

**Fix** The actionable item is documentation, not code: add a caveat to the `KjOverlayStack` class docstring (`stack.ts:81-106`) stating that stack coordination and z-index allocation are scoped to one Angular root injector, and that multi-root pages should either share one injector or set distinct `KJ_OVERLAY_Z_BASE` values per app. If cross-root coordination is ever actually wanted, treat it as an enhancement (a `window`-keyed shared registry behind an opt-in token) and weigh it against version skew between two library copies and broken test isolation.

**Separate low/nit item, unrelated to MFE:** `handleKeydown` ignores `e.defaultPrevented`, so a consumer handler that calls `preventDefault()` on Escape is still overridden. That is a single-app issue.

**Effort:** S (docs) / M (if a shared registry is ever built)

---

### F-4 Built-in overlay components pin `bodyPortal()`, so a shadow-DOM MFE cannot host them in its own subtree

**Severity:** low *(corrected during verification: filed as high; two of its three sub-claims did not survive)* · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/container.ts:24-33`, `packages/core/src/primitives/overlay/tokens.ts` (`KJ_OVERLAY_MOUNT_STRATEGY`), `packages/core/src/primitives/overlay/strategies/mount/in-container.ts`, `packages/core/src/popover/popover-content.ts:20`, `packages/core/src/select/select-content.ts:36`, `packages/core/src/tooltip/tooltip-content.ts:21`, `packages/core/src/dialog/dialog.service.ts:28`

**What is actually missing**

The overlay layer **already has the DI seam** this finding originally said was absent: `KJ_OVERLAY_MOUNT_STRATEGY` with `KjMountStrategy.resolveContainer()`, plus a purpose-built, tested, publicly exported strategy `inContainer(target: HTMLElement | (() => HTMLElement))` (`strategies/mount/in-container.ts`, covered by `in-container.spec.ts`, exported through `strategies/index.ts` → `primitives/overlay/index.ts` → `packages/core/src/public-api.ts`). `KjOverlayBuilder.create(config)` takes `config.mount`, and `KjOverlayPanel` (`panel.ts:91`) injects the token — so a consumer building overlays on the primitives **can already mount into an arbitrary element or shadow root today**.

The real, much narrower gap is that every *shipped component* pins `bodyPortal()` in its own **component-level** `providers`:

```ts
// packages/core/src/select/select-content.ts:36 (same shape in popover-content.ts:20,
// tooltip-content.ts:21, dropdown-menu-content.ts, dialog/drawer/sheet/toast services)
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
```

A component-level provider cannot be overridden from an ancestor injector, so a host cannot redirect the built-in overlays without wrapping them. A shadow-DOM-isolated MFE therefore cannot host `<kj-select>`, `<kj-popover>`, a dialog or a toast inside its own subtree — it would have to rebuild them on `KjOverlayBuilder` / `KjOverlayPanel`.

**Fix** Let each component resolve its mount strategy from an app-level token (e.g. a `KJ_OVERLAY_DEFAULT_MOUNT`, or a `KJ_OVERLAY_CONTAINER` factory consulted by `bodyPortal()` / `getOverlayContainer()`) instead of hardcoding it.

> **Corrections — the z-index half of this finding does not hold and is restated as a documentation note.**
>
> - Containers are created **lazily** on the first `getOverlayContainer()` call (first overlay opened), not at bootstrap, so "whichever app bootstrapped second always paints above the first" does not follow. Two duplicated (non-shared) copies each append their own `.kj-overlay-container` on first overlay open, and DOM insertion order then decides which app's overlays paint above.
> - Each `.kj-overlay-container` is its own stacking context (`position: fixed` + `z-index`), so the inner 1000/1001 levels are irrelevant across apps — `--kj-overlay-z-base` / `KJ_OVERLAY_Z_BASE` were never the knob for this. The relevant knob is `--kj-overlay-z-index` on the container, which is already in the line the finding quoted: `overlay.css:21` is `z-index: var(--kj-overlay-z-index, var(--kj-overlay-z-base, 1000))`. It is settable per copy via the exported `getOverlayContainer()`, and it is documented (`packages/core/CHANGELOG.md:68-69`) and tested (`stack.spec.ts:113, 123`), contradicting "nothing tells a host to use it".
> - The premise needs two module copies at all. Sharing `@kouji-ui/core` as a federation singleton removes the duplicate entirely — which is precisely what the module-level singleton buys. Converting the container to a DI-provided service would give one container **per Angular root injector**, i.e. two containers even when the library is shared: strictly worse for the collision this complained about.

**Effort:** M

---

### F-5 kouji-ui has no supported story for two *different versions* of the library in one document

**Severity:** low *(corrected during verification: filed as high as "the `@layer kj.*` cascade is global and unversioned"; the layer framing was **REFUTED** — the original text and the refuting reasoning are preserved under "Refuted during verification" at the end of this report)* · **Confidence:** high

**The accurate version.** Component rules key off **unversioned class names** (`.kj-button` and 61 other stylesheets under `@layer kj.component`), and `packages/themes/src/base.css:29` / `density.css:41` write the primitive palette and density scalars onto bare `:root`. If a host page loads two different versions of the library, whichever sheet is registered later wins for same-name declarations document-wide.

**This is a property of the class names, not of the cascade layers.** Strip every `@layer` line from the repo and the two-version collision is byte-identical — as it is for every CSS library that ships stable class names (Bootstrap, Material, Tailwind). Versioning the *layer* names would not fix it and would make the winner **less** predictable: with `@layer kj-v1.component, kj-v2.component` the winner is fixed document-wide by whichever `@layer` statement registered first. The only real fixes are versioned **class names** or shadow DOM.

**Caveats that bound it further**

- Two copies of the **same** version are harmless — the emitted rules and `:root` values are identical, so there is no observable effect. The consequence needs *version skew*, not merely two copies.
- **Renaming** a token between versions is harmless: differently-named custom properties coexist on `:root`, so v1's `base.css` keeps declaring v1's names and v2's declares v2's. Only a same-name / different-value redeclaration collides.
- Per-theme values are already safely scoped to `[data-theme="X"]` under `kj.shared` (verified: `grep '^\s*:root' packages/themes/src` matches only `base.css:29` and `density.css:41`), so only the slow-moving primitive / spacing layer is exposed — the least-churning surface in the repo.

**Not the first thing that breaks.** Two copies means two Angular injectors duplicating `providedIn: 'root'` singletons — `KjOverlayStack` (`packages/core/src/primitives/overlay/stack.ts:38, 107`), `KjOverlayBuilder` (`builder.ts:82`), `KjDialogService`, `KjDrawerService`, `KjContextMenuRegistry`, `KjLocale`, `KjTranslate`. Overlay stacking, z-index ordering and focus-trap ownership break well before a padding delta is noticed. The 184 `ViewEncapsulation.None` sites confirm global styling is the deliberate, documented architecture, not an oversight in the layer statement.

**Suggested action** Extend the existing accepted-v1 note at `docs/component-analyses/actions/context-menu.md:611-614` into a short "single copy per document" line in the install docs. Do **not** file this as a cascade bug.

**Effort:** S

---

### F-6 Thirteen stylesheets ship with no `@layer`, so they beat every layered rule on the page

**Severity:** medium · **Confidence:** high
**Files:** `packages/components/src/table/table.css:1`, `packages/components/src/calendar/calendar.css:1`, `packages/components/src/command-palette/command-palette.css:1`, `packages/components/src/date-picker/date-picker.css`, `packages/components/src/date-range-presets/date-range-presets.css`, `packages/components/src/datetime-picker/datetime-picker.css`, `packages/components/src/editor/editor.css`, `packages/components/src/input-mask/input-mask.css`, `packages/components/src/table/table-filters/filters.css`, `packages/core/src/icon/icon.css:1`

**Evidence**

```css
/* packages/components/src/table/table.css:1-2 — no @layer wrapper */
/* Density + variant tokens. All spacing via --kj-base-space-*.
 *
```

```css
/* packages/components/src/calendar/calendar.css:1 */
.kj-calendar {
```

Of the 93 stylesheets, 13 contain no `@layer`; four of those are pure `@import` aggregators (`packages/core/src/styles.css`, `packages/components/src/overlay/overlay.css`, `packages/themes/src/index.css`, and they inherit their imports' layers) — the remaining **nine ship real unlayered rules**.

**Why it matters**
Unlayered CSS beats *all* layered CSS regardless of specificity. So `.kj-table` from the table stylesheet outranks anything in `kj.component`, including a consumer's own `@layer` override and the other copy's layered rules. In an MFE that inverts the intended precedence unpredictably: the copy whose *unlayered* sheet loads later wins over both copies' layered sheets. It also means the cascade-namespacing fix in F-5 would leave these nine files unprotected.

Within a single app this is already a customization hazard — a consumer who follows the `@layer` convention cannot override the table or the calendar.

**Fix**
Wrap all nine in `@layer kj.component { … }`. Mechanical, one commit, no behaviour change for consumers who do not use layers. Add a lint rule or a CI grep (`for f in packages/**/*.css; do grep -q '@layer' "$f" || fail; done`) so the invariant holds.

**Effort:** S

---

### F-7 100 module-scope `InjectionToken`s: two copies mean every `provideKj*` silently misses

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/icon/icon.tokens.ts:12,26,57,71`, `packages/core/src/toast/toast.strategy.ts:70`, `packages/core/src/primitives/overlay/stack.ts:37`, `packages/core/src/table/table-storage.ts:69`, `packages/core/src/chart/echarts.ts:45`, `packages/core/src/chat/chat-registry.ts:46`, `packages/core/src/field/field.context.ts`, `packages/core/src/primitives/list/tokens.ts` (+ 92 more)

**Evidence**

```ts
// packages/core/src/icon/icon.tokens.ts:26-29
export const KJ_ICON_REGISTRY = new InjectionToken<
  WritableSignal<Record<string, string>>
>('KJ_ICON_REGISTRY', {
  providedIn: 'root',
```

```ts
// packages/core/src/primitives/overlay/stack.ts:37-40
export const KJ_OVERLAY_Z_BASE = new InjectionToken<number>('KJ_OVERLAY_Z_BASE', {
  providedIn: 'root',
  factory: () => KJ_OVERLAY_Z_BASE_DEFAULT,
});
```

`grep -rn "new InjectionToken" packages/core/src packages/components/src --include=*.ts | grep -v spec | wc -l` → **100**.

**Why it matters**
`InjectionToken` identity is object identity. Two ES-module copies produce 100 pairs of distinct tokens with identical debug names — and Angular's error messages print the *name*, so a DI miss reads as "NullInjectorError: No provider for KJ_ICON_REGISTRY" against a token that visibly *is* provided. Blast radius, in descending order:

- **Configuration tokens** (`KJ_ICON_REGISTRY`, `KJ_ICON_LOADER`, `KJ_TOAST_STRATEGY`, `KJ_OVERLAY_Z_BASE`, `KJ_TABLE_STORAGE`, `KJ_ECHARTS`, `KJ_MONACO_CONFIG`, `KJ_MONACO_LANGUAGE_LOADERS`, `KJ_CHAT_CONFIG`, `KJ_INPUT_MASK_*`): the shell calls `provideLucideIcons()` / `provideECharts()` once at bootstrap and the remote's components see the **default** factory instead. Icons render as bare names (`icon.tokens.ts:59` — the default resolver returns the name unchanged), charts fall back to the full 1 MB `import('echarts')`, toasts use different stacking. Degraded, not fatal.
- **Context tokens** (`KJ_FIELD`, `KJ_TABS`, `KJ_ACCORDION`, `KJ_LIST_NAVIGATOR_CONFIG`, `KJ_SELECT`, …, per `rules/architecture.md`'s signal-context pattern): these are how parent and child directives talk. If a host ever projects a remote's `<ng-content>` child into a shell's `[kjField]` parent — the whole point of composition across a boundary — the child's `inject(KJ_FIELD)` returns `null` because it is looking for the *other copy's* token. Composition across the boundary is impossible without a shared singleton.

**Fix**
There is no code fix that makes two copies share token identity. The remediation is documentation + configuration:
1. Publish an MFE guide stating `@kouji-ui/core` and `@kouji-ui/components` **must** be `shared: { singleton: true, strictVersion: false }` in every federation config, with a `requiredVersion` range.
2. Make the failure loud: where a context token is genuinely required, `inject(KJ_FIELD)` currently returns `null` silently in several places — add a dev-mode `console.warn` naming the likely cause ("no `[kjField]` ancestor, or two copies of @kouji-ui/core are loaded").
3. Consider exporting a `KJ_CORE_VERSION` const and a tiny `assertSingleKoujiCore()` dev-mode check that writes a marker to `document.documentElement.dataset` and warns on a second, differing write. Ten lines, and it turns a whole class of invisible DI misses into one console message.

**Effort:** M

---

### F-8 Unscoped document hotkey listeners: two MFEs both answer one ⌘K

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/strategies/trigger-event/on-hotkey.ts:40-47`, `packages/components/src/command-palette/command-palette.ts:289-300`

**Evidence**

```ts
// packages/core/src/primitives/overlay/strategies/trigger-event/on-hotkey.ts:40-47
  const install = () => {
    if (installed || typeof document === 'undefined') return;
    listener = (e: KeyboardEvent) => {
      if (matches(e, parsed)) { e.preventDefault(); toggle?.(); }
    };
    document.addEventListener('keydown', listener);
    installed = true;
  };
```

```ts
// packages/components/src/command-palette/command-palette.ts:291-300
      const handler = (e: KeyboardEvent) => {
        const chord = this.kjHotkey();
        if (chord && this.matchesHotkey(e, chord)) {
          e.preventDefault();
          this.kjOpen.update(v => !v);
        }
      };
      document.addEventListener('keydown', handler);
```

**Why it matters**
Both handlers bind on `document`, both call `preventDefault()`, neither calls `stopPropagation()` and neither checks `e.defaultPrevented`. With a shell command palette and a remote command palette — a completely ordinary MFE shape, since `mod+k` is the de-facto default — one keypress toggles **both**, opening two modal palettes stacked on each other with two focus traps competing. The same applies to any two `onHotkey()`-driven overlays that happen to pick the same chord.

**Fix**
Guard both handlers with `if (e.defaultPrevented) return;` as the first line and keep the existing `preventDefault()`. That gives first-listener-wins semantics for free and costs one line in each place. Document that MFE consumers should pass distinct `kjHotkey` chords. Add a spec dispatching one `mod+k` against two palettes and asserting one opens.

**Effort:** S

---

### F-9 Command palette focuses by global `document.querySelector` on an unscoped class

**Severity:** medium · **Confidence:** high
**Files:** `packages/components/src/command-palette/command-palette.ts:303-309`

**Evidence**

```ts
// packages/components/src/command-palette/command-palette.ts:303-309
    effect(() => {
      if (!this.kjOpen()) return;
      if (!isPlatformBrowser(this.platformId)) return;
      queueMicrotask(() => {
        document.querySelector<HTMLInputElement>('.kj-command-palette__dialog .kj-command-palette__input')?.focus();
      });
    });
```

**Why it matters**
This is the only global DOM query in either package (`document.getElementById` in `packages/core/src/skip-link/skip-link.ts:78` is correct — it resolves a caller-supplied id by design). `querySelector` returns the **first match in document order**, not this instance's input. Two palettes on the page — two MFEs, or even one app that renders a second palette — and opening the second one moves focus into the *first* one's search box, which is `hidden` when closed. Focus then lands on a hidden element or is dropped to `<body>`, so the opened palette cannot be typed into (WCAG 2.4.3 Focus Order, 2.1.1 Keyboard).

This is a defect in a single app too, not only under MFE; it just becomes near-certain with two independently-deployed apps.

**Fix**
Replace with a `viewChild<ElementRef<HTMLInputElement>>('paletteInput')` on the template's `.kj-command-palette__input` and focus `viewChild()?.nativeElement`. Same microtask timing, instance-scoped. Add a spec rendering two palettes and asserting the second one's own input receives focus.

**Effort:** S

---

### F-10 `body[data-kj-scroll-lock]` is styled but never written, and its comment names a class that does not exist

**Severity:** low · **Confidence:** high
**Files:** `packages/components/src/popover/popover.css:57-61`

**Evidence**

```css
/* packages/components/src/popover/popover.css:57-61 */
  /* Modal-mode body scroll lock. Multiple stacked modals coordinate via
     a counter in KjOverlayService; this just hides body overflow when the
     attribute is present. */
  body[data-kj-scroll-lock="true"] {
    overflow: hidden;
  }
```

`grep -rn "data-kj-scroll-lock" packages/ apps/` finds **only this rule** — nothing in any `.ts` file ever sets the attribute. `grep -rn "KjOverlayService" packages/ --include=*.ts` finds **one hit, in a spec comment** (`packages/core/src/menubar/menubar.spec.ts:10`); the class does not exist. The actual scroll lock writes `document.documentElement.style.overflow` inline (F-2), never a body attribute.

**Why it matters**
Small, but directly in the path of the MFE fix. A dead selector plus a comment describing a refcounting service that was deleted is exactly the kind of thing someone building cross-copy scroll-lock coordination will find, believe, and build on. It also ships in the published `@kouji-ui/components/src/overlay/overlay.css` bundle (`packages/components/src/overlay/overlay.css:37`), so consumers see a documented-looking hook that does nothing.

**Fix**
Either delete the rule and the comment, **or** — better, and this is what F-2 wants anyway — make it the real mechanism: have the scroll-lock strategies set `document.documentElement.dataset.kjScrollLock` with a page-wide refcount and move this rule to `html[data-kj-scroll-lock]` in `packages/core/src/primitives/overlay/overlay.css` where the other container chrome lives.

**Effort:** S

---

### F-11 Live-region singletons are per-copy, and are not discovered from the DOM

**Severity:** low · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/strategies/live-announcer/_announce.ts:15-28`

**Evidence**

```ts
// packages/core/src/primitives/overlay/strategies/live-announcer/_announce.ts:15-28
const regions: Partial<Record<KjLivePoliteness, HTMLElement>> = {};

const ensureRegion = (politeness: KjLivePoliteness): HTMLElement => {
  let region = regions[politeness];
  if (region) return region;
  region = document.createElement('div');
  region.setAttribute('data-kj-live-region', politeness);
  ...
  document.body.appendChild(region);
  regions[politeness] = region;
```

**Why it matters**
The element already carries a discoverable marker (`data-kj-live-region`), but `ensureRegion` only consults its own module-level `regions` map. Two copies ⇒ four `<div data-kj-live-region>` elements in `<body>`. Not a correctness failure — each app announces into its own region and screen readers handle multiple live regions — but it multiplies with every copy, and the node is never removed (no teardown at all), so it also leaks across app unmount/remount cycles, which is the normal lifecycle for a federated remote.

**Fix**
Look the region up in the DOM before creating one: `document.querySelector(\`[data-kj-live-region="${politeness}"]\`) ?? create()`. Three lines, makes the region genuinely page-wide, and works across copies without any shared module state. (Keep the module map as a fast path.)

**Effort:** S

---

### F-12 `lucide-static` is a required, statically-imported peer — ~300 KB duplicated per copy

**Severity:** medium · **Confidence:** high
**Files:** `packages/components/src/icon/lucide/provide-lucide-icons.ts:8,47-59`, `packages/components/package.json:35` (peer, not in `peerDependenciesMeta`)

**Evidence**

```ts
// packages/components/src/icon/lucide/provide-lucide-icons.ts:8
import * as lucideIcons from 'lucide-static';
```

```ts
// packages/components/src/icon/lucide/provide-lucide-icons.ts:47-50
/** Lazily build the kebab-name → encoded-data-url map once per app. */
let _registryEntries: Record<string, string> | null = null;
function buildLucideRegistry(): Record<string, string> {
  if (_registryEntries) return _registryEntries;
```

The TSDoc at `provide-lucide-icons.ts:68-72` states the cost and the reason plainly: "~300 KB gzipped for the whole set… Vite/esbuild can't reliably code-split per-icon dynamic imports against `lucide-static`'s package layout, so a single static namespace import is the predictable choice."

**Why it matters**
For one app this is a deliberate, documented trade. For N independently-deployed apps it multiplies: the static namespace import cannot be split out of the entry chunk, so every remote that calls `provideLucideIcons()` ships its own 300 KB — and `_registryEntries` memoises **per copy**, so the encode work runs N times too. Unlike echarts, lexical and monaco (all `optional: true` peers behind dynamic `import()` — `packages/core/package.json:88-120`), `lucide-static` is a **required, non-optional** peer of `@kouji-ui/components`, so a host cannot decline it.

Contrast with the deps that *are* MFE-friendly: `echarts` (`packages/core/src/chart/chart.ts:135`), `monaco-editor` (`editor.loader.ts:63`), `lexical` — all lazy, all overridable by DI (`provideECharts`, `provideMonaco`), all optional peers. Those dedupe fine under federation sharing. `@tanstack/angular-table` and `@tanstack/virtual-core` are hard `dependencies` (`packages/core/package.json:123-125`, `packages/components/package.json:47-50`) rather than peers, so each copy bundles its own — acceptable, they are small and stateless.

**Fix**
1. Move `lucide-static` into `peerDependenciesMeta` as `optional: true` — the provider is opt-in already, so nothing else needs it.
2. Offer `provideLucideIconsLazy()` that returns an async `KJ_ICON_LOADER` resolving names on demand (the token already exists: `packages/core/src/icon/icon.tokens.ts:71`), so remotes can opt out of the 300 KB entirely.
3. In the MFE guide, recommend the **shell** calls `provideLucideIcons()` and remotes rely on the shared `KJ_ICON_REGISTRY` — which only works if F-7's singleton requirement is met.

**Effort:** M

---

### F-13 Monaco's global AMD loader is memoised per copy

**Severity:** medium · **Confidence:** medium
**Files:** `packages/core/src/editor/editor.loader.ts:24-37,59-69`

**Evidence**

```ts
// packages/core/src/editor/editor.loader.ts:24-37
@Injectable({ providedIn: 'root' })
export class KjEditorLoader {
  ...
  private promise: Promise<KjMonaco> | null = null;
  load(): Promise<KjMonaco> {
    if (!this.promise) {
      this.promise = this.config.loader ? this.config.loader() : this.loadFromCdn();
    }
    return this.promise;
  }
```

```ts
// packages/core/src/editor/editor.loader.ts:59-69
  private async loadFromCdn(): Promise<KjMonaco> {
    const mod = await import('@monaco-editor/loader');
    const loader = mod.default;
    if (this.config.vsPath) {
      loader.config({ paths: { vs: this.config.vsPath } });
    }
    return loader.init() as Promise<KjMonaco>;
  }
```

**Why it matters**
The docstring's promise — "every `KjEditor` on the page shares a single Monaco instance" (`editor.loader.ts:7-8`) — holds only within one root injector and one copy. `@monaco-editor/loader` works by injecting a `<script>` for `vs/loader.js` and driving the page-global AMD `require`; two copies each get their own module instance, each believes it is uninitialised, and each calls `loader.init()`. Whether that races or is idempotent depends on `@monaco-editor/loader`'s own internals, which I did not read — hence medium confidence — but two apps calling `loader.config({ paths: { vs } })` with **different `vsPath` values** is unambiguously last-write-wins on a single global, so an MFE pinning its own Monaco build can silently get the other app's.

Note this is the only place the library reaches for a third-party CDN at runtime; the rest is all bundler-resolved.

**Fix**
1. Guard on a page-wide marker rather than a module field: check `document.documentElement.dataset.kjMonaco` before `init()`, and if another copy already initialised, resolve from the global `window.monaco`.
2. Document that in an MFE the **shell** should call `provideMonaco({ loader: () => import('monaco-editor') })` with a self-hosted build, and remotes should inherit it — again contingent on F-7's singleton.

**Effort:** M

---

### F-14 `@angular/cdk` is a required peer of both packages and is never imported

**Severity:** low · **Confidence:** high
**Files:** `packages/core/package.json:32`, `packages/components/package.json:28`

**Evidence**

```json
// packages/core/package.json:30-34
  "peerDependencies": {
    "@angular/common": "^22.0.0",
    "@angular/core": "^22.0.0",
    "@angular/cdk": "^22.0.0",
    "@angular/forms": "^22.0.0",
```

`grep -rn "@angular/cdk" packages/core/src packages/components/src --include=*.ts` returns **nothing**. The only mention in the whole source tree is `packages/core/src/rich-text/DESIGN.md:11` — "**No `@angular/cdk`** (strict repo policy)" — matching `rules/stack.md`'s "Zero external UI deps / No Angular CDK". `packages/core/package.json:20` also lists `"cdk"` as a published keyword and the description reads "directives over CDK", both stale.

**Why it matters**
Federation configs mirror peer dependencies. Declaring CDK as a required peer means every host installs it, every federation config has to add it to `shared` with a version range, and two remotes on different Angular majors now have one more package that must be reconciled — for a dependency the library does not use. It also blocks a remote pinned to a CDK major that does not exist yet, purely on paper. Minor on its own, but it is free to remove and it directly contradicts the stated stack policy.

**Fix**
Drop `@angular/cdk` from both `peerDependencies`, drop the `"cdk"` keyword and fix the `description` in `packages/core/package.json`. Also tighten the `@angular/*` peer ranges into a documented compatibility matrix (`^22.0.0` today) so MFE hosts know which library version pairs with which Angular major.

**Effort:** S

---

### F-15 `<html dir>` and table storage keys have no per-app ownership

**Severity:** low · **Confidence:** high
**Files:** `packages/core/src/locale/document-direction.ts:41-57`, `packages/core/src/table/table-storage.ts:49-62,69-71`, `packages/components/src/table/table.ts:855-872`

**Evidence**

```ts
// packages/core/src/locale/document-direction.ts:49-56
      const locale = inject(KjLocale);
      effect(() => {
        const dir = locale.direction();
        const html = doc.documentElement;
        if (html.getAttribute('dir') !== dir) {
          html.setAttribute('dir', dir);
        }
      });
```

```ts
// packages/core/src/table/table-storage.ts:49-51, 59-62
/** Adapter backed by `localStorage`. No-ops in SSR. Optional `keyPrefix`. */
export function localStorageAdapter(opts: LocalStorageAdapterOptions = {}): KjStorageAdapter {
  return wrap(safeLocal, opts.keyPrefix ?? '');
}
...
function defaultAdapter(): KjStorageAdapter {
  return safeLocal() ? localStorageAdapter() : inMemoryAdapter();
}
```

```ts
// packages/components/src/table/table.ts:866-872
      const adapter = this.kjStorageAdapter() ?? this.tokenStorage;
      if (!adapter) return;
      adapter.write(key, this.t.state());
```

**Why it matters**
*Direction:* `provideKjDocumentDirection` is opt-in and the write is idempotent, and its docstring correctly calls it "the single writer of `<html dir>`" — but that is true per app. Two apps that both register it and both resolve `direction: 'auto'` from different `KjLocale` configs write opposing values into the same attribute in a loop, each effect re-firing on the other's mutation via `KjDirectionality`'s `MutationObserver` (`packages/core/src/primitives/directionality/directionality.ts:59-69`). Two apps with *the same* direction are fine, which is why this is low rather than higher.

*Storage:* the default adapter's `keyPrefix` is `''` and `table.ts:872` writes the raw `kjStorageKey()`. Two MFEs that each ship a table with `kjStorageKey="users"` read and write the same `localStorage` entry, so one app's column order / filters land in the other's table. Both apps then persist a state shape from a possibly different library version.

**Fix**
- Default the storage `keyPrefix` to `` `kj:${inject(APP_ID)}:` `` (or make `KJ_TABLE_STORAGE`'s factory inject `APP_ID`), and document `provideKjTableStorage(localStorageAdapter({ keyPrefix: 'remote-a:' }))` in the MFE guide.
- Document that exactly one app may call `provideKjDocumentDirection()`, and add a dev-mode warning when a second `<html dir>` writer is detected (same `dataset` marker trick as F-7's `assertSingleKoujiCore`).

**Effort:** S

## Recommended work items

Ordered by blast radius — how much of the page each item can corrupt, and how hard it is to retrofit later.

1. **Write and publish the MFE contract** (addresses F-7, F-5, F-12, F-13, F-14, F-15). Before any code: a `docs/` page stating the supported topology. Minimum viable contract — one shared singleton copy of `@kouji-ui/core` + `@kouji-ui/components` (`shared: { singleton: true }`), one copy of the themes/components CSS registered by the shell only, one `provideKjDocumentDirection()`, one `provideLucideIcons()`, distinct `KJ_OVERLAY_Z_BASE` per app, distinct table `keyPrefix`. This is the cheapest thing on the list and it converts most of the findings from "broken" to "documented constraint". Also add the Angular/CDK compatibility matrix (F-14) and drop the unused CDK peer.
2. **Ship the two one-line guards, then decide whether the coordination layer is wanted at all** (F-8, F-3, F-2). The `defaultPrevented` guards in `on-hotkey.ts` and `stack.handleKeydown` are single-app correctness fixes worth landing now. The page-wide `document.documentElement.dataset` refcount + arbiter behind F-2 and F-3 is only worth building if multi-root hosting is actually a goal — F-3 is already triaged in-repo as an accepted v1 limitation, so the cheap answer there is a docstring caveat on `KjOverlayStack`.
3. **Let shipped components resolve their mount strategy from an app-level token** (F-4). The primitive seam already exists (`KJ_OVERLAY_MOUNT_STRATEGY` + `inContainer()`); what is missing is that `popover-content.ts`, `select-content.ts`, `tooltip-content.ts`, `dropdown-menu-content.ts` and the dialog/drawer/sheet/toast services pin `bodyPortal()` in **component-level** providers, which an ancestor injector cannot override. Add a `KJ_OVERLAY_DEFAULT_MOUNT` (or a `KJ_OVERLAY_CONTAINER` factory consulted by `bodyPortal()`) and have each component read it.
4. **Unify id generation on a seedable `KjId`** (F-1). Add `KJ_ID_PREFIX` defaulting to `APP_ID`, then migrate the 38 non-crypto module counters. Large but mechanical, and it also removes a class of SSR-hydration fragility. Blocks nothing else, so it can run in parallel.
5. **Wrap the nine unlayered stylesheets in `@layer kj.component`** (F-6) — one commit, plus a CI grep to keep it true. This is a real single-app customization fix. Do **not** pursue a versioned-layer namespace (F-5, refuted): it would not fix the two-version collision and would make the winner less predictable. Instead add a one-line “single copy of the library per document” note to the install docs.
6. **Fix the two instance-scoping defects that are already bugs today** (F-9, F-11). The palette's `document.querySelector` → `viewChild`, and the live region's DOM-first lookup. Both are a handful of lines, both are correctness fixes independent of MFE, both have obvious specs.
7. **Make `lucide-static` optional and offer a lazy registry** (F-12). Move it to `peerDependenciesMeta`, add `provideLucideIconsLazy()` over the existing `KJ_ICON_LOADER` token.
8. **Clean up the misleading scroll-lock hook** (F-10). Fold into item 2 — make `data-kj-scroll-lock` the real mechanism rather than deleting it.
9. **Add multi-instance specs.** Every fix above needs a test that instantiates the thing twice: two `TestBed` roots with different `APP_ID` (F-1, F-7), two strategy instances over one jsdom document (F-2), two `KjOverlayStack`s (F-3), two palettes (F-8, F-9). Without these the invariants regress on the next refactor.

## Open questions

1. **Is MFE actually wanted?** Nothing in the repo suggests it. If the answer is "no, one app per page", most of this backlog collapses to items 5, 6 and 8 (which are single-app defects anyway) and the rest becomes a documented non-goal. Worth deciding explicitly before spending item 4's effort.
2. **Which topology?** Module Federation with `singleton: true` is a very different contract from "each remote ships its own copy" or "remotes are custom elements in shadow roots". The shadow-root case in particular changes everything about F-4 and F-5 (styles would need `adoptedStyleSheets`, and the overlay container would have to live per-root) and is not addressed above.
3. **Do two *versions* of the library need to coexist, or only two apps?** Two apps sharing one version is mostly solvable with DI seeding (F-1, F-4, F-15). Two versions is a much harder CSS problem (F-5) and probably needs the `@layer kj-<major>` build variant.
4. **Is Escape-closes-one-overlay-page-wide the right semantic?** F-3 assumes yes. An argument exists for "each app handles its own Escape", in which case the fix is per-app event scoping (listen on the app's host element, not `document`) rather than page-wide arbitration — a different and possibly cleaner design.
5. **`@monaco-editor/loader` internals** (F-13): does a second `init()` from a second module copy race or no-op? I did not read the dependency's source. Worth five minutes before designing the guard.
6. **Would a `sideEffects`-safe secondary entry-point layout help?** Both packages are single-entry (`packages/core/ng-package.json`, `packages/components/ng-package.json`). Secondary entry points (`@kouji-ui/core/overlay`, `/table`, …) would let federation share at a finer grain and let a remote pull only what it uses — but they also multiply the token-identity surface in F-7. Probably not worth it; flagging in case someone assumes otherwise.

## Refuted during verification

### F-5 (original) "The `@layer kj.*` cascade is global and unversioned — the second copy silently restyles the first" — **REFUTED** (was: high)

The stated mechanism is wrong, one of the four evidence claims is factually incorrect CSS, another is miscounted, and the residual truth is a documented, accepted v1 limitation. Re-filed as **F-5 (low)** above, a documentation gap.

1. **The rename claim is false CSS.** "A renamed `--kj-base-*` token in the newer version leaves the older app resolving `var()` fallbacks" does not happen. Custom properties with **different names do not collide** on `:root` — v1's `base.css` keeps declaring v1's names and v2's declares v2's, and both sets coexist. A rename is the one change that is harmless in this scenario. Only a same-name / different-value redeclaration bites.
2. **Miscount.** "80 stylesheets open with `@layer kj.component`" — `grep -rl` over `packages/*/src` returns **62** files, not 80.
3. **The mechanism is misattributed to layers.** The colliding global identifier is the class name `.kj-button`, not the layer name. Remove every `@layer` line and the two-version collision is unchanged. Worse, the implied fix (versioned layer names) **degrades** the situation: with `@layer kj-v1.component, kj-v2.component`, the winner is fixed document-wide by whichever `@layer` statement registered first, which is less predictable than source order. The only real fixes — versioned class names, or shadow DOM — are not named in the finding.
4. **The consequence requires version skew, not two copies.** Two copies of the same version emit identical rules and identical `:root` values, so there is no observable effect. The headline "the second copy silently restyles the first" only follows from two *different versions* in one document. The `:root` surface singled out (`base.css:29-183` primitives/radii/space/text ladders; `density.css:41-60` `--kj-density: 1` and the spacing ladder) is also the most stable, least-churning surface in the repo: `grep '^\s*:root' packages/themes/src` matches only `base.css:29` and `density.css:41`, because every per-theme value lives under `[data-theme="X"]` in `kj.shared`, which the finding itself concedes is safe.
5. **Already handled / triaged, and not the first-order blocker.** `docs/component-analyses/actions/context-menu.md:611-614` records the project's explicit position: *"Provided in 'root' so all triggers across the app coordinate. Risk: micro-frontend or multi-Angular-app pages might have two registries and lose the 'one open at a time' guarantee. Acceptable for v1; document."* So "there is no opt-in scope hook at all" is not a discovery. And CSS is not what breaks first: two copies means two injectors duplicating `providedIn: 'root'` singletons — `KjOverlayStack` (`stack.ts:38, 107`), `KjOverlayBuilder` (`builder.ts:82`), `KjDialogService`, `KjDrawerService`, `KjLocale`, `KjTranslate` — so overlay stacking, z-index ordering and focus-trap ownership fail well before a padding delta is noticed.

**Verified evidence that does hold:** `base.css:7` layer statement; `base.css:28-31` palette on bare `:root` inside `kj.base`; `density.css:41` `:root` inside `kj.base`; and no version token in any CSS selector, layer name or custom property.

<details>
<summary>Original F-5 text, preserved</summary>

### F-5 The `@layer kj.*` cascade is global and unversioned — the second copy silently restyles the first

**Severity:** high · **Confidence:** high
**Files:** `packages/themes/src/base.css:7,29`, `packages/themes/src/density.css:41`, all 80 `@layer kj.component { … }` stylesheets, `packages/components/src/overlay/overlay.css:37-45`

**Evidence**

```css
/* packages/themes/src/base.css:7 */
@layer kj.reset, kj.base, kj.shared, kj.component;
```

```css
/* packages/themes/src/base.css:28-31 */
@layer kj.base {
  :root {
    /* ── color palette ── */
    --kj-base-gray-50:  oklch(98% 0    0);
```

```css
/* packages/components/src/button/button.css:9 (representative of 80 files) */
@layer kj.component {
```

`grep -rn "kj-v\|version" packages/*/src --include=*.css` finds no version token in any selector, layer name or custom property.

**Why it matters**
Layer names are page-global identifiers. Two copies of `@kouji-ui/components` both write `.kj-button` into `@layer kj.component`; within one layer the later-registered sheet wins for the **whole document**, so App A's buttons get App B's v2 padding and App B's get A's v1 border. The `[data-theme]` scoping on theme *values* does not save this — it scopes tokens, not the component rules that consume them.

The same applies one level down: `packages/themes/src/base.css:29` and `density.css:41` write the entire base primitive palette and density scale onto bare `:root`. Two versions of `@kouji-ui/themes` ⇒ the later-loaded `kj.base` block silently rethemes the other app, and a renamed or removed `--kj-base-*` token in the newer version leaves the older app's components resolving `var()` fallbacks.

There is no opt-in scope hook: nothing accepts a per-app class or attribute that the component rules could nest under.

**Fix**
Give the cascade a version/instance namespace, opt-in so single-app consumers are unaffected:
1. Publish a build variant (or a PostCSS step in `ng-package.json` assets) that emits `@layer kj-<major>.component` and nests every rule under `[data-kj-scope="<id>"]`. Consumers register one or the other.
2. Ship an explicit `@layer` *order* declaration in a standalone `@kouji-ui/themes/layers.css` so the ordering is correct even when `base.css` is not loaded first (today the order at `base.css:7` only applies if that file is parsed before any `kj.*` rule).
3. Document the minimum contract in an MFE guide: **one version of `@kouji-ui/themes` and `@kouji-ui/components` CSS per page**, loaded by the shell, with remotes not registering their own stylesheets. This is the realistic near-term answer and costs nothing but prose.

**Effort:** L

</details>

---

## Carried forward from the 2026-09-06 review

Two findings from the previous pass (commit `9aee150a`, auditing `fd6dd34e`) were not re-filed by this pass. I re-verified both at HEAD; both are still true, so they are restored here with their prior-pass ids noted.

### F-16 Service-launched overlays escape their app's theme, density and direction scope *(prior pass F-7)*

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/builder.ts:111-118`, contrast `packages/core/src/primitives/overlay/strategies/mount/body-portal.ts:13-21, 57-61`

**Verified at HEAD** — the builder still appends the wrapper straight into the singleton container with no scope propagation:

```ts
// packages/core/src/primitives/overlay/builder.ts:111-118
    const wrapperRef = createComponent(KjOverlayWrapper, {
      environmentInjector: this.env,
      elementInjector: injector,
    });
    this.appRef.attachView(wrapperRef.hostView);
    wrapperRef.changeDetectorRef.detectChanges();
    getOverlayContainer()?.appendChild(wrapperRef.location.nativeElement);
```

while the **declarative** path does do it:

```ts
// packages/core/src/primitives/overlay/strategies/mount/body-portal.ts:57-61
      // Propagate the closest ancestor's `data-theme` so the portalled
      const theme = closestTheme(ctx.triggerEl() ?? originalParent);
      if (theme) w.setAttribute('data-theme', theme);
      else w.removeAttribute('data-theme');
```

`closestTheme()` is private to `body-portal.ts`; a repo-wide grep finds it nowhere else. So every service-launched overlay — dialog (`dialog.service.ts`), drawer, sheet, toast, action-sheet — lands in the body-level `.kj-overlay-container`, **outside both apps' root elements**, and inherits `<html>`'s tokens rather than its owning app's. In a two-app page where the shell is light and the remote is dark, every one of the remote's dialogs, drawers, sheets and toasts renders light. Same for `[data-density]` and for `dir`: a drawer that should slide from the right in an Arabic remote slides from the left.

Note this is **not only** an MFE issue — it also breaks any single app that scopes a theme to a subtree (the repo's own theme-generator preview pane is the case `body-portal.ts:9-12` was written for). The declarative overlays handle it; the service-launched ones do not.

**Fix** Extract `closestTheme()` into a shared `inheritScope(from, to)` helper that copies `data-theme`, `data-density` and `dir`, and call it from `KjOverlayBuilder.create()` using the launching injector's root element — not just from `bodyPortal`. Folds naturally into F-4's mount-token work. **Effort:** M

### F-17 Zone-agnostic (a strength) but document listeners and observers scale per instance *(prior pass F-15)*

**Severity:** low · **Confidence:** medium *(the perf claim is reasoned from the code, not measured)*
**Files:** `packages/core/src/primitives/interaction/focus-ring.ts:45-46`, `packages/core/src/chart/chart.ts:190-191`, `packages/components/src/editor/editor.ts:134-135`

**Verified at HEAD** — `KjFocusRing` still adds two capture-phase `document` listeners **per instance**:

```ts
// packages/core/src/primitives/interaction/focus-ring.ts:45-46
      document.addEventListener('keydown', onKeydown, true);
      document.addEventListener('pointerdown', onPointerdown, true);
```

and it is composed via `hostDirectives` across **31** non-spec files. Teardown is correct (`destroyRef.onDestroy` removes all four), so this is a scaling cost, not a leak. In a zone-based host, zone.js patches `addEventListener`, so every keystroke anywhere on the page schedules one tick per listener; two apps × hundreds of focusable elements makes that measurable. Separately, `chart.ts:191` and `editor.ts:135` each attach a `MutationObserver` to `document.documentElement` per instance — a 20-chart dashboard in each of two apps is 40 observers on one node, all firing on every theme toggle.

The strength half is worth keeping in the report and stating in the README: no `NgZone`, no `runOutsideAngular`, no `zone.js` import, no `markForCheck`, and only three `detectChanges()` calls, all on a specific `ComponentRef`/view. **The library is genuinely safe in a zone-based host and a zoneless one**, which is a real MFE prerequisite — a zoneless shell can host a zone-based remote using kouji-ui, and vice versa.

**Fix** Hoist to root-provided singletons: one `KjInputModality` service (one listener pair, one signal, every focus ring reads it) and one `KjThemeObserver` exposing a `themeVersion` signal that charts and editors read in a `computed`. **Effort:** M


## Changed since the 2026-09-06 review

Previous review: commit `9aee150a`, auditing `fd6dd34e`. Main has since advanced 8 commits, including real overlay work. Every "fixed" claim below was checked against the code at HEAD.

### Fixed

- **Prior F-8 — "No z-index stratification seam — 20 hard-coded literals and one global `--kj-overlay-z-index`" — substantially fixed by `2948c5b5` ("nested overlays always stack above their opener").** Verified at HEAD:
  - A DI seam now exists: `KJ_OVERLAY_Z_BASE` (`stack.ts:37-40`, `providedIn: 'root'`, factory returning `KJ_OVERLAY_Z_BASE_DEFAULT` = 1000 at `:29`), injected by `KjOverlayStack` at `:111`.
  - A runtime seam now exists: `KjOverlayStack.baseZIndex` (`stack.ts:165-172`) reads `--kj-overlay-z-base` off `:root` when it holds a number, falling back to the token; `nextZIndex` (`:175-181`) assigns each opening overlay one level above the current topmost, and `register()` hands that value back on the handle.
  - The container rule is now two-tier: `packages/core/src/primitives/overlay/overlay.css:21` is `z-index: var(--kj-overlay-z-index, var(--kj-overlay-z-base, 1000))`.
  - The component-CSS literals the prior finding listed are gone: `dialog.css:9`, `drawer.css:16, 56`, `dropdown-menu.css:28`, `popover.css:28`, `confirm-popup.css:22`, `color-picker.css:32`, `command-palette.css:18, 33`, `cascade-select.css:46`, `combobox.css:48`, `select.css:63`, `date-picker.css:42`, `datetime-picker.css:43` and `sheet.css:26` all now read `z-index: var(--kj-overlay-z, <default>)`. One literal survives — `cascade-select.css:64` is still a bare `z-index: 1001`.
  - Coverage exists: `stack.spec.ts:113-115` assert that `KJ_OVERLAY_Z_BASE` moves the whole stack.
  This is exactly the seam the prior pass asked for. What it does **not** do is give each *app* its own container (that is F-4's residual), which is why F-4 still exists at low.

- **Not a prior finding, but relevant to the same surface:** cross-composite content-query bleed is now handled — `fb1d1956` added `ownListItems()` (`packages/core/src/primitives/list/scope.ts:35-43`) plus `scope.spec.ts`, so a nested composite's rows are no longer stolen, renumbered or activated by an outer container. Verified at HEAD. This reduces, but does not remove, the surface a second instance can disturb.

No other prior MFE finding was fixed in the range. Verified unchanged at HEAD: `id.ts:10-16`, `container.ts:24`, both scroll-lock modules, `_announce.ts:15-28`, `command-palette.ts`'s `document.querySelector` focus, `document-direction.ts`, `table-storage.ts`'s empty default `keyPrefix`, and `@angular/cdk` still a required peer of **both** packages (`packages/core/package.json:32`, `packages/components/package.json:28`) with `"cdk"` still in core's `keywords` at `:20`.

### Still open

| Prior | Current | Note |
|---|---|---|
| F-1 Id minting has no document-global seed (medium) | **F-1** | Same finding; this pass raised it to high and verification put it back at medium. The two mechanisms (per-root `KjId` vs ~43 module counters) are now split by deployment shape rather than conflated. |
| F-3 Two competing module-global scroll-lock refcounts (high) | **F-2** | Same code, unchanged. Corrected to medium: the double-padding claim is false, and the corruption needs non-LIFO release. |
| F-2 Escape / hotkey routing is per-root-injector (low) | **F-3** + **F-8** | Split into the stack half (F-3, back at low after verification — the prior pass had already landed on low; this pass re-raised it to high and verification reversed that) and the hotkey half (F-8, medium). |
| F-4 `ViewEncapsulation.None` on 80 components (high) + F-5 `@kouji-ui/themes` writes `:root` globally (high) | **F-5** *(refuted, re-filed low)* | The prior pass had the **mechanism right** — identical global class names in one layer, last sheet wins — and framed it as an encapsulation/token problem, which is accurate. This pass re-framed it as an `@layer` defect, which verification refuted. The surviving claim matches the prior pass's F-4 more closely than this pass's F-5. Prior F-4's count of 80 `ViewEncapsulation.None` files stands; this pass's "80 `@layer kj.component` stylesheets" was a miscount (62). |
| F-6 99 module-scope `InjectionToken`s (high) | **F-7** | Same finding, now 100 tokens. |
| F-9 `provideKjDocumentDirection()` (medium) + F-13 table `localStorage` prefix (medium) | **F-15** | Merged into one low finding. Arguably under-weighted: the table-storage default `keyPrefix` of `''` is a live collision risk for any two tables sharing a key, MFE or not. |
| F-10 Live-region registry is a module-level map (medium) | **F-11** | Unchanged code, lowered to low; the "no `isConnected` re-check" and SSR-process-global sub-points from the prior pass are not carried over and should be. |
| F-11 Command palette focuses by global `document.querySelector` (medium) | **F-9** | Unchanged code, same severity. |
| F-12 Stale `@angular/cdk` peer + hard `^22.0.0` Angular pin (medium) | **F-14** | The CDK half is carried (lowered to low). The **mixed-major Angular story** — the prior pass's more important half — is only touched in passing; it is the first thing an MFE adopter needs and deserves to stay explicit. |
| F-14 Duplicated payload: non-peer bundled deps + 300 KB icon map (low) | **F-12** | The lucide half is carried at medium. The prior pass's recommendation to promote `@tanstack/angular-table`, `@tanstack/virtual-core` and `marked` to peers so federation can dedupe them is **dropped** by this pass, which calls them "acceptable, they are small and stateless". That is a judgement change, not new evidence. |
| F-7 Service-launched overlays escape theme/density/dir scope (high) | **F-16** *(restored)* | Missed by this pass. Re-verified at HEAD (`builder.ts:111-118` still has no propagation; `closestTheme()` is still private to `body-portal.ts`) and restored. |
| F-15 Per-instance document listeners and observers (low) | **F-17** *(restored)* | Missed by this pass. Re-verified at HEAD and restored, including the zone-agnostic strength worth documenting. |

### Not reproduced

- Nothing from the prior MFE pass was silently dropped as wrong. The two omissions (prior F-7, F-15) are restored above as F-16 and F-17.
- Prior F-8's z-index half is genuinely **fixed**, not merely unreproduced — see the Fixed section for the line-level evidence.
- The prior pass's refuted claims (an enabled `KjFocusTrap` reacting to Tab in another app; "listener count reaches four figures") stay refuted — nothing at HEAD reopens either, and `KjFocusTrap` still has zero consumers (now also filed as `04-accessibility.md` F-23).

### New since then

- **F-6** Thirteen stylesheets ship with no `@layer` at all, so they beat every layered rule on the page — nine of them with real rules. A live single-app customization hazard the prior pass did not spot, and the most actionable CSS item in this report.
- **F-8** Unscoped `document` hotkey listeners: `on-hotkey.ts:40-47` and `command-palette.ts:291-300` both bind on `document`, both `preventDefault()`, neither checks `e.defaultPrevented`. Two one-line guards.
- **F-10** `body[data-kj-scroll-lock]` is styled (`popover.css:57-61`) but never written, and its comment names a `KjOverlayService` that does not exist.
- **F-13** Monaco's global AMD loader is memoised per copy, and two copies calling `loader.config({ paths: { vs } })` with different paths is last-write-wins on one page-global.
