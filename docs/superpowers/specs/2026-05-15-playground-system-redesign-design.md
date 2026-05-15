# Playground system redesign — design

> **Status:** Draft — awaiting user review.
> **Date:** 2026-05-15
> **Replaces:** The current `PlaygroundEntry` discriminated union (`'controls' | 'demo'`) in `apps/docs/src/app/pages/component-doc/playground-registry.ts` and the per-bucket `playground-demos/bucket-{a,b,c,d,e}/` files.

## Problem

Today's playground engine has two modes:

- **`controls`** — a single live component instance with chip/toggle/text controls on the right panel; the engine writes inputs via `setInput`. Used by ~13 simple primitives.
- **`demo`** — a pre-built standalone demo component with no controls panel; the engine just mounts it and shows a hand-written static snippet. Used by ~44 compound or service-launched components.

Result: most component docs have a live preview but no right panel, and the code snippet doesn't reflect anything the user does. The two modes also drift the engine (special-cases for "no controls", "single ref vs free template", "hardcoded snippet vs generated").

We want every component's playground to:

1. Render a live preview that reflects the current control state.
2. Expose a right panel of controls — including for compound components like accordion, select, dialog, tabs, list.
3. Generate the copy-pasteable code snippet from the same state, so the snippet updates as the user interacts.
4. Be authored in a single file co-located with the component.

## Design

### 1. Co-located playground files

Each component owns a `<comp>.playground.ts` in `packages/components/src/<comp>/`. The file is the single source of truth for that component's playground — demo component, exposed state, control schema, and snippet generator.

Discovery via a new TSDoc tag on the `@doc-is-main` carrier:

```ts
/**
 * @doc-is-main
 * @doc-playground button.playground.ts
 */
@Component({ selector: 'kj-button', ... })
export class KjButtonComponent { ... }
```

The doc-extractor reads the tag and adds an optional `playgroundFile?: string` to `DocItem` (the resolved absolute path inside the workspace). Without the tag, the docs page falls back to the existing "not yet wired" placeholder. With the tag pointing to a missing file, the extractor emits an `unknown-tag`-style warning and the page falls back to the placeholder.

### 2. Schema shape

```ts
import type { Signal, Type, WritableSignal } from '@angular/core';

export type ControlSpec =
  | { kind: 'chips';  name: string; label: string; options: readonly (string | number)[] }
  | { kind: 'toggle'; name: string; label: string }
  | { kind: 'text';   name: string; label: string; placeholder?: string }
  | { kind: 'number'; name: string; label: string; min?: number; max?: number; step?: number };

export interface PlaygroundFile<
  S extends Record<string, WritableSignal<unknown>> = Record<string, WritableSignal<unknown>>,
> {
  /** Standalone demo component. Its template reads from the same `state` signals. */
  component: Type<unknown>;
  /** Named writable signals the engine mutates from the right panel. Keys match `controls[].name`. */
  state: S;
  /** Right-panel control descriptors. `name` references a key on `state`. */
  controls: readonly ControlSpec[];
  /** Builds the copy-pasteable snippet from the current state values. */
  snippet: (values: { [K in keyof S]: ReturnType<S[K]> }) => string;
}
```

State signals are top-level module declarations (not class fields), so:

- The component's template references them via closure (or via a `protected readonly` field that aliases the module-scope signal — both work).
- The engine and the snippet fn both read the same singleton signal source — no instance synchronization issues.
- `state` is plain object, easy to enumerate.

#### Example — button (simple primitive)

```ts
// button.playground.ts
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjButtonComponent } from './button';
import type { PlaygroundFile } from '../playground-types';

const variant  = signal<'default' | 'destructive' | 'ghost' | 'outline' | 'link'>('default');
const size     = signal<'sm' | 'md' | 'lg' | 'icon'>('md');
const label    = signal('Click me');
const disabled = signal(false);

@Component({
  selector: 'kj-button-playground',
  standalone: true,
  imports: [KjButtonComponent],
  template: `<kj-button [kjVariant]="variant()" [kjSize]="size()" [kjDisabled]="disabled()">{{ label() }}</kj-button>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonPlayground {
  protected readonly variant = variant;
  protected readonly size = size;
  protected readonly label = label;
  protected readonly disabled = disabled;
}

export const PLAYGROUND: PlaygroundFile<{
  variant: typeof variant; size: typeof size; label: typeof label; disabled: typeof disabled;
}> = {
  component: ButtonPlayground,
  state: { variant, size, label, disabled },
  controls: [
    { kind: 'chips',  name: 'variant',  label: 'variant',  options: ['default', 'destructive', 'ghost', 'outline', 'link'] },
    { kind: 'chips',  name: 'size',     label: 'size',     options: ['sm', 'md', 'lg', 'icon'] },
    { kind: 'text',   name: 'label',    label: 'label' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
  ],
  snippet: (s) =>
    `<kj-button kjVariant="${s.variant}" kjSize="${s.size}"${s.disabled ? ' [kjDisabled]="true"' : ''}>${s.label}</kj-button>`,
};
```

#### Example — accordion (compound, variable children)

```ts
// accordion.playground.ts
const multi     = signal(false);
const count     = signal(3);
const openIndex = signal(0);

@Component({
  selector: 'kj-accordion-playground',
  standalone: true,
  imports: [KjAccordionComponent, KjAccordionItemComponent, KjAccordionTriggerComponent, KjAccordionContentComponent],
  template: `
    <kj-accordion [kjMulti]="multi()">
      @for (i of items(); track i) {
        <kj-accordion-item [kjOpen]="i === openIndex()">
          <kj-accordion-trigger>Item {{ i + 1 }}</kj-accordion-trigger>
          <kj-accordion-content>Body {{ i + 1 }}</kj-accordion-content>
        </kj-accordion-item>
      }
    </kj-accordion>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccordionPlayground {
  protected readonly multi = multi;
  protected readonly count = count;
  protected readonly openIndex = openIndex;
  protected readonly items = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}

export const PLAYGROUND: PlaygroundFile<{
  multi: typeof multi; count: typeof count; openIndex: typeof openIndex;
}> = {
  component: AccordionPlayground,
  state: { multi, count, openIndex },
  controls: [
    { kind: 'toggle', name: 'multi',     label: 'allow multi-open' },
    { kind: 'number', name: 'count',     label: 'items', min: 1, max: 5, step: 1 },
    { kind: 'chips',  name: 'openIndex', label: 'default open', options: [0, 1, 2, 3, 4] },
  ],
  snippet: (s) =>
    `<kj-accordion${s.multi ? ' [kjMulti]="true"' : ''}>\n` +
    Array.from({ length: s.count }, (_, i) =>
      `  <kj-accordion-item${s.openIndex === i ? ' [kjOpen]="true"' : ''}>\n` +
      `    <kj-accordion-trigger>Item ${i + 1}</kj-accordion-trigger>\n` +
      `    <kj-accordion-content>Body ${i + 1}</kj-accordion-content>\n` +
      `  </kj-accordion-item>`,
    ).join('\n') +
    `\n</kj-accordion>`,
};
```

### 3. Engine behavior

```
[playground page loads]
  symbol = page.main.symbol
  pf = PLAYGROUND_FILES[symbol] | null
  if (!pf) render "not yet wired" placeholder; stop
  mount pf.component in the stage's ViewContainerRef
  values = read each signal in pf.state
  render right panel from pf.controls
  show pf.snippet(values) in the code block

[user flips a control]
  pf.state[ctrl.name].set(newValue)
  Angular: signal change → demo re-renders via OnPush + signal reactivity
  values = read each signal in pf.state
  show pf.snippet(values) in the code block
```

`<app-playground>` becomes simpler:

- No more discriminated-union branching (no `kind: 'demo'` short-circuit).
- No special slot-projection / icon-mode logic — that's the demo's concern (e.g. button playground's template can handle icon-mode directly via signals).
- No `setInput` calls — the demo wires its own template to its own signals.

The right panel is rendered by a small `<app-playground-controls>` sub-component that dispatches on `ControlSpec.kind` and emits writes to the corresponding signal. Each kind maps to existing kj-* components: chips → kj-button row with `[data-pressed]`; toggle → kj-toggle (switch appearance); text → kj-input; number → kj-number-input.

### 4. Build-time registry generation

The doc-extractor already runs at build time and walks every `packages/{core,components}/src/**/*.ts` file. We extend it to:

1. Read the `@doc-playground` tag (already partially handled — needs the value parsed as a filename).
2. Resolve the path to an absolute workspace path; verify the file exists.
3. Emit a generated module `apps/docs/src/app/pages/component-doc/playground-files.generated.ts`:

```ts
// AUTO-GENERATED by docs-extractor. Do not edit by hand.
import type { PlaygroundFile } from './playground-types';
import { PLAYGROUND as ButtonPlayground } from '@kouji-ui/components/button/button.playground';
import { PLAYGROUND as AccordionPlayground } from '@kouji-ui/components/accordion/accordion.playground';
// ... one import per @doc-playground tag

export const PLAYGROUND_FILES: Record<string, PlaygroundFile> = {
  KjButtonComponent: ButtonPlayground,
  KjAccordionComponent: AccordionPlayground,
  // ... keyed by DocItem.symbol
};
```

The file lives under `apps/docs/`, is git-ignored, and is regenerated:

- On every `pnpm build:docs` run.
- On dev — already invalidated by the existing manifest file watcher (which watches `packages/{core,components}/src/**/*.ts`). The generator runs as part of the same pass.

The `playground-files.generated.ts` is consumed by `<app-playground>` (lookup by symbol). Replaces today's hand-maintained `PLAYGROUND_REGISTRY` + per-bucket `BUCKET_*_ENTRIES`.

### 5. Types module

`apps/docs/src/app/pages/component-doc/playground-types.ts` (new):

```ts
import type { Type, WritableSignal } from '@angular/core';

export type ControlSpec = /* as above */;
export interface PlaygroundFile<S = Record<string, WritableSignal<unknown>>> { /* as above */ }
```

Re-exported from `@kouji-ui/components` (or a dedicated `@kouji-ui/playground-api` sub-path) so component packages can import the type without depending on the docs app.

### 6. Engine code changes summary

Files modified:

- `apps/docs/src/lib/docs-extractor.types.ts` — add `playgroundFile?: string` to `DocItem`.
- `apps/docs/src/lib/doc-tags.ts` — recognise `@doc-playground` and capture its argument.
- `apps/docs/src/lib/detectors/directive.detector.ts` — read the tag value, resolve the path, attach to the emitted `DocItem`.
- `apps/docs/src/lib/manifest.ts` (or a new `playground-generator.ts`) — generate `playground-files.generated.ts` from the discovered tags.
- `apps/docs/src/app/pages/component-doc/playground.ts` — switch to `PLAYGROUND_FILES[symbol]`, drop `setInput`/icon-swap/`demo`-branch logic.
- `apps/docs/src/app/pages/component-doc/playground.html` — single-flow template; controls panel always renders when `pf` is non-null.
- `apps/docs/src/app/pages/component-doc/playground.css` — drop `.playground--demo` rule.
- `apps/docs/src/app/pages/component-doc/playground-registry.ts` — **delete** (replaced by the generated file).
- `apps/docs/src/app/pages/component-doc/playground-demos/` — **delete** once all components migrate to `.playground.ts`.

Files added per migrated component:

- `packages/components/src/<comp>/<comp>.playground.ts`.

### 7. Migration

Incremental, not big-bang:

1. **Phase 1 — infrastructure**: Add types module, extend doc-extractor for `@doc-playground`, generate the registry file (empty), wire `<app-playground>` to consume both old `PLAYGROUND_REGISTRY` AND new `PLAYGROUND_FILES` (old wins for backward-compat). Verify build green.
2. **Phase 2 — migrate primitives**: Convert the 13 inline `controls` entries to `<comp>.playground.ts`. Verify each docs page renders identically. Remove the inline entry from `playground-registry.ts`.
3. **Phase 3 — migrate compound/service demos**: Convert each bucket-N demo into a `<comp>.playground.ts`. Reuse the existing demo class (rename, attach `state`/`controls`/`snippet`). Lift any internal signals to module scope. Sketch a meaningful right-panel schema for each.
4. **Phase 4 — cleanup**: Once `PLAYGROUND_REGISTRY` is empty and `playground-demos/` is empty, delete both, drop the discriminated union, and remove the backward-compat branch in `<app-playground>`.

Each phase is independently shippable and ships behind no flag — components without a `.playground.ts` simply fall back to the placeholder until they're migrated.

### 8. Testing

Existing playground spec coverage in `apps/docs/src/app/pages/component-doc/` is currently minimal. We add:

- **Extractor unit test**: `@doc-playground` tag is captured and `DocItem.playgroundFile` is the resolved path.
- **Generator unit test**: given a manifest with 3 playground tags, the emitted `playground-files.generated.ts` has the right imports + map keys.
- **Engine integration test**: mount `<app-playground symbol="KjButtonComponent">` with a fake `PLAYGROUND_FILES`, flip a control, assert the live demo's DOM reflects the new state AND the rendered snippet matches.
- **E2E smoke**: Playwright test that visits `/docs/components/button` and asserts the playground stage + controls panel render. One smoke test, not per-component.

Snippet correctness per-component is a documentation concern, not a test concern — drift would be caught by code review on the `.playground.ts` file.

### 9. Non-goals

- **Conditional/dependent controls** (e.g. "show indent control only when variant=tree") — not in v1. Add a `when?: (values) => boolean` predicate to `ControlSpec` later if a real component needs it.
- **Validation messaging** in the right panel — not in v1.
- **Form-array controls** (an array of repeating sub-schemas) — not in v1; compound components use `number` controls + array-derived templates instead.
- **Theme picker / a11y simulators** in the playground — these are theme-generator concerns, not per-component playground concerns.
- **Persisting playground state in the URL** — not in v1; resets on navigation.

### 10. Open questions

- **Snippet formatting**: do we keep raw template-literal output, or run a lightweight Prettier-like normaliser on the snippet before display? Recommendation: raw, since the author controls formatting in the snippet fn.
- **State scope**: module-scope signals (recommended) vs static class properties vs `inject(Symbol)` registry. Module-scope is the lowest-ceremony option that lets multiple consumers (component + snippet fn) read the same instance.
- **Cross-package types**: should `PlaygroundFile` live in `@kouji-ui/components`, `@kouji-ui/core`, or a new `@kouji-ui/docs-api` package? Recommendation: `@kouji-ui/components` for now (the only consumers); promote later if `@kouji-ui/core` directives start needing playgrounds.

## Acceptance criteria

- A new `<comp>.playground.ts` file authored against the schema renders a working playground on `/docs/components/<comp>` without touching any docs-app code.
- All 57+ component docs pages eventually have a working playground; the placeholder is shown only when a component genuinely has nothing useful to demo.
- The generated registry file is reproducible — re-running the build with no source changes produces byte-identical output.
- The discriminated `controls | demo` union is removed; one shape rules.

## Out of scope

- Migrating non-component pages (theme-generator, getting-started, etc.) to this system. They already have their own bespoke shells.
- Changes to the theme-generator preview tabs (separate system).
- Visual redesign of the playground panel — keep current styling.
