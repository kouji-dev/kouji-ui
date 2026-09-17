#!/usr/bin/env node
/**
 * THE static file server for the prerendered docs build
 * (`dist/docs/browser`). Resolves directory routes to their `index.html`
 * (so `/docs` → `dist/docs/browser/docs/index.html`) and falls back to the
 * root `index.html` for unknown paths (SPA behaviour). Zero dependencies.
 *
 * Usage: node scripts/serve-docs-dist.mjs [port] [root]
 *
 * There used to be three of these — this one, `apps/docs/e2e/static-server.mjs`
 * and `apps/docs/e2e-static/static-server.mjs` — each with its own MIME table,
 * its own directory-index rule and its own idea of the SPA fallback, so a
 * prerendered route could resolve under one Playwright config and 404 under
 * another (SSR review F-5). Every config now starts this one; the duplicates
 * are deleted and `apps/docs/src/app/app.routes.server.spec.ts` asserts they
 * stay deleted.
 */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number.isFinite(Number(process.argv[2])) ? Number(process.argv[2]) : 4331;
// The root is overridable so a caller can serve a different build directory;
// it defaults to the one every Playwright config actually wants.
const ROOT = process.argv[3]
  ? resolve(process.argv[3])
  : fileURLToPath(new URL('../dist/docs/browser', import.meta.url));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

async function tryFile(path) {
  try {
    const s = await stat(path);
    if (s.isFile()) return path;
    if (s.isDirectory()) {
      const idx = join(path, 'index.html');
      const si = await stat(idx);
      if (si.isFile()) return idx;
    }
  } catch {
    /* not found */
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const safe = normalize(url).replace(/^(\.\.[/\\])+/, '');
  const candidate = join(ROOT, safe);

  let file = await tryFile(candidate);
  if (!file && !extname(safe)) file = await tryFile(join(candidate, 'index.html'));
  if (!file) file = join(ROOT, 'index.html'); // SPA fallback

  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`static docs server: http://localhost:${PORT}/ (root: ${ROOT})`);
});
