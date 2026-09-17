import { inject } from '@angular/core';
import { RenderMode, PrerenderFallback, ServerRoute } from '@angular/ssr';
import { DocsService } from './services/docs.service';

/**
 * Prerender manifest for the docs site.
 *
 * `fallback` is `PrerenderFallback.Server` — Angular's default when the
 * property is omitted — and it must stay that way. It governs what happens for
 * a path that was NOT prerendered, and the environment where that is true of
 * every path is `ng serve`: prerendering is a build-time step, so in dev these
 * two routes always take the fallback.
 *
 * With `Server` the dev server renders each doc page on demand, which runs
 * `ServerDocsManifestProvider` and puts the manifest in TransferState, so the
 * page has its data before it paints. With `Client` the dev server returns the
 * bare CSR shell, TransferState is empty, and `DocsService.loadManifest()`
 * falls back to an HTTP fetch that nothing answers — every doc page then hangs
 * on "Loading…" forever. That is exactly what happened when this was switched
 * to `Client` on the grounds that a static deploy has no runtime server.
 *
 * That reasoning was right about production and wrong about this setting being
 * dead. In a build every slug IS enumerated by `getPrerenderParams()` (144
 * pages emitted), so the fallback is never consulted; and the static deploy
 * (`vercel.json` → `outputDirectory: dist/docs/browser`, blanket rewrite to
 * `/index.csr`) resolves unknown paths itself, so the host decides, not this
 * file. `Server` therefore costs nothing in production and is load-bearing in
 * development. `apps/docs/e2e/docs-pages.spec.ts` guards it.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'docs/headless/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      const docs = inject(DocsService);
      return docs.getSlugs().map(slug => ({ slug }));
    },
  },
  {
    path: 'docs/components/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
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
