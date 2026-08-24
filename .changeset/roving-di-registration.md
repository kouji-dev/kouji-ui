---
"@kouji-ui/core": patch
---

Fix roving tabindex when items come from styled wrappers.

`KjRovingTabindex` found its items with a `contentChildren` query, which cannot cross a component view boundary. A styled wrapper (`<kj-tab>`) renders its item inside its own view, so the query returned nothing and every item stayed at `tabindex="-1"` — the composite could not be reached by keyboard at all. It only worked when the headless directives were applied directly, so the bug was invisible from the library's own examples and hit every app using the components.

Items now register with the container through DI and are ordered by document position, so wrapper depth no longer matters.
