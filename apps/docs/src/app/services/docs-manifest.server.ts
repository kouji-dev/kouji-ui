import { Injectable, TransferState, inject } from '@angular/core';
import { DocsManifestProvider, MANIFEST_TS_KEY } from './docs-manifest.provider';
import { getManifest } from '../../lib/manifest';
import type { DocsManifest } from './docs.service';

/**
 * Server-side manifest provider.
 * Calls `getManifest()` directly (Node.js — has fs/ts-morph access),
 * then stores the result in TransferState so the browser can hydrate without an HTTP call.
 *
 * KNOWN COST, measured on the 2026-09-16 build and not yet fixed. The whole
 * manifest goes into TransferState on *every* route, because `DocsService` is
 * root-provided and the sidebar injects it everywhere. It is 2.54 MB of JSON —
 * 1.63 MB of `definitions` and 0.86 MB of `examples` — against a rendered body
 * of ~76 kB, so a prerendered page is 2.7 MB of HTML of which ~97% is a blob
 * describing 141 pages the reader did not open. Across 149 prerendered routes
 * that is 394 MB of the 399 MB in `dist/docs/browser`, and it is the dominant
 * term in first-paint bytes now that the splash no longer blocks the paint
 * (SSR F-2) — the route's own JS is only ~122 kB.
 *
 * The fix is not a one-liner, which is why it is written down instead of done:
 * only `component-doc` reads `definitions` / `examples`, and only for the page
 * it is rendering, so the transfer should be a slim index (name, title, pkg,
 * categoryPath, mainItemId, description — ~31 kB for all 142 pages) plus the
 * full `DocPage` for the current route. Client-side navigation to another doc
 * page then has nothing to read, so it needs the full manifest emitted once as
 * a static asset and fetched on demand. `DocsService.loadManifest()` is
 * already an Observable and `ComponentDocComponent` already awaits it, so the
 * consumer side is ready; what is missing is a build step that writes the JSON
 * next to the prerendered output, and a `loadPage()` that knows a slim entry
 * from a complete one.
 */
@Injectable()
export class ServerDocsManifestProvider extends DocsManifestProvider {
  private readonly transferState = inject(TransferState);

  getManifest(): DocsManifest {
    const manifest = getManifest();
    this.transferState.set(MANIFEST_TS_KEY, manifest);
    return manifest;
  }

  getSlugs(): string[] {
    return this.getManifest().pages.map(p => p.name);
  }
}
