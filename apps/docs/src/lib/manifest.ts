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
import { watch, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { extractDocsManifest } from './docs-extractor';
import type { DocsManifest } from '../app/services/docs.service';

function findWorkspaceRoot(start: string): string {
  let dir = resolve(start);
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml')) && existsSync(join(dir, 'packages', 'core'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

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

  const root = findWorkspaceRoot(process.cwd());
  const paths = [
    resolve(root, 'packages/core/src'),
    resolve(root, 'packages/components/src'),
  ];
  let debounce: ReturnType<typeof setTimeout>;

  for (const p of paths) {
    try {
      watch(p, { recursive: true }, (_, filename) => {
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
}
