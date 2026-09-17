import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `rules/architecture.md` - "One directive per file".
 *
 * arch F-12 found ~30 files declaring more than one directive, five of them
 * holding 7-9 in 400-900 lines. Those five are split; this is the ratchet that
 * stops the rest growing and makes the remainder visible instead of implied.
 *
 * The number after each path is how many `@Directive` / `@Component`
 * declarations that file is still allowed. Lower an entry when you split a
 * file, delete it when the file reaches one. Never raise one, and never add a
 * new path: a new feature gets one directive per file.
 */
const BUDGET = new Map<string, number>([
  ['components/accordion/accordion.ts', 4],
  ['components/action-sheet/action-sheet.ts', 2],
  ['components/alert/alert.ts', 6],
  ['components/breadcrumb/breadcrumb.ts', 7],
  ['components/card/card.ts', 7],
  ['components/cascade-select/cascade-select.ts', 3],
  ['components/chat/chat.ts', 6],
  ['components/combobox/combobox.ts', 5],
  ['components/confirm-popup/confirm-popup.ts', 7],
  ['components/dialog/dialog.ts', 2],
  ['components/drawer/drawer.ts', 2],
  ['components/empty-state/empty-state.ts', 5],
  ['components/field/field.ts', 5],
  ['components/form/form.ts', 3],
  ['components/input-group/input-group.ts', 2],
  ['components/list/list.ts', 2],
  ['components/menubar/menubar.ts', 2],
  ['components/overlay-badge/overlay-badge.ts', 2],
  ['components/radio/radio.ts', 2],
  ['components/select/select.ts', 2],
  ['components/sheet/sheet.ts', 2],
  ['components/speed-dial/speed-dial.ts', 4],
  ['components/stepper/stepper.ts', 7],
  ['components/table/table-side-panel.ts', 2],
  ['components/table/table-state-templates.ts', 3],
  ['components/table/table-toolbar.ts', 2],
  ['components/tabs/tabs.ts', 4],
  ['components/tag/tag.ts', 3],
  ['components/toast/toast.ts', 4],
  ['components/tree-select/tree-select.ts', 2],
  ['core/a11y/roving-tabindex.ts', 2],
  ['core/accordion/accordion.ts', 4],
  ['core/avatar/avatar.ts', 3],
  ['core/file-upload/file-upload.ts', 5],
  ['core/form/form-field.ts', 3],
  ['core/input-otp/input-otp.ts', 2],
  ['core/list/list.ts', 2],
  ['core/password-input/password-input.ts', 5],
  ['core/primitives/list/group.ts', 3],
  ['core/radio/radio.ts', 2],
  ['core/tabs/tabs.ts', 4],
  ['core/time-picker/time-picker-segment.ts', 4],
  ['core/toast/toast.ts', 4],
  ['core/tree-select/tree-select-node.ts', 2],
]);

const ROOTS: readonly [string, string][] = [
  ['components/', join(process.cwd(), 'src')],
  ['core/', join(process.cwd(), '..', 'core', 'src')],
];

const DECLARATION = /^@(?:Directive|Component)\(/gm;

function scan(): Map<string, number> {
  const counts = new Map<string, number>();
  const walk = (prefix: string, dir: string, rel: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      const key = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '_examples') continue;
        walk(prefix, p, key);
        continue;
      }
      if (!e.name.endsWith('.ts') || e.name.endsWith('.spec.ts')) continue;
      if (e.name.includes('.example.') || e.name.includes('.playground.')) continue;
      const n = readFileSync(p, 'utf8').match(DECLARATION)?.length ?? 0;
      if (n > 1) counts.set(prefix + key, n);
    }
  };
  for (const [prefix, dir] of ROOTS) walk(prefix, dir, '');
  return counts;
}

describe('one directive per file (arch F-12)', () => {
  const counts = scan();

  it('no file declares more than its recorded budget', () => {
    const over = [...counts]
      .filter(([file, n]) => n > (BUDGET.get(file) ?? 1))
      .map(([file, n]) => `${file}: ${n} (budget ${BUDGET.get(file) ?? 1})`);
    expect(over).toEqual([]);
  });

  it('every budgeted file still exists and is still over the line', () => {
    const stale = [...BUDGET.keys()].filter((file) => !counts.has(file));
    // A file that reached one directive should lose its entry, so the list
    // shrinks with the debt instead of outliving it.
    expect(stale).toEqual([]);
  });

  it('the five features split in this batch declare one directive per file', () => {
    const split = [
      'core/alert', 'core/stepper', 'core/color-picker',
      'components/pagination', 'components/command-palette',
    ];
    const offenders = [...counts.keys()].filter((f) => split.some((d) => f.startsWith(`${d}/`)));
    expect(offenders).toEqual([]);
  });

  it('each split feature keeps a `<feature>.ts` aggregator that re-exports its parts', () => {
    const aggregators: readonly [string, string, number][] = [
      ['src/alert/alert.ts', '../core', 6],
      ['src/stepper/stepper.ts', '../core', 7],
      ['src/color-picker/color-picker.ts', '../core', 7],
      ['src/pagination/pagination.ts', '.', 9],
      ['src/command-palette/command-palette.ts', '.', 9],
    ];
    for (const [file, base, parts] of aggregators) {
      const src = readFileSync(join(process.cwd(), base, file), 'utf8');
      const lines = src.split(String.fromCharCode(10)).filter((l) => l.trim().startsWith('export * from'));
      expect(lines.length, `${file} should re-export ${parts} parts`).toBe(parts);
    }
  });
});
