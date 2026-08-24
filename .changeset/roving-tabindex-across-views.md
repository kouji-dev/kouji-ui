---
"@kouji-ui/core": patch
---

Fix roving tabindex when items live inside a styled wrapper's view.

`KjRovingTabindex` collected its items with `contentChildren`, which does not cross a component view boundary. The styled wrappers render their item inside their own view — `<kj-tab>` renders `<button kjTab>` — so the container saw **zero** items, no item ever received `tabindex="0"`, and the whole widget (every `<kj-tabs>` built from the wrapper components) was unreachable by keyboard.

Items now register with the container through DI, which is hierarchical and works for both the wrapper and the raw-directive spelling. The item list is sorted by `compareDocumentPosition` so arrow-key order follows the DOM rather than construction order.
