---
'@kouji-ui/core': patch
'@kouji-ui/components': patch
---

overlays: nested overlays always stack above their opener — one z-index stack for dialog, palette, popover, select, menu, tooltip.

A `<kj-select>` inside a `<kj-command-palette>` opened its listbox *behind*
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
