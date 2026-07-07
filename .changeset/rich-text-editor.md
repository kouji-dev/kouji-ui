---
"@kouji-ui/core": minor
"@kouji-ui/components": minor
---

Add `KjRichTextEditor` — a rich-text editor wrapping [Lexical](https://lexical.dev).

- **Core** (`@kouji-ui/core`): a headless `[kjRichTextEditor]` directive that owns the
  Lexical engine (loaded lazily via dynamic `import()` for SSR safety, no CDK). Exposes
  reactive state signals (`isBold`, `blockType`, `canUndo`, …), imperative commands
  (`toggleFormat`, `setBlock`, `toggleList`, `toggleLink`, `insertImage`, `undo`/`redo`),
  and `ControlValueAccessor` form support.
- **Extension framework** (`@kouji-ui/core`): register nodes/behaviours from outside the
  engine. `KJ_RICH_TEXT` context token, `provideKjRichText(...)` + a `[kjRichTextExtension]`
  directive, the `KjRichTextExtension` contract (lazy `nodes` factory collected before
  `createEditor`, `decorators`, `setup`), a `createKjDecoratorNode()` node factory, and a
  CDK-free Angular decorator-node bridge (`injectRichTextNode`). Built-in features are
  themselves extensions. `KjRichTextPlugin` remains as a deprecated alias.
- **Components** (`@kouji-ui/components`): a styled `<kj-rich-text-editor>` with an
  accessible `role="toolbar"` (roving tabindex, `aria-pressed`) for bold/italic/underline/
  strikethrough/inline-code, headings, lists, quote, code block, links, images, and
  undo/redo, plus markdown shortcuts and live-region announcements.

Lexical is declared as an optional peer dependency, mirroring the ECharts (chart) setup.
