# Token Migration Map — Old → New

Reference document for the `feat/token-system` rollout. Every migration agent uses this table to translate the old `--kj-color-*` tokens to the new `--kj-bg-*` / `--kj-fg-*` / `--kj-border-*` tokens.

**Critical rule:** the old token `--kj-color-primary` could mean *either* "primary as fill" *or* "primary as text", depending on the CSS property it was assigned to. Agents must disambiguate by reading the surrounding context.

## Disambiguation rules

When you see an old token in a CSS rule, decide its role by the property:

| CSS property using the token | Old token role | Map to |
|---|---|---|
| `background`, `background-color`, `fill` (decorative) | **fill** | `--kj-bg-*` |
| `color`, `fill` (icon following text), `stroke`, `caret-color`, `text-decoration-color` | **text** | `--kj-fg-*` |
| `border-color`, `outline-color`, `box-shadow` (just-a-line) | **border** | `--kj-border-*` |
| `box-shadow` (depth/elevation) | **shadow** | `--kj-shadow-*` |

## Base / neutral surfaces

| Old | New | Notes |
|---|---|---|
| `--kj-color-base-100` | `--kj-bg-body` | Page bg |
| `--kj-color-base-200` | `--kj-bg-surface` | Cards, raised |
| `--kj-color-base-300` (as bg) | `--kj-bg-field` OR `--kj-bg-elevated` | **Disambiguate:** inputs/code-blocks/alt-rows → `field`; popovers/menus → `elevated` |
| `--kj-color-base-300` (as border) | `--kj-border-default` or `--kj-border-muted` | If thicker/active → `default`; if subtle separator → `muted` |
| `--kj-color-base-content` | `--kj-fg-default` | Primary text |
| `--kj-color-neutral` (as text on body) | `--kj-fg-muted` | The `.hero-desc` pattern — Class A muted |
| `--kj-color-neutral` (as a background) | `--kj-bg-field` | Quieter surface (rare in current code) |
| `--kj-color-neutral-content` | `--kj-fg-on-field` → `--kj-fg-default` | `neutral` is not an intent surface anymore; use Class A |

## Primary

| Old | New | Notes |
|---|---|---|
| `--kj-color-primary` (as background/fill) | `--kj-bg-primary` | Button fills, alert banners |
| `--kj-color-primary` (as text) | `--kj-fg-primary` | `.hero-tag`, `.kj-navbar-version`, inline brand text |
| `--kj-color-primary-content` | `--kj-fg-on-primary` | Text on primary fill |

## Accent (second hue)

| Old | New | Notes |
|---|---|---|
| `--kj-color-accent` (as background/fill) | `--kj-bg-accent` | Chat bubbles, theme-rail gradient halves |
| `--kj-color-accent` (as text) | `--kj-fg-accent` | Rare — verify use case |
| `--kj-color-accent-content` | `--kj-fg-on-accent` | Text on accent fill |

## Status intents

For each status: `info`, `success`, `warning`, `destructive` (renamed `danger`):

| Old | New |
|---|---|
| `--kj-color-{status}` (background) | `--kj-bg-{status}` |
| `--kj-color-{status}` (text) | `--kj-fg-{status}` |
| `--kj-color-{status}-content` | `--kj-fg-on-{status}` |

**Renames:**
- `--kj-color-destructive` → `--kj-bg-danger` (or `--kj-fg-danger`)
- `--kj-color-destructive-content` → `--kj-fg-on-danger`
- `--kj-color-destructive-hover` → drop (use `color-mix` per component)

## Secondary — REMOVED

`--kj-color-secondary` and `--kj-color-secondary-content` are dropped entirely. Existing usages (rare — mostly inside theme CSS files themselves) should be re-evaluated:
- If used as a "muted button surface" → use `--kj-bg-field` or rely on `outline`/`ghost` button variants
- If used as a "third hue" → use `--kj-bg-accent` (or note that the theme needs a redesign)

## Hover/pressed tokens — REMOVED

`--kj-color-primary-hover`, `--kj-color-destructive-hover`, etc. are dropped. Hover/pressed states are derived per-component via:

```css
.kj-button[data-variant="default"]:hover {
  background: color-mix(in oklch, var(--kj-bg-primary), black 8%);
}
```

If a theme needs a non-`color-mix` hover (vivid hue shift), it overrides at the component layer (already a pattern in `kouji.css`).

## Shadows

Replace inline `box-shadow: 0 N px ...` declarations with the closest shadow token:

| Old inline value | New token |
|---|---|
| Tiny resting shadow (`0 1px 2-3px`) | `--kj-shadow-sm` |
| Popover/menu shadow (`0 4-8px 12-24px`) | `--kj-shadow-md` |
| Modal/drawer shadow (`0 12-24px 40-60px`) | `--kj-shadow-lg` |
| Focus ring shadow | `--kj-shadow-focus` |

Themes define the exact rgba values; components only reference tokens.

## Borders

Existing borders mostly use `--kj-color-base-300` or hardcoded rgba. Map by intent:

| Use case | New token |
|---|---|
| Standard input / card border | `--kj-border-default` |
| `<hr>`, list separator | `--kj-border-muted` |
| Active input border, emphasized card | `--kj-border-strong` |
| Keyboard focus outline | `--kj-border-focus` |
| Disabled input | `--kj-border-disabled` |
| Selected tab indicator, brand-tinted ring | `--kj-border-primary` |
| Invalid input | `--kj-border-danger` |

## Edge cases agents must escalate

If you encounter any of these, **stop and add a note to your task report** instead of guessing:

1. A use of an old token where the CSS property is ambiguous (e.g., `box-shadow` with a token as the spread — is it border or shadow?).
2. A theme override that uses a hex value not present in any base token (custom one-off color).
3. A component that hardcodes contrast-sensitive values (`color: #fff` on a token bg).
4. A `var(--kj-color-{name}, #fallback)` with a non-trivial fallback — the fallback may carry meaning.

Report these in your task summary so they can be reviewed before Phase 3 cleanup.
