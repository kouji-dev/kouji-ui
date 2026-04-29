# kouji-ui Design Spec

**Date:** 2026-04-29  
**Status:** Approved

---

## Overview

`kouji-ui` is an open-source Angular 21 UI library published to npm. It follows a two-layer architecture: a headless, zero-CSS core of directives (`@kouji-ui/core`) and a Tailwind v4 styled implementation (`@kouji-ui/ui`). All directive selectors and class names use the `kj` prefix. Users can consume the styled implementation directly or use the headless core with any CSS approach they prefer.

---

## Monorepo Structure

```
kouji/
├── packages/
│   ├── core/                   ← @kouji-ui/core  (headless, zero CSS, directives only, `kj` prefix)
│   │   ├── src/
│   │   │   ├── primitives/     ← shared behavior directives (disabled, focus-ring, etc.)
│   │   │   ├── button/
│   │   │   ├── input/
│   │   │   ├── select/
│   │   │   ├── dialog/
│   │   │   ├── tooltip/
│   │   │   ├── popover/
│   │   │   ├── menu/
│   │   │   ├── toast/
│   │   │   ├── table/
│   │   │   ├── form/
│   │   │   ├── tabs/
│   │   │   ├── accordion/
│   │   │   ├── chart/
│   │   │   ├── a11y/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── ui/                     ← @kouji-ui/ui  (Tailwind v4 styled implementation)
│       ├── src/
│       └── styles/
│           └── kj.css          ← Tailwind v4 @theme tokens entry point
│
├── apps/
│   └── docs/                   ← Angular docs + landing page, deployed to Render
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**Tooling:** Turborepo + pnpm workspaces  
**Peer dependencies:** `@kouji-ui/core` → `@angular/core ^21`; `@kouji-ui/ui` → `@kouji-ui/core`, `tailwindcss ^4`

---

## Architecture

### Two-Layer Design

| Layer | Package | CSS | Contents |
|---|---|---|---|
| Core | `@kouji-ui/core` | None | Directives only, signal-context tokens, a11y utilities |
| Implementation | `@kouji-ui/ui` | Tailwind v4 | Angular components wrapping core directives |

### Core: Directive-Only with Signal-Context Pattern

Every component in core is implemented exclusively as Angular directives. There are no Angular components in core. Complex primitives (Select, Tabs, Dialog) coordinate state between their directives via injected signal contexts using `InjectionToken`.

**Signal-context shape:**
```ts
// Root directive provides context
export interface KjSelectContext {
  value: Signal<unknown>;
  open: Signal<boolean>;
  select: (value: unknown) => void;
  toggle: () => void;
}
export const KJ_SELECT = new InjectionToken<KjSelectContext>('KjSelect');

@Directive({
  selector: '[kjSelect]',
  providers: [{ provide: KJ_SELECT, useExisting: KjSelectDirective }]
})
export class KjSelectDirective implements KjSelectContext {
  value = model<unknown>(undefined);
  open = signal(false);
  select = (v: unknown) => this.value.set(v);
  toggle = () => this.open.update(o => !o);
}

// Child directives inject the context
@Directive({ selector: '[kjOption]' })
export class KjOptionDirective {
  private ctx = inject(KJ_SELECT);
  readonly value = input.required<unknown>();
  readonly selected = computed(() => this.ctx.value() === this.value());
}
```

**Behavior host directives:** Shared behaviors (disabled, focus ring) are standalone directives composed via `hostDirectives` — never duplicated.

**ARIA via host bindings:** All accessibility attributes are declared in the directive's `host` object. No `Renderer2`, no direct DOM manipulation.

**Signals everywhere:**
- `input()`, `input.required()`, `model()`, `output()` — never `@Input()` / `@Output()`
- `inject()` only — no constructor injection
- `signal()`, `computed()`, `effect()` for all state
- `afterNextRender()` / `afterRender()` instead of lifecycle interfaces
- `DestroyRef` + `onDestroy()` instead of `ngOnDestroy()`

---

## Component Inventory

| Group | Component | Core Directive(s) | CDK Used |
|---|---|---|---|
| **Foundation** | Button | `kjButton`, `kjDisabled` | — |
| | Input | `kjInput` | — |
| | Checkbox | `kjCheckbox` | — |
| | Radio | `kjRadioGroup`, `kjRadio` | — |
| | Toggle | `kjToggle` | — |
| | Badge | `kjBadge` | — |
| | Avatar | `kjAvatar` | — |
| **Overlays** | Dialog | `kjDialog`, `kjDialogTrigger`, `kjDialogContent` | `Overlay`, `FocusTrap` |
| | Tooltip | `kjTooltip`, `kjTooltipTrigger` | `Overlay` |
| | Popover | `kjPopover`, `kjPopoverTrigger`, `kjPopoverContent` | `Overlay` |
| | Dropdown | `kjMenu`, `kjMenuTrigger`, `kjMenuItem` | `Overlay`, `FocusKeyManager` |
| | Toast | `kjToast` | `Overlay`, `LiveAnnouncer` |
| **Data** | Table | `kjTable`, `kjColumn`, `kjRow` | `ScrollingModule` |
| | Form | `kjForm`, `kjField`, `kjError` | — |
| | Tabs | `kjTabs`, `kjTabList`, `kjTab`, `kjTabPanel` | `FocusKeyManager` |
| | Accordion | `kjAccordion`, `kjAccordionItem` | — |
| | Select | `kjSelect`, `kjOption`, `kjOptionGroup` | `Overlay`, `FocusKeyManager` |
| **Charts** | Chart | `kjChart` | — |

**Third-party integrations:**
- **TanStack Table** — wrapped by `KjTableDirective` as an injectable service facade
- **Apache ECharts** — initialized in `afterNextRender()`, updated in `afterRender()`, disposed via `DestroyRef`

---

## Accessibility

**Target:** WCAG 2.1 AAA for every component.

All keyboard interactions are implemented per ARIA Authoring Practices Guide (APG):
- Arrow key navigation in composite widgets
- Enter / Space for activation
- Escape for dismissal
- Tab / Shift+Tab for focus movement

**`@kouji-ui/core/a11y` utilities (separate entry point):**

| Directive | Purpose |
|---|---|
| `KjFocusTrapDirective` | Traps focus within a container (wraps CDK FocusTrap) |
| `KjLiveRegionDirective` | Announces dynamic content to screen readers (CDK LiveAnnouncer) |
| `KjRovingTabindexDirective` | Implements roving tabindex for composite widgets |
| `KjVisuallyHiddenDirective` | Renders content visually hidden but available to assistive tech |
| `KjAriaDescribedByDirective` | Wires `aria-describedby` between elements via signal ids |

---

## Public API & Exports

Each primitive has its own entry point for tree-shaking:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./a11y": "./src/a11y/index.ts",
    "./button": "./src/button/index.ts",
    "./select": "./src/select/index.ts"
  }
}
```

```ts
// Granular import
import { KjButtonDirective } from '@kouji-ui/core/button';

// Full import
import { KjButtonDirective, KjSelectDirective } from '@kouji-ui/core';
```

---

## Testing Strategy

**Test runner:** Vitest (via `@analogjs/vitest-angular`)

**Unit + accessibility tests** (per directive, `packages/core/src/<component>/`):
- `@testing-library/angular` — user-perspective assertions
- `jest-axe` — `expect(await axe(container)).toHaveNoViolations()` on every component
- Signal state transitions, ARIA attribute output, keyboard interactions

**E2E tests** (`apps/docs/e2e/`):
- Playwright for critical interaction flows: Dialog focus trap, Select keyboard nav, Toast announcements, Table sort/filter

---

## Build & Release

**Build:**
- `@angular/build` (esbuild) for all packages and the docs app
- Turborepo pipeline: `core` → `ui` → `docs`

```json
{ "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] } }
```

**Versioning:**
- Changesets — contributors add a changeset per PR
- `@kouji-ui/core` and `@kouji-ui/ui` versioned in lockstep

**CI (GitHub Actions):**
- PR: lint, build, unit tests, a11y tests, Playwright E2E
- Merge to `main`: Changesets bot opens "Version Packages" PR
- Version PR merge: auto-publish to npm

---

## Docs App & Deployment

**`apps/docs` (Angular 21 with SSR + ISR):**
- Dogfoods `@kouji-ui/ui`
- Pages: Landing, Getting Started, one page per component, A11y Utilities
- Landing page: hero, feature highlights, install snippet, link to docs
- Component pages are dynamically generated from TSDoc comments extracted at build time via **ts-morph**

**TSDoc extraction pipeline (`apps/docs/scripts/extract-docs.ts`):**
- Runs as a Turborepo build step before the Angular build
- Uses `ts-morph` to parse `@kouji-ui/core` and `@kouji-ui/ui` source files
- Extracts: directive selector, description, `@param` / `@returns`, input/output signal metadata, examples (`@example`)
- Outputs a `docs-manifest.json` consumed by the Angular doc pages at runtime
- Component doc pages use Angular's `@defer` + ISR to serve fresh content without a full rebuild

**ISR setup (`@angular/ssr`):**
- `@angular/ssr` with `provideServerRendering()` and incremental static regeneration
- Doc pages revalidate on a schedule (or on-demand via webhook on npm publish)
- Allows doc pages to reflect the latest TSDoc without redeploying the app

**Deployment — Render Web Service (Node.js):**
- ISR requires a running Node.js server — not a static site
- Build command: `pnpm turbo build --filter=docs`
- Start command: `node apps/docs/dist/server/server.mjs`
- Auto-deploys on push to `main`
