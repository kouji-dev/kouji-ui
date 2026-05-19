# Vercel Deployment for `apps/docs`

**Status:** Draft
**Date:** 2026-05-19
**Branch:** `chore/vercel-deploy`
**Worktree:** `.worktrees/vercel-deploy`

## Goal

Stand up a reproducible Vercel deployment for the `apps/docs` site so that:

- Every push to `chore/vercel-deploy` produces a preview deploy.
- Once validated, merging to `main` makes `main` the production deploy and every PR auto-gets a preview URL.
- All Vercel-related config is checked in so the workflow is the project default — not bound to one developer's laptop.

## Scope

In scope:

- New `vercel.json` at the repo root pinning monorepo build + install commands.
- Optional `.vercelignore` to keep deploys lean (no source of unrelated packages).
- Vercel project creation via the dashboard, linked to GitHub repo `kouji-dev/kouji-ui`.
- Production branch set to `main`; preview branches enabled by default.

Out of scope:

- Deploying any other app in the monorepo (none exists today).
- Custom domain setup.
- Environment-variable wiring (none required for the docs site as of today).
- CI changes — Vercel's GitHub integration handles triggers; no GitHub Action needed.

## Why this design

`apps/docs` uses `@angular/build:application` with SSR enabled. Vercel's Angular preset auto-detects SSR and produces serverless functions. The repo is a pnpm + turbo monorepo, so the build must run from the repo root, not from `apps/docs` in isolation (workspace deps like `@kouji-ui/components` resolve only from root).

### Vercel project settings

| Setting | Value |
|---|---|
| Framework Preset | Angular |
| Root Directory | _(repo root — default)_ |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm build:docs` |
| Output Directory | `dist/docs` |
| Node.js Version | 20.x (matches local `@types/node: ^20`) |
| Production Branch | `main` |

`vercel.json` at repo root pins these so they're version-controlled and survive dashboard edits. Keeping the Root Directory at the repo root avoids `cd ../..` hacks and lets pnpm + turbo run naturally from the workspace root.

### Why `outputMode: 'server'` matters

`apps/docs` runs with `outputMode: 'server'` (verified in `angular.json`): the build emits `dist/docs/browser/` for static assets and `dist/docs/server/server.mjs` as the SSR entry. Vercel's Angular preset detects this layout and wraps `server.mjs` as a Node serverless function automatically — no custom adapter needed, no extra `vercel.json` routing.

### Alternatives considered

- **Vercel CLI only (`vercel link`)** — works but writes config to `.vercel/` which is gitignored. Fails the "make it the default" requirement.
- **GitHub Actions → `vercel deploy --prebuilt`** — more moving parts, no benefit for this site.
- **Static export instead of SSR** — would lose SSR features already enabled in `angular.json`; not worth the regression.

## Implementation steps

1. Create worktree `.worktrees/vercel-deploy` off `main` on branch `chore/vercel-deploy`. *(done)*
2. Write this spec in the worktree.
3. Add `vercel.json` at repo root with the build/install/output commands above.
4. Add `.vercelignore` covering: `**/.angular`, `**/node_modules`, `**/dist` (except `dist/docs`), `**/.turbo`, `apps/a11y`, `packages/*/src/**/*.spec.ts`, `e2e`.
5. Local sanity check: `pnpm install && pnpm build:docs` from the worktree must succeed and emit `dist/docs/{browser,server}/`.
6. Commit changes on `chore/vercel-deploy` (do NOT push until user validates).
7. Walk through Vercel signup + project creation using Chrome MCP (Chrome, not Opera). Link `kouji-dev/kouji-ui`, set the project settings above, pick `chore/vercel-deploy` as the deploy target for the first preview.
8. Push the branch only after the user confirms config locally.
9. Verify preview deploy succeeds and the docs site renders correctly (golden path: home page loads, one component doc page loads, no SSR errors in Vercel logs).
10. When happy, merge to `main` via PR — at that point Vercel auto-promotes `main` to production.

## Risks & mitigations

- **SSR runtime mismatch on Vercel** — Vercel Angular SSR support is mature but version-sensitive. Mitigation: pin Node 20.x on dashboard; if deploy fails, fall back to building as static (`outputMode: 'static'`) as a temporary workaround and file a follow-up.
- **Monorepo install path** — `cd ../..` only works if Vercel's Root Directory is set correctly. The build will visibly fail in Vercel logs if misconfigured; easy to spot and fix.
- **Workspace symlinks** — pnpm workspace symlinks must survive Vercel's caching. Standard pnpm support on Vercel handles this; no special config needed.

## Verification checklist

- [ ] `vercel.json` and `.vercelignore` committed on `chore/vercel-deploy`.
- [ ] `pnpm build:docs` succeeds locally in the worktree.
- [ ] Vercel project linked to `kouji-dev/kouji-ui`.
- [ ] First preview deploy succeeds and serves the docs site.
- [ ] Home page + one component doc page render correctly on the preview URL.
- [ ] No SSR errors in Vercel runtime logs.
- [ ] Branch pushed only after user validation.
- [ ] Decision recorded: merge to `main` to make this the project default.

## Follow-ups (not in this branch)

- Add a deploy status badge to the root README.
- Configure a custom domain when ready.
- Consider Vercel's "Ignored Build Step" to skip deploys when only `packages/**` changes without touching `apps/docs`.
