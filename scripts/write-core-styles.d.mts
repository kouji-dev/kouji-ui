/** Typings for `write-core-styles.mjs` (hand-written; keep in step with the script). */

export interface NgPackageAsset {
  input: string;
  glob: string;
  output?: string;
}

export interface NgPackageJson {
  dest: string;
  assets?: NgPackageAsset[];
}

/** Absolute path of `packages/core`. */
export const CORE_DIR: string;
/** Absolute path of `packages/core/src/styles.css`. */
export const SOURCE: string;

export function cssImports(css: string): string[];
export function publishedPath(sourceFile: string, ngPackage: NgPackageJson, packageDir?: string): string | null;
export function publishedImports(
  sourceCss?: string,
  ngPackage?: NgPackageJson,
): { source: string; published: string | null }[];
export function readNgPackage(): NgPackageJson;
export function renderPublishedStyles(sourceCss?: string, ngPackage?: NgPackageJson): string;
