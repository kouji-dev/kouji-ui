# @kouji-ui/components

## 0.10.0

### Minor Changes

- 6e43ded: review retry: badge joins the preset system, roving axes survive an unbound orientation, and a slider's two-way value stops snapping back

  **Badge is preset-driven (breaking, clean break).** `KjBadge` composed nothing
  and hand-rolled `kjBadgeVariant` → `data-variant`, a closed union living in the
  zero-CSS core package and typed against CSS that ships in
  `@kouji-ui/components`. It now composes `KjVariant` + `KjSize` via
  `hostDirectives` and spreads `bindPresets(KJ_BADGE_CONFIG)`, exactly like
  `[kjTag]` and `[kjButton]`.
  - `kjBadgeVariant` is **removed**. Use `kjVariant`: `<span kjBadge
kjVariant="destructive">` (no alias — per the rename rule, the new name is
    the only name). `kjBadgeDot` is unchanged.
  - `kjSize` is **new on the directive**, reflecting `data-size`. It was
    wrapper-only before, so `[kjBadge]` on your own `<span>` now sizes without
    re-implementing the attribute.
  - New: `provideKjBadge(…)`, `KJ_BADGE_CONFIG`, `KJ_BADGE_DEFAULTS`,
    `KjBadgeConfig` — re-exported from `@kouji-ui/components` like every other
    config surface. Register a brand variant instead of living with the dev-mode
    warning:
    `provideKjBadge({ variants: [...KJ_BADGE_DEFAULTS.variants, 'brand'] })`.
  - A badge now participates in the `KJ_VARIANT_FALLBACK` / `KJ_SIZE_FALLBACK`
    cascade, so an unset `kjVariant` inside a compound parent that publishes one
    follows it rather than always painting `default`.
  - `KjBadgeVariant` survives as the open documentation alias
    (`KjExtensible<…>`) annotating `<kj-badge>`'s `variant` input. The styled
    `<kj-badge variant size>` and `<kj-overlay-badge kjVariant kjSize>` inputs
    are unchanged — only the headless attribute name moved.
  - `<kj-overlay-badge-content>` no longer declares its own `kjSize`; the same
    public name is now owned once, by the composed `KjSize` reached through
    `KjBadge`.

  **Roving axis on an unbound orientation.** `<ol kjStepper>` and `<ul kjList>`
  forwarded their `kjOrientation` to the composed `KjRovingTabindex` through a
  `hostDirectives` input alias — and an alias carries a _binding_, never a
  default. Left unbound, the host reported `data-orientation="horizontal"` /
  `"vertical"` while the primitive stayed at `'both'`, so ArrowDown walked a
  horizontal stepper and ArrowRight walked a vertical nav list. Both now pin the
  axis with `KJ_ROVING_ORIENTATION_DEFAULT` (the mechanism `[kjTabList]` already
  used), which carries the effective value whether or not the input is bound. An
  explicit `kjRovingOrientation` binding still wins.

  **Slider: a `[(kjValue)]` write is no longer reverted.** `KjSliderThumb`'s
  `KjFormControl` bridge read `kjValue` _tracked_ inside the effect that writes
  it, so a consumer's own two-way write re-ran the effect, which compared the new
  value against the unchanged form-control value and put the old one back. The
  comparison now reads through `untracked`; the form control still drives the
  thumb, and a keyboard step still reaches the form control.

- 6e43ded: review batch 5 (lists): selection membership is indexed, the tree renders only what is visible, and the combobox / command palette can window 5 000 rows

  **Selection membership is O(1) (perf F-6).** `KjSelectionModel` keeps `value`
  as the array it always was, but multi-style membership now answers from a `Set`
  index rebuilt once per value change instead of a linear `some()` scan run once
  per rendered item. A click in a 5 000-option multi-select cost O(n × m)
  comparisons — every item's `aria-selected` computed rescanned the whole
  selection — and now costs one O(m) rebuild plus O(1) per item. `_multiToggle`
  and the cascade branch toggle use the same index. A custom `compareBy` keeps the
  scan, because no hash structure can honour it; `-0` falls back too, so the
  indexed answer is bit-for-bit what `Object.is` would have said.

  **Auto-derived tree topology is O(1) per query (perf F-7).** The shape derived
  from DOM-nested `KjListItem` parents resolved every `getParent` / `getChildren`
  / `isLeaf` by scanning all map keys. It now probes the map first — which is the
  default `Object.is` comparator, natively — and keeps the scan only as the
  custom-comparator fallback. `cascadeState()` is memoised per (value, shape,
  mode) version, so the siblings rendering one branch walk it once between them
  instead of once each.

  **`<kj-tree-select>` renders only the visible rows (perf F-14).** A collapsed
  branch's descendants leave the DOM instead of staying behind `[hidden]`: a
  5 100-node tree with one branch open now mounts 150 rows, not 5 100. Visibility
  is one pass over the flattened tree per expansion change (depth-based, so a
  collapsed subtree is skipped whole) rather than a method binding re-evaluated
  per row per render, and `selectionMode() === 'multiple'` is hoisted out of the
  row loop. `KjTreeSelect.expandedIds` / `expandedValues` no longer hand out a
  defensive `new Set` copy on every read.

  _Behaviour note:_ the documented "all nodes stay in the DOM" posture is gone.
  `aria-level` / `aria-posinset` / `aria-setsize` are unchanged and still correct
  — they describe a node's position among its siblings, and siblings are always
  shown or hidden together — but code that queried collapsed rows through
  `document.querySelector` will no longer find them.

  **Windowed lists for combobox and command palette (perf F-4).** New core
  primitive `KjListVirtual` (`[kjListVirtual]`, no new dependency) windows a
  uniform-row popup list: it exposes the rendered range plus the spacer sizes,
  measures a rendered row for its height, seeds the first rows on the server, and
  scrolls a row into the window on demand.
  - `<kj-command-palette [kjVirtual]>` windows its `[kjItems]` rows.
  - `<kj-combobox [options]>` is a new data-driven option list, and `[virtual]`
    windows it. `<ng-template kjComboboxOptionTemplate>` supplies a custom row.

  Keyboard navigation still walks the whole dataset: `KjListNavigatorConfig`
  gained an optional `virtual` cursor (`KjListVirtualSource`), and when a
  container exposes one, `KjListNavigator` moves by dataset index — wrap, clamp
  and skip-disabled included — and the container scrolls the row into the window
  before it becomes `aria-activedescendant`. `aria-posinset` / `aria-setsize`
  report the dataset, not the window, via `KjFilterableList.setWindow()`.

  **Fixed while wiring the above: `<kj-combobox-option>` never registered.** It
  composed `KjComboboxOption` on an inner `<button>` inside its own view, and
  `KjCombobox.items` is a content query — which never crosses into a child
  component's view. Projected options were therefore never filtered, never
  numbered, never navigable and never announced their selected state. The
  directive now sits on the `<kj-combobox-option>` host, the same fix (and the
  same reasoning) the menubar item got in batch 4.

  _Behaviour note:_ the rendered option is now `<kj-combobox-option role="option"
class="kj-combobox-option">` with no inner `<button>`. `[value]`, `[disabled]`
  and projected content are unchanged; `[disabled]` now reaches the listbox as
  `aria-disabled` rather than the native attribute. `KjCombobox` also gained an
  `@internal` `_setViewItems()` so a wrapper that stamps rows in its own view can
  register them.

  `[kjDisabled]` is now forwarded by `[kjComboboxOption]`.

  **Fixed for the same reason: `<kj-tree-select>` had no keyboard access.** Its
  rows are painted by the wrapper's own template, which the root's content query
  cannot see, so the tree registered zero items: every node rendered
  `tabindex="-1"`, the panel had no roving tab stop, and neither arrow keys,
  Home / End nor type-ahead could reach a node (WCAG 2.1.1 Keyboard, 2.4.3 Focus
  Order). Each `<kj-tree-select-node>` now registers its row with the wrapper,
  which hands them to `KjTreeSelect` in tree order. `ownListItems()` gained an
  optional third argument for this, and `KjTreeSelect` an `@internal`
  `_setViewItems()`.

  _Behaviour note:_ opening the styled tree now moves focus onto the selected —
  else first — node, which is what `KjListPanelFocus` always intended and what
  the APG tree pattern asks for; it simply had no items to focus before.

  **And, for the third time, `<kj-select>`.** `<kj-option>` composed the core
  `KjOption` directive on a `<div>` inside its own view, so `KjSelect.items` —
  also a content query — was empty: the listbox had no roving tab stop (every row
  rendered `tabindex="-1"`), no ArrowUp / ArrowDown / Home / End, no type-ahead
  and no `aria-posinset` / `aria-setsize` (WCAG 2.1.1, 2.4.3, 1.3.1). `KjListItem`
  now sits on the `<kj-option>` host.

  _Behaviour note:_ the rendered option is `<kj-option role="option"
class="kj-option">` with no inner `<div>`, and the host is a block rather than
  `display: contents`. `[value]`, `[kjLabel]` and projected content are
  unchanged, and `<kj-option>` gained a `[disabled]` input that reaches the
  listbox as `aria-disabled`.

- 6e43ded: overlay: anchored positioning is correct, cheap and RTL-aware; the speed dial and the styled command palette become real overlays

  **Anchored positioning** (`anchoredTo`)
  - The resolved placement is finally reachable. `KjOverlayPanel` reflects it as
    `data-side` / `data-align` on the panel, which is what every popover and
    tooltip arrow rule has always been keyed on — `.kj-popover-arrow` and
    `.kj-tooltip-arrow` were rendering at the panel's static position because
    no `data-side` was ever written. Both attributes are physical (post-flip,
    post-RTL-mirror) and are removed when the panel closes. New
    `--kj-popover-arrow-inset` / `--kj-tooltip-arrow-inset` let a start/end
    aligned arrow track the edge that meets the trigger.
  - Scroll and resize repositioning is `{ passive: true }` and coalesced into
    one measure+write per frame. It used to run a forced synchronous layout per
    event, in capture on `window`, for every scroll container in the document
    and every open anchored overlay. Style writes are now skipped when the
    value has not changed, so a frame in which nothing moved leaves layout
    clean.
  - `side` and `align` are read as _logical_ names: under `dir="rtl"`,
    `align: 'start'` pins the panel to the trigger's inline start (its right
    edge) and `side: 'left' | 'right'` mirror. The direction comes from the
    anchor's nearest `[dir]` ancestor, the same rule `KjDirectionality` and
    `KjRovingTabindex` already apply. Opt out per overlay with
    `anchoredTo({ mirrorInRtl: false })`.
  - New `pxOffset(fallback)` input transform. `[kjOffset]="0"` — a panel flush
    against its trigger — was silently coerced back to the default gap at all
    six anchor points (popover, tooltip, select, combobox, tree-select,
    date-picker); every finite number now gets through.

  **Transitions and first paint** (`KjOverlayController`)
  - `data-state` is written on the panel before its styles are measured, so a
    stylesheet that declares its duration under `[data-state="closing"]` — the
    normal pattern — is honoured instead of measuring `0s` and having its
    animation cut off on the next frame. The deadline takes the longest
    `duration + delay` pair across a comma-separated list rather than
    `parseFloat`'s first entry.
  - The panel is re-anchored once it is fully open, so a panel whose open state
    changes its box lands where it belongs.

  **Speed dial** is an overlay

  `[kjSpeedDial]` now owns a `KjOverlayController` (in-place mount, CSS
  position) and registers with `KjOverlayStack` while open. Escape closes it
  from anywhere inside the cluster rather than only from the trigger, a press
  outside dismisses it, focus returns to the trigger on close, and a dial open
  over a dialog no longer answers the same Escape as the dialog. The action
  cluster is the overlay panel, so it gains `data-state` and `hidden` while
  closed; the shipped stylesheet keeps it in layout so the fan-out still
  animates. `KjSpeedDialContext.close()` takes an optional close reason.
  `KjSpeedDial.kjOpen` is now a read-only signal over the controller — write
  through `[(kjOpen)]`, `open()`, `close()` or `toggle()`.

  **`<kj-command-palette>`** is an accessible modal

  The styled palette rendered its own shell and scrim and talked to
  `KjOverlayStack` directly: `aria-modal="true"` over a page that was neither
  inert nor scroll-locked, uncontained Tab, and no focus restoration. It is
  rebuilt on `KjOverlayController` — portalled mount, `blurredBackdrop({ inert:
true })`, `tabCycle`, `htmlOverflow` scroll lock, focus returned to the opener
  — and its `mod+k` chord goes through the shared `onHotkey`. Escape still gives
  the first press to the search box when the query is non-empty. The
  `.kj-command-palette__shell` and `.kj-command-palette__backdrop` elements are
  gone; the panel is `.kj-command-palette__dialog` and the scrim is the shared
  `<kj-backdrop>`. Public inputs, outputs and methods are unchanged.

- 6e43ded: review batch 5 (rendering): charts, the rich-text editor and the chat thread stop re-doing work on every change-detection tick

  **`[kjChart]` re-reads its option only when the option changes (perf F-1).**
  The directive drove ECharts from `afterEveryRender`, so every change-detection
  pass anywhere in the app re-ran `setOption` and re-resolved the themed palette
  (one `getComputedStyle` plus up to eleven custom-property reads). Both now run
  from an `effect()`. The palette is memoised and refreshed by the theme
  `MutationObserver`, which additionally observes the host's nearest
  `[data-theme]` ancestor so a scoped theme wrapper still re-colours its chart;
  new public `KjChart.refreshPalette()` is the escape hatch for an ancestor that
  gains `data-theme` after initialisation.

  _Behaviour note:_ `[kjChartOption]` must now be **replaced**, not mutated in
  place. `afterEveryRender` re-read the same object every tick, so an in-place
  mutation was eventually picked up; an `effect` compares by identity.

  **`<kj-chart>` honours `provideECharts` and reacts to `theme` (lazy F-3, perf
  F-19).** The styled wrapper hard-imported the full `echarts` build, so an app
  that registered a tree-shaken loader still paid for the whole library. It now
  resolves `KJ_ECHARTS` and falls back to `import('echarts')`. Its
  `ResizeObserver` is coalesced through `requestAnimationFrame` and cancelled on
  destroy, and `theme` — read once at init and silently inert before — now
  disposes and re-creates the instance, guarded so a superseded or
  destroyed-during-await initialisation bails.

  **Rich text: one document walk per update instead of four (perf F-2).**
  `onValue` now hands over a snapshot whose `text()` and `json()` are thunks over
  the immutable editor state, and the `empty` flag behind `data-empty` (the
  placeholder) short-circuits on the first non-empty block rather than
  materialising the whole document's text. `KjRichTextEditor`'s emptiness
  semantics are unchanged, including that two empty paragraphs are not an empty
  document.

  _Behaviour note:_ `textChange` and `jsonChange` are now coalesced to one
  animation frame (latest value wins). `onChange` / `valueChange` and the
  `ControlValueAccessor` form value stay synchronous.

  **Chat: streaming markdown is linear, not quadratic (perf F-10, F-11, F-20).**
  New exported `createMarkdownRenderer()` keeps a per-message renderer that
  re-parses only the block still being written and hands committed blocks back by
  reference, so a long streamed reply is no longer re-lexed and re-sanitised from
  the top on every token. `<kj-chat-message>` binds `block.html` directly — an
  `[innerHTML]` binding _is_ `DomSanitizer` at `SecurityContext.HTML` — so the
  sanitiser runs once per change instead of once per check; `KjChatMessage.safe()`
  is removed (batch 7's clean-break ruling — bind `block.html` directly).
  `<kj-chat-thread>` memoises its rows by message
  identity, so a registered custom renderer's `item` input is no longer re-set on
  every streamed token.

  _Behaviour note:_ while a reply streams, its body renders one `.kj-chat-md`
  block per committed markdown block rather than a single one. The blocks are
  role-less `<div>`s, so the accessibility tree is unchanged, but a consumer
  stylesheet using `:only-child` or sibling selectors on `.kj-chat-md` needs
  re-checking. A message containing a link reference definition (`[id]: url`)
  falls back to a full parse, because a definition resolves links above it.

- 6e43ded: review batch 4: the styled menubar actually works, the rules files are machine-checked, and the spec/typecheck quarantines are gone

  **Menubar (components).** `<kj-menubar-item>` composed `KjMenubarItem` on an
  inner `<button>`, inside the component's own view. The bar's `KjListNavigator`
  finds its items with a `contentChildren(KjListItem)` query, and a content query
  never crosses into a child component's view — so the styled bar registered its
  items through DI (clicking one opened its submenu) while the navigator saw
  nothing: no roving tab stop, no arrow keys, no skip-disabled, every item its own
  Tab stop. The directive now sits on the `<kj-menubar-item>` host, exactly as
  `KjMenubar` already sat on `<kj-menubar>` and for the same reason. The rendered
  DOM changes — the item _is_ the `<kj-menubar-item>` element (`role="menuitem"`,
  roving `tabindex`, `class="kj-menubar-item"`) instead of wrapping a `<button>` —
  and `.kj-menubar-item` styling is unaffected because it was already a bare class
  selector. `<kj-menubar-item>` also gained `[kjDropdownMenuTriggerFor]`, forwarded
  to the composed directive, which is what closes the long-standing
  "menubar+dropdown-menu wiring pending" TODO: the styled wrapper can now disclose
  a submenu, which is what a menubar is for.

  **Menubar keyboard (core).** ArrowDown / ArrowUp on a bar item opened the wrong
  submenu. The composed navigator's orientation is `'vertical'` and it wraps, so
  its bubble-phase handler moved the bar's roving focus first and `KjMenubar` then
  disclosed _that_ item — pressing ArrowDown on the last item opened the first
  item's menu. Both keys are now owned by a capture listener on the bar, which
  discloses the item the key was pressed on and stops the dispatch. A disabled
  item discloses nothing.

  **Rules, enforced (repo).** `eslint.config.js` gained three checks that used to
  be prose: `no-restricted-globals` for `document` / `window` / `navigator` / web
  storage across library sources (SSR), a local `kouji/binding-prefix` rule
  requiring a `kj`-prefixed public name on every `input()` / `output()` /
  `model()` in `@kouji-ui/core`, and a local `kouji/component-styles-layered` rule
  keeping component CSS out of inline `styles` arrays and pairing `styleUrl` with
  `ViewEncapsulation.None`. `rules/code_style.md` now documents
  `ViewEncapsulation.None` as the architecture it has been for 92 components
  rather than banning it, and states the DOM-globals rule; `RULES.md` records
  which clauses CI can see and which it cannot.

  **Tests.** The styled `checkbox`, `radio`, `toggle`, `input-group`,
  `input-mask`, `menubar` and `overflow` features had no spec at all and now have
  one each; the `popover`, `tooltip` and `dropdown-menu` wrapper specs were three
  `it.todo` placeholders and are now behavioural suites covering open, keyboard,
  close and focus return. Both packages' `tsconfig.typecheck.json` quarantine
  lists are empty: every spec that carried pre-existing type errors was fixed, so
  `pnpm typecheck` covers the whole source tree.

  **Ids are minted per injector (core).** Every DOM id the library generates went
  through a module-level counter (41 of them) or `crypto.randomUUID()`. Both are
  module state: two Angular roots in one document minted the same ids, and the
  random seeds differed between the server render and the client, so hydration
  found `for=` / `aria-controls` / `aria-labelledby` pointing at nothing. Ids now
  come from an injectable `KjId`, counted per prefix so every existing id keeps
  its exact shape, and a new `KJ_ID_NAMESPACE` token suffixes them when two roots
  share a page (a second root that leaves it unset gets a dev-mode warning). The
  eight exported `next*Id()` helpers keep their signatures.

  _Behaviour change:_ accordion, tab and carousel item ids no longer interpolate
  the item's value — `kj-accordion-trigger-<value>-<n>` became `<minted>-trigger`.
  A value containing a space or quote used to produce an invalid IDREF, and the id
  changed whenever the value did, breaking a live `aria-controls`. Anything
  selecting those ids in CSS or a test needs updating.

  **Overlay page state (core).** Scroll-lock refcounting and the saved inline
  styles moved onto `<html>`, and `htmlOverflow()` / `cssClip()` deliberately
  share one key — separate counts left the page unscrollable with no overlay open
  when a `cssClip` lock nested above an `htmlOverflow` one, or when locks were
  released out of order. Live regions are found in the DOM by
  `[data-kj-live-region]` instead of a module map, so there is exactly one polite
  and one assertive region per document and they survive an app unmount/remount.
  The overlay container is likewise discovered by `[data-kj-overlay-container]`
  and self-heals if app code removes the root.

  **SSR (core).** Every bare `document` / `window` / `navigator` / `localStorage`
  / `sessionStorage` in shipped sources (~90 sites) now resolves through injected
  `DOCUMENT`, an element's `ownerDocument`, or a named, commented `globalThis`
  helper in the three genuinely injector-less places. `KjLink`'s "(opens in new
  tab)" suffix adopts the server-rendered span instead of appending a second on
  hydration, and disappears when `kjExternal` flips to false. The file-upload
  trigger's hidden `<input type="file">` is created in `afterNextRender`, not the
  constructor. The Monaco loader memo is page-scoped, so two roots share one AMD
  loader instead of racing.

  **Configuration (core).** Every `provideKj*` now takes a deep partial and merges
  it over the shipped defaults through one helper, so
  `provideKjButton({ defaults: { size: 'lg' } })` type-checks and keeps
  `defaults.variant`. Arrays still replace — spread `KJ_*_DEFAULTS.variants` to
  extend. `KjVariant`, `KjSize`, `bindPresets` and the preset tokens are
  documented public API rather than `@internal`: composing them is the supported
  way to build a component that plays the same `provideKj*` game. `provideKjMotion`
  and `provideKjDirectionality` are new, and `@kouji-ui/components` re-exports
  every `provideKj*` / `KJ_*_CONFIG` (a spec fails when core adds one the barrel
  misses).

  **Assistive strings follow the i18n catalog (core).** Pagination, breadcrumb,
  spinner, alert-dismiss/actions and the OTP completion announcement had English
  baked into their config defaults, so a French catalog alone could not translate
  them. They now resolve `config field ?? catalog ?? EN` as signals, and
  re-render on a runtime locale change. _Behaviour change:_ an app that registered
  a non-English catalog will see those labels translated where they were English
  before, and `KJ_PAGINATION_DEFAULTS` / `KJ_BREADCRUMB_DEFAULTS` no longer carry
  label literals (the fields are now optional). A new `pnpm check:aria-labels` CI
  gate fails on any _new_ hard-coded accessible name in shipped markup.

  **Disabled is behaviour, not decoration (core).** `<kj-checkbox [disabled]>`,
  `<kj-radio [disabled]>` and `<kj-toggle [disabled]>` announced
  `aria-disabled="true"` and still toggled, selected and pressed on a direct
  click or Space — the announced state contradicted what the control did (WCAG
  4.1.2), and a disabled radio could move the group's value (3.2.2). All three now
  guard their state change. `KjCheckbox` also gained `kjIndeterminate`, so
  `<kj-checkbox [indeterminate]>` finally reports `aria-checked="mixed"` as its
  documentation always claimed.

  **Radio groups are one Tab stop (components).** Every `<kj-radio>` hard-coded
  `tabindex="0"`, so an n-option group was n Tab stops and a disabled option was
  still one of them. The group composes `KjRovingTabindex` and the dot is a roving
  item: Tab lands on the checked radio (or the first), arrow keys cycle and skip
  disabled options, Space/Enter selects (WCAG 2.4.3, APG radiogroup).

  **Popovers have a name (core).** `<kj-popover-content>` renders
  `role="dialog"`; `[kjPopoverTitle]` minted an id that nothing consumed, so the
  panel was an unnamed dialog (WCAG 4.1.2). The popover family now uses the same
  `KJ_OVERLAY_TITLE_HOST` contract as dialog/drawer/sheet, and gained
  `kjAriaLabel` / `kjAriaLabelledBy` inputs; dev mode warns when a panel opens
  with no name at all.

  **`KjIconDirective` is now `KjIcon`** (and `icon.directive.ts` is `icon.ts`).
  The class and its file dropped the Angular type suffix per the repo's naming
  rule — nothing else in the feature is called `KjIcon`. This is a clean break:
  there is no alias under the old name. Update imports to `KjIcon`.

  **Smaller fixes.** Core `KjTabs` owns its own preset wiring, so a headless
  `<div kjTabs>` reflects `data-variant` and `provideKjTabs(…)` reaches it — it
  previously only worked through the styled package. `<kj-input-group>`'s
  `kjVariant` / `kjSize` reached nothing and are now really forwarded.
  `<kj-progress-bar [kjValue]="null">` type-checks, matching the indeterminate
  posture it documents. `KjList`'s `kjArrowNavigation` accepts the bare attribute
  form its own example uses. `<kj-input-mask>` gained `[(value)]` — the CVA is on
  the inner input and was unreachable. A group label outside a group now throws a
  library error naming the parent it needs instead of a bare `NG0201`. A table
  filter's text input carries its column caption as a real accessible name rather
  than a visually-hidden span sitting beside it. `KjFieldControl` captures the
  element's static id once instead of re-reading the DOM every check, which was
  raising `NG0100` on any control that also binds `[attr.id]`.

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

- 6e43ded: review batch 7 (naming + structure): renames are clean breaks, one directive per file, one diagnostics helper

  **Every deprecated compatibility alias is gone. This release has breaking
  renames with no alias layer** — the new name is the only name. Update imports;
  nothing is kept "for one minor".

  Classes and types, old → new:

  | Removed                                                                                                                                                                                                  | Use                                                                                                                                                     |
  | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `KjIconDirective`                                                                                                                                                                                        | `KjIcon`                                                                                                                                                |
  | `KjCardComponent`, `KjCardContentComponent`, `KjCardCoverComponent`, `KjCardFooterComponent`, `KjCardHeaderComponent`, `KjCardSubtitleComponent`, `KjCardTitleComponent`                                 | `KjCard`, `KjCardContent`, `KjCardCover`, `KjCardFooter`, `KjCardHeader`, `KjCardSubtitle`, `KjCardTitle`                                               |
  | `KjEmptyStateComponent` + `Icon` / `Title` / `Description` / `Actions` siblings                                                                                                                          | `KjEmptyState`, `KjEmptyStateIcon`, `KjEmptyStateTitle`, `KjEmptyStateDescription`, `KjEmptyStateActions`                                               |
  | `KjPopoverComponent`, `KjTooltipComponent`, `KjToastWrapperComponent`, `KjOverflowPanelComponent`, `KjPaginationDefaultComponent`, `KjDatetimePickerComponent`                                           | the same names without `Component`                                                                                                                      |
  | `KjTableToolbarComponent`, `KjTablePaginationComponent`, `KjTableStatusBarComponent`, `KjTableSidePanelComponent`, `KjCellTemplateDirective`                                                             | `KjTableToolbar`, `KjTablePagination`, `KjTableStatusBar`, `KjTableSidePanel`, `KjCellTemplate`                                                         |
  | `KjCascadeOptionComponent`, `KjCascadeSubPanelComponent`, `KjComboboxEmptyComponent`, `KjComboboxLoadingComponent`, `KjConfirmPopupActionsComponent`, `KjFormActionsComponent`, `KjFormSummaryComponent` | the same names without `Component`                                                                                                                      |
  | `KjRovingTabindexItemDirective`                                                                                                                                                                          | `KjRovingTabindexItem`                                                                                                                                  |
  | `KjRichTextExtensionDirective` (selector `[kjRichTextExtension]`)                                                                                                                                        | `KjRichTextFeatureDirective` (selector `[kjRichTextFeature]` only)                                                                                      |
  | `KjRichTextExtension`, `KjRichTextPlugin` (types)                                                                                                                                                        | `KjRichTextFeature`                                                                                                                                     |
  | `KJ_RICH_TEXT_EXTENSIONS`                                                                                                                                                                                | `KJ_RICH_TEXT_FEATURES`                                                                                                                                 |
  | `KjDateRange` from the table date filter                                                                                                                                                                 | `KjDateFilterRange` — it collided with the `date-range-presets` interface of the same name, and `@kouji-ui/components` only ever re-exported the latter |

  Inputs, outputs and methods removed with no replacement alias:
  - `KjRichTextEditor`: `kjExtensions`, `kjPlugins` → `kjFeatures`;
    `registerExtension()` → `registerFeature()`.
  - `<kj-input>`: `kjSize` → `size`.
  - `KjSelectTrigger` / `KjTreeSelectTrigger`: the `kjDisabled` read-alias →
    `disabled`. The `kjDisabled` **input** is unchanged; only the duplicate
    getter is gone.
  - `KjMenubar`: `kjAutoDisclose` and `kjAutoDiscloseDelayMs`. Both were no-ops —
    the primitives-based menubar never implemented roll-over disclosure. Hover
    is opt-in per consumer via `pointerenter` on `[kjMenubarItem]`.

  Internal, no API change: the dialog service class is declared `KjDialogService`
  instead of being renamed by its barrel, so the published name and the
  declaration finally agree.

  **One directive per file.** `core/carousel` joins `color-picker`, `stepper` and
  `alert`: the 939-line, nine-directive `carousel.ts` is now nine files plus a
  `carousel.ts` aggregator, so `@kouji-ui/core` and the `./carousel` path are
  unchanged. The remaining multi-declaration files are listed, with counts, in
  `packages/core/src/architecture.spec.ts`, which fails when one grows.

  **Diagnostics.** Everything routes through `kjDevWarn` / `kjDevAssert` /
  `kjError` in `primitives/diagnostics`, which are `ngDevMode`-guarded, so the
  branches _and their message strings_ leave a production build. A child that is
  used outside its parent now gets `[KjCarouselSlide] must be used inside
\`[kjCarousel]\`…`from the library rather than Angular's`NG0201: No provider
  for InjectionToken KjCarousel`, which named neither end. The
`inject(KJ_CAROUSEL) as KjCarousel`casts are gone:`KjCarouselContext`,
`KjAccordionContext`and`KjTabsContext`carry the registration surface their
children actually use, published as`KjCarouselSlideRef`,
`KjCarouselViewportRef`, `KjCarouselAutoplayRef`, `KjAccordionTriggerRef`and`KjTabRef`.

  **Form controls.** `KjFormControl` is the library's only
  `ControlValueAccessor`; a new `kouji/no-bespoke-value-accessor` lint rule
  refuses a raw `NG_VALUE_ACCESSOR` provider or a hand-written accessor anywhere
  outside `primitives/forms/`.

  **Overlay refs.** `KjDialogRef` / `KjDrawerRef` / `KjSheetRef` share one
  `KjOverlayRef<T, R>` base. Behaviour and public surface are unchanged.

- 6e43ded: review batch 7 (scaling): page-global listeners and observers move to three root services, and roving menus stop publishing `aria-activedescendant`

  **One input-modality reader for the whole page (perf F-5, mfe F-17).** Every
  `KjFocusRing` used to keep its own copy of "was the last interaction a key or a
  pointer?" behind its own `keydown` + `pointerdown` capture pair on the document.
  A 200-row table with a checkbox and a button per row therefore installed 800
  document-level capture listeners, all of which ran on every keystroke. The
  global half is now the new root service `KjInputModality`: one listener pair,
  ref-counted so an app that renders no focus ring pays nothing, exposed as a
  `Signal<'keyboard' | 'pointer'>`. `KjFocusRing` keeps only its two
  element-scoped `focus` / `blur` listeners and samples the modality at focus
  time, so a pointer press elsewhere on the page cannot strip the ring off an
  element that is still focused. No public API change to the directive.

  **One theme watcher and one `ResizeObserver` per root (perf F-5, mfe F-17).**
  `[kjChart]` and `<kj-editor>` each attached a `MutationObserver` to
  `document.documentElement`, so a 20-chart dashboard put 20 observers on one node
  and fired all of them on every theme toggle; `[kjToast]` attached a
  `ResizeObserver` per toast. Both are now root services — `KjThemeObserver`
  (one observer per observed element, shared by every handler registered against
  it, with a `version` signal for `computed` consumers) and `KjResizeObserver`
  (one observer for the page, entries coalesced into one animation frame). Each
  returns a disposer and is SSR-safe. All three services are public API, exported
  from `@kouji-ui/core`, and are the supported way to build a component that
  reacts to theme or box changes without adding an observer per instance.

  **`[kjTag]` no longer observes its own subtree by default (perf F-16).** The
  accessible-name fallback for `[kjTagRemove]` was kept in sync by a
  `MutationObserver` with `subtree: true` and `characterData: true` on every tag —
  the broadest configuration available, on a component rendered in bulk. The text
  is now seeded once on first render, which covers every static chip. **Breaking
  for a tag whose projected text mutates in place:** set the new
  `kjTagObserveLabel` to opt the observer back in, or (preferred) bind the new
  `kjTagLabel` input and drop DOM observation altogether.

  **`[kjTextarea]` measures once per keystroke (perf F-17).** Typing used to cost
  two style recalcs and two forced layouts: the host `(input)` handler measured,
  and the value it wrote also re-triggered the measuring effect. The value signal
  is now the single trigger, measurement is coalesced into one animation frame,
  and the line-height / padding / border metrics are cached — re-read only when a
  binding changes, on a window resize, or when a webfont lands. `measure()` gained
  an optional `remeasureMetrics` parameter for the last case.

  **Carousel viewports observe slides added after first render (perf F-25).**
  `observeSlides()` ran once from a microtask after init, so a slide rendered by a
  later `@if` / `@for` never updated `kjValue` when it scrolled into view. The
  observed set now follows the registered slides, and the settle timer is cleared
  on destroy — it used to fire against a destroyed viewport and write `kjValue`.

  **Roving menus publish one focus signal, not two (a11y F-15).**
  `kj-dropdown-menu-content` carried `kjOrientation` / `kjFocusMode` as static
  attributes in its `host` metadata with a comment claiming they seed the composed
  `KjListNavigator`'s inputs. They do not — static host attributes are DOM
  attributes, never host-directive input bindings — so the navigator stayed in
  activedescendant mode and published `aria-activedescendant` on the `role="menu"`
  host while DOM focus sat on the child `menuitem` (SC 4.1.2). The attributes and
  the comments that asserted the mechanism are gone; the roving model reaches the
  navigator through `KJ_LIST_FOCUS_MODE_DEFAULT`, which the menu and the menubar
  already provide.

  **Type-ahead cycles on a repeated letter (a11y, carried over).** Pressing `a`
  `a` `a` in a list buffered `"aaa"` and matched nothing. Per WAI-ARIA APG the
  buffer now stays one character long and each press visits the next item starting
  with that letter.

  **`KjListNavigator` leaves the caret its keys (a11y, carried over).** When the
  navigator is hosted on a text entry — the combobox and command-palette
  `<input>` — `Home`, `End`, `PageUp` and `PageDown` now move the text cursor
  whenever the field holds text, and only drive the list from an empty field.
  `Space` is always the field's.

  **`<kj-table>` announces sorting and filtering (a11y, carried over).** Both
  rearrange the grid with no cue a screen-reader user can perceive (SC 4.1.3). A
  visually-hidden polite region now reports them, including the column name when
  sorting is cleared. Pagination is deliberately not included — the projected
  `<kj-table-pagination>` already renders its own live "Showing X–Y of Z" summary.
  Opt out with `kjAnnounceChanges="false"`; route the strings through your own
  i18n with `kjSortAnnouncement` / `kjFilterAnnouncement`.

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

- 6e43ded: review batch 2: roving tab stops that follow selection, keyboard-operable data grid, named dialogs, wired fields, focus-driven tooltips

  **Roving tabindex (core).** `KjRovingTabindex` tracks its active item by
  reference: the tab stop survives item removal (clamped to the nearest
  neighbour, refocused only if focus was inside the group), follows the
  selection through the new `setActive(item | Element)` / `kjRovingActive`
  seed API, and the arrow keys skip disabled, `aria-disabled` and hidden items.
  Registration is O(1) and RTL now comes from the nearest `dir` attribute (a
  CSS-only `direction: rtl` is no longer honoured). New self-scoped
  `KJ_ROVING_ORIENTATION_DEFAULT` token; `KjTabList` provides it instead of
  filtering keys itself. Tabs, stepper, carousel, list and date-range presets
  seed the tab stop from their selection. `KjTabPanel` gets `tabindex="0"` only
  when active and it has no tabbable content.

  **Calendar (core + components).** The roving cell is always a selectable day
  (seeded from the value, then `kjStartAt`, then today, clamped into
  `kjMin` / `kjMax` / the predicate; month navigation past a bound lands on
  the bound). Calendars no longer steal focus on mount or from the month
  buttons. Structure is grid > row > gridcell(`<td>`) > native button: day
  buttons drop `role="gridcell"` and native `disabled` (now
  `aria-disabled` + `data-disabled`), selection is `aria-pressed`, the root is
  `role="group"`. New root `KJ_TODAY` token (`null` on the server, so no today
  marker is prerendered); `KjCalendarContext` gained a required `today`
  member. `kj-calendar` exposes `kjStartAt`. `Intl.DateTimeFormat` instances
  are cached per locale + preset.

  **Data grid (core + components).** The body has one Tab stop: new
  `KJ_TABLE_KEYBOARD_NAV` context (`KjTableKeyboardNavContext`) drives
  `KjTableCell`'s roving `tabindex`; keys typed into a text control inside a
  cell are left alone; Enter opens an editable cell. Sortable headers render a
  real `<button kjTableSort>` (new `KjTableSort` directive;
  `KjTableHeader.toggleSort` / `hasSortControl`) and Shift-click / Shift+Enter
  really multi-sorts. The column resize handle is a focusable
  `role="separator"` with arrow / Home / End / Escape keys and
  `aria-value*`. Persistence writes a projected slice set
  (`KJ_TABLE_DEFAULT_PERSISTED_SLICES`, `pickTableState()`,
  `KjTablePersistedSlice`; never `rowSelection` / `expanded` /
  `globalFilter`), debounced 300 ms (`kjPersistDebounce`, `kjPersistedSlices`
  inputs), under an optional `KJ_TABLE_STORAGE_KEY_PREFIX`
  (`provideKjTableStorageKeyPrefix()`). The four tbody branches share one row
  template; `KjTableVirtual` measures rows (`measureItem`, `mounted`, new
  `KjTableVirtualItem` directive, `KJ_VIRTUAL_EXTRA_ATTR`) and prerenders the
  first `kjInitialRows` / `kjVirtualInitialRows` rows on the server. Cell
  editors share `injectKjCellEditor()` (`KjCellEditor`,
  `KjCellEditorOptions`); the filter and editor contracts moved to
  `filters.context.ts` / `editors.context.ts` (barrel exports kept). A
  headless `[kjTableCell]` without a nav now carries `tabindex="-1"`.

  **Overlay names (core + components).** `KjOverlayBuilderConfig` gained
  `ariaLabel` / `ariaLabelledBy` (`KJ_OVERLAY_ARIA_LABEL` /
  `KJ_OVERLAY_ARIA_LABELLED_BY` tokens, exported from the overlay barrel);
  `KjDialogOpenOptions` / `KjDrawerOpenOptions` / `KjSheetOpenOptions` pass
  them through and `KjDialog` / `KjDrawer` / `KjSheet` accept `kjAriaLabel` /
  `kjAriaLabelledBy`. New title directives `KjDialogTitle` / `KjDrawerTitle` /
  `KjSheetTitle` (+ `KJ_OVERLAY_TITLE_HOST`, `registerOverlayTitle`,
  `overlayAccessibleName`) and `<kj-dialog-title>` / `<kj-drawer-title>` /
  `<kj-sheet-title>` name the panel by reference; dev mode warns once when a
  panel opens nameless.

  **Field (core + components).** New `KjFieldControl` (`[kjFieldControl]`),
  composed by `KjInput`: a control inside `kj-field` adopts the field id and
  gets `aria-describedby` / `aria-invalid` / `aria-required` automatically.
  Consumers that bound `[id]` or `kjAriaDescribedBy` on a `<kj-input>` inside a
  `kj-field` should drop them to avoid duplicate ids.

  **Tooltip / popover (core).** Tooltips open on keyboard focus
  (`onFocus({ focusVisible: true })`), describe their trigger via
  `aria-describedby` at all times and carry neither `aria-expanded` nor
  `aria-controls`; `kjDisabled` on tooltip and popover triggers now really
  blocks opening (`whenEnabled()` helper). `onHover` timers no longer toggle a
  panel another strategy already opened or closed.

  **Live regions / OTP / toast (core + components).** `KjLiveRegion` writes
  into an owned text node (host children survive announcements).
  `KjInputOtp.kjComplete` fires (`value.length === kjLength`); the root is no
  longer a live region — `registerLiveRegion()` + `context.chars`; the styled
  `<kj-input-otp>` renders a visually hidden one. Cleared middle OTP cells no
  longer shift later digits. The toast viewport is a plain `role="region"`
  landmark (each toast stays its own live region); toast ids are `kj-toast-N`
  via `KjId`; `.kj-toast-viewport` z-index follows `--kj-overlay-z`.

- 6e43ded: review retry: every accessible name is translatable, an anchored panel hides when its trigger scrolls away, and the docs example theme stops shadowing the token contract

  **Accessible names come from the i18n catalog (cust F-7).** `en.ts` called
  itself "the source of truth for kouji-ui's visible / assistive-text strings"
  while twenty-two of them were literals in templates, `host` blocks and input
  defaults, where no registered catalog could reach them: a consumer who called
  `provideKjTranslations({ fr: FR_CATALOG })` still heard "Next month", "Send
  message", "Notifications", "Hue". All twenty-two now resolve through
  `KjTranslateService`, with new `en` / `fr` keys for calendar, chat, colour
  picker, command palette, data table, carousel, date picker, tree select, sheet
  and the toast landmark. English output is byte-identical; what changed is that
  a catalog can now change it.

  Two of those were not merely untranslatable, they were dead. `<kj-color-picker>`
  put `aria-label="Open color picker"` on its trigger, which
  `KjColorPickerTrigger`'s own `[attr.aria-label]` host binding overwrote on the
  first change detection — the string had never reached a screen reader. The
  attribute is gone and the directive's name (now `colorPicker.trigger`, which
  interpolates the current value) is the only one.

  **Behaviour change worth noting:** `<kj-carousel-previous>` / `-next` /
  `-pause` previously declared `aria-label` as an input defaulting to `"Previous
slide"` / `"Next slide"` / `"Pause carousel"`. The default is now `undefined`
  and falls through to the catalog. Setting `aria-label` on the element still
  wins, so only the _default_ moved.

  `pnpm check:aria-labels` (in CI) grew from two patterns to four — it now also
  catches a literal in a `host` block, in a host _binding_ expression, and as an
  `aria-label` input default — and its debt list is empty.

  **An anchored panel hides when its trigger scrolls out of a clipping ancestor
  (overlay F-7).** A panel is portalled to the overlay container, so nothing
  clips it: scroll the trigger out of an `overflow: hidden` container and the
  panel kept painting at the trigger's last viewport position — a live, clickable
  menu pointing at nothing. `anchoredTo()` now resolves the trigger's clipping
  ancestors once per open (the `getComputedStyle` walk never repeats per frame)
  and, while the trigger is entirely outside one of them, gives the panel
  `visibility: hidden` + `pointer-events: none` and stops repositioning it. It is
  not closed or unmounted — open state and focus belong to the overlay, and
  scrolling back restores it exactly. Opt out with
  `anchoredTo({ hideWhenDetached: false })`.

  **One shared reduced-motion query (perf F-15).**
  `KjOverlayController.runTransition` built a fresh
  `matchMedia('(prefers-reduced-motion: reduce)')` on every open and every close.
  `KjReducedMotion` gained `matchesNow()` — a live, non-reactive read over the
  page's single `MediaQueryList` — and the controller uses it. The reactive
  `prefersReducedMotion` signal is unchanged and still seeded in
  `afterNextRender`, which is why the controller needs the imperative reader: an
  overlay opened before the first render would otherwise see a stale `false`.

  **`@kouji-ui/components` carousel is one component per file (arch F-12), and
  `KjCarouselPauseComponent` is now `KjCarouselPause`** — a clean break, no alias.
  `./carousel` is still one import path.

  **The docs example theme is off the `--kj-` namespace (styles F-17).**
  `packages/core/src/styles/docs-themes.css` declared twenty `--kj-*` properties,
  four of which — `--kj-border`, `--kj-shadow-sm`, `--kj-shadow-md`,
  `--kj-transition` — are real contract tokens with different meanings. Only
  Angular's emulated encapsulation kept `:root { --kj-border: #333 }` out of the
  document. They are `--docs-*` now, the file rides the pinned `kj.base` /
  `kj.shared` layers instead of two layer names nothing pinned, and it is no
  longer exempt from `pnpm lint:css` or from the themes spec. It ships in neither
  package.

- 6e43ded: review retry: one delivery path for the overlay CSS, and every shipped control carries its field's ARIA

  **The overlay family's nine stylesheets ship once, not twice** (styles F-21 / lazy F-5). `popover.css`, `tooltip.css`, `dropdown-menu.css`, `dialog.css`, `drawer.css`, `toast.css`, `confirm-popup.css`, `sheet.css` and `action-sheet.css` were each an `@import` in the registered `components/src/overlay/overlay.css` **and** a `styleUrl` on their wrapper component(s) — 19 `styleUrl` sites, seven of them for `confirm-popup.css` alone. Under `ViewEncapsulation.None` the second copy adds nothing to the cascade (identical selectors, identical `@layer kj.component`); it only inlines ~28 KB a second time into the component chunks. The `styleUrl`s are gone and the aggregator is the single source.

  **Action needed if you render `<kj-popover>` / `<kj-dialog>` / `<kj-toast>` (etc.) without registering the aggregator:** register it. It has always been required for the headless composition the docs teach, and it is now required for the wrapper components too.

  ```jsonc
  "styles": [
    "node_modules/@kouji-ui/themes/src/index.css",
    "node_modules/@kouji-ui/core/overlay/overlay.css",
    "node_modules/@kouji-ui/components/src/overlay/overlay.css"
  ]
  ```

  `overlay-styles.spec.ts` fails if a `styleUrl` (or an inline `styles` array) reappears anywhere in the package pointing at an aggregated sheet.

  **A `<textarea kjTextarea>`, a `<button kjSelectTrigger>` and a masked input inside a `[kjField]` now carry the field's relationships.** Previously only `<input kjInput>` composed `KjFieldControl`, so every other shipped control inside a field had no adopted id (the `[kjFieldLabel]` `for=` resolved to nothing), no `aria-describedby`, no `aria-invalid` and no `aria-required` — WCAG 1.3.1 / 3.3.1 / 3.3.2. `KjTextarea` and `KjSelectTrigger` compose it now; `KjInputMask` gets it through `KjInput`.
  - `KjFieldControl` **merges** `aria-describedby` instead of replacing it: the field's help / error ids, then the new `kjDescribedBy` input, then whatever the element already carried. A consumer's own `aria-describedby="hint"` on a control inside a field used to be dropped.
  - New `kjDescribedBy` input on `KjFieldControl`, re-exposed by `KjInput`, `KjTextarea` and `KjSelectTrigger`. Use it instead of writing `[attr.aria-describedby]` on those elements — the directive owns that attribute, and a host binding runs after the template's, so a direct write is silently overwritten. `<kj-textarea>`'s character counter moved onto it.
  - `<div kjInputOtp role="group">` is named by its field's `[kjFieldLabel]` through `aria-labelledby`, because `for=` cannot reach a non-labelable element. It points at the label only when one is rendered — `KjField.labelId` is minted eagerly, so a naive binding would emit an IDREF resolving to nothing. `KjFieldContext` gains `labelRendered` and `registerLabel()`.

  **`[kjPasswordStrength]`'s `kjAnnounce` does something** (arch F-10). It was a published no-op whose TSDoc promised a live region. Register one with the new `KjPasswordStrength.registerLiveRegion(region)` and set `kjAnnounce`, and the meter announces each strength tier as it changes — not each keystroke, and never the tier it mounted with. `<kj-password-input>` renders the visually hidden region itself and exposes the flag as `[kjAnnounceStrength]`. The meter is still not a live region itself: it is a `role="progressbar"`, whose descendants are not exposed, and a live region announces a text change rather than an `aria-valuetext` change.

  **`kjTicks` is coerced like every other static attribute** (arch F-2). `kjTicks="false"` bound the _string_ `"false"`, which is neither `false` nor an array — and the resolver's last branch is `'auto'`, so an author who switched ticks off got one tick per step. The new `coerceTicks` transform keeps the array and `'auto'`, and folds everything else through `booleanAttribute`: a bare `kjTicks` now means `'auto'` and `kjTicks="false"` really means off. Exported alongside `KjSliderTicksInput`.

  **One checked narrowing replaces eight blind casts** (arch F-4). `injectAnchoredPosition({ side, align, offset })` reads this element's position strategy back out of DI and configures it; the eight panels that each wrote `inject(KJ_OVERLAY_POSITION_STRATEGY) as ReturnType<typeof anchoredTo>` now call it, and a non-anchored strategy in that slot throws a message naming the panel's mistake instead of failing later inside the strategy. The three inputs stay declared on each panel — Angular discovers a signal input by seeing `input()` as a class property initialiser, so an input a helper returns is not an input.

  **New stylelint rule `kouji/namespaced`** (arch F-5's remaining half). Every selector in `packages/*/src/**/*.css` must be anchored by something the library owns — a `.kj-*` class, a `kj-*` element, a `[data-*]` hook, `:root`, `:host` or `::backdrop`. `ViewEncapsulation.None` is the permanent architecture, so a bare `.card` or `button` selector is a global rule in the consumer's document. `kouji/layered` already fixed where a rule sits in the cascade; this fixes how far it reaches. The library is at zero violations today.

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

- 6e43ded: review batch 1: keyboard-reachable list popups, real focus traps and focus restoration for every overlay, an inert page behind modals, `afterOpened$` that emits

  **Focus management (core).** `KjOverlayController` now drives the focus-trap
  strategy for real: `tabCycle()` / `inertBased()` and `KjFocusTrap` share one
  framework-free engine (`createFocusTrap()`, `tabbableElements()`,
  `focusInitialIn()`, `returnFocusFrom()` — new public exports) with a proper
  tabbable query (hidden, disabled, inert, `tabindex=-1` and closed `<details>`
  excluded; positive `tabindex` honoured), recapture of focus that escapes the
  panel, and an empty panel that keeps focus on itself. Every overlay restores
  focus to its opener (falling back to the bound trigger) on close; opt out with
  `returnFocus: false`. Dialogs / drawers / sheets focus `[kjAutofocus]` /
  `[autofocus]` else the panel itself on open (was: the first control).
  `solidBackdrop({ inert: true })` really inerts the page behind a modal
  (refcounted, so nested modals thaw it only when the last one closes).
  `KjOverlayTrigger` publishes the real panel id in `aria-controls`.
  `afterOpened$` on `KjDialogRef` / `KjDrawerRef` / `KjSheetRef` emits once when
  the open transition completes, then completes.

  **List popups (core).** Select, tree-select and cascade-select are keyboard
  navigable once open: focus moves onto the selected (else first) option, the
  APG listbox / tree keys work per level, Tab and Escape close and return focus
  to the trigger. `KjListNavigator` gained `focusActive()`, the
  `KJ_LIST_FOCUS_MODE_DEFAULT` and `KJ_LIST_NAVIGATOR_ITEMS` tokens, a
  `focusin` re-sync in roving mode, an SSR guard, and no longer steals focus on
  mount (menubar included). Cascade sub-panels drop their window listeners on
  close / destroy and coalesce repositioning on `requestAnimationFrame`;
  `kj-tree-select-content` no longer installs document listeners. The date
  picker's `aria-modal` now follows a new `kjTrap` input (default non-modal:
  ArrowDown enters the calendar, Tab leaves it). Toast focuses its front toast
  through the shared tabbable query.

  **Components.** Visible focus rings on the sheet grab handle, action-sheet
  rows, `.kj-option` and `.kj-cascade-option`; an open accordion panel is no
  longer clipped at 1000px (content now sits in `.kj-accordion-content__inner`);
  cascade sub-panels stack one level above their panel; collapsed tree-select
  rows are hidden from the stylesheet; `KJ_COMPONENTS_VERSION` equals
  `package.json` (generated by `scripts/sync-version.mjs`).

## 0.9.4

### Patch Changes

- e6aa28a: overlay: a backdrop dismisses only a press that began on it — picking a new value in a select inside a command palette no longer closes the palette

  A backdrop spans the viewport underneath every overlay opened from inside
  it, so the browser hands it clicks it never saw the start of. Commit a
  NEW value in a `<kj-select>` nested in a `<kj-command-palette>` and the
  option list re-renders: the pressed option leaves the document before the
  pointer comes up, and the engine retargets the `click` to whatever is
  under the pointer by then — the palette's scrim, whose handler dismissed
  the palette on a click the user aimed at an option. Committing the SAME
  value re-renders nothing, so the option stayed put and the palette
  survived; that is what made the bug look value-dependent.

  Dismiss-on-click surfaces now arm on `pointerdown` — dispatched at the
  true origin, before any re-render can move it — and dismiss on `click`
  only if that arming happened, via the new `KjDismissPress` primitive.
  Applied to `KjBackdrop` (every dialog / drawer / sheet / popover scrim)
  and to `<kj-command-palette>`'s own backdrop. Both also decline the
  gesture when an overlay is stacked above them, judged at press time,
  matching the Escape posture — so pressing the scrim while a nested select
  is open closes the select and leaves its opener up. Clicks with no
  pointer behind them (`element.click()`, keyboard activation, assistive
  tooling) still dismiss.

  `KjOverlayStack` also stops treating a pointerdown target that has left
  the document as an outside click: `contains()` reports false for a
  detached node exactly as it would for a genuine outside click, which
  dismissed overlays on gestures that started inside them.

  `KjOverlayController` exposes `isTopmost` for dismiss paths that need it.

## 0.9.3

### Patch Changes

- fb1d195: select: a nested list composite no longer activates its ancestor's list — picking an option inside a command palette keeps the palette open

  Every list root (`KjSelect`, `KjCommandPalette`, `KjCombobox`,
  `KjDropdownMenu`, `KjMenubar`, `KjTreeSelect`, `KjCascadeSelect`) collected
  its rows with `contentChildren(KjListItem, { descendants: true })`, a query
  that walks straight through a list composite nested inside it. A
  `<kj-select>` placed in a `<kj-command-palette>` therefore handed the
  palette its options: the palette navigated onto them, filtered them with
  its own query, renumbered their `aria-posinset` / `aria-setsize`, and on
  Enter activated one of them instead of a command. `KjListItem` now exposes
  the container it actually belongs to — the nearest
  `KJ_LIST_NAVIGATOR_CONFIG` on its element-injector path — and every root
  narrows its query through the new `ownListItems` helper, so an item is
  bound to its own nearest container for any nesting (select in palette,
  select in dialog, menu in palette, combobox in select). A real palette row
  still activates and still honours `kjAutoCloseOnActivate`.

  overlay: the overlay-family surface CSS is published, so panels composed
  from the headless directives actually paint

  `.kj-popover-content`'s background, border and shadow reached the document
  only as `KjPopoverComponent`'s `styleUrl`, and Angular injects a
  component's styles only when that component is instantiated. The
  documented composition — `[kjPopoverTrigger]` + `<kj-popover-content>`
  straight from `@kouji-ui/core`, no `<kj-popover>` wrapper — rendered a
  transparent, borderless, shadowless panel, with no rule for
  `.kj-popover-content` anywhere in `document.styleSheets`. Same shape for
  every overlay family panel. `@kouji-ui/components` now ships its
  stylesheet tree, so `@kouji-ui/components/src/overlay/overlay.css`
  (popover, tooltip, dropdown-menu, dialog, drawer, toast, confirm-popup,
  sheet, action-sheet) is registerable, and `@kouji-ui/core` publishes the
  overlay container / wrapper / backdrop chrome as
  `@kouji-ui/core/overlay/overlay.css`. Register both in `angular.json`
  alongside the themes — see Getting Started → Global stylesheets.

## 0.9.2

### Patch Changes

- 2948c5b: overlays: nested overlays always stack above their opener — one z-index stack for dialog, palette, popover, select, menu, tooltip.

  A `<kj-select>` inside a `<kj-command-palette>` opened its listbox _behind_
  the palette: the palette panel sat at a hardcoded `z-index: 1001` while the
  listbox (like every popover / menu / tooltip panel) sat at `1000`. Any overlay
  opened from inside another overlay with an equal or higher literal level was
  hidden.

  `KjOverlayStack` now owns stacking as well as Escape / outside-click routing.
  Every overlay that opens receives a `z-index` one above the highest overlay
  open at that moment (the first one gets the base, `1000`), written to the
  panel and its `.kj-overlay-wrapper` as `--kj-overlay-z` + inline `z-index`.
  Closing pops it off; the overlays left keep their level, and the next one
  opens one above whatever is still open — a later overlay never sinks below an
  earlier one. Every overlay stylesheet reads `z-index: var(--kj-overlay-z, <its
previous literal>)`, so a single overlay renders exactly as before.

  `<kj-command-palette>` joins the same stack: while open its shell (backdrop +
  dialog) is portalled into the shared `.kj-overlay-container`, so a select,
  popover or dialog opened from inside it lands one level above it. Escape from
  inside the palette only closes the palette when it is the topmost overlay.

  Knobs: `KJ_OVERLAY_Z_BASE` (DI) or `--kj-overlay-z-base` on `:root` move the
  whole stack; `--kj-overlay-z-index` on the container still wins when set.
  Toasts stay in their own layer above the stack — `--kj-toast-z-index` now
  defaults to `2000` (was `100`, which hid toasts behind any open dialog).

  New exports from `@kouji-ui/core`: `KJ_OVERLAY_Z_BASE`, `KJ_OVERLAY_Z_VAR`,
  `applyOverlayZIndex`, `clearOverlayZIndex`, `getOverlayContainer`,
  `createOverlayWrapper`; `KjOverlayStackHandle.zIndex`,
  `KjOverlayStack.zIndexOf/baseZIndex/nextZIndex`.

## 0.9.1

### Patch Changes

- 415123a: confirm popup: resolve its own overlay panel so a popup inside a dialog no longer closes the dialog

## 0.9.0

### Minor Changes

- 576d92e: Chat: real markdown, and a type → component registry for thread items.

  **Markdown.** The kit shipped a hand-rolled parser covering only bold, italic,
  code spans and links, so the block markdown a model actually emits — headings,
  lists, tables, blockquotes — reached the bubble as literal `##`, `-` and `|`.
  `renderMarkdown` now runs on `marked` (GFM, `breaks: true`), still splitting
  fenced code out as structural blocks so the copy button keeps working.

  `marked` drops raw HTML from the source rather than passing it through, and
  `kj-chat-message` now _sanitises_ the result (`SecurityContext.HTML`) instead
  of calling `bypassSecurityTrustHtml`. A chat body is model or user output — the
  one place in a UI kit where trusting a single layer is a bad bet.

  Adds `marked` as a dependency of `@kouji-ui/components`.

  **Item registry.** `provideKjChat` maps an item `type` to a component, so a
  thread can render turns the kit knows nothing about:

  ```ts
  provideKjChat({
    renderers: { chart: ChartBubble, diff: DiffBubble },
    fallback: UnknownItem,
  });
  ```

  ```ts
  store.addItem({ type: 'chart', data: series, content: 'Revenue, last 6 months' });
  ```

  `KjChatMessageData` gains optional `type` and `data`. A message without a
  `type` never consults the registry and is drawn by the built-in renderer as
  before — the common path stays free. An unregistered `type` falls back to
  `fallback`, and failing that to the built-in renderer, so an unknown item
  degrades to readable text rather than a hole in the transcript.

  `content` stays the item's plain-text equivalent: it is what the coalesced
  live region announces, so a custom renderer is still accessible.

- f56466b: Add a `segmented` button-group variant.

  `kjVariant="segmented"` moves the border and rounded corners onto the group
  and leaves the children borderless, filling only the pressed segment — a
  mode switcher rather than a toolbar. Works in both orientations.

  ```html
  <kj-button-group kjVariant="segmented" kjSize="sm" kjAriaLabel="Mode">
    <kj-button [kjPressed]="true">Chat</kj-button>
    <kj-button [kjDisabled]="true">Images</kj-button>
  </kj-button-group>
  ```

  Supporting changes:
  - `KjButtonGroup` mirrors `kjVariant` to `data-variant` on its host, so
    group-level looks — a shared shell, dividers — can be drawn in CSS. The
    attribute is absent when no variant is set.
  - `.kj-button` reads a new `--kj-button-text-transform` knob (default
    `none`), the one typographic property that had no hook.
  - The pressed fill is reached through `--kj-segmented-bg-on` /
    `--kj-segmented-fg-on`, and the shell through `--kj-segmented-border`.
    Variant rules declare knobs on the element and would otherwise beat a
    consumer's ancestor value; the rest of the look needs no indirection,
    since every other knob is already read as `var(name, default)`.

## 0.8.0

### Minor Changes

- 2f64110: **tag list / avatar group:** collapse the extra items behind a "+N" chip with a hover panel.

  `<kj-tag-list [kjMax]="3">` now hides the chips past the cap (`[hidden]` +
  `data-overflow`, same contract as `kj-avatar-group`) and renders a "+N" chip.
  Hovering, focusing or tapping the chip opens a panel listing the collapsed
  chips by their text; `kj-avatar-group`'s existing "+N" avatar gets the same
  panel (names from `alt`). Both accept an `<ng-template kjOverflowContent>` to
  render the panel themselves — the context carries the collapsed range
  (`$implicit` count, `start`, `end`, `labels`) so a consumer slices its own data
  and adds actions (remove a user, open a profile…).

  ```html
  <kj-tag-list [kjMax]="3">
    @for (u of users(); track u.id) { <kj-tag>{{ u.name }}</kj-tag> }
    <ng-template kjOverflowContent let-start="start">
      @for (u of users().slice(start); track u.id) {
      <kj-button kjVariant="ghost" (click)="remove(u)">Remove {{ u.name }}</kj-button>
      }
    </ng-template>
  </kj-tag-list>
  ```

  The chip is a real button: Tab reaches it and opens the panel, ArrowDown /
  Enter move focus inside, Escape returns focus, focus leaving the panel closes
  it. Labels are translatable (`overflow.more`, `overflow.show`) and overridable
  per instance (`kjOverflowLabel`, `kjOverflowAriaLabel`).

  **popover:** `kjTrigger="hover"` now works. `KjPopoverTrigger` declared the
  input but always wired the click strategy; it now switches strategies from the
  input, and the hover kind keeps the panel open while the pointer rests on it
  (`interactive` option of the `onHover` strategy) and also opens on focus and on
  an open-only click, so hover popovers with controls stay reachable from the
  keyboard and on touch. New `kjOpenDelay` / `kjCloseDelay` inputs (150 ms). The trigger now also
  exposes `aria-haspopup="dialog"`, which its spec always expected.
  `onClick({ openOnly })`, `composeTriggerEvents()` and `switchableTriggerEvent()`
  are new trigger-event primitives.

  New core directive `KjOverflowContent` (`ng-template[kjOverflowContent]`) and
  components `KjOverflowPanelComponent` (`<kj-overflow-panel>`), shared by both
  groups. `KjTagListContext` gains `total`, `visibleCount`, `overflowCount`,
  `hiddenLabels`.

## 0.7.1

### Patch Changes

- 5d3aab4: select: long labels truncate with an ellipsis instead of wrapping

  The trigger's label span had no rule of its own, so a long option label (a
  branch name, a path) wrapped onto a second line inside the fixed-height
  button and overflowed it. `.kj-select-trigger-label` is now a single
  `nowrap` line with `text-overflow: ellipsis`, the trigger itself is
  `min-width: 0` so it can shrink inside a flex column, `.kj-option` rows
  truncate the same way, and the listbox panel gets
  `max-width: min(28rem, calc(100vw - 2rem))` so one long option no longer
  stretches the whole panel.

## 0.7.0

### Minor Changes

- 4b00429: Add `provideKjTabs()` so tab variants are extensible, like Button's.

  `<kj-tabs>` had `variant` as a hardcoded `'default' | 'pills'` input, so an app could neither add a shape nor change the default. It now resolves through the same preset chain as Button — explicit input > `provideKjTabs(…)` default > library default — via the composed `KjVariant` directive, and unknown names warn in dev.

  ```ts
  provideKjTabs({ variants: [...KJ_TABS_DEFAULTS.variants, 'document'] });
  ```

  A registered variant needs only a CSS rule on `.kj-tabs[data-variant="document"]`; every part of both shipped shapes is already a `--kj-tab-*` knob.

### Patch Changes

- 76794cf: Respect `provideKjButton` defaults and button-group cascade everywhere.
  - `KjVariant`/`KjSize` gain an optional fallback context (`KJ_VARIANT_FALLBACK`/`KJ_SIZE_FALLBACK`): explicit input > enclosing group cascade > `provideKj*` default > library default.
  - Element wrappers (`kj-button`, `kj-badge`, breadcrumb, chat, link, pagination, progress-bar, spinner, textarea) no longer hardcode `variant`/`size` defaults that clobbered the provider config — a bare `<kj-button>` now honors `provideKjButton({ defaults })`.
  - `kj-button-group` cascades its `kjVariant`/`kjSize`/`kjDisabled` to child buttons (both `<button kjButton>` and `<kj-button>` forms).

- 4b00429: Retune the two tab shapes and make them themeable.
  - `default` is the underline strip and `pills` is the recessed chip tray — the two shapes products actually use. Both are now driven by `--kj-tab-*` knobs (ink, indicator colour/size/inset, tray ground/ring, padding, font) instead of hardcoded values, so a consumer re-themes a strip without redeclaring the recipe.
  - The active mark moved from `border-bottom` to a pseudo-element, so it can be inset from the tab's edges (`--kj-tab-indicator-inset`); a border cannot.
  - The rest state is an ink token instead of `opacity: .6`, which was also dimming each tab's icon and badge.

## 0.6.3

### Patch Changes

- 1f7394e: Make the `.kj-button` component knobs actually overridable from an ancestor.

  `button.css` documented its knobs as "themes/users can override any of these",
  but declared them on `.kj-button` itself. A custom property declared on an
  element always beats an inherited one, so an ancestor could never set them —
  including the `<kj-button>` host, which is the only element a consumer can put
  an inline style on, and which is `display: contents` and therefore cannot be
  styled directly either. In practice a knob could only be overridden by a rule
  targeting `.kj-button`, i.e. a global stylesheet or `::ng-deep`.

  Each knob is now read as `var(--kj-button-x, <previous default>)` at its use
  site — the pattern `--kj-button-shadow` already used, and for the same reason.
  Computed output is unchanged when nobody overrides anything.

  Variant and size rules still declare knobs on the element on purpose: that is
  the component's own logic and must keep winning, so `kjSize="sm"` still gets
  `sm` padding regardless of what an ancestor sets.

## 0.6.2

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

## 0.6.1

### Patch Changes

- 4c8dd86: table: center the empty / error pane and add lazy state templates

  Fix: in a height-constrained `<kj-table>` the row-less body kept `flex: 1` and
  pushed the empty (or error) pane to the very bottom of the table, where it read
  as a footer instead of a centered state. The body now yields its growth to the
  active state pane, which centers in the space below the sticky header. Tables
  without a height constraint are unchanged.

  Add: `<ng-template kjEmptyTemplate>`, `kjLoadingTemplate` and `kjErrorTemplate`
  content slots. Unlike the `[kjEmpty]` / `[kjLoading]` / `[kjError]` attribute
  slots — which still work and remain the fallback — template content is
  instantiated only while that state is on screen.

## 0.6.0

### Minor Changes

- 2dad585: Field errors that never shift the layout, and server-error helpers for forms.
  - `KjFieldError` gains `kjFieldErrorReserve` (core) / `kj-field-error` gains `kjReserve` (components): the error line keeps a one-line box while the field is valid (`data-hidden` + `visibility: hidden`) instead of `display: none`, so error text appearing/disappearing never repositions the surrounding fields. Default behaviour unchanged.
  - New `kjApplyServerErrors(form, fields, options?)` in core: applies backend field-error maps (`{ path: message | messages[] }`) onto a `FormGroup` — merges `{ server: string[] }` into each matching control's errors, marks it touched, and returns the unmatched paths so callers can surface them globally. `kjServerErrorsOf(control)` reads them back for templates.

## 0.5.0

### Minor Changes

- 509c90c: Add `<kj-chart>` — an accessible Apache ECharts wrapper (new component).
  - SSR-safe lazy init in the browser only, reactive `option`, auto-resize via `ResizeObserver`, and clean dispose on destroy.
  - Accessibility: ECharts paints an opaque `<canvas>`, so the host now carries `role="img"` and a required-in-practice `ariaLabel` for the accessible name. An optional `caption` renders a visually-hidden summary wired to the host via `aria-describedby`. The host takes no tab stop, so keyboard users are never trapped.
  - Ships playground, usage example, and bar + donut examples.

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

### Patch Changes

- 509c90c: fix(overlay): register `sheet` and `action-sheet` in the overlay CSS aggregator; fix(command-palette): reset the search query when the palette closes
  - **overlay**: service-launched bottom sheets and action sheets (`KjSheetService` / `KjActionSheetService`) rendered **unstyled** because their skins (`sheet.css`, `action-sheet.css`) were never `@import`ed into the global `overlay/overlay.css` aggregator — only attached to the docs-only shell wrapper components, which a real consumer never instantiates. They now load with the rest of the overlay family (dialog, drawer, toast, …).
  - **command-palette**: reopening the palette after a search showed the previous query. `KjCommandInput` now reflects the `kjQuery` signal back onto the DOM input (the `(input)` binding was one-way), and `KjCommandPaletteComponent` clears the query + active item when it closes — so each open starts fresh.
  - **icon**: digit-bearing Lucide icons (`heading-1`, `heading-2`, `heading-3`, `clock-10`, `columns-2`, …) rendered blank — `pascalToKebab` never inserted a hyphen before digits, so the requested kebab name never matched the registry key. Fixed the converter; these icons now resolve everywhere (including the rich-text-editor toolbar).

- 7e554b6: Surface the `@kouji-ui/core` directives and types referenced by the components' public API through the `@kouji-ui/components` entry point, and pin the `@kouji-ui/core` peer dependency to `>=0.3.0`.

  Consumers importing a component from `@kouji-ui/components` whose public API references a core symbol (e.g. `KjOverlayPanel`, `KjInput`, `KjTable`, `KjBadgeVariant`, `KjTabPanel`) previously failed clean AOT template type-checking with `NG3004: Unable to import symbol …` (dev HMR skips the check, so it only surfaced on `ng build`). All such core symbols are now re-exported.

  The core peer was `*`, which let an incompatible older `@kouji-ui/core` be installed next to newer `@kouji-ui/components` (causing `No matching export in @kouji-ui/core` at runtime). It is now pinned to `>=0.3.0`.

- 509c90c: Fix broken Vercel docs deploy after the `KjRichTextEditor` merge (#24).

  The nine `@lexical/*` (and `lexical`) **optional peer dependencies** added to
  `@kouji-ui/components` were never recorded in `pnpm-lock.yaml`, so Vercel's
  `pnpm install --frozen-lockfile` aborted before the build could run — taking the
  whole docs site (not just the rich-text editor page) offline. Regenerated the
  lockfile so the frozen install resolves and the static prerender completes,
  restoring the RTE documentation route.

- 509c90c: fix(rich-text-editor): make the editor fluid so it never overflows its container

  `.kj-rte` had no width constraint, so inside a flex/grid parent (the docs
  playground stage, or a narrow app layout) it sized to its content and spilled
  out sideways. Added `width: 100%; max-width: 100%; min-width: 0; box-sizing:
border-box`, plus `min-width: 0` + `overflow-wrap: anywhere` on the editable
  surface — the editor now fills and respects its container, and the toolbar
  scrolls within it instead of the whole editor overflowing.

## 0.4.4

### Patch Changes

- 63f4ae7: Re-export `KjOverlayPanel` and the `KjOverlayTriggerLike` type from `@kouji-ui/components`.

  `KjPopoverTrigger.controller` is typed as `KjOverlayPanel`, but that symbol was only exported from `@kouji-ui/core`. Consumers that import the popover from `@kouji-ui/components` and call `trigger.controller.close()` in a template failed AOT template type-checking with `NG3004: Unable to import symbol KjOverlayPanel` (dev HMR skipped the check, so it only surfaced on a clean `ng build`). Re-exporting the type from the components entry point fixes the clean build without any runtime change.

## 0.4.3

### Patch Changes

- kj-table: the sticky header background is themable via `--kj-table-header-bg` (falls back to `--kj-bg-surface`).

## 0.4.2

### Patch Changes

- kj-table: sticky header — `thead` cells pin to the top of the scrolling body so only rows scroll when the table has a constrained height.

## 0.4.1

### Patch Changes

- kj-select: the trigger caret is now a registry `chevron-down` icon (kjIcon) instead of a text glyph. Consumers using the icon set (e.g. `provideLucideIcons()`) get a crisp themable arrow.

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
