---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

review batch 4: the styled menubar actually works, the rules files are machine-checked, and the spec/typecheck quarantines are gone

**Menubar (components).** `<kj-menubar-item>` composed `KjMenubarItem` on an
inner `<button>`, inside the component's own view. The bar's `KjListNavigator`
finds its items with a `contentChildren(KjListItem)` query, and a content query
never crosses into a child component's view — so the styled bar registered its
items through DI (clicking one opened its submenu) while the navigator saw
nothing: no roving tab stop, no arrow keys, no skip-disabled, every item its own
Tab stop. The directive now sits on the `<kj-menubar-item>` host, exactly as
`KjMenubar` already sat on `<kj-menubar>` and for the same reason. The rendered
DOM changes — the item *is* the `<kj-menubar-item>` element (`role="menuitem"`,
roving `tabindex`, `class="kj-menubar-item"`) instead of wrapping a `<button>` —
and `.kj-menubar-item` styling is unaffected because it was already a bare class
selector. `<kj-menubar-item>` also gained `[kjDropdownMenuTriggerFor]`, forwarded
to the composed directive, which is what closes the long-standing
"menubar+dropdown-menu wiring pending" TODO: the styled wrapper can now disclose
a submenu, which is what a menubar is for.

**Menubar keyboard (core).** ArrowDown / ArrowUp on a bar item opened the wrong
submenu. The composed navigator's orientation is `'vertical'` and it wraps, so
its bubble-phase handler moved the bar's roving focus first and `KjMenubar` then
disclosed *that* item — pressing ArrowDown on the last item opened the first
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

*Behaviour change:* accordion, tab and carousel item ids no longer interpolate
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
re-render on a runtime locale change. *Behaviour change:* an app that registered
a non-English catalog will see those labels translated where they were English
before, and `KJ_PAGINATION_DEFAULTS` / `KJ_BREADCRUMB_DEFAULTS` no longer carry
label literals (the fields are now optional). A new `pnpm check:aria-labels` CI
gate fails on any *new* hard-coded accessible name in shipped markup.

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
