#!/usr/bin/env node
/**
 * Minimal static file server for the prerendered docs build
 * (`dist/docs/browser`). Resolves directory routes to their `index.html`
 * (so `/docs` → `dist/docs/browser/docs/index.html`) and falls back to the
 * root `index.html` for unknown paths (SPA behaviour). Zero dependencies.
 *
 * Usage: node scripts/serve-docs-dist.mjs [port]
 */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../dist/docs/browser', import.meta.url));
const PORT = Number(process.argv[2] ?? 4331);

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
