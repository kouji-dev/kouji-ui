import { Injectable } from '@angular/core';
import { getManifest } from '../../lib/manifest';
import type { ComponentDoc, DocsManifest } from './docs.service';

/**
 * Server-side service for accessing docs metadata.
 * Uses the shared manifest cache — extraction runs once per server process.
 *
 * Inject this in `getPrerenderParams()` to feed Angular SSR the route list,
 * and in `app.config.server.ts` to provide the manifest token.
 */
@Injectable({ providedIn: 'root' })
export class DocsApiService {
  /** Returns the full docs manifest from the SSR server's live extraction. */
  getManifest(): DocsManifest {
    return getManifest();
  }

  /** Returns all component slugs for prerender route generation. */
  getSlugs(): string[] {
    return getManifest().components.map((c: ComponentDoc) => c.slug);
  }
}
