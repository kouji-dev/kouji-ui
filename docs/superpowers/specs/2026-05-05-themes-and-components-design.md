# Themes & Components — Design Spec

**Date:** 2026-05-05
**Scope:** Two new packages (`@kouji-ui/themes`, `@kouji-ui/components`), full restructure of `apps/docs` into two parallel documentation tracks, deletion of the per-theme example files in core.
**Out of scope:** Theme generator UI (deferred to a separate spec). Visual regression tests (deferred).

---

## 1. Goal

Replace the current "themes baked into core, hand-written per-theme example files" pattern with a three-package architecture that mirrors daisyUI's mental model:

- `@kouji-ui/core` — headless directives (today). Behavior only, zero CSS.
- `@kouji-ui/components` — opinionated styled components built on top of core's directives. Structural CSS only, all colors/shapes/sizes resolved through CSS variables.
- `@kouji-ui/themes` — collection of theme stylesheets. Each theme fills in the CSS variables that `@kouji-ui/components` reads from. Active theme switched at runtime via `data-theme="<name>"` on the document root.

The docs site itself becomes a self-themed consumer: built with `@kouji-ui/components` + a theme from `@kouji-ui/themes`, with a global theme picker in the header.

---

## 2. Architecture

```
                              ┌───────────────────────┐
                              │   @kouji-ui/themes    │  CSS only
                              │   base.css + N themes │  data-theme="X"
                              └──────────┬────────────┘
                                         │ overrides
                                         ▼
┌───────────────────┐  hostDirectives  ┌───────────────────────┐
│  @kouji-ui/core   │ ◄──────────────  │ @kouji-ui/components  │  Angular components
│  KjButton, KjDialog│  composes        │ KjButtonComponent, …  │  + structural CSS
│  …directives only │                  │  reads var(--kj-*)    │
└───────────────────┘                  └──────────┬────────────┘
                                                  │ uses
                                                  ▼
                                       ┌───────────────────────┐
                                       │      apps/docs        │
                                       │  Two tracks: Headless │
                                       │  + Components         │
                                       └───────────────────────┘
```

Dependency arrows are strict: `themes` and `components` are independent of each other (themes don't know which components exist; components don't know which themes exist). `apps/docs` depends on all three. Core does NOT depend on either new package.

---

## 3. Token contract — three CSS layers

```css
@layer kj.base, kj.shared, kj.component;
```

The `@layer` declaration order pins the cascade. Components always override shared; shared always overrides base; users can override anything because their unlayered CSS wins over all `@layer` rules.

### 3.1 Base layer (`@kouji-ui/themes/base.css`)

Raw primitives. Single declaration on `:root`. Themes pull values from here. Components MUST NOT read base tokens directly.

Categories:

```css
@layer kj.base {
  :root {
    /* color palette — full ramps */
    --kj-base-gray-50  …  --kj-base-gray-950
    --kj-base-blue-50  …  --kj-base-blue-900
    --kj-base-red-50   …  --kj-base-red-900
    --kj-base-green-50 …  --kj-base-green-900
    --kj-base-yellow-50 … --kj-base-yellow-900
    /* + per-theme accent palettes added as themes need them */

    /* radii */
    --kj-base-radius-0:    0px;
    --kj-base-radius-1:    0.25rem;
    --kj-base-radius-2:    0.5rem;
    --kj-base-radius-3:    1rem;
    --kj-base-radius-full: 9999px;

    /* spacing — 8-step scale */
    --kj-base-space-0  …  --kj-base-space-8

    /* type */
    --kj-base-font-sans: system-ui, -apple-system, sans-serif;
    --kj-base-font-mono: 'JetBrains Mono', monospace;
    --kj-base-text-xs   …  --kj-base-text-2xl   /* 6-step scale */

    /* misc */
    --kj-base-border-1: 1px;
    --kj-base-border-2: 2px;
    --kj-base-transition-fast: 0.12s ease;
    --kj-base-transition-base: 0.2s ease;
  }
}
```

### 3.2 Shared layer (each theme file)

Semantic slots. Themes set these. Components read these. The token surface is fixed — every theme must define every token in this list, or the contract test fails.

```css
@layer kj.shared {
  [data-theme="<name>"] {
    /* color slots — 9 semantic + 4 base-content */
    --kj-color-base-100      /* page background */
    --kj-color-base-200      /* surface 1 — cards, panels */
    --kj-color-base-300      /* surface 2 — elevated surfaces, hover */
    --kj-color-base-content  /* default text on base */

    --kj-color-primary
    --kj-color-primary-content

    --kj-color-secondary
    --kj-color-secondary-content

    --kj-color-accent
    --kj-color-accent-content

    --kj-color-neutral
    --kj-color-neutral-content

    --kj-color-info
    --kj-color-info-content

    --kj-color-success
    --kj-color-success-content

    --kj-color-warning
    --kj-color-warning-content

    --kj-color-destructive
    --kj-color-destructive-content

    /* shape — grouped like daisy */
    --kj-radius-box       /* card, modal, alert */
    --kj-radius-field     /* button, input, select, tab */
    --kj-radius-selector  /* checkbox, toggle, badge */
    --kj-border           /* uniform border width */
    --kj-depth            /* 0 = flat, 1 = elevated (per-theme shadow style) */

    /* type */
    --kj-font-sans
    --kj-font-mono
    --kj-text-xs  …  --kj-text-2xl

    /* spacing */
    --kj-space-1  …  --kj-space-8

    /* motion */
    --kj-transition
  }
}
```

### 3.3 Component layer (each component's CSS file)

Component-specific knobs. Default to shared tokens. Themes can override at this layer to make per-component changes that don't affect anything else.

Concrete example — `packages/components/src/button/button.css`:

```css
@layer kj.component {
  .kj-button {
    /* component knobs — themes/users can override any of these */
    --kj-button-bg:           var(--kj-color-primary);
    --kj-button-fg:           var(--kj-color-primary-content);
    --kj-button-border-color: transparent;
    --kj-button-border-style: solid;
    --kj-button-border-width: var(--kj-border);
    --kj-button-radius:       var(--kj-radius-field);
    --kj-button-padding-x:    var(--kj-space-3);
    --kj-button-padding-y:    var(--kj-space-2);
    --kj-button-font:         var(--kj-font-sans);
    --kj-button-font-size:    var(--kj-text-sm);
    --kj-button-shadow:       none;
    --kj-button-shadow-active: none;
    --kj-button-translate-active: none;

    /* the only place raw var(--kj-button-*) is read */
    display: inline-flex;
    align-items: center;
    gap: var(--kj-space-2);
    background: var(--kj-button-bg);
    color: var(--kj-button-fg);
    border: var(--kj-button-border-width) var(--kj-button-border-style) var(--kj-button-border-color);
    border-radius: var(--kj-button-radius);
    padding: var(--kj-button-padding-y) var(--kj-button-padding-x);
    font: var(--kj-button-font-size) / 1.2 var(--kj-button-font);
    box-shadow: var(--kj-button-shadow);
    transition: var(--kj-transition);
    cursor: pointer;
  }

  /* variants — flip component tokens, not component CSS */
  .kj-button[data-variant="destructive"] {
    --kj-button-bg: var(--kj-color-destructive);
    --kj-button-fg: var(--kj-color-destructive-content);
  }
  .kj-button[data-variant="ghost"] {
    --kj-button-bg: transparent;
    --kj-button-fg: var(--kj-color-base-content);
    --kj-button-border-color: transparent;
  }
  .kj-button[data-variant="ghost"]:hover {
    --kj-button-bg: var(--kj-color-base-200);
  }
  .kj-button[data-variant="link"] {
    --kj-button-bg: transparent;
    --kj-button-fg: var(--kj-color-primary);
    --kj-button-padding-x: 0;
    --kj-button-padding-y: 0;
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  /* sizes */
  .kj-button[data-size="sm"] { --kj-button-padding-x: var(--kj-space-2); --kj-button-padding-y: 0.25rem; --kj-button-font-size: 0.8125rem; }
  .kj-button[data-size="lg"] { --kj-button-padding-x: var(--kj-space-4); --kj-button-padding-y: 0.625rem; --kj-button-font-size: 1rem; }

  /* states */
  .kj-button:hover  { --kj-button-bg: color-mix(in oklab, var(--kj-color-primary) 88%, black); }
  .kj-button:active { transform: var(--kj-button-translate-active); box-shadow: var(--kj-button-shadow-active); }
  .kj-button:focus-visible { outline: 2px solid var(--kj-color-primary); outline-offset: 2px; }
  .kj-button[aria-disabled="true"] { opacity: 0.45; cursor: not-allowed; }
}
```

**Override pathways exposed by this design:**

| Want | Override at |
|---|---|
| Recolor the entire site | base palette |
| Recolor everything that's "primary" | shared `--kj-color-primary` |
| Make ALL buttons square in *this* theme | component-layer override `[data-theme="X"] .kj-button { --kj-button-radius: 0 }` |
| Tweak just one button on one page | inline `style="--kj-button-radius: 0"` |
| Fork the entire button CSS | unlayered `.kj-button` rules in user CSS |

---

## 4. Theme catalog (initial set)

| Theme | Scheme | Notes |
|---|---|---|
| `light` | light | Clean neutral baseline, system fonts, minimal radii |
| `dark` | dark | Clean neutral baseline, mirror of `light` |
| `kouji` | dark | Brand: lime accent (#b8f500), JetBrains Mono, brutalist 0px radii. Port of current `default` |
| `retro` | light | Brutalist paper-yellow (#fef9c3), thick black borders, offset shadows. Port of current `retro` |
| `finance` | light | Corporate blue, soft shadows, rounded corners. Port of current `finance` |

Five themes is enough to prove the contract generalizes (3 light, 2 dark, very different visual identities) without over-investing in theme design. More themes — including everything daisy ships — come via the future theme generator.

### Switching mechanism

`data-theme="<name>"` attribute on `<html>` (or any subtree for scoped overrides). Implementation reuses the existing `ThemeService` (refactored — see §7). Selection persists to `localStorage['kj-theme']`. Falls back to `dark` on first visit (or OS-preferred dark/light if both flagged).

---

## 5. Component anatomy

Every styled component in `@kouji-ui/components` follows the same template:

### 5.1 File layout

```
packages/components/src/button/
  button.ts                      ← Angular component class
  button.css                     ← component-layer tokens + structural CSS
  button.spec.ts                 ← unit test
  button.example.ts              ← default usage example (Components track)
  button.sizes.example.ts        ← named example sections
  button.variants.example.ts
  button.with-icon.example.ts
  index.ts                       ← public exports
```

### 5.2 Component class

```ts
// button.ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjButton } from '@kouji-ui/core';

@Component({
  selector: 'button[kj-button], a[kj-button]',
  standalone: true,
  hostDirectives: [{
    directive: KjButton,
    inputs: ['kjVariant: variant', 'kjSize: size', 'kjDisabled: disabled'],
  }],
  host: { class: 'kj-button' },
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjButtonComponent {}
```

### 5.3 Usage

```html
<!-- headless: bring your own CSS -->
<button kjButton kjVariant="default" kjSize="md">Click</button>

<!-- styled: themed -->
<button kj-button variant="default" size="md">Click</button>
```

### 5.4 Multi-part components (Dialog, Menu, Tabs, Accordion, Select, …)

Each piece in the family gets its own component, mirroring the core directive family one-for-one. Same naming rules.

```html
<!-- headless -->
<button kjDialogTrigger>Open</button>
<div kjDialog>
  <h2 kjDialogTitle>Title</h2>
  <button kjDialogClose>Close</button>
</div>

<!-- styled — same shape, real elements -->
<button kj-dialog-trigger>Open</button>
<div kj-dialog>
  <h2 kj-dialog-title>Title</h2>
  <button kj-dialog-close>Close</button>
</div>
```

No opaque `<kj-dialog>` custom element — keeping native semantics is the principle that makes the headless directives work in the first place, and the styled wrapper preserves it. Whether `kj-dialog` attaches to `<div>`, `<dialog>`, or a CDK overlay is determined by the underlying directive, not by the styled wrapper.

### 5.5 Presentation-only components (no core counterpart)

Some components in `@kouji-ui/components` are pure presentation — no behavior, no headless directive in core. They exist ONLY in the components package. Examples expected in Wave 1:

| Component | What it is | Headless equivalent in core |
|---|---|---|
| `KjCardComponent` | A surface container (bg, border, radius, padding) | none — users compose with their own divs |
| `KjKbdComponent` | Styled `<kbd>` for keyboard shortcuts | none |
| `KjLinkComponent` | Styled `<a>` for inline links and nav links | none — `KjButton variant="link"` exists but is button-shaped |
| `KjSurfaceComponent` | Theme-aware section surface (used by docs nav, sidebar, etc.) | none |

These follow the same naming and structure as components with core counterparts, except they have no `hostDirectives` composition — the component's CSS class IS the entirety of its behavior.

```ts
@Component({
  selector: 'div[kj-card], section[kj-card], article[kj-card]',
  standalone: true,
  host: { class: 'kj-card' },
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCardComponent {}
```

The Headless track does NOT show these (nothing to document on the directive side); the sidebar's Headless grouping simply omits them.

---

## 6. Naming conventions

| | `@kouji-ui/core` | `@kouji-ui/components` |
|---|---|---|
| Class name | `KjButton` | `KjButtonComponent` (suffix kept per CLAUDE.md rule — `KjButton` already taken in sibling package) |
| File name | `button.ts` | `button.ts` (no suffix, per CLAUDE.md file rule) |
| Selector | `[kjButton]` (camelCase attribute) | `button[kj-button], a[kj-button]` (hyphenated attribute, real elements only) |
| Inputs | `kjVariant`, `kjSize`, `kjDisabled` | `variant`, `size`, `disabled` (forwarded via `hostDirectives`) |
| Host class | none | `.kj-button` |

Why two different attribute names: prevents Angular from dual-instantiating the directive (the styled component already composes it via `hostDirectives`). The user picks ONE attribute style per element.

Why selector restricted to real `<button>` / `<a>`: forces accessibility correctness. No `<kj-button>` element that needs `role="button"` and manual keyboard handling.

---

## 7. Documentation restructure

### 7.1 URL structure

```
/                              ← home (unchanged)
/docs                          ← landing — overview of both tracks
/docs/getting-started          ← unchanged
/docs/headless                 ← landing for the directive API surface
/docs/headless/<slug>          ← per-directive page
/docs/components               ← landing for the styled component library
/docs/components/<slug>        ← per-component page (URL preserved)
```

`/docs/components/<slug>` URLs are preserved (no broken external links). `/docs/headless/<slug>` URLs are additive. Both routes need entries in `app.routes.ts` AND in `app.routes.server.ts` (with `getPrerenderParams()` enumerating their respective slugs).

### 7.2 Sidebar

Two top-level groupings, same category structure inside each. Items per group come from whichever package contains a matching primitive:

```
🔍 Search                    ⌘K
─────────────────────────
Getting Started
All Components ─ /docs

▾ HEADLESS                   (always full set, ~20 items once core is full)
  ▾ Base
      Button     ─ /docs/headless/button
      Disabled
      FocusRing
  ▾ Inputs · Overlays · Navigation · Data · Display · A11y · Primitives

▾ COMPONENTS                 (grows wave by wave)
  ▾ Base
      Button     ─ /docs/components/button
  ▾ Inputs · Overlays · Navigation · …
```

In early waves the Components track has fewer items than Headless. The gap closes over Waves 1–3.

### 7.3 Per-page structure

| Section | Headless page | Components page |
|---|---|---|
| Heading | Directive selector + description | Component selector + description |
| API | Inputs / Outputs table (same `DocsTable` as today) | Props table (forwarded inputs from directive + any new component-only inputs) |
| Composition note | `hostDirectives` it composes (if any) | "Headless underneath" callout linking to `/docs/headless/<same>` |
| Examples | 1–2 "use the directive + bring your own CSS" examples | **N daisy-style sections** (one per `<comp>.<section>.example.ts` file). Each section is a labelled live preview + code panel. **No theme tabs** — every preview renders in the global active theme. |
| Source link | `packages/core/src/<comp>/` on GitHub | `packages/components/src/<comp>/` on GitHub |

Section title for Components-track examples derives from the filename: `button.with-icon.example.ts` → "With Icon". TSDoc tag `@doc-section "Custom title"` overrides if needed.

### 7.4 Theme selector

- **Position:** top header of the docs layout (right-aligned, in the same horizontal row as the logo + nav).
- **Control:** dropdown listing the 5 themes from §4. Each row has a 3-dot color swatch (`--kj-color-base-100` / `--kj-color-primary` / `--kj-color-accent`) next to the name.
- **Behavior:** selection writes `data-theme="<name>"` to `<html>` and persists to `localStorage['kj-theme']`. First-visit fallback: `dark` (or OS-preferred mapping if both `light` and `dark` are flagged as the pair).
- **Replaces:** the existing sidebar sun/moon button (deleted). The existing per-example theme tabs in `code-preview` (deleted).

---

## 8. Migration of existing artifacts

| File / directory | Fate | Reason |
|---|---|---|
| `packages/core/src/styles/docs-themes.css` | **deleted** | Themes now live in `@kouji-ui/themes` |
| `packages/core/src/<comp>/<comp>.example.ts` | **kept** | Used by Headless track |
| `packages/core/src/<comp>/<comp>.{finance,retro,sizes}.example.ts` | **deleted** | Per-theme variants obsoleted by runtime theme switch |
| `packages/core/src/example-components.ts` | **updated** | Drop finance/retro entries from the registry |
| `packages/core/src/examples/` (contains empty `button/` placeholder) | **deleted** | Unused pattern that was never expanded |
| `apps/docs/src/app/components/code-preview/*` | **refactored** | Single preview, no theme tabs |
| `apps/docs/src/app/components/docs-sidebar/*` | **refactored** | Sun/moon button removed; sidebar restructured for two top groupings |
| `apps/docs/src/app/services/preview-theme.ts` | **deleted** | Theme is global now |
| `apps/docs/src/app/services/theme.service.ts` | **refactored** | Toggle becomes named-theme picker; persists to localStorage; writes `data-theme` |
| `apps/docs/src/lib/docs-extractor.ts` | **updated** | Scans both `packages/core/src/**/*.example.ts` AND `packages/components/src/**/*.example.ts`; tags each result with track (`headless` / `components`) |
| `apps/docs/src/app/app.routes.ts` | **updated** | Add `/docs/headless/:slug` route |
| `apps/docs/src/app/app.routes.server.ts` | **updated** | Add `/docs/headless/:slug` prerender entry with `getPrerenderParams()` |
| `apps/docs/src/styles.css` | **refactored** | Replace custom design tokens with `@kouji-ui/themes` import; keep only docs-app-specific structural CSS |
| `angular.json` | **updated** | Two new `projects` entries (`kj-themes`, `kj-components`) mirroring the existing `kj-core` build/test/lint configuration |
| `.changeset/config.json` | **unchanged** | New packages are publishable via existing changesets workflow; only `docs` stays in `ignore` |

---

## 9. Package layouts

### 9.1 `packages/themes/`

```
packages/themes/
  src/
    base.css                  // raw primitives
    themes/
      light.css
      dark.css
      kouji.css
      retro.css
      finance.css
    index.css                 // imports base + all themes (default barrel)
  package.json                // name: @kouji-ui/themes
  ng-package.json             // ng-packagr config — exposes css as assets
```

Consumer experience:

```ts
import '@kouji-ui/themes';                            // grabs base + all themes (~12 KB CSS)

// or tree-shaken:
import '@kouji-ui/themes/base.css';
import '@kouji-ui/themes/themes/dark.css';
import '@kouji-ui/themes/themes/kouji.css';
```

### 9.2 `packages/components/`

```
packages/components/src/
  button/
    button.ts
    button.css
    button.spec.ts
    button.example.ts
    button.sizes.example.ts
    button.variants.example.ts
    index.ts
  input/
    …
  …
  public-api.ts
packages/components/
  package.json                // name: @kouji-ui/components
  ng-package.json
  tsconfig.lib.json
  tsconfig.lib.prod.json
  tsconfig.spec.json
```

Mirrors `packages/core/` structure, including the existing test/build/lint configs in `angular.json`.

---

## 10. Testing strategy

| Layer | Test type | Tool | What it asserts |
|---|---|---|---|
| Tokens / themes | Contract test | Vitest + jsdom | Each theme block under `[data-theme="X"]` defines every token in the shared-layer contract (no missing slots) |
| Themes | Cascade test | Vitest + jsdom | Switching `data-theme` on root re-resolves component-layer tokens (e.g., `.kj-button` reads new `--kj-color-primary` after switch) |
| Components | Unit | Vitest | `hostDirectives` composition forwards inputs correctly; host class applied; rendered DOM matches |
| Components | Accessibility | Same WCAG AAA gate enforced today | Per-component a11y review on every change, per existing CLAUDE.md rule |
| Docs | E2E | Playwright | Theme selector switches `data-theme`; selection persists across reloads; sidebar tracks render correct items per package |
| Docs | Visual regression | **Deferred** | Per-theme × per-component snapshots — too noisy for v1 |

The contract test is the cheapest insurance against "I added a new component token but forgot to set it in theme X". Implementation:

```ts
// in packages/themes/src/themes.spec.ts
const REQUIRED_SHARED_TOKENS = [
  '--kj-color-base-100', '--kj-color-base-200', '--kj-color-base-300', '--kj-color-base-content',
  '--kj-color-primary', '--kj-color-primary-content',
  /* …full list… */
  '--kj-radius-box', '--kj-radius-field', '--kj-radius-selector',
  '--kj-border', '--kj-depth',
  '--kj-font-sans', '--kj-font-mono',
  /* … */
];
const THEMES = ['light', 'dark', 'kouji', 'retro', 'finance'];

for (const theme of THEMES) {
  for (const token of REQUIRED_SHARED_TOKENS) {
    test(`${theme} defines ${token}`, () => {
      document.documentElement.setAttribute('data-theme', theme);
      expect(getComputedStyle(document.documentElement).getPropertyValue(token).trim()).not.toBe('');
    });
  }
}
```

E2E gate per the global rule in `~/.claude/CLAUDE.md`: every new functionality must have an E2E test that runs and passes. Theme switching, persistence, and sidebar track rendering all get Playwright coverage.

---

## 11. Implementation waves

Each wave is a vertical slice that's independently testable and shippable. The branch `feat/themes-and-components` accumulates all waves; PR merges when all of waves 0–3 are done (Wave 4 is a separate spec/PR).

| Wave | Scope | Components added | Themes added | Docs progress |
|---|---|---|---|---|
| **0 — Foundation** | Scaffolding + contract validation. Both new packages exist; build/test/lint wired. | `KjButtonComponent` only | `dark` only | `/docs/components/button` works; theme selector wired but only one option |
| **1 — Docs shell** | Unblock the docs UI rewrite. | + Input, Card/Surface, Link, Kbd (~5 more) | + `light` | Docs nav/header/sidebar rebuilt with components; sidebar split into two tracks; both tracks live for the items shipped so far |
| **2 — Tier 1** | The user-facing batteries. | + Checkbox, Radio, Toggle, Badge, Avatar, Dialog (+family), Tooltip, Popover, Menu (+family), Toast, Tabs (+family) | + `kouji`, `retro`, `finance` (full 5-theme set) | Components track lights up per item as added |
| **3 — Heavies** | Parity. | + Table, Form, Accordion, Chart, Select, Primitives | — | Components track is full parity with Headless |
| **4 — Generator** | Theme builder UI. | — | (user themes, runtime-defined) | `/docs/theme-generator` route, exports CSS — **separate spec, separate PR** |

Waves 0–3 ship in this PR. Wave 4 is its own design spec written after the contract has been proven across waves 0–3 (the contract is what the generator generates, so it must be stable first).

### 11.1 Why this order

- Wave 0 is the proof-of-contract. If the button + dark theme don't compose correctly through the three CSS layers, every other component will inherit the same bug. Cheap to detect, expensive to find later.
- Wave 1 gives the docs UI itself something to consume — needed before we can refactor the docs layout to be theme-driven.
- Wave 2 is the longest wave by item count; each component is small. Order within Wave 2 should prioritize the components that demos in current Tier-1 docs pages.
- Wave 3 contains the visually heavy components (Table, Chart). They're the highest risk for the token contract — if they exposes gaps, we update §3.2 and back-fill themes. This is why they come after the lighter Tier-1 items, where contract problems are cheaper to fix.

---

## 12. Open questions

None blocking. Items deliberately deferred:

1. **Theme generator** — its own spec after Wave 3.
2. **Visual regression** — its own spec after Wave 3 (or skipped if E2E + a11y gates prove sufficient).
3. **Theming the docs prose / Markdown** — assumed to use base-content + neutral tokens; revisit during Wave 1 docs-shell rewrite if it doesn't cover all needs.
4. **CSS framework dependency** — current docs has no Tailwind/etc.; new components are pure CSS. If `@kouji-ui/components` later adopts Tailwind, that's a separate decision.

---

## 13. Success criteria

- `pnpm build` produces all three packages without errors.
- A test app importing `@kouji-ui/components` + `@kouji-ui/themes` renders a styled `<button kj-button>` that restyles when `data-theme` changes — without any rebuild.
- Theme contract test passes for all 5 themes.
- Docs site at `kouji-ui.onrender.com` renders both tracks; theme selector works; selection persists.
- All existing core tests still pass.
- No regression in the existing `KjButton` directive's spec or behavior.
