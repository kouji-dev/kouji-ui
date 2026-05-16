---
'@kouji-ui/core': patch
'@kouji-ui/components': patch
---

Finalize the listbox-primitives migration for cascade-select, tree-select, menubar, and combobox.

**`@kouji-ui/core`**

- `KjSelectionModel` now receives its source signals via a `bind()` call from the consumer root (replacing the older inject-the-config pattern). The model auto-derives a tree shape from each `KjListItem`'s parent DI pointer when the consumer doesn't supply one explicitly — DOM-nested clusters (cascade-select, sub-menus) are tree-aware out of the box. `'single'` mode now respects the shape and blocks branch commits at the model layer.
- `KjListItem` exposes a `parent` reference (nearest ancestor `KjListItem` via `skipSelf` element-injector lookup) and gates activation through `KjSelectionModel.canActivate(value)` — branch options serve purely as disclosure controls without leaking values.
- `KjCascadeSelectOption` migrates to mode `'single'` (was `'leaf'`) for a clean string value rather than an array; aliases `KjListItem` inputs as `kjValue`/`kjLabel`/`kjDisabled` (was `kjOptionValue`/`kjOptionLabel`/`kjDisabled`) to match `KjTreeSelectNode`'s convention. Branch detection switched from imperative `_registerSubPanel()` to a `contentChildren(KjCascadeSelectSubPanel)` query.
- `KjCascadeSelect` removes the required `kjTreeShape` input — the consumer-supplied shape is optional now (defaults to the auto-derived one). Path derivation moves to `KjSelectionModel.pathTo()`.
- `KjMenubarItem` gains a `kjActivate` output (bridged from `KjListItem.activate`) and now early-returns from its open/close toggle when `kjDropdownMenuTriggerFor` is unset, so a sibling `[kjDropdownMenuTrigger]` on the same element can own the overlay state without the item's toggle handler closing the dropdown that just opened (the two directives share a single per-element `KjOverlayController`).

**`@kouji-ui/components`**

- `KjCascadeOptionComponent` now extends `KjCascadeSelectOption` directly and registers itself under the directive's token via `useExisting` so projected sub-panels resolve their parent option through normal element-injector DI. This works around Angular 21's NG2017 rule (chained hostDirective alias forwarding is forbidden) while keeping the markup-driven recursive API.
- Cascade-option public inputs renamed to `kjValue`/`kjLabel`/`kjDisabled` to match tree-select-node and the new core aliases.
- `kj-menubar-item` wrapper forwards the new `(kjActivate)` output.
- Menubar examples rewritten (the previous files were placeholders): `default`, `disabled-item`, `with-shortcuts` (composes `<kj-kbd>`), `with-submenu` (uses the standard `kjDropdownMenuTrigger` + `<kj-dropdown-menu-content [kjFor]>` idiom).
- Dropdown-menu playground gains a "Last selected" readout wired through `(kjSelect)` on each item; menubar playground gets the same readout wired through the new `(kjActivate)`.
- `kj-option` (select) selected-state styling now uses a tinted primary token (`color-mix(in oklab, var(--kj-bg-primary) 12%, transparent)` + `var(--kj-fg-primary)` + `font-weight: 600`), mirroring `kj-tree-select-node` so the listbox family stays visually consistent across themes.
- New `packages/components/src/overlay/` aggregator stylesheet so consumers register a single overlay CSS entry rather than per-component overlays in `angular.json`.
