#!/usr/bin/env node
/**
 * Publishes `@kouji-ui/core/styles.css`, the one-line aggregate of every
 * global stylesheet the core package ships.
 *
 * The source file (`packages/core/src/styles.css`) imports its parts by their
 * SOURCE paths, because the docs app registers it straight from the repo. The
 * published package flattens those parts (`ng-package.json` `assets` copy
 * `src/primitives/overlay/overlay.css` to `overlay/overlay.css`, and so on),
 * so the aggregate is rewritten here — after ng-packagr has copied the assets —
 * with each `@import` mapped through the same asset table. An import that no
 * asset entry covers, or whose published file is missing, fails the build.
 *
 * Runs from the core package's `build` script. `package-exports.spec.ts` pins
 * the mapping without a build.
 *
 * Usage: node scripts/write-core-styles.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(import.meta.dirname ?? dirname(fileURLToPath(import.meta.url)), '..');
export const CORE_DIR = resolve(ROOT, 'packages/core');
export const SOURCE = resolve(CORE_DIR, 'src/styles.css');

/** `@import "./x.css";` specifiers of a stylesheet, in order. */
export function cssImports(css) {
  return [...css.matchAll(/@import\s+["']([^"']+)["']\s*;/g)].map((m) => m[1]);
}

/** Matches a file name against an ng-packagr asset glob: a literal name, `*.css`, or a `**` prefix. */
function globMatches(glob, relPath) {
  const re = new RegExp(
    '^' +
      glob
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*\//g, '(?:.*/)?')
        .replace(/\*/g, '[^/]*') +
      '$',
  );
  return re.test(relPath);
}

/**
 * Where ng-packagr publishes a source file, as a package-root-relative posix
 * path, or `null` when no `assets` entry copies it.
 */
export function publishedPath(sourceFile, ngPackage, packageDir = CORE_DIR) {
  const rel = posix.normalize(relative(packageDir, sourceFile).replaceAll('\\', '/'));
  for (const asset of ngPackage.assets ?? []) {
    const input = posix.normalize(asset.input);
    if (rel !== input && !rel.startsWith(`${input}/`)) continue;
    const inside = rel === input ? basename(rel) : rel.slice(input.length + 1);
    if (!globMatches(asset.glob, inside)) continue;
    const output = posix.normalize(asset.output ?? '.');
    return output === '.' ? inside : posix.join(output, inside);
  }
  return null;
}

/**
 * The aggregate's imports rewritten to the published layout, as
 * `{ source, published }` pairs; `published` is `null` for an import that no
 * asset ships.
 */
export function publishedImports(sourceCss = SOURCE, ngPackage = readNgPackage()) {
  const css = readFileSync(sourceCss, 'utf8');
  return cssImports(css).map((spec) => {
    const file = resolve(dirname(sourceCss), spec);
    const published = publishedPath(file, ngPackage);
    return { source: spec, published: published ? `./${published}` : null };
  });
}

export function readNgPackage() {
  return JSON.parse(readFileSync(resolve(CORE_DIR, 'ng-package.json'), 'utf8'));
}

/** The stylesheet to publish: the source header, imports rewritten. */
export function renderPublishedStyles(sourceCss = SOURCE, ngPackage = readNgPackage()) {
  const css = readFileSync(sourceCss, 'utf8');
  const imports = publishedImports(sourceCss, ngPackage);
  const missing = imports.filter((i) => !i.published);
  if (missing.length) {
    throw new Error(
      `styles.css imports ${missing.map((m) => `"${m.source}"`).join(', ')} but no ng-package.json asset publishes it`,
    );
  }
  let out = css;
  for (const { source, published } of imports) {
    out = out.replace(`@import "${source}";`, `@import "${published}";`);
  }
  return out;
}

function main() {
  const ngPackage = readNgPackage();
  const dest = resolve(CORE_DIR, ngPackage.dest);
  if (!existsSync(dest)) {
    console.error(`✖ ${dest} does not exist — run ng-packagr first`);
    process.exit(1);
  }
  const css = renderPublishedStyles(SOURCE, ngPackage);
  for (const { published } of publishedImports(SOURCE, ngPackage)) {
    const file = resolve(dest, published);
    if (!existsSync(file)) {
      console.error(`✖ ${published} is imported by styles.css but ng-packagr did not publish it`);
      process.exit(1);
    }
  }
  const target = resolve(dest, 'styles.css');
  writeFileSync(target, css);
  console.log(`✓ wrote ${relative(ROOT, target)} (${cssImports(css).join(', ')})`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
