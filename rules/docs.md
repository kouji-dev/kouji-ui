# Docs UI Rules

Use `kj-*` components everywhere. Only use raw HTML if no equivalent exists.

Avoid custom CSS — use design tokens (`--kj-color-*`, `--kj-space-*`, etc.) or existing component variants. Custom styles only when tokens/variants can't cover it.

## Exceptions
- Layout primitives (`<div>`, `<nav>`, `<ul>`, headings) — structural, no kj-equivalent
- `<input type="file">` — pair with `<kj-button>`
- Native `<select>` for dense config UIs — until kj-select covers that case
