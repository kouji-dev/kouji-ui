#!/usr/bin/env node
/**
 * After moving example files into `_examples/` subfolders, every relative
 * import inside those files needs an extra `../` because the file is now
 * one directory deeper.
 *
 * For each `.ts` under `packages/{components,core}/src/<comp>/_examples/`:
 *   - `from './x'`  → `from '../x'`
 *   - `from '../x'` → `from '../../x'`
 *   - `from '../../x'` → `from '../../../x'`
 *   - …and so on for every `from '...'` and `import '…'`.
 *
 * Run from the repo root:
 *   node scripts/fix-moved-imports.mjs
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const ROOTS = [
  'packages/components/src',
  'packages/core/src',
];

async function walkExamples(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_examples') {
        for (const file of await readdir(full, { withFileTypes: true })) {
          if (file.isFile() && file.name.endsWith('.ts') && file.name !== 'index.ts') {
            out.push(join(full, file.name));
          }
        }
      } else if (!entry.name.startsWith('.')) {
        await walkExamples(full, out);
      }
    }
  }
  return out;
}

// Rewrite ANY relative path `from '...'` / `import '...'` / `import(...)` so a
// leading `./X` or `../X` becomes one level deeper.
function bumpRelative(p) {
  if (p.startsWith('./')) return '../' + p.slice(2);
  if (p.startsWith('../')) return '../' + p;
  return p; // bare specifier — leave alone
}

const PATH_RE = /(from\s+['"]|import\(\s*['"]|import\s+['"])([^'"]+)(['"])/g;

let totalFiles = 0;
let totalRewrites = 0;

for (const r of ROOTS) {
  const files = await walkExamples(join(ROOT, r));
  for (const f of files) {
    const text = await readFile(f, 'utf-8');
    let changed = false;
    const next = text.replace(PATH_RE, (m, pre, spec, post) => {
      if (!spec.startsWith('.')) return m;
      const bumped = bumpRelative(spec);
      if (bumped !== spec) {
        changed = true;
        totalRewrites += 1;
        return `${pre}${bumped}${post}`;
      }
      return m;
    });
    if (changed) {
      await writeFile(f, next, 'utf-8');
      totalFiles += 1;
    }
  }
}

// eslint-disable-next-line no-console
console.log(`✓ rewrote ${totalRewrites} relative imports across ${totalFiles} files`);
