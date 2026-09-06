---
'@kouji-ui/core': patch
---

Allow `segmented` as a button variant.

`kjVariant="segmented"` shipped with its CSS and its group-level shell, but
`KJ_BUTTON_DEFAULTS.variants` was never widened — so the preset validator
rejected it at runtime (`[kj] unknown variant "segmented"`) and the button
fell back to `default`. The variant was unusable without a consumer passing
their own `provideKjButton({ variants: [...] })`.
