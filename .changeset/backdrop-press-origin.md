---
'@kouji-ui/core': patch
'@kouji-ui/components': patch
---

overlay: a backdrop dismisses only a press that began on it — picking a new value in a select inside a command palette no longer closes the palette

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
