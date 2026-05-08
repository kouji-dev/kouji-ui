import type { SourcePkg } from '../docs-extractor.types';

/**
 * Stable canonical id for a doc item — `<pkg>:<rel-from-/packages/>:<symbol>`.
 * Survives reordering within a file; breaks when the file is moved across
 * packages (which is the correct invalidation: it becomes a different page).
 */
export function makeItemId(pkg: SourcePkg, filePath: string, symbol: string): string {
  const rel = filePath.replace(/\\/g, '/').split('/packages/')[1] ?? filePath;
  return `${pkg}:${rel}:${symbol}`;
}
