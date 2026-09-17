import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PACKAGES,
  checkInstalled,
  checkSource,
  resolveExports,
} from '../../../scripts/check-package-exports.mjs';
import { publishedImports } from '../../../scripts/write-core-styles.mjs';
import { checkPublicApiGraph } from '../../../scripts/check-public-api-graph.mjs';

/**
 * The install docs name three stylesheet paths and a handful of package
 * specifiers. Each has to survive publication: Node's `exports` map is an
 * encapsulation boundary, so a path that is copied into the tarball but not
 * exported is unreachable from Vite, Rollup, Analog and Node — exactly the
 * hole `@kouji-ui/components/src/overlay/overlay.css` sat in, and the reason
 * `@kouji-ui/core/styles.css` (the documented aggregate) did not exist.
 *
 * These specs need no build: they resolve every documented specifier through
 * the SOURCE manifests the way ng-packagr / npm will publish them and map the
 * result back to a shipped file. When `dist/` is present (after `pnpm build`)
 * the same table is also resolved for real by Node against the built
 * packages. The packed tarball is checked by
 * `scripts/check-package-exports.mjs`, which each package's build runs.
 */
const REPO = resolve(import.meta.dirname, '..', '..', '..');
const GETTING_STARTED = resolve(REPO, 'apps/docs/src/app/pages/getting-started/getting-started.ts');

describe('package exports — documented specifiers resolve from the published packages', () => {
  for (const key of Object.keys(PACKAGES) as (keyof typeof PACKAGES)[]) {
    it(`${PACKAGES[key].name}: every documented specifier maps to a shipped file`, () => {
      const { problems } = checkSource(key);
      expect(problems, problems.join('\n')).toEqual([]);
    });
  }

  it('Getting Started names only paths this table checks, and every stylesheet path in the table', () => {
    const page = readFileSync(GETTING_STARTED, 'utf8');
    const documentedPaths = [...page.matchAll(/node_modules\/(@kouji-ui\/[^"'\s]+)/g)].map((m) => m[1]);
    const documentedSpecifiers = [...page.matchAll(/["'](@kouji-ui\/[^"'\s]+)["']/g)].map((m) => m[1]);
    expect(documentedPaths.length).toBeGreaterThan(0);
    expect(documentedSpecifiers.length).toBeGreaterThan(0);

    const checkedFiles = Object.values(PACKAGES).flatMap((p) => p.files.map((f) => `${p.name}/${f}`));
    const checkedSpecifiers = Object.values(PACKAGES).flatMap((p) => p.specifiers);
    for (const path of documentedPaths) {
      expect(checkedFiles, `${path} is documented but not covered by the exports check`).toContain(path);
    }
    for (const spec of documentedSpecifiers) {
      expect(checkedSpecifiers, `${spec} is documented but not covered by the exports check`).toContain(spec);
    }
    // The one-line core stylesheet is what the page teaches.
    expect(documentedPaths).toContain('@kouji-ui/core/styles.css');
    expect(documentedPaths).toContain('@kouji-ui/components/src/overlay/overlay.css');
  });

  it('@kouji-ui/core/styles.css: every source import maps to a shipped, exported asset', () => {
    const imports = publishedImports();
    expect(imports.map((i) => i.published)).toEqual([
      './overlay/overlay.css',
      './typography/prose.css',
      './icon/icon.css',
      './motion/motion.css',
    ]);
    const pkg = JSON.parse(readFileSync(resolve(REPO, 'packages/core/package.json'), 'utf8')) as {
      exports: Record<string, unknown>;
    };
    for (const { published } of imports) {
      expect(pkg.exports[published!], `${published} must be exported on its own too`).toBeDefined();
    }
    expect(pkg.exports['./styles.css']).toEqual({ style: './styles.css', default: './styles.css' });
  });

  it('@kouji-ui/components exports its whole stylesheet tree through the src/*.css pattern', () => {
    const pkg = JSON.parse(readFileSync(resolve(REPO, 'packages/components/package.json'), 'utf8')) as {
      exports: Record<string, unknown>;
    };
    expect(resolveExports(pkg.exports, './src/overlay/overlay.css')).toBe('./src/overlay/overlay.css');
    expect(resolveExports(pkg.exports, './src/popover/popover.css')).toBe('./src/popover/popover.css');
    expect(resolveExports(pkg.exports, './src/overlay/overlay.ts')).toBeNull();
    expect(resolveExports(pkg.exports, './fesm2022/kouji-ui-components.mjs')).toBeNull();
  });

  it('resolveExports follows Node: exact keys, longest-prefix patterns, condition order', () => {
    const map = {
      '.': { types: './t.d.ts', default: './m.mjs' },
      './styles.css': { style: './styles.css', default: './styles.css' },
      './src/*.css': { style: './src/*.css', default: './src/*.css' },
      './src/overlay/*.css': { style: './src/overlay/override/*.css' },
    };
    expect(resolveExports(map, '.')).toBe('./m.mjs');
    expect(resolveExports(map, '.', ['types'])).toBe('./t.d.ts');
    expect(resolveExports(map, './styles.css')).toBe('./styles.css');
    expect(resolveExports(map, './src/a/b.css')).toBe('./src/a/b.css');
    expect(resolveExports(map, './src/overlay/x.css')).toBe('./src/overlay/override/x.css');
    expect(resolveExports(map, './nope.css')).toBeNull();
    expect(resolveExports('./only.css', '.')).toBe('./only.css');
  });

  it('neither published package asks consumers for the Angular CDK', () => {
    // Spelled at runtime: a literal "@angular/…" specifier in a spec makes the
    // analog vite plugin compile it through its Angular JIT path, which drops
    // `import.meta` for the whole file.
    const cdk = ['@angular', 'cdk'].join('/');
    for (const dir of ['packages/core', 'packages/components']) {
      const pkg = JSON.parse(readFileSync(resolve(REPO, dir, 'package.json'), 'utf8')) as Record<string, Record<string, string>>;
      for (const field of ['dependencies', 'peerDependencies', 'devDependencies', 'optionalDependencies']) {
        expect(pkg[field]?.[cdk], `${dir}: ${field}`).toBeUndefined();
      }
      expect(JSON.stringify(pkg['keywords'] ?? [])).not.toContain('cdk');
    }
  });

  it('heavy, lazily imported libraries are optional peers of @kouji-ui/components', () => {
    const pkg = JSON.parse(readFileSync(resolve(REPO, 'packages/components/package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
      peerDependencies: Record<string, string>;
      peerDependenciesMeta: Record<string, { optional?: boolean }>;
    };
    for (const peer of ['lucide-static', '@tanstack/virtual-core']) {
      expect(pkg.peerDependencies[peer], `${peer} is a peer`).toBeDefined();
      expect(pkg.peerDependenciesMeta[peer]?.optional, `${peer} is optional`).toBe(true);
      expect(pkg.dependencies[peer]).toBeUndefined();
    }
  });

  const dist = resolve(REPO, 'dist');
  it.skipIf(!existsSync(resolve(dist, 'kj-core/styles.css')) || !existsSync(resolve(dist, 'kj-components/package.json')))(
    'after a build, Node itself resolves every documented specifier from dist/',
    () => {
      for (const [key, dir] of [['core', 'kj-core'], ['components', 'kj-components']] as const) {
        const { problems } = checkInstalled(key, resolve(dist, dir));
        expect(problems, problems.join('\n')).toEqual([]);
      }
    },
  );

  /**
   * An optional peer named in a rolled-up `.d.ts` is a module a consumer who
   * declined that peer does not have; with `skipLibCheck: false` their build
   * fails on our typings. That is review finding lazy F-8, whose open half is
   * the chart / editor / rich-text types in core (and the core types the
   * components wrappers re-export).
   *
   * What this batch fixed is the other half: `@tanstack/virtual-core` and
   * `lucide-static` became optional peers WITHOUT entering the typings — the
   * virtualizer's row shape is re-declared as `KjVirtualRow` and the Lucide
   * set as `KjLucideIconSet` — and `marked` is reached through a private
   * `Marked` instance, not a re-exported type. So the baselines below may
   * shrink, never grow.
   */
  const BARE_IMPORT = /^\s*import\s[^;]*?from\s+'([^']+)';/gm;
  /** Every non-relative module the flattened typings name. */
  const dtsImports = (file: string): string[] =>
    [...new Set([...readFileSync(file, 'utf8').matchAll(BARE_IMPORT)].map((m) => m[1]))]
      .filter((s) => !s.startsWith('.'))
      .sort();
  /** Modules a consumer of the package necessarily has: required peers and deps. */
  const REQUIRED = ['@angular/', 'rxjs', '@kouji-ui/', '@tanstack/angular-table'];
  const peerLeaks = (file: string): string[] =>
    dtsImports(file).filter((s) => !REQUIRED.some((r) => s === r || s.startsWith(r)));

  for (const [pkg, dts, baseline] of [
    ['@kouji-ui/core', 'kj-core/types/kouji-ui-core.d.ts', ['echarts', 'lexical', 'monaco-editor']],
    [
      '@kouji-ui/components',
      'kj-components/types/kouji-ui-components.d.ts',
      ['echarts', 'monaco-editor'],
    ],
  ] as const) {
    const file = resolve(dist, dts);
    it.skipIf(!existsSync(file))(
      `${pkg}: the built .d.ts flattens no optional peer beyond the lazy F-8 baseline`,
      () => {
        for (const spec of peerLeaks(file)) {
          expect(baseline, `${spec} is a new optional-peer type leak in ${pkg}`).toContain(spec);
        }
        // The three this batch made optional must never join that list.
        for (const spec of ['@tanstack/virtual-core', 'lucide-static', 'marked']) {
          expect(dtsImports(file)).not.toContain(spec);
        }
      },
    );
  }
});

describe('public API graph — nothing docs-only ships', () => {
  for (const dir of ['packages/core', 'packages/components']) {
    it(`${dir}/src/public-api.ts reaches no example, playground, spec or examples entry`, () => {
      const { violations, reachable } = checkPublicApiGraph(resolve(REPO, dir, 'src/public-api.ts'));
      expect(reachable.size).toBeGreaterThan(50);
      expect(
        violations.map((v) => `${v.from} -> ${v.spec} (${v.why})`),
        'ng-packagr would roll these into the FESM and the public .d.ts',
      ).toEqual([]);
    });
  }

  it('flags a barrel that re-exports an _examples folder or a playground', () => {
    // A throwaway package: public-api.ts -> widget/index.ts -> a leak of each kind.
    const root = mkdtempSync(join(tmpdir(), 'kj-leaky-barrel-'));
    try {
      mkdirSync(join(root, 'widget', '_examples'), { recursive: true });
      const lines = (...l: string[]) => `${l.join('\n')}\n`;
      writeFileSync(join(root, 'public-api.ts'), lines("export * from './widget/index';"));
      writeFileSync(
        join(root, 'widget', 'index.ts'),
        lines(
          "export { widget } from './widget';",
          "export { WidgetExample } from './_examples';",
          "export type { WidgetKnobs } from './widget.playground';",
          "// export { Old } from './_examples/old'; — a comment is not an edge",
        ),
      );
      writeFileSync(join(root, 'widget', 'widget.ts'), lines('export const widget = 1;'));
      writeFileSync(
        join(root, 'widget', 'widget.playground.ts'),
        lines('export type WidgetKnobs = { size: number };'),
      );
      writeFileSync(join(root, 'widget', '_examples', 'index.ts'), lines('export const WidgetExample = 3;'));

      const { violations } = checkPublicApiGraph(join(root, 'public-api.ts'));
      expect(violations.map((v) => `${v.spec}: ${v.why}`)).toEqual([
        './_examples: docs example folder',
        './widget.playground: docs playground',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
