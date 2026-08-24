---
"@kouji-ui/components": patch
---

Retune the two tab shapes and make them themeable.

- `default` is the underline strip and `pills` is the recessed chip tray — the two shapes products actually use. Both are now driven by `--kj-tab-*` knobs (ink, indicator colour/size/inset, tray ground/ring, padding, font) instead of hardcoded values, so a consumer re-themes a strip without redeclaring the recipe.
- The active mark moved from `border-bottom` to a pseudo-element, so it can be inset from the tab's edges (`--kj-tab-indicator-inset`); a border cannot.
- The rest state is an ink token instead of `opacity: .6`, which was also dimming each tab's icon and badge.
