---
'@kouji-ui/components': patch
---

select: long labels truncate with an ellipsis instead of wrapping

The trigger's label span had no rule of its own, so a long option label (a
branch name, a path) wrapped onto a second line inside the fixed-height
button and overflowed it. `.kj-select-trigger-label` is now a single
`nowrap` line with `text-overflow: ellipsis`, the trigger itself is
`min-width: 0` so it can shrink inside a flex column, `.kj-option` rows
truncate the same way, and the listbox panel gets
`max-width: min(28rem, calc(100vw - 2rem))` so one long option no longer
stretches the whole panel.
