# Stack & Dependency Policy

## Core Stack

- **Angular 21** minimum — no support for older versions
- **Turborepo + pnpm workspaces** monorepo
- **Tailwind CSS v4** in `@kouji-ui/ui` only
- **TanStack Table** for the table primitive
- **Apache ECharts** for the chart primitive

## Dependency Policy — Zero External UI Dependencies

**No Angular CDK. No floating-ui. No third-party UI primitives.** All directive behaviour is implemented from scratch using native browser APIs and Angular 21 signals.

**Why:** Third-party dependencies leak their own abstractions through our API, ship opinions the user can't override, and couple our release cycle to theirs. A headless library's value is full control — external UI deps work against that goal.

**What this means in practice:**
- Keyboard navigation (arrow keys, Home/End, type-ahead) → implement directly via `host` keydown bindings
- Focus trapping → native `inert` attribute or our own `KjFocusTrap` using `TreeWalker`
- Live regions → our own `KjLiveRegion` directive
- Overlay positioning → CSS `position: fixed` + `anchor-positioning` API or manual coordinate calculation
- Roving tabindex → our own `KjRovingTabindex` primitive

**Exception process:** If a specific capability genuinely cannot be built without an external dependency, raise it explicitly for approval. Default answer is no.

## Approved External Dependencies

| Package | Purpose | Where |
|---|---|---|
| `@tanstack/angular-table` | Table primitive | `@kouji-ui/core` |
| `apache-echarts` | Chart primitive | `@kouji-ui/core` |
| `tailwindcss` v4 | Styling | `@kouji-ui/ui` only |

Any new runtime dependency requires explicit approval before being added.
