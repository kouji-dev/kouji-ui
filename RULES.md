# kouji-ui Coding Rules & Conventions

## Stack

- **Angular 21** minimum — no support for older versions
- **Turborepo + pnpm workspaces** monorepo
- **Tailwind CSS v4** in `@kouji-ui/ui` only
- **Angular CDK** for overlays, focus management, live regions
- **TanStack Table** for the table primitive
- **Apache ECharts** for the chart primitive

## Package Rules

- `@kouji-ui/core` — zero CSS, zero components, directives only
- `@kouji-ui/ui` — styled implementation using Tailwind v4, wraps core directives in Angular components

## Naming Prefix

All directive selectors, class names, and injection tokens use the `kj` prefix:
- Selectors: `[kjButton]`, `[kjSelect]`, `[kjOption]`
- Classes: `KjButtonDirective`, `KjSelectDirective`, `KjOptionDirective`
- Tokens: `KJ_SELECT`, `KJ_DIALOG`, `KJ_TABS`

## Agent Orchestration Strategy

When executing an implementation plan, agents must be managed intelligently for speed. The rule is: **consecutive when order matters, parallel when it doesn't.**

### Phase 1 — Bootstrap (consecutive)

Project scaffolding has strict ordering dependencies. Run these steps one at a time, each completing before the next starts:

1. Angular CLI: create empty workspace (`ng new`)
2. Angular CLI: generate `@kouji-ui/core` library (`ng generate library`)
3. Angular CLI: generate `@kouji-ui/ui` library
4. Angular CLI: generate `apps/docs` application
5. Add Turborepo + configure `turbo.json` and `pnpm-workspace.yaml`
6. Add base dependencies (CDK, TanStack, ECharts, Tailwind v4, Vitest, Playwright)

Never parallelize bootstrap — each step assumes the previous one completed.

### Phase 2 — Directive Implementation (maximally parallel)

Once the workspace exists, each directive is independent. Spawn one agent per directive and run all in parallel:

```
Agent: kjButton + kjDisabled     |
Agent: kjInput                   |
Agent: kjCheckbox                | all running
Agent: kjRadioGroup + kjRadio    | simultaneously
Agent: kjToggle + kjBadge        |
Agent: kjAvatar                  |
Agent: kjSelect + kjOption       |
... etc                          |
```

Spawn as many agents as possible. Each agent owns its directive folder end-to-end: directive file, context file, spec file, index.ts.

### Phase 3 — Docs Pages (parallel, deferred verification)

Doc pages for each component can be built in parallel, assuming the library contracts (selectors, inputs, TSDoc) are already defined even if not fully built. Spawn one agent per component page:

```
Agent: docs/button page    |
Agent: docs/select page    | all running
Agent: docs/dialog page    | simultaneously
... etc                    |
```

Defer cross-cutting verification (full build, E2E, a11y audit) to a single follow-up agent after all parallel agents complete.

### General Rules

- Never spawn a parallel agent that has a read/write dependency on another parallel agent's output
- Bootstrap and overlay CDK wiring (shared primitives, context tokens) must complete before dependent directives are parallelized
- After any parallel phase, run a single verification agent: build, tests, a11y checks

## Reference: Angular Primitives

Use [Angular Primitives](https://angularprimitives.com/getting-started/introduction) as the primary reference for how to write headless, directive-based UI primitives. When in doubt about how to structure a directive, compose behaviors, or handle state in a headless way, consult Angular Primitives first.

## Signals — Use Everywhere

- **Always use signal inputs/outputs:** `input()`, `input.required()`, `model()`, `output()` — never `@Input()` or `@Output()`
- **Always use `inject()`** — never constructor injection
- **State:** `signal()`, `computed()`, `effect()`, `linkedSignal()`, `resource()` — no BehaviorSubject, no Observables for local state
- **Effects over subscriptions:** prefer `effect()` and `computed()` over manual subscription management

## Lifecycle — No Lifecycle Interfaces

- **Never use** `AfterViewInit`, `AfterContentInit`, `OnInit`, `OnDestroy` interfaces or their corresponding lifecycle methods
- **DOM access after render:** use `afterNextRender()` (first render only) or `afterRender()` (every render)
- **Cleanup:** use `DestroyRef` + `destroyRef.onDestroy()` — never `ngOnDestroy()`
- **Initialization logic** belongs in the `constructor()` using `inject()` and the above hooks

```ts
// correct
constructor() {
  const destroyRef = inject(DestroyRef);
  afterNextRender(() => {
    // DOM access here
    destroyRef.onDestroy(() => { /* cleanup */ });
  });
}

// never
ngAfterViewInit() { ... }
ngOnDestroy() { ... }
```

## Core Directive Architecture

### Signal-Context Pattern

Inter-directive communication (e.g. Select ↔ Option, Tabs ↔ TabPanel) uses injected signal contexts via `InjectionToken`:

```ts
// 1. Define a context interface + token
export interface KjSelectContext {
  value: Signal<unknown>;
  open: Signal<boolean>;
  select: (value: unknown) => void;
}
export const KJ_SELECT = new InjectionToken<KjSelectContext>('KjSelect');

// 2. Root directive provides it
@Directive({
  selector: '[kjSelect]',
  providers: [{ provide: KJ_SELECT, useExisting: KjSelectDirective }]
})
export class KjSelectDirective implements KjSelectContext { ... }

// 3. Child directives inject it
@Directive({ selector: '[kjOption]' })
export class KjOptionDirective {
  private ctx = inject(KJ_SELECT);
}
```

### Host Directives for Behavior Composition

Shared behaviors (disabled state, focus ring, ARIA attributes) are standalone directives composed via `hostDirectives`:

```ts
@Directive({
  selector: '[kjButton]',
  hostDirectives: [KjDisabledDirective, KjFocusRingDirective]
})
export class KjButtonDirective { ... }
```

### ARIA via Host Bindings

All accessibility attributes are declared in the directive's `host` object — never set via `Renderer2` or direct DOM manipulation:

```ts
@Directive({
  selector: '[kjOption]',
  host: {
    'role': 'option',
    '[attr.aria-selected]': 'selected()',
    '[attr.aria-disabled]': 'disabled()',
  }
})
```

## Accessibility

- **Target:** WCAG 2.1 AAA for every component
- All keyboard interactions must be implemented (arrow keys, Enter, Space, Escape, Tab)
- Use CDK `FocusKeyManager` for composite widgets (menus, tabs, listboxes)
- Use CDK `FocusTrap` for modal dialogs
- Use CDK `LiveAnnouncer` for dynamic content announcements
- Expose `a11y` utilities in `@kouji-ui/core/a11y`:
  - `KjFocusTrapDirective`
  - `KjLiveRegionDirective`
  - `KjRovingTabindexDirective`
  - `KjVisuallyHiddenDirective`

## File & Folder Conventions

```
packages/core/src/
  primitives/       ← shared behavior directives
  <component>/
    <component>.directive.ts
    <component>.context.ts   ← InjectionToken + interface (if needed)
    index.ts
  a11y/             ← accessibility utilities
  index.ts

packages/ui/src/
  <component>/
    <component>.component.ts
    index.ts
  styles/
    kj.css          ← Tailwind v4 @theme tokens
```

## TSDoc — Required on Everything Public

Every exported directive, class, interface, type, method, input, and output **must** have a TSDoc comment. The docs app uses `ts-morph` to extract these at build time and generate documentation pages automatically. Missing TSDoc = missing docs.

Required tags:
- `/** Description of what this does */` on every export
- `@param` for method parameters
- `@returns` for methods that return a value
- `@example` for directives and complex APIs — show real usage

```ts
/**
 * Marks a button as disabled, setting `aria-disabled` and blocking interaction.
 *
 * @example
 * ```html
 * <button kjButton [kjDisabled]="isLoading()">Submit</button>
 * ```
 */
@Directive({ selector: '[kjDisabled]' })
export class KjDisabledDirective {
  /** Whether the element is disabled. */
  disabled = input<boolean>(false);
}
```

Internal helpers and private members do not need TSDoc.

## General Code Style

- Standalone directives and components always (`standalone: true` is the default in Angular 17+)
- No NgModules
- Prefer `const` over `let`; never `var`
- No comments unless the WHY is non-obvious
- No barrel re-exports beyond `index.ts` per package/feature
