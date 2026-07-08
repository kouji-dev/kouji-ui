---
'@kouji-ui/core': patch
'@kouji-ui/components': patch
---

fix(overlay): register `sheet` and `action-sheet` in the overlay CSS aggregator; fix(command-palette): reset the search query when the palette closes

- **overlay**: service-launched bottom sheets and action sheets (`KjSheetService` / `KjActionSheetService`) rendered **unstyled** because their skins (`sheet.css`, `action-sheet.css`) were never `@import`ed into the global `overlay/overlay.css` aggregator — only attached to the docs-only shell wrapper components, which a real consumer never instantiates. They now load with the rest of the overlay family (dialog, drawer, toast, …).
- **command-palette**: reopening the palette after a search showed the previous query. `KjCommandInput` now reflects the `kjQuery` signal back onto the DOM input (the `(input)` binding was one-way), and `KjCommandPaletteComponent` clears the query + active item when it closes — so each open starts fresh.
- **icon**: digit-bearing Lucide icons (`heading-1`, `heading-2`, `heading-3`, `clock-10`, `columns-2`, …) rendered blank — `pascalToKebab` never inserted a hyphen before digits, so the requested kebab name never matched the registry key. Fixed the converter; these icons now resolve everywhere (including the rich-text-editor toolbar).
