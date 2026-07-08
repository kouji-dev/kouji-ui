# KjEditor — Monaco-wrapped code editor (design)

Date: 2026-07-07 · Branch: `feat/code-editor`

## Goal

Ship a reusable **code editor** to the library, wrapping [Monaco](https://microsoft.github.io/monaco-editor/) (VS Code's editor) with the engine-wrap pattern used by `KjChart` (ECharts) and the table (TanStack):

- **Core** `@kouji-ui/core/src/editor/` — headless `KjEditor` directive + `KjEditorLoader` service. No CSS, SSR-safe, browser-only Monaco loaded via a **configurable** async loader.
- **Components** `@kouji-ui/components/src/editor/` — styled `<kj-editor>` with a toolbar/status bar, kj-theme-synced Monaco theme, reduced-motion, loading spinner.

## Prior art & premise (important)

Monaco is **already** present in `origin/main`:

- `monaco-editor@^0.55.1` and `@monaco-editor/loader@^1.7.0` are already root `dependencies`.
- `apps/docs` has an **app-internal, read-only-oriented** code viewer: `apps/docs/src/app/services/monaco.service.ts` (lazy CDN loader) + `apps/docs/src/app/components/code-editor/code-editor.ts` (`kj-code-editor`). It is **not exported** from any library package.

Decision (coordinator-approved): **the library `KjEditor` genuinely does not exist** — proceed. **Generalize/extract** the docs prior art into proper library packages rather than greenfield or reinvent. Do **not** re-add the deps (already root deps) and do **not** re-solve the esbuild worker problem — the `@monaco-editor/loader` CDN path the docs already use avoids it. Migrating the docs app onto the new library component is a **follow-up**, not part of this PR.

## SSR + worker strategy (the "hard part", and why it's already solved)

Monaco is browser-only, ~MBs, and uses **web workers** for language services. Two ways to load it:

1. **Bundle `monaco-editor` via esbuild** (`@angular/build:application`). Requires wiring `self.MonacoEnvironment.getWorker` to worker bundle URLs and keeping Monaco out of the base bundle (bundle-budgets CI on main). This is fiddly under esbuild.
2. **AMD loader (`@monaco-editor/loader`)** — `loader.init()` injects Monaco (and its workers) from a CDN (`jsdelivr` by default) at runtime. **No esbuild worker wiring, zero base-bundle weight** (only the tiny loader is imported; Monaco itself is fetched lazily on first use). This is exactly what the docs app already does successfully.

**We use approach 2 as the default**, but make the source **configurable** (below) so a consumer can point at a self-hosted/bundled Monaco (approach 1) without us hard-locking them to a CDN — a library must not force a CDN.

**SSR safety:** Monaco touches `window`/`document`/workers. All Monaco work is gated behind `afterNextRender` + `isPlatformBrowser` guards (mirrors `KjChart`). The server renders only the host element + a loading region; the editor mounts post-hydration.

**Base-bundle safety:** `monaco-editor` and `@monaco-editor/loader` are **optional `peerDependencies`** of `@kouji-ui/core` (exactly like `echarts` for `KjChart`). Core imports `monaco-editor` **as a type only** (`typeof import('monaco-editor')`) — no runtime edge — and imports `@monaco-editor/loader` **dynamically** (`import('@monaco-editor/loader')`) inside the default loader, so it lands in its own lazy chunk, never the base bundle.

## Configurable Monaco source (design)

Core exposes a DI token + `provide*` function so the Monaco source is swappable.

```ts
// editor.tokens.ts
export type KjMonaco = typeof import('monaco-editor');
export type KjMonacoLoaderFn = () => Promise<KjMonaco>;

export interface KjMonacoConfig {
  /** Custom loader — return a ready Monaco namespace. Wins over `vsPath`. */
  loader?: KjMonacoLoaderFn;
  /** Override the AMD `vs` base URL (self-host instead of the default CDN). */
  vsPath?: string;
}

export const KJ_MONACO_CONFIG = new InjectionToken<KjMonacoConfig>('KJ_MONACO_CONFIG');
```

```ts
// editor.providers.ts
export function provideMonaco(config: KjMonacoConfig = {}): EnvironmentProviders;
```

`KjEditorLoader` (root service) resolves Monaco **once** (memoised promise):

1. If `config.loader` → use it (self-hosted/bundled Monaco, approach 1).
2. Else dynamically `import('@monaco-editor/loader')`, optionally `loader.config({ paths: { vs: config.vsPath } })`, then `loader.init()` (approach 2, default CDN).

This makes the whole thing **unit-testable**: tests `provideMonaco({ loader: () => Promise.resolve(fakeMonaco) })` with a stub Monaco that records `create`/`setValue`/`dispose` — no real DOM/workers needed.

## Core API — `KjEditor` directive (`[kjEditor]`)

Headless. Two-way value via `model()`. All public bindings `kj`-prefixed (repo rule).

| Binding | Kind | Default | Purpose |
|---|---|---|---|
| `kjValue` | `model<string>` | `''` | Two-way editor text. External writes push into the model; typing pushes out. |
| `kjLanguage` | `input<string>` | `'plaintext'` | Monaco language id (`typescript`, `javascript`, `html`, `css`, `json`, `markdown`, `python`, …). |
| `kjReadonly` | `input<boolean>` | `false` | Read-only mode. |
| `kjMinimap` | `input<boolean>` | `false` | Minimap on/off. |
| `kjLineNumbers` | `input<'on'\|'off'\|'relative'>` | `'on'` | Gutter line numbers. |
| `kjWordWrap` | `input<'on'\|'off'>` | `'off'` | Soft wrap. |
| `kjFontSize` | `input<number>` | `13` | Font size (px). |
| `kjTheme` | `input<string \| undefined>` | `undefined` | Explicit Monaco theme id; overrides auto light/dark. |
| `kjAriaLabel` | `input<string>` | `'Code editor'` | Accessible name (Monaco `ariaLabel` + host `aria-label`). |
| `kjOptions` | `input<KjEditorOptions>` | `{}` | Escape hatch — merged last into `editor.create` options. |
| `kjReady` | `output<editor>` | — | Emits the `IStandaloneCodeEditor` once created (imperative access). |

Methods: `focus()`, `layout()`, `getEditor()`. Dispose on `DestroyRef.onDestroy`.

Reactivity (signals/effects, mirrors docs prior art):
- external `kjValue` change → `model.setValue` only when it differs (guards typing feedback loop).
- `kjLanguage` change → `monaco.editor.setModelLanguage`.
- `kjReadonly/kjMinimap/kjLineNumbers/kjWordWrap/kjFontSize/kjOptions` change → `editor.updateOptions`.

## Components API — `<kj-editor>` (`KjEditorComponent`)

Styled wrapper hosting the `KjEditor` directive on an inner host `<div>`. Forwards all `kj*` inputs. Adds:

- **Toolbar** (optional, `kjShowToolbar`): language badge + copy button (reuses copy pattern from docs viewer).
- **Status bar** (optional, `kjShowStatusBar`): line/column + a persistent, dismissible **a11y hint** ("Press Ctrl+M to toggle Tab trapping").
- **Loading region**: `kj-spinner` inside `role="status" aria-live="polite"` until Monaco mounts.

### Theming — kj tokens → Monaco theme

Approach (extends the docs approach, adds an actual defined Monaco theme + re-apply on switch):

1. On mount, read the computed `--kj-*` surface tokens off the host (`getComputedStyle`): `--kj-bg-surface`, `--kj-fg-default`, `--kj-fg-muted`, `--kj-bg-primary`, selection color, etc.
2. Compute the **scheme** from the background's relative luminance (theme-agnostic — works for any of the 13 kj themes without a hardcoded name→scheme map). `defineTheme('kj-editor', { base: dark?'vs-dark':'vs', inherit: true, colors: { 'editor.background': …, 'editorLineNumber.foreground': …, 'editor.selectionBackground': …, … } })` then `setTheme('kj-editor')`. Syntax token colors inherit from `vs`/`vs-dark` (playground-quality highlighting); only editor chrome is re-tinted to kj tokens.
3. **Re-apply on theme switch** via a `MutationObserver` on `document.documentElement` watching `data-theme` (mirrors the chart-palette re-theming pattern) — recompute tokens, redefine, `setTheme`. Cleaned up on destroy.

CSS also pierces (`::ng-deep`) Monaco's uncontrolled DOM for background/gutter/scrollbar/cursor to match kj tokens (carried over from the docs viewer).

### Reduced motion

`matchMedia('(prefers-reduced-motion: reduce)')` → when reduced, editor options `cursorBlinking:'solid'`, `cursorSmoothCaretAnimation:'off'`, `smoothScrolling:false`. Reacts to the media-query `change` event.

## Accessibility (WCAG 2.1 AAA)

- **Name/Role/Value (4.1.2)**: `kjAriaLabel` → Monaco `ariaLabel` option **and** host `aria-label`. Monaco's textarea is a labelled multiline text field.
- **Accessibility support**: `accessibilitySupport: 'auto'` (Monaco auto-detects a screen reader and switches to an accessible rendering). Consumers may force `'on'` via `kjOptions`. `accessibilityPageSize` left at Monaco default.
- **Keyboard / tab-trap escape (2.1.1, 2.1.2 No Keyboard Trap)**: Monaco traps `Tab` for indentation. The documented escape is **`Ctrl+M`** (`editor.action.toggleTabFocusMode`) which flips Tab to move focus instead. We (a) keep that binding, (b) surface a persistent status-bar hint naming it, and (c) expose `kjTabFocusMode` to start in focus-moves-out mode. `Alt+F1` opens Monaco's accessibility help. This satisfies "no keyboard trap".
- **Contrast (1.4.6 AAA)**: editor chrome uses kj tokens (already AAA-tuned per theme); syntax colors from Monaco's vs/vs-dark.
- **Motion (2.3.3)**: reduced-motion handling above.
- **Status (4.1.3)**: loading region is `role="status" aria-live="polite"`.

## Scope

**Shipping:** syntax highlighting for common languages; two-way `kjValue`; `kjLanguage`; options (`kjReadonly`, `kjMinimap`, `kjLineNumbers`, `kjWordWrap`, `kjFontSize`, `kjOptions`); configurable Monaco source (`provideMonaco`); kj-theme-synced Monaco theme with re-apply on switch; reduced-motion; SSR-safe init; AAA a11y incl. tab-trap escape; docs page + examples; unit tests via a stub loader.

**Deferred (follow-ups):** multi-model/diff editor; IntelliSense config surface; migrating the docs `kj-code-editor` onto the library component; per-language worker fine-tuning for the self-hosted/bundled path (documented, not wired).

## Testing

- **Unit** (vitest + jsdom): `provideMonaco({ loader: fakeMonaco })`; assert value binding (external set + typing round-trip), language switch, option updates, dispose-on-destroy, aria-label, `provideMonaco` wiring. Core directive + components wrapper.
- **E2E** (Playwright vs. static-served prod build): open the editor docs page, assert the editor mounts and highlights. If the docs don't hydrate in the sandbox / chromium is unavailable, fall back to a **prerender-markup assertion** (host + loading region present in SSR HTML) and commit the spec for CI. Never fake.

## Files

```
packages/core/src/editor/
  editor.ts              # KjEditor directive
  editor.loader.ts       # KjEditorLoader service (memoised Monaco resolve)
  editor.tokens.ts       # KJ_MONACO_CONFIG token + types
  editor.providers.ts    # provideMonaco()
  editor.types.ts        # KjMonaco, KjEditorOptions, language type
  editor.spec.ts
  index.ts
packages/components/src/editor/
  editor.ts              # KjEditorComponent (<kj-editor>)
  editor.html
  editor.css
  editor.spec.ts
  _examples/…            # docs examples + barrel
  index.ts
```

---

## Update — docs migration, API polish, lazy language loading

### Docs migrated onto the library (prior art retired)

The docs app now renders **every** code viewer with the library `<kj-editor>`; the
docs-internal editor is deleted:

- **Deleted**: `apps/docs/src/app/services/monaco.service.ts`,
  `apps/docs/src/app/components/code-editor/{code-editor.ts,.html,.css}`.
- **Repointed** to `KjEditorComponent` (`@kouji-ui/components`):
  `components/code-preview` (3 code-panel usages), `pages/component-doc`
  (usage walkthrough + `.usage-editor kj-editor` CSS), `pages/getting-started`
  (6 install/quick-start snippets).

This dogfooding drove the API additions below (a fixed-height editor didn't fit
read-only snippet viewers that must size to content).

### Final public API

**Core directive `[kjEditor]` / component `<kj-editor>`** inputs:
`kjValue` (two-way), `kjLanguage` (`KjEditorLanguage` — friendly names + open
string, short aliases like `ts`/`md`/`sh` normalised), `kjReadonly`,
`kjMinimap`, `kjLineNumbers`, `kjWordWrap`, `kjFontSize`, **`kjAutoHeight`**
(grow to fit content), **`kjMaxHeight`** (cap for auto-height), `kjTheme`,
`kjAriaLabel`, `kjTabFocusMode`, `kjOptions` (documented advanced escape hatch —
the only place a Monaco type surfaces). Output `kjReady` (advanced imperative
access). Component adds `kjShowToolbar` / `kjShowStatusBar`.

`KjEditorLanguage` is the kj-level language abstraction so callers never import a
Monaco type just to pick a language.

**Providers**: `provideMonaco({ loader?, vsPath? })` (configurable source, CDN
default) and **`provideMonacoLanguages({ id: () => import(...) })`** (below).

### Lazy language-module loading

Languages are heavy, so loading is first-class and on-demand:

- `provideMonacoLanguages(loaders)` registers per-language lazy loaders keyed by
  (normalised) id, `multi` so several calls compose.
- `KjEditorLoader.ensureLanguage(id)` runs the matching loader **once** (memoised)
  and is awaited by the editor **before** create and before any language switch —
  so a language's grammar downloads only when an editor first uses it.
- With the default CDN Monaco every language is already bundled, so registering
  loaders is optional (a missing id falls back to the built-in language). The
  mechanism pays off for the lean/self-hosted `provideMonaco({ loader })` path,
  where you register only:
  ```ts
  provideMonacoLanguages({
    python: () => import('monaco-editor/esm/vs/basic-languages/python/python.contribution'),
  })
  ```

### E2E outcome (updated)

Run against the static prerendered prod build (`playwright.prod.config.ts` +
`apps/docs/e2e/static-server.mjs`): **3 passing**, now including **live** Monaco
assertions — `getting-started` mounts **6** live `.monaco-editor` instances via
the library `<kj-editor>`, and the button doc's usage walkthrough mounts a live
editor. The editor component's own auto-generated example-preview page (demos
created via `ViewContainerRef.createComponent`) does not re-hydrate its live
previews in this headless sandbox; that page falls back to a served-markup
assertion. All migrated static usages hydrate and render Monaco correctly.

### Accessible name on read-only editors

Read-only Monaco renders no editable `.inputarea`; the accessible name from
`kjAriaLabel` lands on the `[kjEditor]` host (`aria-label`). Editable editors
also expose it on Monaco's `.inputarea`. Tab-trap escape (`Ctrl+M`) unchanged.
