import { InjectionToken, makeStateKey } from '@angular/core';
import type { DocsManifest } from './docs.service';

/** Abstract contract for manifest access — platform-specific implementations provided via DI. */
export abstract class DocsManifestProvider {
  /** Returns the manifest synchronously, or null if not yet available (browser before HTTP load). */
  abstract getManifest(): DocsManifest | null;
  abstract getSlugs(): string[];
}

export const DOCS_MANIFEST_PROVIDER = new InjectionToken<DocsManifestProvider>('DocsManifestProvider');

/** TransferState key shared between server and browser providers. */
export const MANIFEST_TS_KEY = makeStateKey<DocsManifest>('docs-manifest');
