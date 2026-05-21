#!/usr/bin/env node
/**
 * One-shot: bump relative `styleUrl(s)` / `templateUrl` paths in moved
 * example files (similar to fix-moved-imports.mjs but for Angular
 * decorator path metadata, which the prior pass didn't touch).
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const ROOTS = ['packages/components/src', 'packages/core/src'];

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '_examples') {
        for (const f of await readdir(p, { withFileTypes: true })) {
          if (f.isFile() && f.name.endsWith('.ts') && f.name !== 'index.ts') {
            out.push(join(p, f.name));
          }
        }
      } else if (!e.name.startsWith('.')) {
        await walk(p, out);
      }
    }
  }
  return out;
}

const URL_RE = /(['"])((?:\.{1,2}\/)+[^'"]+\.(?:css|html))(['"])/g;

let totalFiles = 0;
let totalRewrites = 0;
for (const r of ROOTS) {
  const files = await walk(join(ROOT, r));
  for (const f of files) {
    const text = await readFile(f, 'utf-8');
    let changed = false;
    const next = text.replace(URL_RE, (m, pre, p, post) => {
      let bumped;
      if (p.startsWith('./')) bumped = '../' + p.slice(2);
      else if (p.startsWith('../')) bumped = '../' + p;
      else return m;
      changed = true;
      totalRewrites += 1;
      return `${pre}${bumped}${post}`;
    });
    if (changed) {
      await writeFile(f, next, 'utf-8');
      totalFiles += 1;
    }
  }
}

// eslint-disable-next-line no-console
console.log(`✓ rewrote ${totalRewrites} style/template URLs across ${totalFiles} files`);
