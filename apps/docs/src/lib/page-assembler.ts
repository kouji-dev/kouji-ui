// apps/docs/src/lib/page-assembler.ts
import type {
  DocItem,
  DocPage,
  ExtractorWarning,
  SourcePkg,
} from './docs-extractor.types';

export interface AssembledPages {
  pages: DocPage[];
  warnings: ExtractorWarning[];
}

export function assemblePages(items: DocItem[]): AssembledPages {
  const warnings: ExtractorWarning[] = [];
  const seenIds = new Set<string>();
  for (const item of items) {
    if (seenIds.has(item.id)) {
      warnings.push({
        kind: 'duplicate-id',
        message: `duplicate item id '${item.id}' (${item.symbol} in ${item.filePath})`,
        filePath: item.filePath,
      });
    } else {
      seenIds.add(item.id);
    }
  }

  const groups = new Map<string, DocItem[]>();
  for (const item of items) {
    const list = groups.get(item.pageName) ?? [];
    list.push(item);
    groups.set(item.pageName, list);
  }

  const pages: DocPage[] = [];
  for (const [name, group] of groups.entries()) {
    const mains = group.filter(i => i.isMain);
    let main: DocItem;
    if (mains.length === 1) {
      main = mains[0];
    } else if (mains.length === 0) {
      const sorted = sortItems(group);
      main = sorted[0];
      warnings.push({
        kind: 'no-main',
        message: `page '${name}' has no @doc-is-main; falling back to '${main.symbol}'`,
        pageName: name,
      });
    } else {
      const sorted = sortItems(mains);
      main = sorted[0];
      warnings.push({
        kind: 'multi-main',
        message: `page '${name}' has multiple @doc-is-main items: ${mains.map(i => i.symbol).join(', ')}; using '${main.symbol}'`,
        pageName: name,
      });
    }

    const pkg: SourcePkg = main.pkg;
    const crossPkg = group.some(i => i.pkg !== pkg);
    if (crossPkg) {
      warnings.push({
        kind: 'cross-package',
        message: `page '${name}' spans both core and components — using main item's package (${pkg}) for taxonomy`,
        pageName: name,
      });
    }

    const sortedRest = sortItems(group.filter(i => i.id !== main.id));
    const sortedItems = [main, ...sortedRest];

    pages.push({
      name,
      pkg,
      // categoryPath/title get populated by the orchestrator (it knows
      // @category) — we leave them empty here. The orchestrator's
      // responsibility is documented in docs-extractor.ts.
      categoryPath: [],
      title: main.pageName,
      description: main.description,
      mainItemId: main.id,
      items: sortedItems,
    });
  }

  pages.sort((a, b) => a.name.localeCompare(b.name));
  return { pages, warnings };
}

function sortItems(list: DocItem[]): DocItem[] {
  return [...list].sort((a, b) => {
    const ao = a.order ?? Number.POSITIVE_INFINITY;
    const bo = b.order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return a.sourceOrder - b.sourceOrder;
  });
}
