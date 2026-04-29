import { RenderMode, PrerenderFallback, ServerRoute } from '@angular/ssr';
import { getDocsSlugs } from '../lib/docs-extractor';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'docs/components/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    async getPrerenderParams() {
      const slugs = getDocsSlugs();
      return slugs.map((slug: string) => ({ slug }));
    },
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
