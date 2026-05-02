# Code Style & Design Process

## Design Process — Before Writing Any Directive

Before implementing a new directive or modifying an existing one:

### 1. Check WCAG 2.1
Read the relevant pattern at https://www.w3.org/TR/WCAG21/ and the WAI-ARIA Authoring Practices at https://www.w3.org/WAI/ARIA/apg/patterns/. Identify:
- The correct ARIA `role` for the element
- All required and recommended ARIA attributes (`aria-expanded`, `aria-selected`, `aria-controls`, etc.)
- Required keyboard interactions (Tab, Arrow keys, Enter, Space, Escape, Home, End)
- Focus management expectations (where focus goes on open, close, select)

### 2. Reference Established Libraries
Inspect how leading Angular libraries implement the same component. Use these as behavioral reference — not for API copying, but to understand what edge cases matter and what users expect:
- **Angular Material:** https://material.angular.dev
- **PrimeNG:** https://primeng.org
- **Ant Design for Angular:** https://ng.ant.design/docs/introduce/en
- **ng-primitives:** https://angularprimitives.com (closest to our headless approach)

### 3. Design the API
The directive API must be:
- **Atomic** — one directive, one responsibility. Compose via `hostDirectives`.
- **Simple** — fewest inputs needed to cover the real use cases. No config objects, no optional overloads for edge cases that don't exist yet (YAGNI).
- **Consistent** — follow the patterns already established in the codebase. Inputs use `kj` prefix. Boolean inputs are `input<boolean>(false)`. Context tokens are `KJ_UPPERCASE`.

## Naming Conventions

### Class Names
Omit the Angular type suffix (`Directive`, `Component`, `Service`, `Pipe`) unless two things in the same feature would share the same base name after removal.

- ✅ `KjButton` — not `KjButtonDirective`
- ✅ `KjToastService` — kept because `KjToast` already names the directive
- When collision exists: keep the suffix on the less-primary class (usually the service)

### File Names
Same rule applied to files — omit `.directive`, `.component`, `.service` unless it would create a name collision in the same folder.

- ✅ `button.ts` — not `button.directive.ts`
- ✅ `toast.service.ts` — kept because `toast.ts` is the directive file
- ✅ `dialog.example.ts`, `dialog.retro.example.ts` — descriptive multi-part suffixes are fine
- Spec files: `button.spec.ts` not `button.directive.spec.ts`

### Selectors & Tokens
All directive selectors, class names, and injection tokens use the `kj` prefix:
- Selectors: `[kjButton]`, `[kjSelect]`, `[kjOption]`
- Classes: `KjButton`, `KjSelect`, `KjOption`
- Tokens: `KJ_SELECT`, `KJ_DIALOG`, `KJ_TABS`

## Signals — Use Everywhere

- **Signal inputs/outputs:** `input()`, `input.required()`, `model()`, `output()` — never `@Input()` or `@Output()`
- **State:** `signal()`, `computed()`, `effect()`, `linkedSignal()`, `resource()` — no `BehaviorSubject`, no Observables for local state
- **Always use `inject()`** — never constructor injection parameters
- **Prefer `effect()` and `computed()`** over manual subscription management

## Lifecycle — No Lifecycle Interfaces

- **Never use** `AfterViewInit`, `AfterContentInit`, `OnInit`, `OnDestroy` interfaces or their methods
- **DOM access after render:** `afterNextRender()` (first render only) or `afterRender()` (every render)
- **Cleanup:** `DestroyRef` + `destroyRef.onDestroy()` — never `ngOnDestroy()`
- **Initialization logic** belongs in the `constructor()` using `inject()` and the hooks above

```ts
// ✅ correct
constructor() {
  const destroyRef = inject(DestroyRef);
  afterNextRender(() => {
    // DOM access here
    destroyRef.onDestroy(() => { /* cleanup */ });
  });
}

// ❌ never
ngAfterViewInit() { ... }
ngOnDestroy() { ... }
```

## TSDoc & Comments

See [`rules/tsdoc.md`](./tsdoc.md) for the full TSDoc and inline comment rules, including the custom `@doc`, `@doc-example`, `@doc-theme`, `@doc-file`, and `@category` tags used by the docs extractor. Use `packages/core/src/button/button.ts` as the canonical reference.

Key rules:
- Every exported directive, input, output, and method needs TSDoc
- Single-line `/** */` for inputs/outputs
- No inline comments unless the WHY is non-obvious
- No multi-line `/* */` blocks in source — only `/** */` for TSDoc and `//` for rare inline notes

## General Code Style

- `standalone: true` always — no NgModules
- Prefer `const` over `let`; never `var`
- No barrel re-exports beyond `index.ts` per package/feature

## What NOT to Build

Do not create directives that only add `data-*` attributes with no behaviour. A directive must do at least one of:
- Manage state (signals, context)
- Implement keyboard interaction
- Apply ARIA semantics
- Expose a useful API (methods, outputs)
- Compose behaviours via `hostDirectives`

**Examples of useless directives:**
- `KjTableRow` that only sets `[attr.data-row]=""` — pointless; use CSS `tr` selector
- `KjTableCell` that only sets `[attr.data-cell]=""` — same
