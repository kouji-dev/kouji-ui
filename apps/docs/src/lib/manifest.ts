/**
 * Shared manifest cache for the Angular SSR server.
 *
 * Both `server.ts` (Express API routes) and `app.config.server.ts`
 * (Angular SSR rendering) call `getManifest()` — the extraction runs
 * exactly once and the result is reused across all requests.
 *
 * In dev the file watcher invalidates the cache when any source file
 * in packages/core/src changes; the next request re-extracts.
 */
import { watch } from 'node:fs';
import { resolve } from 'node:path';
import { extractDocsManifest } from './docs-extractor';
import type { DocsManifest } from '../app/services/docs.service';

let _manifest: DocsManifest | null = null;
let _watcherStarted = false;

/** Returns the docs manifest, extracting and caching it on first call. */
export function getManifest(): DocsManifest {
  if (_manifest) return _manifest;
  _manifest = extractDocsManifest();
  startWatcher();
  return _manifest;
}

/** Clears the in-memory cache so the next call re-extracts. */
export function invalidateManifest(): void {
  _manifest = null;
}

function startWatcher(): void {
  if (_watcherStarted) return;
  _watcherStarted = true;

  const coreSrc = resolve(process.cwd(), 'packages/core/src');
  let debounce: ReturnType<typeof setTimeout>;

  try {
    watch(coreSrc, { recursive: true }, (_, filename) => {
      if (!filename?.endsWith('.ts') || filename.includes('.spec.')) return;
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        console.log(`[docs] ${filename} changed — invalidating manifest`);
        invalidateManifest();
      }, 300);
    });
  } catch {
    // File watching not available (CI, containers) — silent fail
  }
}
