---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

review retry: badge joins the preset system, roving axes survive an unbound orientation, and a slider's two-way value stops snapping back

**Badge is preset-driven (breaking, clean break).** `KjBadge` composed nothing
and hand-rolled `kjBadgeVariant` → `data-variant`, a closed union living in the
zero-CSS core package and typed against CSS that ships in
`@kouji-ui/components`. It now composes `KjVariant` + `KjSize` via
`hostDirectives` and spreads `bindPresets(KJ_BADGE_CONFIG)`, exactly like
`[kjTag]` and `[kjButton]`.

- `kjBadgeVariant` is **removed**. Use `kjVariant`: `<span kjBadge
  kjVariant="destructive">` (no alias — per the rename rule, the new name is
  the only name). `kjBadgeDot` is unchanged.
- `kjSize` is **new on the directive**, reflecting `data-size`. It was
  wrapper-only before, so `[kjBadge]` on your own `<span>` now sizes without
  re-implementing the attribute.
- New: `provideKjBadge(…)`, `KJ_BADGE_CONFIG`, `KJ_BADGE_DEFAULTS`,
  `KjBadgeConfig` — re-exported from `@kouji-ui/components` like every other
  config surface. Register a brand variant instead of living with the dev-mode
  warning:
  `provideKjBadge({ variants: [...KJ_BADGE_DEFAULTS.variants, 'brand'] })`.
- A badge now participates in the `KJ_VARIANT_FALLBACK` / `KJ_SIZE_FALLBACK`
  cascade, so an unset `kjVariant` inside a compound parent that publishes one
  follows it rather than always painting `default`.
- `KjBadgeVariant` survives as the open documentation alias
  (`KjExtensible<…>`) annotating `<kj-badge>`'s `variant` input. The styled
  `<kj-badge variant size>` and `<kj-overlay-badge kjVariant kjSize>` inputs
  are unchanged — only the headless attribute name moved.
- `<kj-overlay-badge-content>` no longer declares its own `kjSize`; the same
  public name is now owned once, by the composed `KjSize` reached through
  `KjBadge`.

**Roving axis on an unbound orientation.** `<ol kjStepper>` and `<ul kjList>`
forwarded their `kjOrientation` to the composed `KjRovingTabindex` through a
`hostDirectives` input alias — and an alias carries a *binding*, never a
default. Left unbound, the host reported `data-orientation="horizontal"` /
`"vertical"` while the primitive stayed at `'both'`, so ArrowDown walked a
horizontal stepper and ArrowRight walked a vertical nav list. Both now pin the
axis with `KJ_ROVING_ORIENTATION_DEFAULT` (the mechanism `[kjTabList]` already
used), which carries the effective value whether or not the input is bound. An
explicit `kjRovingOrientation` binding still wins.

**Slider: a `[(kjValue)]` write is no longer reverted.** `KjSliderThumb`'s
`KjFormControl` bridge read `kjValue` *tracked* inside the effect that writes
it, so a consumer's own two-way write re-ran the effect, which compared the new
value against the unchanged form-control value and put the old one back. The
comparison now reads through `untracked`; the form control still drives the
thumb, and a keyboard step still reaches the form control.
