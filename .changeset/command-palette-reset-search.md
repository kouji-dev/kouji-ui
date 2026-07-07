---
'@kouji-ui/components': patch
---

Reset the command palette search when it reopens.

`<kj-command-palette>` now clears its `kjQuery` model, its highlighted `kjValue`,
and the search input's text every time it opens. Previously the input's DOM
value was written one-way from typing (it is not two-way bound to `kjQuery`), so
reopening the palette (e.g. via the Cmd/Ctrl+K hotkey) kept the previous query
and its filtered result set. Each open now starts blank.
