import { readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import postcss from 'postcss';
import { describe, expect, test } from 'vitest';

/**
 * Library-wide stylesheet invariants — the CSS contract @kouji-ui/themes
 * owns, checked over every stylesheet in core and components:
 *
 *   - the cascade-layer order (layers.css) pins every layer name in use
 *   - reduced motion: token-driven motion is switched off centrally, and a
 *     sheet with a literal duration carries its own guard
 *   - layout containment on the self-contained surfaces
 *   - scrims and hover tints read theme tokens instead of hard-coded black
 *   - dead overlay CSS stays deleted; invented token names stay gone
 *   - control heights ride the density ladder; control boundaries read the
 *     3:1 `--kj-border-control` token
 *
 * `lint-css.spec.ts` covers the two rules stylelint enforces per file
 * (`@layer` wrapping, `var()` resolution).
 */

const SRC = import.meta.dirname;
const REPO = resolve(SRC, '..', '..', '..');
const CORE = resolve(REPO, 'packages', 'core', 'src');
const COMPONENTS = resolve(REPO, 'packages', 'components', 'src');
const THEMES = SRC;

function cssFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) cssFiles(full, out);
    else if (entry.name.endsWith('.css')) out.push(full);
  }
  return out;
}

const read = (p: string) => readFileSync(p, 'utf-8');
const rel = (p: string) => relative(REPO, p).replace(/\\/g, '/');
const comp = (p: string) => read(resolve(COMPONENTS, p));
const core = (p: string) => read(resolve(CORE, p));

/** Declarations of the first rule whose selector list contains `selector` exactly. */
function decls(css: string, selector: string): Map<string, string> {
  const out = new Map<string, string>();
  let found = false;
  postcss.parse(css).walkRules((rule) => {
    if (found || !rule.selector.split(',').some((s) => s.trim() === selector)) return;
    found = true;
    rule.walkDecls((d) => {
      out.set(d.prop, d.value);
    });
  });
  if (!found) throw new Error(`rule "${selector}" not found`);
  return out;
}

const ALL_LIBRARY_CSS = [...cssFiles(CORE), ...cssFiles(COMPONENTS), ...cssFiles(THEMES)];

describe('cascade layers', () => {
  const layers = read(resolve(THEMES, 'layers.css'));
  const pinned = new Set<string>();
  postcss.parse(layers).walkAtRules('layer', (at) => {
    if (!at.nodes) at.params.split(',').forEach((n) => pinned.add(n.trim()));
  });

  test('layers.css pins the full order, prose below components and the tone/truncate utilities above', () => {
    expect([...pinned]).toEqual(['kj.reset', 'kj.base', 'kj.shared', 'kj.prose', 'kj.component', 'kj.tone', 'kj.truncate']);
  });

  test('base.css and index.css import layers.css before anything else', () => {
    const base = read(resolve(THEMES, 'base.css'));
    expect(base).toMatch(/@import '\.\/layers\.css';/);
    expect(base).not.toMatch(/@layer\s+[\w.]+\s*,/);
    const index = read(resolve(THEMES, 'index.css'));
    // A Windows checkout (core.autocrlf=true) writes CRLF, so splitting on a
    // bare newline leaves a trailing carriage return and fails equality.
    expect(index.trim().split(/\r?\n/)[0]).toBe("@import './layers.css';");
  });

  test('the package exports layers.css', () => {
    const pkg = JSON.parse(read(resolve(THEMES, '..', 'package.json'))) as { exports: Record<string, string> };
    expect(pkg.exports['./layers.css']).toBe('./src/layers.css');
  });

  test('every @layer name used under packages/*/src is pinned', () => {
    const used = new Map<string, string[]>();
    for (const file of ALL_LIBRARY_CSS) {
      // styles F-17: `docs-themes.css` used to be skipped here — it declared
      // its own unpinned `kj.tokens` / `kj.theme` layers. It rides the pinned
      // `kj.base` / `kj.shared` now, like every other stylesheet, so it is in.
      postcss.parse(read(file)).walkAtRules('layer', (at) => {
        const names = at.nodes ? [at.params.trim()] : at.params.split(',').map((s) => s.trim());
        for (const n of names) {
          if (!used.has(n)) used.set(n, []);
          used.get(n)?.push(rel(file));
        }
      });
    }
    for (const [name, files] of used) {
      expect(pinned.has(name), `${name} used by ${files.join(', ')} is not in layers.css`).toBe(true);
    }
  });

  test('prose.css uses only pinned layers and no longer defines its own', () => {
    const prose = core('typography/prose.css');
    const names: string[] = [];
    postcss.parse(prose).walkAtRules('layer', (at) => {
      names.push(at.params.trim());
    });
    expect(new Set(names)).toEqual(new Set(['kj.prose', 'kj.tone', 'kj.truncate']));
  });
});

describe('reduced motion', () => {
  /**
   * A literal duration in an `animation` / `transition` declaration, outside
   * any `var()` fallback. Token-driven motion (`var(--kj-transition)`) is
   * covered by the base.css guard; a fallback literal only applies when the
   * themes package is not loaded, in which case the guard is not loaded either.
   */
  function literalDurations(css: string): string[] {
    const hits: string[] = [];
    postcss.parse(css).walkDecls(/^(animation|transition)(-duration)?$/, (d) => {
      const stripped = d.value.replace(/var\((?:[^()]|\([^()]*\))*\)/g, 'v');
      if (/(^|[\s,])\d*\.?\d+m?s\b/.test(stripped)) hits.push(`${d.prop}: ${d.value}`);
    });
    return hits;
  }

  const animated = [...cssFiles(CORE), ...cssFiles(COMPONENTS)].filter((f) => literalDurations(read(f)).length > 0);

  test('finds the sheets with literal durations (sanity)', () => {
    expect(animated.map(rel)).toEqual(expect.arrayContaining([
      'packages/components/src/alert/alert.css',
      'packages/components/src/button/button.css',
      'packages/components/src/table/table.css',
      'packages/components/src/toast/toast.css',
    ]));
  });

  test.each(animated.map((f) => [rel(f), f]))('%s carries a prefers-reduced-motion guard', (_name, file) => {
    expect(read(file)).toMatch(/@media\s*\(prefers-reduced-motion:\s*(reduce|no-preference)\)/);
  });

  test('every theme transition resolves through a base primitive the guard zeroes', () => {
    for (const file of cssFiles(resolve(THEMES, 'themes'))) {
      const css = read(file);
      const m = /--kj-transition:\s*([^;]+);/.exec(css);
      expect(m?.[1].trim(), rel(file)).toMatch(/^var\(--kj-base-transition-(fast|base)\)$/);
    }
  });
});

describe('layout containment (perf F-22)', () => {
  test.each([
    ['dialog/dialog.css', '.kj-dialog'],
    ['drawer/drawer.css', '.kj-drawer'],
    ['sheet/sheet.css', '.kj-sheet'],
    ['popover/popover.css', '.kj-popover-content'],
    ['dropdown-menu/dropdown-menu.css', '.kj-dropdown-menu'],
    ['tooltip/tooltip.css', '.kj-tooltip-content'],
    ['confirm-popup/confirm-popup.css', '.kj-confirm-popup-content'],
    ['command-palette/command-palette.css', '.kj-command-palette__dialog'],
    ['toast/toast.css', '.kj-toast'],
    ['card/card.css', '.kj-card'],
    ['table/table.css', '.kj-table-wrapper'],
  ])('%s: %s declares contain: layout', (file, selector) => {
    expect(decls(comp(file), selector).get('contain')).toBe('layout');
  });

  test('no contained surface has a position: fixed descendant rule in its own sheet', () => {
    // `contain: layout` makes the element the containing block for fixed
    // descendants; the surfaces above are themselves fixed or portalled.
    for (const [file, selector] of [['card/card.css', '.kj-card'], ['table/table.css', '.kj-table-wrapper']]) {
      const css = comp(file);
      postcss.parse(css).walkDecls('position', (d) => {
        const sel = (d.parent as postcss.Rule).selector;
        if (sel.startsWith(selector + ' ') || sel.startsWith(selector + '-')) expect(d.value).not.toBe('fixed');
      });
    }
  });
});

describe('scrims and hover tints read theme tokens', () => {
  test('every modal scrim reads --kj-bg-overlay', () => {
    expect(core('primitives/overlay/overlay.css')).toMatch(
      /background:\s*var\(--kj-backdrop-bg,\s*var\(--kj-bg-overlay,\s*rgb\(0 0 0 \/ 0\.5\)\)\)/,
    );
    // The command palette used to hand-roll `.kj-command-palette__backdrop`
    // with its own copy of the token. It is an overlay now (overlay F-6), so
    // `blurredBackdrop()` renders the same `<kj-backdrop>` as every other
    // modal and the rule above is the only scrim declaration left.
    expect(comp('command-palette/command-palette.css')).not.toContain('kj-command-palette__backdrop');
  });

  test('--kj-bg-overlay has exactly the live scrims as consumers', () => {
    // F-6 filed this token as dead (declared by all 15 themes, read by zero
    // stylesheets). The report listed four scrims to wire up; two of them —
    // `.kj-dialog-overlay` and the drawer's `[data-kj-drawer-container]::before`
    // — turned out to be dead rules on markup nothing renders and were deleted
    // instead (F-18 / overlay F-23). The command palette was the fourth: it
    // hand-rolled a scrim, and overlay F-6 moved it onto the primitive, so
    // there is now exactly ONE scrim declaration in the library — the overlay
    // primitive's `<kj-backdrop>`, behind every modal there is. Pinning the
    // set, not a count, keeps a future hard-coded scrim visible.
    // `docs-themes.css` is excluded: it is the docs-site example theme, not a
    // shipped stylesheet (core's ng-package.json does not list it as an asset).
    // It ALIASES contract tokens on purpose — `--docs-backdrop:
    // var(--kj-bg-overlay)` — so the examples follow whichever theme the reader
    // picked instead of being pinned to one palette. That is a read, not a
    // scrim declaration, which is what this test exists to pin.
    const consumers = [...cssFiles(CORE), ...cssFiles(COMPONENTS)]
      .filter((f) => !rel(f).endsWith('core/src/styles/docs-themes.css'))
      .filter((f) => /var\(--kj-bg-overlay/.test(read(f)))
      .map(rel)
      .sort();
    expect(consumers).toEqual([
      'packages/core/src/primitives/overlay/overlay.css',
    ]);
  });

  test('dismiss-button hover tints follow the theme ink instead of black', () => {
    expect(comp('alert/alert.css')).toMatch(/\.kj-alert__dismiss:hover \{[^}]*color-mix\(in oklch, var\(--kj-fg-default\) 8%, transparent\)/);
    expect(comp('toast/toast.css')).toMatch(/\.kj-toast-close:hover \{[^}]*color-mix\(in oklch, var\(--kj-fg-default\) 8%, transparent\)/);
    for (const f of ['alert/alert.css', 'toast/toast.css']) {
      expect(comp(f)).not.toMatch(/background:\s*rgb\(0 0 0 \/ 0\.0[68]\)/);
    }
  });

  test('blurredBackdrop() has a rule to apply', () => {
    expect(decls(core('primitives/overlay/overlay.css'), '.kj-backdrop--blur').get('backdrop-filter')).toMatch(/blur\(/);
  });
});

describe('dead overlay CSS stays deleted', () => {
  test('drawer: no scrim pseudo-element on an attribute nothing writes', () => {
    expect(comp('drawer/drawer.css')).not.toContain('data-kj-drawer-container');
  });

  test('popover: no body scroll-lock hook naming a service that does not exist', () => {
    expect(comp('popover/popover.css')).not.toContain('data-kj-scroll-lock');
    expect(comp('popover/popover.css')).not.toContain('KjOverlayService');
  });
});

describe('invented token names are gone', () => {
  const INVENTED = [
    '--kj-bg-subtle', '--kj-bg-muted', '--kj-bg-subtle-hover', '--kj-danger-fg', '--kj-danger-bg-subtle',
    '--kj-border-color', '--kj-border-subtle', '--kj-fg-error', '--kj-focus-ring-color', '--kj-focus-ring-width',
    '--kj-primary', '--kj-input-bg', '--kj-font-size-', '--kj-radius-sm', '--kj-radius-md', '--kj-color-link',
  ];
  const inputCss = resolve(COMPONENTS, 'input', 'input.css');

  test.each(INVENTED)('%s is referenced by no library stylesheet', (name) => {
    for (const file of [...cssFiles(CORE), ...cssFiles(COMPONENTS)]) {
      // styles F-17: `docs-themes.css` is no longer exempt — its example theme
      // is `--docs-*` now, so it can neither shadow nor invent a `--kj-` name.
      // `--kj-input-bg` is a real knob declared by input.css itself.
      if (name === '--kj-input-bg' && file === inputCss) continue;
      expect(read(file), rel(file)).not.toMatch(new RegExp(`var\\(${name}(?![\\w-])`));
    }
  });

  test('component knobs the report suggested promoting are declared where they are read', () => {
    expect(comp('table/table.css')).toMatch(/--kj-table-header-bg:\s*var\(--kj-bg-surface\)/);
    expect(comp('button/button.css')).toMatch(/--kj-segmented-bg-on:\s*var\(--kj-bg-surface\)/);
    expect(comp('button/button.css')).toMatch(/--kj-segmented-fg-on:\s*var\(--kj-fg-default\)/);
  });

  test('menubar spacing resolves (--kj-space-2xs now exists in the ladder)', () => {
    const density = read(resolve(THEMES, 'density.css'));
    expect(density).toMatch(/--kj-space-2xs:\s*var\(--kj-space-1\)/);
    expect(comp('menubar/menubar.css')).toMatch(/--kj-menubar-padding:\s*var\(--kj-space-2xs\)/);
  });

  test('command palette fallback for --kj-space-lg matches the ladder (1rem, not 1.25rem)', () => {
    expect(comp('command-palette/command-palette.css')).not.toContain('var(--kj-space-lg, 1.25rem)');
  });

  test('card lift reads the theme elevation directly (the button-shadow fallback was unreachable)', () => {
    expect(decls(comp('card/card.css'), '.kj-card[data-shadow="lift"]').get('--kj-card-shadow')).toBe('var(--kj-shadow-md)');
  });
});

describe('prose.css token taxonomy and attribute namespace', () => {
  const prose = core('typography/prose.css');

  test('reads the density type ramp and the base line-height ladder', () => {
    expect(prose).not.toMatch(/--kj-font-size-|--kj-radius-sm|--kj-radius-md|--kj-color-link/);
    expect(prose).toMatch(/font-size:\s*var\(--kj-text-base, 1rem\)/);
    expect(prose).toMatch(/font-size:\s*var\(--kj-text-4xl, 2\.5rem\)/);
    expect(prose).toMatch(/line-height:\s*var\(--kj-line-height-relaxed, 1\.7\)/);
    expect(prose).toMatch(/max-width:\s*var\(--kj-prose-max-width, 65ch\)/);
    expect(prose).toMatch(/border-radius:\s*var\(--kj-radius-field, 4px\)/);
  });

  test.each(['lead', 'muted', 'code', 'blockquote'])('tone "%s" is keyed on data-kj-tone, with the bare data-tone kept as a supported spelling', (tone) => {
    expect(prose).toMatch(new RegExp(`\\[data-kj-tone='${tone}'\\],\\s*\\[data-tone='${tone}'\\]\\s*\\{`));
  });

  test('truncate is keyed on data-kj-truncate with the bare attribute kept as a deprecated alias', () => {
    expect(prose).toMatch(/\[data-kj-truncate='1'\],\s*\[data-truncate='1'\]\s*\{/);
    expect(prose).toMatch(/\[data-kj-truncate\]:not\(\[data-kj-truncate='1'\]\),\s*\[data-truncate\]:not\(\[data-truncate='1'\]\)/);
    for (const n of [2, 3, 4, 5, 6]) expect(prose).toContain(`[data-kj-truncate='${n}'], [data-truncate='${n}']`);
  });

  test('density presets accept the namespaced data-kj-density alongside data-density', () => {
    const density = read(resolve(THEMES, 'density.css'));
    for (const level of ['compact', 'standard', 'comfortable', 'comfy']) {
      expect(density).toContain(`[data-kj-density="${level}"]`);
      expect(density).toContain(`[data-density="${level}"]`);
    }
  });
});

describe('density: control heights and control boundaries', () => {
  test.each([
    ['select/select.css', '--kj-select-trigger-height'],
    ['date-picker/date-picker.css', '--kj-date-picker-input-height'],
    ['datetime-picker/datetime-picker.css', '--kj-datetime-picker-input-height'],
    ['input-mask/input-mask.css', '--kj-input-mask-height'],
    ['number-input/number-input.css', '--kj-number-input-height'],
    ['password-input/password-input.css', '--kj-password-input-height'],
    ['time-picker/time-picker.css', '--kj-time-picker-height'],
  ])('%s: every %s value rides --kj-ctl-h-*', (file, knob) => {
    const css = comp(file);
    const values = [...css.matchAll(new RegExp(`${knob}:\\s*([^;]+);`, 'g'))].map((m) => m[1].trim());
    expect(values.length).toBeGreaterThan(0);
    for (const v of values) expect(v).toMatch(/^var\(--kj-ctl-h-(xs|sm|md|lg|xl)\)$/);
  });

  test('the number-input stepper tracks the same ladder so it stays square', () => {
    const css = comp('number-input/number-input.css');
    for (const m of css.matchAll(/--kj-number-input-stepper-size:\s*([^;]+);/g)) {
      expect(m[1].trim()).toMatch(/^var\(--kj-ctl-h-(xs|sm|md|lg)\)$/);
    }
  });

  test('WCAG 2.5.5 floors never shrink under compact density', () => {
    expect(comp('chat/chat-ai.css')).toMatch(/height:\s*max\(var\(--kj-ctl-h-lg\), 2\.75rem\)/);
    expect(decls(comp('textarea/textarea.css'), '.kj-textarea').get('--kj-textarea-min-height')).toBe('2.75rem');
  });

  test.each([
    ['input/input.css', '--kj-input-border-color'],
    ['checkbox/checkbox.css', '--kj-checkbox-border'],
    ['radio/radio.css', '--kj-radio-border'],
    ['textarea/textarea.css', '--kj-textarea-border-color'],
    ['number-input/number-input.css', '--kj-number-input-border-color'],
    ['password-input/password-input.css', '--kj-password-input-border-color'],
    ['time-picker/time-picker.css', '--kj-time-picker-border-color'],
    ['input-otp/input-otp.css', '--kj-otp-cell-border-color'],
    ['input-group/input-group.css', '--kj-input-group-border-color'],
  ])('%s: %s defaults to --kj-border-control (WCAG 1.4.11)', (file, knob) => {
    expect(comp(file)).toMatch(new RegExp(`${knob}:\\s*var\\(--kj-border-control\\)`));
  });

  test.each([
    ['select/select.css', '.kj-select-trigger'],
    ['date-picker/date-picker.css', '.kj-date-picker__input'],
    ['datetime-picker/datetime-picker.css', '.kj-datetime-picker__input'],
    ['input-mask/input-mask.css', '.kj-input-mask__input'],
    ['combobox/combobox.css', '.kj-combobox-input'],
    ['tree-select/tree-select.css', '.kj-tree-select-trigger'],
    ['cascade-select/cascade-select.css', '.kj-cascade-trigger'],
  ])('%s: %s border reads --kj-border-control', (file, selector) => {
    expect(decls(comp(file), selector).get('border')).toMatch(/var\(--kj-border-control\)$/);
  });

  test('color-picker thumb chrome is tokenised (no #fff / #000 rails)', () => {
    const css = comp('color-picker/color-picker.css');
    expect(css).not.toMatch(/border:\s*2px solid #(fff|000)\b/);
    expect(css).not.toMatch(/background:\s*#fff;/);
    expect(css).toMatch(/border:\s*2px solid var\(--kj-bg-elevated\)/);
    expect(css).toMatch(/box-shadow:\s*0 0 0 1px var\(--kj-fg-default\)/);
  });
});

/**
 * styles F-17. `packages/core/src/styles/docs-themes.css` is the shared theme
 * for the `_examples/` components the docs site renders. It used to declare
 * twenty `--kj-*` properties, four of which — `--kj-border`, `--kj-shadow-sm`,
 * `--kj-shadow-md`, `--kj-transition` — are real contract tokens with entirely
 * different meanings. Nothing broke only because Angular's emulated
 * encapsulation rewrites `:root` into a selector that never matches; the first
 * example to set `ViewEncapsulation.None` would have rewritten the theme
 * contract for the whole document.
 *
 * It is `--docs-*` now, so the collision cannot happen at all, and it is no
 * longer exempt from `pnpm lint:css`. These tests are what keep it that way.
 */
describe('docs example theme is not a rival --kj- namespace (styles F-17)', () => {
  const DOCS_THEMES = resolve(CORE, 'styles', 'docs-themes.css');

  /** Every `_examples` file that pulls the shared docs theme in. */
  function themedExamples(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) themedExamples(full, out);
      else if (entry.name.endsWith('.ts') && read(full).includes('docs-themes.css')) out.push(full);
    }
    return out;
  }

  test('it declares no --kj- custom property', () => {
    const declared = [...read(DOCS_THEMES).matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]);
    expect(declared.length).toBeGreaterThan(15);
    expect(declared.filter((n) => n.startsWith('--kj-'))).toEqual([]);
  });

  test('it is linted like every other stylesheet — no ignoreFiles entry', () => {
    const config = read(resolve(REPO, 'stylelint.config.mjs'));
    expect(config).not.toContain('docs-themes.css');
  });

  test('the examples that use it reference no renamed --kj- name', () => {
    const RENAMED = [
      'bg', 'surface', 'text', 'text-muted', 'border', 'accent', 'accent-on',
      'destructive', 'radius-sm', 'radius-md', 'radius-lg', 'shadow-sm',
      'shadow-md', 'shadow-hard', 'font', 'btn-border', 'btn-outline-border',
      'btn-ghost-color', 'backdrop', 'transition',
    ];
    const files = themedExamples(CORE);
    expect(files.length).toBeGreaterThan(15);
    for (const file of files) {
      const src = read(file);
      for (const name of RENAMED) {
        expect(src, `${rel(file)} still reads --kj-${name}`).not.toMatch(
          new RegExp(`--kj-${name}(?![a-z0-9-])`),
        );
      }
    }
  });
});
