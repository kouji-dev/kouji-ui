---
'@kouji-ui/themes': patch
'@kouji-ui/components': patch
---

Add an app-wide density layer and the `orrery` / `orrery-light` themes.

**Density** (`@kouji-ui/themes/density.css`, exported from `index.css`)

Density previously existed only on the table (`--kj-table-row-height`). It is now
a library-level concern driven by two inherited scalars, `--kj-density` and
`--kj-type-scale`, set by `[data-density="compact" | "standard" | "comfortable"]`
on any element (`comfy` is accepted as an alias). Because the scalars inherit,
a dense region nests inside a comfortable app with no extra rules.

New additive tokens — nothing is renamed:

- numeric spacing ladder `--kj-space-1..11`, with the existing t-shirt names
  re-pointed at it (`xs`→2, `sm`→4, `md`→6, `lg`→7, `xl`→9, `2xl`→11). Every
  t-shirt token resolves to its previous value at density 1.
- type steps `--kj-text-3xs`, `-2xs`, `-3xl`, `-4xl`, `-display`, plus
  `--kj-text-code` / `--kj-leading-code` for editor and terminal surfaces that
  take metrics as JS numbers.
- control-height ladder `--kj-ctl-h-{xs,sm,md,lg,xl}` and `--kj-row-h`.
  `button` and `input` now resolve their per-size heights from it, so density
  scales every variant uniformly. Values are unchanged at density 1.
- `kjSize="xs"` on `KjButton` (28px), matching the `xs` that `KjInput` already
  had. Intended for dense application chrome; it sits below the 44px touch
  floor and is documented as such.

`--kj-table-row-height` now defaults to `--kj-row-h`. Its
`:host([data-density])` values are untouched, so existing tables keep their
exact pixel heights — the change is that a table also inherits density from an
**ancestor** `[data-density]`, which it previously ignored.

Only the scalars and the JS-read height ladder are registered via `@property`.
The existing `--kj-space-*` / `--kj-text-*` deliberately are not: registration
makes invalid-at-computed-value-time *apply*, which would silently discard a
consumer override.

**Themes**

`orrery` (graphite — flat ~0.005 OKLCH chroma across the neutral ramp,
elevation as a lightness step plus a hairline) and `orrery-light` ("paper" —
elevation goes down, the editor is the single brightest surface). Both declare
the full 53-token shared-layer contract.

Note: derived values use CSS `round()` (Baseline 2024). Where unsupported the
declaration is invalid and the token falls back to its density-1 literal.
