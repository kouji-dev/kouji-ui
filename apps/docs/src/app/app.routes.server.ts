import { inject } from '@angular/core';
import { RenderMode, PrerenderFallback, ServerRoute } from '@angular/ssr';
import { DocsService } from './services/docs.service';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'docs/headless/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    async getPrerenderParams() {
      const docs = inject(DocsService);
      return docs.getSlugs().map(slug => ({ slug }));
    },
  },
  {
    path: 'docs/components/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    async getPrerenderParams() {
      const docs = inject(DocsService);
      return docs.getStyledComponentSlugs().map(slug => ({ slug }));
    },
  },
  // Theme generator is purely interactive: there's nothing to prerender
  // (no SEO content) and it reads live CSS-var values from the loaded
  // theme stylesheets to seed the draft — both reasons it has to render
  // in the browser, never on the server.
  {
    path: 'theme-generator',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
