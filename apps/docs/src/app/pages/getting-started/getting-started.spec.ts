import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { GettingStartedComponent } from './getting-started';

/**
 * Getting Started documents the only supported install path for a
 * non-Angular-CLI bundler (Vite / Analog): import the three global
 * stylesheets by *package specifier*. That only works while every specifier
 * on the page is reachable through the owning package's `exports` map — a
 * map that is the published contract, not something the docs can restate.
 *
 * This spec reads `packages/<pkg>/package.json` off disk and resolves every
 * `@kouji-ui/*` specifier the page prints, so the documentation and the
 * packaging cannot drift apart in either direction.
 */

const REPO_ROOT = resolve(__dirname, '../../../../../..');

type ExportsMap = Record<string, unknown>;

function readPkg(pkg: string): { exports?: ExportsMap | string; root: string } {
  const root = resolve(REPO_ROOT, 'packages', pkg);
  const json = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
    exports?: ExportsMap | string;
  };
  return { exports: json.exports, root };
}

/** Package folder for a `@kouji-ui/<x>` scope name. */
const PKG_DIR: Record<string, string> = {
  core: 'core',
  components: 'components',
  themes: 'themes',
};

/**
 * Resolve `subpath` ('.' or './x/y.css') against an `exports` map, honouring a
 * single `*` wildcard the way Node does. Returns the target path, or null when
 * the specifier is blocked.
 */
function resolveExport(map: ExportsMap | string | undefined, subpath: string): string | null {
  if (map === undefined) return null;
  if (typeof map === 'string') return subpath === '.' ? map : null;

  const pick = (value: unknown): string | null => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      const conditions = value as Record<string, unknown>;
      // Prefer the `style` condition (what a CSS bundler asks for), then default.
      for (const key of ['style', 'default']) {
        const hit = conditions[key];
        if (typeof hit === 'string') return hit;
      }
    }
    return null;
  };

  if (subpath in map) return pick(map[subpath]);

  for (const key of Object.keys(map)) {
    const star = key.indexOf('*');
    if (star === -1) continue;
    const prefix = key.slice(0, star);
    const suffix = key.slice(star + 1);
    if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix)) continue;
    const match = subpath.slice(prefix.length, subpath.length - suffix.length);
    const target = pick(map[key]);
    return target === null ? null : target.replace('*', match);
  }
  return null;
}

/**
 * Map a published export target back to the file in the repo that produces it.
 *
 * Most targets are published verbatim from `src/` (themes, components). Core
 * flattens four stylesheets out of nested folders — `ng-package.json`'s
 * `assets[]` is the authoritative input→output mapping — and
 * `scripts/write-core-styles.mjs` emits the `styles.css` aggregate from
 * `src/styles.css`. Returns null when nothing in the repo produces the target.
 */
function sourceFileFor(root: string, target: string): string | null {
  const rel = target.replace(/^\.\//, '');
  const direct = [resolve(root, rel), resolve(root, 'src', rel)];
  for (const candidate of direct) if (existsSync(candidate)) return candidate;

  const ngPackage = resolve(root, 'ng-package.json');
  if (!existsSync(ngPackage)) return null;
  const assets = (JSON.parse(readFileSync(ngPackage, 'utf8')) as {
    assets?: { input: string; glob: string; output?: string }[];
  }).assets ?? [];
  for (const asset of assets) {
    const publishedAs = asset.output ? `${asset.output}/${asset.glob}` : asset.glob;
    if (publishedAs !== rel) continue;
    const source = resolve(root, asset.input, asset.glob);
    if (existsSync(source)) return source;
  }
  return null;
}

/** Every `@kouji-ui/...` specifier printed in a code snippet on the page. */
function specifiersIn(snippet: string): string[] {
  return [...snippet.matchAll(/@kouji-ui\/[a-z0-9@/._-]+/gi)].map(m => m[0]);
}

describe('Getting Started — documented install paths', () => {
  const page = new GettingStartedComponent();

  const documented = [
    ...specifiersIn(page.viteStyles),
    ...specifiersIn(page.coreStylesAlaCarte),
  ];

  test('the page documents at least the three global stylesheets', () => {
    expect(documented).toContain('@kouji-ui/themes');
    expect(documented).toContain('@kouji-ui/core/styles.css');
    expect(documented).toContain('@kouji-ui/components/src/overlay/overlay.css');
  });

  test.each([...new Set(documented)])(
    '%s resolves through its package exports map to a file that exists',
    (specifier) => {
      const [, scopeName, ...rest] = specifier.split('/');
      const dir = PKG_DIR[scopeName];
      expect(dir, `unknown package in ${specifier}`).toBeTruthy();

      const { exports, root } = readPkg(dir);
      const subpath = rest.length ? `./${rest.join('/')}` : '.';
      const target = resolveExport(exports, subpath);
      expect(target, `${specifier} is not reachable through the exports map`).not.toBeNull();

      expect(
        sourceFileFor(root, target!),
        `${specifier} → ${target} has no source file under packages/${dir}`,
      ).not.toBeNull();
    },
  );

  test('the angular.json snippet names the same three stylesheets', () => {
    // Same files, spelled as node_modules paths for the CLI `styles[]` array.
    for (const path of [
      'node_modules/@kouji-ui/themes/src/index.css',
      'node_modules/@kouji-ui/core/styles.css',
      'node_modules/@kouji-ui/components/src/overlay/overlay.css',
    ]) {
      expect(page.globalStyles).toContain(path);
    }
  });
});
