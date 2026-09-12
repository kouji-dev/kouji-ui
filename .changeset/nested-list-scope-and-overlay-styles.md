---
'@kouji-ui/core': patch
'@kouji-ui/components': patch
---

select: a nested list composite no longer activates its ancestor's list — picking an option inside a command palette keeps the palette open

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
