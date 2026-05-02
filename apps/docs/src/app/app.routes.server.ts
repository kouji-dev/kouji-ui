import { RenderMode, PrerenderFallback, ServerRoute } from '@angular/ssr';
import { getManifest } from '../lib/manifest';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'docs/components/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    async getPrerenderParams() {
      return getManifest().components.map(c => ({ slug: c.slug }));
    },
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
