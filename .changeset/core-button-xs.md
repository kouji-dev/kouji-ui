---
'@kouji-ui/core': patch
---

Register the `xs` button size in `KJ_BUTTON_DEFAULTS.sizes`.

The size landed in the previous release as a CSS block in
`@kouji-ui/components` and a docs note, but `KJ_BUTTON_DEFAULTS` lives in
`@kouji-ui/core`, which was not part of that changeset and so was never
republished. Consumers on the published packages therefore had the `xs`
styles but no config entry to select them. This ships the core half.

`xs` is 28px, matching the `xs` that `KjInput` already had. It sits below
the 44px touch floor and is documented for dense application chrome only.
