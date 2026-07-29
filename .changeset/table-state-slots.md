---
'@kouji-ui/components': patch
---

table: center the empty / error pane and add lazy state templates

Fix: in a height-constrained `<kj-table>` the row-less body kept `flex: 1` and
pushed the empty (or error) pane to the very bottom of the table, where it read
as a footer instead of a centered state. The body now yields its growth to the
active state pane, which centers in the space below the sticky header. Tables
without a height constraint are unchanged.

Add: `<ng-template kjEmptyTemplate>`, `kjLoadingTemplate` and `kjErrorTemplate`
content slots. Unlike the `[kjEmpty]` / `[kjLoading]` / `[kjError]` attribute
slots — which still work and remain the fallback — template content is
instantiated only while that state is on screen.
