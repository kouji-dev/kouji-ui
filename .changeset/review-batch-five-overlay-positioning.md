---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

overlay: anchored positioning is correct, cheap and RTL-aware; the speed dial and the styled command palette become real overlays

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
- `side` and `align` are read as *logical* names: under `dir="rtl"`,
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
