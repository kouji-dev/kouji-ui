# Theme Generator Enhancement — Design

Date: 2026-05-08
Branch: `theme-generator-enhancement`
Status: Brainstormed, awaiting user review

## Goals

Enhance the docs theme generator (`apps/docs/src/app/pages/theme-generator`) to address three pain points the user identified:

1. **Hard to design palettes.** Picking 9 colors by hand is daunting.
2. **Save / share friction.** No shareable URL, no import flow.
3. **Accessibility blind spots.** No visible AAA verification.

A fourth area surfaced during brainstorming:

4. **Preview is too thin.** A live preview should exercise the full component library across multiple template surfaces, not a small swatch.

## Non-goals

- Public gallery, cloud sync, or any backend component.
- Component catalog tab (deferred — may revisit).
- Side-by-side theme comparison.
- Auto-fix suggestions for failing contrast pairs.
- Replacing or restructuring `ThemeDraftService`'s storage model — local persistence stays as is.

## High-level architecture

The existing actors stay:

- `ThemeDraftService` — single source of truth (signal-based draft, resolved tokens, save/load to localStorage).
- `ThemeGeneratorComponent` — page shell, exports.
- `ThemeGeneratorSidebarComponent` — token editor.
- `ThemeGeneratorPreviewComponent` — preview surface (becomes a tabs container).

New units, each isolated and testable on its own:

**Services (`apps/docs/src/app/services/`)**

- `palette-derive.service.ts` — pure: `deriveFromSeed(seed, opts) → ThemeColors`, `randomAccessiblePalette() → ThemeColors`. No DOM, no signals.
- `contrast-score.service.ts` — pure: `scorePalette(resolvedTokens) → ContrastReport`.
- `theme-url.service.ts` — encodes/decodes the draft to `location.hash`; effect-driven sync from draft to URL, init read from URL to draft.
- `theme-import.service.ts` — parses pasted/dropped JSON or CSS into a draft.

**Lib (`apps/docs/src/app/lib/theme/`)**

- `seed-swatches.ts` — ~40 curated, AAA-passing seed colors.
- `harmonies.ts` — pure color-theory math built on `culori` (analogous, complementary, triadic).

**UI (`apps/docs/src/app/components/`)**

- `seed-swatch-grid` — curated picker grid.
- `contrast-scorecard` — collapsible report panel (sidebar-docked).
- `theme-preview-tabs` — owns the 5 preview tabs and their lazy-loaded pages.

**Preview tab pages (`apps/docs/src/app/pages/theme-generator/preview-tabs/`)**

- `dashboard.ts`, `settings.ts`, `big-form.ts`, `search.ts`, `chat.ts`, plus shared `fixtures.ts`.

### Data flow

```
URL hash ──> ThemeUrlService ──┐
                                ▼
ImportService ──> ThemeDraftService (signal: draft)
                          │
                          ├─> css() → <style id=kj-draft-style> (existing)
                          ├─> ContrastScoreService.scorePalette() (computed)
                          ├─> ThemeUrlService writes #t=… on change (debounced effect)
                          └─> Preview tabs (read tokens via CSS vars only)

PaletteDerive (seed picker, swatch click, randomize)
   └─> draftService.setColors(...)
```

The draft service stays the single source of truth. New code is purely additive.

## Feature 1 — Palette generation

The sidebar's color section gains three palette inputs, listed in priority order.

### 1.1 Seed swatch grid

- ~40 hand-picked hexes in `seed-swatches.ts`. Each entry stores `{ hex, name, hueFamily, basePair: { light, dark } }`.
- Curation contract: every swatch passes WCAG AAA (7:1) when used as `primary` on its paired `base-100`, in both light and dark modes. Verified by a unit test fixture.
- Grid is grouped by hue family (red / orange / yellow / green / teal / blue / purple / pink / neutral).
- Click → `deriveFromSeed(hex, currentMode)` fills all 9 color slots.
- Currently active swatch shows a 2 px ring; if the seed matches no swatch the ring is absent.

### 1.2 Manual seed input

- The existing `primary` color picker is kept.
- Adjacent "Re-derive from primary" button runs the derivation explicitly (not auto, to respect free edits).

### 1.3 Randomize

- 🎲 button calls `randomAccessiblePalette()`:
  1. Pick a random swatch from the curated list.
  2. Pick a random harmony scheme (analogous / complementary / triadic).
  3. Pick a random light/dark base mode.
  4. Run `deriveFromSeed`.

### 1.4 Derivation algorithm

`deriveFromSeed(seed: hex, opts: { mode: 'light'|'dark', harmony?: 'analogous'|'complementary'|'triadic' }) → ThemeColors`

Pure function. Steps:

1. Convert seed → OKLCH via `culori`.
2. `base-100`: `oklch(98% 0.005 H)` (light) or `oklch(15% 0.01 H)` (dark), where H is the seed hue (subtle tint).
3. `base-200`, `base-300`: existing derived lightness steps.
4. `base-content`: `oklch(15% 0.02 H)` (light) or `oklch(95% 0.02 H)` (dark).
5. `primary` = seed.
6. `secondary` = analogous (+30° hue, similar L/C).
7. `accent` = harmony-dependent; default triadic (+120°).
8. `neutral` = desaturated seed (chroma → 0.02, L flipped to mid).
9. Semantic colors `info / success / warning / destructive` use canonical hues (220 / 145 / 70 / 25), with chroma blended toward seed chroma so they feel cohesive without losing semantic recognizability.
10. **No clamping.** Free edit always wins.

### 1.5 Dirty-slot preservation

- Draft service tracks a `dirtySlots: Set<ColorSlot>` — slots the user has manually edited since the last derive.
- "Re-derive from primary" preserves dirty slots by default. A small "Overwrite all" toggle in the button's tooltip provides the escape hatch.
- Clicking a swatch resets `dirtySlots` (full intentional regeneration).

## Feature 2 — AAA contrast scorecard

### 2.1 Pairs scored

| Foreground | Background | Target |
|---|---|---|
| `base-content` | `base-100` | AAA 7:1 |
| `base-content` | `base-200` | AAA 7:1 |
| `base-content` | `base-300` | AAA 7:1 |
| `primary-content` | `primary` | AAA 7:1 |
| `secondary-content` | `secondary` | AAA 7:1 |
| `accent-content` | `accent` | AAA 7:1 |
| `neutral-content` | `neutral` | AAA 7:1 |
| `info-content` | `info` | AAA 7:1 |
| `success-content` | `success` | AAA 7:1 |
| `warning-content` | `warning` | AAA 7:1 |
| `destructive-content` | `destructive` | AAA 7:1 |
| `primary` | `base-100` | AA-Large 3:1 (button/link on body) |
| `primary` | `base-200` | AA-Large 3:1 |

`*-content` slots use the resolved value (auto-derived or user-set).

### 2.2 Computation

- WCAG 2.1 relative-luminance formula on RGB (converted from OKLCH via `culori`).
- `scorePalette(resolvedTokens) → { pairs: PairResult[], summary: { aaaPass, aaPass, total, score } }`.
- Exposed as a `computed` signal on the draft service: `contrast = computed(() => scorePalette(resolvedTokens()))`.

### 2.3 UI — `kj-contrast-scorecard`

- Docked panel below the token editor in the sidebar; collapsible (`<details>`).
- Header: large `AAA <score>%` plus a small `AA <score>%` badge. `aria-live="polite"` so users hear updates.
- One row per pair: two color chips, ratio (`5.6:1`), badge (✓ AAA / ✓ AA / ✗).
- Failing pairs are non-blocking. Clicking a failing row scrolls to and focuses the offending token in the editor.
- Failure indicated by both icon (✗) and text label, never color alone (WCAG 1.4.1).
- `role="list"`, each pair `role="listitem"` with `aria-label="primary on base-100, contrast 5.6 to 1, fails AAA"`.

### 2.4 Out of scope (this iteration)

- Auto-fix actions per pair.
- Configurable target levels (AA vs AAA).

## Feature 3 — URL sync & import

### 3.1 URL hash format

`#t=<base64url(deflate-raw(JSON.stringify({ v: 1, d: <draft> })))>`

- `location.hash` (not query) — never reaches a backend, no Angular router conflicts.
- `CompressionStream('deflate-raw')` is a Web API — no new dependency.
- Schema is wrapped `{ v: 1, d: <draft> }`; decoder rejects unknown major versions and surfaces a toast.
- Fallback for jsdom/SSR (no `CompressionStream`): plain `base64url(JSON)`.

### 3.2 Sync direction

- **Draft → URL:** `effect()` in `theme-url.service.ts` watches `draftService.draft()`, debounced 250 ms, writes via `history.replaceState` (no history pollution).
- **URL → Draft:** on app init, if `#t=…` is present, decode → `draftService.load(payload)`. Replaces the whole draft.
- Loading a built-in or saved theme also rewrites the hash automatically through the same effect.

### 3.3 Copy-link button

- Added next to existing "Copy CSS" button.
- Copies `${location.origin}${location.pathname}#t=…` via `ClipboardService`. Toast: "Link copied".

### 3.4 Import

- `theme-import.service.ts` accepts:
  - **JSON** — output of `exportJson()`. Validate against v1 schema.
  - **CSS** — output of `serializeToScopedBlock`. Regex-extract `--kj-*` properties, map back to draft tokens. Lossy for unknown vars; warn on those.
- UI: "Import…" button next to "Copy CSS" / "Download". Opens a small dialog with a textarea and a file drop zone. Format detected by content (`{` → JSON, `:where(...)` → CSS).
- On success: load into draft, toast "Imported". URL hash auto-updates through the existing effect.

### 3.5 Failure modes

- Bad hash on init: ignore silently, log to console once, page renders normally with default draft.
- Bad import: dialog stays open, inline error references the offending line/field.

## Feature 4 — Preview tabs

### 4.1 Container — `theme-preview-tabs`

- Replaces `ThemeGeneratorPreviewComponent`'s body with a tab strip + outlet.
- Uses `KjTabs` from `@kouji-ui/components` (eats own dog food).
- Tab state stored in a query param: `?preview=dashboard|settings|form|search|chat`. Default `dashboard`. Restored alongside `#t=…` on URL load.
- Each tab is `@defer`-loaded so initial weight stays close to today's preview.
- Tabs are `role="tablist"` with arrow-key nav (provided by `KjTabs`). Tab panels get `tabindex="0"` and labelled headings (WCAG 1.3.1).

### 4.2 Five tab pages

| Tab | Components exercised | What it stresses |
|---|---|---|
| **Dashboard** | KPI cards, badge, avatar, progress-bar, stepper, alert, divider, button, dropdown-menu, list, skeleton, table-style list | base-100/200/300, primary/secondary, semantic colors, density |
| **Settings** | card sections, field, input, select, checkbox, radio, slider, color-picker, file-upload, password-input, button, dialog (confirm), toast | form contrast, focus rings, content slots, destructive button |
| **Big form** | stepper header, multi-section form, textarea, multi-select, date-picker, time-picker, input-mask, input-otp, number-input, validation alerts, accordion | large-type, error states, inline help, focus order |
| **Search** | command-palette (inline), input + kbd, drawer (filters), tag chips, list with avatars, pagination, empty-state, breadcrumb | overlay surfaces, hover/active, link color, focus traps |
| **Chat** | conversation sidebar, avatars, chat thread, message bubbles (own vs other), input-group with send, file-upload, popover (emoji), unread badge | bubble color choices, link in messages, dense interactive contrast |

Each page is a self-contained demo: hard-coded fixture data, no router-outlet inside, uses only `@kouji-ui/components`.

### 4.3 File layout

```
apps/docs/src/app/pages/theme-generator/
  preview-tabs/
    dashboard.ts / .html / .css
    settings.ts  / .html / .css
    big-form.ts  / .html / .css
    search.ts    / .html / .css
    chat.ts      / .html / .css
    fixtures.ts        # shared mock data
  preview/
    theme-generator-preview.ts   # becomes the tabs container
```

### 4.4 Theming

- All tab pages render inside the existing scoped `<style id="kj-draft-style">` block — they read tokens via the regular `--kj-*` CSS vars. No special wiring.
- Pages contain no hard-coded hex values; reviewer-checkable rule.

### 4.5 Performance

- `@defer (on viewport)` per tab; switching hydrates on demand.
- Each tab keeps DOM count under ~300 elements; no virtual scrolling needed.

### 4.6 Accessibility

- Each demo is a real navigable surface — Tab works, focus rings visible, labels associated.
- Dialog/drawer demos auto-close on Escape; preview must close any open overlay when the user switches tabs (so focus is never stuck off-screen).

## Testing

Unit (vitest, file-targeted per project rule):

- `palette-derive.spec.ts` — derivation determinism, hue offsets, dark/light base flip, dirty-slot preservation.
- `harmonies.spec.ts` — analogous/triadic/complementary math.
- `contrast-score.spec.ts` — known fixtures, AAA/AA verdict edges, full-palette report shape.
- `theme-url.spec.ts` — encode→decode round-trip, version rejection, malformed hash → empty result without throwing.
- `theme-import.spec.ts` — JSON happy path, CSS happy path, unknown-token warning, invalid input error.
- `seed-swatches.spec.ts` — every curated swatch passes AAA when used as primary on its paired base-100 (the curation contract).

Component (vitest + Angular TestBed):

- `seed-swatch-grid.spec.ts` — click → emit, active ring tracking.
- `contrast-scorecard.spec.ts` — given a known palette, renders expected pass/fail rows; row click focuses the target token.
- `theme-preview-tabs.spec.ts` — tab switching updates `?preview=`, defer blocks render on activation.

E2E (Playwright):

- Extend existing `theme-generator.spec.ts`:
  - Click a swatch → primary updates → URL hash contains `#t=`.
  - Reload with the captured hash → draft restored.
  - Open Import dialog → paste exported JSON → toast "Imported", preview reflects.
  - Switch through all 5 preview tabs → no console errors, key components visible per tab.
  - Edit primary to a known low-contrast value → scorecard shows ✗ AAA on `primary-content/primary` row.

## Rollout

- Single PR on this branch (`theme-generator-enhancement`).
- No feature flag — page is a docs/demo route, not customer prod traffic.
- Self-review checklist:
  - All five preview tabs render with each built-in theme without visible breakage.
  - Tab a11y review per `CLAUDE.md`.
  - Hash size with worst-case theme (all slots customized + custom fonts) under 2 KB.

## Open questions

None at brainstorm time. Decisions to revisit during plan/implementation:

- Whether `accent` defaults to triadic or complementary (currently triadic). Trivial to flip.
- Whether to add the components-catalog tab as a follow-up.
