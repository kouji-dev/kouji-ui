/** Typings for `check-public-api-graph.mjs` (hand-written; keep in step with the script). */

/** One forbidden edge found while walking the import graph. */
export interface PublicApiViolation {
  /** Absolute path of the importing file. */
  from: string;
  /** Absolute path of the forbidden file it reaches. */
  to: string;
  /** The specifier as written in `from`. */
  spec: string;
  /** Why `to` may not ship. */
  why: string;
}

export const FORBIDDEN: readonly { why: string; test: (path: string) => boolean }[];
export function forbiddenReason(file: string): string | null;
export function importSpecifiers(source: string): string[];
export function resolveRelative(fromFile: string, spec: string): string | null;
export function checkPublicApiGraph(entryFile: string): {
  violations: PublicApiViolation[];
  reachable: Set<string>;
};
