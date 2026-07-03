# @kouji-ui/components

## 0.4.0

### Minor Changes

- kj-table: `kjPageSize` input (`number | 'all'`) — set `'all'` to render every row and scroll instead of paging. Without `<kj-table-pagination>` the default 25-row page silently truncated data.

## 0.3.0

### Minor Changes

- kj-table: custom cell templates via `ng-template[kjCellTemplate]="columnId"` (context: row, value, cell) — badges, buttons, and arbitrary markup in plain data cells. kj-datetime-picker: the trigger input now sizes to its content (19ch) instead of the browser's 20-character default.

## 0.2.0

### Minor Changes

- kj-badge: `bg` / `fg` / `dotColor` inputs for data-driven colours — applied as inline custom properties on the badge span so they win over variant and theme rules.
- New `kj-datetime-picker` — date-picker calendar popover plus a time field sharing one native `Date` value (panel stays open after a day pick; day merges preserve time-of-day). Core `kjDatePickerTrigger` gains an optional `kjDisplayFormat` input for custom trigger text.

### Patch Changes

- Updated dependencies
  - @kouji-ui/core@0.2.0

## 0.1.5

### Patch Changes

- cc560fc: kj-input: widen `KjInputType` with native `date`, `time`, and `datetime-local` types.

## 0.1.4

### Patch Changes

- kj-input: add native `autocomplete` and `inputmode` attribute passthroughs (omitted when empty).

## 0.1.3

### Patch Changes

- Declare previously undeclared runtime dependencies so consumers can resolve the fesm bundles:
  - core: `@tanstack/angular-table` (dependency), `@angular/forms` + `rxjs` (peers), `echarts` (optional peer — lazily imported by `kjChart` only).
  - components: `@tanstack/virtual-core` (dependency), `@angular/forms` + `rxjs` (peers).

- Updated dependencies
  - @kouji-ui/core@0.1.3

## 0.1.2

### Patch Changes

- Publish the built ng-packagr output (`dist/kj-*`) instead of raw library source via `publishConfig.directory`. The 0.1.1 tarballs shipped `src/` with no entry points and are unusable; this republishes with proper `fesm2022` bundles, types, and exports.
- Updated dependencies
  - @kouji-ui/core@0.1.2

## 0.1.1

### Major Changes

- ec17a49: Upgrade to Angular 22. Peer dependency ranges for `@angular/core`, `@angular/common`, and `@angular/cdk` now require `^22.0.0` (was `^21.0.0`) — consumers must upgrade to Angular 22 to use this version.

  Internal changes as part of the upgrade:
  - `KjSpeedDial`, `KjPagination`, and `KjCombobox`'s two-way-bindable inputs (`kjOpen`, `kjPage`, `kjQuery`) now use `input()` + `linkedSignal()` instead of `model()`, to avoid colliding with their paired convenience outputs under Angular 22's stricter duplicate-output check. Public API is unchanged.
  - `packages/core`'s build now passes `-c tsconfig.lib.prod.json` explicitly to `ng-packagr`, fixing a silent fallback to an internal `es2018` lib default that broke `Intl`/`Array.prototype.at` typings.

  Known issue: a subset of overlay-based components (confirm-popup, drawer, popover, date-picker, and others using the shared overlay `attachComponent()` primitive) hit `NG0950` (required input not available) under Angular 22's stricter dynamic-component input timing. Tracked as follow-up work, not fixed in this release.

### Minor Changes

- 658554d: Add leading dot indicator to badge (superset, additive).
  - core: `[kjBadge]` gains `kjBadgeDot` input reflecting a `data-dot` attribute; defaults off, existing consumers unaffected.
  - components: `<kj-badge>` gains `dot` input rendering a `::before` indicator, themeable via `--kj-badge-dot-size` and `--kj-badge-dot-color` (defaults to `currentColor`).

- be6386d: Data-table polish: server-mode pagination, virtualization fix, inline-edit overlay, xs pagination tier.
  - `KjTable` (core): dedupe identity-only slice patches; expose
    `setRowCount` / `manualPagination` so resource-backed tables report the
    full remote total instead of just the visible page.
  - `KjSelect` / `KjSelectTrigger` (core): trigger registers its element
    with the parent at construction time. `KjSelect.focus()` delegates to
    the registered trigger — no view-query timing dance for consumers.
  - `KjTableComponent`: virtualization reads pre-pagination rows (10k rows
    scroll correctly); inline editors mount as `position: absolute` overlays
    with a hidden ghost preserving column width; column meta (`selectOptions`)
    forwarded to dynamically-mounted editors via the cell-editor outlet.
  - `KjTablePaginationComponent`: three-column footer (page size · summary ·
    nav), `space-between` nav cluster, full `xs | sm | md | lg` size tier
    forwarded to the boundary buttons.
  - `KjPagination`: `xs` registered in `KJ_PAGINATION_DEFAULTS.sizes` + CSS.
  - `KjSelectComponent` / `KjInputComponent` / `KjNumberInputComponent`:
    public `focus()` methods, no DOM querying.
  - Renamed `KjCellEditorOutlet` output `cancel` → `editCancel` to avoid
    the DOM-event collision flagged by angular-eslint.
  - `kjTableVirtual` directive selector + exportAs lowercased for the `kj`
    prefix rule.

### Patch Changes

- Updated dependencies [ec17a49]
- Updated dependencies [658554d]
- Updated dependencies [be6386d]
- Updated dependencies [d2150ee]
  - @kouji-ui/core@0.1.1

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

- 78d5e83: - Docs app (ignored by changesets): unified sidebar built from `@doc-category` paths — expandable category tree, single Getting Started shortcut, `DocsService.unifiedNavTree` + `build-docs-nav-tree`; Playwright/unit tests updated.
  - List component CSS tweaks aligned with docs/theme usage.
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
- 8406d0f: Finalize the listbox-primitives migration for cascade-select, tree-select, menubar, and combobox.

  **`@kouji-ui/core`**
  - `KjSelectionModel` now receives its source signals via a `bind()` call from the consumer root (replacing the older inject-the-config pattern). The model auto-derives a tree shape from each `KjListItem`'s parent DI pointer when the consumer doesn't supply one explicitly — DOM-nested clusters (cascade-select, sub-menus) are tree-aware out of the box. `'single'` mode now respects the shape and blocks branch commits at the model layer.
  - `KjListItem` exposes a `parent` reference (nearest ancestor `KjListItem` via `skipSelf` element-injector lookup) and gates activation through `KjSelectionModel.canActivate(value)` — branch options serve purely as disclosure controls without leaking values.
  - `KjCascadeSelectOption` migrates to mode `'single'` (was `'leaf'`) for a clean string value rather than an array; aliases `KjListItem` inputs as `kjValue`/`kjLabel`/`kjDisabled` (was `kjOptionValue`/`kjOptionLabel`/`kjDisabled`) to match `KjTreeSelectNode`'s convention. Branch detection switched from imperative `_registerSubPanel()` to a `contentChildren(KjCascadeSelectSubPanel)` query.
  - `KjCascadeSelect` removes the required `kjTreeShape` input — the consumer-supplied shape is optional now (defaults to the auto-derived one). Path derivation moves to `KjSelectionModel.pathTo()`.
  - `KjMenubarItem` gains a `kjActivate` output (bridged from `KjListItem.activate`) and now early-returns from its open/close toggle when `kjDropdownMenuTriggerFor` is unset, so a sibling `[kjDropdownMenuTrigger]` on the same element can own the overlay state without the item's toggle handler closing the dropdown that just opened (the two directives share a single per-element `KjOverlayController`).

  **`@kouji-ui/components`**
  - `KjCascadeOptionComponent` now extends `KjCascadeSelectOption` directly and registers itself under the directive's token via `useExisting` so projected sub-panels resolve their parent option through normal element-injector DI. This works around Angular 21's NG2017 rule (chained hostDirective alias forwarding is forbidden) while keeping the markup-driven recursive API.
  - Cascade-option public inputs renamed to `kjValue`/`kjLabel`/`kjDisabled` to match tree-select-node and the new core aliases.
  - `kj-menubar-item` wrapper forwards the new `(kjActivate)` output.
  - Menubar examples rewritten (the previous files were placeholders): `default`, `disabled-item`, `with-shortcuts` (composes `<kj-kbd>`), `with-submenu` (uses the standard `kjDropdownMenuTrigger` + `<kj-dropdown-menu-content [kjFor]>` idiom).
  - Dropdown-menu playground gains a "Last selected" readout wired through `(kjSelect)` on each item; menubar playground gets the same readout wired through the new `(kjActivate)`.
  - `kj-option` (select) selected-state styling now uses a tinted primary token (`color-mix(in oklab, var(--kj-bg-primary) 12%, transparent)` + `var(--kj-fg-primary)` + `font-weight: 600`), mirroring `kj-tree-select-node` so the listbox family stays visually consistent across themes.
  - New `packages/components/src/overlay/` aggregator stylesheet so consumers register a single overlay CSS entry rather than per-component overlays in `angular.json`.

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
- a015b14: Theme generator (docs app): accessibility tooling and configurator-related updates in components/core — `@docCategory` on directives, tag `xs` size, tooltip `[hidden]` guard, calendar SSR guard, overlay/command-palette/browser DOM safety.
- 7f95f75: `kj-input` now supports `type="color"` and a new `value` input that forwards to the underlying native input via property binding. Includes a `data-type` host attribute (mirrors `type`) and a small built-in style normalization for color swatches (44×32px). Existing `type` values and form-control bindings continue to work unchanged.

  Core fix in `kjInput`: the directive's CVA-to-DOM reflection now skips writing when the form control's value is null/undefined, so external `[value]` bindings work for non-form usage. Form-bound usage is unchanged (callers clear via `setValue('')`).

  These changes power the new in-app theme generator at `/theme-generator` in the docs site — fork built-in themes, edit colors with the native picker, tweak shape/font/motion controls, save multiple drafts to localStorage, export as CSS or JSON, import JSON back.

- 20bd644: Add `@doc` on `KjTooltipComponent` so the docs extractor includes the Tooltip page (manifest + search).
- 6ee4f26: Docs extractor requires `@doc` on `KjTooltipComponent` so Tooltip appears in manifest, sidebar, and search.
- 1968274: Workspace resolution metadata: `@kouji-ui/core`'s `package.json` now declares `module`, `typings`, `exports`, and `type: "module"` so other workspace packages (`@kouji-ui/components`, future packages) can resolve `@kouji-ui/core` via Node module resolution after `ng build kj-core` runs. Workspace-only paths point at `../../dist/kj-core/...`; a `publishConfig` override rewrites them to in-package paths (`./fesm2022/...`, `./types/...`) for the published npm artifact, so consumers see the same shape as before.

  No public API change. Pure infrastructure for the upcoming `@kouji-ui/components` package (Wave 0 of the themes & components architecture).

- Updated dependencies [625e81a]
- Updated dependencies [9acdb07]
- Updated dependencies [58b3b98]
- Updated dependencies [f93e535]
- Updated dependencies [51422f1]
- Updated dependencies [2484383]
- Updated dependencies [4b7487f]
- Updated dependencies [8406d0f]
- Updated dependencies [2484383]
- Updated dependencies [a485472]
- Updated dependencies [884c5a1]
- Updated dependencies [a015b14]
- Updated dependencies [7f95f75]
- Updated dependencies [1968274]
  - @kouji-ui/core@0.0.6
