import { Injectable, TransferState, inject } from '@angular/core';
import { DocsManifestProvider, MANIFEST_TS_KEY } from './docs-manifest.provider';
import { getManifest } from '../../lib/manifest';
import type { DocsManifest } from './docs.service';

/**
 * Server-side manifest provider.
 * Calls `getManifest()` directly (Node.js — has fs/ts-morph access),
 * then stores the result in TransferState so the browser can hydrate without an HTTP call.
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
