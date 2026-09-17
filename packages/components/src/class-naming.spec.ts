import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * CLAUDE.md, "Class Naming Rule": omit the Angular type suffix (`Directive`,
 * `Component`, `Service`, `Pipe`) unless two things in the same feature would
 * otherwise share the same base name.
 *
 * arch F-11 found 34 exported classes that carried a suffix nothing collided
 * with. This scan is what stops the count climbing again: it reads both
 * packages' sources, so a new `KjFooComponent` with no `KjFoo` fails here
 * rather than in the next review.
 */
const SRC_ROOTS = [
  join(process.cwd(), 'src'),
  join(process.cwd(), '..', 'core', 'src'),
];

/** Suffixes the rule governs. */
const SUFFIXES = /(Component|Directive|Service|Pipe)$/;

/**
 * Names that keep their suffix because something else in the package really
 * does own the bare name. Each entry says what it collides with.
 */
const EARNED = new Map<string, string>([
  // `KjRichTextFeature` is the feature *type* exported from
  // `core/src/rich-text/feature.ts`, so the directive keeps its suffix.
  ['KjRichTextFeatureDirective', 'type KjRichTextFeature'],
]);

/**
 * Still carrying an unearned suffix, with the reason it was not renamed in
 * this pass. Shrink this list; never add to it. **Empty** — the last entry,
 * `KjCarouselPauseComponent`, was renamed to `KjCarouselPause` when
 * `components/carousel` was split (arch F-12). It is a clean break: the old
 * name is gone, not aliased.
 */
const PENDING = new Map<string, string>();

interface Decl { readonly name: string; readonly file: string }

/**
 * Every shipped `.ts` under both packages — specs, examples and playgrounds
 * excluded, because only published source can carry a published alias.
 */
function sourceFiles(): { file: string }[] {
  const out: { file: string }[] = [];
  const walk = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '_examples') continue;
        walk(p);
      } else if (
        e.name.endsWith('.ts') &&
        !e.name.endsWith('.spec.ts') &&
        !e.name.includes('.example.') &&
        !e.name.includes('.playground.')
      ) {
        out.push({ file: p });
      }
    }
  };
  SRC_ROOTS.forEach(walk);
  return out;
}

function collect(): { decls: Decl[]; exported: Set<string> } {
  const decls: Decl[] = [];
  const exported = new Set<string>();
  const walk = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '_examples') continue;
        walk(p);
        continue;
      }
      if (!e.name.endsWith('.ts')) continue;
      if (e.name.includes('.example.') || e.name.includes('.playground.')) continue;
      const src = readFileSync(p, 'utf8');
      for (const m of src.matchAll(/^export (?:declare )?(?:abstract )?(?:class|interface|type|const|function|enum) (\w+)/gm)) {
        exported.add(m[1]);
      }
      if (e.name.endsWith('.spec.ts')) continue;
      for (const m of src.matchAll(/^export (?:abstract )?class (Kj\w+)/gm)) {
        decls.push({ name: m[1], file: p });
      }
    }
  };
  SRC_ROOTS.forEach(walk);
  return { decls, exported };
}

describe('class naming rule (arch F-11)', () => {
  const { decls, exported } = collect();

  it('finds the library sources it is meant to police', () => {
    expect(decls.length).toBeGreaterThan(300);
  });

  it('no exported class carries an Angular type suffix that nothing collides with', () => {
    const unearned = decls
      .filter((d) => SUFFIXES.test(d.name))
      .filter((d) => !exported.has(d.name.replace(SUFFIXES, '')))
      .filter((d) => !EARNED.has(d.name) && !PENDING.has(d.name))
      .map((d) => `${d.name} (${d.file.split(sep).slice(-2).join('/')})`);
    expect(unearned).toEqual([]);
  });

  it('every class that keeps a suffix really has a same-base counterpart', () => {
    for (const [name, why] of EARNED) {
      expect(decls.some((d) => d.name === name), `${name} no longer exists; drop it from EARNED`).toBe(true);
      expect(exported.has(name.replace(SUFFIXES, '')), `${name} claims to collide with ${why}`).toBe(true);
    }
  });

  /**
   * Maintainer ruling, 2026-09-16: a rename is a clean break. The new name is
   * the only name — no `export { KjCard as KjCardComponent }`, no duplicate
   * input kept so an old binding keeps compiling, no "deprecated for one
   * minor". The first arch F-11 pass added ~33 of those; they are gone, and
   * this is what stops them coming back.
   */
  it('no renamed symbol is re-exported under its old name', () => {
    const offenders: string[] = [];
    for (const { file } of sourceFiles()) {
      const src = readFileSync(file, 'utf8');
      const where = file.split(sep).slice(-2).join('/');
      // `export { Foo as FooComponent }` / `export { Foo as FooDirective }`.
      for (const m of src.matchAll(/\b(Kj\w+) as (Kj\w+(?:Component|Directive|Service|Pipe))\b/g)) {
        offenders.push(`${where}: re-exports ${m[1]} as ${m[2]}`);
      }
      for (const phrase of ['Kept as an alias', '@deprecated Renamed to']) {
        if (src.includes(phrase)) offenders.push(`${where}: "${phrase}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  /**
   * Export-surface half of the same ruling: a public symbol is exported once,
   * from its feature folder's `index.ts`. Two `index.ts` files exporting the
   * same name means the symbol is reachable under two paths, which is how the
   * alias layer grew in the first place.
   */
  it('no public symbol is exported by two different feature barrels', () => {
    const barrels = sourceFiles()
      .map(({ file }) => file)
      .filter((file) => file.endsWith(`${sep}index.ts`));
    // A barrel nested under another barrel's folder (`rich-text/features/`,
    // everything under `primitives/`) is an aggregator the parent re-exports,
    // not a second home for the name.
    const dirOf = (f: string): string => f.slice(0, -`${sep}index.ts`.length);
    const roots = barrels.filter(
      (f) => !barrels.some((other) => other !== f && dirOf(f).startsWith(dirOf(other) + sep)),
    );
    const owners = new Map<string, string[]>();
    for (const file of roots) {
      const src = readFileSync(file, 'utf8');
      const where = file.split(sep).slice(-2).join('/');
      for (const m of src.matchAll(/\b(?:type\s+)?(Kj[A-Za-z0-9_]+)\s*(?:,|\}|\s+from)/g)) {
        const list = owners.get(m[1]) ?? [];
        if (!list.includes(where)) list.push(where);
        owners.set(m[1], list);
      }
    }
    const duplicated = [...owners]
      .filter(([, where]) => where.length > 1)
      .map(([name, where]) => `${name}: ${where.join(' + ')}`);
    expect(duplicated).toEqual([]);
  });

  it('no `*.directive.ts` / `*.component.ts` / `*.pipe.ts` file is left in either package', () => {
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      let entries;
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const p = join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name === 'node_modules') continue;
          walk(p);
        } else if (/\.(directive|component|pipe)(\.spec)?\.ts$/.test(e.name)) {
          offenders.push(p);
        }
      }
    };
    SRC_ROOTS.forEach(walk);
    // `icon.directive.ts` was the last one; the file-name half of the rule is
    // as mechanical as the class-name half.
    expect(offenders).toEqual([]);
  });
});
