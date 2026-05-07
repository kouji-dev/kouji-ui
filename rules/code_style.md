# Code Style

## Before any new directive
1. Read WAI-ARIA pattern at https://www.w3.org/WAI/ARIA/apg/patterns/
2. Reference Angular Material, PrimeNG, ng-primitives for behavioural edge cases
3. API: atomic (one job), minimal inputs (YAGNI), consistent `kj` prefix

## Naming
- Classes: omit Angular type suffix unless collision (`KjButton` not `KjButtonDirective`; `KjToastService` kept because `KjToast` is the directive)
- Files: same rule — omit `.directive`, `.component`, `.service` unless collision
- Specs: `button.spec.ts` not `button.directive.spec.ts`
- All selectors, class names, tokens: `kj` prefix mandatory

## `kj` prefix on all public bindings
Every `input()`, `output()`, `model()` exposes a `kj`-prefixed name externally. No exceptions. Applies to both core directives and styled wrappers.

## Signal types — prefer inference
Don't write explicit generics when TypeScript can infer from default value. Exceptions: `[]` (infers `never[]`), `input.required<T>()`, ng-packagr `.d.ts` narrowing.

## Signals
- `input()`, `model()`, `output()` — never `@Input()`/`@Output()`
- State: `signal()`, `computed()`, `effect()` — no `BehaviorSubject`, no Observables
- Always `inject()` — no constructor parameters

## Lifecycle — no lifecycle interfaces
- No `ngOnInit`, `ngOnDestroy`, `ngAfterViewInit`
- DOM access → `afterNextRender()` / `afterRender()`
- Cleanup → `DestroyRef.onDestroy()`
- Init logic → `constructor()` with `inject()`

## General
- `standalone: true` always
- `const` over `let`; never `var`
- No barrel re-exports beyond `index.ts`
- No directives that only add `data-*` with no behaviour
