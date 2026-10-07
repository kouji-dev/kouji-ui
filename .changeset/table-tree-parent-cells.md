---
'@kouji-ui/components': patch
---

`<kj-table>` tree rows: parent rows render their cells again. TanStack reports every cell of a row with sub-rows as aggregated, so tree parents rendered the (empty) aggregate instead of their `kjCellTemplate` / accessor value; only grouping rows render aggregates now.
