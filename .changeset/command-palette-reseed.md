---
"@kouji-ui/core": patch
---

fix(command-palette): re-seed the active item when the visible set changes

With `[kjShouldFilter]="false"` the consumer re-renders the item list in
response to the query, which happens AFTER the query effect ran — so the
palette highlighted an item that was already gone, and the "pick first if
nothing is highlighted" effect skipped the repair because the stale value was
not `null`. No row was active and Enter did nothing. Typing slowly hid it;
typing fast or pasting a query reproduced it every time.

The palette now re-seeds whenever the active value is no longer among the
visible items.
