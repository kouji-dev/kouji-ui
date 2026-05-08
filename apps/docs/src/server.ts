import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { getManifest } from './lib/manifest';

const browserDistFolder = join(import.meta.dirname, '../browser');
const app = express();
const angularApp = new AngularNodeAppEngine();

app.get('/api/docs/manifest', (_req, res) => {
  try {
    res.json(getManifest());
  } catch (e) {
    res.status(500).json({ error: 'Extraction failed', detail: String(e) });
  }
});

app.get('/api/docs/components/:slug', (req, res) => {
  try {
    const slug = req.params['slug'];
    const page = getManifest().pages.find(p => p.name === slug);
    if (!page) {
      res.status(404).json({ error: `Page '${slug}' not found` });
      return;
    }
    res.json(page);
  } catch (e) {
    res.status(500).json({ error: 'Extraction failed', detail: String(e) });
  }
});

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then(response => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) throw error;
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
