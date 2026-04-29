import { InjectionToken } from '@angular/core';
import type { DocsManifest } from './services/docs.service';

/** Server-side only: the pre-extracted docs manifest injected via app.config.server.ts. */
export const DOCS_MANIFEST_TOKEN = new InjectionToken<DocsManifest>('DOCS_MANIFEST');
