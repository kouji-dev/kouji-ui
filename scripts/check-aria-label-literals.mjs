/**
 * Fails on a hard-coded, human-readable `aria-label` in shipped library
 * markup.
 *
 * An accessible name baked into a template is untranslatable: an app that
 * registers a French catalog still hears "Next month". Every assistive string
 * the library emits belongs in the i18n catalog
 * (`packages/core/src/i18n/catalogs/`) and is read through
 * `KjTranslateService`, or comes from a consumer-supplied input.
 *
 * What counts as a violation: a literal whose value starts with a capital
 * letter — the shape of prose rather than of a token (`aria-label="polite"` is
 * not prose). Four shapes are checked, because the string is just as
 * untranslatable in each:
 *
 *   aria-label="Next month"                                (template attribute)
 *   [attr.aria-label]="'Next month'"                       (literal binding)
 *   host: { 'aria-label': 'Data table toolbar' }            (host attribute)
 *   host: { '[attr.aria-label]': '"Hue"' }                  (host binding)
 *   input<string>('Next slide', { alias: 'aria-label' })    (input DEFAULT)
 *
 * The last one is the subtle one: the input is overridable, but a consumer who
 * never sets it still gets English and no catalog can reach it. Default such
 * an input to `undefined` and fall back to a catalog key.
 *
 * Comments are stripped first, so the `@example` / `@doc-aria` blocks that
 * legitimately *show* markup do not trip it.
 *
 * `ALLOWED` is the debt list, and it is EMPTY — both packages now route every
 * accessible name through the catalog or through a consumer input. Adding an
 * entry re-opens cust F-7.
 */
import { readFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOTS = ['packages/core/src', 'packages/components/src'];

const SKIP = (p) =>
  p.endsWith('.spec.ts') ||
  p.endsWith('.example.ts') ||
  p.endsWith('.playground.ts') ||
  p.endsWith('example-components.ts') ||
  p.split(sep).includes('_examples');

/**
 * Files that still hold literals, and how many. This is debt, not permission.
 * Empty since cust F-7 closed; keep it that way.
 */
const ALLOWED = new Map();

/** Blanks out block and line comments, preserving line structure. */
function stripComments(src) {
  let out = '';
  let i = 0;
  let mode = 'code';
  let quote = '';
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (mode === 'code') {
      if (c === '/' && next === '*') { mode = 'block'; out += '  '; i += 2; continue; }
      if (c === '/' && next === '/') { mode = 'line'; out += '  '; i += 2; continue; }
      if (c === '"' || c === "'" || c === '`') { mode = 'str'; quote = c; }
      out += c; i++; continue;
    }
    if (mode === 'str') {
      if (c === "\\") { out += c + (next ?? ''); i += 2; continue; }
      if (c === quote) mode = 'code';
      out += c; i++; continue;
    }
    // inside a comment: keep newlines so line numbers stay true
    if (mode === 'block' && c === '*' && next === '/') { mode = 'code'; out += '  '; i += 2; continue; }
    if (mode === 'line' && c === '\n') { mode = 'code'; out += '\n'; i++; continue; }
    out += c === '\n' ? '\n' : ' ';
    i++;
  }
  return out;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith('.ts')) yield p;
  }
}

const PATTERNS = [
  // <button aria-label="Next month">
  /aria-label\s*=\s*"([A-Z][^"]*)"/g,
  // [attr.aria-label]="'Next month'"
  /\[attr\.aria-label\]\s*=\s*"\s*'([A-Z][^']*)'\s*"/g,
  // host: { 'aria-label': 'Data table toolbar' }
  /['"]aria-label['"]\s*:\s*['"]([A-Z][^'"]*)['"]/g,
  // host: { '[attr.aria-label]': '"Hue"' } — a literal inside a host binding
  // expression, which the plain-attribute pattern above cannot see.
  /\[attr\.aria-label\]['"]\s*:\s*['"][^'"]*["']([A-Z][^"']*)["']/g,
  // input<string>('Next slide', { alias: 'aria-label' })
  /input\s*(?:<[^>]*>)?\s*\(\s*['"]([A-Z][^'"]*)['"][^)]*alias\s*:\s*['"]aria-label['"]/g,
];

const found = new Map();
for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (SKIP(file)) continue;
    const rel = relative(process.cwd(), file).split(sep).join('/');
    const code = stripComments(readFileSync(file, 'utf8'));
    for (const re of PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(code))) {
        const line = code.slice(0, m.index).split('\n').length;
        if (!found.has(rel)) found.set(rel, []);
        found.get(rel).push({ line, text: m[1] });
      }
    }
  }
}

let failed = false;
for (const [file, hits] of [...found].sort()) {
  const budget = ALLOWED.get(file) ?? 0;
  if (hits.length > budget) {
    failed = true;
    console.error(
      `${file}: ${hits.length} hard-coded aria-label${hits.length === 1 ? '' : 's'}` +
        ` (allowed ${budget})`,
    );
    for (const h of hits) console.error(`  ${file}:${h.line}  aria-label="${h.text}"`);
  }
}
for (const [file, budget] of ALLOWED) {
  const actual = found.get(file)?.length ?? 0;
  if (actual < budget) {
    failed = true;
    console.error(
      `${file}: now has ${actual} literal${actual === 1 ? '' : 's'} but the debt list still ` +
        `allows ${budget}. Lower it to ${actual}${actual === 0 ? ' (or delete the entry)' : ''}.`,
    );
  }
}

if (failed) {
  console.error(
    '\nRoute the string through the i18n catalog ' +
      '(packages/core/src/i18n/catalogs/en.ts + fr.ts) and read it with ' +
      'KjTranslateService, or take it from a consumer input.',
  );
  process.exit(1);
}
console.log('check:aria-labels — no new hard-coded accessible names.');
