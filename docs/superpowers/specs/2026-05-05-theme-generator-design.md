# Theme Generator Design

**Status:** Approved (2026-05-05)
**Owner:** kouji-ui
**Affects:** `apps/docs`, `packages/components`

---

## 1. Goal

Build a `/theme-generator` page where users author custom themes (forking built-ins or starting blank), preview them in a scoped pane, save multiple drafts to localStorage, and export them as CSS or JSON. Includes a sidebar nav rework that adds top-level pills `[Docs] [Theme Generator]`, replacing the implicit "docs is the only destination" assumption.

The generator outputs the same shape of CSS our shipped themes do — a single `[data-theme="<name>"] { --kj-*: ...; }` block — so consumers paste it into any global stylesheet and `data-theme` attribute switching just works.

## 2. Scope

**In scope (v1):**
- Top-level route `/theme-generator` reachable via sidebar pill.
- Sidebar rework: nav pills + per-pill section content.
- Editor for 9 color slots (with auto-derived `*-content` and `base-200`/`base-300`), shape controls, font controls (curated 20-font Google list), motion control.
- Scoped live preview (does NOT re-theme the rest of the page).
- Multiple named saved themes in localStorage with save/load/delete + JSON import/export.
- `kj-input` enhancement: new `type` input (`'text' | 'email' | 'password' | 'search' | 'url' | 'tel' | 'number' | 'color'`).

**Out of scope (v1):**
- Custom OKLCH color wheel (using native `<input type="color">`).
- Live Google Fonts API search (using curated list).
- Multi-window collaboration / cloud sync / theme marketplace.
- Editing `base-200`/`base-300` directly (auto-derived from `base-100`).
- Playwright E2E (no harness yet; deferred).

## 3. Architecture & Data Flow

**New top-level concept: "draft theme"** — a user's in-progress edit, held in a service and applied to a scoped wrapper via `<div data-theme="custom-draft">`. CSS custom property cascade does the rest. Never touches `<html data-theme>`, so the rest of the page stays in the user's globally selected theme.

```
[Sidebar: pick built-in or saved] → ThemeDraftService.loadFork() / loadSaved()
[Editor controls] → mutate draft signal → injects <style id="kj-draft-style">
[Preview wrapper] → data-theme="custom-draft" → cascades draft tokens
[Save] → persists draft to localStorage (kj-custom-themes)
[Export] → serialize draft to scoped CSS block or JSON
```

**Affected packages:**
- `apps/docs` — new route, sidebar pill rework, `ThemeDraftService`, `FontLoaderService`, generator page + preview component.
- `packages/components` — `kj-input` gains `type` input.
- `packages/themes` — no changes.

## 4. Sidebar Rework (Nav Pills)

**New structure:**
```
[logo] [theme-picker] [close]
[NAV PILLS: Docs | Theme Generator]   ← new
[search]
{ section content driven by active pill }
```

The pills are a 2-button group with `role="tablist"`. Each pill is `[role="tab"][aria-selected]`. Active pill is determined from the URL: `/docs/*` → "Docs", `/theme-generator*` → "Theme Generator".

**Section content per pill:**
- **Docs** → existing behavior unchanged (top-level menu OR drilled track tree).
- **Theme Generator** → two collapsible groups:
  - **Built-in themes** — list of `kouji`, `dark`, `light`, `retro`, `cyberpunk`, `corporate`. Click → `loadFork(name)` (new draft seeded with that theme's tokens).
  - **My themes** — list of saved customs from localStorage; each row has hover-revealed edit/delete icons. Click → `loadSaved(name)`. Plus `[+ New theme]` (blank draft) and `[Import]` (JSON file picker).

**State model:** `view: SidebarView = 'menu' | 'headless' | 'components' | 'generator'` — adds `'generator'` to the existing union. Driven by route subscription so deep-linking works.

**Mobile:** pills wrap to two rows if sidebar narrows below ~220px.

**Accessibility (WCAG 2.1 AAA target):**
- Pills use proper tab semantics: `role="tablist"`, `role="tab"`, `aria-selected`.
- Arrow-key navigation between pills (Left/Right). Enter/Space activates.
- On entering Theme Generator section, default focus lands on the first sidebar group.

## 5. Theme Generator Page Layout (100vh)

**Route:** `/theme-generator` — single component `ThemeGeneratorComponent`. URL doesn't track which theme is being edited; that's purely service state. Reloading restores the last draft from localStorage.

```
┌─ docs-layout (grid-template-columns: 220px 1fr) ────────────────────────┐
│  sidebar    │  main (height: 100vh; overflow: hidden)                   │
│  (existing) │  ┌── sticky bar (h: 56px) ──────────────────────────────┐ │
│             │  │ [name input]  [Reset] [Save] [Export ▾]              │ │
│             │  └──────────────────────────────────────────────────────┘ │
│             │  ┌── editor (calc(100vh - 56px); cols: 380px 1fr) ──────┐│
│             │  │ ┌─ controls (overflow-y:auto) ┐ ┌─ preview pane ────┐││
│             │  │ │ ▾ Colors (9 swatches)       │ │ data-theme="...." │││
│             │  │ │ ▾ Shape  (radius/border)    │ │ overflow-y: auto  │││
│             │  │ │ ▾ Type   (font dropdowns)   │ │ fixed sample      │││
│             │  │ │ ▾ Motion (transition)       │ │ (see §7)          │││
│             │  │ └─────────────────────────────┘ └───────────────────┘││
│             │  └──────────────────────────────────────────────────────┘│
└─────────────┴──────────────────────────────────────────────────────────┘
```

**Sticky top bar:**
- **Name input** — `<kj-input>` for draft theme name. Validation: blocks built-in names (red border + helper text), trims whitespace, max 32 chars, kebab-case enforced (auto-transforms spaces to `-`).
- **[Reset]** — discards in-memory edits, reloads originally-loaded theme tokens. Confirmation only if there are unsaved changes.
- **[Save]** — writes/overwrites the draft to localStorage under its current name. Disabled when name is invalid. Label is `Save` for new themes, `Save changes` when overwriting an existing saved theme.
- **[Export ▾]** — dropdown menu: `Copy CSS`, `Download .css`, `Export JSON`.

**Controls panel (left, 380px wide, scrollable):** four collapsible groups.
- **Colors** — 9 main slots as `<kj-input type="color">` swatches. Each slot also shows its computed `*-content` color in a small swatch beside it; clicking the small swatch unlocks manual override (otherwise auto-derived).
- **Shape** — `<input type="range">` for `--kj-radius-{box,field,selector}` (0–32px), `--kj-border` (0/1/2/4px), `--kj-depth` (0/1/2).
- **Type** — `<select>` for `--kj-font-{sans,mono,display}` (curated 20-font list).
- **Motion** — `<select>` for `--kj-transition` (fast/base/slow/none).

**Color-scheme detection:** the draft style block also sets `color-scheme: light` (or `dark`) computed from the lightness of `--kj-color-base-100` so native form controls inside the preview render correctly.

## 6. Draft State, Derivation & Style Injection

### Draft model

```ts
interface DraftTheme {
  name: string;                                    // 'my-cool-theme'
  colors: Record<ColorSlot, string>;               // OKLCH strings
  contentOverrides: Partial<Record<ContentSlot, string>>;
  shape: { radiusBox: number; radiusField: number; radiusSelector: number;
           border: number; depth: number };
  type:  { fontSans: string; fontMono: string; fontDisplay: string };
  motion: { transition: string };
}

type ColorSlot   = 'base-100' | 'primary' | 'secondary' | 'accent' | 'neutral'
                 | 'info' | 'success' | 'warning' | 'destructive';
type ContentSlot = `${Exclude<ColorSlot,'base-100'>}-content` | 'base-content';
```

`base-200` and `base-300` are auto-derived from `base-100` (not user-editable in v1).

### Derivation rules (pure functions)

- **`*-content`** — given a slot color, parse OKLCH lightness `L`. If `L > 60` (light slot), content = `oklch(15% 0.02 H)`; else content = `oklch(98% 0.02 H)`. Hue inherited from the slot for subtle tinting. Manual `contentOverrides` value (if present) wins.
- **`base-200`/`base-300`** — clone `base-100`, shift lightness by ±0.04 / ±0.08. Direction depends on whether base is light or dark.

### `ThemeDraftService` (Angular, signal-based)

```ts
@Injectable({ providedIn: 'root' })
class ThemeDraftService {
  readonly draft = signal<DraftTheme>(BLANK_DRAFT);
  readonly resolvedTokens = computed(() => deriveTokens(this.draft()));
  readonly css = computed(() => serializeToScopedBlock('custom-draft', this.resolvedTokens()));

  loadFork(themeName: BuiltInName): void;        // seeds draft from BUILT_IN_THEMES
  loadSaved(name: string): void;                 // loads from localStorage
  resetToOriginal(): void;
  save(): { ok: true } | { ok: false; reason: 'name-taken' | 'reserved' };
  delete(name: string): void;
  list(): SavedTheme[];
}
```

### Style injection

An effect in `ThemeGeneratorComponent` watches `draftService.css` and writes the result into a single `<style id="kj-draft-style">…</style>` tag in `<head>`:

```css
[data-theme="custom-draft"] {
  --kj-color-base-100: oklch(98% 0.002 247);
  --kj-color-base-200: oklch(94% 0.002 247);   /* derived */
  /* …all 31 tokens… */
}
```

Because shipped themes use the same selector pattern, no per-component code changes are needed; cascade does the work.

**Cleanup:** `OnDestroy` removes the `<style>` tag, so the draft never leaks across routes.

### Source of truth for built-ins

A small generated TypeScript constant `BUILT_IN_THEMES` (parsed at build time from `packages/themes/src/themes/*.css`) gives the editor canonical token values for each shipped theme without runtime CSS fetching. Generated by a tiny build script (`apps/docs/scripts/generate-built-in-themes.ts`) that postcss-parses the theme files, called from a `prebuild` hook in `apps/docs/package.json` and committed to `apps/docs/src/lib/built-in-themes.generated.ts`.

## 7. Preview Pane Contents

Fixed sample page rendering inside `<div data-theme="custom-draft">`. Sections stack vertically; pane scrolls internally.

```
[Hero]            H1 (font-display) + body (font-sans) + inline <code> (font-mono)
[Buttons grid]    every variant × every size, plus a row in forced :hover state
[Form card]       <kj-card> with text/email/color inputs + submit/cancel buttons
[Callouts]        info / success / warning / destructive
[Inline elements] <kj-link>, <kbd>⌘</kbd><kbd>K</kbd>, muted neutral text
[Surface stack]   nested panels at base-100/200/300 + border samples
```

**Why fixed (not user-checklist):** the sample is curated to surface every token at least once. Letting users hide sections risks hiding contrast issues (e.g., unreadable warning color).

**Forced hover/focus:** a `.is-force-hover` / `.is-force-focus` utility class duplicates the relevant `&:hover` / `&:focus` rules so the user can judge those states without chasing the cursor. Applied to one button row and one input.

**No interactivity:** preview-pane action handlers are no-ops (`pointer-events: none` on actionables; form submits prevented). Stops accidental triggers when the user drags a slider over a button.

Lives in a dedicated `ThemeGeneratorPreviewComponent` so we can iterate on the sample independently.

## 8. Export & Persistence

### Export

**[Copy CSS]** — copies the same scoped block currently injected into `<head>`, with the user's chosen name substituted for `custom-draft`:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');

[data-theme="my-cool-theme"] {
  --kj-color-base-100: oklch(98% 0.002 247);
  /* …all 31 tokens… */
}
```

The `@import` line for any used Google Font is prepended automatically. Toast confirms: "CSS copied — paste into your global stylesheet."

**[Download .css]** — same content, downloaded as `<theme-name>.kj-theme.css` via a Blob URL.

**[Export JSON]** — serializes the full `DraftTheme` object (raw editor state). Filename `<theme-name>.kj-theme.json`. Used for re-importing or sharing.

**Import JSON** — `[Import]` button next to `+ New theme` in the sidebar. Validates against a Zod schema; rejects malformed files with a clear error toast.

### Persistence

```ts
// localStorage key: 'kj-custom-themes'
type StoredThemes = { version: 1; themes: SavedTheme[] };
type SavedTheme = DraftTheme & { savedAt: number };
```

Single key, JSON-serialized. Versioned envelope so we can migrate later.

The currently-loaded draft (saved or unsaved) is also mirrored to `'kj-draft-current'` so reloading the page restores in-progress work.

**Save flow:**
- Reserved name → button disabled, helper text "Built-in name reserved".
- Existing own name → button label `Save changes`, persists immediately.
- New name → button label `Save`, persists immediately.

**Delete flow:** trash icon on hover in sidebar. Click opens an inline confirm (two stacked buttons replacing the row — no modal). 5-second undo toast after delete.

## 9. Components Package Changes

### `kj-input` — new `type` input

```ts
type KjInputType = 'text' | 'email' | 'password' | 'search' | 'url'
                 | 'tel' | 'number' | 'color';

@Component({ selector: 'kj-input', /* … */ })
export class KjInput {
  readonly type = input<KjInputType>('text');
  // existing inputs (value, placeholder, disabled) unchanged
}
```

Template forwards `[attr.type]="type()"` to the inner `<input>`. Host gets `[attr.data-type]="type()"` for CSS targeting. The headless `kjInput` directive in `@kouji-ui/core` is verified during implementation to pass through arbitrary `type` values; if it constrains the value, a corresponding (non-breaking) widening lands in the same task.

CSS adds:
```css
.kj-input[data-type="color"] {
  inline-size: 44px;
  block-size: 32px;
  padding: 2px;
  cursor: pointer;
}
```

### Docs example

A new `input.color.example.ts` ships with the input component to exercise the new type. Keeps the docs auto-generation pipeline producing complete coverage.

## 10. Font Loading (Curated 20 Google Fonts)

```ts
// apps/docs/src/app/services/font-loader.service.ts
const CURATED_FONTS = [
  { id: 'inter',     family: 'Inter',           category: 'sans' },
  { id: 'syne',      family: 'Syne',            category: 'display' },
  { id: 'jetbrains', family: 'JetBrains Mono',  category: 'mono' },
  { id: 'geist',     family: 'Geist',           category: 'sans' },
  // …16 more (Roboto, Manrope, Outfit, IBM Plex Sans/Mono/Serif,
  //  Playfair Display, Lora, Fraunces, Space Grotesk/Mono, etc.)
] as const;
```

`FontLoaderService.ensureLoaded(id)` injects `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?...">` exactly once per font. Already-loaded fonts are no-ops. Exported CSS includes the matching `@import` line at the top of the block so consumers get the font automatically when they paste the export.

## 11. Routing

```ts
// apps/docs/src/app/app.routes.ts — addition (BEFORE the existing '**' wildcard)
{
  path: 'theme-generator',
  loadComponent: () => import('./pages/theme-generator/theme-generator')
    .then(m => m.ThemeGeneratorComponent),
}
```

No prerender params (single page). Existing `**` redirect to `''` stays at the end of the array; the new route must be inserted before it so route matching catches `/theme-generator` first.

## 12. Testing Strategy

### `packages/themes`
No changes; existing contract test still covers shipped themes.

### `packages/components` — `kj-input`
- Renders `<input type="color">` when `type()` returns `'color'`.
- `data-type` host attribute mirrors the input value.
- All existing types continue to render correctly.
- A11y: doesn't emit `placeholder` when `type === 'color'`.

### `apps/docs` — `ThemeDraftService` (pure-logic unit tests)
- `loadFork('kouji')` seeds draft with kouji's tokens (snapshot vs `BUILT_IN_THEMES.kouji`).
- `loadSaved('foo')` reads from mocked localStorage.
- `save()` blocks reserved names → `{ ok: false, reason: 'reserved' }`.
- `save()` overwrites own theme with same name → `{ ok: true }`.
- `delete()` removes the named theme; falls back to blank draft if it was the active one.
- `resolvedTokens` derivation:
  - light slot (`L > 60`) → content is dark (`oklch(15% …)`).
  - dark slot (`L ≤ 60`) → content is light (`oklch(98% …)`).
  - Manual `contentOverrides` value wins over derivation.
  - `base-200`/`base-300` are derived ±0.04/±0.08 lightness, direction flipping based on whether base is light or dark.
- `css` output is a syntactically valid CSS rule and contains every required token (postcss check, mirrors `themes.spec.ts`).

### JSON import schema
- Valid file round-trips through export → import unchanged.
- Malformed file rejected with clear error.

### Sidebar pills (component test)
- Pills render with `role="tab"` + correct `aria-selected` for current URL.
- Arrow-key navigation moves focus between pills.
- Enter/Space activates the pill (router-link click).
- "Theme Generator" pill section shows the two collapsible groups.

### Generator page integration test (`@testing-library/angular`)
- Loading the page seeds the draft from `'kj-draft-current'` if present, else blank.
- Editing a color picker mutates the draft signal and updates `<style>` tag content.
- Preview wrapper has `data-theme="custom-draft"` and a token resolves to the expected oklch via `getComputedStyle`.
- Clicking "Reset" reverts the draft to originally-loaded source.
- Navigating away removes `<style id="kj-draft-style">`.

### Manual smoke checklist
- Switch global theme while on generator → only chrome re-themes; preview stays on draft.
- Edit color → font/shape/motion controls reflect immediately.
- Save → reload → saved theme is in sidebar list.
- Export CSS → paste into another tab's `<style>` → applying `data-theme="my-name"` works.

### E2E
Deferred (no Playwright harness yet).

## 13. Accessibility (WCAG 2.1 AAA)

- Pills: `role="tablist"` + `role="tab"` + `aria-selected` + arrow-key roving tabindex.
- Color swatches: `<kj-input type="color">` is keyboard-operable natively; each swatch has an associated `<label>` with the slot name (e.g., "Primary color").
- Sticky bar buttons: minimum 44×44px touch target (WCAG 2.5.5).
- Toast notifications use `aria-live="polite"`.
- Theme name validation errors announced via `aria-describedby` linking the input to the helper text.
- Sidebar group disclosure buttons retain existing `aria-expanded` pattern.
- Generator page tab order: name input → action buttons → controls panel → preview (in DOM order).

## 14. Migration / Rollout

No breaking changes. Existing `/docs/*` routes and behaviors unchanged. Sidebar pills appear immediately for all users; existing CSS keeps working because the pills are a new element above the existing search button.

Changeset:
- `@kouji-ui/components` → `minor` (new `type` input on `kj-input`).
- No version bump for `@kouji-ui/themes` or `@kouji-ui/core`.

## 15. File Inventory

**New files (`apps/docs`):**
- `src/app/pages/theme-generator/theme-generator.{ts,html,css}` — generator page shell
- `src/app/pages/theme-generator/preview/theme-generator-preview.{ts,html,css}` — fixed sample
- `src/app/services/theme-draft.service.ts` — draft state + derivation + persistence
- `src/app/services/font-loader.service.ts` — Google Fonts loader
- `src/app/lib/derive-tokens.ts` — pure derivation functions
- `src/app/lib/serialize-theme.ts` — DraftTheme → scoped CSS block
- `src/app/lib/import-export-schema.ts` — Zod schema for JSON import
- `src/app/lib/font-catalog.ts` — `CURATED_FONTS` constant
- `src/lib/built-in-themes.generated.ts` — generated; built-in token snapshots
- `scripts/generate-built-in-themes.ts` — build-time generator for the above
- `src/app/services/theme-draft.service.spec.ts`
- `src/app/lib/derive-tokens.spec.ts`
- `src/app/lib/serialize-theme.spec.ts`

**Modified (`apps/docs`):**
- `src/app/app.routes.ts` — add `/theme-generator` route
- `src/app/components/docs-sidebar/docs-sidebar.{ts,html,css}` — add nav pills + per-pill section
- `package.json` — `prebuild` hook calls `generate-built-in-themes.ts`

**Modified (`packages/components`):**
- `src/input/input.{ts,html,css}` — add `type` input + `data-type` host attr + color CSS
- `src/input/input.color.example.ts` — new docs example
- `src/input/input.spec.ts` — new test cases for color type

**Changeset:**
- `.changeset/theme-generator.md` — minor bump for `@kouji-ui/components`.
