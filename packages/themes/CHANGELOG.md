# @kouji-ui/themes

## 0.1.0

### Minor Changes

- 509c90c: feat(chart): KjChart — ResizeObserver, prefers-reduced-motion, theme palette via `--kj-chart-1..6` (alias to intent tokens in all 13 themes), `kjChartDescription` + `aria-describedby`, `*kjChartTableFallback` for screen-reader tables, event outputs (`kjChartClick`, `kjChartLegendSelect`, `kjChartReady`), `[kjChartLoading]`, `exportAs="kjChart"` with `resize/dispatchAction/getOption`. 8 examples wired through the example registry; auto-discovered docs page at `/docs/chart`.
- 509c90c: feat(core): motion preset library + shared reduced-motion service.
  - `KjReducedMotion` (`providedIn: 'root'`) exposes an SSR-safe
    `prefersReducedMotion` signal derived from `matchMedia`, updating live when
    the OS setting flips.
  - Named, composable CSS motion presets shipped as `@kouji-ui/core/motion/motion.css`
    (`fade`, `slide-up/down/left/right`, `scale`, `slide-up-fade`, `scale-spring`)
    with matching entrance/exit keyframes, keyed off `--kj-motion-*` custom props.
  - `KjMotion` directive (`[kjMotion]`) applies a named preset + enter/exit state
    to any element and surfaces the `reduced()` signal.
  - Every preset collapses to a ~1ms opacity fade with no transform under
    `prefers-reduced-motion: reduce` (WCAG 2.1 AAA 2.3.3).

  themes: adds `--kj-motion-duration-*`, `--kj-motion-ease*`, and
  `--kj-motion-distance` tokens (plus base duration/easing primitives) so presets
  are retunable per theme.

## 0.0.6

### Patch Changes

- 625e81a: Add three new themes: `retro`, `cyberpunk`, `corporate`.
  - **retro** — warm cream surfaces with terracotta + sand accents, soft rounding (vintage paper feel).
  - **cyberpunk** — hot yellow base with magenta/cyan accents, hard edges and mono type.
  - **corporate** — clean white surfaces, blue primary, subtle rounding (calm, business-ready).

  Each theme defines every required shared-layer token, verified by the contract test in `themes.spec.ts`. Activate via `data-theme="retro"` (or `cyberpunk` / `corporate`) on the `<html>` element.

- 9acdb07: Add Wave 2 Batch 8 components plus cross-cutting fixes and version bump to 0.0.5.

  ## New components in `@kouji-ui/core` + `@kouji-ui/components`

  **Data input**
  - `<kj-input-group>` + `<kj-input-group-addon>` — flex addon wrapper joining inputs with prefix/suffix addons into a single visually-unified field with `aria-labelledby` composition
  - `<kj-input-mask>` — fixed-format input (phone, card, date, custom token alphabet) with built-in `NG_VALIDATORS` mask error
  - `<kj-input-otp>` — N-cell one-time-code input with auto-advance, paste distribution, and `KjLiveRegion` completion announcement
  - `<kj-cascade-select>` + `<kj-cascade-option>` + `<kj-cascade-sub-panel>` — hierarchical flyout-chain picker composing `KjSelect`
  - `<kj-tree-select>` + `<kj-tree-select-node>` — flat-rendered hierarchical dropdown with single and multi-select modes

  **Actions**
  - `<kj-command-palette>` + `<kj-command-item>` + `<kj-command-group>` + `<kj-command-input>` + `<kj-command-separator>` + `<kj-command-empty>` — full combobox-with-listbox command palette with substring and fuzzy filters and `[kjCommandPaletteHotkey]` global Cmd-K listener.
    Modal-by-default API: `[(kjOpen)]` 2-way binding, `[kjHotkey]` opt-in keyboard chord, `[kjItems]` + `<ng-template kjCommandPaletteItemTemplate let-item>` for templated item lists (with `<kj-command-item>` projection still supported as a fallback). Built-in backdrop, centered dialog, fade/slide animations, ESC + backdrop-click to close, auto-focus input on open, default keyboard-hint footer with `[kjCommandPaletteFooter]` slot for override.

  ## Fixes
  - **`<kj-input>` CVA** — `KjInputComponent` now implements `ControlValueAccessor` so `[(ngModel)]` and `[formControl]` work directly on `<kj-input>`
  - **Input group visual parity** — addon background, line-height, and border-width now match `<kj-input>`; removed wrapper `overflow: hidden` that was clipping the input's focus outline
  - **Command palette CSS** — replaced hardcoded light-mode colors with theme tokens (`--kj-color-base-100/300`, `--kj-color-neutral`, `--kj-color-primary`, `--kj-font-mono`) and added modal-shell, backdrop, and animation styles
  - **Cascade select / Input group CSS** — fixed `var(--kj-border)` → `1px` so borders render in all themes
  - **Docs search** — refactored to use `<kj-command-palette>` with `[kjItems]` + `kjCommandPaletteItemTemplate` instead of bespoke palette markup; backdrop, animations, and Cmd-K wiring now come from the wrapper
  - **Page TOC** — `overflow-x: hidden` on `.toc-col`, removed `min-width` on `.toc-nav`, dropped `max-height` so the column can grow to full page height
  - **Input group examples** — updated to use `<kj-input>` component instead of bare `[kjInput]` directive, consistent with components-layer convention
  - **E2E coverage** — new Playwright specs verifying input-group visual parity and command-palette modal flow + Ctrl/Cmd+K hotkey

- f93e535: Expand `@kouji-ui/components` from 5 wrappers to 16, with code+preview docs and daisyUI-style sidebar grouping.

  **New components** (each ships multiple `@doc-example` panels):
  - **Actions** — `<kj-button>` (variants/sizes/disabled examples), `<kj-dialog>` with `<kj-dialog-overlay>`/`<kj-dialog-header>`/`<kj-dialog-title>`/`<kj-dialog-body>`/`<kj-dialog-footer>` slots
  - **Data input** — `<kj-checkbox>`, `<kj-radio-group>` + `<kj-radio>`, `<kj-select>` + `<kj-option>`, `<kj-toggle>` (each projects label content; `disabled` dims the entire control)
  - **Data display** — `<kj-accordion>` + `<kj-accordion-item>` (label-input shorthand) + `<kj-accordion-trigger>` + `<kj-accordion-content>`, `<kj-avatar>` (with `src`/`alt`/`content` inputs), `<kj-badge>`, plus `<kj-card>` upgraded to ant-design / PrimeNG-style sub-components (`<kj-card-cover>` with `size`/`fit` inputs, `<kj-card-header>`, `<kj-card-title>`, `<kj-card-subtitle>`, `<kj-card-content>`, `<kj-card-footer>`)
  - **Navigation** — `<kj-menu>` + `<kj-menu-trigger>`/`<kj-menu-content>`/`<kj-menu-item>`, `<kj-tabs>` + `<kj-tab>` (flat config-element API with `id`, `label`, `disabled` inputs)
  - **Feedback** — `<kj-toast-viewport>` + `<kj-toast>` + `<kj-toast-close>` (templated render, driven by `KjToastService`)

  **Public API additions on existing wrappers**:
  - `<kj-button>` gains `type` (button/submit/reset) and `ariaLabel` inputs.
  - `<kj-radio>` and `<kj-checkbox>` project content as their own label and wire `aria-labelledby` for the role-bearing element (fixes axe-core `aria-toggle-field-name` violations).
  - `<kj-avatar>` mirrors `alt` to a host `title` attribute for native hover tooltip.

  **Theming**:
  - Each shipped theme now declares `--kj-color-primary-hover` and `--kj-color-destructive-hover` so filled-button hover uses a brand-correct shade. `light`/`dark`/`corporate`/`retro`/`cyberpunk` define values; `kouji` keeps its existing component-layer brightening override. The button stylesheet falls back to a base-content color-mix when the token isn't defined, so consumer themes don't break.
  - `base.css` gains `blue-700`, `red-400`, and `red-600` shades that the new hover tokens reference.

  **Categorization**:
  - The docs extractor adds the daisyUI-style category union (`actions` / `data-input` / `data-display` / `navigation` / `feedback`) for the components track. The core track keeps its existing categories.
  - Manifest dev-watcher now invalidates on `packages/components/src` changes too.

- 51422f1: Use `forwardRef` for the self-referential `KJ_ROVING_TABINDEX` provider on `KjRovingTabindex`. Behavior is unchanged in normal Angular builds (the compiler already handles the self-reference); this prevents a temporal-dead-zone error when the file is loaded by tooling that runs the raw decorator metadata (e.g. Playwright's TS loader sweeping spec files).
- 2484383: Add `@kouji-ui/core/icon` — provider-agnostic icon layer:
  - `KjIconDirective` (`[span,i][kjIcon]`) renders icons via CSS custom
    properties (`--kj-icon` + `mask-image` for svg, `content` for font).
  - `provideIcons` / `provideIconResolver` / `provideIconLoader` for
    registering icon sets, sync URL synthesis, or async loaders.
  - `injectKjIconResolver()` exposes the unified resolver in injection
    contexts.
  - `KJ_ICON_REGISTRY` / `KJ_ICON_RESOLVER` / `KJ_ICON_LOADER` /
    `KJ_ICON_CSS_PATH` tokens published.
  - Stylesheet shipped at `@kouji-ui/core/icon/icon.css` with mask-image
    rendering for monochrome SVG and `content` for font glyphs.

- 4b7487f: Restore nullable input types on component wrappers (kjValue, kjMin, kjMax, kjReferenceDate, etc.) to match the headless directives' contracts. Sentinel-default approach was producing broken 2-way binding chains and incorrect runtime behaviour on null. Time-picker core now caches a stable per-instance reference Date so `serialise()` doesn't churn new Date() on every commit.
- 2484383: Overlay primitive refactor and select-family alignment.

  **`@kouji-ui/core`**
  - New overlay primitives layer: `KjOverlayController`, `KjOverlayPanel`, `KjOverlayTrigger`, `KjOverlayBuilder`, `KjOverlayHandle`, `KjOverlayWrapper`, `KjOverlayContainer`, `KjOverlayStack`. Strategies (`mount`, `position`, `backdrop`, `focus-trap`, `scroll-lock`, `trigger-event`) compose into per-overlay configs (`inPlace()` for service-launched, `bodyPortal()` for declarative).
  - `select`, `tree-select`, `combobox`, and `cascade-select` all follow the same root-controller pattern: a single `[kjXxx]` root directive provides `KjOverlayController` and owns selection state; trigger no longer self-provides; consumer-action methods call `controller.close()` directly (no signal indirection).
  - Cascade-select adds dedicated branch sub-panels with `position: fixed` so they escape the root panel's `overflow: auto`. Branch detection uses `contentChildren` (declaration tree) — no DOM querying.
  - Tree-select splits into root + per-node directives.
  - Re-entrancy guards on `open()` / `close()` / `toggle()`. Outside-click flicker fixed by hiding the panel synchronously in the rAF before strategy cleanup.

  **`@kouji-ui/components`**
  - Cascade-select wrapper composes the new root via `hostDirectives` (`kjValue`, `kjCascadePath`).
  - Confirm-popup, dialog, drawer, popover, tooltip, dropdown-menu, and toast JSDoc `@category` regrouped under `Library/Overlay` and `Core/Overlay` for the docs sidebar.

- a485472: - `<kj-select>` now exposes `[multiple]`, forwarding to the underlying
  `KjSelectTrigger`'s `kjMultiple` input. The wrapper's display label
  joins array values into a comma-separated list when multi mode is
  on (placeholder shown when empty). Fills the gap that previously
  required dropping to the headless directives for multi-select.
  - `KjTimePickerSegment` reflect-effect now guards the `document`
    reference so server-side rendering no longer throws
    `ReferenceError: document is not defined` while pre-rendering the
    time-picker.
- 7f95f75: `kj-input` now supports `type="color"` and a new `value` input that forwards to the underlying native input via property binding. Includes a `data-type` host attribute (mirrors `type`) and a small built-in style normalization for color swatches (44×32px). Existing `type` values and form-control bindings continue to work unchanged.

  Core fix in `kjInput`: the directive's CVA-to-DOM reflection now skips writing when the form control's value is null/undefined, so external `[value]` bindings work for non-form usage. Form-bound usage is unchanged (callers clear via `setValue('')`).

  These changes power the new in-app theme generator at `/theme-generator` in the docs site — fork built-in themes, edit colors with the native picker, tweak shape/font/motion controls, save multiple drafts to localStorage, export as CSS or JSON, import JSON back.

- 1968274: Workspace resolution metadata: `@kouji-ui/core`'s `package.json` now declares `module`, `typings`, `exports`, and `type: "module"` so other workspace packages (`@kouji-ui/components`, future packages) can resolve `@kouji-ui/core` via Node module resolution after `ng build kj-core` runs. Workspace-only paths point at `../../dist/kj-core/...`; a `publishConfig` override rewrites them to in-package paths (`./fesm2022/...`, `./types/...`) for the published npm artifact, so consumers see the same shape as before.

  No public API change. Pure infrastructure for the upcoming `@kouji-ui/components` package (Wave 0 of the themes & components architecture).
