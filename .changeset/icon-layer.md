---
'@kouji-ui/core': patch
'@kouji-ui/components': patch
'@kouji-ui/themes': patch
---

Add `@kouji-ui/core/icon` — provider-agnostic icon layer:

- `KjIconDirective` (`[span,i][kjIcon]`) renders icons via CSS custom
  properties (`--kj-icon` + `mask-image` for svg, `content` for font).
- `provideIcons` / `provideIconResolver` / `provideIconLoader` for
  registering icon sets, sync URL synthesis, or async loaders.
- `injectKjIconResolver()` exposes the unified resolver in injection
  contexts.
- `KJ_ICON_REGISTRY` / `KJ_ICON_RESOLVER` / `KJ_ICON_LOADER` /
  `KJ_ICON_CSS_PATH` tokens published.
- Stylesheet shipped at `@kouji-ui/core/icon/icon.css` with mask-image
  rendering for monochrome SVG and `content` for font glyphs.
