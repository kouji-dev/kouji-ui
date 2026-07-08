---
---

docs(rich-text-editor): the "Custom feature" example lazily loads `lexical` (via the feature's `load()`, like the built-in features) instead of an eager `import * as lexical`, so the custom node shares the editor's single lexical instance. Example-only change.
