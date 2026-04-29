import { RenderMode, ServerRoute } from '@angular/ssr';
import { DocsService } from './services/docs.service';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'docs/components/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return DocsService.getSlugs().map(slug => ({ slug }));
    },
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
