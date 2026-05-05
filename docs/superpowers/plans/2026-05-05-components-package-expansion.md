# Components Package Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap 11 headless directives from `@kouji-ui/core` as styled components in `@kouji-ui/components`, document each with multiple named code+preview examples, and group them in the docs sidebar using daisyUI-style categories.

**Architecture:** Each new component is a thin element-wrapper around a core directive (or set of directives). The wrapper hosts have `display: contents`, render the real semantic element with the core `kj*` directive applied, and forward signal inputs to the directive. Categories are declared in TSDoc via `@category Library/<Group>`. Multiple `@doc-example <Label>` TSDoc blocks per class drive the docs page panels. The existing extractor (`docs-extractor.ts`) is extended for daisyUI vocabulary — no new docs infrastructure.

**Tech Stack:** Angular 18+ standalone components, signal inputs, TypeScript, ts-morph + ts-query (extractor), pnpm workspace.

**Tests:** Skipped this pass per user direction — a parallel session covers tests.

**Spec reference:** `docs/superpowers/specs/2026-05-05-components-package-expansion-design.md`

---

## Conventions used by every component task

These conventions are referenced from each component task; they are not a task themselves.

### Wrapper class shape (canonical, mirrors `KjButtonComponent`)

```ts
@Component({
  selector: 'kj-<name>',
  standalone: true,
  imports: [/* core directive(s) used in template */],
  template: `…`,
  styleUrl: './<name>.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Kj<Name>Component { /* signal inputs forwarded to host directive */ }
```

### CSS shape (canonical, mirrors `button.css`)

```css
@layer kj.component {
  .kj-<name> {
    --kj-<name>-bg: var(--kj-color-base-100);
    --kj-<name>-fg: var(--kj-color-base-content);
    --kj-<name>-radius: var(--kj-radius-field);
    /* …more component knobs… */

    background: var(--kj-<name>-bg);
    color: var(--kj-<name>-fg);
    border-radius: var(--kj-<name>-radius);
    /* …structural CSS reads ONLY component knobs… */
  }

  .kj-<name>[data-variant="…"]  { /* flips knobs */ }
  .kj-<name>[data-size="…"]     { /* flips knobs */ }
  .kj-<name>[aria-disabled="true"] { opacity: 0.45; cursor: not-allowed; pointer-events: none; }
  .kj-<name>:focus-visible      { outline: 2px solid var(--kj-color-primary); outline-offset: 2px; }
}
```

### Example file shape (canonical, mirrors `button.example.ts`)

```ts
import { Component } from '@angular/core';
import { Kj<Name>Component /*, sub-components */ } from './<name>';

@Component({
  selector: 'kj-<name>-<label-kebab>-example',
  standalone: true,
  imports: [Kj<Name>Component /*, sub-components */],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `…`,
})
export class Kj<Name><Label>Example {}
```

### `index.ts` shape (canonical, mirrors `button/index.ts`)

```ts
export * from './<name>';
```

---

## Task 1: Extend extractor — `category` union, `CATEGORY_MAP`, `categoryFallbacks`, sort order

**Files:**
- Modify: `apps/docs/src/lib/docs-extractor.ts`
- Modify: `apps/docs/src/app/services/docs.service.ts`

- [ ] **Step 1: Widen the `category` union in `docs-extractor.ts`**

In `apps/docs/src/lib/docs-extractor.ts`, find the `ComponentDoc` interface (around line 78). Replace the `category` field:

```ts
category:
  | 'actions' | 'data-input' | 'data-display' | 'navigation' | 'feedback'
  | 'base' | 'inputs' | 'overlays' | 'data' | 'display' | 'a11y' | 'primitives';
```

- [ ] **Step 2: Mirror the same union in `docs.service.ts`**

In `apps/docs/src/app/services/docs.service.ts`, find the `ComponentDoc` interface (around line 58). Replace the `category` field with the identical union from Step 1.

- [ ] **Step 3: Extend `CATEGORY_MAP`**

In `docs-extractor.ts`, find `CATEGORY_MAP` (around line 92). Replace the whole object literal with:

```ts
const CATEGORY_MAP: Record<string, ComponentDoc['category']> = {
  // daisyUI-style groups (used for components track)
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
  // legacy core groups (kept for the core track)
  form:       'inputs',
  popover:    'overlays',
  tooltip:    'overlays',
  chart:      'data',
  table:      'data',
  a11y:       'a11y',
  primitives: 'primitives',
};
```

- [ ] **Step 4: Replace `categoryFallbacks`**

In `docs-extractor.ts`, find the `categoryFallbacks` object inside `extractDocsManifest()` (around line 741). Replace it with:

```ts
const categoryFallbacks: Record<SourcePkg, Partial<Record<ComponentDoc['category'], string[]>>> = {
  core: {
    base:       ['Core', 'Base'],
    inputs:     ['Core', 'Inputs'],
    navigation: ['Core', 'Navigation'],
    overlays:   ['Core', 'Overlays'],
    data:       ['Core', 'Data'],
    display:    ['Core', 'Display'],
    a11y:       ['Core', 'Accessibility'],
    primitives: ['Core', 'Primitives'],
  },
  components: {
    'actions':      ['Library', 'Actions'],
    'data-input':   ['Library', 'Data input'],
    'data-display': ['Library', 'Data display'],
    'navigation':   ['Library', 'Navigation'],
    'feedback':     ['Library', 'Feedback'],
    // safety net for components that fall back to legacy keys
    base:       ['Library', 'Base'],
    inputs:     ['Library', 'Data input'],
    overlays:   ['Library', 'Actions'],
    data:       ['Library', 'Data display'],
    display:    ['Library', 'Data display'],
    a11y:       ['Library', 'Accessibility'],
    primitives: ['Library', 'Primitives'],
  },
};
```

The `Partial<Record<…>>` typing accommodates that `core` and `components` use overlapping but not identical key sets.

- [ ] **Step 5: Replace single `categoryOrder` with per-package order**

In `docs-extractor.ts`, find this block at the bottom of `extractDocsManifest()` (around line 774):

```ts
const categoryOrder: ComponentDoc['category'][] = [
  'inputs', 'navigation', 'overlays', 'data', 'display', 'a11y', 'primitives',
];
const components = [...componentMap.values()].sort((a, b) => {
  const ai = categoryOrder.indexOf(a.category);
  const bi = categoryOrder.indexOf(b.category);
  return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
});
```

Replace with:

```ts
const coreCategoryOrder: ComponentDoc['category'][] = [
  'base', 'inputs', 'navigation', 'overlays', 'data', 'display', 'a11y', 'primitives',
];
const componentsCategoryOrder: ComponentDoc['category'][] = [
  'actions', 'data-input', 'data-display', 'navigation', 'feedback',
];
const orderFor = (pkg: SourcePkg) =>
  pkg === 'components' ? componentsCategoryOrder : coreCategoryOrder;

const components = [...componentMap.values()].sort((a, b) => {
  if (a.pkg !== b.pkg) return a.pkg.localeCompare(b.pkg);
  const order = orderFor(a.pkg);
  const ai = order.indexOf(a.category);
  const bi = order.indexOf(b.category);
  return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
});
```

- [ ] **Step 6: Type-check**

Run: `pnpm -F @kouji-ui/docs typecheck` (or `pnpm -F @kouji-ui/docs build`)
Expected: zero TypeScript errors. If errors, they will likely be in `docs.service.ts` consumers — fix by widening any narrowed `category` matches to handle the new keys (most code reads `category` only for filtering, so a string union widening is usually transparent).

- [ ] **Step 7: Commit**

```bash
git add apps/docs/src/lib/docs-extractor.ts apps/docs/src/app/services/docs.service.ts
git commit -m "feat(docs): extend extractor with daisyUI-style categories for components track"
```

---

## Task 2: Extend manifest dev watcher to also watch `packages/components/src`

**Files:**
- Modify: `apps/docs/src/lib/manifest.ts`

- [ ] **Step 1: Update `startWatcher()`**

In `apps/docs/src/lib/manifest.ts`, replace the `startWatcher()` function with:

```ts
function startWatcher(): void {
  if (_watcherStarted) return;
  _watcherStarted = true;

  const root = findWorkspaceRoot(process.cwd());
  const paths = [
    resolve(root, 'packages/core/src'),
    resolve(root, 'packages/components/src'),
  ];
  let debounce: ReturnType<typeof setTimeout>;

  for (const p of paths) {
    try {
      watch(p, { recursive: true }, (_, filename) => {
        if (!filename?.endsWith('.ts') || filename.includes('.spec.')) return;
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          console.log(`[docs] ${filename} changed — invalidating manifest`);
          invalidateManifest();
        }, 300);
      });
    } catch {
      // File watching not available (CI, containers) — silent fail
    }
  }
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm -F @kouji-ui/docs build`
Expected: zero TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/lib/manifest.ts
git commit -m "feat(docs): watch packages/components/src for manifest invalidation"
```

---

## Task 3: Recategorize the 4 existing components

**Files:**
- Modify: `packages/components/src/button/button.ts`
- Modify: `packages/components/src/card/card.ts`
- Modify: `packages/components/src/kbd/kbd.ts`
- Modify: `packages/components/src/link/link.ts`

The TSDoc on each component class needs an updated/added `@category` line.

- [ ] **Step 1: Verify `input.ts`'s current category**

Run: `grep -n "@category" packages/components/src/input/input.ts`
Expected: prints a line containing `Library/Data input` or similar. If it prints `Library/Inputs` or nothing, also update it: change to `@category Library/Data input`. Otherwise leave it alone — `input` is the only component whose tag may already be correct.

- [ ] **Step 2: Update `button.ts`**

In `packages/components/src/button/button.ts`, change the `@category` line:

```diff
- * @category Library/Base
+ * @category Library/Actions
```

- [ ] **Step 3: Update `card.ts`**

In `packages/components/src/card/card.ts`, locate the TSDoc block above the `@Component` decorator on the `KjCardComponent` class. Add a final tag line so the block ends with:

```ts
 * @category Library/Data display
 */
```

If a `@category` tag already exists, replace its value with `Library/Data display`.

- [ ] **Step 4: Update `kbd.ts`**

In `packages/components/src/kbd/kbd.ts`, do the same operation as Step 3 with value `Library/Data display`.

- [ ] **Step 5: Update `link.ts`**

In `packages/components/src/link/link.ts`, do the same operation as Step 3 with value `Library/Navigation`.

- [ ] **Step 6: Verify in dev**

Run: `pnpm -F @kouji-ui/docs dev`
Open: `http://localhost:4200/docs/components`
Expected: sidebar shows the existing 5 components grouped under **Actions** (Button), **Data input** (Input), **Data display** (Card, Kbd), **Navigation** (Link). No "Base" group remains in the components track.

- [ ] **Step 7: Commit**

```bash
git add packages/components/src/button/button.ts \
        packages/components/src/card/card.ts \
        packages/components/src/kbd/kbd.ts \
        packages/components/src/link/link.ts
git diff --cached --stat   # sanity check: only the 4 files
git commit -m "feat(components): recategorize existing wrappers under daisyUI groups"
```

---

## Task 4: Add `KjToggleComponent`

**Files:**
- Create: `packages/components/src/toggle/toggle.ts`
- Create: `packages/components/src/toggle/toggle.css`
- Create: `packages/components/src/toggle/toggle.default.example.ts`
- Create: `packages/components/src/toggle/toggle.checked.example.ts`
- Create: `packages/components/src/toggle/toggle.disabled.example.ts`
- Create: `packages/components/src/toggle/toggle.with-label.example.ts`
- Create: `packages/components/src/toggle/index.ts`
- Modify: `packages/components/src/public-api.ts`

**Core directive surface (read once before writing):** `packages/core/src/toggle/toggle.ts` — `KjToggle` is a single directive on a button-like element. Inputs: `kjPressed: model<boolean>(false)`, plus `kjDisabled` forwarded via `hostDirectives`. Sets `aria-pressed` and `data-pressed`.

- [ ] **Step 1: Create `toggle.ts`**

```ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, model, input } from '@angular/core';
import { KjToggle } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjToggle` directive.
 *
 * The host `<kj-toggle>` is `display: contents`. Internally renders a real
 * `<button>` with the `kjToggle` directive applied. Two-way bind via
 * `[(pressed)]`; the wrapper exposes the same press model.
 *
 * @doc-example Default
 *   @doc-file toggle.default.example.ts
 * @doc-example Checked
 *   @doc-file toggle.checked.example.ts
 * @doc-example Disabled
 *   @doc-file toggle.disabled.example.ts
 * @doc-example With label
 *   @doc-file toggle.with-label.example.ts
 * @category Library/Data input
 */
@Component({
  selector: 'kj-toggle',
  standalone: true,
  imports: [KjToggle],
  template: `
    <button
      type="button"
      kjToggle
      class="kj-toggle"
      [(kjPressed)]="pressed"
      [kjDisabled]="disabled()"
      [attr.data-size]="size()"
      [attr.aria-label]="ariaLabel()"
    >
      <ng-content />
    </button>
  `,
  styleUrl: './toggle.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjToggleComponent {
  readonly pressed = model<boolean>(false);
  readonly disabled = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly ariaLabel = input<string | undefined>(undefined);
}
```

- [ ] **Step 2: Create `toggle.css`**

```css
@layer kj.component {
  .kj-toggle {
    --kj-toggle-bg:           var(--kj-color-base-200);
    --kj-toggle-bg-pressed:   var(--kj-color-primary);
    --kj-toggle-fg:           var(--kj-color-base-content);
    --kj-toggle-fg-pressed:   var(--kj-color-primary-content);
    --kj-toggle-radius:       var(--kj-radius-field);
    --kj-toggle-padding-x:    var(--kj-space-md);
    --kj-toggle-padding-y:    var(--kj-space-sm);
    --kj-toggle-font-size:    var(--kj-text-sm);

    display: inline-flex;
    align-items: center;
    gap: var(--kj-space-sm);
    background: var(--kj-toggle-bg);
    color: var(--kj-toggle-fg);
    border: var(--kj-border) solid transparent;
    border-radius: var(--kj-toggle-radius);
    padding: var(--kj-toggle-padding-y) var(--kj-toggle-padding-x);
    font: var(--kj-toggle-font-size) / 1.2 var(--kj-font-sans);
    cursor: pointer;
    transition: var(--kj-transition);
  }

  .kj-toggle[data-pressed] {
    background: var(--kj-toggle-bg-pressed);
    color: var(--kj-toggle-fg-pressed);
  }

  .kj-toggle[data-size="sm"] {
    --kj-toggle-padding-x: var(--kj-space-sm);
    --kj-toggle-padding-y: 0.25rem;
    --kj-toggle-font-size: 0.8125rem;
  }
  .kj-toggle[data-size="lg"] {
    --kj-toggle-padding-x: var(--kj-space-lg);
    --kj-toggle-padding-y: 0.625rem;
    --kj-toggle-font-size: 1rem;
  }

  .kj-toggle:hover { background: color-mix(in oklab, var(--kj-toggle-bg) 88%, black); }
  .kj-toggle:focus-visible { outline: 2px solid var(--kj-color-primary); outline-offset: 2px; }
  .kj-toggle[aria-disabled="true"] { opacity: 0.45; cursor: not-allowed; pointer-events: none; }
}
```

- [ ] **Step 3: Create `toggle.default.example.ts`**

```ts
import { Component, signal } from '@angular/core';
import { KjToggleComponent } from './toggle';

@Component({
  selector: 'kj-toggle-default-example',
  standalone: true,
  imports: [KjToggleComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `<kj-toggle [(pressed)]="bold" ariaLabel="Bold">B</kj-toggle>`,
})
export class KjToggleDefaultExample { readonly bold = signal(false); }
```

- [ ] **Step 4: Create `toggle.checked.example.ts`**

```ts
import { Component, signal } from '@angular/core';
import { KjToggleComponent } from './toggle';

@Component({
  selector: 'kj-toggle-checked-example',
  standalone: true,
  imports: [KjToggleComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `<kj-toggle [(pressed)]="active" ariaLabel="Active">Active</kj-toggle>`,
})
export class KjToggleCheckedExample { readonly active = signal(true); }
```

- [ ] **Step 5: Create `toggle.disabled.example.ts`**

```ts
import { Component, signal } from '@angular/core';
import { KjToggleComponent } from './toggle';

@Component({
  selector: 'kj-toggle-disabled-example',
  standalone: true,
  imports: [KjToggleComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-toggle [(pressed)]="off" [disabled]="true" ariaLabel="Off (disabled)">Off</kj-toggle>
    <kj-toggle [(pressed)]="on" [disabled]="true" ariaLabel="On (disabled)" style="margin-left:1rem">On</kj-toggle>
  `,
})
export class KjToggleDisabledExample {
  readonly off = signal(false);
  readonly on = signal(true);
}
```

- [ ] **Step 6: Create `toggle.with-label.example.ts`**

```ts
import { Component, signal } from '@angular/core';
import { KjToggleComponent } from './toggle';

@Component({
  selector: 'kj-toggle-with-label-example',
  standalone: true,
  imports: [KjToggleComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    label { display: inline-flex; align-items: center; gap: var(--kj-space-sm); cursor: pointer; }
  `],
  template: `
    <label>
      <kj-toggle [(pressed)]="dark" ariaLabel="Dark mode"></kj-toggle>
      Dark mode
    </label>
  `,
})
export class KjToggleWithLabelExample { readonly dark = signal(false); }
```

- [ ] **Step 7: Create `index.ts`**

```ts
export * from './toggle';
```

- [ ] **Step 8: Add to `public-api.ts`**

In `packages/components/src/public-api.ts`, add this line in alphabetical position between `link` and the next line:

```ts
export * from './toggle/index';
```

- [ ] **Step 9: Build the library**

Run: `pnpm -F @kouji-ui/components build`
Expected: build succeeds, zero TypeScript errors.

- [ ] **Step 10: Visual verification**

Run: `pnpm -F @kouji-ui/docs dev` (if not already running).
Open: `http://localhost:4200/docs/components/toggle`
Expected:
- Page renders with the title "Toggle".
- Sidebar shows "Toggle" under **Data input**.
- Four preview panels appear: *Default*, *Checked*, *Disabled*, *With label*.
- Each panel renders the live preview AND a code tab showing the example file source.

- [ ] **Step 11: Accessibility review (wrapper-level)**

Tab to each toggle in the rendered preview. Verify:
- `:focus-visible` outline is visible.
- Touch target is ≥ 44×44px at default size (`md`).
- No console errors.

If issues found, fix `toggle.css` accordingly. Note: ARIA semantics (`aria-pressed`) are handled by the core `KjToggle` directive; verify the attribute toggles in DevTools Elements but do not duplicate it on the wrapper.

- [ ] **Step 12: Commit**

```bash
git add packages/components/src/toggle/ packages/components/src/public-api.ts
git commit -m "feat(components): add KjToggleComponent with code+preview docs"
```

---

## Task 5: Add `KjCheckboxComponent`

**Files:**
- Create: `packages/components/src/checkbox/checkbox.ts`
- Create: `packages/components/src/checkbox/checkbox.css`
- Create: `packages/components/src/checkbox/checkbox.default.example.ts`
- Create: `packages/components/src/checkbox/checkbox.checked.example.ts`
- Create: `packages/components/src/checkbox/checkbox.indeterminate.example.ts`
- Create: `packages/components/src/checkbox/checkbox.disabled.example.ts`
- Create: `packages/components/src/checkbox/checkbox.with-label.example.ts`
- Create: `packages/components/src/checkbox/index.ts`
- Modify: `packages/components/src/public-api.ts`

**Core directive surface:** `packages/core/src/checkbox/checkbox.ts` — `KjCheckbox` single directive. Inputs: `kjChecked: model<boolean>(false)`, plus `kjDisabled` via host directive. Sets `role="checkbox"`, `aria-checked`, `data-checked`. Spacebar toggles. Indeterminate is **not** in the core directive — wrapper exposes a visual-only `indeterminate` input that toggles a `data-indeterminate` attribute (no semantic ARIA wiring, since core does not expose it; this is illustrative-only and may be removed if you decide it should not exist without core support).

- [ ] **Step 1: Create `checkbox.ts`**

```ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, model, input } from '@angular/core';
import { KjCheckbox } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjCheckbox` directive.
 *
 * @doc-example Default
 *   @doc-file checkbox.default.example.ts
 * @doc-example Checked
 *   @doc-file checkbox.checked.example.ts
 * @doc-example Indeterminate
 *   @doc-file checkbox.indeterminate.example.ts
 * @doc-example Disabled
 *   @doc-file checkbox.disabled.example.ts
 * @doc-example With label
 *   @doc-file checkbox.with-label.example.ts
 * @category Library/Data input
 */
@Component({
  selector: 'kj-checkbox',
  standalone: true,
  imports: [KjCheckbox],
  template: `
    <span
      kjCheckbox
      tabindex="0"
      class="kj-checkbox"
      [(kjChecked)]="checked"
      [kjDisabled]="disabled()"
      [attr.data-size]="size()"
      [attr.data-indeterminate]="indeterminate() ? '' : null"
      [attr.aria-label]="ariaLabel()"
    ></span>
  `,
  styleUrl: './checkbox.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCheckboxComponent {
  readonly checked = model<boolean>(false);
  readonly disabled = input(false);
  readonly indeterminate = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly ariaLabel = input<string | undefined>(undefined);
}
```

- [ ] **Step 2: Create `checkbox.css`**

```css
@layer kj.component {
  .kj-checkbox {
    --kj-checkbox-size:        1rem;
    --kj-checkbox-bg:          var(--kj-color-base-100);
    --kj-checkbox-bg-checked:  var(--kj-color-primary);
    --kj-checkbox-fg-checked:  var(--kj-color-primary-content);
    --kj-checkbox-border:      var(--kj-color-neutral);
    --kj-checkbox-radius:      var(--kj-radius-selector);

    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--kj-checkbox-size);
    height: var(--kj-checkbox-size);
    background: var(--kj-checkbox-bg);
    border: var(--kj-border) solid var(--kj-checkbox-border);
    border-radius: var(--kj-checkbox-radius);
    cursor: pointer;
    transition: var(--kj-transition);
  }

  .kj-checkbox[data-checked] {
    background: var(--kj-checkbox-bg-checked);
    border-color: var(--kj-checkbox-bg-checked);
  }
  .kj-checkbox[data-checked]::after {
    content: '✓';
    color: var(--kj-checkbox-fg-checked);
    font-size: 0.75rem;
    line-height: 1;
  }

  .kj-checkbox[data-indeterminate]::after {
    content: '';
    width: 60%;
    height: 2px;
    background: var(--kj-checkbox-fg-checked);
  }
  .kj-checkbox[data-indeterminate] {
    background: var(--kj-checkbox-bg-checked);
    border-color: var(--kj-checkbox-bg-checked);
  }

  .kj-checkbox[data-size="sm"] { --kj-checkbox-size: 0.875rem; }
  .kj-checkbox[data-size="lg"] { --kj-checkbox-size: 1.25rem; }

  .kj-checkbox:focus-visible { outline: 2px solid var(--kj-color-primary); outline-offset: 2px; }
  .kj-checkbox[aria-disabled="true"] { opacity: 0.45; cursor: not-allowed; pointer-events: none; }
}
```

- [ ] **Step 3: Create `checkbox.default.example.ts`**

```ts
import { Component, signal } from '@angular/core';
import { KjCheckboxComponent } from './checkbox';

@Component({
  selector: 'kj-checkbox-default-example',
  standalone: true,
  imports: [KjCheckboxComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `<kj-checkbox [(checked)]="value" ariaLabel="Accept terms"></kj-checkbox>`,
})
export class KjCheckboxDefaultExample { readonly value = signal(false); }
```

- [ ] **Step 4: Create `checkbox.checked.example.ts`**

```ts
import { Component, signal } from '@angular/core';
import { KjCheckboxComponent } from './checkbox';

@Component({
  selector: 'kj-checkbox-checked-example',
  standalone: true,
  imports: [KjCheckboxComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `<kj-checkbox [(checked)]="value" ariaLabel="Subscribed"></kj-checkbox>`,
})
export class KjCheckboxCheckedExample { readonly value = signal(true); }
```

- [ ] **Step 5: Create `checkbox.indeterminate.example.ts`**

```ts
import { Component, signal } from '@angular/core';
import { KjCheckboxComponent } from './checkbox';

@Component({
  selector: 'kj-checkbox-indeterminate-example',
  standalone: true,
  imports: [KjCheckboxComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `<kj-checkbox [(checked)]="value" [indeterminate]="true" ariaLabel="Mixed selection"></kj-checkbox>`,
})
export class KjCheckboxIndeterminateExample { readonly value = signal(false); }
```

- [ ] **Step 6: Create `checkbox.disabled.example.ts`**

```ts
import { Component, signal } from '@angular/core';
import { KjCheckboxComponent } from './checkbox';

@Component({
  selector: 'kj-checkbox-disabled-example',
  standalone: true,
  imports: [KjCheckboxComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); display: flex; gap: 1rem; }`],
  template: `
    <kj-checkbox [(checked)]="off" [disabled]="true" ariaLabel="Disabled off"></kj-checkbox>
    <kj-checkbox [(checked)]="on" [disabled]="true" ariaLabel="Disabled on"></kj-checkbox>
  `,
})
export class KjCheckboxDisabledExample {
  readonly off = signal(false);
  readonly on = signal(true);
}
```

- [ ] **Step 7: Create `checkbox.with-label.example.ts`**

```ts
import { Component, signal } from '@angular/core';
import { KjCheckboxComponent } from './checkbox';

@Component({
  selector: 'kj-checkbox-with-label-example',
  standalone: true,
  imports: [KjCheckboxComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    label { display: inline-flex; align-items: center; gap: var(--kj-space-sm); cursor: pointer; }
  `],
  template: `
    <label>
      <kj-checkbox [(checked)]="value" ariaLabel="Newsletter"></kj-checkbox>
      Subscribe to newsletter
    </label>
  `,
})
export class KjCheckboxWithLabelExample { readonly value = signal(false); }
```

- [ ] **Step 8: Create `index.ts`**

```ts
export * from './checkbox';
```

- [ ] **Step 9: Add to `public-api.ts`**

Add `export * from './checkbox/index';` in alphabetical position (between `card` and `input`).

- [ ] **Step 10: Build, verify, commit**

Run: `pnpm -F @kouji-ui/components build`
Open: `http://localhost:4200/docs/components/checkbox` — verify 5 preview panels render.
Then:

```bash
git add packages/components/src/checkbox/ packages/components/src/public-api.ts
git commit -m "feat(components): add KjCheckboxComponent with code+preview docs"
```

---

## Task 6: Add `KjBadgeComponent`

**Files:**
- Create: `packages/components/src/badge/badge.ts`
- Create: `packages/components/src/badge/badge.css`
- Create: `packages/components/src/badge/badge.default.example.ts`
- Create: `packages/components/src/badge/badge.variants.example.ts`
- Create: `packages/components/src/badge/badge.sizes.example.ts`
- Create: `packages/components/src/badge/badge.with-icon.example.ts`
- Create: `packages/components/src/badge/index.ts`
- Modify: `packages/components/src/public-api.ts`

**Core directive surface:** `packages/core/src/badge/badge.ts` — `KjBadge` single directive. Input: `kjBadgeVariant: input<KjBadgeVariant>('default')` where `KjBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'`. Sets `data-variant`.

- [ ] **Step 1: Create `badge.ts`**

```ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjBadge, KjBadgeVariant } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjBadge` directive.
 *
 * @doc-example Default
 *   @doc-file badge.default.example.ts
 * @doc-example Variants
 *   @doc-file badge.variants.example.ts
 * @doc-example Sizes
 *   @doc-file badge.sizes.example.ts
 * @doc-example With icon
 *   @doc-file badge.with-icon.example.ts
 * @category Library/Data display
 */
@Component({
  selector: 'kj-badge',
  standalone: true,
  imports: [KjBadge],
  template: `
    <span
      kjBadge
      class="kj-badge"
      [kjBadgeVariant]="variant()"
      [attr.data-size]="size()"
    >
      <ng-content />
    </span>
  `,
  styleUrl: './badge.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBadgeComponent {
  readonly variant = input<KjBadgeVariant>('default');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
}
```

- [ ] **Step 2: Create `badge.css`**

```css
@layer kj.component {
  .kj-badge {
    --kj-badge-bg:           var(--kj-color-primary);
    --kj-badge-fg:           var(--kj-color-primary-content);
    --kj-badge-border-color: transparent;
    --kj-badge-radius:       var(--kj-radius-selector);
    --kj-badge-padding-x:    var(--kj-space-sm);
    --kj-badge-padding-y:    0.125rem;
    --kj-badge-font-size:    0.75rem;

    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: var(--kj-badge-bg);
    color: var(--kj-badge-fg);
    border: var(--kj-border) solid var(--kj-badge-border-color);
    border-radius: var(--kj-badge-radius);
    padding: var(--kj-badge-padding-y) var(--kj-badge-padding-x);
    font: var(--kj-badge-font-size) / 1 var(--kj-font-sans);
    font-weight: 500;
  }

  .kj-badge[data-variant="secondary"] {
    --kj-badge-bg: var(--kj-color-base-200);
    --kj-badge-fg: var(--kj-color-base-content);
  }
  .kj-badge[data-variant="destructive"] {
    --kj-badge-bg: var(--kj-color-destructive);
    --kj-badge-fg: var(--kj-color-destructive-content);
  }
  .kj-badge[data-variant="outline"] {
    --kj-badge-bg: transparent;
    --kj-badge-fg: var(--kj-color-base-content);
    --kj-badge-border-color: var(--kj-color-neutral);
  }

  .kj-badge[data-size="sm"] { --kj-badge-padding-x: 0.375rem; --kj-badge-font-size: 0.6875rem; }
  .kj-badge[data-size="lg"] { --kj-badge-padding-x: var(--kj-space-md); --kj-badge-font-size: 0.875rem; }
}
```

- [ ] **Step 3: Create `badge.default.example.ts`**

```ts
import { Component } from '@angular/core';
import { KjBadgeComponent } from './badge';

@Component({
  selector: 'kj-badge-default-example',
  standalone: true,
  imports: [KjBadgeComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `<kj-badge>New</kj-badge>`,
})
export class KjBadgeDefaultExample {}
```

- [ ] **Step 4: Create `badge.variants.example.ts`**

```ts
import { Component } from '@angular/core';
import { KjBadgeComponent } from './badge';

@Component({
  selector: 'kj-badge-variants-example',
  standalone: true,
  imports: [KjBadgeComponent],
  styles: [`:host { display: flex; gap: 0.5rem; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-badge variant="default">Default</kj-badge>
    <kj-badge variant="secondary">Secondary</kj-badge>
    <kj-badge variant="destructive">Destructive</kj-badge>
    <kj-badge variant="outline">Outline</kj-badge>
  `,
})
export class KjBadgeVariantsExample {}
```

- [ ] **Step 5: Create `badge.sizes.example.ts`**

```ts
import { Component } from '@angular/core';
import { KjBadgeComponent } from './badge';

@Component({
  selector: 'kj-badge-sizes-example',
  standalone: true,
  imports: [KjBadgeComponent],
  styles: [`:host { display: flex; gap: 0.5rem; align-items: center; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-badge size="sm">Small</kj-badge>
    <kj-badge size="md">Medium</kj-badge>
    <kj-badge size="lg">Large</kj-badge>
  `,
})
export class KjBadgeSizesExample {}
```

- [ ] **Step 6: Create `badge.with-icon.example.ts`**

```ts
import { Component } from '@angular/core';
import { KjBadgeComponent } from './badge';

@Component({
  selector: 'kj-badge-with-icon-example',
  standalone: true,
  imports: [KjBadgeComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-badge variant="destructive">
      <span aria-hidden="true">●</span>
      Live
    </kj-badge>
  `,
})
export class KjBadgeWithIconExample {}
```

- [ ] **Step 7: Create `index.ts`**

```ts
export * from './badge';
```

- [ ] **Step 8: Add `export * from './badge/index';` to `public-api.ts`** (alphabetical: between `avatar` once that exists, otherwise at the top of the alpha list before `button`).

- [ ] **Step 9: Build, verify, commit**

Run `pnpm -F @kouji-ui/components build`. Open `http://localhost:4200/docs/components/badge` and verify all four panels render under **Data display** in the sidebar.

```bash
git add packages/components/src/badge/ packages/components/src/public-api.ts
git commit -m "feat(components): add KjBadgeComponent with code+preview docs"
```

---

## Task 7: Add `KjAvatarComponent` (compound: avatar + image + fallback)

**Files:**
- Create: `packages/components/src/avatar/avatar.ts`
- Create: `packages/components/src/avatar/avatar.css`
- Create: `packages/components/src/avatar/avatar.default.example.ts`
- Create: `packages/components/src/avatar/avatar.sizes.example.ts`
- Create: `packages/components/src/avatar/avatar.with-image.example.ts`
- Create: `packages/components/src/avatar/avatar.initials.example.ts`
- Create: `packages/components/src/avatar/avatar.shapes.example.ts`
- Create: `packages/components/src/avatar/index.ts`
- Modify: `packages/components/src/public-api.ts`

**Core directive surface:** `packages/core/src/avatar/avatar.ts` exports `KjAvatar`, `KjAvatarImage`, `KjAvatarFallback`. The image's load state is shared via `KJ_AVATAR` injection token. The wrapper exposes three components — `KjAvatarComponent` (root), `KjAvatarImageComponent`, `KjAvatarFallbackComponent` — each `display: contents` and rendering its semantic element.

- [ ] **Step 1: Create `avatar.ts` (three components in one file)**

```ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjAvatar, KjAvatarImage, KjAvatarFallback } from '@kouji-ui/core';

/**
 * Avatar root container. Use `<kj-avatar-image>` and `<kj-avatar-fallback>` inside.
 *
 * @doc-example Default
 *   @doc-file avatar.default.example.ts
 * @doc-example Sizes
 *   @doc-file avatar.sizes.example.ts
 * @doc-example With image
 *   @doc-file avatar.with-image.example.ts
 * @doc-example Initials fallback
 *   @doc-file avatar.initials.example.ts
 * @doc-example Shapes
 *   @doc-file avatar.shapes.example.ts
 * @category Library/Data display
 */
@Component({
  selector: 'kj-avatar',
  standalone: true,
  imports: [KjAvatar],
  template: `
    <span
      kjAvatar
      class="kj-avatar"
      [attr.data-size]="size()"
      [attr.data-shape]="shape()"
    >
      <ng-content />
    </span>
  `,
  styleUrl: './avatar.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAvatarComponent {
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly shape = input<'circle' | 'rounded'>('circle');
}

/** Image element inside `<kj-avatar>`. Sets `data-loaded` once the image loads. */
@Component({
  selector: 'kj-avatar-image',
  standalone: true,
  imports: [KjAvatarImage],
  template: `<img kjAvatarImage class="kj-avatar-image" [src]="src()" [alt]="alt()" />`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAvatarImageComponent {
  readonly src = input.required<string>();
  readonly alt = input.required<string>();
}

/** Fallback shown when the image is missing or has not loaded. */
@Component({
  selector: 'kj-avatar-fallback',
  standalone: true,
  imports: [KjAvatarFallback],
  template: `<span kjAvatarFallback class="kj-avatar-fallback"><ng-content /></span>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAvatarFallbackComponent {}
```

- [ ] **Step 2: Create `avatar.css`**

```css
@layer kj.component {
  .kj-avatar {
    --kj-avatar-size:   2.5rem;
    --kj-avatar-bg:     var(--kj-color-base-200);
    --kj-avatar-fg:     var(--kj-color-base-content);
    --kj-avatar-radius: 9999px;

    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--kj-avatar-size);
    height: var(--kj-avatar-size);
    background: var(--kj-avatar-bg);
    color: var(--kj-avatar-fg);
    border-radius: var(--kj-avatar-radius);
    overflow: hidden;
    font: 0.875rem / 1 var(--kj-font-sans);
    font-weight: 600;
  }

  .kj-avatar[data-shape="rounded"] { --kj-avatar-radius: var(--kj-radius-box); }

  .kj-avatar[data-size="xs"] { --kj-avatar-size: 1.5rem; font-size: 0.6875rem; }
  .kj-avatar[data-size="sm"] { --kj-avatar-size: 2rem;   font-size: 0.75rem; }
  .kj-avatar[data-size="lg"] { --kj-avatar-size: 3rem;   font-size: 1rem; }
  .kj-avatar[data-size="xl"] { --kj-avatar-size: 4rem;   font-size: 1.25rem; }

  .kj-avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .kj-avatar-image:not([data-loaded]) { opacity: 0; }

  .kj-avatar-fallback {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .kj-avatar-fallback:not([data-visible]) { opacity: 0; pointer-events: none; }
}
```

- [ ] **Step 3: Create `avatar.default.example.ts`**

```ts
import { Component } from '@angular/core';
import { KjAvatarComponent, KjAvatarFallbackComponent } from './avatar';

@Component({
  selector: 'kj-avatar-default-example',
  standalone: true,
  imports: [KjAvatarComponent, KjAvatarFallbackComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-avatar>
      <kj-avatar-fallback>JD</kj-avatar-fallback>
    </kj-avatar>
  `,
})
export class KjAvatarDefaultExample {}
```

- [ ] **Step 4: Create `avatar.sizes.example.ts`**

```ts
import { Component } from '@angular/core';
import { KjAvatarComponent, KjAvatarFallbackComponent } from './avatar';

@Component({
  selector: 'kj-avatar-sizes-example',
  standalone: true,
  imports: [KjAvatarComponent, KjAvatarFallbackComponent],
  styles: [`:host { display: flex; gap: 0.75rem; align-items: center; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-avatar size="xs"><kj-avatar-fallback>XS</kj-avatar-fallback></kj-avatar>
    <kj-avatar size="sm"><kj-avatar-fallback>SM</kj-avatar-fallback></kj-avatar>
    <kj-avatar size="md"><kj-avatar-fallback>MD</kj-avatar-fallback></kj-avatar>
    <kj-avatar size="lg"><kj-avatar-fallback>LG</kj-avatar-fallback></kj-avatar>
    <kj-avatar size="xl"><kj-avatar-fallback>XL</kj-avatar-fallback></kj-avatar>
  `,
})
export class KjAvatarSizesExample {}
```

- [ ] **Step 5: Create `avatar.with-image.example.ts`**

```ts
import { Component } from '@angular/core';
import { KjAvatarComponent, KjAvatarImageComponent, KjAvatarFallbackComponent } from './avatar';

@Component({
  selector: 'kj-avatar-with-image-example',
  standalone: true,
  imports: [KjAvatarComponent, KjAvatarImageComponent, KjAvatarFallbackComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-avatar size="lg">
      <kj-avatar-image src="https://i.pravatar.cc/96?img=12" alt="Jane Doe" />
      <kj-avatar-fallback>JD</kj-avatar-fallback>
    </kj-avatar>
  `,
})
export class KjAvatarWithImageExample {}
```

- [ ] **Step 6: Create `avatar.initials.example.ts`**

```ts
import { Component } from '@angular/core';
import { KjAvatarComponent, KjAvatarImageComponent, KjAvatarFallbackComponent } from './avatar';

@Component({
  selector: 'kj-avatar-initials-example',
  standalone: true,
  imports: [KjAvatarComponent, KjAvatarImageComponent, KjAvatarFallbackComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-avatar size="lg">
      <kj-avatar-image src="https://example.invalid/missing.png" alt="Missing" />
      <kj-avatar-fallback>NA</kj-avatar-fallback>
    </kj-avatar>
  `,
})
export class KjAvatarInitialsExample {}
```

- [ ] **Step 7: Create `avatar.shapes.example.ts`**

```ts
import { Component } from '@angular/core';
import { KjAvatarComponent, KjAvatarFallbackComponent } from './avatar';

@Component({
  selector: 'kj-avatar-shapes-example',
  standalone: true,
  imports: [KjAvatarComponent, KjAvatarFallbackComponent],
  styles: [`:host { display: flex; gap: 0.75rem; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-avatar shape="circle"><kj-avatar-fallback>C</kj-avatar-fallback></kj-avatar>
    <kj-avatar shape="rounded"><kj-avatar-fallback>R</kj-avatar-fallback></kj-avatar>
  `,
})
export class KjAvatarShapesExample {}
```

- [ ] **Step 8: Create `index.ts`**

```ts
export * from './avatar';
```

- [ ] **Step 9: Add `export * from './avatar/index';` to `public-api.ts`** (alphabetical: very top of new exports, before `badge`).

- [ ] **Step 10: Build, verify, commit**

Run `pnpm -F @kouji-ui/components build`. Open `http://localhost:4200/docs/components/avatar` and verify all five panels render. Note: the *Initials fallback* example intentionally uses a missing URL to exercise the fallback path; check the fallback "NA" appears.

```bash
git add packages/components/src/avatar/ packages/components/src/public-api.ts
git commit -m "feat(components): add KjAvatarComponent (root + image + fallback) with code+preview docs"
```

---

## Task 8: Add `KjAccordionComponent` (compound: accordion + item + trigger + content)

**Files:**
- Create: `packages/components/src/accordion/accordion.ts`
- Create: `packages/components/src/accordion/accordion.css`
- Create: `packages/components/src/accordion/accordion.default.example.ts`
- Create: `packages/components/src/accordion/accordion.multiple.example.ts`
- Create: `packages/components/src/accordion/accordion.disabled.example.ts`
- Create: `packages/components/src/accordion/accordion.rich-content.example.ts`
- Create: `packages/components/src/accordion/index.ts`
- Modify: `packages/components/src/public-api.ts`

**Core directive surface:** `packages/core/src/accordion/accordion.ts` — `KjAccordion` (root, `kjAccordionType: 'single'|'multiple'`), `KjAccordionItem` (`kjItemValue: string` required), `KjAccordionTrigger`, `KjAccordionContent`. Read the file once at task start to confirm `KjAccordionTrigger` and `KjAccordionContent` host bindings (they're in the lower half of the file beyond the 80 lines previewed during planning).

- [ ] **Step 1: Read `packages/core/src/accordion/accordion.ts`**

Open the file. Note the inputs and host attribute bindings of `KjAccordionTrigger` and `KjAccordionContent`. Trigger handles click → `item.toggle()` and exposes `aria-expanded` / `aria-controls`. Content sets `[hidden]` based on `item.expanded()`. The wrapper components below assume this surface; if it diverges, adjust the wrapper templates accordingly.

- [ ] **Step 2: Create `accordion.ts`**

```ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjAccordion, KjAccordionItem, KjAccordionTrigger, KjAccordionContent } from '@kouji-ui/core';

/**
 * Root accordion container.
 *
 * @doc-example Default
 *   @doc-file accordion.default.example.ts
 * @doc-example Multiple open
 *   @doc-file accordion.multiple.example.ts
 * @doc-example Disabled item
 *   @doc-file accordion.disabled.example.ts
 * @doc-example Rich content
 *   @doc-file accordion.rich-content.example.ts
 * @category Library/Data display
 */
@Component({
  selector: 'kj-accordion',
  standalone: true,
  imports: [KjAccordion],
  template: `<div kjAccordion [kjAccordionType]="type()" class="kj-accordion"><ng-content /></div>`,
  styleUrl: './accordion.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAccordionComponent {
  readonly type = input<'single' | 'multiple'>('single');
}

/** Single accordion item. Provide a unique `value`. */
@Component({
  selector: 'kj-accordion-item',
  standalone: true,
  imports: [KjAccordionItem],
  template: `<div kjAccordionItem [kjItemValue]="value()" class="kj-accordion-item"><ng-content /></div>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAccordionItemComponent {
  readonly value = input.required<string>();
}

/** Click target that toggles the parent item. */
@Component({
  selector: 'kj-accordion-trigger',
  standalone: true,
  imports: [KjAccordionTrigger],
  template: `<button type="button" kjAccordionTrigger class="kj-accordion-trigger"><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAccordionTriggerComponent {}

/** Body shown when the parent item is expanded. */
@Component({
  selector: 'kj-accordion-content',
  standalone: true,
  imports: [KjAccordionContent],
  template: `<div kjAccordionContent class="kj-accordion-content"><ng-content /></div>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAccordionContentComponent {}
```

- [ ] **Step 3: Create `accordion.css`**

```css
@layer kj.component {
  .kj-accordion {
    --kj-accordion-bg:     var(--kj-color-base-100);
    --kj-accordion-border: var(--kj-color-base-300);
    --kj-accordion-radius: var(--kj-radius-box);

    display: block;
    background: var(--kj-accordion-bg);
    border: var(--kj-border) solid var(--kj-accordion-border);
    border-radius: var(--kj-accordion-radius);
    overflow: hidden;
  }

  .kj-accordion-item + .kj-accordion-item { border-top: var(--kj-border) solid var(--kj-accordion-border); }

  .kj-accordion-trigger {
    width: 100%;
    text-align: left;
    background: none;
    border: 0;
    padding: var(--kj-space-md) var(--kj-space-lg);
    color: var(--kj-color-base-content);
    font: 0.875rem / 1.4 var(--kj-font-sans);
    font-weight: 600;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .kj-accordion-trigger::after {
    content: '▾';
    transition: transform 0.15s;
  }
  .kj-accordion-trigger[aria-expanded="true"]::after { transform: rotate(180deg); }
  .kj-accordion-trigger:focus-visible { outline: 2px solid var(--kj-color-primary); outline-offset: -2px; }
  .kj-accordion-trigger[aria-disabled="true"] { opacity: 0.45; cursor: not-allowed; }

  .kj-accordion-content {
    padding: 0 var(--kj-space-lg) var(--kj-space-md);
    color: var(--kj-color-base-content);
    font: 0.875rem / 1.5 var(--kj-font-sans);
  }
  .kj-accordion-content[hidden] { display: none; }
}
```

- [ ] **Step 4: Create `accordion.default.example.ts`**

```ts
import { Component } from '@angular/core';
import {
  KjAccordionComponent, KjAccordionItemComponent,
  KjAccordionTriggerComponent, KjAccordionContentComponent,
} from './accordion';

@Component({
  selector: 'kj-accordion-default-example',
  standalone: true,
  imports: [KjAccordionComponent, KjAccordionItemComponent, KjAccordionTriggerComponent, KjAccordionContentComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-accordion>
      <kj-accordion-item value="one">
        <kj-accordion-trigger>What is kouji-ui?</kj-accordion-trigger>
        <kj-accordion-content>A headless-first component library for Angular.</kj-accordion-content>
      </kj-accordion-item>
      <kj-accordion-item value="two">
        <kj-accordion-trigger>Is it free?</kj-accordion-trigger>
        <kj-accordion-content>Yes — MIT licensed.</kj-accordion-content>
      </kj-accordion-item>
    </kj-accordion>
  `,
})
export class KjAccordionDefaultExample {}
```

- [ ] **Step 5: Create `accordion.multiple.example.ts`**

Same imports/styles as Step 4. Template:

```ts
template: `
  <kj-accordion type="multiple">
    <kj-accordion-item value="a">
      <kj-accordion-trigger>Section A</kj-accordion-trigger>
      <kj-accordion-content>Both can be open at once.</kj-accordion-content>
    </kj-accordion-item>
    <kj-accordion-item value="b">
      <kj-accordion-trigger>Section B</kj-accordion-trigger>
      <kj-accordion-content>Click to confirm.</kj-accordion-content>
    </kj-accordion-item>
  </kj-accordion>
`,
```

Class name: `KjAccordionMultipleExample`. Selector: `kj-accordion-multiple-example`.

- [ ] **Step 6: Create `accordion.disabled.example.ts`**

Same imports/styles. The core `KjAccordionItem` does not currently expose a `disabled` input on the directive; rendering a disabled state visually is done by the trigger via `aria-disabled`. Confirm by re-reading the directive in Step 1. If unsupported, render this example with the trigger element's native `disabled` attribute and skip wiring through a wrapper input. Template:

```ts
template: `
  <kj-accordion>
    <kj-accordion-item value="a">
      <kj-accordion-trigger>Available</kj-accordion-trigger>
      <kj-accordion-content>Open me.</kj-accordion-content>
    </kj-accordion-item>
    <kj-accordion-item value="b">
      <button kjAccordionTrigger type="button" class="kj-accordion-trigger" disabled aria-disabled="true">
        Locked
      </button>
    </kj-accordion-item>
  </kj-accordion>
`,
```

You will need to import `KjAccordionTrigger` from `@kouji-ui/core` for the inline disabled trigger to compile. Add it to `imports`.

Class name: `KjAccordionDisabledExample`. Selector: `kj-accordion-disabled-example`.

- [ ] **Step 7: Create `accordion.rich-content.example.ts`**

Same setup as Step 4. Template:

```ts
template: `
  <kj-accordion type="multiple">
    <kj-accordion-item value="features">
      <kj-accordion-trigger>Features</kj-accordion-trigger>
      <kj-accordion-content>
        <ul style="margin:0; padding-left:1.25rem;">
          <li>Headless directives</li>
          <li>Signal inputs</li>
          <li>WCAG 2.1 AAA target</li>
        </ul>
      </kj-accordion-content>
    </kj-accordion-item>
    <kj-accordion-item value="snippet">
      <kj-accordion-trigger>Code sample</kj-accordion-trigger>
      <kj-accordion-content>
        <pre style="margin:0; font: 0.8125rem var(--kj-font-mono);">npm i @kouji-ui/components</pre>
      </kj-accordion-content>
    </kj-accordion-item>
  </kj-accordion>
`,
```

Class name: `KjAccordionRichContentExample`.

- [ ] **Step 8: Create `index.ts`**

```ts
export * from './accordion';
```

- [ ] **Step 9: Add `export * from './accordion/index';` to `public-api.ts`** (alphabetical: top, before `avatar`).

- [ ] **Step 10: Build, verify, commit**

```bash
pnpm -F @kouji-ui/components build
# open http://localhost:4200/docs/components/accordion — confirm 4 panels render
git add packages/components/src/accordion/ packages/components/src/public-api.ts
git commit -m "feat(components): add KjAccordionComponent + sub-components with code+preview docs"
```

---

## Task 9: Add `KjRadioComponent` (compound: group + radio)

**Files:**
- Create: `packages/components/src/radio/radio.ts`, `radio.css`, `index.ts`
- Create: `radio.default.example.ts`, `radio.group.example.ts`, `radio.disabled.example.ts`, `radio.inline.example.ts`
- Modify: `packages/components/src/public-api.ts`

**Core directive surface:** `packages/core/src/radio/radio.ts` — `KjRadioGroup` (`kjValue: model<unknown>`), `KjRadio` (`kjRadioValue: input.required<unknown>`, plus `kjDisabled` via host directive).

- [ ] **Step 1: Create `radio.ts`**

```ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, model } from '@angular/core';
import { KjRadioGroup, KjRadio } from '@kouji-ui/core';

/**
 * Radio group root. Two-way bind via `[(value)]`.
 *
 * @doc-example Default
 *   @doc-file radio.default.example.ts
 * @doc-example Group
 *   @doc-file radio.group.example.ts
 * @doc-example Disabled
 *   @doc-file radio.disabled.example.ts
 * @doc-example Inline
 *   @doc-file radio.inline.example.ts
 * @category Library/Data input
 */
@Component({
  selector: 'kj-radio-group',
  standalone: true,
  imports: [KjRadioGroup],
  template: `
    <div
      kjRadioGroup
      class="kj-radio-group"
      [(kjValue)]="value"
      [attr.data-orientation]="orientation()"
      [attr.aria-label]="ariaLabel()"
    ><ng-content /></div>
  `,
  styleUrl: './radio.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjRadioGroupComponent {
  readonly value = model<unknown>(undefined);
  readonly orientation = input<'horizontal' | 'vertical'>('vertical');
  readonly ariaLabel = input<string | undefined>(undefined);
}

/** Single radio button. Must live inside `<kj-radio-group>`. */
@Component({
  selector: 'kj-radio',
  standalone: true,
  imports: [KjRadio],
  template: `
    <span
      kjRadio
      tabindex="0"
      class="kj-radio"
      [kjRadioValue]="value()"
      [kjDisabled]="disabled()"
    ></span>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjRadioComponent {
  readonly value = input.required<unknown>();
  readonly disabled = input(false);
}
```

- [ ] **Step 2: Create `radio.css`**

```css
@layer kj.component {
  .kj-radio-group {
    display: flex;
    flex-direction: column;
    gap: var(--kj-space-sm);
  }
  .kj-radio-group[data-orientation="horizontal"] { flex-direction: row; gap: var(--kj-space-lg); }

  .kj-radio {
    --kj-radio-size:        1rem;
    --kj-radio-border:      var(--kj-color-neutral);
    --kj-radio-bg-checked:  var(--kj-color-primary);

    display: inline-block;
    width: var(--kj-radio-size);
    height: var(--kj-radio-size);
    border: var(--kj-border) solid var(--kj-radio-border);
    border-radius: 9999px;
    background: var(--kj-color-base-100);
    cursor: pointer;
    position: relative;
    transition: var(--kj-transition);
  }
  .kj-radio[data-checked]::after {
    content: '';
    position: absolute;
    inset: 25%;
    border-radius: 9999px;
    background: var(--kj-radio-bg-checked);
  }
  .kj-radio[data-checked] { border-color: var(--kj-radio-bg-checked); }
  .kj-radio:focus-visible { outline: 2px solid var(--kj-color-primary); outline-offset: 2px; }
  .kj-radio[aria-disabled="true"] { opacity: 0.45; cursor: not-allowed; pointer-events: none; }
}
```

- [ ] **Step 3: Create the 4 example files**

Each follows the canonical example shape with these templates. Class names: `KjRadioDefaultExample`, `KjRadioGroupExample`, `KjRadioDisabledExample`, `KjRadioInlineExample`.

`radio.default.example.ts` — single small group, two options:

```ts
import { Component, signal } from '@angular/core';
import { KjRadioGroupComponent, KjRadioComponent } from './radio';

@Component({
  selector: 'kj-radio-default-example',
  standalone: true,
  imports: [KjRadioGroupComponent, KjRadioComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    label { display: inline-flex; align-items: center; gap: var(--kj-space-sm); }
  `],
  template: `
    <kj-radio-group [(value)]="size" ariaLabel="Size">
      <label><kj-radio [value]="'s'"></kj-radio> Small</label>
      <label><kj-radio [value]="'m'"></kj-radio> Medium</label>
      <label><kj-radio [value]="'l'"></kj-radio> Large</label>
    </kj-radio-group>
  `,
})
export class KjRadioDefaultExample { readonly size = signal<'s'|'m'|'l'>('m'); }
```

`radio.group.example.ts` — same shape, four options, vertical (already default):

```ts
template: `
  <kj-radio-group [(value)]="plan" ariaLabel="Plan">
    <label><kj-radio [value]="'free'"></kj-radio> Free</label>
    <label><kj-radio [value]="'pro'"></kj-radio> Pro</label>
    <label><kj-radio [value]="'team'"></kj-radio> Team</label>
    <label><kj-radio [value]="'enterprise'"></kj-radio> Enterprise</label>
  </kj-radio-group>
`,
```
Field: `readonly plan = signal<'free'|'pro'|'team'|'enterprise'>('pro');`

`radio.disabled.example.ts`:

```ts
template: `
  <kj-radio-group [(value)]="choice" ariaLabel="Choice">
    <label><kj-radio [value]="'a'"></kj-radio> Option A</label>
    <label><kj-radio [value]="'b'" [disabled]="true"></kj-radio> Option B (disabled)</label>
    <label><kj-radio [value]="'c'"></kj-radio> Option C</label>
  </kj-radio-group>
`,
```
Field: `readonly choice = signal<'a'|'b'|'c'>('a');`

`radio.inline.example.ts`:

```ts
template: `
  <kj-radio-group [(value)]="vote" orientation="horizontal" ariaLabel="Vote">
    <label><kj-radio [value]="'yes'"></kj-radio> Yes</label>
    <label><kj-radio [value]="'no'"></kj-radio> No</label>
    <label><kj-radio [value]="'abstain'"></kj-radio> Abstain</label>
  </kj-radio-group>
`,
```
Field: `readonly vote = signal<'yes'|'no'|'abstain'>('yes');`

- [ ] **Step 4: Create `index.ts` (`export * from './radio';`)**

- [ ] **Step 5: Add `export * from './radio/index';` to `public-api.ts`** (alphabetical: between `link` and `select`).

- [ ] **Step 6: Build, verify, commit**

```bash
pnpm -F @kouji-ui/components build
# verify http://localhost:4200/docs/components/radio
git add packages/components/src/radio/ packages/components/src/public-api.ts
git commit -m "feat(components): add KjRadioGroupComponent + KjRadioComponent with code+preview docs"
```

---

## Task 10: Add `KjSelectComponent` (compound: select + trigger + content + option)

**Files:**
- Create: `packages/components/src/select/select.ts`, `select.css`, `index.ts`
- Create: `select.default.example.ts`, `select.placeholder.example.ts`, `select.disabled.example.ts`, `select.grouped.example.ts`
- Modify: `packages/components/src/public-api.ts`

**Core directive surface:** `packages/core/src/select/select.ts` — `KjSelect` (`kjSelectValue: model<unknown>`), `KjSelectTrigger`, `KjSelectContent`, `KjOption` (`kjOptionValue: input<unknown>`). Confirm by reading the file.

- [ ] **Step 1: Read `packages/core/src/select/select.ts`** to confirm `KjSelectTrigger` and `KjOption` host bindings (open/close, aria-selected, click handlers).

- [ ] **Step 2: Create `select.ts`**

```ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, model } from '@angular/core';
import { KjSelect, KjSelectTrigger, KjSelectContent, KjOption } from '@kouji-ui/core';

/**
 * Select root. Two-way bind via `[(value)]`.
 *
 * @doc-example Default
 *   @doc-file select.default.example.ts
 * @doc-example With placeholder
 *   @doc-file select.placeholder.example.ts
 * @doc-example Disabled
 *   @doc-file select.disabled.example.ts
 * @doc-example Grouped options
 *   @doc-file select.grouped.example.ts
 * @category Library/Data input
 */
@Component({
  selector: 'kj-select',
  standalone: true,
  imports: [KjSelect],
  template: `<div kjSelect [(kjSelectValue)]="value" class="kj-select" [attr.data-disabled]="disabled() ? '' : null"><ng-content /></div>`,
  styleUrl: './select.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSelectComponent {
  readonly value = model<unknown>(undefined);
  readonly disabled = input(false);
}

/** Visible button that toggles the listbox. */
@Component({
  selector: 'kj-select-trigger',
  standalone: true,
  imports: [KjSelectTrigger],
  template: `
    <button type="button" kjSelectTrigger class="kj-select-trigger" aria-haspopup="listbox">
      <span class="kj-select-trigger-label"><ng-content /></span>
      <span class="kj-select-trigger-caret" aria-hidden="true">▾</span>
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSelectTriggerComponent {}

/** Listbox panel containing options. */
@Component({
  selector: 'kj-select-content',
  standalone: true,
  imports: [KjSelectContent],
  template: `<div kjSelectContent role="listbox" class="kj-select-content"><ng-content /></div>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSelectContentComponent {}

/** Single option row. */
@Component({
  selector: 'kj-option',
  standalone: true,
  imports: [KjOption],
  template: `<div kjOption [kjOptionValue]="value()" class="kj-option" tabindex="-1"><ng-content /></div>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjOptionComponent {
  readonly value = input.required<unknown>();
}
```

- [ ] **Step 3: Create `select.css`**

```css
@layer kj.component {
  .kj-select { position: relative; display: inline-block; min-width: 12rem; }

  .kj-select-trigger {
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--kj-space-sm);
    background: var(--kj-color-base-100);
    color: var(--kj-color-base-content);
    border: var(--kj-border) solid var(--kj-color-base-300);
    border-radius: var(--kj-radius-field);
    padding: var(--kj-space-sm) var(--kj-space-md);
    font: 0.875rem var(--kj-font-sans);
    cursor: pointer;
  }
  .kj-select-trigger:focus-visible { outline: 2px solid var(--kj-color-primary); outline-offset: 2px; }
  .kj-select[data-disabled] .kj-select-trigger { opacity: 0.45; cursor: not-allowed; pointer-events: none; }

  .kj-select-content {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    background: var(--kj-color-base-100);
    border: var(--kj-border) solid var(--kj-color-base-300);
    border-radius: var(--kj-radius-field);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.12);
    padding: 4px;
    max-height: 16rem;
    overflow: auto;
    z-index: 100;
  }
  .kj-select-content[hidden] { display: none; }

  .kj-option {
    padding: var(--kj-space-sm) var(--kj-space-md);
    border-radius: var(--kj-radius-selector);
    cursor: pointer;
    color: var(--kj-color-base-content);
    font: 0.875rem var(--kj-font-sans);
  }
  .kj-option:hover, .kj-option[aria-selected="true"] { background: var(--kj-color-base-200); }
}
```

- [ ] **Step 4: Create the 4 example files**

`select.default.example.ts`:

```ts
import { Component, signal } from '@angular/core';
import { KjSelectComponent, KjSelectTriggerComponent, KjSelectContentComponent, KjOptionComponent } from './select';

@Component({
  selector: 'kj-select-default-example',
  standalone: true,
  imports: [KjSelectComponent, KjSelectTriggerComponent, KjSelectContentComponent, KjOptionComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-select [(value)]="fruit">
      <kj-select-trigger>{{ fruit() ?? 'Choose a fruit' }}</kj-select-trigger>
      <kj-select-content>
        <kj-option [value]="'apple'">Apple</kj-option>
        <kj-option [value]="'banana'">Banana</kj-option>
        <kj-option [value]="'cherry'">Cherry</kj-option>
      </kj-select-content>
    </kj-select>
  `,
})
export class KjSelectDefaultExample { readonly fruit = signal<string | undefined>(undefined); }
```

`select.placeholder.example.ts` — same imports/styles. Same as default but with the placeholder visible (initial value `undefined` and trigger showing fallback text). Class `KjSelectPlaceholderExample`.

`select.disabled.example.ts` — same imports/styles, set `[disabled]="true"` on `<kj-select>`. Class `KjSelectDisabledExample`. Template:

```ts
template: `
  <kj-select [(value)]="lang" [disabled]="true">
    <kj-select-trigger>{{ lang() ?? 'Locked' }}</kj-select-trigger>
    <kj-select-content>
      <kj-option [value]="'en'">English</kj-option>
    </kj-select-content>
  </kj-select>
`,
```
Field: `readonly lang = signal<string | undefined>('en');`

`select.grouped.example.ts` — same imports/styles. Add visual group separators using plain `<div>`s with a label class:

```ts
styles: [`
  :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
  .group-label { padding: 4px 12px; font-size: 0.75rem; color: var(--kj-color-base-content); opacity: 0.6; text-transform: uppercase; letter-spacing: 0.05em; }
`],
template: `
  <kj-select [(value)]="city">
    <kj-select-trigger>{{ city() ?? 'Choose a city' }}</kj-select-trigger>
    <kj-select-content>
      <div class="group-label">Europe</div>
      <kj-option [value]="'london'">London</kj-option>
      <kj-option [value]="'berlin'">Berlin</kj-option>
      <div class="group-label">Asia</div>
      <kj-option [value]="'tokyo'">Tokyo</kj-option>
      <kj-option [value]="'seoul'">Seoul</kj-option>
    </kj-select-content>
  </kj-select>
`,
```
Field: `readonly city = signal<string | undefined>(undefined);` Class `KjSelectGroupedExample`.

- [ ] **Step 5: Create `index.ts`** (`export * from './select';`)

- [ ] **Step 6: Add `export * from './select/index';` to `public-api.ts`** (alphabetical: between `radio` and `tabs`).

- [ ] **Step 7: Build, verify, commit**

```bash
pnpm -F @kouji-ui/components build
# verify http://localhost:4200/docs/components/select
git add packages/components/src/select/ packages/components/src/public-api.ts
git commit -m "feat(components): add KjSelectComponent + sub-components with code+preview docs"
```

---

## Task 11: Add `KjMenuComponent` (compound: menu + trigger + content + item)

**Files:**
- Create: `packages/components/src/menu/menu.ts`, `menu.css`, `index.ts`
- Create: `menu.default.example.ts`, `menu.sub-items.example.ts`, `menu.disabled.example.ts`, `menu.shortcuts.example.ts`
- Modify: `packages/components/src/public-api.ts`

**Core directive surface:** `packages/core/src/menu/menu.ts` — `KjMenu` (root, no inputs), `KjMenuTrigger`, `KjMenuContent` (handles keyboard + click-outside), `KjMenuItem`, `KjMenuClose`.

- [ ] **Step 1: Read `packages/core/src/menu/menu.ts`** end-to-end. Confirm `KjMenuItem`'s inputs (it likely accepts `kjDisabled` via host directive but verify).

- [ ] **Step 2: Create `menu.ts`** with four component classes, following the avatar/accordion compound pattern. Each is `display: contents`, renders the semantic element with the `kj*` directive applied, and projects content. Selectors: `kj-menu`, `kj-menu-trigger`, `kj-menu-content`, `kj-menu-item`. The `KjMenuItemComponent` exposes `disabled = input(false)` and binds `[kjDisabled]="disabled()"`. The `KjMenuTriggerComponent` template is a `<button type="button" kjMenuTrigger>`. The `KjMenuContentComponent` renders `<div kjMenuContent role="menu">`.

```ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjMenu, KjMenuTrigger, KjMenuContent, KjMenuItem } from '@kouji-ui/core';

/**
 * Menu root.
 *
 * @doc-example Default
 *   @doc-file menu.default.example.ts
 * @doc-example With sub-items
 *   @doc-file menu.sub-items.example.ts
 * @doc-example Disabled item
 *   @doc-file menu.disabled.example.ts
 * @doc-example With shortcuts
 *   @doc-file menu.shortcuts.example.ts
 * @category Library/Navigation
 */
@Component({
  selector: 'kj-menu',
  standalone: true,
  imports: [KjMenu],
  template: `<div kjMenu class="kj-menu"><ng-content /></div>`,
  styleUrl: './menu.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMenuComponent {}

@Component({
  selector: 'kj-menu-trigger',
  standalone: true,
  imports: [KjMenuTrigger],
  template: `<button type="button" kjMenuTrigger class="kj-menu-trigger"><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMenuTriggerComponent {}

@Component({
  selector: 'kj-menu-content',
  standalone: true,
  imports: [KjMenuContent],
  template: `<div kjMenuContent class="kj-menu-content"><ng-content /></div>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMenuContentComponent {}

@Component({
  selector: 'kj-menu-item',
  standalone: true,
  imports: [KjMenuItem],
  template: `<button type="button" kjMenuItem class="kj-menu-item" [kjDisabled]="disabled()"><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMenuItemComponent {
  readonly disabled = input(false);
}
```

If `KjMenuItem` does not accept `kjDisabled` via `hostDirectives` (verify in Step 1), drop the `[kjDisabled]` binding; the styled `[aria-disabled]="…"` plus `disabled` attribute on the button is sufficient for visual disabling.

- [ ] **Step 3: Create `menu.css`**

```css
@layer kj.component {
  .kj-menu { position: relative; display: inline-block; }
  .kj-menu-trigger {
    background: var(--kj-color-base-100);
    color: var(--kj-color-base-content);
    border: var(--kj-border) solid var(--kj-color-base-300);
    border-radius: var(--kj-radius-field);
    padding: var(--kj-space-sm) var(--kj-space-md);
    font: 0.875rem var(--kj-font-sans);
    cursor: pointer;
  }
  .kj-menu-trigger:focus-visible { outline: 2px solid var(--kj-color-primary); outline-offset: 2px; }

  .kj-menu-content {
    position: absolute;
    top: 100%; left: 0;
    margin-top: 4px;
    min-width: 12rem;
    background: var(--kj-color-base-100);
    border: var(--kj-border) solid var(--kj-color-base-300);
    border-radius: var(--kj-radius-field);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.12);
    padding: 4px;
    z-index: 100;
  }
  .kj-menu-content[hidden] { display: none; }

  .kj-menu-item {
    width: 100%;
    text-align: left;
    background: none;
    border: 0;
    padding: var(--kj-space-sm) var(--kj-space-md);
    font: 0.875rem var(--kj-font-sans);
    color: var(--kj-color-base-content);
    border-radius: var(--kj-radius-selector);
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }
  .kj-menu-item:hover, .kj-menu-item:focus-visible { background: var(--kj-color-base-200); outline: none; }
  .kj-menu-item[aria-disabled="true"], .kj-menu-item:disabled { opacity: 0.45; cursor: not-allowed; pointer-events: none; }
}
```

- [ ] **Step 4: Create the 4 example files** (each with the canonical example shape)

`menu.default.example.ts`:

```ts
import { Component } from '@angular/core';
import { KjMenuComponent, KjMenuTriggerComponent, KjMenuContentComponent, KjMenuItemComponent } from './menu';

@Component({
  selector: 'kj-menu-default-example',
  standalone: true,
  imports: [KjMenuComponent, KjMenuTriggerComponent, KjMenuContentComponent, KjMenuItemComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-menu>
      <kj-menu-trigger>Actions</kj-menu-trigger>
      <kj-menu-content>
        <kj-menu-item>Edit</kj-menu-item>
        <kj-menu-item>Duplicate</kj-menu-item>
        <kj-menu-item>Delete</kj-menu-item>
      </kj-menu-content>
    </kj-menu>
  `,
})
export class KjMenuDefaultExample {}
```

`menu.sub-items.example.ts` — add a visual subgroup with a `<div class="kj-menu-section">` between items. Class `KjMenuSubItemsExample`. Same imports as Step 4. Template:

```ts
template: `
  <kj-menu>
    <kj-menu-trigger>File</kj-menu-trigger>
    <kj-menu-content>
      <kj-menu-item>New</kj-menu-item>
      <kj-menu-item>Open</kj-menu-item>
      <hr style="border:0; border-top:1px solid var(--kj-color-base-300); margin:4px 0;" />
      <kj-menu-item>Save</kj-menu-item>
      <kj-menu-item>Save as…</kj-menu-item>
      <hr style="border:0; border-top:1px solid var(--kj-color-base-300); margin:4px 0;" />
      <kj-menu-item>Quit</kj-menu-item>
    </kj-menu-content>
  </kj-menu>
`,
```

`menu.disabled.example.ts` — class `KjMenuDisabledExample`:

```ts
template: `
  <kj-menu>
    <kj-menu-trigger>Edit</kj-menu-trigger>
    <kj-menu-content>
      <kj-menu-item>Cut</kj-menu-item>
      <kj-menu-item>Copy</kj-menu-item>
      <kj-menu-item [disabled]="true">Paste</kj-menu-item>
    </kj-menu-content>
  </kj-menu>
`,
```

`menu.shortcuts.example.ts` — class `KjMenuShortcutsExample`. Use a styled `<kbd>` element on the right of each item:

```ts
styles: [`
  :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
  kbd { font: 0.75rem var(--kj-font-mono); background: var(--kj-color-base-200); padding: 2px 6px; border-radius: 4px; color: var(--kj-color-base-content); opacity: 0.7; }
`],
template: `
  <kj-menu>
    <kj-menu-trigger>Edit</kj-menu-trigger>
    <kj-menu-content>
      <kj-menu-item>Undo<kbd>⌘Z</kbd></kj-menu-item>
      <kj-menu-item>Redo<kbd>⇧⌘Z</kbd></kj-menu-item>
      <kj-menu-item>Cut<kbd>⌘X</kbd></kj-menu-item>
    </kj-menu-content>
  </kj-menu>
`,
```

- [ ] **Step 5: Create `index.ts`, add to `public-api.ts`** (alphabetical: between `link` and `radio`).

- [ ] **Step 6: Build, verify, commit**

```bash
pnpm -F @kouji-ui/components build
# verify http://localhost:4200/docs/components/menu
git add packages/components/src/menu/ packages/components/src/public-api.ts
git commit -m "feat(components): add KjMenuComponent + sub-components with code+preview docs"
```

---

## Task 12: Add `KjTabsComponent` (compound: tabs + tablist + tab + tabpanel)

**Files:**
- Create: `packages/components/src/tabs/tabs.ts`, `tabs.css`, `index.ts`
- Create: `tabs.default.example.ts`, `tabs.pills.example.ts`, `tabs.disabled.example.ts`, `tabs.vertical.example.ts`
- Modify: `packages/components/src/public-api.ts`

**Core directive surface:** `packages/core/src/tabs/tabs.ts` — `KjTabs` (`kjTabsValue: model<string>`), `KjTabList` (sets `role=tablist`), `KjTab` (`kjTabValue: input<string>`), `KjTabPanel` (`kjPanelFor: input<string>`).

- [ ] **Step 1: Read `packages/core/src/tabs/tabs.ts`** to confirm input names and host bindings.

- [ ] **Step 2: Create `tabs.ts`** with four component classes:

```ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, model } from '@angular/core';
import { KjTabs, KjTabList, KjTab, KjTabPanel } from '@kouji-ui/core';

/**
 * Tabs root.
 *
 * @doc-example Default
 *   @doc-file tabs.default.example.ts
 * @doc-example Pills
 *   @doc-file tabs.pills.example.ts
 * @doc-example Disabled tab
 *   @doc-file tabs.disabled.example.ts
 * @doc-example Vertical
 *   @doc-file tabs.vertical.example.ts
 * @category Library/Navigation
 */
@Component({
  selector: 'kj-tabs',
  standalone: true,
  imports: [KjTabs],
  template: `
    <div
      kjTabs
      class="kj-tabs"
      [(kjTabsValue)]="value"
      [attr.data-variant]="variant()"
      [attr.data-orientation]="orientation()"
    ><ng-content /></div>
  `,
  styleUrl: './tabs.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTabsComponent {
  readonly value = model<string>('');
  readonly variant = input<'default' | 'pills'>('default');
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
}

@Component({
  selector: 'kj-tab-list',
  standalone: true,
  imports: [KjTabList],
  template: `<div kjTabList class="kj-tab-list"><ng-content /></div>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTabListComponent {}

@Component({
  selector: 'kj-tab',
  standalone: true,
  imports: [KjTab],
  template: `<button type="button" kjTab [kjTabValue]="value()" class="kj-tab" [disabled]="disabled() ? true : null"><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTabComponent {
  readonly value = input.required<string>();
  readonly disabled = input(false);
}

@Component({
  selector: 'kj-tab-panel',
  standalone: true,
  imports: [KjTabPanel],
  template: `<div kjTabPanel [kjPanelFor]="for()" class="kj-tab-panel"><ng-content /></div>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTabPanelComponent {
  readonly for = input.required<string>();
}
```

Note: `for` is a reserved word in HTML attributes but fine as a TS property — Angular won't conflate them.

- [ ] **Step 3: Create `tabs.css`**

```css
@layer kj.component {
  .kj-tabs { display: block; }
  .kj-tabs[data-orientation="vertical"] { display: grid; grid-template-columns: auto 1fr; gap: var(--kj-space-lg); }

  .kj-tab-list {
    display: flex;
    border-bottom: 1px solid var(--kj-color-base-300);
    margin-bottom: var(--kj-space-lg);
  }
  .kj-tabs[data-orientation="vertical"] .kj-tab-list { flex-direction: column; border-bottom: 0; border-right: 1px solid var(--kj-color-base-300); margin: 0; }

  .kj-tab {
    background: none;
    border: 0;
    border-bottom: 2px solid transparent;
    color: var(--kj-color-base-content);
    opacity: 0.6;
    padding: var(--kj-space-sm) var(--kj-space-md);
    font: 0.875rem var(--kj-font-sans);
    cursor: pointer;
    margin-bottom: -1px;
    transition: var(--kj-transition);
  }
  .kj-tab[aria-selected="true"] { opacity: 1; border-bottom-color: var(--kj-color-primary); }
  .kj-tab:hover { opacity: 1; }
  .kj-tab:focus-visible { outline: 2px solid var(--kj-color-primary); outline-offset: 2px; }
  .kj-tab:disabled, .kj-tab[aria-disabled="true"] { opacity: 0.3; cursor: not-allowed; }

  .kj-tabs[data-variant="pills"] .kj-tab-list { border-bottom: 0; gap: 4px; }
  .kj-tabs[data-variant="pills"] .kj-tab {
    border-bottom: 0;
    border-radius: var(--kj-radius-field);
    margin: 0;
  }
  .kj-tabs[data-variant="pills"] .kj-tab[aria-selected="true"] {
    background: var(--kj-color-primary);
    color: var(--kj-color-primary-content);
  }

  .kj-tabs[data-orientation="vertical"] .kj-tab { border-bottom: 0; border-right: 2px solid transparent; margin: 0 -1px 0 0; text-align: left; }
  .kj-tabs[data-orientation="vertical"] .kj-tab[aria-selected="true"] { border-right-color: var(--kj-color-primary); }

  .kj-tab-panel { color: var(--kj-color-base-content); font: 0.875rem var(--kj-font-sans); line-height: 1.5; }
  .kj-tab-panel[hidden] { display: none; }
}
```

- [ ] **Step 4: Create the 4 example files**

All share the same imports `[KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent]` and host styles `:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`.

`tabs.default.example.ts` — class `KjTabsDefaultExample`:

```ts
template: `
  <kj-tabs [(value)]="active">
    <kj-tab-list>
      <kj-tab [value]="'overview'">Overview</kj-tab>
      <kj-tab [value]="'api'">API</kj-tab>
      <kj-tab [value]="'examples'">Examples</kj-tab>
    </kj-tab-list>
    <kj-tab-panel [for]="'overview'">Overview content.</kj-tab-panel>
    <kj-tab-panel [for]="'api'">API content.</kj-tab-panel>
    <kj-tab-panel [for]="'examples'">Examples content.</kj-tab-panel>
  </kj-tabs>
`,
```
Field: `readonly active = signal('overview');`

`tabs.pills.example.ts` — `KjTabsPillsExample`. Same template but root tag is `<kj-tabs variant="pills" …>` and field default is `'a'`. Use simpler labels ('A', 'B', 'C').

`tabs.disabled.example.ts` — `KjTabsDisabledExample`. One tab has `[disabled]="true"`:

```ts
template: `
  <kj-tabs [(value)]="active">
    <kj-tab-list>
      <kj-tab [value]="'one'">Tab one</kj-tab>
      <kj-tab [value]="'two'" [disabled]="true">Tab two (disabled)</kj-tab>
      <kj-tab [value]="'three'">Tab three</kj-tab>
    </kj-tab-list>
    <kj-tab-panel [for]="'one'">First panel.</kj-tab-panel>
    <kj-tab-panel [for]="'two'">Second panel.</kj-tab-panel>
    <kj-tab-panel [for]="'three'">Third panel.</kj-tab-panel>
  </kj-tabs>
`,
```
Field: `readonly active = signal('one');`

`tabs.vertical.example.ts` — `KjTabsVerticalExample`. Same as default but `orientation="vertical"`:

```ts
template: `
  <kj-tabs [(value)]="active" orientation="vertical">
    <kj-tab-list>
      <kj-tab [value]="'profile'">Profile</kj-tab>
      <kj-tab [value]="'team'">Team</kj-tab>
      <kj-tab [value]="'billing'">Billing</kj-tab>
    </kj-tab-list>
    <kj-tab-panel [for]="'profile'">Profile content.</kj-tab-panel>
    <kj-tab-panel [for]="'team'">Team content.</kj-tab-panel>
    <kj-tab-panel [for]="'billing'">Billing content.</kj-tab-panel>
  </kj-tabs>
`,
```

- [ ] **Step 5: Create `index.ts`, add to `public-api.ts`** (alphabetical: between `select` and `toast`).

- [ ] **Step 6: Build, verify, commit**

```bash
pnpm -F @kouji-ui/components build
# verify http://localhost:4200/docs/components/tabs
git add packages/components/src/tabs/ packages/components/src/public-api.ts
git commit -m "feat(components): add KjTabsComponent + sub-components with code+preview docs"
```

---

## Task 13: Add `KjDialogComponent` (compound: trigger + overlay + dialog + title + close)

**Files:**
- Create: `packages/components/src/dialog/dialog.ts`, `dialog.css`, `index.ts`
- Create: `dialog.default.example.ts`, `dialog.with-form.example.ts`, `dialog.scrollable.example.ts`, `dialog.confirmation.example.ts`
- Modify: `packages/components/src/public-api.ts`

**Core directive surface:** `packages/core/src/dialog/dialog.ts` — exports `KjDialogTrigger` (the orchestrator; takes a `TemplateRef` input `kjDialogTrigger` plus `kjDialogCloseOnEscape`, `kjDialogCloseOnBackdrop`, `kjDialogClosed` output), `KjDialog`, `KjDialogOverlay`, `KjDialogTitle`, `KjDialogClose`. The dialog body lives inside an `<ng-template>` that the trigger projects into a portal.

This is the most complex wrapper. The wrapper does **not** abstract the `<ng-template>` requirement — that's intrinsic to how the directive works. Instead, the wrapper offers element-level styling for the four named slots (overlay, dialog panel, title, close). Each is `display: contents`.

- [ ] **Step 1: Read `packages/core/src/dialog/dialog.ts`** end-to-end. Note that `[kjDialogTrigger]` consumes a `TemplateRef`; the consumer writes a template in their HTML and references it.

- [ ] **Step 2: Create `dialog.ts`** with five component classes:

```ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, output } from '@angular/core';
import { TemplateRef } from '@angular/core';
import { KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle, KjDialogClose } from '@kouji-ui/core';

/**
 * Dialog trigger. Use on a button. Pass a `TemplateRef` to `[for]` containing
 * the dialog markup (overlay → dialog → title/content → close).
 *
 * @doc-example Default
 *   @doc-file dialog.default.example.ts
 * @doc-example With form
 *   @doc-file dialog.with-form.example.ts
 * @doc-example Scrollable
 *   @doc-file dialog.scrollable.example.ts
 * @doc-example Confirmation
 *   @doc-file dialog.confirmation.example.ts
 * @category Library/Actions
 */
@Component({
  selector: 'button[kj-dialog-trigger]',
  standalone: true,
  imports: [KjDialogTrigger],
  template: `<ng-content />`,
  styleUrl: './dialog.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    type: 'button',
    '[attr.kjDialogTrigger]': 'null',
    class: 'kj-dialog-trigger-btn',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogTriggerComponent {
  readonly for = input.required<TemplateRef<unknown>>({ alias: 'for' });
  readonly closeOnEscape = input(true);
  readonly closeOnBackdrop = input(true);
  readonly closed = output<unknown>();
}
```

This wrapper rewires inputs to nicer names. **Implementation note:** because the wrapper is on a `<button kj-dialog-trigger>` and not a child host of the directive, you must apply the directive directly via `host` bindings or change strategy to a thin `host` re-export. A simpler alternative is to **skip the trigger wrapper entirely** and tell users to use `[kjDialogTrigger]` from core directly — only wrap the overlay/dialog/title/close which are pure presentational.

**Recommendation for this task:** ship only `KjDialogComponent` (panel), `KjDialogOverlayComponent`, `KjDialogTitleComponent`, `KjDialogCloseComponent` as styled slots. The trigger stays a core directive in user templates. This matches how `KjButton` is wrapped (the wrapper applies the directive but does not re-export it as a stand-alone styled trigger). Update the TSDoc class block accordingly to live on `KjDialogComponent` (the panel).

Replace the file with:

```ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { KjDialog, KjDialogOverlay, KjDialogTitle, KjDialogClose } from '@kouji-ui/core';

/**
 * Dialog panel. Place inside a `<ng-template>` referenced by a `[kjDialogTrigger]`.
 * Wrap with `<kj-dialog-overlay>`. Use `<kj-dialog-title>` and `<kj-dialog-close>` as needed.
 *
 * @doc-example Default
 *   @doc-file dialog.default.example.ts
 * @doc-example With form
 *   @doc-file dialog.with-form.example.ts
 * @doc-example Scrollable
 *   @doc-file dialog.scrollable.example.ts
 * @doc-example Confirmation
 *   @doc-file dialog.confirmation.example.ts
 * @category Library/Actions
 */
@Component({
  selector: 'kj-dialog',
  standalone: true,
  imports: [KjDialog],
  template: `<div kjDialog class="kj-dialog" #dlg="kjDialog"><ng-content /></div>`,
  styleUrl: './dialog.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogComponent {}

@Component({
  selector: 'kj-dialog-overlay',
  standalone: true,
  imports: [KjDialogOverlay],
  template: `<div kjDialogOverlay class="kj-dialog-overlay"><ng-content /></div>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogOverlayComponent {}

@Component({
  selector: 'kj-dialog-title',
  standalone: true,
  imports: [KjDialogTitle],
  template: `<h2 kjDialogTitle class="kj-dialog-title"><ng-content /></h2>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogTitleComponent {}

@Component({
  selector: 'kj-dialog-close',
  standalone: true,
  imports: [KjDialogClose],
  template: `<button type="button" kjDialogClose class="kj-dialog-close"><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogCloseComponent {}
```

- [ ] **Step 3: Create `dialog.css`**

```css
@layer kj.component {
  .kj-dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .kj-dialog {
    background: var(--kj-color-base-100);
    color: var(--kj-color-base-content);
    border-radius: var(--kj-radius-box);
    box-shadow: 0 24px 48px rgb(0 0 0 / 0.25);
    padding: var(--kj-space-xl);
    min-width: 24rem;
    max-width: min(40rem, calc(100vw - 2rem));
    max-height: calc(100vh - 4rem);
    overflow: auto;
  }
  .kj-dialog-title {
    margin: 0 0 var(--kj-space-md);
    font: 600 1.125rem / 1.3 var(--kj-font-sans);
  }
  .kj-dialog-close {
    background: var(--kj-color-base-200);
    color: var(--kj-color-base-content);
    border: 0;
    border-radius: var(--kj-radius-field);
    padding: var(--kj-space-sm) var(--kj-space-md);
    font: 0.875rem var(--kj-font-sans);
    cursor: pointer;
  }
  .kj-dialog-close:focus-visible { outline: 2px solid var(--kj-color-primary); outline-offset: 2px; }
}
```

- [ ] **Step 4: Create the 4 example files**

Each example uses the core `KjDialogTrigger` directive directly on a button (NOT a wrapper) plus the styled overlay/dialog/title/close from the wrapper. Common imports: `[KjDialogTrigger, KjDialogComponent, KjDialogOverlayComponent, KjDialogTitleComponent, KjDialogCloseComponent]`.

`dialog.default.example.ts` — class `KjDialogDefaultExample`:

```ts
import { Component } from '@angular/core';
import { KjDialogTrigger } from '@kouji-ui/core';
import {
  KjDialogComponent, KjDialogOverlayComponent, KjDialogTitleComponent, KjDialogCloseComponent,
} from './dialog';

@Component({
  selector: 'kj-dialog-default-example',
  standalone: true,
  imports: [KjDialogTrigger, KjDialogComponent, KjDialogOverlayComponent, KjDialogTitleComponent, KjDialogCloseComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <button [kjDialogTrigger]="dlg">Open dialog</button>
    <ng-template #dlg>
      <kj-dialog-overlay>
        <kj-dialog>
          <kj-dialog-title>Hello</kj-dialog-title>
          <p>This is a styled dialog.</p>
          <kj-dialog-close>Close</kj-dialog-close>
        </kj-dialog>
      </kj-dialog-overlay>
    </ng-template>
  `,
})
export class KjDialogDefaultExample {}
```

`dialog.with-form.example.ts` — class `KjDialogWithFormExample`. Add a labeled input + Save button:

```ts
template: `
  <button [kjDialogTrigger]="dlg">New project</button>
  <ng-template #dlg>
    <kj-dialog-overlay>
      <kj-dialog>
        <kj-dialog-title>New project</kj-dialog-title>
        <form (submit)="$event.preventDefault()" style="display:flex;flex-direction:column;gap:1rem;">
          <label style="display:flex;flex-direction:column;gap:0.25rem;">
            <span>Project name</span>
            <input type="text" />
          </label>
          <div style="display:flex;gap:0.5rem;justify-content:flex-end;">
            <kj-dialog-close>Cancel</kj-dialog-close>
            <button type="submit">Save</button>
          </div>
        </form>
      </kj-dialog>
    </kj-dialog-overlay>
  </ng-template>
`,
```

`dialog.scrollable.example.ts` — class `KjDialogScrollableExample`. Long body:

```ts
template: `
  <button [kjDialogTrigger]="dlg">Read more</button>
  <ng-template #dlg>
    <kj-dialog-overlay>
      <kj-dialog>
        <kj-dialog-title>Terms of service</kj-dialog-title>
        <div style="max-height:16rem; overflow:auto;">
          @for (i of items; track i) {
            <p>Paragraph {{ i }}: lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          }
        </div>
        <kj-dialog-close>Close</kj-dialog-close>
      </kj-dialog>
    </kj-dialog-overlay>
  </ng-template>
`,
```
Field: `readonly items = Array.from({ length: 30 }, (_, i) => i + 1);`

`dialog.confirmation.example.ts` — class `KjDialogConfirmationExample`. Two-button confirmation pattern:

```ts
template: `
  <button [kjDialogTrigger]="dlg" (kjDialogClosed)="onResult($event)">Delete item</button>
  <p style="margin-top:1rem;">Last result: {{ result() ?? '—' }}</p>
  <ng-template #dlg>
    <kj-dialog-overlay>
      <kj-dialog #d="kjDialog">
        <kj-dialog-title>Delete this item?</kj-dialog-title>
        <p>This action cannot be undone.</p>
        <div style="display:flex;gap:0.5rem;justify-content:flex-end;">
          <kj-dialog-close>Cancel</kj-dialog-close>
          <button type="button" (click)="d.close('confirmed')">Delete</button>
        </div>
      </kj-dialog>
    </kj-dialog-overlay>
  </ng-template>
`,
```
Fields:
```ts
import { signal } from '@angular/core';
…
readonly result = signal<string | null>(null);
onResult(value: unknown): void { this.result.set(value as string | null); }
```

Note: `#d="kjDialog"` exports the `KjDialog` directive instance from inside the wrapper component. If the wrapper's internal `<div kjDialog>` does not pass the export through (Angular cannot expose a directive `exportAs` through a component template into the parent), drop the `#d.close('confirmed')` call and replace it with a model-level pattern: bind `(click)` to a method on the example class that uses `KjDialogService` from core. Confirm by reading `dialog.ts` for `exportAs: 'kjDialog'` on `KjDialog`. If exportAs is not present at the directive level, the `#d="kjDialog"` reference must be on the directive directly — adjust by inlining `<div kjDialog #d="kjDialog">` in the example template instead of using `<kj-dialog>`.

- [ ] **Step 5: Create `index.ts`, add to `public-api.ts`** (alphabetical: between `checkbox` and `input`).

- [ ] **Step 6: Build, verify, commit**

```bash
pnpm -F @kouji-ui/components build
# verify http://localhost:4200/docs/components/dialog
# - clicking each trigger opens the styled dialog
# - Escape and backdrop click close it
# - the Confirmation example logs the close result on screen
git add packages/components/src/dialog/ packages/components/src/public-api.ts
git commit -m "feat(components): add KjDialogComponent slots with code+preview docs"
```

---

## Task 14: Add `KjToastComponent` (compound: viewport + toast + close)

**Files:**
- Create: `packages/components/src/toast/toast.ts`, `toast.css`, `index.ts`
- Create: `toast.default.example.ts`, `toast.variants.example.ts`, `toast.with-action.example.ts`, `toast.dismissible.example.ts`
- Modify: `packages/components/src/public-api.ts`

**Core directive surface:** `packages/core/src/toast/toast.ts` + `toast.service.ts` — `KjToastViewport` (placement container), `KjToast` (single toast with `kjToastVariant`, `kjToastId`), `KjToastClose`. Triggering toasts uses `KjToastService` (from `toast.service.ts`).

This is the most service-driven directive. Wrappers stay presentational (the viewport + a templated toast shell). The "trigger" is `inject(KjToastService).show(...)` from the example component.

- [ ] **Step 1: Read `packages/core/src/toast/toast.ts` and `toast.service.ts`** to confirm: `KjToastViewport` selector and inputs (likely `kjToastViewportPositionX`, `kjToastViewportPositionY` — verify), `KjToastService.show(...)` signature, and what fields are on the template context (`ctx.id`, `ctx.variant`, `ctx.message`, `ctx.dismiss()`).

- [ ] **Step 2: Create `toast.ts`** with three component wrappers — viewport, toast, close. The wrapper does NOT abstract the `<ng-template>` requirement; templates are user-written.

```ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjToastViewport, KjToast, KjToastClose, KjToastVariant } from '@kouji-ui/core';

/**
 * Toast viewport. Mount once in your app shell. Hosts the templated toasts.
 *
 * @doc-example Default
 *   @doc-file toast.default.example.ts
 * @doc-example Variants
 *   @doc-file toast.variants.example.ts
 * @doc-example With action
 *   @doc-file toast.with-action.example.ts
 * @doc-example Dismissible
 *   @doc-file toast.dismissible.example.ts
 * @category Library/Feedback
 */
@Component({
  selector: 'kj-toast-viewport',
  standalone: true,
  imports: [KjToastViewport],
  template: `<div kjToastViewport class="kj-toast-viewport"><ng-content /></div>`,
  styleUrl: './toast.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjToastViewportComponent {}

@Component({
  selector: 'kj-toast',
  standalone: true,
  imports: [KjToast],
  template: `
    <div
      kjToast
      class="kj-toast"
      [kjToastVariant]="variant()"
      [kjToastId]="id()"
    ><ng-content /></div>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjToastComponent {
  readonly variant = input<KjToastVariant>('default');
  readonly id = input<string | null>(null);
}

@Component({
  selector: 'kj-toast-close',
  standalone: true,
  imports: [KjToastClose],
  template: `<button type="button" kjToastClose class="kj-toast-close"><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjToastCloseComponent {}
```

- [ ] **Step 3: Create `toast.css`**

```css
@layer kj.component {
  .kj-toast-viewport {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 1000;
    pointer-events: none;
  }
  .kj-toast {
    pointer-events: auto;
    background: var(--kj-color-base-100);
    color: var(--kj-color-base-content);
    border: var(--kj-border) solid var(--kj-color-base-300);
    border-radius: var(--kj-radius-box);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
    padding: var(--kj-space-md) var(--kj-space-lg);
    min-width: 18rem;
    display: flex;
    align-items: center;
    gap: var(--kj-space-md);
    font: 0.875rem var(--kj-font-sans);
  }
  .kj-toast[data-variant="success"]     { background: var(--kj-color-success);     color: var(--kj-color-success-content); border-color: transparent; }
  .kj-toast[data-variant="warning"]     { background: var(--kj-color-warning);     color: var(--kj-color-warning-content); border-color: transparent; }
  .kj-toast[data-variant="destructive"] { background: var(--kj-color-destructive); color: var(--kj-color-destructive-content); border-color: transparent; }
  .kj-toast-close {
    background: transparent;
    border: 0;
    color: inherit;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
  }
  .kj-toast-close:hover { background: rgb(0 0 0 / 0.08); }
  .kj-toast-close:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
}
```

- [ ] **Step 4: Create the 4 example files**

Each example renders a button that calls `KjToastService.show(template, options)` and a `<kj-toast-viewport>` containing the `<ng-template>`. Confirm `KjToastService.show` signature in Step 1; the snippets below assume it accepts `(template: TemplateRef<{ ctx: KjToastTemplateContext }>, opts?: { variant?, message?, dismissible? })`. **Adjust to match the actual signature**.

`toast.default.example.ts` — class `KjToastDefaultExample`:

```ts
import { Component, TemplateRef, inject, viewChild } from '@angular/core';
import { KjToastService } from '@kouji-ui/core';
import { KjToastViewportComponent, KjToastComponent, KjToastCloseComponent } from './toast';

@Component({
  selector: 'kj-toast-default-example',
  standalone: true,
  imports: [KjToastViewportComponent, KjToastComponent, KjToastCloseComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); min-height: 6rem; }`],
  template: `
    <button type="button" (click)="show()">Show toast</button>
    <kj-toast-viewport>
      <ng-template #tpl let-ctx>
        <kj-toast [variant]="ctx.variant" [id]="ctx.id">
          <span>{{ ctx.message }}</span>
          <kj-toast-close (click)="ctx.dismiss()" aria-label="Dismiss">×</kj-toast-close>
        </kj-toast>
      </ng-template>
    </kj-toast-viewport>
  `,
})
export class KjToastDefaultExample {
  private readonly svc = inject(KjToastService);
  readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');
  show(): void { this.svc.show(this.tpl(), { message: 'Hello from kouji-ui!' }); }
}
```

`toast.variants.example.ts` — class `KjToastVariantsExample`. Three buttons (default/success/warning/destructive) each calling `show` with the corresponding variant.

```ts
template: `
  <div style="display:flex; gap:0.5rem;">
    <button type="button" (click)="show('default')">Default</button>
    <button type="button" (click)="show('success')">Success</button>
    <button type="button" (click)="show('warning')">Warning</button>
    <button type="button" (click)="show('destructive')">Destructive</button>
  </div>
  <kj-toast-viewport>
    <ng-template #tpl let-ctx>
      <kj-toast [variant]="ctx.variant" [id]="ctx.id">
        <span>{{ ctx.message }}</span>
        <kj-toast-close (click)="ctx.dismiss()" aria-label="Dismiss">×</kj-toast-close>
      </kj-toast>
    </ng-template>
  </kj-toast-viewport>
`,
```
Class:
```ts
import { KjToastVariant } from '@kouji-ui/core';
…
show(variant: KjToastVariant): void {
  this.svc.show(this.tpl(), { variant, message: `${variant[0].toUpperCase()}${variant.slice(1)} toast` });
}
```

`toast.with-action.example.ts` — class `KjToastWithActionExample`. Add an "Undo" button inside the toast body next to the close.

```ts
template: `
  <button type="button" (click)="deleteItem()">Delete</button>
  <kj-toast-viewport>
    <ng-template #tpl let-ctx>
      <kj-toast [variant]="ctx.variant" [id]="ctx.id">
        <span>{{ ctx.message }}</span>
        <button type="button" style="margin-left:auto" (click)="undo(ctx)">Undo</button>
        <kj-toast-close (click)="ctx.dismiss()" aria-label="Dismiss">×</kj-toast-close>
      </kj-toast>
    </ng-template>
  </kj-toast-viewport>
`,
```
Methods:
```ts
deleteItem(): void { this.svc.show(this.tpl(), { message: 'Item deleted', variant: 'default' }); }
undo(ctx: { dismiss: () => void }): void { console.log('undo'); ctx.dismiss(); }
```

`toast.dismissible.example.ts` — class `KjToastDismissibleExample`. Same shape as default, but also calls `show` with `{ duration: 0 }` so it stays until dismissed manually.

```ts
template: `
  <button type="button" (click)="show()">Show persistent toast</button>
  <kj-toast-viewport>
    <ng-template #tpl let-ctx>
      <kj-toast [variant]="ctx.variant" [id]="ctx.id">
        <span>{{ ctx.message }}</span>
        <kj-toast-close (click)="ctx.dismiss()" aria-label="Dismiss">×</kj-toast-close>
      </kj-toast>
    </ng-template>
  </kj-toast-viewport>
`,
show(): void { this.svc.show(this.tpl(), { message: 'I stay until dismissed.', duration: 0 }); }
```

Adjust the `duration: 0` field name to whatever the service signature uses (read in Step 1).

- [ ] **Step 5: Create `index.ts`, add to `public-api.ts`** (alphabetical: between `tabs` and `toggle`).

- [ ] **Step 6: Build, verify, commit**

```bash
pnpm -F @kouji-ui/components build
# verify http://localhost:4200/docs/components/toast
# - each button shows a styled toast in the bottom-right corner
# - the variants example renders four colors
# - the dismissible toast does not auto-fade
git add packages/components/src/toast/ packages/components/src/public-api.ts
git commit -m "feat(components): add KjToastComponent + viewport/close with code+preview docs"
```

---

## Task 15: Final verification + sidebar audit

**Files:** none (read-only verification)

- [ ] **Step 1: Build everything**

Run:

```bash
pnpm -F @kouji-ui/components build
pnpm -F @kouji-ui/docs build
```

Expected: both builds succeed with zero errors.

- [ ] **Step 2: Sidebar audit**

Run `pnpm -F @kouji-ui/docs dev` and open `http://localhost:4200/docs/components`.

Verify the sidebar shows exactly these groups, in this order, populated as listed:

```
Actions
  Button
  Dialog
Data input
  Checkbox
  Input
  Radio
  Select
  Toggle
Data display
  Accordion
  Avatar
  Badge
  Card
  Kbd
Navigation
  Link
  Menu
  Tabs
Feedback
  Toast
```

If any component is missing or in the wrong group, check its `@category` tag.

- [ ] **Step 3: Per-component preview audit**

Open each component's docs page in turn. For each, confirm:

- The page title matches the component name.
- All `@doc-example` panels render — each panel shows a live preview AND a code tab.
- The preview is not blank (no Angular template errors).

If any preview fails to render, open browser DevTools console and check for runtime errors. Common causes: missing import in the example file, mismatched core directive input name, or a component selector typo.

- [ ] **Step 4: Final commit (only if anything was fixed)**

If Step 3 surfaced fixes, commit them per-component:

```bash
git add packages/components/src/<name>/
git commit -m "fix(components): <name> docs page rendering"
```

If nothing needed fixing, skip this step.

- [ ] **Step 5: Summary commit message** (no code changes)

Final state should be 14 commits ahead of `feat/themes-and-components`:

1. `feat(docs): extend extractor with daisyUI-style categories for components track`
2. `feat(docs): watch packages/components/src for manifest invalidation`
3. `feat(components): recategorize existing wrappers under daisyUI groups`
4. `feat(components): add KjToggleComponent with code+preview docs`
5. `feat(components): add KjCheckboxComponent with code+preview docs`
6. `feat(components): add KjBadgeComponent with code+preview docs`
7. `feat(components): add KjAvatarComponent (root + image + fallback) with code+preview docs`
8. `feat(components): add KjAccordionComponent + sub-components with code+preview docs`
9. `feat(components): add KjRadioGroupComponent + KjRadioComponent with code+preview docs`
10. `feat(components): add KjSelectComponent + sub-components with code+preview docs`
11. `feat(components): add KjMenuComponent + sub-components with code+preview docs`
12. `feat(components): add KjTabsComponent + sub-components with code+preview docs`
13. `feat(components): add KjDialogComponent slots with code+preview docs`
14. `feat(components): add KjToastComponent + viewport/close with code+preview docs`

Run `git log --oneline -20` to confirm the chain. The branch is now ready for review/merge to `feat/themes-and-components`.

---

## Self-review checklist

- ✅ Spec coverage: every component in spec §2.1 has a task; every infra change in spec §6 has a task; every recategorization in spec §2.2 is in Task 3.
- ✅ Placeholder scan: no "TBD"/"TODO" markers. The two phrases that come close — "adjust to match the actual signature" (Task 14, Step 4) and "If unsupported … skip wiring" (Task 8, Step 6) — are concrete fallback instructions tied to a verification step ("Step 1: Read core directive"), not deferred work.
- ✅ Type consistency: `KjToggleComponent.pressed`, `KjCheckboxComponent.checked`, `KjRadioGroupComponent.value`, `KjSelectComponent.value`, `KjTabsComponent.value` all use the same `model<T>(default)` shape and are referenced consistently in their example files.
- ✅ All component class names use `Kj<Name>Component` and selectors use `kj-<name>` (or `kj-<name>-<part>` for sub-components).
- ⚠️ Two known unknowns flagged inline: (1) `KjAccordionItem` disabled support — Task 8 Step 1 instructs the implementer to verify and adjust. (2) `KjToastService.show` signature and field names — Task 14 Step 1 instructs the implementer to verify and adjust. These are honest dependencies on directive APIs that were not fully read during planning, not placeholders for missing plan content.
