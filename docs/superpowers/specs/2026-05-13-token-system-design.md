# Token System Redesign — Design Spec

**Date:** 2026-05-13
**Status:** Approved
**Branch:** `feat/token-system`

## Goal

Replace the current ~11-token semantic color slot system with a 47-token taxonomy that:

1. Fixes the structural causes of the 22 `color-contrast` violations per theme observed in the a11y baseline (see `reports/a11y/`).
2. Supports the full layering vocabulary modern UIs need (popovers, scrims, inputs, alt rows, inverse surfaces) without overloading one slot for several roles.
3. Separates brand-as-fill from brand-as-text — a single brand color cannot satisfy both contracts in every theme.

## Out of scope

- Primitives layer (`packages/themes/src/base.css`) — OKLCH ramps and base scales stay as-is.
- Spacing, radius, font, motion tokens — unchanged.
- Component implementations — covered by the rollout plan, not this design.

## Why the current system fails

The current system has 11 color slots (`base-100/200/300`, `primary`, `secondary`, `accent`, `neutral`, `info`, `success`, `warning`, `destructive`) plus `*-content` pairs. Two structural problems surface in the a11y baseline:

1. **No "muted text on body" token.** Designers reach for `--kj-color-neutral` (which is meant to be a surface with its own content pair). On dark themes, `neutral` = `#666666` on `base-100` = `#0c0c0c` = 3.4:1 contrast — fails AA. Repeats across 6 themes on every page using `.hero-desc`.
2. **One slot for "primary as fill" and "primary as text".** `--kj-color-primary` is the primary button background AND is used for text colors like `.hero-tag`. The same value cannot satisfy both contracts in vivid-palette themes (retro brand `#ef9995` on `#ede5d0` body = 1.73:1; cyberpunk pink `#ff007f` on yellow body = 3.14:1).

The new system splits these axes explicitly.

## The 47-token taxonomy

Each theme defines these tokens. Primitives live in `base.css` unchanged.

### Neutral surfaces (7)

| Token | Role |
|---|---|
| `--kj-bg-body` | Page background |
| `--kj-bg-surface` | Cards, panels, default raised |
| `--kj-bg-field` | Inputs, code blocks, alt-row stripes |
| `--kj-bg-elevated` | Popovers, menus, dropdowns |
| `--kj-bg-overlay` | Modal scrim (semi-transparent) |
| `--kj-bg-inverse` | Tooltips, snackbars (cross-theme contrast) |
| `--kj-bg-disabled` | Disabled controls |

### Intent surfaces (12)

Each intent has two variants: a saturated solid fill (default) and a tinted band (subtle).

| Intent | Default fill | Tinted variant |
|---|---|---|
| Primary | `--kj-bg-primary` | `--kj-bg-primary-subtle` |
| Accent (2nd hue) | `--kj-bg-accent` | `--kj-bg-accent-subtle` |
| Info | `--kj-bg-info` | `--kj-bg-info-subtle` |
| Success | `--kj-bg-success` | `--kj-bg-success-subtle` |
| Warning | `--kj-bg-warning` | `--kj-bg-warning-subtle` |
| Danger | `--kj-bg-danger` | `--kj-bg-danger-subtle` |

Hover/pressed states are derived per-component via `color-mix(in oklch, var(--kj-bg-primary), black 8%)`, not via separate tokens.

### Foregrounds — Class A: independent (4)

Used on any neutral surface (`bg.body / .surface / .field / .elevated`). Each must meet AA contrast (4.5:1 normal, 3:1 large text) against `bg.body` at minimum.

| Token | Role |
|---|---|
| `--kj-fg-default` | Primary text (paragraphs, headings, button labels on non-intent surfaces) |
| `--kj-fg-muted` | Secondary text (captions, helpers, timestamps) |
| `--kj-fg-subtle` | Tertiary text (placeholders, light labels) |
| `--kj-fg-disabled` | Non-interactive state |

### Foregrounds — Class B: paired (7)

Only valid against their specific paired background. Each must meet AA contrast (4.5:1) against its paired surface.

| Token | Paired with |
|---|---|
| `--kj-fg-on-primary` | `--kj-bg-primary` (and `*-subtle`) |
| `--kj-fg-on-accent` | `--kj-bg-accent` (and `*-subtle`) |
| `--kj-fg-on-info` | `--kj-bg-info` |
| `--kj-fg-on-success` | `--kj-bg-success` |
| `--kj-fg-on-warning` | `--kj-bg-warning` |
| `--kj-fg-on-danger` | `--kj-bg-danger` |
| `--kj-fg-on-inverse` | `--kj-bg-inverse` |

### Foregrounds — Class C: intent as text (6)

Used as text color on neutral surfaces (not as a fill). Each must meet AA contrast against `bg.body / .surface / .field / .elevated`. This is the bit the old system was missing.

| Token | Use cases |
|---|---|
| `--kj-fg-primary` | Inline links, brand-color labels, `.hero-tag`, `.kj-navbar-version` |
| `--kj-fg-accent` | 2nd hue used as text |
| `--kj-fg-info` | Status copy on neutral bg |
| `--kj-fg-success` | "Saved" success message |
| `--kj-fg-warning` | Warning helper text |
| `--kj-fg-danger` | "Email is required" error text |

**Key contract:** `--kj-fg-primary` is *not* the same value as `--kj-bg-primary`. A theme with a vivid brand fill (cyberpunk's hot pink `#ff007f`) must pick a darker variant for `--kj-fg-primary` (e.g., `#8c003f`) so the contrast contract holds.

### Borders (7)

| Token | Role |
|---|---|
| `--kj-border-default` | Inputs, cards |
| `--kj-border-muted` | `<hr>`, list dividers |
| `--kj-border-strong` | Active inputs, emphasized cards |
| `--kj-border-focus` | Keyboard focus ring |
| `--kj-border-disabled` | Disabled controls |
| `--kj-border-primary` | Selected tab indicator, brand-tinted borders |
| `--kj-border-danger` | Invalid input outline |

### Shadows (4)

Replaces hardcoded `box-shadow` inlined throughout components today.

| Token | Role |
|---|---|
| `--kj-shadow-sm` | Card resting |
| `--kj-shadow-md` | Popover, menu |
| `--kj-shadow-lg` | Modal, drawer |
| `--kj-shadow-focus` | Focus glow (paired with `border.focus`) |

### Unchanged

- `--kj-radius-*` — kept
- `--kj-font-*` / `--kj-text-*` — kept
- `--kj-space-*` — kept
- `--kj-transition` — kept

## Contrast contract

Every theme MUST satisfy:

| Pair | Minimum ratio |
|---|---|
| `fg.default` on `bg.body / .surface / .field / .elevated` | 7:1 (AAA) |
| `fg.muted` on `bg.body / .surface / .field / .elevated` | 4.5:1 (AA) |
| `fg.subtle` on `bg.body / .surface / .field / .elevated` | 3:1 (AA large-text) |
| `fg.{intent}` on `bg.body / .surface / .field / .elevated` (Class C) | 4.5:1 (AA) |
| `fg.on-{intent}` on `bg.{intent}` (Class B) | 4.5:1 (AA) |
| `fg.on-inverse` on `bg.inverse` | 4.5:1 (AA) |

`fg.disabled` and `border.disabled` are intentionally exempt — they signal "you cannot interact with this."

The pipeline (`pnpm a11y`) enforces these via axe-core in CI-style reports. A theme that fails the contract gets visible regressions in `reports/a11y/`.

## Mapping from current tokens

The migration table is captured separately in [`token-migration-map.md`](./token-migration-map.md) — it is the reference document the parallel migration agents work from.

## Why this taxonomy specifically

- **6 neutral surfaces** instead of 3 numeric layers — every elevation role has a named token. Popovers stop sharing color with `<hr>`. Modal scrim is a token, not a magic rgba.
- **2 variants per intent** (default + subtle) — covers solid button fill AND tinted alert band. Hover states delegated to `color-mix`.
- **Three foreground classes** (independent / paired / intent-as-text) — same vocabulary every system in the survey converged on (Primer, Atlassian DACI, Material 3).
- **Borders + shadows promoted to their own axes** — fixes the "everything is base-300" overload.

## What this does NOT add

- **Hover/pressed state tokens** — handled by `color-mix` per-component or component-level overrides.
- **Per-component tokens** (`--kj-button-bg` etc.) — already exist in component layer, stay as-is.
- **Theme-author-defined intent slots** — info/success/warning/danger are fixed. No `--kj-bg-tertiary` etc.

## Rollout

See [`docs/superpowers/plans/2026-05-13-token-system.md`](../plans/2026-05-13-token-system.md) for the phased implementation.
