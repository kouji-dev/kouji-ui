# @kouji-ui/themes

## 0.2.0

### Minor Changes

- 6e43ded: review batch 3: overlay close policy and lifecycle, machine-checked theme contrast and cascade layers, packaging without CDK

  **Overlay engine (core).** `closeOnEsc` / `closeOnOutside` are honoured end to
  end: `KjOverlayBuilder.create()` applies a role default (an `alertdialog`
  answers to neither Escape nor the scrim; every other role closes on Escape and
  lets the scrim's own `closeOnClick` decide), and `KjDialog.open()` forwards
  `closeOnEsc` / `closeOnOutside` while `KjDrawerService` / `KjSheetService`
  forward `closeOnOutside`. `KjOverlayStack` is the single owner of outside
  dismissal (a press that begins on the overlay's trigger is never "outside").
  Controllers dispose themselves with their host's `DestroyRef` and run the full
  close chain synchronously; `KjOverlayTrigger` detaches the trigger-event
  strategy it attached. `toggle()` during the close transition re-opens (unless
  the close came from an outside press); `onFocus` / `onFocusOrInput` ignore the
  focus restore that runs while closing. Overlay toasts register as `passive`
  stack entries — Escape reaches the dialog beneath. `KjCloseReason` is now
  `'escape' | 'outside' | 'backdrop' | 'trigger' | 'select' | 'tab' |
'programmatic'` (the old `'esc'` spelling is removed — use `'escape'`);
  `KjDialogRef` /
  `KjDrawerRef` / `KjSheetRef` expose `closeReason()`, and **`afterClosed$` /
  `result` now settle on a dismissal by Escape or the scrim** (with `undefined`),
  not only after `close()`. `kjMenuClosed` fires once per close with the mapped
  reason. Declarative overlays render a real `<kj-backdrop>` when their scope
  provides a backdrop strategy; `KjBackdrop` closes with reason `'backdrop'`.
  `kjMount` / `kjSide` / `kjAlign` on `<kj-dropdown-menu-content>` are reactive;
  `aria-haspopup="menu"` is rendered on dropdown triggers; `[kjDropdownMenu]`
  owns `role="menu"`; the confirm popup is an `alertdialog` from first paint with
  `aria-describedby` and `aria-modal="false"`. New: `KJ_OVERLAY_CONTAINER`,
  `inheritOverlayScope()` (service-launched overlays inherit `data-theme` /
  `data-density` / `dir` from the focused element or app root), `onHotkey({
target })` (and it ignores `defaultPrevented` keystrokes), `KjOverlayPanel`
  reads its strategy tokens from its own element when bound to a foreign
  controller (no more inherited scroll lock / scrim / role from an enclosing
  dialog). `--kj-overlay-z-base` is read from the overlay container only while
  `KJ_OVERLAY_Z_BASE` is at its default.

  **Themes / styles.** New `@kouji-ui/themes/layers.css` export pins the layer
  order `kj.reset, kj.base, kj.shared, kj.prose, kj.component, kj.tone,
kj.truncate`; every shipped stylesheet lives inside a layer (stylelint rules
  `kouji/layered` + `kouji/known-tokens`, root script `lint:css`, run in CI).
  Contrast is machine-asserted per theme (AA for class-A/C ink on the neutral
  surfaces and on the `*-subtle` fills, 3:1 for `--kj-border-focus`, and the new
  required token **`--kj-border-control`** — the idle boundary of every form
  control, ≥ 3:1 on body/surface/field in all 15 themes; `--kj-border-default`
  stays decorative). `orrery-light`, `sakura`, `nord`, `light` and `retro` ink /
  ring nudges. Every theme declares `color-scheme`. Unthemed documents get the
  light tokens (`:root:not([data-theme])`) and dark under
  `prefers-color-scheme: dark`. One shared `prefers-reduced-motion` guard in
  `base.css` zeroes every token-driven transition; sheets with literal durations
  carry their own guard. Control heights ride the `--kj-ctl-h-*` density ladder
  (select, date / datetime / time pickers, input-mask, number-input, password
  input, calendar cells; compact now shrinks them). `--kj-space-2xs` (2px) and a
  `--kj-line-height-*` ladder are declared; `--kj-color-icon-*` re-resolve per
  theme root; `--kj-bg-overlay` backs every scrim; `.kj-card[data-shadow="lift"]`
  draws `--kj-shadow-md`; `.kj-backdrop--blur` has a rule; `contain: layout` on
  the fixed / portalled surfaces. `prose.css` keys on `[data-kj-tone]` /
  `[data-kj-truncate]` and the typography directives now reflect those names
  (the bare `data-tone` / `data-truncate` selectors are supported spellings, not a
  deprecation window — a hand-typed attribute in consumer markup has no compiler
  to migrate it, so both remain); `density.css` also matches `[data-kj-density]`. The dead
  `.kj-dialog-overlay` rule is gone. Docs: pre-paint theme script, theme
  generator emits the full required token set inside `@layer kj.shared`.

  **Packaging (core + components).** `@angular/cdk` is no longer a peer of either
  package (uninstall it). Angular `^22` peers. `@kouji-ui/core/styles.css` is
  published (overlay + icon + prose + motion) and `@kouji-ui/components/src/*.css`
  is exported, so both resolve by specifier from Vite / Analog / Node. `marked`
  is configured on a private instance (a consumer's own `marked.parse()` no
  longer inherits the chat's options). `@tanstack/virtual-core` and
  `lucide-static` are optional peers loaded through `import()`:
  `KjTableVirtual.virtualRows()` is typed `KjVirtualRow[]` and virtualization
  attaches after a dynamic import (a missing peer is reported through
  `ErrorHandler` while the seeded window keeps rendering); `provideLucideIcons({
Settings, Trash2 })` registers a tree-shaken subset, `provideLucideIcons()`
  loads the whole set as one lazy chunk on the first miss (icons resolve one tick
  later on the client; prerender waits). `provideIcons()` scopes per environment
  injector (route-level sets layer over the root set). The example barrels no
  longer export documentation-only components. Build scripts gate the public API
  graph and the published exports map.

- 6e43ded: round-2 system review: 178 of 184 findings fixed across eight batches

  The round-2 review filed 184 findings across nine dimensions. 178 are closed.
  The six that are not are listed, with reasons, in `reports/review/README.md`
  § _Status after fix run_.

  The single most leveraged fix is that **CI now runs the tests**. It had not
  executed one since 2026-05-07, so 47 of 50 releases shipped under a
  lint-and-build-only gate — which is why most of the rest went unnoticed.

  ***

  ## Breaking

  ### Focus now moves, and comes back
  - **Opening a `<kj-select>`, `<kj-tree-select>` or `<kj-cascade-select>` moves
    focus into the panel.** These were keyboard-inoperable once open: the list
    navigator listened for keys on a panel that nothing ever focused. Focus now
    lands on the selected option (else the first navigable one), arrow keys,
    `Home`, `End` and type-ahead move a roving tab stop, and `Tab` closes the
    panel and continues past the trigger. If you worked around this by focusing
    the panel yourself, remove that code — the two are idempotent, but a second
    `Tab` trap on those panels will fight the built-in one.
  - **Every overlay restores focus to its opener when it closes.** The opener is
    `document.activeElement` at open time; on close, focus returns there if it is
    still inside the panel (or fell to `<body>` after having been inside),
    falling back to the bound trigger when the opener is gone, hidden or inert.
    Opt out per overlay with `KjOverlayStrategies.returnFocus: false`, or
    `tabCycle({ returnFocus: false })`.
  - **Dialogs, drawers and sheets place initial focus on `[kjAutofocus]` or
    `[autofocus]` inside the panel, else on the panel itself** — previously the
    first focusable control, which put the caret in a form field nobody asked for.
  - **The page behind a modal is genuinely inert.** `solidBackdrop({ inert: true })`
    applies `inert` to every `<body>` child outside the overlay container and to
    every overlay opened before this one, refcounted so nested modals thaw the
    page only when the last one closes. App-authored `inert` is never touched.
  - **`afterClosed$` and `result` settle on a dismissal** (Escape, scrim press)
    with `undefined`, not only after an explicit `close()`. `afterOpened$` emits
    exactly once and completes — it never emitted at all before.
  - **Tooltip triggers carry `aria-describedby` and no longer carry
    `aria-expanded` / `aria-controls`** (the APG tooltip pattern). Tooltips open
    on keyboard focus, and `kjDisabled` on a tooltip or popover trigger really
    blocks opening — it was inert configuration.

  ### Packaging
  - **`@angular/cdk` is no longer a peer dependency of either package.**
    Uninstall it.
  - **Both packages declare an `exports` map.** `@kouji-ui/core` publishes `.`,
    `./package.json`, `./styles.css` (the aggregate) and the four per-file
    stylesheets; `@kouji-ui/components` publishes `.`, `./package.json` and
    `./src/*.css`. This is a wall as much as a door: a specifier that is not
    listed — `@kouji-ui/components/fesm2022/*`,
    `@kouji-ui/components/src/overlay/overlay.ts` — no longer resolves, so deep
    imports that happened to work before will now fail.
  - **`@kouji-ui/themes` publishes `.`, `./package.json`, `./layers.css`,
    `./base.css`, `./density.css` and `./themes/*.css`.** Every documented
    specifier is resolved by Node's own resolver in CI, so the Vite / Analog
    install path is covered rather than assumed.
  - **`@kouji-ui/components/src/overlay/overlay.css` is now the only path that
    paints a floating panel.** The nine overlay-family stylesheets used to ship
    twice — once through the aggregator, once as a component `styleUrl` — so
    about 28 KB of CSS was delivered twice to anyone following Getting Started.
    The `styleUrl`s are gone; a `<kj-dialog>` rendered without the aggregator
    registered will paint unstyled.
  - `@kouji-ui/components` exports `KJ_COMPONENTS_VERSION`, generated from
    `package.json` and checked in CI.

  ### Renames — clean breaks, no aliases

  Every deprecated compatibility alias in both packages is gone. The new name is
  the only name; nothing is kept "for one minor".

  Classes and types, old to new:

  | Removed                                                                                                                                                                                                  | Use                                                                                                                                                                          |
  | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `KjIconDirective`                                                                                                                                                                                        | `KjIcon`                                                                                                                                                                     |
  | `KjCardComponent`, `KjCardContentComponent`, `KjCardCoverComponent`, `KjCardFooterComponent`, `KjCardHeaderComponent`, `KjCardSubtitleComponent`, `KjCardTitleComponent`                                 | the same names without `Component`                                                                                                                                           |
  | `KjEmptyStateComponent`, `KjEmptyStateIconComponent`, `KjEmptyStateTitleComponent`, `KjEmptyStateDescriptionComponent`, `KjEmptyStateActionsComponent`                                                   | the same names without `Component`                                                                                                                                           |
  | `KjPopoverComponent`, `KjTooltipComponent`, `KjToastWrapperComponent`, `KjOverflowPanelComponent`, `KjPaginationDefaultComponent`, `KjDatetimePickerComponent`                                           | the same names without `Component`                                                                                                                                           |
  | `KjTableToolbarComponent`, `KjTablePaginationComponent`, `KjTableStatusBarComponent`, `KjTableSidePanelComponent`                                                                                        | the same names without `Component`                                                                                                                                           |
  | `KjCascadeOptionComponent`, `KjCascadeSubPanelComponent`, `KjComboboxEmptyComponent`, `KjComboboxLoadingComponent`, `KjConfirmPopupActionsComponent`, `KjFormActionsComponent`, `KjFormSummaryComponent` | the same names without `Component`                                                                                                                                           |
  | `KjCarouselPauseComponent`                                                                                                                                                                               | `KjCarouselPause`                                                                                                                                                            |
  | `KjCellTemplateDirective`                                                                                                                                                                                | `KjCellTemplate`                                                                                                                                                             |
  | `KjRovingTabindexItemDirective`                                                                                                                                                                          | `KjRovingTabindexItem`                                                                                                                                                       |
  | `KjRichTextExtensionDirective` (selector `[kjRichTextExtension]`)                                                                                                                                        | `KjRichTextFeatureDirective` (selector `[kjRichTextFeature]`)                                                                                                                |
  | `KjRichTextExtension`, `KjRichTextPlugin` (types)                                                                                                                                                        | `KjRichTextFeature`                                                                                                                                                          |
  | `KJ_RICH_TEXT_EXTENSIONS`                                                                                                                                                                                | `KJ_RICH_TEXT_FEATURES`                                                                                                                                                      |
  | `KjDateRange` from the table date filter                                                                                                                                                                 | `KjDateFilterRange` — it collided with the `date-range-presets` interface of the same name, and the collision made the tuple type unreachable from the package that ships it |

  Inputs, outputs and members, old to new:

  | Removed                                                                                                              | Use                                                                                                                                                                                   |
  | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `[kjBadge]`'s `kjBadgeVariant`                                                                                       | `kjVariant` — badge now composes `KjVariant` + `KjSize`                                                                                                                               |
  | `<kj-input>`'s `kjSize`                                                                                              | `size`                                                                                                                                                                                |
  | `KjRichTextEditor.kjExtensions`, `.kjPlugins`                                                                        | `kjFeatures`                                                                                                                                                                          |
  | `KjRichTextEditor.registerExtension()`                                                                               | `registerFeature()`                                                                                                                                                                   |
  | `KjSelectTrigger.kjDisabled`, `KjTreeSelectTrigger.kjDisabled` — the read-only getters; the **inputs** are unchanged | `disabled`                                                                                                                                                                            |
  | `KjMenubar.kjAutoDisclose`, `.kjAutoDiscloseDelayMs`                                                                 | nothing — both were published no-ops, since the primitives-based menubar never implemented roll-over disclosure. Hover is opt-in per consumer via `pointerenter` on `[kjMenubarItem]` |
  | `KjDatePicker.panelId` and `KjDatePickerContext.panelId`                                                             | `[kjFor]="trigger"` — the real id is minted by the composed `KjOverlayPanel`                                                                                                          |
  | `KjOverlayBadgeContentComponent.kjSize`                                                                              | the same public name, now owned once by the `KjSize` reached through `KjBadge`                                                                                                        |
  | `KjChatMessage.safe()`                                                                                               | nothing — `[innerHTML]` already sanitises at `SecurityContext.HTML`                                                                                                                   |
  | `KjCloseReason`'s `'esc'` spelling                                                                                   | `'escape'`                                                                                                                                                                            |

  ### Other behaviour changes worth reading before you upgrade
  - **`KjCalendarContext` gained a required `today` member**, fed by the new
    `KJ_TODAY` token; any third-party implementor must add it. `KjFieldContext`
    gained `labelRendered` and `registerLabel()`.
  - **Calendar day buttons are no longer natively `disabled`** — they use
    `aria-disabled` plus a click guard (the APG shape), and selection is conveyed
    with `aria-pressed`, not `aria-selected`, which ARIA prohibits on `button`.
    CSS hooks moved from `:disabled` to `[data-disabled]`.
  - **The toast viewport is no longer a live region.** Each toast is its own
    `status` / `alert` region, so an announcement happens once instead of twice.
  - **`[kjChartOption]` must be replaced, not mutated in place** — it is read by
    an `effect` now, which compares by identity.
  - **`<kj-rich-text-editor>`'s `textChange` and `jsonChange` are coalesced to an
    animation frame.** `valueChange` and the form value stay synchronous.
  - **Table persistence no longer writes `rowSelection`, `expanded` or
    `globalFilter`**, and is trailing-debounced 300 ms. Opt slices back in with
    `kjPersistedSlices`.
  - **A `<kj-table>` header renders `<button kjTableSort>`**, the body has a single
    Tab stop (roving), and the resize handle is a focusable `role="separator"`.
  - **Element ids changed shape.** Accordion, tabs and carousel item ids no longer
    embed the item value — a value containing a space produced an invalid IDREF —
    and `KjId.mint` counts per prefix, so overlay ids read `kj-panel-1` /
    `kj-overlay-1` instead of one interleaved sequence.

  ***

  ## By dimension

  ### Overlay

  The engine was sound; the strategy bus was wired incompletely.
  `focusTrap.onOpen` / `onClose` were called nowhere, so no modal trapped `Tab` or
  restored focus. The controller now drives the full close chain in a fixed order,
  disposes on host destroy (no more orphan stack entries), and settles a previous
  cycle before a re-open acquires anything. `closeOnEsc` and `closeOnOutside`
  reach `KjOverlayStack` at last, and outside-press has exactly one owner — an
  overlay that renders a scrim is never also dismissed by the stack. `data-side`
  and `data-align` are written from the position strategy, so popover and tooltip
  arrows are positioned. `anchoredTo` is RTL-aware, passive, rAF-coalesced, and
  hides a panel whose trigger has scrolled out of a clipping ancestor. Transition
  duration is measured from the state being _entered_, and takes the longest entry
  in a list rather than the first. `KjCloseReason` carries a real reason
  (`escape`, `outside`, `backdrop`, `trigger`, `select`, `tab`, `programmatic`).
  The styled `<kj-command-palette>` and `[kjSpeedDial]` are built on the primitive
  instead of forking it.

  ### Styles and theming

  Four `var()` chains resolved to nothing, two of them focus rings that vanished
  entirely; a new spec walks the whole `@import` graph and fails on any chain
  whose innermost fallback is undeclared. Every theme declares `color-scheme`.
  `retro`'s focus ring (2.27:1) and destructive text (3.18:1), and
  `orrery-light`'s subtle and intent tokens, now meet contrast. `--kj-bg-overlay`
  backs every scrim, `--kj-space-2xs` exists, `.kj-card[data-shadow="lift"]` draws
  something, and the `--kj-ctl-h-*` density ladder scales control heights — except
  where a 2.75 rem WCAG 2.5.5 floor must not shrink, which is asserted. One
  central `prefers-reduced-motion` block zeroes the motion primitives, with a
  per-sheet guard on each of the 24 sheets carrying a literal duration. Stylelint
  enforces both halves of the house rule: every stylesheet is layered
  (`kouji/layered`) and every selector is anchored by a `.kj-` class, a `kj-`
  element, a `[data-*]` hook, `:root`, `:host` or `::backdrop`
  (`kouji/namespaced`). The docs example theme moved off the `--kj-` namespace to
  `--docs-*`, so it can no longer redefine four real contract tokens.

  ### Customization

  There were four competing customization stories. There is now one: DI presets.
  `KjVariant`, `KjSize`, `bindPresets` and the preset tokens are documented public
  API — they already shipped in the `.d.ts`. `KjAlert` and `[kjBadge]` dropped
  their hand-rolled duplicates and compose them, so both participate in the
  variant and size fallback cascade. Every `provideKj*` takes `KjDeepPartial<T>`
  and deep-merges through `mergeKjConfig`, so `provideKjButton({ defaults: { size:
'lg' } })` keeps `defaults.variant`. `KjExtensible<T>` opens the stylistic
  unions without losing literal autocomplete. `kjClass` forwards a consumer's
  class onto the styled root of a `display: contents` wrapper, which is what makes
  the documented "layer a class on the host" escape hatch true. New:
  `provideKjMotion`, `provideKjBadge`, `provideKjDirectionality`, and every
  `provideKj*` and `KJ_*_CONFIG` re-exported from `@kouji-ui/components`, guarded
  by a spec that scans core's sources and fails when one is missing.

  ### Accessibility

  The critical finding — three list components keyboard-inoperable once open — is
  fixed, along with the reason it went unnoticed: specs that dispatched keys on
  elements a user can never focus. Keyboard assertions now press from
  `document.activeElement` after real focus. The data grid has a roving tab stop,
  sortable headers are buttons, and column resizing is keyboard-operable. Roving
  tabindex follows the selection, survives removal of the active item, and skips
  disabled or hidden ones. Tooltips open on keyboard focus and describe their
  trigger. `<kj-field>` wires `id`, `aria-describedby`, `aria-invalid` and
  `aria-required` onto composing controls automatically. Dialogs, drawers and
  sheets have accessible names, with a dev-mode warning when nothing names a
  panel. The calendar is an APG grid — `role="group"` root, `gridcell` cells,
  `aria-pressed` days — that no longer steals focus on mount. Live regions are
  single-level, and status announcements were added for table sort and filter and
  for password strength. 22 hard-coded English accessible names moved into the
  i18n catalog, and the remainder are fenced by a shrink-only CI gate.

  ### Micro-frontends

  MFE is now a decided posture rather than an accidental one: two independently
  bootstrapped Angular apps in one document is documented as **not supported**
  (`rules/architecture.md`). Within that boundary, the incidental global state is
  gone. All 41 module-scope id counters and 4 `crypto.randomUUID()` seeds route
  through an injectable `KjId` with a `KJ_ID_NAMESPACE` token; the overlay
  container is discovered in the DOM and self-heals; the scroll-lock refcount and
  saved styles live on `<html>`; live regions are looked up by attribute; the
  Monaco loader memo is page-scoped; `onHotkey` takes a target and yields to a
  handler that already claimed the keystroke; and `provideKjDocumentDirection`
  documents its single-writer contract and warns when another writer disagrees.

  ### SSR

  `server.ts` and the hand-written static servers are gone — one remains, with a
  path-traversal guard. Every bare `document`, `window`, `navigator`,
  `localStorage` and `sessionStorage` in both packages, about 90 sites across 40
  files, now goes through `inject(DOCUMENT)`, `node.ownerDocument` or a named and
  commented `globalThis` helper, and an ESLint `no-restricted-globals` rule keeps
  it that way. `KjLink`'s external-suffix span is hydration-idempotent; the file
  upload input is created in `afterNextRender`; the virtual table server-renders a
  seeded window instead of nothing; and `KJ_TODAY` keeps a server clock from
  prerendering an `aria-current="date"` the client disagrees with. 66 of 69
  component doc pages now server-render a live component, asserted against the
  emitted HTML.

  ### Lazy loading and bundle

  The docs component-doc route no longer eagerly bundles all 69 playgrounds.
  `provideLucideIcons({ Settings, Trash2 })` registers a tree-shaken subset, and
  the zero-argument form installs a dynamic-import loader — `lucide-static` and
  `@tanstack/virtual-core` are optional peers, verified absent from the built
  FESM. The styled `<kj-chart>` honours `provideECharts` instead of always pulling
  the full build. `marked`'s two module-scope `marked.use()` calls are gone,
  replaced by a lazily constructed private instance, which also stops our
  HTML-escaping renderer overrides from leaking into a consumer's own `marked`.
  Examples and playgrounds are excluded from library builds, with a graph walker
  that fails the build if `public-api.ts` can reach one. Per-package bundle
  budgets, raw and gzip, run in CI, and the entry FESM is scanned for static
  imports of the heavy peers.

  ### Performance

  `KjChart` re-applied the full ECharts option on every application change
  detection cycle; it is an `effect` now, with a memoised themed palette. Rich
  text did four full-document walks per update and now does one, with an empty
  check that short-circuits on the first block. Streaming chat markdown was
  re-lexed from the top on every token; it is incremental now, with a property
  test proving chunked streaming is byte-identical to one full parse. Lists are
  windowed, so a 5 000-option listbox mounts a window rather than 5 000
  directives, with `aria-posinset` and `aria-setsize` still describing the
  dataset. Tree-select renders only visible rows instead of hiding collapsed ones.
  Shared root services replace per-instance observers: `KjInputModality`,
  `KjThemeObserver`, `KjResizeObserver` and `KjReducedMotion`, which gained
  `matchesNow()` for readers that run before the first render. Selection
  membership is an indexed set that falls back to a linear scan when a custom
  comparator would make an index unsound.

  ### Architecture and code quality

  CI runs lint, typecheck, tests, build, a bundle-size gate and a separate e2e
  job. The rules files no longer describe a codebase that stopped existing:
  `ViewEncapsulation.None` is documented as required, and why, and `RULES.md`
  carries a table naming, per clause, whether a check enforces it or a human must
  — with a PR template for the two that cannot be linted. What can be enforced now
  is: `booleanAttribute` on boolean inputs (`kouji/boolean-input-transform`); no
  `@Input`, `@Output`, query decorators, `@HostListener` or lifecycle hooks
  (`no-restricted-syntax`); no bespoke `ControlValueAccessor`
  (`kouji/no-bespoke-value-accessor`); no browser globals; one directive per file
  and the class and file naming rule (`architecture.spec.ts`,
  `class-naming.spec.ts`). Diagnostics route through `kjDevWarn`, `kjDevAssert`
  and `kjError`, so the branches _and their message strings_ leave a production
  build, and a child used outside its parent gets a message naming both ends
  instead of `NG0201`. Seven spec-less features gained behavioural specs.

### Patch Changes

- 6e43ded: **Batch 7 cross-area closures.** The last compat shims the no-alias ruling
  covers, the two remaining parent-context diagnostics, and the packaging gap the
  Vite / Analog install path was still missing.

  **Breaking — two compat shims deleted.** `KjChatMessage.safe()` is gone; bind
  `block.html` to `[innerHTML]` directly, which _is_ `DomSanitizer` at
  `SecurityContext.HTML` and runs once per change rather than once per check. The
  `'esc'` member of `KjCloseReason` is gone along with the controller's
  normalisation of it — use `'escape'`. Both were kept only so existing code
  would keep compiling, which is exactly the shape the ruling forbids.

  **Diagnostics (arch F-14).** `KjProgressBarFill` and `KjTagRemove` were the last
  two children in core reading their parent's token through a bare `inject()`;
  both now use `injectParent`, so a mis-composed child fails with
  ``[KjTagRemove] must be used inside `[kjTag]`…`` instead of `NG0201: No
provider for InjectionToken KjTag`. `KjTablePagination`'s
  `injectParent(KJ_TABLE, …) as KjTable<unknown>` cast is deleted — `KJ_TABLE` is
  declared `InjectionToken<KjTable<unknown>>`, so the cast asserted a type the
  token already carried. `<kj-textarea>`'s counter warning routes through
  `kjDevWarn`, so its message string leaves production builds with the branch.
  Every allowance in `packages/core/src/architecture.spec.ts` is now an empty
  expectation: core is at zero on all three checks.

  **Shared observers (perf F-5).** The styled `<kj-chart>` built one
  `ResizeObserver` per instance — it is a standalone ECharts host, not a
  composition of the core `[kjChart]`, so the earlier sweep missed it. It now
  rides the root `KjResizeObserver`: a twenty-chart dashboard adds no observers at
  all, and the service's own rAF coalescing replaces the component's.

  **Packaging (ssr F-8).** `@kouji-ui/themes`, `@kouji-ui/core` and
  `@kouji-ui/components` now export `./package.json`. A tool that resolves
  `<pkg>/package.json` — routine for dependency scanning, and something Vite does
  — previously got `ERR_PACKAGE_PATH_NOT_EXPORTED` from the themes package, which
  ships no `ng-package.json` and so never had the entry generated for it.

  **Prerender (ssr F-16).** `KjCarousel` read a slide's required `kjSlideValue`
  before the first binding, emitting an `NG0950` on every prerendered page holding
  a carousel. Guarded the way `KjTable` was in batch 2: the read still registers
  the dependency, so the computed recomputes once the value arrives.

## 0.1.2

### Patch Changes

- 679b776: Remove the `orrery` and `orrery-light` themes.

  They were app-specific palettes for Orrery, not general-purpose themes, and
  now live in that app's own stylesheet. `@kouji-ui/themes/themes/orrery.css`
  and `@kouji-ui/themes/themes/orrery-light.css` no longer resolve, and the
  bundle export no longer defines `[data-theme="orrery"]` /
  `[data-theme="orrery-light"]`. The density layer stays.

## 0.1.1

### Patch Changes

- 01f65ef: Add an app-wide density layer and the `orrery` / `orrery-light` themes.

  **Density** (`@kouji-ui/themes/density.css`, exported from `index.css`)

  Density previously existed only on the table (`--kj-table-row-height`). It is now
  a library-level concern driven by two inherited scalars, `--kj-density` and
  `--kj-type-scale`, set by `[data-density="compact" | "standard" | "comfortable"]`
  on any element (`comfy` is accepted as an alias). Because the scalars inherit,
  a dense region nests inside a comfortable app with no extra rules.

  New additive tokens — nothing is renamed:
  - numeric spacing ladder `--kj-space-1..11`, with the existing t-shirt names
    re-pointed at it (`xs`→2, `sm`→4, `md`→6, `lg`→7, `xl`→9, `2xl`→11). Every
    t-shirt token resolves to its previous value at density 1.
  - type steps `--kj-text-3xs`, `-2xs`, `-3xl`, `-4xl`, `-display`, plus
    `--kj-text-code` / `--kj-leading-code` for editor and terminal surfaces that
    take metrics as JS numbers.
  - control-height ladder `--kj-ctl-h-{xs,sm,md,lg,xl}` and `--kj-row-h`.
    `button` and `input` now resolve their per-size heights from it, so density
    scales every variant uniformly. Values are unchanged at density 1.
  - `kjSize="xs"` on `KjButton` (28px), matching the `xs` that `KjInput` already
    had. Intended for dense application chrome; it sits below the 44px touch
    floor and is documented as such.

  `--kj-table-row-height` now defaults to `--kj-row-h`. Its
  `:host([data-density])` values are untouched, so existing tables keep their
  exact pixel heights — the change is that a table also inherits density from an
  **ancestor** `[data-density]`, which it previously ignored.

  Only the scalars and the JS-read height ladder are registered via `@property`.
  The existing `--kj-space-*` / `--kj-text-*` deliberately are not: registration
  makes invalid-at-computed-value-time _apply_, which would silently discard a
  consumer override.

  **Themes**

  `orrery` (graphite — flat ~0.005 OKLCH chroma across the neutral ramp,
  elevation as a lightness step plus a hairline) and `orrery-light` ("paper" —
  elevation goes down, the editor is the single brightest surface). Both declare
  the full 53-token shared-layer contract.

  Note: derived values use CSS `round()` (Baseline 2024). Where unsupported the
  declaration is invalid and the token falls back to its density-1 literal.

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
