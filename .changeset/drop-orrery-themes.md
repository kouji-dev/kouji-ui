---
'@kouji-ui/themes': patch
---

Remove the `orrery` and `orrery-light` themes.

They were app-specific palettes for Orrery, not general-purpose themes, and
now live in that app's own stylesheet. `@kouji-ui/themes/themes/orrery.css`
and `@kouji-ui/themes/themes/orrery-light.css` no longer resolve, and the
bundle export no longer defines `[data-theme="orrery"]` /
`[data-theme="orrery-light"]`. The density layer stays.
