import { inject } from '@angular/core';
import { RenderMode, PrerenderFallback, ServerRoute } from '@angular/ssr';
import { DocsService } from './services/docs.service';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'docs/components/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    async getPrerenderParams() {
      const docs = inject(DocsService);
      return docs.getSlugs().map(slug => ({ slug }));
    },
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
