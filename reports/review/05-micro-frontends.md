# Micro-Frontend Readiness Review

> **Adversarially verified 2026-09-15.** Findings below marked *(severity corrected during verification)* were re-checked against the source; corrections are inline. Refuted findings are preserved in **Refuted during verification** at the end of the findings list, not deleted.

Scope: can two or more independently-deployed Angular apps, each possibly a different
version of `@kouji-ui/core` + `@kouji-ui/components` + `@kouji-ui/themes`, run
simultaneously on one page (Module Federation / Native Federation / web components)
without interfering?

## Verdict

**Grade: D.** The library is written as if it owns the page. The architectural bones
are unusually good for MFE — a `kj-` prefix with zero offenders across ~250 selectors
and every CSS class, a real `@layer kj.reset, kj.base, kj.shared, kj.component`
cascade contract, DI-based registries for icons/chat/locale/i18n, and lazy +
DI-overridable loading of the heavy deps (echarts, monaco, lexical). But everything
that has to be *unique per page* is instead unique *per module copy*: 44 module-scope
`let x = 0` id counters plus a `providedIn: 'root'` `KjId` all restart at `0` in every
copy, so two instances mint the identical `kj-field-1` / `kj-panel-1` / `kj-overlay-1`
DOM ids and silently break `aria-labelledby` / `aria-controls` / `label[for]` across
the whole page. Two document-level keyboard handlers (`KjOverlayStack`,
`KjFocusTrap`) act on every keystroke in the document with no check for which app
owns the focus, so Escape closes overlays in *both* apps and an open dialog in app A
steals Tab focus out of app B. 80 components ship `ViewEncapsulation.None` with
global stylesheets that both copies inject into the same `@layer kj.component` under
identical selectors — last-injected wins, for both apps. None of this is
unfixable — most of it is a mechanical "move the module-global into a root-provided
injectable and seed it from `APP_ID`" change — but as it stands, shipping two
versions of this library on one page produces silent a11y corruption and visual
bleed, not a crash, which is the worst failure mode to debug.


*Post-verification: F-1 critical → medium (two distinct mechanisms, partial mitigations, and a prior recorded v1 tradeoff at `docs/component-analyses/actions/context-menu.md:610-614`), F-2 critical → low (the focus-theft and listener-count evidence was refuted). No critical findings remain in this dimension — but the grade still reflects that multi-app-per-page is an undeclared, unsupported deployment mode.*

## What works

- **`kj-` prefix discipline is complete.** Every component/directive selector is
  `kj-*` or `[kj*]` (`grep` over `selector:` in both packages yields exactly one
  non-`kj` selector, `my-filter`, in a docs example). Every CSS class selector in
  `packages/components/src/**/*.css` is `.kj-*` — zero unprefixed offenders. Two
  copies can't collide on a *name*; they collide on *identity*, which is the
  fixable half.
- **Real `@layer` contract.** `packages/themes/src/base.css:7` declares
  `@layer kj.reset, kj.base, kj.shared, kj.component;` and every component
  stylesheet opens with `@layer kj.component {` (73 files). CSS layers merge by
  name across stylesheets, so a second copy re-declaring the same statement is a
  no-op and layer *ordering* stays deterministic regardless of load order. This
  removes the classic "which bundle loaded first" cascade lottery — only
  same-layer same-selector specificity ties remain (F-4).
- **Registries are DI, not module globals.** `KJ_ICON_REGISTRY`
  (`packages/core/src/icon/icon.tokens.ts:26`), `KJ_CHAT_CONFIG`
  (`packages/core/src/chat/chat-registry.ts:46`), `KjTranslateService`
  (`packages/core/src/i18n/translate.service.ts:52`), `KjLocale`
  (`packages/core/src/locale/locale.ts:76`) all hold their state on the injector,
  so each app instance gets its own. This is the correct shape.
- **Heavy deps are lazy and swappable.** `chart.ts:135` `await import('echarts')`,
  `editor.loader.ts:63` `await import('@monaco-editor/loader')`,
  `rich-text-editor.ts:224` `await import('./engine')` (the only place lexical is
  value-imported). All three are overridable via DI (`provideECharts`,
  `provideMonaco`, `KJ_MONACO_CONFIG.loader`), so a shell can hand every remote one
  shared instance.
- **`bodyPortal` already propagates theme scope.**
  `strategies/mount/body-portal.ts:13-21,57-61` walks up from the trigger for the
  nearest `[data-theme]` and copies it onto the portalled wrapper. This is exactly
  the primitive an MFE needs — it just isn't applied on the service-launched path
  (F-7).
- **Change-detection agnostic.** Zero `NgZone`, zero `zone.js`, zero
  `runOutsideAngular` in either package; state is `signal`/`computed`/`effect`
  only. The library works unchanged in a zone-based host and a zoneless one, which
  is a genuine MFE prerequisite most libraries fail.
- **Zero `@angular/cdk` imports** in the whole source tree, despite the peer dep —
  one fewer shared singleton to negotiate, once the stale peer is dropped (F-12).
- **Zero `window.*` / `globalThis.*` / `customElements.define` registrations.**
  Nothing claims a global name.

---

## Findings

### F-1 Id minting has no document-global seed, so ids collide when two Angular roots or two library copies share a page

**Severity:** medium *(corrected during verification: was critical)* · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/id.ts:10-17`,
`packages/core/src/primitives/overlay/panel.ts:40,65`,
`packages/core/src/primitives/overlay/controller.ts:39-40`,
`packages/core/src/field/field.ts:10,52,78,81,84`,
`packages/core/src/field/field-error.ts:4,43,52-53`,
`packages/core/src/primitives/list/item.ts:17,108`,
`packages/core/src/alert/alert.ts:19,89`,
`packages/core/src/stepper/stepper.ts:29,106,244,300`, + ~33 more

**Two distinct mechanisms that fail under opposite conditions — the original finding conflated them and got the safer one backwards.**

**(a) `KjId` is `providedIn: 'root'`, i.e. per Angular *application injector*.** Two bootstrapped roots on one page collide **even when they share a single library copy** — this is the more fragile of the two, not the fix. Its ids become real DOM ids at `panel.ts:40` (`'[id]': 'panelId'`, minted at `:65`) and `controller.ts:40`.

```ts
// packages/core/src/primitives/overlay/id.ts:10-17
@Injectable({ providedIn: 'root' })
export class KjId {
  private _counter = 0;
  mint(prefix = ''): string {
    const id = ++this._counter;
    return prefix ? `kj-${prefix}-${id}` : `kj-${id}`;
  }
}
```

**(b) ~41 module-scope id counters are per *module instance*,** so they are **safe under a shared singleton** (the normal Module Federation / import-map setup) and collide only when the library is genuinely duplicated — separate versions, non-shared federation remotes.

```ts
// packages/core/src/field/field.ts:10,52,84
let kjFieldIdCounter = 0;
private readonly uid = ++kjFieldIdCounter;
readonly controlId = computed(() => this.kjFieldId() ?? `kj-field-${this.uid}`);
```

**Evidence corrections.**
- `field.ts:84` is `controlId`, **not** `fieldId`.
- At least **2 of the 44** grep hits are not id counters at all: `primitives/overlay/strategies/scroll-lock/css-clip.ts:3` and `html-overflow.ts:3` are scroll-lock **refcounts**. Duplicate copies there leak the scroll lock rather than colliding ids — a separate bug, tracked in F-3.

**Existing mitigations the original finding omitted (coverage is partial, not absent).** `primitives/list/item.ts:108` honours a host-supplied id (`host.id || 'kj-list-item-N'`), and explicit id inputs exist at `field.ts:78/81`, `field-help.ts:35`, `field-error.ts:43`, `list/group.ts:61/111`, `cascade-select-sub-panel.ts:84`. Overlay panel/controller, alert, stepper and most others expose no override.

**Why the severity drops.** These strings are still written into the DOM as real `id` attributes and referenced by `aria-labelledby`, `aria-describedby`, `aria-controls`, `aria-activedescendant` and `label[for]`, so the blast radius described below is real *in the deployment mode it describes*. But `docs/component-analyses/actions/context-menu.md:610-614` records this exact multi-app risk as a **knowingly accepted v1 tradeoff**, and nothing in the repo — no `APP_ID` seeding, no federation config, no docs — claims MFE support. This is a latent readiness gap in an undeclared deployment mode with partial mitigations, not a critical defect in shipped usage. It is the case for *revisiting* that prior decision, not a newly discovered break.

**Blast radius when it does bite.** `document.getElementById` returns the **first** match in document order, so app B's dialog trigger says `aria-controls="kj-panel-1"` and a screen reader resolves it to **app A's** panel; app B's `<label for="kj-field-3">` labels app A's input; `aria-describedby="kj-field-error-2"` announces app A's validation error under app B's field. Silent WCAG 1.3.1 / 4.1.2 failures that no smoke test catches.

**Fix.** Seed every counter from one document-global prefix:
1. Inject `APP_ID` (or a `KJ_ID_PREFIX` token defaulting to a per-app random/`APP_ID`-derived string) inside `KjId`: `mint(prefix) { return \`kj-${this.appId}-${prefix}-${++this._counter}\`; }`. Consumers set `{ provide: APP_ID, useValue: 'checkout' }` per remote.
2. Route the ~41 module-scope counters through `KjId` or a `globalThis`-keyed registry so a second copy **continues** the sequence instead of restarting it.
3. For anything outside an injection context, fall back to `crypto.randomUUID()` (already used correctly in `toast.service.ts`).
4. Add a lint rule banning `let <name>Id/Uid/Counter = 0` at module scope in `packages/*/src`.
5. Add a spec that bootstraps two TestBed roots and asserts no minted id repeats.

**Effort:** M

---

### F-2 Escape and hotkey routing is per-root-injector, so two apps on one page close/open independently

**Severity:** low *(corrected during verification: was critical; the focus-theft and listener-count evidence was refuted)* · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/stack.ts:34,80-112`,
`packages/components/src/command-palette/command-palette.ts:255-263`,
`packages/core/src/primitives/overlay/strategies/trigger-event/on-hotkey.ts:40-47`

```ts
// stack.ts:80-85, 99-112 — one KjOverlayStack per ROOT INJECTOR, i.e. per app
private ensureListeners(): void {
  if (this._listenersInstalled) return;
  document.addEventListener('keydown', this._onKeydown, true);
  document.addEventListener('pointerdown', this._onPointerDown, true);
  ...
private handleKeydown(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return;
  const top = this.topmost();
  if (!top || !top.opts.closeOnEsc) return;
  top.opts.onClose();          // no check that `e` originated in THIS app's tree
}
```

`KjOverlayStack` is `providedIn: 'root'`, so each bootstrapped Angular app owns a separate stack plus its own capture-phase `document` keydown/pointerdown pair. **When two apps each have an open overlay at the same time, a single Escape closes the topmost in both**, and two `onHotkey('mod+k')` bindings (`on-hotkey.ts:45`, `command-palette.ts:255-263`) both fire. Outside-click cross-fire has the same shape: `handlePointerDown` (`stack.ts:106-112`) closes app B's topmost overlay on any click inside app A.

**Bounded impact.** Listeners are installed only while an overlay is registered and torn down at zero (`stack.ts:87-92`). No data loss, no focus stealing, no a11y regression in any shipped component. Duplicate `mod+k` is a consumer-chosen chord collision no library guard can resolve without a cross-app registry.

**Verification corrections — two claims removed as unsupported.**
- **REFUTED: "an enabled `KjFocusTrap` in app A reacts to Tab in app B and calls `first.focus()`".** `kjFocusTrap` has **zero usages anywhere in the repo** outside its own file, spec and barrel export — no shipped component applies it. Every real overlay (dialog, drawer, sheet, popover, command-palette-dialog, date-picker-calendar) uses `tabCycle()` (`strategies/focus-trap/tab-cycle.ts`), which binds `keydown` to the **panel element**, not `document`, and only acts when `document.activeElement === first/last`. It cannot react to a Tab that happened in another app, so the "yanks focus into app A's modal" consequence does not follow for any library component. (`a11y/focus-trap.ts` remains dead code worth removing or wiring — see F-15 / 04-accessibility F-9.)
- **REFUTED: "listener count reaches four figures".** `KjFocusRing`'s two capture listeners only assign a private `_lastWasPointer` boolean (the standard focus-visible heuristic), are removed on destroy, and have no cross-app effect whatsoever; 29 consumer files, not four figures.
- **The implied fix is also wrong.** Inspecting `e.target` does not work — Escape with focus on `<body>` after a backdrop click has a target in neither app, and target-scoping would break the primary single-app case.

**Fix.** The real options are a `window`-level shared stack/hotkey registry, or a documented MFE contract stating that multi-app-per-page overlay coordination is out of scope. Fold this into the `MICRO-FRONTENDS.md` recommendation (item 6 below) rather than shipping it as a blocker.

**Effort:** M

---

### F-3 Two competing module-global scroll-lock refcounts leave `<html>` permanently `overflow: hidden`

**Severity:** high · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/strategies/scroll-lock/html-overflow.ts:3-5,10-32`,
`packages/core/src/primitives/overlay/strategies/scroll-lock/css-clip.ts:3-4,10-37`

```ts
// html-overflow.ts:3-5, 10-14
let _count = 0;
let _savedOverflow: string | null = null;
let _savedPaddingRight: string | null = null;
...
if (_count === 1) {
  _savedOverflow = html.style.overflow;   // snapshots "clip" if css-clip got here first
  html.style.overflow = 'hidden';
```

```ts
// css-clip.ts:3-4, 14-17
let _count = 0;
let _saved: string | null = null;
...
if (_count === 1) {
  _saved = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'clip';
```

**Why it matters.** Reference counting is present (good) but the counters are
**module-global and there are two of them**, both writing the same
`document.documentElement.style.overflow` with no shared arbiter.

- **Even in one app, today:** `htmlOverflow()` is used by dialog
  (`dialog.service.ts:35`), drawer (`drawer.service.ts:68`), sheet
  (`sheet.service.ts:83`) and the command palette
  (`command-palette-dialog.ts:62`); `cssClip()` is the alternative strategy a
  consumer can wire. Open a `cssClip` overlay, then a dialog: `htmlOverflow`
  snapshots `_savedOverflow = 'clip'`, sets `'hidden'`; close the dialog → restores
  `'clip'`; close the cssClip overlay → restores `''`. Order-dependent, and the
  reverse order leaves `overflow: hidden` on `<html>` **permanently** — the page
  can never scroll again until reload.
- **Across two copies:** each copy has its own `_count`. App A opens a dialog
  (`_countA = 1`, saves `''`, sets `hidden`). App B opens a dialog (`_countB = 1`,
  saves **`hidden`**, sets `hidden`). App A closes → restores `''` → **app B's modal
  is now scrollable behind its own backdrop**. App B closes → restores `hidden` →
  page permanently locked. A hard user-visible break, not a cosmetic one.
- **SSR bonus.** The guard is `typeof document === 'undefined'`, not `PLATFORM_ID`
  (which `controller.ts:36-37` and `stack.ts:36-37` use correctly). Under a DOM
  shim on the server, `_count` is process-global and leaks across requests.

**Fix.** One `providedIn: 'root'` `KjScrollLock` service taking `DOCUMENT` +
`PLATFORM_ID`, owning a single refcount and a single saved-style snapshot; both
strategies become thin callers of it. For the cross-app case, refcount in a
`document.documentElement` data attribute (`data-kj-scroll-lock="<n>"`) so *any*
copy sees the shared depth — the dead selector
`body[data-kj-scroll-lock="true"]` at `packages/components/src/popover/popover.css:60`
suggests this was the original design and got lost. (Nothing currently sets that
attribute; either wire it or delete the rule.)

**Effort:** M

---

### F-4 `ViewEncapsulation.None` on 80 components — two versions overwrite each other's styles in the same layer

**Severity:** high · **Confidence:** high
**Files:** `packages/components/src/button/button.ts:134-135` (+ 79 more in
`packages/components/src`), `packages/core/src/primitives/overlay/wrapper.ts:36`
(+ 10 more in `packages/core/src`), `packages/themes/src/density.css:7`

```ts
// packages/components/src/button/button.ts:134-135
  styleUrl: './button.css',
  encapsulation: ViewEncapsulation.None,
```

```css
/* packages/themes/src/density.css:7 — the design is explicitly global */
   Components use ViewEncapsulation.None, so a [data-density] selector
```

Counts: `ViewEncapsulation.None` appears in **80** non-spec, non-example files under
`packages/components/src` and **11** under `packages/core/src`; 73 of them pair it
with a `styleUrl`. This also directly contradicts the project's own rule —
`rules/code_style.md`: "**Encapsulation:** Do not use `ViewEncapsulation.None`.
Component styles must stay scoped."

**Why it matters.** `ViewEncapsulation.None` makes Angular inject the stylesheet
into `document.head` verbatim, once per *component definition class*. Two copies of
`@kouji-ui/components` = two distinct classes = **two `<style>` blocks with byte-wise
identical selectors** (`.kj-button`, `.kj-dialog-panel`, …) in the same
`@layer kj.component`. Layers tie, specificity ties, so the **later-injected sheet
wins for both apps**. Consequences:

- Whichever remote lazily instantiates a `kj-button` *last* silently restyles every
  button on the page, including the other app's.
- Version skew becomes a page-wide regression: a padding change in v0.10 applies to
  the v0.9 remote too.
- It is order-dependent on *runtime instantiation*, not build order, so it changes
  as the user navigates. Effectively untestable.
- The global stylesheets registered in `angular.json`
  (`packages/core/src/styles.css`, `packages/components/src/overlay/overlay.css`,
  `packages/themes/src/index.css`) are loaded once per app bundle too — same
  duplication, same last-wins.

**Fix.** Pick one:
- **(a) Preferred, smallest behavioural delta:** keep `None` but make the selectors
  version-scoped. Ship a `KJ_STYLE_SCOPE`-driven attribute on every component host
  (`data-kj-v="0.9"`, injected by a `provide` fn, defaulted to the package version at
  build time) and emit component CSS nested under
  `@layer kj.component { [data-kj-v="0.9"] & { … } }` via a build step. Two versions
  then write two disjoint selector sets.
- **(b)** Move to `ViewEncapsulation.Emulated` per the project's own rule; keep only
  the genuinely global pieces (overlay container chrome, prose, icon) in the
  aggregator stylesheets. This costs a `::ng-deep`-free rewrite of anything that
  styles projected content.
- **(c) Minimum viable:** document that `@kouji-ui/*` must be declared
  `singleton: true, strictVersion: true` in every federation config, and fail the
  build otherwise.

**Effort:** L

---

### F-5 `@kouji-ui/themes` writes `:root` tokens globally — the last-loaded copy re-themes every app on the page

**Severity:** high · **Confidence:** high
**Files:** `packages/themes/src/base.css:7,28-30`,
`packages/themes/src/density.css:40-41,120-131`,
`packages/themes/src/themes/*.css` (17 theme files),
`packages/themes/src/index.css:1-17`

```css
/* packages/themes/src/base.css:7,28-30 */
@layer kj.reset, kj.base, kj.shared, kj.component;
@layer kj.base {
  :root {
    /* ── color palette ── */
```

```css
/* packages/themes/src/themes/dark.css:6-7 — attribute-scoped, and therefore fine */
@layer kj.shared {
  [data-theme="dark"] {
```

**Why it matters.** `:root` is `<html>` — there is exactly one per page. Two apps
each shipping `@kouji-ui/themes` (`index.css` pulls in base + density + all 17
themes) both declare `:root { --kj-base-* }` inside `@layer kj.base`. Same layer,
same specificity → **later stylesheet wins, for both apps**. A token-value change
between 0.1.1 and 0.2.0 silently repaints the other app.

The `[data-theme="x"]` blocks are better — they're attribute-scoped, so an app that
sets `data-theme` on *its own root element* rather than on `<html>` gets correct
scoping, and `bodyPortal` even propagates it to portalled panels
(`body-portal.ts:57-61`). The structural problem is only the `:root`/`kj.base` half
plus `density.css`'s `:root` block (`density.css:40-41`).

Note the *good* news, which should be preserved: because `@layer` statements merge
by name, a second copy re-declaring `@layer kj.reset, kj.base, kj.shared, kj.component;`
is a no-op — **layer ordering stays deterministic no matter which bundle loads
first**. That removes the load-order lottery that usually makes this scenario
hopeless; only the same-layer tie remains.

**Fix.**
1. Change `:root` → `:root, [data-kj-scope]` in `base.css` and `density.css`, and
   document `[data-kj-scope]` as the per-app mount attribute. An app that puts
   `data-kj-scope data-theme="dark"` on its own root element then owns its tokens
   and cannot be overwritten by a sibling's `:root` block (attribute selector beats
   `:root` on specificity).
2. Publish `@kouji-ui/themes` with the major version in the token prefix, or ship a
   `--kj-v` guard, so a value change can't be mistaken for the same token.
3. Add a documented "shell owns the tokens, remotes own nothing" mode: remotes
   import no theme CSS at all and inherit from the shell's scope.

**Effort:** M

---

### F-6 99 module-scope `InjectionToken`s — a shell's `provide*` call never reaches a remote on a different copy

**Severity:** high · **Confidence:** high
**Files:** 99 occurrences of `new InjectionToken` across `packages/core/src` and
`packages/components/src`; representative:
`packages/core/src/icon/icon.tokens.ts:12,26,57,71`,
`packages/core/src/locale/locale.config.ts:39`,
`packages/core/src/chat/chat-registry.ts:46`,
`packages/core/src/editor/editor.tokens.ts:28`,
`packages/core/src/chart/echarts.ts:45`,
`packages/core/src/table/table-storage.ts:74`

```ts
// packages/core/src/icon/icon.tokens.ts:26-29
export const KJ_ICON_REGISTRY = new InjectionToken<
  WritableSignal<Record<string, string>>
>('KJ_ICON_REGISTRY', {
  providedIn: 'root',
```

**Why it matters.** `InjectionToken` identity is **object identity**, not the
description string. Two copies of the module create two different objects that both
call themselves `'KJ_ICON_REGISTRY'`. Angular's DI does not deduplicate them and
does not warn — the injector simply misses and falls back to the token's
`providedIn: 'root'` factory. Failures are therefore **silent defaults**, not errors:

| Shell calls | Remote on a different copy gets instead | Visible symptom |
|---|---|---|
| `provideLucideIcons()` / `provideIcons(...)` | empty registry, then `KJ_ICON_RESOLVER` default `(name) => name` (`icon.tokens.ts:59`) | every icon renders as its literal name |
| `provideKjLocale({locale:'fr'})` | `KJ_LOCALE_CONFIG` default → Angular `LOCALE_ID` | dates/numbers/currency in the wrong locale, `isRtl` wrong |
| `provideKjTranslations(...)` | `KjTranslateService` with only `EN_CATALOG` (`translate.service.ts:56`) | ARIA strings + visible labels revert to English |
| `provideECharts(...)` | `KJ_ECHARTS` default `null` → `await import('echarts')` (`chart.ts:135`) | a second ~1 MB echarts download |
| `provideMonaco(...)` | `KJ_MONACO_CONFIG` default → CDN `@monaco-editor/loader` | a second Monaco, plus CDN egress the shell explicitly opted out of |
| `provideKjChat({renderers})` | `{ renderers: {} }` (`chat-registry.ts:48`) | custom chat item types render as plain text |
| `provideKjTableStorage(...)` | default localStorage adapter | see F-13 |
| `provideKjDocumentDirection()` | — (shell's effect still writes `<html dir>`) | see F-9 |

That is the full blast radius of the **29 exported `provide*` functions**
(`provideECharts provideIconLoader provideIconResolver provideIcons provideKjAlert
provideKjBreadcrumb provideKjButton provideKjChat provideKjChatBubble
provideKjDocumentDirection provideKjFilterParams provideKjInputMaskTokens
provideKjLink provideKjLocale provideKjPagination provideKjProgressBar
provideKjRichText provideKjSpinner provideKjTableStorage provideKjTabs provideKjTag
provideKjTextarea provideKjToastListStrategy provideKjToastSonnerStrategy
provideKjToastStrategy provideKjTranslations provideLucideIcons provideMonaco
provideMonacoLanguages`). Every one of them becomes a no-op across a copy boundary.

**Fix.**
1. **Document the contract**: `@kouji-ui/core` and `@kouji-ui/components` MUST be
   declared `singleton: true` in every federation config, and the shell must own
   every `provide*` call. This is the only real answer for token identity — there
   is no way to make two distinct `InjectionToken` objects equal.
2. **Make the failure loud.** Add a dev-mode `globalThis.__KJ_VERSIONS__` set that
   each copy pushes its version into on first load, and warn once in `ngDevMode`
   when the set size > 1, listing the versions. Ten lines, and it converts every
   symptom in the table above from "mysterious" to "one console line".
3. For the handful of tokens a shell genuinely wants to share across copies
   (icons, locale, translations), offer a documented escape hatch that reads from a
   well-known `globalThis` key rather than DI.

**Effort:** M (S for the fingerprint warning alone, which is the highest
value-per-line item in this report)

---

### F-7 Service-launched overlays escape their app's theme, density and direction scope

**Severity:** high · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/builder.ts:113-118`,
`packages/core/src/primitives/overlay/container.ts:19-28`,
`packages/core/src/primitives/overlay/strategies/mount/in-place.ts:12-18`
(contrast: `strategies/mount/body-portal.ts:13-21,57-61`)

```ts
// builder.ts:113-118 — no theme / density / dir propagation
const wrapperRef = createComponent(KjOverlayWrapper, { ... });
this.appRef.attachView(wrapperRef.hostView);
wrapperRef.changeDetectorRef.detectChanges();
getOverlayContainer()?.appendChild(wrapperRef.location.nativeElement);
```

```ts
// body-portal.ts:57-61 — the declarative path DOES do it
const theme = closestTheme(ctx.triggerEl() ?? originalParent);
if (theme) w.setAttribute('data-theme', theme);
else w.removeAttribute('data-theme');
```

**Why it matters.** F-5's recommended MFE pattern — and the pattern
`body-portal.ts` was written for — is "each app sets `data-theme` / `data-density` /
`dir` on **its own root element**". But `KjOverlayBuilder` appends every
service-launched overlay (dialog via `dialog.service.ts:35`, drawer
`drawer.service.ts:68`, sheet `sheet.service.ts:83`, toast
`toast.service.ts:openOverlay`, action-sheet) directly into the singleton
`.kj-overlay-container`, which lives at `document.body` level — **outside both apps'
root elements**. Those overlays therefore inherit `<html>`'s tokens, not their
owning app's. In a two-app page where the shell is light and the remote is dark,
every one of the remote's dialogs, drawers, sheets and toasts renders light. Same
for `[data-density]` and for RTL (`dir`) — a drawer that should slide from the right
in an Arabic remote slides from the left.

Also: `_root` is a module-level `let` (`container.ts:19`), so whether one container
or two exist on the page depends entirely on whether the bundler shared the module —
an invisible, config-dependent difference in DOM structure.

**Fix.**
1. Extract `closestTheme()` into a shared `inheritScope(from, to)` helper that
   copies `data-theme`, `data-density` and `dir` (and, once F-5 lands,
   `data-kj-scope`) — then call it from `KjOverlayBuilder.create()` using the
   launching injector's root element, not just from `bodyPortal`.
2. Convert `getOverlayContainer()` into a `providedIn: 'root'` `KjOverlayContainer`
   service over `DOCUMENT`/`PLATFORM_ID`, so each app deterministically owns one
   container it can scope, instead of the current "depends on your bundler".

**Effort:** M

---

### F-8 No z-index stratification seam — 20 hard-coded literals and one global `--kj-overlay-z-index`

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/overlay.css:18-23`,
`packages/components/src/dialog/dialog.css:9`, `drawer/drawer.css:16,56`,
`dropdown-menu/dropdown-menu.css:28`, `popover/popover.css:28`,
`confirm-popup/confirm-popup.css:22`, `color-picker/color-picker.css:32`,
`command-palette/command-palette.css:18,33`, `cascade-select/cascade-select.css:46,64`,
`combobox/combobox.css:48`, `select/select.css:63`,
`date-picker/date-picker.css:42`, `datetime-picker/datetime-picker.css:43`

```css
/* overlay.css:18-23 — the only tokenised one */
.kj-overlay-container {
  position: fixed; inset: 0;
  z-index: var(--kj-overlay-z-index, 1000);
  pointer-events: none;
}
```
```css
/* dialog.css:9 */            z-index: 1000;
/* drawer.css:56 */           z-index: 999;
/* select.css:63 */           z-index: 100;
/* command-palette.css:33 */  z-index: 1001;
```

**Why it matters.** Two apps produce two `.kj-overlay-container` elements (when the
module isn't shared), both at `z-index: 1000` on `document.body` — stacking then
falls to DOM insertion order, i.e. whichever app mounted first loses forever. App
B's modal dialog can render *beneath* app A's tooltip. And because the container
lives outside both apps' subtrees, an app-scoped `--kj-overlay-z-index` set on its
own root element never reaches it — there is no per-app override seam at all, only
the one global `:root` value.

The 20 literal z-indexes in component CSS compound this: they are also global (per
F-4) so they can't be re-based per app either.

**Fix.** Replace every literal with a `var(--kj-z-*, default)` token
(`--kj-z-dropdown`, `--kj-z-overlay`, `--kj-z-modal`, `--kj-z-toast`), give
`KjOverlayContainer` (F-7) an injectable base-z input, and document a shell-assigned
band per remote (shell 1000–1999, remote-a 2000–2999, …). Once the container is a
per-app injectable, this becomes a one-provider change for consumers.

**Effort:** S (tokens) + folded into F-7 for the container

---

### F-9 `provideKjDocumentDirection()` claims to be "the single writer of `<html dir>`" — two apps make that false

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/locale/document-direction.ts:18-19,41-58`,
`packages/core/src/primitives/directionality/directionality.ts:55-72,81-88`

```ts
// document-direction.ts:18-19 (TSDoc) — true per app, false per page
 * This is the single writer of `<html dir>`; {@link KjDirectionality} stays the
 * *reader* that feeds `KjLocale`'s `'auto'` derivation.

// document-direction.ts:50-56
effect(() => {
  const dir = locale.direction();
  const html = doc.documentElement;
  if (html.getAttribute('dir') !== dir) html.setAttribute('dir', dir);
});
```

**Why it matters.** Both apps registering this provider both write `<html dir>`;
the last effect to run wins, and the loser's `KjDirectionality` MutationObserver
(`directionality.ts:59-69`) dutifully picks up the *other* app's value. An Arabic
remote inside an English shell renders LTR (or flips the entire shell to RTL),
depending on bootstrap order. It does not oscillate — each effect depends only on
its own `locale.direction()` — so the breakage is quiet and order-dependent, which
makes it harder to diagnose than a loop would be. There is no *technical* conflict
with two apps having genuinely different directions: `dir` is inheritable and
`KjLocale.setDirection()` already supports an explicit per-app value; the problem is
purely that the write target is `<html>` rather than the app's own root, and that
`KjDirectionality.read()` (`directionality.ts:81-88`) only ever consults
`documentElement` / `body`.

**Fix.** Add `provideKjDirectionScope(elementRefOrSelector)` that writes `dir` onto
the app's own root element instead of `documentElement`, and make
`KjDirectionality.read()` walk up from the injecting element
(`element.closest('[dir]')`) rather than reading `documentElement`/`body`. Keep
`provideKjDocumentDirection()` for the single-app case and add a TSDoc note that it
must be registered by exactly one app per page.

**Effort:** M

---

### F-10 Live-region registry is a module-level map appended to `document.body`

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/primitives/overlay/strategies/live-announcer/_announce.ts:15-28,30-35`

```ts
const regions: Partial<Record<KjLivePoliteness, HTMLElement>> = {};

const ensureRegion = (politeness: KjLivePoliteness): HTMLElement => {
  let region = regions[politeness];
  if (region) return region;
  region = document.createElement('div');
  region.setAttribute('data-kj-live-region', politeness);
  ...
  document.body.appendChild(region);
```

**Why it matters.** Three problems, in descending order:
- **Two copies → two `[data-kj-live-region="polite"]` nodes** on `document.body`.
  Screen readers track every live region on the page; two toasts firing near
  simultaneously from two apps can interleave or drop announcements, and there is no
  way for an app to label its region (`aria-label` / app name) so the user can tell
  which app is speaking.
- **No `isConnected` re-check** (unlike `container.ts:23`, which does have one), so
  if anything removes the node the announcer goes permanently silent.
- **SSR:** the guard is `typeof document === 'undefined'` (`:31`), not `PLATFORM_ID`.
  Under a DOM shim, `regions` is process-global and retains DOM across requests.

**Fix.** Convert to a `providedIn: 'root'` `KjLiveAnnouncer` over
`DOCUMENT`/`PLATFORM_ID` that owns its own pair of regions (per app), tags them with
`APP_ID`, and re-creates on `!isConnected`. Same refactor shape as F-3 and F-7 —
land them together.

**Effort:** S

---

### F-11 Command palette focuses by global `document.querySelector`

**Severity:** medium · **Confidence:** high
**Files:** `packages/components/src/command-palette/command-palette.ts:266-273`

```ts
effect(() => {
  if (!this.kjOpen()) return;
  if (!isPlatformBrowser(this.platformId)) return;
  queueMicrotask(() => {
    document.querySelector<HTMLInputElement>('.kj-command-palette__dialog .kj-command-palette__input')?.focus();
  });
});
```

**Why it matters.** `document.querySelector` returns the **first** match in the
whole document. Two apps each mounting a command palette (a near-certainty — both
will bind `mod+k`, see F-2) means app B opening its palette focuses **app A's**
input. The user types into an invisible or unrelated field. It also fails inside a
single app if a palette is ever rendered twice (e.g. a docs page showing the
example). Everything needed to do this correctly is already in scope — the
component has its own `ElementRef` and could use a `viewChild`.

**Fix.** `viewChild<ElementRef<HTMLInputElement>>('input')` on the panel component
and `.nativeElement.focus()`, or scope the query to the overlay wrapper this
controller owns (`controller.panelEl()?.querySelector(...)`).

**Effort:** S

---

### F-12 Stale required `@angular/cdk` peer dep, and a hard `^22.0.0` Angular pin with no mixed-major story

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/package.json` (peerDependencies, description, keywords),
`packages/components/package.json` (peerDependencies), `rules/stack.md`

```jsonc
// packages/core/package.json — peerDependencies
"@angular/common": "^22.0.0",
"@angular/core":   "^22.0.0",
"@angular/cdk":    "^22.0.0",      // ← zero imports anywhere in the source
"@angular/forms":  "^22.0.0",
```

`grep -rn "from '@angular/cdk" packages/*/src` → **0 matches**. A case-insensitive
`cdk` grep over all `.ts`/`.html` in both packages returns nothing outside docs
prose. `rules/stack.md` says plainly: "**Zero external UI deps** — No Angular CDK."
Yet the package `description` still says "directives over CDK" and `keywords` lists
`"cdk"`.

**Why it matters for MFE.**
- Every federation config has to negotiate `@angular/cdk` as another shared
  singleton — a version constraint that can *block* an otherwise-valid pairing —
  for a dependency the library never loads. It also forces every consumer to
  install ~1 MB they don't use.
- The `^22.0.0` pin on `@angular/core` is the real coupling. Angular is not
  designed for two majors on one page: `@angular/core` must be
  `singleton: true, strictVersion: true` or you get duplicated DI, duplicated
  `ApplicationRef`, and hydration corruption. So **a remote on kouji-ui (Angular 22)
  cannot coexist with a remote on Angular 21** except through hard isolation
  (iframes, or true custom-element boundaries with separate platform instances) —
  and the library offers no custom-element build (`createCustomElement` /
  `@angular/elements` appears nowhere in the repo). This is a legitimate design
  position, but it is undocumented, and it is the *first* thing an MFE adopter needs
  to know.
- Widening the peer to `>=21 <23` is cheap insurance if a CI matrix confirms it —
  a narrow pin buys nothing and costs pairings.

**Fix.**
1. Drop `@angular/cdk` from both `peerDependencies`; remove `"cdk"` from
   `keywords` and "over CDK" from `description`.
2. Widen the Angular peer range to the real verified floor, backed by a CI matrix
   build.
3. Add a `MICRO-FRONTENDS.md` stating the contract plainly: Angular must be a
   strict-version singleton; `@kouji-ui/*` should be a singleton; if you cannot
   guarantee that, the supported isolation boundary is X.

**Effort:** S

---

### F-13 Table state persists to `localStorage` with an empty default key prefix

**Severity:** medium · **Confidence:** high
**Files:** `packages/core/src/table/table-storage.ts:25-40,49-52,59-62`,
`packages/components/src/table/table.ts:615-616,853-855,868-870`

```ts
// table-storage.ts:50-52
export function localStorageAdapter(opts: LocalStorageAdapterOptions = {}): KjStorageAdapter {
  return wrap(safeLocal, opts.keyPrefix ?? '');      // ← default: no prefix at all
}
// table-storage.ts:59-61 — and this is the DEFAULT when nobody provides one
function defaultAdapter(): KjStorageAdapter {
  return safeLocal() ? localStorageAdapter() : inMemoryAdapter();
}
```
```ts
// components/src/table/table.ts:615, 853-855
readonly kjStorageKey = input<string | null>(null);
const key = this.kjStorageKey();
const adapter = this.kjStorageAdapter() ?? this.tokenStorage;
```

**Why it matters.** `localStorage` is per-origin, and all MFEs on a page share one
origin. The default adapter writes `localStorage[kjStorageKey]` with no namespace.
Two apps each with a table keyed `"users"` — an entirely natural choice — read and
write the same record. App A's column pinning, sort and filter state silently
overwrite app B's, and a schema change between library versions makes the JSON
unparseable for the other app (handled — `JSON.parse` is try/caught at `:32` — but
the state is then silently lost). Per F-6, a shell's `provideKjTableStorage()` with
a prefix does not reach a remote on a different copy, so the *default* is what most
MFE setups actually get.

**Fix.** Default `keyPrefix` to `kj.${APP_ID}.` (via an injection-context-aware
default factory rather than the free function), and document `keyPrefix` as
mandatory for multi-app pages. `defaultAdapter()` at `:59` is the one place to
change.

**Effort:** S

---

### F-14 Duplicated payload: non-peer bundled deps and a module-cached 300 KB icon map

**Severity:** low · **Confidence:** high
**Files:** `packages/components/src/icon/lucide/provide-lucide-icons.ts:8,47-59,98-105`,
`packages/core/package.json` (`dependencies: @tanstack/angular-table`),
`packages/core/ng-package.json` (`allowedNonPeerDependencies`),
`packages/components/package.json` (`dependencies: @tanstack/virtual-core, marked`),
`packages/components/src/chat/markdown.ts:1`

```ts
// provide-lucide-icons.ts:8,47-50
import * as lucideIcons from 'lucide-static';          // static, whole set
/** Lazily build the kebab-name → encoded-data-url map once per app. */
let _registryEntries: Record<string, string> | null = null;
function buildLucideRegistry(): Record<string, string> {
  if (_registryEntries) return _registryEntries;
```
```ts
// components/src/chat/markdown.ts:1
import { marked, type Token, type TokensList } from 'marked';   // static
```

**Why it matters.** The shared-dependency picture splits cleanly:

| Dep | How it loads | Dedupable in federation? |
|---|---|---|
| `echarts` | `await import('echarts')` (`chart.ts:135`), overridable via `provideECharts` | yes — lazy + DI seam |
| `monaco-editor` | `await import('@monaco-editor/loader')` (`editor.loader.ts:63`), overridable via `provideMonaco` | yes |
| `lexical` + `@lexical/*` | `await import('./engine')` (`rich-text-editor.ts:224`) — the only value imports live inside that lazy chunk (`engine.ts:37-39`) | yes |
| `@tanstack/angular-table` | **`dependencies`** of core, listed in `allowedNonPeerDependencies` — bundled into the FESM | no — ships twice |
| `@tanstack/virtual-core` | **`dependencies`** of components | no — ships twice |
| `marked` | **`dependencies`** of components, static import at `markdown.ts:1` | no — ships twice, eagerly |
| `lucide-static` | peer, but a **static namespace import** of the whole set (`~300 KB gzipped`, per the file's own TSDoc at `:68`) | no — ~600 KB for two apps |

Plus `_registryEntries` is a module-level memo — per copy, so the 300 KB decode work
also runs twice.

The three heavy editors are handled well and should be held up as the pattern; the
fix is to move the other four to the same shape.

**Fix.** Promote `@tanstack/angular-table`, `@tanstack/virtual-core` and `marked` to
`peerDependencies` (with `peerDependenciesMeta.optional` where the feature is
opt-in) so a federation `shared` block can dedupe them. Make `markdown.ts` load
`marked` via `await import('marked')` behind a `KJ_MARKDOWN_PARSER` token, matching
`KJ_ECHARTS`. For lucide, offer `provideLucideIcons({ subset: [...] })` and move
`buildLucideRegistry`'s memo onto the registry service so it is per-injector.

**Effort:** M

---

### F-15 Zone-agnostic (a strength) but document listeners and observers scale per-instance

**Severity:** low · **Confidence:** medium
**Files:** `packages/core/src/primitives/interaction/focus-ring.ts:46-47`,
`packages/core/src/a11y/focus-trap.ts:62`, `packages/core/src/chart/chart.ts:190-197`,
`packages/components/src/editor/editor.ts:136-139`

Verified absences: zero `NgZone`, zero `runOutsideAngular`, zero `zone.js` imports,
zero `markForCheck`, and only three `detectChanges()` calls
(`menubar-item.ts:169`, `builder.ts:117`, `table-cell-editor-outlet.ts:100`), all on
a specific `ComponentRef`/view rather than the app. State is `signal`/`computed`/
`effect` throughout. **The library is genuinely safe in a zone-based host and a
zoneless one**, which is a real MFE prerequisite and worth stating explicitly in the
README — it means a zoneless shell can host a zone-based remote using kouji-ui, and
vice versa, without the library caring.

The cost side: `KjFocusRing` adds two capture-phase `document` listeners **per
instance** (`:46-47`) and is composed via `hostDirectives` in 35 directives across
31 files. In a zone-based host, zone.js patches `addEventListener`, so every
keystroke anywhere on the page schedules one tick per listener. Two apps × hundreds
of focusable elements makes this measurable. `chart.ts:192` and `editor.ts:138` each
also attach a `MutationObserver` to `document.documentElement` per instance — a
20-chart dashboard in each of two apps is 40 observers on the same node, all firing
on every theme toggle.

Confidence is medium because the perf claim is reasoned from the code, not measured.

**Fix.** Hoist to root-provided singletons: one `KjInputModality` service (one
listener pair, one signal, every focus ring reads it — folds into F-2's fix) and one
`KjThemeObserver` service exposing a `themeVersion` signal that charts/editors read
in a `computed`. Document the zone-agnostic guarantee in the README.

**Effort:** M

---

## MFE hardening plan / recommended work items

Ordered by blast radius — how much of the page each one corrupts, and how silently.

1. **[F-6] Ship the duplicate-copy fingerprint warning, today.** A
   `globalThis.__KJ_VERSIONS__` set + a one-time `ngDevMode` console warning listing
   every loaded version. ~10 lines. It does not fix anything, but it converts every
   other finding in this report from "mysterious behaviour" to "one console line",
   and it is the only item here that is free. *(high, S)*
2. **[F-1] Unify id minting and seed it from `APP_ID`.** Route the ~41 module
   counters through `KjId` (two of the 44 grep hits are scroll-lock refcounts, not
   ids — see F-3), make `mint()` emit `kj-<appId>-<prefix>-<n>`, add a lint rule
   banning module-scope counters. Note `KjId` itself is the *more* fragile half: it
   is per root injector, so it collides even under a shared singleton copy.
   *(medium, M)*
3. **[F-2] Decide the cross-app Escape/hotkey contract.** A `window`-level shared
   stack + hotkey registry, or a documented statement that multi-app overlay
   coordination is out of scope (fold into item 6). Do **not** origin-check
   `e.target` — Escape after a backdrop click belongs to neither app. The focus-trap
   and focus-ring items from the original finding were refuted and are dropped.
   *(low, M)*
4. **[F-3, F-7, F-10] One "kill the module globals" pass over the overlay
   primitive.** Convert `container.ts`'s `_root`, `_announce.ts`'s `regions`, and
   both scroll-lock refcounts into `providedIn: 'root'` services over
   `DOCUMENT` + `PLATFORM_ID`; collapse the two scroll-lock counters into one
   `KjScrollLock` with a `data-kj-scroll-lock` depth attribute so separate copies
   still coordinate; extract `closestTheme` into `inheritScope()` and call it from
   `KjOverlayBuilder.create()` so service-launched overlays keep their app's theme,
   density and direction. All four share one refactor shape — do them together.
   Also fixes the SSR cross-request retention they share. *(high, M)*
5. **[F-11] Replace the command palette's `document.querySelector` with a
   `viewChild`.** Two lines, removes a guaranteed cross-app focus bug. *(medium, S)*
6. **[F-12] Drop the phantom `@angular/cdk` peer; widen the Angular peer range;
   write `MICRO-FRONTENDS.md`.** The doc states the contract: Angular as a
   strict-version singleton, `@kouji-ui/*` as a singleton, the shell owns every
   `provide*` call, one app owns `<html dir>`, assign z-index bands per remote.
   Cheap, and it is what an adopter reads first. *(medium, S)*
7. **[F-13] Namespace the default table storage key with `APP_ID`.** One line in
   `defaultAdapter()`. *(medium, S)*
8. **[F-8] Tokenise every z-index** (`--kj-z-dropdown/-overlay/-modal/-toast`) and
   give the new `KjOverlayContainer` an injectable base-z. Folds naturally into
   item 4. *(medium, S)*
9. **[F-5] Scope the theme tokens.** `:root` → `:root, [data-kj-scope]` in
   `base.css` and `density.css`; document `[data-kj-scope]` as the per-app mount
   attribute; document the "shell owns the tokens, remotes import no theme CSS"
   mode. *(high, M)*
10. **[F-9] Add `provideKjDirectionScope()`** writing `dir` to the app root, and make
    `KjDirectionality` read via `element.closest('[dir]')`. Correct the "single
    writer" TSDoc at `document-direction.ts:18`. *(medium, M)*
11. **[F-4] Decide the encapsulation strategy — the one genuinely large item.**
    Either version-scope the global selectors via a build-time `data-kj-v` attribute,
    or move to `Emulated` per `rules/code_style.md`. Until then, `singleton: true`
    on `@kouji-ui/components` is load-bearing and must be documented as such
    (item 6). *(high, L)*
12. **[F-14] Move `@tanstack/*` and `marked` to peer deps; lazy-load `marked` behind
    a token; offer a lucide subset and make its memo per-injector.** *(low, M)*
13. **[F-15] Hoist the per-instance `document` listeners and `MutationObserver`s
    into root services; document the zone-agnostic guarantee.** Largely subsumed by
    item 3. *(low, M)*

## Open questions

1. **Is MFE actually a supported target, or a hypothetical?** This is the same
   question `reports/review/01-overlay.md:515` raises. The answer changes the grade
   materially: as a single-app library, F-1/F-2/F-6 are non-issues and the grade is
   a B. As an MFE-capable library, they are release blockers. Nothing in
   `rules/*.md`, the READMEs or the package metadata takes a position.
2. **Which federation flavour?** Module Federation with `singleton: true` on
   `@kouji-ui/*` makes F-4, F-5, F-6 and half of F-1 disappear for free, and makes
   F-2, F-3 and F-7 *worse* (one shared container, one shared stack, all apps'
   overlays interleaved in it). Independent copies make the opposite trade. The
   hardening plan differs enough that this should be decided before item 4 is
   written.
3. **Is a web-component (`@angular/elements`) distribution on the roadmap?** It is
   the only route that survives two Angular majors on one page. Nothing in the repo
   references `createCustomElement`, and it would interact badly with
   `ViewEncapsulation.None` (F-4) — shadow DOM would break the global stylesheets
   the whole components package depends on.
4. **Who owns `<html>` in the intended topology?** Four separate mechanisms write or
   read it: `provideKjDocumentDirection` (`dir`), both scroll locks (`style.overflow`,
   `style.paddingRight`), `KjDirectionality`'s MutationObserver, and
   `chart.ts`/`editor.ts`'s theme observers on `documentElement`. If the answer is
   "the shell, exclusively", several findings collapse into "remotes must not call
   these providers" — a doc fix rather than a code fix.
5. **What is the intended `data-theme` mount point?** `bodyPortal`'s `closestTheme`
   walk (`body-portal.ts:13-21`) implies "an arbitrary subtree element", but
   `themes/src/base.css:29` writes tokens at `:root` and the docs app sets the
   attribute on `documentElement` (`apps/docs/src/app/services/theme.service.ts:96`).
   These are two different contracts and F-5's fix depends on which one is real.
6. **Was `body[data-kj-scroll-lock="true"]` (`popover.css:60`) ever wired?** Nothing
   in either package sets that attribute. Its comment describes exactly the
   cross-copy coordination mechanism F-3 recommends building — was it removed, and
   if so, why?
