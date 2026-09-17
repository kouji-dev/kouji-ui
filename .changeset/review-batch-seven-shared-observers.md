---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

review batch 7 (scaling): page-global listeners and observers move to three root services, and roving menus stop publishing `aria-activedescendant`

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
