#!/usr/bin/env node
/**
 * Fails the build when a file that must never ship — a docs example, a
 * playground, a spec, the docs examples entry — is reachable from a package's
 * `public-api.ts`.
 *
 * ng-packagr rolls the FESM and the flattened `.d.ts` from exactly what the
 * entry file reaches: its TypeScript program is created with the entry file
 * as the only root, so `include` / `exclude` in `tsconfig.lib.json` cannot
 * gate this. Two barrels once re-exported their `_examples` folder and eight
 * demo components (plus the 31 KB Lucide name list) became public API; this
 * walk is what turns that mistake into a red build instead of a silent leak.
 *
 * Usage: node scripts/check-public-api-graph.mjs [core|components ...]
 *        (defaults to both packages)
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(import.meta.dirname ?? dirname(fileURLToPath(import.meta.url)), '..');

/** Files that must never be reachable from a package entry file. */
export const FORBIDDEN = [
  { why: 'docs example folder', test: (p) => /[\\/]_examples[\\/]/.test(p) },
  { why: 'docs example', test: (p) => /\.example\.ts$/.test(p) },
  { why: 'docs playground', test: (p) => /\.playground\.ts$/.test(p) },
  { why: 'spec', test: (p) => /\.spec\.ts$/.test(p) },
  { why: 'docs examples entry', test: (p) => /[\\/]example-components\.ts$/.test(p) },
  { why: 'test setup', test: (p) => /[\\/]test-setup\.ts$/.test(p) },
];

/** Why a path may not ship, or `null` when it is fine. */
export function forbiddenReason(file) {
  for (const rule of FORBIDDEN) if (rule.test(file)) return rule.why;
  return null;
}

/** Strips comments so a TSDoc snippet quoting an import is not followed. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\'"`])\/\/[^\n]*/g, '$1');
}

/**
 * Every module specifier a TypeScript file imports or re-exports: static
 * `import … from`, `export … from`, side-effect `import '…'` and dynamic
 * `import('…')`. Type-only imports count — an example reached through a type
 * still lands in the flattened `.d.ts`.
 */
export function importSpecifiers(source) {
  const code = stripComments(source);
  const out = new Set();
  for (const m of code.matchAll(/\bfrom\s*['"]([^'"\n]+)['"]/g)) out.add(m[1]);
  for (const m of code.matchAll(/\bimport\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g)) out.add(m[1]);
  for (const m of code.matchAll(/(?:^|[;\n])\s*import\s*['"]([^'"\n]+)['"]/g)) out.add(m[1]);
  return [...out];
}

/** Resolves a relative specifier the way the compiler does (`.ts`, `/index.ts`). */
export function resolveRelative(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  const candidates = [base, `${base}.ts`, resolve(base, 'index.ts')];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

/**
 * Walks the import graph from `entryFile` and reports every forbidden file it
 * reaches. Bare specifiers (`@angular/core`, `@kouji-ui/core`) are external
 * and not followed.
 */
export function checkPublicApiGraph(entryFile) {
  const start = resolve(entryFile);
  const seen = new Set([start]);
  const queue = [start];
  const violations = [];
  while (queue.length) {
    const file = queue.shift();
    const source = readFileSync(file, 'utf8');
    for (const spec of importSpecifiers(source)) {
      if (!spec.startsWith('.')) continue;
      const target = resolveRelative(file, spec);
      if (!target) continue;
      const why = forbiddenReason(target);
      if (why) violations.push({ from: file, to: target, spec, why });
      if (!seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
  }
  return { violations, reachable: seen };
}

const PACKAGES = { core: 'packages/core', components: 'packages/components' };

function main(argv) {
  const names = argv.length ? argv : Object.keys(PACKAGES);
  let failed = false;
  for (const name of names) {
    const dir = PACKAGES[name];
    if (!dir) {
      console.error(`unknown package "${name}" (expected: ${Object.keys(PACKAGES).join(', ')})`);
      process.exit(2);
    }
    const entry = resolve(ROOT, dir, 'src/public-api.ts');
    const { violations, reachable } = checkPublicApiGraph(entry);
    if (violations.length === 0) {
      console.log(`✓ @kouji-ui/${name}: ${reachable.size} files reachable from public-api.ts, none forbidden`);
      continue;
    }
    failed = true;
    console.error(`✖ @kouji-ui/${name}: public-api.ts reaches ${violations.length} file(s) that must not ship`);
    for (const v of violations) {
      console.error(
        `    ${relative(ROOT, v.from)}  →  '${v.spec}'  (${relative(ROOT, v.to)}: ${v.why})`,
      );
    }
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
