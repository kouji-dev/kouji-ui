---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

`<kj-table>` server-side infinite scrolling on top of the virtual body.

- `kjTableInfiniteResource({ request, pageSize, loader, overscanPages? })` caches pages, fetches the ones the visible range needs, aborts the rest, resets to the top when `request()` changes and supports `reload({ silent: true })` (keeps rows and scroll). Signals: `rows`, `total`, `isResetting`, `isFetchingMore`, `isRefreshing`, `error`, `resets`.
- `[kjInfinite]` binds such a resource; or wire it by hand with `[kjRowCount]` (the virtualizer spans the whole result set, unloaded rows render as `kj-skeleton` rows) and `(rangeChange)` (debounced by `kjRangeChangeDebounce`).
- Scroll API: `scrollToTop()`, `scrollToIndex(i, align?)`, `scrollOffset()` and `restoreScroll(offset)`.
- `kjLoadingMode: 'bar' | 'overlay'` — `overlay` dims the rows under the centred loading template.
- Select-all hook: `(selectAll)` output, `kjSelectAllMode: 'page' | 'loaded' | 'external'` and `kjSelectAllChecked` (default behaviour unchanged).
- core `KjTable.setInfinite(on)`: sparse index-aligned data, `sourceIndex()`, server-side sorting / filtering / paging; `KjTableRow` reports the result-set `aria-rowindex`.
