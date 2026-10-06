---
'@kouji-ui/core': patch
'@kouji-ui/components': patch
---

Fix: a select, combobox, date picker or any dropdown opened inside a modal dialog (`inert: true`) can be used again — its options are clickable.

The dropdown's panel resolved its overlay strategies through the injector chain and, for the slots it does not provide itself, picked up the enclosing dialog's own scrim, focus trap and scroll lock. Opening the dropdown then ran the dialog's `inert` logic as if it were a second modal: the dialog it belongs to was frozen and the dialog's strategy instances were re-bound to the dropdown. `KjOverlayController` now records which overlay each strategy instance serves, and `KjOverlayPanel` drops inherited instances that already belong to another overlay. Inert keeps applying only to the page behind the topmost modal; dropdowns opened from it stay live, nested dialogs freeze only the one below, and closing restores everything.
