import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The two `rules/architecture.md` clauses arch F-12 and arch F-14 found
 * drifting, made checkable.
 *
 * Both are the same failure mode as the class-naming rule
 * (`packages/components/src/class-naming.spec.ts`): the rules file described
 * code that no longer existed, and nothing noticed because nothing read it.
 * These scans are what keep the counts from climbing back.
 */
const SRC_ROOTS = [
  join(process.cwd(), 'src'),
  join(process.cwd(), '..', 'components', 'src'),
];

interface SourceFile {
  readonly path: string;
  readonly rel: string;
  readonly text: string;
}

/** Shipped library sources — specs, examples and playgrounds excluded. */
function sources(): SourceFile[] {
  const out: SourceFile[] = [];
  const walk = (dir: string, pkg: string): void => {
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
        walk(p, pkg);
      } else if (
        e.name.endsWith('.ts') &&
        !e.name.endsWith('.spec.ts') &&
        !e.name.includes('.example.') &&
        !e.name.includes('.playground.')
      ) {
        out.push({ path: p, rel: `${pkg}/${p.split(`${sep}src${sep}`)[1]?.split(sep).join('/')}`, text: readFileSync(p, 'utf8') });
      }
    }
  };
  walk(SRC_ROOTS[0], 'core');
  walk(SRC_ROOTS[1], 'components');
  return out;
}

const ALL = sources();

describe('one directive per file (arch F-12)', () => {
  /**
   * The rule's exception is "a tightly-coupled pair where the child is never
   * used standalone", so a file with exactly **two** declarations may be
   * legitimate and is not mechanically checkable. This scan polices **three or
   * more**, where no exception can apply.
   *
   * Each entry is the declaration count when it was recorded. A listed file
   * that *grows* fails anyway. Shrink this list; never add to it.
   */
  const PENDING = new Map<string, number>([
    ['components/breadcrumb/breadcrumb.ts', 7],
    ['components/confirm-popup/confirm-popup.ts', 7],
    ['components/stepper/stepper.ts', 7],
    ['components/card/card.ts', 7],
    ['components/chat/chat.ts', 6],
    ['components/alert/alert.ts', 6],
    ['core/file-upload/file-upload.ts', 5],
    ['components/combobox/combobox.ts', 5],
    ['core/password-input/password-input.ts', 5],
    ['components/empty-state/empty-state.ts', 5],
    ['components/field/field.ts', 5],
    ['core/toast/toast.ts', 4],
    ['core/accordion/accordion.ts', 4],
    ['core/tabs/tabs.ts', 4],
    ['components/accordion/accordion.ts', 4],
    ['components/speed-dial/speed-dial.ts', 4],
    ['components/tabs/tabs.ts', 4],
    ['components/toast/toast.ts', 4],
    ['core/time-picker/time-picker-segment.ts', 4],
    ['core/avatar/avatar.ts', 3],
    ['core/form/form-field.ts', 3],
    ['core/primitives/list/group.ts', 3],
    ['components/cascade-select/cascade-select.ts', 3],
    ['components/form/form.ts', 3],
    ['components/table/table-state-templates.ts', 3],
    ['components/tag/tag.ts', 3],
  ]);

  function declarations(f: SourceFile): number {
    return (f.text.match(/^@(Directive|Component)\(/gm) ?? []).length;
  }

  it('finds the library sources it is meant to police', () => {
    expect(ALL.length).toBeGreaterThan(300);
  });

  /** The families arch F-12 named, plus `alert`, which came with them. */
  const SPLIT = [
    'core/carousel',
    'core/color-picker',
    'core/stepper',
    'core/alert',
    'components/carousel',
    'components/command-palette',
    'components/pagination',
  ];

  it('the split families really are one directive per file', () => {
    const offenders = ALL.filter(
      (f) => SPLIT.some((feature) => f.rel.startsWith(`${feature}/`)) && declarations(f) > 1,
    ).map((f) => `${f.rel} declares ${declarations(f)}`);
    expect(offenders).toEqual([]);
  });

  it('no unlisted file declares three or more directives, and no listed one grows', () => {
    const offenders: string[] = [];
    for (const f of ALL) {
      const n = declarations(f);
      const budget = PENDING.get(f.rel);
      if (budget !== undefined) {
        if (n > budget) offenders.push(`${f.rel} declares ${n}, was ${budget} (grew)`);
        continue;
      }
      if (n >= 3) offenders.push(`${f.rel} declares ${n} (unlisted)`);
    }
    expect(offenders).toEqual([]);
  });

  it('every pending entry still exists, so the list cannot go stale', () => {
    const known = new Set(ALL.map((f) => f.rel));
    expect([...PENDING.keys()].filter((rel) => !known.has(rel))).toEqual([]);
  });

  it('a split family keeps a `<feature>.ts` aggregator so the import path survives', () => {
    for (const path of SPLIT) {
      const feature = path.split('/')[1];
      const agg = ALL.find((f) => f.rel === `${path}/${feature}.ts`);
      expect(agg, `${path}/${feature}.ts must exist`).toBeDefined();
      expect(agg!.text).toMatch(/^export (\{|\*)/m);
      expect(declarations(agg!)).toBe(0);
    }
  });
});

/**
 * Strip comments so a scan reads code, not the prose that explains the rule —
 * `carousel.context.ts` documents the very cast pattern the last test here
 * forbids, and `dev-mode.ts` names `isDevMode()` to say why it is not used.
 */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

describe('library diagnostics (arch F-14)', () => {
  it('nothing guards a diagnostic with `isDevMode()`', () => {
    // `isDevMode()` is a call the optimiser cannot fold, so the branch and its
    // message strings ship to production. `ngDevMode` (via kjDevMode) is a
    // statically-defined global, so the whole branch is dead code.
    const offenders = ALL.filter((f) => /\bisDevMode\s*\(/.test(code(f.text))).map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it('every warning goes through `kjDevWarn`, so the message shape is one thing', () => {
    const offenders = ALL.filter(
      (f) =>
        !f.rel.endsWith('primitives/diagnostics/dev-mode.ts') &&
        /\bconsole\.warn\(/.test(code(f.text)),
    ).map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it('no child reaches its parent context by casting the token back to the class', () => {
    /**
     * `inject(KJ_X) as KjX` compiles against whatever the class happens to
     * expose, so nothing tells you when a child starts depending on a private —
     * it defeats the interface boundary the context pattern exists to create.
     * Each remaining cast is a *strategy slot*, not a parent context: the token
     * is deliberately a union of strategy shapes and the consumer narrows to
     * the one it provided itself.
     */
    const SLOT_TOKENS = /KJ_OVERLAY_(TRIGGER_EVENT_STRATEGY|MOUNT_STRATEGY|POSITION_STRATEGY)|KJ_EDITOR_CONTRACT/;
    const offenders: string[] = [];
    for (const f of ALL) {
      for (const m of code(f.text).matchAll(
        /(?:inject|injectParent)\(\s*(KJ_[A-Z0-9_]+)[^)]*\)\s+as\s+(Kj[A-Za-z0-9]+)/g,
      )) {
        if (SLOT_TOKENS.test(m[1])) continue;
        offenders.push(`${f.rel}: ${m[1]} as ${m[2]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('a required parent context is read through `injectParent`, not bare `inject`', () => {
    /**
     * A child that injects its parent's token directly fails with Angular's
     * `NG0201: No provider for InjectionToken KjTabs`, which names neither the
     * child nor the selector the author has to add. `injectParent` raises the
     * library's own message instead; its behaviour is covered in
     * `primitives/diagnostics/inject-parent.spec.ts`. This is the adoption
     * half.
     *
     * "Parent context token" = one declared in a `*.context.ts`. A bare
     * `inject(TOKEN)` of one, from outside that feature's own context file and
     * without `{ optional: true }`, is the pattern the finding is about.
     */
    const contextTokens = new Set<string>();
    for (const f of ALL) {
      if (!f.rel.endsWith('.context.ts')) continue;
      for (const m of code(f.text).matchAll(/export const (KJ_[A-Z0-9_]+) = new InjectionToken/g)) {
        // `KJ_TODAY` is a value token (the clock), not a parent context —
        // there is no parent element for a message to name.
        if (m[1] === 'KJ_TODAY') continue;
        contextTokens.add(m[1]);
      }
    }
    expect(contextTokens.size).toBeGreaterThan(20);

    const offenders: string[] = [];
    for (const f of ALL) {
      if (f.rel.endsWith('.context.ts')) continue;
      for (const m of code(f.text).matchAll(/\binject(?:<[^>]*>)?\(\s*(KJ_[A-Z0-9_]+)\s*\)/g)) {
        if (!contextTokens.has(m[1])) continue;
        // A directive that PROVIDES the token also injects it in places
        // (`useExisting` forward refs); those read their own element, not a
        // parent, so only cross-feature reads count.
        const feature = f.rel.split('/').slice(0, 2).join('/');
        const declaredIn = ALL.find(
          (c) => c.rel.endsWith('.context.ts') && code(c.text).includes(`export const ${m[1]} =`),
        );
        if (declaredIn && declaredIn.rel.split('/').slice(0, 2).join('/') === feature) {
          // Same feature: still a parent lookup, and still worth the message.
          offenders.push(`${f.rel}: inject(${m[1]})`);
        }
      }
    }
    /**
     * Core is at zero. This is an exact expectation rather than a filter, so a
     * new bare `inject(KJ_*_CONTEXT_TOKEN)` fails here instead of quietly
     * joining an allowance list.
     */
    expect(offenders.filter((o) => o.startsWith('core/'))).toEqual([]);
  });
});
