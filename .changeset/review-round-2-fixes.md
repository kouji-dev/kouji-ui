---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
'@kouji-ui/themes': minor
---

round-2 system review: 178 of 184 findings fixed across eight batches

The round-2 review filed 184 findings across nine dimensions. 178 are closed.
The six that are not are listed, with reasons, in `reports/review/README.md`
§ *Status after fix run*.

The single most leveraged fix is that **CI now runs the tests**. It had not
executed one since 2026-05-07, so 47 of 50 releases shipped under a
lint-and-build-only gate — which is why most of the rest went unnoticed.

---

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

| Removed | Use |
| --- | --- |
| `KjIconDirective` | `KjIcon` |
| `KjCardComponent`, `KjCardContentComponent`, `KjCardCoverComponent`, `KjCardFooterComponent`, `KjCardHeaderComponent`, `KjCardSubtitleComponent`, `KjCardTitleComponent` | the same names without `Component` |
| `KjEmptyStateComponent`, `KjEmptyStateIconComponent`, `KjEmptyStateTitleComponent`, `KjEmptyStateDescriptionComponent`, `KjEmptyStateActionsComponent` | the same names without `Component` |
| `KjPopoverComponent`, `KjTooltipComponent`, `KjToastWrapperComponent`, `KjOverflowPanelComponent`, `KjPaginationDefaultComponent`, `KjDatetimePickerComponent` | the same names without `Component` |
| `KjTableToolbarComponent`, `KjTablePaginationComponent`, `KjTableStatusBarComponent`, `KjTableSidePanelComponent` | the same names without `Component` |
| `KjCascadeOptionComponent`, `KjCascadeSubPanelComponent`, `KjComboboxEmptyComponent`, `KjComboboxLoadingComponent`, `KjConfirmPopupActionsComponent`, `KjFormActionsComponent`, `KjFormSummaryComponent` | the same names without `Component` |
| `KjCarouselPauseComponent` | `KjCarouselPause` |
| `KjCellTemplateDirective` | `KjCellTemplate` |
| `KjRovingTabindexItemDirective` | `KjRovingTabindexItem` |
| `KjRichTextExtensionDirective` (selector `[kjRichTextExtension]`) | `KjRichTextFeatureDirective` (selector `[kjRichTextFeature]`) |
| `KjRichTextExtension`, `KjRichTextPlugin` (types) | `KjRichTextFeature` |
| `KJ_RICH_TEXT_EXTENSIONS` | `KJ_RICH_TEXT_FEATURES` |
| `KjDateRange` from the table date filter | `KjDateFilterRange` — it collided with the `date-range-presets` interface of the same name, and the collision made the tuple type unreachable from the package that ships it |

Inputs, outputs and members, old to new:

| Removed | Use |
| --- | --- |
| `[kjBadge]`'s `kjBadgeVariant` | `kjVariant` — badge now composes `KjVariant` + `KjSize` |
| `<kj-input>`'s `kjSize` | `size` |
| `KjRichTextEditor.kjExtensions`, `.kjPlugins` | `kjFeatures` |
| `KjRichTextEditor.registerExtension()` | `registerFeature()` |
| `KjSelectTrigger.kjDisabled`, `KjTreeSelectTrigger.kjDisabled` — the read-only getters; the **inputs** are unchanged | `disabled` |
| `KjMenubar.kjAutoDisclose`, `.kjAutoDiscloseDelayMs` | nothing — both were published no-ops, since the primitives-based menubar never implemented roll-over disclosure. Hover is opt-in per consumer via `pointerenter` on `[kjMenubarItem]` |
| `KjDatePicker.panelId` and `KjDatePickerContext.panelId` | `[kjFor]="trigger"` — the real id is minted by the composed `KjOverlayPanel` |
| `KjOverlayBadgeContentComponent.kjSize` | the same public name, now owned once by the `KjSize` reached through `KjBadge` |
| `KjChatMessage.safe()` | nothing — `[innerHTML]` already sanitises at `SecurityContext.HTML` |
| `KjCloseReason`'s `'esc'` spelling | `'escape'` |

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

---

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
duration is measured from the state being *entered*, and takes the longest entry
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
and `kjError`, so the branches *and their message strings* leave a production
build, and a child used outside its parent gets a message naming both ends
instead of `NG0201`. Seven spec-less features gained behavioural specs.
