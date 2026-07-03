---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

Add leading dot indicator to badge (superset, additive).

- core: `[kjBadge]` gains `kjBadgeDot` input reflecting a `data-dot` attribute; defaults off, existing consumers unaffected.
- components: `<kj-badge>` gains `dot` input rendering a `::before` indicator, themeable via `--kj-badge-dot-size` and `--kj-badge-dot-color` (defaults to `currentColor`).
