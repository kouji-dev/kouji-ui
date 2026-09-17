# Stack

- Angular 22+ only (peer range `^22.0.0` on `@angular/core`, `@angular/common`, `@angular/forms`; `rxjs ^7.8`)
- Turborepo + pnpm workspaces
- TanStack Table — table primitive
- Apache ECharts — chart primitive

## Zero external UI deps
No Angular CDK. No floating-ui. No third-party UI primitives. Native browser APIs + Angular signals only.

CDK is not imported anywhere and is **not a peer dependency** of either package (`scripts/check-package-exports.mjs` / `package-exports.spec.ts` guard the manifests). Do not add it back, even "just as a peer".

New dep needs → raise explicitly. Default: no.

## Approved deps

| Package | Purpose | Where | Declared as |
|---|---|---|---|
| `@tanstack/angular-table` | Table | `@kouji-ui/core` | dependency |
| `marked` | Chat markdown rendering | `@kouji-ui/components` | dependency (private `Marked` instance — never `marked.use()`) |
| `@tanstack/virtual-core` | Table row virtualization | `@kouji-ui/components` | optional peer, dynamic `import()` |
| `lucide-static` | Lucide icon adapter (`provideLucideIcons`) | `@kouji-ui/components` | optional peer, dynamic `import()` for the full set; tree-shaken named imports for a subset |
| `echarts` | Chart | `@kouji-ui/core` | optional peer, dynamic `import()` (`provideECharts` to supply a tree-shaken build) |
| `lexical` + `@lexical/*` | Rich-text editor engine | both | optional peers, dynamic `import()` |
| `monaco-editor` + `@monaco-editor/loader` | Code editor | `@kouji-ui/core` | optional peers, dynamic `import()` (`provideMonaco`) |

## Optional peers: the pattern
A heavy library that only some consumers need is an **optional peer** (`peerDependencies` + `peerDependenciesMeta.<name>.optional: true`), never a `dependency`:
- reached only through a dynamic `import()` so it lands in its own chunk and never in the entry FESM (`scripts/check-bundle-size.mjs` scans for static imports);
- a failed import is rethrown with a message naming the peer and the install command (`[kouji-ui] <feature> needs "<pkg>", an optional peer dependency of @kouji-ui/<pkg> that is not installed. Add it with: pnpm add <pkg>`);
- public typings must not reference the peer's types — re-declare the shape structurally (e.g. `KjVirtualRow`, `KjEChartsCore`);
- the workspace keeps it installed as a `devDependency` of the package so specs and the docs app run.

## Packaging
Every documented specifier and stylesheet path must resolve from the published tarball under Node `exports` resolution. The table of documented specifiers lives in `scripts/check-package-exports.mjs`; each package's `build` script packs and checks it, and `package-exports.spec.ts` checks the source manifests without a build. Nothing under `_examples/`, `*.example.ts`, `*.playground.ts` or `example-components.ts` may be reachable from `public-api.ts` (`scripts/check-public-api-graph.mjs`, also run by `build`).
