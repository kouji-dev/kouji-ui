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

## CSS — reach for the base tokens and kj components first

Before adding ANY new style or markup, refer to `packages/themes/src/base.css`
to find the existing token, and to `packages/components/src/` for the existing
component or directive. Roll your own only when nothing fits.

**Tokens (mandatory):**
- **Spacing** (`padding` / `margin` / `gap` / `inset`): always use
  `--kj-base-space-*` (`xs 4 / sm 8 / md 12 / lg 16 / xl 24 / 2xl 32 / 3xl 48
  / 4xl 64 / 5xl 96 / 6xl 128`). Round off-token values to the nearest token —
  never ship raw `px`/`rem` for spacing. The only escape hatch is geometry
  that is meaningful at a specific px (icon hit area, hairline divider).
  This applies to **every** stylesheet under `packages/components/src/**` —
  including the table family (`table.css`, `table-toolbar` styles, filter /
  editor surfaces). Reach for the token first; only fall back to a literal
  with a comment explaining why a token doesn't apply.
- **Typography sizes**: prefer `--kj-text-*` (`xs / sm / base / lg / xl / 2xl`).
  For label-mono sizes below `xs` (12px) keep a rem literal — they have no
  token yet.
- **Colors / borders / radii / shadows**: always go through the themed
  `--kj-*` tokens. Hard-coded hex is allowed only inside theme-specific
  artwork (e.g. the per-theme loader figures).
- **Fonts**: `--kj-font-display` / `--kj-font-sans` / `--kj-font-mono`.
  Display headings also pair with `--kj-display-weight`,
  `--kj-display-italic`, `--kj-letter-spacing`.

**Components (prefer over custom markup):**
- Use `kj-button` / `kj-link` / `kj-tag` / `kj-badge` / `kj-select` /
  `kj-progress-bar` / `kj-card` / `kj-alert` / etc. before reaching for a
  native element + custom CSS. Native fallback is fine when the kj component
  doesn't match the semantic (e.g. a click-to-expand card is not `kj-card`).
- When you must extend a kj component, layer a single class on the host —
  do not override its internal classes. If you find yourself needing more
  than a small visual delta, propose a new variant in the core package.

**Encapsulation:**
- Do not use `encapsulation: ViewEncapsulation.None`. Component styles
  must stay scoped. The only exception is generated SVG that needs
  global classes (those should still keep their style block local and use
  `:host` / class selectors).
