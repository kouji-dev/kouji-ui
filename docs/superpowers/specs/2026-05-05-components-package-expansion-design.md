# Components Package Expansion — Design

**Date:** 2026-05-05
**Status:** Spec — pending implementation plan
**Worktree:** `worktree-components-expansion`

## 1. Goal

Expand `@kouji-ui/components` from 5 styled wrappers (`button`, `card`, `input`, `kbd`, `link`) to 16 by wrapping the headless directives that already live in `@kouji-ui/core`. Document each new component in the docs site with multiple named example groups (code + live preview), and group them in the docs sidebar using daisyUI-style categories declared at the TSDoc level.

Behavior, accessibility, and keyboard handling all stay in core. The components package is a thin presentation layer.

## 2. Components

### 2.1 New components (11)

Each wraps an existing core directive and ships in its own folder under `packages/components/src/<name>/`.

| Component | Wraps | Sidebar group |
|---|---|---|
| `KjAccordionComponent` (+ `KjAccordionItemComponent`) | `KjAccordion`, `KjAccordionItem` | Data display |
| `KjAvatarComponent` | `KjAvatar` | Data display |
| `KjBadgeComponent` | `KjBadge` | Data display |
| `KjCheckboxComponent` | `KjCheckbox` | Data input |
| `KjDialogComponent` | `KjDialog` | Actions |
| `KjMenuComponent` (+ `KjMenuItemComponent`) | `KjMenu`, `KjMenuItem` | Navigation |
| `KjRadioComponent` (+ `KjRadioGroupComponent`) | `KjRadio`, `KjRadioGroup` | Data input |
| `KjSelectComponent` | `KjSelect` | Data input |
| `KjTabsComponent` (+ `KjTabComponent`, `KjTabPanelComponent`) | `KjTabs`, `KjTab`, `KjTabPanel` | Navigation |
| `KjToastComponent` | `KjToast` | Feedback |
| `KjToggleComponent` | `KjToggle` | Data input |

The exact set of sub-components per directive will follow whatever the core package already exposes; the table above is the working list.

### 2.2 Existing components — small recategorization

These components ship today; the only edit is adding/changing their `@category` tag so they land in the daisyUI-style sidebar.

| Component | Today | Becomes |
|---|---|---|
| `KjButtonComponent` | `Library/Base` | `Library/Actions` |
| `KjCardComponent` | (untagged) | `Library/Data display` |
| `KjInputComponent` | (existing tag) | `Library/Data input` |
| `KjKbdComponent` | (untagged) | `Library/Data display` |
| `KjLinkComponent` | (untagged) | `Library/Navigation` |

### 2.3 Out of scope

- **`tooltip`, `popover`** — positioning primitives. Styling lives in whatever sits inside them; a wrapper would add nothing.
- **`form`** — infrastructure (validation/value plumbing), not a visual component.
- **`chart`, `table`** — heavier APIs; deferred to a later pass.
- **Adding core directives for `card`, `kbd`, `link`** — they remain presentation-only for now.
- **Tests** — handled in a parallel session, per user direction.
- **Themes / `@doc-theme` blocks** — Core-package concern; new components ship one default-theme preview per example.
- **Layout / Mockup daisyUI groups** — no component fits them in this pass.

## 3. Architecture

### 3.1 File layout per component

Mirrors the existing `button/` folder:

```
packages/components/src/accordion/
  accordion.ts                   ← @Component wrapper
  accordion.css                  ← styles (ViewEncapsulation.None)
  accordion.default.example.ts   ← one file per @doc-example group
  accordion.disabled.example.ts
  accordion.multiple.example.ts
  …
  index.ts                       ← `export * from './accordion';`
```

### 3.2 Component class shape

Following `KjButtonComponent` exactly:

- `host: { style: 'display: contents;' }` — the host is a structural shell with no layout box.
- `ViewEncapsulation.None` — so `[data-theme="X"] .kj-<comp>` overrides work and the `@layer kj.component` cascade applies.
- `ChangeDetectionStrategy.OnPush`.
- Selector: `kj-<name>` (and `kj-<name>-item` etc. for compound components).
- Class name: `Kj<Name>Component` (suffix kept; `KjAccordion` already names the headless directive in core).
- Template renders the real semantic element with the `kj*` core directive applied; the wrapper's signal inputs flow through normal template binding to the directive's `kj*` inputs.

### 3.3 TSDoc on the component class

```ts
/**
 * One-paragraph description (rendered above the docs page).
 *
 * @doc-example Default
 *   @doc-file accordion.default.example.ts
 * @doc-example Multiple open
 *   @doc-file accordion.multiple.example.ts
 * @doc-example Disabled item
 *   @doc-file accordion.disabled.example.ts
 *
 * @category Library/Data display
 */
```

Each `@doc-example <Label>` becomes one preview+code panel on the docs page, in declaration order.

### 3.4 Example file shape

Each `<name>.<label>.example.ts` is a small standalone `@Component` that imports the wrapper and demonstrates one variation:

```ts
import { Component } from '@angular/core';
import { KjAccordionComponent, KjAccordionItemComponent } from './accordion';

@Component({
  selector: 'kj-accordion-default-example',
  standalone: true,
  imports: [KjAccordionComponent, KjAccordionItemComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `…`,
})
export class KjAccordionDefaultExample {}
```

The framing (`:host { padding … background … }`) is identical across all examples for a uniform preview look. The example class name follows `Kj<Name><Label>Example`.

## 4. Examples per component

For each new component, ship the named groups below. Variants/sizes/states are signal inputs on the wrapper that flip `data-*` attributes; the actual variant set will follow what the wrapped core directive supports — the lists below are illustrative and may be tightened during implementation if a directive doesn't expose what's listed.

**Actions**
- `KjDialogComponent` — *Default*, *With form*, *Scrollable*, *Confirmation*

**Data input**
- `KjCheckboxComponent` — *Default*, *Checked*, *Indeterminate*, *Disabled*, *With label*
- `KjRadioComponent` — *Default*, *Group*, *Disabled*, *Inline*
- `KjSelectComponent` — *Default*, *With placeholder*, *Disabled*, *Grouped options*
- `KjToggleComponent` — *Default*, *Checked*, *Disabled*, *With label*

**Data display**
- `KjAccordionComponent` — *Default* (single-open), *Multiple open*, *Disabled item*, *With rich content*
- `KjAvatarComponent` — *Default*, *Sizes*, *With image*, *Initials fallback*, *Shapes*
- `KjBadgeComponent` — *Default*, *Variants*, *Sizes*, *With icon*

**Navigation**
- `KjMenuComponent` — *Default*, *With sub-items*, *Disabled item*, *With shortcuts*
- `KjTabsComponent` — *Default*, *Pills*, *Disabled tab*, *Vertical*

**Feedback**
- `KjToastComponent` — *Default*, *Variants*, *With action*, *Dismissible*

**Total:** 11 components, 46 example files.

## 5. Sidebar categorization (daisyUI vocabulary)

Source of truth is the `@category Library/<Group>` tag on the component class. The sidebar renders groups in this order for the components track:

1. Actions
2. Data input
3. Data display
4. Navigation
5. Feedback

`Layout` and `Mockup` are not used in this pass.

## 6. Extractor and sidebar changes

All three changes live in `apps/docs/src/lib/docs-extractor.ts`. The `core` track is untouched.

### 6.1 `ComponentDoc.category` union

Extend the union with the new daisyUI-style values, additive:

```ts
category:
  | 'actions' | 'data-input' | 'data-display' | 'navigation' | 'feedback'
  | 'base' | 'inputs' | 'overlays' | 'data' | 'display' | 'a11y' | 'primitives';
```

The matching `category` field on `apps/docs/src/app/services/docs.service.ts` (`ComponentDoc`) is updated to the same union so types line up.

### 6.2 `CATEGORY_MAP`

Extend folder-name → category fallbacks for the new components and the recategorized existing ones:

```ts
button:     'actions',
dialog:     'actions',
checkbox:   'data-input',
radio:      'data-input',
select:     'data-input',
toggle:     'data-input',
input:      'data-input',
accordion:  'data-display',
avatar:     'data-display',
badge:      'data-display',
card:       'data-display',
kbd:        'data-display',
menu:       'navigation',
tabs:       'navigation',
link:       'navigation',
toast:      'feedback',
```

These are only consulted when a class has no `@category` tag; they exist as a safety net.

### 6.3 `categoryFallbacks.components`

Add display paths for the new categories — only in the `components` branch. The `core` branch keeps its existing fallback paths.

```ts
components: {
  // existing keys retained
  'actions':      ['Library', 'Actions'],
  'data-input':   ['Library', 'Data input'],
  'data-display': ['Library', 'Data display'],
  'navigation':   ['Library', 'Navigation'],
  'feedback':     ['Library', 'Feedback'],
  // …
}
```

### 6.4 Sort order for the components track

Today `categoryOrder` in `extractDocsManifest()` is single-track. Introduce a per-package order array and pick by `comp.pkg`:

```ts
const coreCategoryOrder: ComponentDoc['category'][] = [
  'inputs', 'navigation', 'overlays', 'data', 'display', 'a11y', 'primitives',
];
const componentsCategoryOrder: ComponentDoc['category'][] = [
  'actions', 'data-input', 'data-display', 'navigation', 'feedback',
];

const orderFor = (pkg: SourcePkg) =>
  pkg === 'components' ? componentsCategoryOrder : coreCategoryOrder;

components.sort((a, b) => {
  if (a.pkg !== b.pkg) return a.pkg.localeCompare(b.pkg);
  const order = orderFor(a.pkg);
  const ai = order.indexOf(a.category);
  const bi = order.indexOf(b.category);
  return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
});
```

`DocsService.buildTreeForPackage('components')` already groups by `categoryPath[length-2]` and renders nodes in insertion order, so once the manifest is sorted, the sidebar appears in the right order. No code change in `docs.service.ts` apart from the `category` union widening.

### 6.5 Manifest cache invalidation in dev

`apps/docs/src/lib/manifest.ts` watches `packages/core/src` only. Extend it to also watch `packages/components/src` so editing a wrapper or example file invalidates the cache:

```ts
const watchPaths = [
  resolve(root, 'packages/core/src'),
  resolve(root, 'packages/components/src'),
];
for (const p of watchPaths) {
  try { watch(p, { recursive: true }, onChange); } catch { /* ignore */ }
}
```

`onChange` keeps the existing debounce and `.spec.` filter.

## 7. Styling

Every new `<name>.css` follows the `button.css` token-flip convention:

1. Wrap in `@layer kj.component`.
2. Declare component-scoped CSS custom properties at the top of the rule (`--kj-<comp>-bg`, `--kj-<comp>-fg`, `--kj-<comp>-radius`, `--kj-<comp>-padding-*`, …) defaulting to shared-layer tokens (`--kj-color-*`, `--kj-radius-*`, `--kj-space-*`, `--kj-text-*`).
3. Structural CSS reads only the component tokens.
4. Variants / sizes / states **flip the component tokens** — they don't restate structural CSS:
   - `[data-variant="…"]`
   - `[data-size="…"]`
   - `[aria-disabled="true"]` (set by the core directive)
   - `:hover`, `:focus-visible`, `:active`
5. The wrapper template binds `data-variant` / `data-size` from its signal inputs. ARIA state attrs (`aria-disabled`, `aria-expanded`, `aria-selected`, …) come from the core directive — the wrapper does not duplicate them.

This keeps theming simple: `[data-theme="X"] .kj-<comp> { --kj-<comp>-bg: …; }` retheme without touching component CSS.

## 8. Public API

`packages/components/src/public-api.ts` gains 11 new lines (alphabetical order with the existing five):

```ts
export * from './accordion/index';
export * from './avatar/index';
export * from './badge/index';
export * from './button/index';     // existing
export * from './card/index';       // existing
export * from './checkbox/index';
export * from './dialog/index';
export * from './input/index';      // existing
export * from './kbd/index';        // existing
export * from './link/index';       // existing
export * from './menu/index';
export * from './radio/index';
export * from './select/index';
export * from './tabs/index';
export * from './toast/index';
export * from './toggle/index';
```

`KJ_COMPONENTS_VERSION` stays at `0.0.1`.

## 9. Accessibility posture

Wrappers add no a11y logic. Roles, keyboard handling, focus management, and live regions are inherited from the wrapped core directives.

Per `CLAUDE.md`, after each component is implemented, run a brief Accessibility Review limited to wrapper-level concerns:

- Touch target ≥ 44×44px at the smallest declared size (WCAG 2.5.5).
- `:focus-visible` outline contrast ≥ 3:1 against adjacent colors.
- Decorative icons in examples are `aria-hidden="true"`.

Any deeper a11y issue (keyboard, ARIA semantics, focus trap) is a core-package concern and gets reported back to the core track, not patched in the wrapper.

## 10. Risks and open questions

- **Variant lists are illustrative.** Section 4's per-component example list assumes each core directive exposes the variants/sizes/states named there. During implementation, each component's example list will be tightened to what the directive actually supports. The plan's per-component task should include a "read core directive inputs" step before writing examples.
- **`KjRadio` shape.** The split between `KjRadioComponent` and `KjRadioGroupComponent` depends on how the core `KjRadio` / `KjRadioGroup` directives are split. To be confirmed at implementation.
- **`KjMenuComponent` ergonomics.** Menus often need positioning + trigger wiring beyond the directive surface. The wrapper may need to expose a `triggerFor` input or rely on a paired directive. To be confirmed at implementation.
- **Manifest watcher on Windows.** `watch(…, { recursive: true })` is supported on Windows and macOS but only partially on Linux. Behavior already in place for `core` is being mirrored, so risk is no worse than today.
- **Name collisions in the manifest.** `components/src/button` and `core/src/button` already coexist in the manifest via the composite map key `${pkg}:${folder}` — no new collision risk.

## 11. Files touched (summary)

**New** (per component, ×11):
- `packages/components/src/<name>/<name>.ts`
- `packages/components/src/<name>/<name>.css`
- `packages/components/src/<name>/<name>.<label>.example.ts` (multiple)
- `packages/components/src/<name>/index.ts`

**Edited** (existing components — `@category` tag):
- `packages/components/src/button/button.ts`
- `packages/components/src/card/card.ts`
- `packages/components/src/input/input.ts` (verify tag is correct)
- `packages/components/src/kbd/kbd.ts`
- `packages/components/src/link/link.ts`

**Edited** (docs infrastructure):
- `apps/docs/src/lib/docs-extractor.ts` — `category` union, `CATEGORY_MAP` extensions, `categoryFallbacks.components`, per-package `categoryOrder`.
- `apps/docs/src/app/services/docs.service.ts` — widen `category` union to match.
- `apps/docs/src/lib/manifest.ts` — watch `packages/components/src` in addition to `packages/core/src`.
- `packages/components/src/public-api.ts` — 11 new `export *` lines.

No routing, no theme system, no test changes.
