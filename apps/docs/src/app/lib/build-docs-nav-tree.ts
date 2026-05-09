import type { DocPage } from '../../lib/docs-extractor.types';

/** Unified docs sidebar: folders from `@doc-category` path; leaves link to doc pages. */
export type DocsNavEntry =
  | { kind: 'folder'; id: string; label: string; children: DocsNavEntry[] }
  | {
      kind: 'leaf';
      id: string;
      label: string;
      routerLink: string[];
    };

function trackSegment(pkg: 'core' | 'components'): 'headless' | 'components' {
  return pkg === 'core' ? 'headless' : 'components';
}

function compareEntries(a: DocsNavEntry, b: DocsNavEntry): number {
  const name = a.label.localeCompare(b.label);
  if (name !== 0) return name;
  if (a.kind === b.kind) return 0;
  return a.kind === 'folder' ? -1 : 1;
}

function sortEntries(entries: DocsNavEntry[]): DocsNavEntry[] {
  const sorted = [...entries].sort(compareEntries);
  return sorted.map(e =>
    e.kind === 'folder' ? { ...e, children: sortEntries(e.children) } : e,
  );
}

/**
 * Inserts one manifest page under nested folders matching its `categoryPath`.
 */
function insertPage(root: DocsNavEntry[], page: DocPage): void {
  const segments =
    page.categoryPath?.length > 0 ? [...page.categoryPath] : ['Uncategorized'];

  let siblings = root;
  let pathPrefix = '';

  for (const seg of segments) {
    pathPrefix = pathPrefix ? `${pathPrefix}/${seg}` : seg;
    const folderId = `f:${pathPrefix}`;
    let folder = siblings.find(
      (e): e is Extract<DocsNavEntry, { kind: 'folder' }> =>
        e.kind === 'folder' && e.id === folderId,
    );
    if (!folder) {
      folder = { kind: 'folder', id: folderId, label: seg, children: [] };
      siblings.push(folder);
    }
    siblings = folder.children;
  }

  const track = trackSegment(page.pkg);
  siblings.push({
    kind: 'leaf',
    id: `l:${page.pkg}:${page.name}`,
    label: page.title,
    routerLink: ['/docs', track, page.name],
  });
}

/** Builds one nested tree from all manifest pages (both packages). */
export function buildUnifiedDocsNavTree(pages: DocPage[]): DocsNavEntry[] {
  const root: DocsNavEntry[] = [];
  const sortedPages = [...pages].sort((a, b) => a.title.localeCompare(b.title));
  for (const p of sortedPages) {
    insertPage(root, p);
  }
  return sortEntries(root);
}

/** Folder ids along the category path for the active doc URL (for expanding the tree). */
export function folderIdsForPage(page: DocPage | null): Set<string> {
  if (!page) return new Set();
  const segments =
    page.categoryPath?.length > 0 ? [...page.categoryPath] : ['Uncategorized'];
  const ids = new Set<string>();
  let prefix = '';
  for (const seg of segments) {
    prefix = prefix ? `${prefix}/${seg}` : seg;
    ids.add(`f:${prefix}`);
  }
  return ids;
}
