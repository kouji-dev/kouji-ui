// apps/docs/src/lib/page-assembler.ts
import type {
  DocItem,
  DocPage,
  ExtractorWarning,
  PageExample,
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

  // Group by (pkg, pageName). The package layer is a hard separation that
  // mirrors the sidebar tracks (`headless` vs `components`); items with the
  // same @doc-name but in different packages are *different* pages.
  const groups = new Map<string, DocItem[]>();
  for (const item of items) {
    const key = `${item.pkg}:${item.pageName}`;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const pages: DocPage[] = [];
  for (const [, group] of groups.entries()) {
    const pkg: SourcePkg = group[0].pkg;
    const name = group[0].pageName;

    const mains = group.filter(i => i.isMain);
    let main: DocItem;
    if (mains.length === 1) {
      main = mains[0];
    } else if (mains.length === 0) {
      const sorted = sortItems(group);
      main = sorted[0];
      warnings.push({
        kind: 'no-main',
        message: `page '${pkg}:${name}' has no @doc-is-main; falling back to '${main.symbol}'`,
        pageName: name,
      });
    } else {
      const sorted = sortItems(mains);
      main = sorted[0];
      warnings.push({
        kind: 'multi-main',
        message: `page '${pkg}:${name}' has multiple @doc-is-main items: ${mains.map(i => i.symbol).join(', ')}; using '${main.symbol}'`,
        pageName: name,
      });
    }

    const sortedRest = sortItems(group.filter(i => i.id !== main.id));
    const definitions = [main, ...sortedRest];

    // Page description: prefer the main item's @doc-description, otherwise
    // any item's @doc-description (in render order), otherwise the main
    // item's tsDoc summary. This lets authors put the page description on
    // any item that makes sense, not just the main one.
    const description =
      main.docDescription ??
      definitions.find(d => d.docDescription)?.docDescription ??
      main.description;

    // Flatten examples across all definitions for a page-level Examples
    // section. Each example carries back its source item's id+symbol so the
    // page can group/anchor as needed.
    const examples: PageExample[] = [];
    for (const def of definitions) {
      for (const ex of def.examples ?? []) {
        examples.push({ itemId: def.id, itemSymbol: def.symbol, example: ex });
      }
    }

    pages.push({
      name,
      pkg,
      // categoryPath gets populated by the orchestrator (it knows @category).
      categoryPath: [],
      title: formatTitle(main.pageName),
      description,
      mainItemId: main.id,
      definitions,
      examples,
    });
  }

  pages.sort((a, b) => a.name.localeCompare(b.name));
  return { pages, warnings };
}

function formatTitle(slug: string): string {
  const spaced = slug.replace(/[-_]+/g, ' ').trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : '';
}

function sortItems(list: DocItem[]): DocItem[] {
  return [...list].sort((a, b) => {
    const ao = a.order ?? Number.POSITIVE_INFINITY;
    const bo = b.order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return a.sourceOrder - b.sourceOrder;
  });
}
