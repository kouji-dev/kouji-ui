# Theme-token accessibility report — Design

**Date:** 2026-05-09  
**Status:** Brainstormed — awaiting user review before implementation plan

## Summary

Define a **pure, versioned theme-token accessibility report** that evaluates only **draft-resolved theme data** (`ResolvedTokens` plus extended draft fields for typography). It does **not** inspect preview DOM, HTML structure, or component implementation — those remain separate (library / axe / manual).

Scope agreed in brainstorming:

| Track | Content |
|-------|---------|
| **A** | Contrast **map**: explicit fg/bg semantic edges, WCAG 2.x ratios, AAA-focused summaries, human-readable failure messages |
| **B** | **Non-text** (UI) contrast under **documented assumptions** (border vs surface) |
| **C** | **Typography** checks after extending `DraftTheme` with theme-level size inputs |

**Decision:** **Primary fill** on **`base-100`** and **`base-200`** must meet **WCAG 2.1 AAA normal text (7:1)** — not AA Large (3:1).

## Goals

1. **Single pure entry point** — e.g. `buildThemeA11yReport(resolved, draft) → ThemeA11yReport` in [`apps/docs/src/app/lib/theme/`](apps/docs/src/app/lib/theme/), no Angular/DOM dependency inside the core math.
2. **Explain failures** — each edge includes ratio, required minimum, pass/fail, and a short **message** (why it fails).
3. **Honest labeling** — UI must say **“Theme token checks”** so users do not confuse this with a full WCAG audit or component-level review.
4. **One WCAG 2.x implementation** — reuse **culori** for CSS → sRGB and the existing relative-luminance contrast ratio path (see current [`ContrastScoreService`](apps/docs/src/app/services/contrast-score.service.ts)); do not add a second contrast library for the same metric.

## Non-goals

- Running **axe** or any scanner against the theme-generator **preview** as part of this report.
- Auto-fixing colors or mutating the draft from the report (may be a later feature).
- **Focus order, roles, live regions, touch targets** — out of scope for the token report (handled by components + separate QA).

## Boundary: theme-only inputs

**In scope**

- Everything derivable from **`ResolvedTokens`** ([`types.ts`](apps/docs/src/app/lib/theme/types.ts)) after `deriveTokens(draft)`.
- New **draft-only fields** for typography (track **C**) once added to `DraftTheme` and validated in [`import-schema.ts`](apps/docs/src/app/lib/theme/import-schema.ts).

**Out of scope**

- Computed styles in the browser, stacking context, opacity overlays not represented in tokens.
- Font **family** stacks alone do not imply **size**; size checks require explicit draft fields (track **C**).

## Architecture

```text
DraftTheme ──deriveTokens──> ResolvedTokens
       │                           │
       └─────────────────────────────┴──> buildThemeA11yReport(resolved, draft)
                                              │
                                              ├─ contrastEdges[]
                                              ├─ nonTextEdges[]
                                              ├─ typographyChecks[]
                                              └─ summary (typed metrics)

ContrastScoreService (thin) ──delegates──> buildThemeA11yReport
ContrastScorecard ──consumes──> ThemeA11yReport (grouped UI)
```

- **Core logic** lives in **`lib/theme`** (unit-test friendly).
- **[`ContrastScoreService`](apps/docs/src/app/services/contrast-score.service.ts)** keeps DI ergonomics but **delegates** scoring to the pure builder; public types may re-export report shapes for backward compatibility.

## Report schema (conceptual)

- **`reportVersion: number`** — increment when edge lists, assumptions, or thresholds change so saved screenshots/docs don’t silently change meaning.
- **`contrastEdges`** — array of edges with at minimum: `id`, `fgToken`, `bgToken`, `fgCss`, `bgCss`, `ratio`, `requirement` (`'AAA-normal'` | `'non-text'`), `pass`, `message`.
- **`nonTextEdges`** — same shape or merged into one list with a `category` discriminant (implementation choice; spec requires distinguishability in UI).
- **`typographyChecks`** — warnings/advisories (not WCAG-mandated px floors): e.g. body rem below product minimum.
- **`summary`** — explicit metrics, e.g.:
  - `aaaNormalPass` / `aaaNormalTotal` (contrast edges that target 7:1),
  - `nonTextPass` / `nonTextTotal`,
  - `typographyWarn` count,
  - `worstRatio`, `worstEdgeId`.

Avoid a single ambiguous **“AAA %”** unless it is **defined** as `aaaNormalPass / aaaNormalTotal` and labeled accordingly.

## Track A — Contrast map

### Semantic pairs (AAA normal text → **7:1**)

- `base-content` on `base-100`, `base-200`, `base-300` (resolved via `derivedBase` where applicable).
- Each `*-content` on its matching fill: `primary`, `secondary`, `accent`, `neutral`, `info`, `success`, `warning`, `destructive`.

### Primary on canvas (AAA normal — **7:1**)

- **`primary`** on **`base-100`**  
- **`primary`** on **`base-200`**

Replaces prior **AA Large (3:1)** behavior for these rows; saturated primaries may fail until the user adjusts colors — acceptable per product decision.

### Lookup rules

Resolved color lookup matches existing [`ContrastScoreService.scorePalette`](apps/docs/src/app/services/contrast-score.service.ts) logic: named slots from `tokens.colors`, `tokens.contents`, and `derivedBase` for `base-200` / `base-300`.

## Track B — Non-text (WCAG 1.4.11-style)

**Assumption (must appear in TSDoc + user-facing docs):** Default UI borders are visually represented by the semantic **base ramp** — specifically **`base-300`** (resolved) adjacent to **`base-100`** or **`base-200`**. This matches how [`serializeToScopedBlock`](apps/docs/src/app/lib/theme/serialize-theme.ts) exposes `--kj-color-base-300` alongside surfaces.

**Edges (threshold 3:1)**

- `base-300` vs `base-100`
- `base-300` vs `base-200`

If the codebase later adds an explicit **border color** token, bump **`reportVersion`** and extend edges.

## Track C — Typography

**Extend `DraftTheme`** with theme-level size fields (exact names in implementation plan). Recommended shape:

- **`bodyRem`** — required default (e.g. `1`)
- **`smallRem`** — optional or defaulted (e.g. `0.875`)

Validate with Zod in [`DraftThemeSchema`](apps/docs/src/app/lib/theme/import-schema.ts); extend [`BUILT_IN_THEMES`](apps/docs/src/app/lib/theme/built-in-themes.ts) and [`deriveTokens`](apps/docs/src/app/lib/theme/derive-tokens.ts) / [`ResolvedTokens`](apps/docs/src/app/lib/theme/types.ts) so JSON import/export and CSS serialization stay consistent.

**Checks (advisory)**

- Warn if **body** CSS px equivalent falls below a **product** threshold (e.g. 16px at default root) — **not** a WCAG numeric requirement; document as UX policy.
- Optionally warn if `smallRem > bodyRem`.

Emit CSS custom properties for sizes **only if** a consuming contract exists in [`packages/themes`](packages/themes); otherwise report + draft JSON may suffice for v1.

## UI expectations

- Refactor **[`ContrastScorecard`](apps/docs/src/app/components/contrast-scorecard/)** to group rows (**Contrast · Non-text · Typography**) and bind summaries to **named** summary fields (no misleading “AAA %” without definition).
- **[`ThemeGeneratorSidebarComponent`](apps/docs/src/app/components/theme-generator-sidebar/)** gains compact controls for new typography fields when track **C** lands.

## Testing

- **Unit tests** on `buildThemeA11yReport` with canned OKLCH tokens — golden ratios, pass/fail counts, `reportVersion`.
- Update **[`contrast-score.service.spec.ts`](apps/docs/src/app/services/contrast-score.service.spec.ts)** and e2e ([`theme-generator.spec.ts`](apps/docs/e2e/theme-generator.spec.ts)) when outputs/copy change.

## References

- WCAG 2.1 [1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html), [1.4.6 Contrast (Enhanced)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-enhanced.html), [1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html)
- Existing enhancement context: [`2026-05-08-theme-generator-enhancement-design.md`](./2026-05-08-theme-generator-enhancement-design.md) (older scope; this spec **narrows** a11y to token-only report details)

## Self-review checklist

| Check | Result |
|-------|--------|
| Placeholders / TBD | None — thresholds and assumptions explicit |
| Internal consistency | Primary-on-base uses 7:1 throughout; non-text uses 3:1 |
| Scope | Single deliverable: token report + schema/UI follow-ups |
| Ambiguity | “Theme token checks” vs full audit called out |

---

**Next step after approval:** implementation plan only — no code until the user signs off on this document.
