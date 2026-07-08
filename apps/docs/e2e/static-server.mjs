// Dependency-free static file server for the prerendered docs build.
// Serves dist/docs/browser with directory-index (dir → dir/index.html) so
// prerendered routes like /docs/components/editor resolve correctly.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../dist/docs/browser', import.meta.url));
const PORT = Number(process.env.PORT ?? 4321);

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.map': 'application/json',
};

async function tryFiles(pathname) {
  const clean = decodeURIComponent(pathname.split('?')[0]);
  const candidates = [];
  const direct = join(ROOT, clean);
  candidates.push(direct);
  candidates.push(join(direct, 'index.html'));
  candidates.push(join(ROOT, clean, 'index.html'));
  for (const c of candidates) {
    try {
      const s = await stat(c);
      if (s.isFile()) return c;
    } catch {
      /* next */
    }
  }
  // SPA fallback → root index.html
  return join(ROOT, 'index.html');
}

createServer(async (req, res) => {
  const file = await tryFiles(req.url ?? '/');
  try {
    const body = await readFile(file);
    res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream');
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end('not found');
  }
}).listen(PORT, () => console.log(`static docs on http://localhost:${PORT}`));
