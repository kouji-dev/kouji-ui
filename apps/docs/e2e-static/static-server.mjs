// Minimal static file server for the prerendered docs build.
// Serves dist/docs/browser; maps a directory route to its index.html.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';

const ROOT = resolve(process.argv[2] ?? 'dist/docs/browser');
const PORT = Number(process.argv[3] ?? 4321);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

async function resolveFile(pathname) {
  const rel = decodeURIComponent(pathname.split('?')[0]).replace(/^\/+/, '');
  const candidate = join(ROOT, rel);
  try {
    const s = await stat(candidate);
    if (s.isDirectory()) return join(candidate, 'index.html');
    return candidate;
  } catch {
    // Prerendered route folder → its index.html.
    const asIndex = join(ROOT, rel, 'index.html');
    try {
      await stat(asIndex);
      return asIndex;
    } catch {
      return join(ROOT, 'index.html'); // SPA fallback
    }
  }
}

createServer(async (req, res) => {
  try {
    const file = await resolveFile(req.url ?? '/');
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(PORT, () => {
  console.log(`static docs server on http://localhost:${PORT} (root: ${ROOT})`);
});
