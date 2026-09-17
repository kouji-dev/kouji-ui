#!/usr/bin/env node
/**
 * Asserts that every entry point and stylesheet the docs tell consumers to
 * register resolves from the PUBLISHED packages under Node's package
 * `exports` resolution — the rule Vite, Rollup, Analog and Node itself apply,
 * which the Angular CLI `styles` array (raw filesystem paths) bypasses.
 *
 * Two modes share one table of documented specifiers (`PACKAGES`):
 *
 * - `checkSource()` needs no build: it resolves each specifier through the
 *   source `package.json` exports (plus the `.` / `./package.json` entries
 *   ng-packagr generates) and maps the target back to a file that ships —
 *   an `ng-package.json` asset, the `files` list, or the generated
 *   `@kouji-ui/core/styles.css`. `package-exports.spec.ts` runs it.
 * - The default CLI mode packs each package with `pnpm pack` (what
 *   `changeset publish` uploads), extracts the tarball and resolves every
 *   specifier with Node's own resolver (`createRequire`) and with a
 *   `style`-condition walk of the exports map, checks the documented
 *   filesystem paths exist, and follows the `@import`s inside the shipped
 *   aggregates. Each package's `build` script runs it after ng-packagr.
 *
 * Usage: node scripts/check-package-exports.mjs [core|components|themes ...]
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { publishedPath, renderPublishedStyles, cssImports } from './write-core-styles.mjs';

const ROOT = resolve(import.meta.dirname ?? dirname(fileURLToPath(import.meta.url)), '..');

/**
 * What the docs promise, per package. `specifiers` are package specifiers
 * (Getting Started, `KJ_ICON_CSS_PATH`, the stylesheet headers); `files` are
 * the package-relative paths the `angular.json` snippet names; `aggregates`
 * are shipped stylesheets whose `@import`s must resolve in the tarball.
 */
export const PACKAGES = {
  core: {
    name: '@kouji-ui/core',
    dir: 'packages/core',
    specifiers: [
      '@kouji-ui/core',
      '@kouji-ui/core/package.json',
      '@kouji-ui/core/styles.css',
      '@kouji-ui/core/overlay/overlay.css',
      '@kouji-ui/core/icon/icon.css',
      '@kouji-ui/core/typography/prose.css',
      '@kouji-ui/core/motion/motion.css',
    ],
    files: [
      'styles.css',
      'overlay/overlay.css',
      'icon/icon.css',
      'typography/prose.css',
      'motion/motion.css',
    ],
    aggregates: ['styles.css'],
    /** Published files ng-packagr does not copy itself. */
    generated: ['./styles.css'],
  },
  components: {
    name: '@kouji-ui/components',
    dir: 'packages/components',
    specifiers: [
      '@kouji-ui/components',
      '@kouji-ui/components/package.json',
      '@kouji-ui/components/src/overlay/overlay.css',
    ],
    files: ['src/overlay/overlay.css'],
    aggregates: ['src/overlay/overlay.css'],
    generated: [],
  },
  themes: {
    name: '@kouji-ui/themes',
    dir: 'packages/themes',
    specifiers: [
      '@kouji-ui/themes',
      '@kouji-ui/themes/base.css',
      '@kouji-ui/themes/density.css',
      '@kouji-ui/themes/themes/kouji.css',
    ],
    files: ['src/index.css'],
    aggregates: ['src/index.css'],
    generated: [],
  },
};

/** Conditions a CSS-aware bundler applies to a stylesheet import. */
const STYLE_CONDITIONS = ['style'];

/** The `./subpath` (or `.`) part of a package specifier. */
export function subpathOf(name, specifier) {
  if (specifier === name) return '.';
  if (!specifier.startsWith(`${name}/`)) return null;
  return `./${specifier.slice(name.length + 1)}`;
}

function pickCondition(target, conditions) {
  if (target === null || target === undefined) return null;
  if (typeof target === 'string') return target;
  if (Array.isArray(target)) {
    for (const t of target) {
      const r = pickCondition(t, conditions);
      if (r) return r;
    }
    return null;
  }
  for (const [key, value] of Object.entries(target)) {
    if (key === 'default' || conditions.includes(key)) {
      const r = pickCondition(value, conditions);
      if (r) return r;
    }
  }
  return null;
}

/**
 * Node's `exports` resolution for one subpath: an exact key wins, else the
 * longest-prefix `*` pattern, with `*` allowed to span `/`. Returns the
 * package-relative target (`./fesm2022/x.mjs`) or `null`.
 */
export function resolveExports(exportsMap, subpath, conditions = STYLE_CONDITIONS) {
  if (typeof exportsMap === 'string' || !Object.keys(exportsMap).some((k) => k.startsWith('.'))) {
    // Sugar forms: "exports": "./x" or a bare conditions object apply to ".".
    return subpath === '.' ? pickCondition(exportsMap, conditions) : null;
  }
  if (Object.hasOwn(exportsMap, subpath) && !subpath.includes('*')) {
    return pickCondition(exportsMap[subpath], conditions);
  }
  let best = null;
  for (const key of Object.keys(exportsMap)) {
    const star = key.indexOf('*');
    if (star < 0) continue;
    const prefix = key.slice(0, star);
    const suffix = key.slice(star + 1);
    if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix)) continue;
    if (subpath.length < prefix.length + suffix.length) continue;
    if (!best || prefix.length > best.prefix.length) {
      best = { key, prefix, match: subpath.slice(prefix.length, subpath.length - suffix.length) };
    }
  }
  if (!best) return null;
  const target = pickCondition(exportsMap[best.key], conditions);
  return target ? target.replaceAll('*', best.match) : null;
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * The exports map ng-packagr writes: the source map plus `./package.json`
 * and the `.` entry point (`generatePackageExports` in ng-packagr).
 */
export function generatedExports(sourcePkg, entryBasename) {
  return {
    ...(sourcePkg.exports ?? {}),
    './package.json': { default: './package.json' },
    '.': {
      types: `./types/${entryBasename}.d.ts`,
      default: `./fesm2022/${entryBasename}.mjs`,
    },
  };
}

/**
 * Static check against the SOURCE tree (no build): every documented specifier
 * resolves through the (generated) exports map to a file the package ships.
 */
export function checkSource(key) {
  const spec = PACKAGES[key];
  const pkgDir = resolve(ROOT, spec.dir);
  const pkg = readJson(join(pkgDir, 'package.json'));
  const ngPackagePath = join(pkgDir, 'ng-package.json');
  const ngPackage = existsSync(ngPackagePath) ? readJson(ngPackagePath) : null;
  const entryBasename = spec.name.replace('@', '').replace('/', '-');
  const exportsMap = ngPackage ? generatedExports(pkg, entryBasename) : pkg.exports;
  const problems = [];

  for (const specifier of spec.specifiers) {
    const subpath = subpathOf(spec.name, specifier);
    const target = resolveExports(exportsMap, subpath);
    if (!target) {
      problems.push(`${specifier}: no exports entry matches "${subpath}" (conditions: style, default)`);
      continue;
    }
    if (subpath === '.' || subpath === './package.json') continue; // generated by ng-packagr / npm
    if (spec.generated.includes(target)) continue; // written by scripts/write-core-styles.mjs
    if (ngPackage) {
      const shipped = shippedSourceFile(pkgDir, ngPackage, target);
      if (!shipped) {
        problems.push(`${specifier}: exports → ${target}, but no ng-package.json asset publishes that path`);
      } else if (!existsSync(shipped)) {
        problems.push(`${specifier}: exports → ${target}, mapped to missing source ${relative(ROOT, shipped)}`);
      }
    } else {
      const file = resolve(pkgDir, target);
      const covered = (pkg.files ?? []).some((f) => target.startsWith(`./${f.replace(/\/$/, '')}/`));
      if (!existsSync(file)) problems.push(`${specifier}: exports → ${target}, which does not exist`);
      else if (!covered) problems.push(`${specifier}: exports → ${target}, which "files" does not publish`);
    }
  }

  if (key === 'core') {
    // The aggregate's rewritten imports must all be shipped, exported assets.
    try {
      const published = renderPublishedStyles(join(pkgDir, 'src/styles.css'), ngPackage);
      for (const imp of cssImports(published)) {
        if (!resolveExports(exportsMap, imp)) {
          problems.push(`styles.css imports ${imp}, which the exports map does not expose`);
        }
      }
    } catch (error) {
      problems.push(String(error instanceof Error ? error.message : error));
    }
  }

  for (const aggregate of spec.aggregates) {
    // Source-relative imports of a shipped aggregate must stay inside the package
    // and be shipped themselves (only components keeps the source layout).
    const source = key === 'core' ? null : sourceOf(pkgDir, ngPackage, pkg, aggregate);
    if (!source) continue;
    const css = readFileSync(source, 'utf8');
    for (const imp of cssImports(css)) {
      const file = resolve(dirname(source), imp);
      if (!file.startsWith(pkgDir)) problems.push(`${aggregate} imports ${imp}, outside the package`);
      else if (!existsSync(file)) problems.push(`${aggregate} imports ${imp}, which does not exist`);
      else if (ngPackage && !publishedPath(file, ngPackage, pkgDir)) {
        problems.push(`${aggregate} imports ${imp}, which no ng-package.json asset publishes`);
      }
    }
  }

  return { name: spec.name, problems };
}

/** Source file behind a published (package-relative, `./x`) path, via the asset table. */
function shippedSourceFile(pkgDir, ngPackage, target) {
  const wanted = posix.normalize(target.replace(/^\.\//, ''));
  const candidates = walkSourceFiles(join(pkgDir, 'src'));
  for (const file of candidates) {
    if (publishedPath(file, ngPackage, pkgDir) === wanted) return file;
  }
  return null;
}

function sourceOf(pkgDir, ngPackage, pkg, publishedFile) {
  if (ngPackage) return shippedSourceFile(pkgDir, ngPackage, `./${publishedFile}`);
  const file = resolve(pkgDir, publishedFile);
  return existsSync(file) ? file : null;
}

function walkSourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkSourceFiles(full, out);
    else if (entry.name.endsWith('.css')) out.push(full);
  }
  return out;
}

/**
 * Real-resolution check against an installed package root (an extracted
 * tarball or `dist/<pkg>`): Node's resolver, the `style` condition, the
 * documented filesystem paths and the aggregates' imports.
 */
export function checkInstalled(key, pkgRoot, scratch = mkdtempSync(join(tmpdir(), 'kj-exports-'))) {
  const spec = PACKAGES[key];
  const problems = [];
  const root = realpathSync(pkgRoot);
  const pkg = readJson(join(root, 'package.json'));

  // A node_modules that contains only this package, so bare specifiers resolve.
  const linkDir = join(scratch, 'node_modules', ...spec.name.split('/'));
  mkdirSync(dirname(linkDir), { recursive: true });
  if (!existsSync(linkDir)) symlinkSync(root, linkDir, 'junction');
  const require = createRequire(join(scratch, 'probe.cjs'));

  for (const specifier of spec.specifiers) {
    let resolved = null;
    try {
      resolved = realpathSync(require.resolve(specifier));
    } catch (error) {
      problems.push(`${specifier}: Node cannot resolve it (${error.code ?? error.message})`);
    }
    if (resolved && !resolved.startsWith(root)) {
      problems.push(`${specifier}: resolved outside the package (${resolved})`);
    }
    const subpath = subpathOf(spec.name, specifier);
    const styled = resolveExports(pkg.exports ?? {}, subpath);
    if (!styled) problems.push(`${specifier}: no exports entry under the "style" condition`);
    else if (!existsSync(join(root, styled))) problems.push(`${specifier}: exports → ${styled}, missing in the package`);
  }

  for (const file of spec.files) {
    if (!existsSync(join(root, file))) problems.push(`documented path ${file} is missing from the package`);
  }

  for (const aggregate of spec.aggregates) {
    const file = join(root, aggregate);
    if (!existsSync(file)) continue; // reported above
    for (const imp of cssImports(readFileSync(file, 'utf8'))) {
      if (!existsSync(resolve(dirname(file), imp))) {
        problems.push(`${aggregate} imports ${imp}, which the package does not contain`);
      }
    }
  }

  return { name: spec.name, problems };
}

/**
 * Extracts a gzipped ustar tarball (what `pnpm pack` writes) with Node only —
 * GNU tar on Windows reads `C:\…` as a remote host and bsdtar lacks the
 * flag that fixes it. Handles ustar prefixes, GNU long names and pax `path`.
 */
export function extractTgz(tgz, into) {
  const data = gunzipSync(readFileSync(tgz));
  const field = (block, start, length) => {
    const raw = block.subarray(start, start + length);
    const end = raw.indexOf(0);
    return raw.subarray(0, end < 0 ? length : end).toString('utf8');
  };
  let offset = 0;
  let longName = null;
  while (offset + 512 <= data.length) {
    const header = data.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;
    const size = parseInt(field(header, 124, 12).trim() || '0', 8);
    const type = String.fromCharCode(header[156]);
    const prefix = field(header, 345, 155);
    let name = longName ?? (prefix ? `${prefix}/${field(header, 0, 100)}` : field(header, 0, 100));
    longName = null;
    const body = data.subarray(offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;
    if (type === 'L') {
      longName = body.toString('utf8').replace(/\0+$/, '');
      continue;
    }
    if (type === 'x') {
      const m = body.toString('utf8').match(/^\d+ path=(.*)$/m);
      if (m) longName = m[1];
      continue;
    }
    if (type === 'g') continue;
    if (name.includes('..')) throw new Error(`refusing to extract ${name}`);
    const target = join(into, name);
    if (type === '5' || name.endsWith('/')) {
      mkdirSync(target, { recursive: true });
      continue;
    }
    if (type !== '0' && type !== '\0' && type !== '') continue;
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body);
  }
}

/** `pnpm pack` a package (honours `publishConfig.directory`) and extract it. */
export function packAndExtract(key, scratch) {
  const spec = PACKAGES[key];
  const pkgDir = resolve(ROOT, spec.dir);
  const out = join(scratch, key);
  mkdirSync(out, { recursive: true });
  execFileSync('pnpm', ['pack', '--pack-destination', out], {
    cwd: pkgDir,
    stdio: ['ignore', 'ignore', 'inherit'],
    shell: process.platform === 'win32',
  });
  const tgz = readdirSync(out).find((f) => f.endsWith('.tgz'));
  if (!tgz) throw new Error(`pnpm pack produced no tarball for ${spec.name}`);
  extractTgz(join(out, tgz), out);
  return { tarball: join(out, tgz), packageRoot: join(out, 'package') };
}

function main(argv) {
  const keys = argv.length ? argv : Object.keys(PACKAGES);
  for (const key of keys) {
    if (!PACKAGES[key]) {
      console.error(`unknown package "${key}" (expected: ${Object.keys(PACKAGES).join(', ')})`);
      process.exit(2);
    }
  }
  const scratch = mkdtempSync(join(tmpdir(), 'kj-exports-'));
  let failed = false;
  try {
    for (const key of keys) {
      const { name } = PACKAGES[key];
      const { tarball, packageRoot } = packAndExtract(key, scratch);
      const { problems } = checkInstalled(key, packageRoot, join(scratch, `${key}-nm`));
      if (problems.length === 0) {
        console.log(`✓ ${name}: ${PACKAGES[key].specifiers.length} documented specifiers resolve from ${relative(scratch, tarball)}`);
        continue;
      }
      failed = true;
      console.error(`✖ ${name}: ${problems.length} problem(s) in the packed tarball`);
      for (const p of problems) console.error(`    ${p}`);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
