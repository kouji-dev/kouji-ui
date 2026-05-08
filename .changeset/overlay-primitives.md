---
'@kouji-ui/core': patch
'@kouji-ui/components': patch
'@kouji-ui/themes': patch
---

Overlay primitive refactor and select-family alignment.

**`@kouji-ui/core`**

- New overlay primitives layer: `KjOverlayController`, `KjOverlayPanel`, `KjOverlayTrigger`, `KjOverlayBuilder`, `KjOverlayHandle`, `KjOverlayWrapper`, `KjOverlayContainer`, `KjOverlayStack`. Strategies (`mount`, `position`, `backdrop`, `focus-trap`, `scroll-lock`, `trigger-event`) compose into per-overlay configs (`inPlace()` for service-launched, `bodyPortal()` for declarative).
- `select`, `tree-select`, `combobox`, and `cascade-select` all follow the same root-controller pattern: a single `[kjXxx]` root directive provides `KjOverlayController` and owns selection state; trigger no longer self-provides; consumer-action methods call `controller.close()` directly (no signal indirection).
- Cascade-select adds dedicated branch sub-panels with `position: fixed` so they escape the root panel's `overflow: auto`. Branch detection uses `contentChildren` (declaration tree) — no DOM querying.
- Tree-select splits into root + per-node directives.
- Re-entrancy guards on `open()` / `close()` / `toggle()`. Outside-click flicker fixed by hiding the panel synchronously in the rAF before strategy cleanup.

**`@kouji-ui/components`**

- Cascade-select wrapper composes the new root via `hostDirectives` (`kjValue`, `kjCascadePath`).
- Confirm-popup, dialog, drawer, popover, tooltip, dropdown-menu, and toast JSDoc `@category` regrouped under `Library/Overlay` and `Core/Overlay` for the docs sidebar.
