#!/usr/bin/env node
/**
 * Production entry point for the docs deploy.
 *
 * This path is what the Render service's start command invokes. It was deleted
 * as dead code during the round-2 review — correctly, on the evidence: a grep
 * of the whole tree found nothing referencing it, because the only reference is
 * a start command typed into Render's dashboard, which no grep can see. The
 * next deploy built fine and then died with `nonZeroExit: 1`, because its start
 * command pointed at a file that no longer existed.
 *
 * It is kept as a thin shim rather than a second server. The real
 * implementation is `scripts/serve-docs-dist.mjs` — one static server, one MIME
 * table, one SPA-fallback rule — which is also what every Playwright config
 * starts, so local, CI and production serve the prerendered output identically.
 * The previous version of this file was a separate Express app with its own
 * copy of all three, which is how a route could resolve in CI and 404 in
 * production.
 *
 * Prefer `pnpm start` (same server, repo-root script). Once Render's start
 * command is `pnpm start` — or the service is recreated from `render.yaml` —
 * this file can go for good.
 */
// Delegate rather than re-implement. The server reads $PORT itself, which is
// how Render tells an instance where to listen.
//
// Import the file:// URL, not the filesystem path: on Windows `fileURLToPath`
// yields `c:\...`, and the ESM loader rejects a drive letter as an unknown URL
// scheme. The URL form is correct on every platform.
await import(new URL('../../../scripts/serve-docs-dist.mjs', import.meta.url).href);
