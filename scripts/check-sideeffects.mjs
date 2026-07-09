// Tree-shaking / side-effect guard.
//
// Asserts every publishable package keeps a correct `sideEffects` declaration
// so bundlers may drop unused exports. A missing or loosened flag lets stray
// side-effect imports (CSS-in-JS, eager DI) pull the whole package into a
// consumer's bundle — the exact regression the bundle budgets exist to prevent.
//
// Run: `pnpm sideeffects:check` (wired into CI). Exits non-zero on violation.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// package dir -> expected `sideEffects` value.
// JS packages must be fully side-effect-free (`false`). The themes package is
// pure CSS, so it allowlists only stylesheets.
const EXPECTED = {
  'packages/core': false,
  'packages/components': false,
  'packages/themes': ['**/*.css'],
};

const errors = [];

for (const [dir, expected] of Object.entries(EXPECTED)) {
  const pkgPath = join(root, dir, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    errors.push(`${dir}: cannot read package.json`);
    continue;
  }

  const actual = pkg.sideEffects;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    errors.push(
      `${pkg.name} (${dir}): sideEffects must be ${JSON.stringify(
        expected,
      )} but is ${JSON.stringify(actual)}`,
    );
  } else {
    console.log(`  ok  ${pkg.name}: sideEffects = ${JSON.stringify(actual)}`);
  }
}

if (errors.length) {
  console.error('\n✖ sideEffects guard failed:');
  for (const e of errors) console.error(`   - ${e}`);
  console.error(
    '\nFix the package.json `sideEffects` field. This protects tree-shaking.\n',
  );
  process.exit(1);
}

console.log('\n✓ sideEffects guard passed — all packages tree-shakeable.');
