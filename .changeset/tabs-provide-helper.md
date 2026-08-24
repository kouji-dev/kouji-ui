---
"@kouji-ui/core": minor
"@kouji-ui/components": minor
---

Add `provideKjTabs()` so tab variants are extensible, like Button's.

`<kj-tabs>` had `variant` as a hardcoded `'default' | 'pills'` input, so an app could neither add a shape nor change the default. It now resolves through the same preset chain as Button — explicit input > `provideKjTabs(…)` default > library default — via the composed `KjVariant` directive, and unknown names warn in dev.

```ts
provideKjTabs({ variants: [...KJ_TABS_DEFAULTS.variants, 'document'] })
```

A registered variant needs only a CSS rule on `.kj-tabs[data-variant="document"]`; every part of both shipped shapes is already a `--kj-tab-*` knob.
