---
"@kouji-ui/core": minor
"@kouji-ui/components": minor
---

Add `KjRichTextEditor` — a **client-driven, feature-composed** rich-text editor wrapping
[Lexical](https://lexical.dev).

- **Core** (`@kouji-ui/core`): a headless `[kjRichTextEditor]` directive that owns the
  Lexical engine (loaded lazily via dynamic `import()` for SSR safety, no CDK), plus the
  **feature framework**. A `KjRichTextFeature` is a self-contained vertical slice that owns
  its package loading (`load()`), `nodes`, activation (`setup`), and UI (`toolbar`, `overlay`):
  - **Per-feature lazy package loading** — each feature dynamically imports only its own
    `@lexical/*` package(s), so disabling a feature keeps its code out of the bundle.
  - Nodes are collected from all features **before** `createEditor`; state + HTML
    (de)serialization are package-agnostic (respect only the active node set).
  - Declarative `toolbar` + `overlay` contributions; a `KjRichTextContext` of package-agnostic
    command helpers; `createKjDecoratorNode()`/`createKjImageNode()` node factories; a CDK-free
    Angular decorator-node bridge (`injectRichTextNode`).
  - Composition via `provideKjRichText(...)`, `[kjFeatures]`, or `[kjRichTextFeature]`.
    `KjRichTextExtension`/`KjRichTextPlugin` remain as deprecated aliases of `KjRichTextFeature`.
- **Components** (`@kouji-ui/components`): a styled `<kj-rich-text-editor>` whose accessible
  `role="toolbar"` (roving tabindex, `aria-pressed`, `aria-keyshortcuts`) renders **dynamically**
  from the active features' contributions — no hardcoded buttons. Ships the feature factories
  (`bold()`, `italic()`, `heading()`, `bulletList()`, `link()`, `image()`, `codeBlock()`,
  `markdownShortcuts()`, `history()`, …) and a `defaultFeatures()` bundle for zero-config, plus
  link/image overlay editors and live-region announcements.

Lexical is declared as an optional peer dependency (mirroring the ECharts/chart setup).
