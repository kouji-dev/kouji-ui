# Agent Orchestration Strategy

When executing an implementation plan, agents must be managed intelligently for speed: **consecutive when order matters, parallel when it doesn't.**

## Phase 1 — Bootstrap (consecutive)

Project scaffolding has strict ordering dependencies. Run these steps one at a time:

1. Angular CLI: create empty workspace (`ng new`)
2. Angular CLI: generate `@kouji-ui/core` library
3. Angular CLI: generate `@kouji-ui/ui` library
4. Angular CLI: generate `apps/docs` application
5. Add Turborepo + configure `turbo.json` and `pnpm-workspace.yaml`
6. Add base dependencies (TanStack, ECharts, floating-ui, Tailwind v4, Vitest, Playwright)

Never parallelize bootstrap — each step assumes the previous one completed.

## Phase 2 — Directive Implementation (maximally parallel)

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

Each agent owns its directive folder end-to-end: directive file, context file, spec file, index.ts.

## Phase 3 — Docs Pages (parallel, deferred verification)

Doc pages for each component can be built in parallel once library contracts are defined. Spawn one agent per component page. Defer cross-cutting verification (full build, E2E, a11y audit) to a single follow-up agent.

## General Rules

- Never spawn a parallel agent that has a read/write dependency on another parallel agent's output
- Shared primitives (overlay service, context tokens) must complete before dependent directives are parallelized
- After any parallel phase, run a single verification agent: build, tests, a11y checks
