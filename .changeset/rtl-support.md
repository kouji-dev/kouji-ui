---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

Add RTL support — `<html dir>` wiring, a visible direction toggle, and
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
