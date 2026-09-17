/** Typings for `check-package-exports.mjs` (hand-written; keep in step with the script). */

/** What the docs promise for one published package. */
export interface DocumentedPackage {
  name: string;
  dir: string;
  /** Package specifiers that must resolve under Node `exports` resolution. */
  specifiers: string[];
  /** Package-relative files the `angular.json` snippet names. */
  files: string[];
  /** Shipped stylesheets whose `@import`s must resolve in the tarball. */
  aggregates: string[];
  /** Exports targets written by a build script rather than copied by ng-packagr. */
  generated: string[];
}

export const PACKAGES: {
  core: DocumentedPackage;
  components: DocumentedPackage;
  themes: DocumentedPackage;
};
export type PackageKey = keyof typeof PACKAGES;

/** A `package.json` `exports` value: sugar string or subpath / condition map. */
export type ExportsMap = string | Record<string, unknown>;

export interface CheckResult {
  name: string;
  problems: string[];
}

export function subpathOf(name: string, specifier: string): string | null;
export function resolveExports(
  exportsMap: ExportsMap,
  subpath: string,
  conditions?: readonly string[],
): string | null;
export function generatedExports(
  sourcePkg: { exports?: Record<string, unknown> },
  entryBasename: string,
): Record<string, unknown>;
export function checkSource(key: PackageKey): CheckResult;
export function checkInstalled(key: PackageKey, pkgRoot: string, scratch?: string): CheckResult;
export function extractTgz(tgz: string, into: string): void;
export function packAndExtract(key: PackageKey, scratch: string): { tarball: string; packageRoot: string };
