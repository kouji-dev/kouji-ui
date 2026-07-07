---
"@kouji-ui/core": minor
"@kouji-ui/components": minor
---

feat(skip-link): add `KjSkipLink` — a "skip to main content" bypass link (WCAG 2.4.1)

- `@kouji-ui/core`: headless `KjSkipLink` directive (`a[kjSkipLink]`). Reflects a
  fragment `href`, and on activation moves keyboard focus to the target landmark
  (adding `tabindex="-1"` when needed). Suppresses the anchor's native
  navigation, which under `<base href="/">` would resolve `#main-content`
  against the base URL and leave the page.
- `@kouji-ui/components`: themed `KjSkipLinkComponent` (`kj-skip-link`) —
  visually hidden until focused, then revealed on-screen with a high-contrast
  (`--kj-bg-primary` / `--kj-fg-on-primary`) surface. Themable via
  `--kj-skip-link-*` tokens; honours `prefers-reduced-motion`.
