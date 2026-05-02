import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { extractDocsManifest } from './lib/docs-extractor';
import type { DocsManifest } from './app/services/docs.service';

const browserDistFolder = join(import.meta.dirname, '../browser');
const app = express();
const angularApp = new AngularNodeAppEngine();

/** Reads the pre-built manifest JSON; falls back to live ts-morph extraction. */
function loadManifest(): DocsManifest {
  const candidates = [
    // Production dist path
    resolve(import.meta.dirname, '../browser/assets/docs-manifest.json'),
    // Dev server path (ng serve runs from monorepo root)
    resolve(process.cwd(), 'apps/docs/src/assets/docs-manifest.json'),
    // Dev server path (ng serve runs from apps/docs)
    resolve(process.cwd(), 'src/assets/docs-manifest.json'),
  ];
  for (const p of candidates) {
    try {
      return JSON.parse(readFileSync(p, 'utf-8')) as DocsManifest;
    } catch {
      // try next
    }
  }
  // Last resort: live extraction (dev only — requires monorepo context)
  return extractDocsManifest();
}

/**
 * Docs API — serves manifest data. Reads pre-built JSON first; live extraction as fallback.
 */
app.get('/api/docs/manifest', (_req, res) => {
  try {
    res.json(loadManifest());
  } catch (e) {
    res.status(500).json({ error: 'Extraction failed', detail: String(e) });
  }
});

app.get('/api/docs/components/:slug', (req, res) => {
  try {
    const manifest = loadManifest();
    const component = manifest.components.find(c => c.slug === req.params['slug']);
    if (!component) {
      res.status(404).json({ error: `Component '${req.params['slug']}' not found` });
      return;
    }
    res.json(component);
  } catch (e) {
    res.status(500).json({ error: 'Extraction failed', detail: String(e) });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then(response => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) throw error;
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
