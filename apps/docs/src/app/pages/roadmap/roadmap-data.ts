/**
 * Roadmap types + the static metadata that lives in code (columns, categories,
 * sort helper).
 *
 * The 19 actual roadmap entries live as one `.md` per item under `./items/`.
 * They are read by Node fs in `apps/docs/src/lib/roadmap-loader.ts` and served
 * to the browser via TransferState (SSR) with `/api/roadmap` as a dev/fallback.
 * The page component subscribes to `RoadmapService.items`.
 *
 * Editors:
 *  - Drop a new `.md` in `./items/`, fill the frontmatter, write the body.
 *  - No TS changes required.
 *  - A malformed file throws on first read so broken edits fail loudly.
 */

export type StatusId = 'idea' | 'next' | 'wip' | 'shipped';
export type CategoryId = 'component' | 'theme' | 'a11y' | 'perf' | 'docs';
export type SortMode =
  | 'date-desc'
  | 'date-asc'
  | 'version-desc'
  | 'version-asc'
  | 'issues';

export interface RoadmapItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly longDesc: string;
  readonly version: string;
  readonly date: string;
  readonly category: CategoryId;
  readonly status: StatusId;
  readonly issues: number;
  readonly prs: number;
  readonly candor?: string | null;
  readonly progress?: number;
  readonly candidate?: boolean;
}

export interface ColumnDef {
  readonly id: StatusId;
  readonly label: string;
  readonly sub: string;
}

export interface CategoryDef {
  readonly id: CategoryId;
  readonly label: string;
}

export const COLUMNS: readonly ColumnDef[] = [
  { id: 'idea',    label: 'ideas',       sub: 'wishlist · some flagged as candidates' },
  { id: 'next',    label: 'next up',     sub: 'committed for upcoming version' },
  { id: 'wip',     label: 'in progress', sub: 'shipping this sprint' },
  { id: 'shipped', label: 'shipped',     sub: 'available now' },
];

export const CATEGORIES: readonly CategoryDef[] = [
  { id: 'component', label: 'component' },
  { id: 'theme',     label: 'theme' },
  { id: 'a11y',      label: 'a11y' },
  { id: 'perf',      label: 'performance' },
  { id: 'docs',      label: 'docs' },
];

/**
 * Maps version strings to a sortable number. Higher = newer.
 * Tokens 'tba' and '?' sort to -1 (bottom for desc, top for asc).
 */
export function versionSort(v: string): number {
  if (!v || v === '?' || v === 'tba') return -1;
  const m = v.replace(/^v/, '').match(/^(\d+)\.?(\d*)/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 1000 + parseInt(m[2] || '0', 10);
}
