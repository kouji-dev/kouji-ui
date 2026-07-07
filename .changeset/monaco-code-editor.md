---
"@kouji-ui/core": minor
"@kouji-ui/components": minor
---

feat(editor): KjEditor — Monaco-wrapped code editor.

Core adds the headless `KjEditor` directive (`[kjEditor]`) plus `KjEditorLoader`
and `provideMonaco()`: two-way `kjValue`, `kjLanguage`, options (readonly,
minimap, line numbers, word wrap, font size), reduced-motion, SSR-safe lazy
load, and a configurable Monaco source (defaults to the `@monaco-editor/loader`
CDN so Monaco never bloats the base bundle; point at a self-hosted/bundled
Monaco via `provideMonaco({ vsPath })` or `provideMonaco({ loader })`).
`monaco-editor` and `@monaco-editor/loader` are optional peer dependencies.

Components adds the styled `<kj-editor>` (`KjEditorComponent`): a kj-token-synced
Monaco theme that re-applies on theme switch, an optional toolbar and status bar,
a loading region, and AAA keyboard access (accessible name via `kjAriaLabel`,
`accessibilitySupport: 'auto'`, and the documented `Ctrl+M` tab-trap escape).
