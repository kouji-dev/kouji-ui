# @kouji-ui/core

## 0.3.0

### Minor Changes

- 509c90c: feat(chat): provider-agnostic AI/LLM chat UI kit

  Adds an AI streaming layer that coexists with the existing chat-bubble kit
  (additive — no breaking changes).

  **Core (`@kouji-ui/core`)**
  - `KjChatStore` — headless, provider-agnostic streaming state: `messages`
    signal, `status` (`idle`/`streaming`/`error`), and the token-append API
    (`sendUser`, `beginAssistant`, `pushChunk`, `endAssistant`, `fail`, `stop`)
    plus tool-call + citation tracking. No LLM SDK, no backend.
  - `KjChatAnnouncer` / `coalesceAnnouncement` — coalesces streamed tokens into
    whole-sentence **polite live-region** announcements (never char-by-char).
  - `parseSlash` / `matchSlashCommands` — slash-command model reusing the
    command-palette filter engine.
  - Types: `KjChatMessageData`, `KjChatMessageRole`, `KjChatStatus`,
    `KjChatToolCall`, `KjChatCitation`, `KjSlashCommand`.

  **Components (`@kouji-ui/components`)**
  - `KjChatThread` — AI thread surface; reuses `KjChatLog` (`role="log"`) and
    drives a dedicated coalesced polite live region for streaming.
  - `KjChatMessage` — renders user/assistant/system/tool turns with safe markdown,
    code blocks (copy button), tool-call cards, citations, and a reduced-motion
    typing indicator.
  - `KjPromptInput` — auto-grow textarea with Enter-send / Esc-stop / Shift+Enter
    newline, a slash-command listbox, and an attachment slot.
  - `renderMarkdown` — minimal, XSS-safe markdown renderer.

  WCAG 2.1 AAA: coalesced announcements, keyboard send/stop, message roles
  conveyed to AT, reduced-motion, ≥44px targets.

- 509c90c: feat(chart): pluggable/lazy ECharts engine + general event API for `KjChart`.
  - `provideECharts(loader)` + the `KJ_ECHARTS` token let consumers supply a tree-shaken `echarts/core` build (`.use([...])`), replacing the default ~1 MB full `import('echarts')`. When no provider is registered the directive still falls back to the full import, so zero-config usage is unchanged. SSR-safe (resolution stays inside `afterNextRender`).
  - New `[kjChartOn]` input (event names) + `(kjChartEvent)` output emitting `{ type, params }` forward any ECharts event; bindings are re-applied reactively when `kjChartOn` changes and torn down on destroy. `kjChartReady`, `kjChartClick` and `kjChartLegendSelect` are unchanged.
  - `kjChartReady` now emits after the first `setOption`, so consumers receive an instance that is already showing data.

- 509c90c: feat(date-picker): date range presets

  Add a keyboard-accessible **date range presets** primitive — a `role="listbox"`
  of named quick-selects ("Today", "Last 7 days", "This month", "This quarter",
  "Year to date", …) that resolve to an inclusive `{ start, end }` range.
  - **core** — headless `KjDateRangePresets` (listbox coordinator, roving
    tabindex, two-way `kjValue`) + `KjDateRangePresetOption`, plus
    `defaultDateRangePresets(weekStartsOn?)`, `resolveDateRangePreset()`, and the
    `KjDateRange` / `KjDateRangePreset` types. Custom presets fully supported.
  - **components** — themed `<kj-date-range-presets>` (`KjDateRangePresetsComponent`).

  Designed to slot beside a future range calendar, but usable standalone against
  any `signal<KjDateRange | null>`. WCAG 2.1 AAA: single tab stop, Arrow/Home/End
  navigation, `aria-selected` on the chosen preset, 44px targets.

- 509c90c: feat(chart): KjChart — ResizeObserver, prefers-reduced-motion, theme palette via `--kj-chart-1..6` (alias to intent tokens in all 13 themes), `kjChartDescription` + `aria-describedby`, `*kjChartTableFallback` for screen-reader tables, event outputs (`kjChartClick`, `kjChartLegendSelect`, `kjChartReady`), `[kjChartLoading]`, `exportAs="kjChart"` with `resize/dispatchAction/getOption`. 8 examples wired through the example registry; auto-discovered docs page at `/docs/chart`.
- 509c90c: Add the locale provider — one DI source of truth for locale-sensitive rendering.

  `provideKjLocale({ locale, direction, currency })` seeds a root `KjLocale`
  service exposing `locale` / `direction` / `isRtl` / `currency` signals, runtime
  setters (`setLocale` / `setDirection` / `setCurrency` — the seam the RTL switch
  and language menu build on), and `Intl`-backed `formatNumber` / `formatCurrency`
  / `formatDate` helpers. `direction: 'auto'` derives ltr/rtl from the locale
  script, falling back to the document's `<html dir>` via `KjDirectionality`.

  `KjNumberInput` and `KjDatePicker` now fall back to the provider for their
  locale (and NumberInput for its default currency) instead of the bare
  `LOCALE_ID`; explicit `kjLocale` / `kjCurrency` inputs still win. Remaining
  locale-sensitive primitives (TimePicker, Calendar, Slider) are unchanged and
  can adopt the same one-line fallback next.

  Deferred to separate roadmap items: the visible RTL toggle UI + `<html dir>`
  mutation (RTL switch), alternate calendar systems, and translation-string
  catalogs (i18n).

- 509c90c: feat: mobile-first interaction patterns — bottom sheet + action sheet

  Adds two mobile-first overlay patterns composed on the existing overlay
  primitive stack (no new overlay engine):
  - **Bottom sheet** (`KjSheetService` / `KjSheet` / `KjSheetRef` in core, styled
    `kj-sheet` in components): a bottom-anchored modal surface with a grab handle,
    drag-to-dismiss, `detent` initial-height option, focus trap, scroll lock, and
    reduced-motion-aware transitions.
  - **Action sheet** (`KjActionSheetService` / `KjActionSheetRef` in components):
    a data-driven, iOS-style `role="menu"` list of actions presented in a bottom
    sheet, with default / destructive action roles, resolving the selected value.

  Swipe-to-reveal list rows and a generalized gesture-overlay abstraction are
  intentionally deferred to a follow-up (see the design spec).

- 509c90c: feat(editor): KjEditor — Monaco-wrapped code editor.

  Core adds the headless `KjEditor` directive (`[kjEditor]`) plus `KjEditorLoader`
  and `provideMonaco()`: two-way `kjValue`, `kjLanguage` (kj-level `KjEditorLanguage`
  type with short-alias normalisation), options (readonly, minimap, line numbers,
  word wrap, font size), `kjAutoHeight` / `kjMaxHeight` (grow to fit content),
  reduced-motion, SSR-safe lazy load, and a configurable Monaco source (defaults to
  the `@monaco-editor/loader` CDN so Monaco never bloats the base bundle; point at a
  self-hosted/bundled Monaco via `provideMonaco({ vsPath })` or `provideMonaco({ loader })`).
  `monaco-editor` and `@monaco-editor/loader` are optional peer dependencies.

  Lazy language loading: `provideMonacoLanguages({ id: () => import(...) })` registers
  per-language loaders that `KjEditorLoader.ensureLanguage` runs on demand (once) so
  heavy language grammars download only when an editor first uses them.

  Components adds the styled `<kj-editor>` (`KjEditorComponent`): a kj-token-synced
  Monaco theme that re-applies on theme switch, an optional toolbar and status bar,
  a loading region, and AAA keyboard access (accessible name via `kjAriaLabel`,
  `accessibilitySupport: 'auto'`, and the documented `Ctrl+M` tab-trap escape).

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

- 509c90c: Add `KjRichTextEditor` — a **client-driven, feature-composed** rich-text editor wrapping
  [Lexical](https://lexical.dev).
  - **Core** (`@kouji-ui/core`): a headless `[kjRichTextEditor]` directive that owns the
    Lexical engine (loaded lazily via dynamic `import()` for SSR safety, no CDK), plus the
    **feature framework**. A `KjRichTextFeature` is a self-contained vertical slice that owns
    its package loading (`load()`), `nodes`, activation (`setup`), and UI (`toolbar`, `overlay`):
    - **Per-feature lazy package loading** — each feature dynamically imports only its own
      `@lexical/*` package(s), so disabling a feature keeps its code out of the bundle.
    - Nodes are collected from all features **before** `createEditor`; state + HTML
      (de)serialization are package-agnostic (respect only the active node set).
    - Declarative `toolbar` + `overlay` contributions; a `KjRichTextContext` of package-agnostic
      command helpers; `createKjDecoratorNode()`/`createKjImageNode()` node factories; a CDK-free
      Angular decorator-node bridge (`injectRichTextNode`).
    - Composition via `provideKjRichText(...)`, `[kjFeatures]`, or `[kjRichTextFeature]`.
      `KjRichTextExtension`/`KjRichTextPlugin` remain as deprecated aliases of `KjRichTextFeature`.
  - **Components** (`@kouji-ui/components`): a styled `<kj-rich-text-editor>` whose accessible
    `role="toolbar"` (roving tabindex, `aria-pressed`, `aria-keyshortcuts`) renders **dynamically**
    from the active features' contributions — no hardcoded buttons. Ships the feature factories
    (`bold()`, `italic()`, `heading()`, `bulletList()`, `link()`, `image()`, `codeBlock()`,
    `markdownShortcuts()`, `history()`, …) and a `defaultFeatures()` bundle for zero-config, plus
    link/image overlay editors and live-region announcements.

  Lexical is declared as an optional peer dependency (mirroring the ECharts/chart setup).

- 509c90c: Add RTL support — `<html dir>` wiring, a visible direction toggle, and
  logical-property mirroring.

  `provideKjDocumentDirection()` (core) reflects `KjLocale.direction` onto the
  document's `<html dir>` attribute and keeps it in sync with runtime
  `setDirection(...)` changes. It is SSR-safe (no DOM access on the server) and
  the single writer of `<html dir>`, while `KjDirectionality` stays the reader
  that feeds `KjLocale`'s `'auto'` derivation.

  `KjDirectionToggle` (components) is a keyboard-native `<button>` that flips the
  shared `KjLocale` between `ltr` and `rtl`. `aria-pressed` reflects the RTL
  state, it carries an accessible name, and reserves a 44×44 hit area. Paired with
  `provideKjDocumentDirection()`, one click mirrors the whole page.

  Converted the remaining logical-intent physical CSS in the focused set to
  logical properties so layout mirrors under RTL: the toast close button
  (`margin-inline-start`) and the command-palette active-item indicator
  (`border-inline-start`). Breadcrumb, pagination, dropdown-menu, and the overlay
  family already used logical properties and are verified to mirror. DOM order is
  unchanged, so reading and tab order stay correct in both directions
  (WCAG 1.3.2).

  Deferred to the v0.2 RTL roadmap item: the full physical→logical sweep across
  all components (sliders, calendars, stepper, tabs, table, …) and directional
  key-handling for range/date components.

- 509c90c: feat(skip-link): add `KjSkipLink` — a "skip to main content" bypass link (WCAG 2.4.1)
  - `@kouji-ui/core`: headless `KjSkipLink` directive (`a[kjSkipLink]`). Reflects a
    fragment `href`, and on activation moves keyboard focus to the target landmark
    (adding `tabindex="-1"` when needed). Suppresses the anchor's native
    navigation, which under `<base href="/">` would resolve `#main-content`
    against the base URL and leave the page.
  - `@kouji-ui/components`: themed `KjSkipLinkComponent` (`kj-skip-link`) —
    visually hidden until focused, then revealed on-screen with a high-contrast
    (`--kj-bg-primary` / `--kj-fg-on-primary`) surface. Themable via
    `--kj-skip-link-*` tokens; honours `prefers-reduced-motion`.

- 509c90c: Add i18n — typed translation strings for the library's visible / assistive-text
  surface, built on the locale provider.

  `KjTranslateService` resolves strings from typed, tree-shakable per-locale
  catalogs, selecting the active catalog from `KjLocale.locale()` (exact tag →
  bare language subtag → `en`) with a guaranteed fallback to the English source so
  the UI never blanks out on a missing key. Values support `{name}` interpolation.
  The `KjTranslate` directive writes a localized string into its host — either the
  text content or a named attribute (e.g. `kjTranslateAttr="aria-label"`) — fully
  reactive to locale changes via signals (no pipe, no CDK).

  Ships the typed `EN_CATALOG` (source of truth; the `KjTranslationKey` union is
  derived from it, so misspelled keys fail `tsc`) covering the named strings —
  toast close, dialog close, pagination labels, and a11y live-region
  announcements — plus a `FR_CATALOG` (French) as proof. Register alternates with
  `provideKjTranslations({ fr: FR_CATALOG })`. `KjToastClose` now carries a
  localized default `aria-label` from the `'toast.close'` key (overridable via
  `kjToastCloseLabel`).

  Deferred to follow-ups: retrofitting every component's static config token
  (pagination, breadcrumb, dialog, table announcements) to source from the
  catalog, ICU plural / select formatting, a shipped language-switch UI, and async
  catalog loading.

### Patch Changes

- 509c90c: fix(overlay): register `sheet` and `action-sheet` in the overlay CSS aggregator; fix(command-palette): reset the search query when the palette closes
  - **overlay**: service-launched bottom sheets and action sheets (`KjSheetService` / `KjActionSheetService`) rendered **unstyled** because their skins (`sheet.css`, `action-sheet.css`) were never `@import`ed into the global `overlay/overlay.css` aggregator — only attached to the docs-only shell wrapper components, which a real consumer never instantiates. They now load with the rest of the overlay family (dialog, drawer, toast, …).
  - **command-palette**: reopening the palette after a search showed the previous query. `KjCommandInput` now reflects the `kjQuery` signal back onto the DOM input (the `(input)` binding was one-way), and `KjCommandPaletteComponent` clears the query + active item when it closes — so each open starts fresh.
  - **icon**: digit-bearing Lucide icons (`heading-1`, `heading-2`, `heading-3`, `clock-10`, `columns-2`, …) rendered blank — `pascalToKebab` never inserted a hyphen before digits, so the requested kebab name never matched the registry key. Fixed the converter; these icons now resolve everywhere (including the rich-text-editor toolbar).

- 509c90c: fix(rich-text-editor): make the editable surface actually editable

  The Lexical build in use does not set `contenteditable` on its root element —
  it only listens on an element that is already editable. `KjRichTextEditor` never
  set it, so the editor attached (`data-lexical-editor`) but the surface couldn't
  be clicked into or typed in. The directive now binds
  `contenteditable` on its host (`false` when readonly/disabled, `true`
  otherwise), so clicking in and typing works.

## 0.2.0

### Minor Changes

- New `kj-datetime-picker` — date-picker calendar popover plus a time field sharing one native `Date` value (panel stays open after a day pick; day merges preserve time-of-day). Core `kjDatePickerTrigger` gains an optional `kjDisplayFormat` input for custom trigger text.

## 0.1.5

### Patch Changes

- Drop the legacy `publishConfig.exports`/`module`/`typings` overrides that clobbered the dist manifest's exports map on publish — the `./icon/icon.css` and `./typography/prose.css` asset exports now actually reach npm.

## 0.1.4

### Patch Changes

- Export the shipped CSS assets (`./icon/icon.css`, `./typography/prose.css`) from the package exports map so consumers can `@import` them.

## 0.1.3

### Patch Changes

- Declare previously undeclared runtime dependencies so consumers can resolve the fesm bundles:
  - core: `@tanstack/angular-table` (dependency), `@angular/forms` + `rxjs` (peers), `echarts` (optional peer — lazily imported by `kjChart` only).
  - components: `@tanstack/virtual-core` (dependency), `@angular/forms` + `rxjs` (peers).

## 0.1.2

### Patch Changes

- Publish the built ng-packagr output (`dist/kj-*`) instead of raw library source via `publishConfig.directory`. The 0.1.1 tarballs shipped `src/` with no entry points and are unusable; this republishes with proper `fesm2022` bundles, types, and exports.

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

- d2150ee: fix(signals): widen `nonRecords` constructor type to accept native builtins (WeakSet/WeakMap/Promise/Error/RegExp/DataView/Function) — pure type-level change, no runtime behavior change.

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

- 58b3b98: Fix command palette ArrowUp/Down: stop resetting highlight when async results update the list; resolve item values dynamically for stable activation.
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
- 884c5a1: Prerender/SSR: avoid `document` ReferenceError in time-picker segment and calendar day (browser guard + `inject(DOCUMENT)` for `activeElement`).
- a015b14: Theme generator (docs app): accessibility tooling and configurator-related updates in components/core — `@docCategory` on directives, tag `xs` size, tooltip `[hidden]` guard, calendar SSR guard, overlay/command-palette/browser DOM safety.
- 7f95f75: `kj-input` now supports `type="color"` and a new `value` input that forwards to the underlying native input via property binding. Includes a `data-type` host attribute (mirrors `type`) and a small built-in style normalization for color swatches (44×32px). Existing `type` values and form-control bindings continue to work unchanged.

  Core fix in `kjInput`: the directive's CVA-to-DOM reflection now skips writing when the form control's value is null/undefined, so external `[value]` bindings work for non-form usage. Form-bound usage is unchanged (callers clear via `setValue('')`).

  These changes power the new in-app theme generator at `/theme-generator` in the docs site — fork built-in themes, edit colors with the native picker, tweak shape/font/motion controls, save multiple drafts to localStorage, export as CSS or JSON, import JSON back.

- 1968274: Workspace resolution metadata: `@kouji-ui/core`'s `package.json` now declares `module`, `typings`, `exports`, and `type: "module"` so other workspace packages (`@kouji-ui/components`, future packages) can resolve `@kouji-ui/core` via Node module resolution after `ng build kj-core` runs. Workspace-only paths point at `../../dist/kj-core/...`; a `publishConfig` override rewrites them to in-package paths (`./fesm2022/...`, `./types/...`) for the published npm artifact, so consumers see the same shape as before.

  No public API change. Pure infrastructure for the upcoming `@kouji-ui/components` package (Wave 0 of the themes & components architecture).

## 0.0.4

### Patch Changes

- 202d9de: CI fix: husky pre-push hook now skips in CI environments (`$CI` or `$GITHUB_ACTIONS` set). Prevents the Changesets action's automated push from being blocked by the changeset-status gate. No runtime effect on the published package.
- dc0fe0f: Test-only fix: rewrite `KjToastService` test suite to use `TestBed.inject()` so `inject(KJ_TOAST_STRATEGY)` resolves through Angular DI (was crashing with `new KjToastService()` outside an injection context). No runtime change.
- d6b40e1: Internal lint cleanup — replace `any` casts in select option storage with typed `HTMLElement & { __kjOptionValue?: unknown }` and convert ternary statement to if/else in overlay toggle. No public API or behavior change.

## 0.0.3

### Patch Changes

- c177d1e: Rewrite README with real install/usage docs, primitive index, and design principles. Replaces the Angular CLI scaffold placeholder.

## 0.0.2

### Patch Changes

- 1813d21: Initial publish — headless Angular 21 UI primitives over CDK with WCAG 2.1 AAA semantics and zero CSS.
