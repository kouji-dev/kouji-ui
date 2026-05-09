# Theme generator layout — Design

**Date:** 2026-05-09
**Status:** Brainstormed — awaiting user review before implementation plan
**Companion spec:** [`2026-05-09-theme-token-accessibility-design.md`](./2026-05-09-theme-token-accessibility-design.md)

## Summary

Refresh the `/theme-generator` page IA to make **configuration easier**, give **preview** more horizontal space, and promote the **accessibility report** to a first-class surface — without abandoning the look the user likes.

**Spine (locked):** **A — single configuration surface with tabs.** A persistent **theme rail** stays on the left; the long stack of `<details>` becomes a **tabbed configuration panel**; the **preview** keeps the right side; the **a11y scorecard** moves out of a third sidebar column into a **dedicated tab** (with an optional summary chip in the toolbar).

## Goals

1. **Faster feature access** — every configuration area reachable in **one click**, no hidden accordions.
2. **More room for preview** — drop the third permanent sidebar column.
3. **A11y is first-class** — its own tab; not a column visually competing with the editor.
4. **Honest mobile behavior** — same tabs, same model, in a drawer.

## Non-goals

- Reskin of components (keep `kj-button`, `kj-tabs`, current tokens).
- Replacing `ThemeDraftService` or persistence model.
- DaisyUI-style **bottom dock** — revisit only if it earns its keep later.
- Side-by-side theme comparison.

## Current pain points (baseline)

From [`theme-generator-sidebar.html`](apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.html) + [`theme-generator-sidebar.css`](apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.css):

- Three live sibling columns (theme list **220px**, token editor **380px**, [`kj-contrast-scorecard`](apps/docs/src/app/components/contrast-scorecard/contrast-scorecard.ts)) eat ~600px+ before the preview.
- Token editor is a stack of `<details>` with only **Colors** open by default — Shape / Type / Motion need extra clicks and are easy to miss.
- The accessibility scorecard is visually a third column; it reads as “bolted on” rather than a feature.
- Top page actions (`Save / Copy CSS / Copy link / Import / Download / Export JSON`) live in the page header ([`theme-generator.html`](apps/docs/src/app/pages/theme-generator/theme-generator.html)) and are disconnected from the editor.

## Target layout

```text
┌─ shell ─────────────────────────────────────────────────────────────────┐
│ ┌── Theme rail ──┐ ┌── Configure (tabs) ───────┐ ┌── Preview canvas ──┐ │
│ │ Built-in       │ │ [Toolbar: name | Random   │ │  marketing-grade   │ │
│ │ My themes      │ │  | Save | Copy CSS | …]   │ │  surfaces (your    │ │
│ │ + New theme    │ │ ─────────────────────────  │ │  existing tabs)    │ │
│ │                │ │  Themes | Colors |         │ │                     │ │
│ │                │ │  Shape & motion | Type |   │ │                     │ │
│ │                │ │  Accessibility             │ │                     │ │
│ │                │ │ ─────────────────────────  │ │                     │ │
│ │                │ │  (active tab content)      │ │                     │ │
│ └────────────────┘ └────────────────────────────┘ └─────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### Columns

- **Theme rail** — current Col A (built-ins + my themes + new theme), unchanged behavior; stays compact (~220px). Optionally collapsible to icons-only on smaller widths.
- **Configure** — replaces current Col B and the third scorecard column. **Persistent toolbar** + **`kj-tabs`** + active tab content. The configuration area is the only place to edit the theme.
- **Preview** — gains the horizontal real estate freed by removing the scorecard column.

### Tabs (locked names)

| Tab | Owns |
|-----|------|
| **Colors** | Seed grid, palette actions (Randomize / Re-derive), color slot rows, content overrides, derived base shades — i.e. today’s **Colors** `<details>` |
| **Shape & motion** | Today’s **Shape** + **Motion** `<details>` (radii, border, depth, transition) |
| **Type** | Today’s **Type** `<details>` (font selectors); when track **C** of the a11y spec lands, theme typography size fields live here |
| **Accessibility** | Hosts the [`ContrastScorecard`](apps/docs/src/app/components/contrast-scorecard/contrast-scorecard.ts), refactored per the [a11y report spec](./2026-05-09-theme-token-accessibility-design.md) (Contrast · Non-text · Typography sections) |

### Persistent toolbar (above the tabs)

Single row, glued to the editor (replaces the disconnected page header). Contents:

- **Theme name input** + helper text (current behavior).
- **Random** (palette) and **Re-derive** (today in palette-actions inside Colors `<details>`).
- **Save**, **Copy CSS**, **Copy link**, **Import…**, **Download .css**, **Export JSON** (today in [`theme-generator.html`](apps/docs/src/app/pages/theme-generator/theme-generator.html) page header).
- **A11y summary chip** — small badge bound to the report’s named summary (e.g. `aaaNormalPass / aaaNormalTotal`); clicking activates the **Accessibility** tab. Replaces the misleading “AAA %” glanceable that exists today.

The toolbar wraps responsively; touch targets stay ≥ 44×44 ([WCAG 2.5.5](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)).

## Component impact

- **[`ThemeGeneratorShellComponent`](apps/docs/src/app/shells/theme-generator-shell/theme-generator-shell.html)** — keeps the shell role; rail + main split unchanged.
- **[`ThemeGeneratorComponent`](apps/docs/src/app/pages/theme-generator/theme-generator.ts)** — page-level header collapses into the new toolbar; component owns the toolbar + the configure panel host; preview area unchanged structurally.
- **[`ThemeGeneratorSidebarComponent`](apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.ts)** — split:
  - **Col A (theme rail)** stays in this component (or extracts to `theme-rail` if convenient).
  - **Col B (token editor) is dissolved** into per-tab content components: `colors-panel`, `shape-motion-panel`, `type-panel`, `a11y-panel`. Each is a focused component (per [`rules/code_style.md`](rules/code_style.md) one-purpose units), drives `ThemeDraftService`.
- **[`ContrastScorecard`](apps/docs/src/app/components/contrast-scorecard/contrast-scorecard.ts)** — relocates inside `a11y-panel`; presentation refactored alongside the a11y-report scope (grouped sections, named summaries).

State source of truth (`ThemeDraftService`, `resolvedTokens`, URL sync) is unchanged.

## Mobile behavior

Reuses the existing translate-X pattern in [`theme-generator-sidebar.css`](apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.css):

- Below the existing breakpoint, the **Configure** panel becomes a **drawer** (slide-in over preview) opened by an **“Edit theme”** button. Tabs and toolbar stay identical inside the drawer.
- Drawer must implement **focus trap** ([2.4.3](https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html)), **Escape to close**, and **focus restoration** to the trigger ([2.4.7](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html)). Use existing CDK focus-trap utilities consistent with the rest of Kouji.

## Accessibility expectations

- **Tabs** use `kj-tabs` with correct `role="tab"` / `aria-selected` / arrow-key navigation per the component contract.
- **Toolbar** controls keep visible labels (icon-only is allowed only with `aria-label`).
- **A11y summary chip** acts as a button (`role="button"`, focusable) that activates the Accessibility tab — never silent.
- **Live regions:** the existing toast in [`theme-generator.html`](apps/docs/src/app/pages/theme-generator/theme-generator.html) (`role="status"` `aria-live="polite"`) is preserved.
- **Preserve Skip / focus order:** rail → toolbar → tabs → tab content → preview.

## Acceptance criteria

1. No third sidebar column. Preview occupies the horizontal space currently held by the scorecard.
2. Every configuration area reachable in **one click** from the toolbar tab strip; no `<details>` accordion remains as the primary IA.
3. Toolbar is the single home for **name + palette + save/share/export** controls.
4. Accessibility tab hosts the scorecard refactored per the [a11y report spec](./2026-05-09-theme-token-accessibility-design.md).
5. Mobile drawer keeps the same tabs and passes focus management.
6. No regression in `ThemeDraftService` behavior or persistence.

## Testing

- **Unit/component tests** per panel component (Colors / Shape & motion / Type / A11y), each covering: drives draft service, renders current values, accessible-by-role queries.
- **E2E** ([`apps/docs/e2e/theme-generator.spec.ts`](apps/docs/e2e/theme-generator.spec.ts)) updated for tab-based navigation; assertions on toolbar controls and the a11y summary chip.

## Open implementation decisions (deferred to plan)

- Whether **theme rail** collapses to icons at intermediate widths, or stays at fixed 220px until the mobile drawer kicks in.
- Whether **Save/Reset** stay text-only or become an icon group on the toolbar at narrow widths.
- Whether `colors-panel` keeps the seed swatch grid above slot rows or splits into sub-tabs (semantic fills vs derived surfaces) — recommended **above + grouping headings**, no sub-tabs, to keep navigation flat.

## Self-review

| Check | Result |
|-------|--------|
| Placeholders / TBD | Open items isolated under “Open implementation decisions” |
| Internal consistency | Tab list matches component split and matches a11y spec scope |
| Scope | Single deliverable: layout/IA + a11y panel relocation |
| Ambiguity | “One spine” (tabs) — drawer is the responsive form, not a parallel mode |

---

**Next step after approval:** implementation plan only — no code until the user signs off on this document.
