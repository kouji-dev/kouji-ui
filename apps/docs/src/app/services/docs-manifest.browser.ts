import { Injectable, TransferState, inject } from '@angular/core';
import { DocsManifestProvider, MANIFEST_TS_KEY } from './docs-manifest.provider';
import type { DocsManifest } from './docs.service';

/**
 * Browser-side manifest provider.
 * Reads from TransferState embedded during prerender — zero HTTP call for prerendered pages.
 * Returns null when TransferState is empty (DocsService falls back to HTTP in that case).
 */
@Injectable()
export class BrowserDocsManifestProvider extends DocsManifestProvider {
  private readonly transferState = inject(TransferState);

  getManifest(): DocsManifest | null {
    return this.transferState.get(MANIFEST_TS_KEY, null);
  }

  getSlugs(): string[] {
    return this.getManifest()?.components.map(c => c.slug) ?? [];
  }
}
