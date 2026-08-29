// Generates size-limit inputs from the single-source-of-truth budgets.
//
// Why a generator instead of pointing size-limit straight at the FESM file:
// esbuild only honours a package's `sideEffects: false` (and therefore
// tree-shakes) when the module is resolved by PACKAGE NAME. Pointing size-limit
// at `dist/kj-*/fesm2022/*.mjs` directly skips that and pulls the whole barrel
// (~500 kB) for every entry. So for each budget we emit a tiny entry file that
// re-exports the symbol from the package name — `export { X } from '@kouji-ui/…'`
// — which resolves through node_modules and tree-shakes correctly.
//
// Output (git-ignored): tools/size/.gen/entries/*.js + tools/size/.gen/.size-limit.json

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { budgets, IGNORE } from './budgets.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const genDir = join(here, '.gen');
const entriesDir = join(genDir, 'entries');

rmSync(genDir, { recursive: true, force: true });
mkdirSync(entriesDir, { recursive: true });

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const config = budgets.map((b) => {
  const file = `${slug(b.name)}.js`;
  writeFileSync(join(entriesDir, file), `export { ${b.symbol} } from '${b.pkg}';\n`);
  return {
    name: b.name,
    path: `entries/${file}`, // relative to the config file (.gen/)
    limit: b.limit,
    gzip: true,
    ignore: IGNORE,
  };
});

writeFileSync(join(genDir, '.size-limit.json'), `${JSON.stringify(config, null, 2)}\n`);

console.log(`Generated ${config.length} bundle-budget entries → tools/size/.gen/`);
