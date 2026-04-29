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

## Form Controls: Shared KjFormControlDirective

All form input directives (`KjInputDirective`, `KjCheckboxDirective`, `KjRadioDirective`, `KjSelectDirective`, `KjToggleDirective`, and any future textarea/switch/etc.) **must** compose `KjFormControlDirective` via `hostDirectives`.

**Location:** `packages/core/src/primitives/form-control.directive.ts`

`KjFormControlDirective` is the single place that implements Angular's `ControlValueAccessor` and wires into reactive forms / template-driven forms. It:
- Registers as `NG_VALUE_ACCESSOR` so `formControl`, `formControlName`, and `ngModel` all work
- Injects `NgControl` (optional) to read validity/touched/dirty state
- Exposes signals for consumers: `value`, `disabled`, `touched`, `dirty`, `valid`, `invalid`
- Provides `notifyChange(val)` and `notifyTouched()` methods that form controls call on user interaction

```ts
@Directive({
  selector: '[kjFormControl]',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: KjFormControlDirective, multi: true }],
})
export class KjFormControlDirective implements ControlValueAccessor {
  readonly value    = signal<unknown>(undefined);
  readonly disabled = signal<boolean>(false);
  readonly touched  = signal<boolean>(false);

  private _onChange?: (val: unknown) => void;
  private _onTouched?: () => void;

  writeValue(val: unknown): void       { this.value.set(val); }
  registerOnChange(fn: (v: unknown) => void): void { this._onChange = fn; }
  registerOnTouched(fn: () => void): void          { this._onTouched = fn; }
  setDisabledState(isDisabled: boolean): void      { this.disabled.set(isDisabled); }

  notifyChange(val: unknown): void { this.value.set(val); this._onChange?.(val); }
  notifyTouched(): void            { this.touched.set(true); this._onTouched?.(); }
}
```

Form controls then compose it:
```ts
@Directive({
  selector: '[kjInput]',
  hostDirectives: [
    KjFocusRingDirective,
    { directive: KjDisabledDirective, inputs: ['disabled: kjDisabled'] },
    KjFormControlDirective, // ← Angular forms wired here
  ],
  host: {
    '(input)': 'formCtrl.notifyChange($event.target.value)',
    '(blur)':  'formCtrl.notifyTouched()',
    '[attr.aria-invalid]': 'formCtrl.touched() && !formCtrl.valid() ? "true" : null',
  },
})
export class KjInputDirective {
  readonly formCtrl = inject(KjFormControlDirective);
}
```

The `KjFormFieldDirective` in `packages/core/src/form/` reads validity from the injected `NgControl` (not a manual `kjFieldInvalid` input) when used alongside Angular forms.

## Table: TanStack Table Integration

`KjTableDirective` wraps `@tanstack/angular-table` (NOT `@tanstack/table-core` directly). It must:

- Accept `data = input.required<T[]>()` and `columns = input.required<ColumnDef<T>[]>()`
- Internally call `createAngularTable(...)` to create the table instance
- Expose the table state as signals: `rows`, `headerGroups`, `pageIndex`, `pageSize`, etc.
- Provide the table via an `InjectionToken` context so child directives (`KjTableHeaderDirective`, `KjTableRowDirective`) can inject it and render
- `KjTableHeaderDirective` on `<th>` injects context, binds sort state, and calls `header.column.getToggleSortingHandler()`
- No marker directives that only add `data-*` attributes — `<tr>` and `<td>` do not need directives unless they manage behavior

**Install:** `pnpm add @tanstack/angular-table --workspace-root` (in addition to `@tanstack/table-core` already installed)

## What NOT to Build

Do not create directives that only add `data-*` attributes with no behavior. A directive must do at least one of:
- Manage state (signals, context)
- Implement keyboard interaction
- Apply ARIA semantics
- Wrap a CDK service
- Compose behaviors via `hostDirectives`

**Examples of useless directives (do NOT create):**
- `KjTableRowDirective` that only sets `[attr.data-row]="''"` — pointless; use CSS selectors on `tr` instead
- `KjTableCellDirective` that only sets `[attr.data-cell]="''"` — same

## CDK Wrapping Rule — Don't Reimplement What CDK Already Provides

If Angular CDK has a primitive for a component, **wrap or extend it** — never reimplement the logic from scratch.

| Component | CDK Primitive to Wrap |
|---|---|
| Accordion | `CdkAccordion`, `CdkAccordionItem` (`@angular/cdk/accordion`) |
| Menu / Dropdown | `CdkMenu`, `CdkMenuItem`, `CdkMenuTrigger`, `CdkMenuBar` (`@angular/cdk/menu`) |
| Select / Listbox | `CdkListbox`, `CdkOption` (`@angular/cdk/listbox`) |
| Dialog / Modal | `Dialog` service + `CdkDialogContainer` (`@angular/cdk/dialog`) |
| Overlay positioning | `Overlay`, `OverlayRef`, `ConnectedPositionStrategy` (`@angular/cdk/overlay`) |
| Tabs | `FocusKeyManager` (`@angular/cdk/a11y`) — CDK has no tab primitive, implement our own |
| Stepper | `CdkStepper`, `CdkStep` (`@angular/cdk/stepper`) |

**Wrapping pattern:**
```ts
// Extend CDK directive and add kj-specific behavior on top
@Directive({
  selector: '[kjAccordionItem]',
  standalone: true,
  providers: [{ provide: KJ_ACCORDION_ITEM, useExisting: KjAccordionItemDirective }],
})
export class KjAccordionItemDirective extends CdkAccordionItem {
  // add signal-based open state, TSDoc, kj-specific inputs
}
```

Or compose via `hostDirectives` when extending isn't clean:
```ts
@Directive({
  selector: '[kjOption]',
  standalone: true,
  hostDirectives: [{ directive: CdkOption, inputs: ['cdkOptionValue: kjOptionValue'] }],
})
export class KjOptionDirective { ... }
```

**Why:** CDK primitives handle ARIA patterns, keyboard interactions, and edge cases that are hard to get right. Wrapping them gives us all that for free and keeps us aligned with the Angular ecosystem.

## Overlay Primitive (Shared by All Overlay Components)

All overlay-based components (`KjDialogDirective`, `KjTooltipDirective`, `KjPopoverDirective`, `KjMenuDirective`, `KjSelectDirective`) **must** use the shared `KjOverlayRef` primitive from `packages/core/src/primitives/overlay.ts`.

**Never reimplement overlay logic per component.** The overlay primitive wraps Angular CDK `Overlay` + `PositionStrategy` and is the single place overlay lifecycle is managed.

**Location:** `packages/core/src/primitives/overlay.ts`

**What it provides:**
- `createOverlay(config: KjOverlayConfig): KjOverlayRef` — creates and returns a managed overlay ref
- `KjOverlayRef` — wraps `OverlayRef`, exposes `open()`, `close()`, `isOpen: Signal<boolean>`, `afterClose$`
- Position strategies: `connected` (for tooltips/popovers/menus/select) and `global-center` (for dialogs/modals)
- Handles `Escape` key globally and backdrop click dismissal
- Lifecycle cleanup via `DestroyRef`

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
