---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

review retry: one delivery path for the overlay CSS, and every shipped control carries its field's ARIA

**The overlay family's nine stylesheets ship once, not twice** (styles F-21 / lazy F-5). `popover.css`, `tooltip.css`, `dropdown-menu.css`, `dialog.css`, `drawer.css`, `toast.css`, `confirm-popup.css`, `sheet.css` and `action-sheet.css` were each an `@import` in the registered `components/src/overlay/overlay.css` **and** a `styleUrl` on their wrapper component(s) — 19 `styleUrl` sites, seven of them for `confirm-popup.css` alone. Under `ViewEncapsulation.None` the second copy adds nothing to the cascade (identical selectors, identical `@layer kj.component`); it only inlines ~28 KB a second time into the component chunks. The `styleUrl`s are gone and the aggregator is the single source.

**Action needed if you render `<kj-popover>` / `<kj-dialog>` / `<kj-toast>` (etc.) without registering the aggregator:** register it. It has always been required for the headless composition the docs teach, and it is now required for the wrapper components too.

```jsonc
"styles": [
  "node_modules/@kouji-ui/themes/src/index.css",
  "node_modules/@kouji-ui/core/overlay/overlay.css",
  "node_modules/@kouji-ui/components/src/overlay/overlay.css"
]
```

`overlay-styles.spec.ts` fails if a `styleUrl` (or an inline `styles` array) reappears anywhere in the package pointing at an aggregated sheet.

**A `<textarea kjTextarea>`, a `<button kjSelectTrigger>` and a masked input inside a `[kjField]` now carry the field's relationships.** Previously only `<input kjInput>` composed `KjFieldControl`, so every other shipped control inside a field had no adopted id (the `[kjFieldLabel]` `for=` resolved to nothing), no `aria-describedby`, no `aria-invalid` and no `aria-required` — WCAG 1.3.1 / 3.3.1 / 3.3.2. `KjTextarea` and `KjSelectTrigger` compose it now; `KjInputMask` gets it through `KjInput`.

- `KjFieldControl` **merges** `aria-describedby` instead of replacing it: the field's help / error ids, then the new `kjDescribedBy` input, then whatever the element already carried. A consumer's own `aria-describedby="hint"` on a control inside a field used to be dropped.
- New `kjDescribedBy` input on `KjFieldControl`, re-exposed by `KjInput`, `KjTextarea` and `KjSelectTrigger`. Use it instead of writing `[attr.aria-describedby]` on those elements — the directive owns that attribute, and a host binding runs after the template's, so a direct write is silently overwritten. `<kj-textarea>`'s character counter moved onto it.
- `<div kjInputOtp role="group">` is named by its field's `[kjFieldLabel]` through `aria-labelledby`, because `for=` cannot reach a non-labelable element. It points at the label only when one is rendered — `KjField.labelId` is minted eagerly, so a naive binding would emit an IDREF resolving to nothing. `KjFieldContext` gains `labelRendered` and `registerLabel()`.

**`[kjPasswordStrength]`'s `kjAnnounce` does something** (arch F-10). It was a published no-op whose TSDoc promised a live region. Register one with the new `KjPasswordStrength.registerLiveRegion(region)` and set `kjAnnounce`, and the meter announces each strength tier as it changes — not each keystroke, and never the tier it mounted with. `<kj-password-input>` renders the visually hidden region itself and exposes the flag as `[kjAnnounceStrength]`. The meter is still not a live region itself: it is a `role="progressbar"`, whose descendants are not exposed, and a live region announces a text change rather than an `aria-valuetext` change.

**`kjTicks` is coerced like every other static attribute** (arch F-2). `kjTicks="false"` bound the *string* `"false"`, which is neither `false` nor an array — and the resolver's last branch is `'auto'`, so an author who switched ticks off got one tick per step. The new `coerceTicks` transform keeps the array and `'auto'`, and folds everything else through `booleanAttribute`: a bare `kjTicks` now means `'auto'` and `kjTicks="false"` really means off. Exported alongside `KjSliderTicksInput`.

**One checked narrowing replaces eight blind casts** (arch F-4). `injectAnchoredPosition({ side, align, offset })` reads this element's position strategy back out of DI and configures it; the eight panels that each wrote `inject(KJ_OVERLAY_POSITION_STRATEGY) as ReturnType<typeof anchoredTo>` now call it, and a non-anchored strategy in that slot throws a message naming the panel's mistake instead of failing later inside the strategy. The three inputs stay declared on each panel — Angular discovers a signal input by seeing `input()` as a class property initialiser, so an input a helper returns is not an input.

**New stylelint rule `kouji/namespaced`** (arch F-5's remaining half). Every selector in `packages/*/src/**/*.css` must be anchored by something the library owns — a `.kj-*` class, a `kj-*` element, a `[data-*]` hook, `:root`, `:host` or `::backdrop`. `ViewEncapsulation.None` is the permanent architecture, so a bare `.card` or `button` selector is a global rule in the consumer's document. `kouji/layered` already fixed where a rule sits in the cascade; this fixes how far it reaches. The library is at zero violations today.
