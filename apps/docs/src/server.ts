import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { extractDocsManifest } from './lib/docs-extractor';

const browserDistFolder = join(import.meta.dirname, '../browser');
const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Docs API — serves extracted manifest data with in-memory caching.
 * Extraction runs on first request; subsequent requests use the cache.
 */
app.get('/api/docs/manifest', (_req, res) => {
  try {
    const manifest = extractDocsManifest();
    res.json(manifest);
  } catch (e) {
    res.status(500).json({ error: 'Extraction failed', detail: String(e) });
  }
});

app.get('/api/docs/components/:slug', (req, res) => {
  try {
    const manifest = extractDocsManifest();
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
