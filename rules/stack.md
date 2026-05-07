# Stack

- Angular 21+ only
- Turborepo + pnpm workspaces
- TanStack Table — table primitive
- Apache ECharts — chart primitive

## Zero external UI deps
No Angular CDK. No floating-ui. No third-party UI primitives. Native browser APIs + Angular signals only.

New dep needs → raise explicitly. Default: no.

## Approved deps

| Package | Purpose | Where |
|---|---|---|
| `@tanstack/angular-table` | Table | `@kouji-ui/core` |
| `apache-echarts` | Chart | `@kouji-ui/core` |
