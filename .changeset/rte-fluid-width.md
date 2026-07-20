---
'@kouji-ui/components': patch
---

fix(rich-text-editor): make the editor fluid so it never overflows its container

`.kj-rte` had no width constraint, so inside a flex/grid parent (the docs
playground stage, or a narrow app layout) it sized to its content and spilled
out sideways. Added `width: 100%; max-width: 100%; min-width: 0; box-sizing:
border-box`, plus `min-width: 0` + `overflow-wrap: anywhere` on the editable
surface — the editor now fills and respects its container, and the toolbar
scrolls within it instead of the whole editor overflowing.
