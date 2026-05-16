/**
 * Node-side roadmap loader.
 *
 * Reads every `apps/docs/src/app/pages/roadmap/items/*.md`, parses the
 * YAML-ish frontmatter + markdown body, and returns a typed list.
 *
 * Called from `ServerRoadmapDataProvider` during SSR (and from the
 * `/api/roadmap` Express route as a runtime fallback in dev).
 *
 * Throws on malformed input so broken edits fail loudly instead of
 * silently rendering a half-broken card.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import type { RoadmapItem, StatusId, CategoryId } from '../app/pages/roadmap/roadmap-data';

const VALID_STATUSES: readonly StatusId[] = ['idea', 'next', 'wip', 'shipped'];
const VALID_CATEGORIES: readonly CategoryId[] = ['component', 'theme', 'a11y', 'perf', 'docs'];

function findItemsDir(start: string): string {
  // Walk up looking for `apps/docs/src/app/pages/roadmap/items/`.
  let dir = resolve(start);
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'apps', 'docs', 'src', 'app', 'pages', 'roadmap', 'items');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Roadmap: could not find items/ directory starting from ${start}`);
}

/**
 * Returns the parsed roadmap. No cache: each call re-reads the `items/`
 * directory and re-parses every file. ~20 small markdown files take <5ms
 * to parse in total, and the no-cache path means edits to `.md` content
 * show up on the very next request — no dev-server restart, no file
 * watcher, no stale TransferState.
 */
export function getRoadmap(): readonly RoadmapItem[] {
  const itemsDir = findItemsDir(process.cwd());
  const files = readdirSync(itemsDir).filter(f => f.endsWith('.md'));
  return files
    .map(f => parseItem(f.replace(/\.md$/, ''), readFileSync(join(itemsDir, f), 'utf8')))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function parseItem(id: string, raw: string): RoadmapItem {
  const fmMatch = raw.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!fmMatch) throw new Error(`Roadmap: file "${id}.md" is missing frontmatter`);
  const [, fmBlock, body] = fmMatch;

  const fm: Record<string, string | number | boolean> = {};
  for (const line of fmBlock.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
    if (!m) throw new Error(`Roadmap "${id}.md": malformed line: ${line}`);
    const [, key, rawValue] = m;
    let value = rawValue.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value === 'true')  { fm[key] = true;  continue; }
    if (value === 'false') { fm[key] = false; continue; }
    if (/^-?\d+(\.\d+)?$/.test(value)) { fm[key] = Number(value); continue; }
    fm[key] = value;
  }

  const need = (k: string, type: 'string' | 'number'): string | number => {
    if (!(k in fm)) throw new Error(`Roadmap "${id}.md": missing field "${k}"`);
    if (typeof fm[k] !== type) throw new Error(`Roadmap "${id}.md": "${k}" must be ${type}, got ${typeof fm[k]}`);
    return fm[k] as string | number;
  };

  const status = need('status', 'string') as StatusId;
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Roadmap "${id}.md": invalid status "${status}". Expected one of: ${VALID_STATUSES.join(', ')}`);
  }
  const category = need('category', 'string') as CategoryId;
  if (!VALID_CATEGORIES.includes(category)) {
    throw new Error(`Roadmap "${id}.md": invalid category "${category}". Expected one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  return {
    id,
    title:       need('title', 'string') as string,
    description: need('description', 'string') as string,
    longDesc:    body.trim(),
    version:     need('version', 'string') as string,
    date:        need('date', 'string') as string,
    category,
    status,
    ...(typeof fm['candor']   === 'string'  ? { candor:   fm['candor']   as string } : {}),
    ...(typeof fm['progress'] === 'number'  ? { progress: fm['progress'] as number } : {}),
    ...(fm['candidate']       === true      ? { candidate: true } : {}),
  };
}
