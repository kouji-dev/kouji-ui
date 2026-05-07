# Agent Orchestration

## Prompt style — caveman
Ultra-terse. Lead with action verb. State WHAT + constraints + expected output. No filler.

## Phase 1 — Bootstrap (consecutive)
Strict order: workspace → core lib → ui lib → docs app → Turborepo → base deps.

## Phase 2 — Directives (parallel)
Each directive is independent. One agent per directive, all simultaneous. Each owns: directive, context, spec, `index.ts`.

## Phase 3 — Docs pages (parallel)
One agent per page. Single follow-up agent for cross-cutting verification (build + E2E + a11y).

## Rules
- No parallel agent with read/write dependency on another parallel agent's output
- Shared primitives complete before dependents parallelize
- Post-parallel phase → single verification agent
