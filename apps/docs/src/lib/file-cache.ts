import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import type { DocItem, InputDef } from './docs-extractor.types';

/**
 * Disk cache for the docs extractor. Each source file's per-pass result is
 * keyed by SHA-256 of its content; on rebuild we only re-parse files whose
 * content changed since the previous run.
 *
 * Bump CACHE_VERSION whenever the extractor's output shape changes so old
 * caches are silently discarded.
 */
/** Output-shape version. Bump whenever the DocItem / DocExample schema
 *  gains a required field — otherwise the cache will replay stale items
 *  whose new fields are silently undefined.
 *
 *  v1 → original schema
 *  v2 → DocExample.slug
 *  v3 → DocExample.bucket + DocItem.{prereqs, callouts, importOverride,
 *       keyboard, aria, touchTarget, a11yProse, related} */
const CACHE_VERSION = 3;

export interface CachedFile {
  sha: string;
  /** DocItems emitted by all detectors for this file. */
  items: DocItem[];
  /** [className, ownInputs[]] pairs needed for hostDirectives forwarding. */
  ownInputs: Array<[string, InputDef[]]>;
}

interface CacheData {
  version: number;
  files: Record<string, CachedFile>;
}

export class FileCache {
  private data: CacheData;

  constructor(private readonly cachePath: string) {
    this.data = this.load();
  }

  private load(): CacheData {
    if (!existsSync(this.cachePath)) return empty();
    try {
      const raw = readFileSync(this.cachePath, 'utf-8');
      const parsed = JSON.parse(raw) as CacheData;
      if (parsed.version !== CACHE_VERSION) return empty();
      return parsed;
    } catch {
      return empty();
    }
  }

  /** Lookup, returns null on sha mismatch (stale entry) or no entry. */
  get(key: string, sha: string): CachedFile | null {
    const entry = this.data.files[key];
    return entry?.sha === sha ? entry : null;
  }

  set(key: string, entry: CachedFile): void {
    this.data.files[key] = entry;
  }

  /** Drop entries no longer present in the current file list. */
  prune(activeKeys: Set<string>): void {
    for (const key of Object.keys(this.data.files)) {
      if (!activeKeys.has(key)) delete this.data.files[key];
    }
  }

  save(): void {
    mkdirSync(dirname(this.cachePath), { recursive: true });
    writeFileSync(this.cachePath, JSON.stringify(this.data));
  }
}

export function defaultCachePath(workspaceRoot: string): string {
  return join(workspaceRoot, 'node_modules', '.cache', 'docs-extractor', 'items.json');
}

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function empty(): CacheData {
  return { version: CACHE_VERSION, files: {} };
}
