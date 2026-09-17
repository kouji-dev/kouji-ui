#!/usr/bin/env node
/**
 * Bundle-size gate for the published libraries.
 *
 * Sums every FESM chunk under `dist/<pkg>/fesm2022` (raw and gzip) and fails
 * when a package exceeds its budget. Budgets sit ~10% above the sizes measured
 * when the gate was added, so a regression that lands a whole dependency in the
 * FESM (a namespace import, a static import replacing a dynamic one) trips it
 * while routine growth does not. Raise a budget deliberately, in the same PR as
 * the feature that needs it, and say why in the commit message.
 *
 * The entry FESM is also scanned for static imports of the optional heavy peers
 * (echarts, lexical, monaco). Those may only enter through `import()` — or from
 * a secondary chunk, which is itself loaded on demand.
 *
 * Usage: node scripts/check-bundle-size.mjs   (after `pnpm build`)
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));

/** Measured 2026-09-16 at @kouji-ui/core 0.8.4 / @kouji-ui/components 0.9.3 (batch 3). */
const BUDGETS = [
  {
    name: '@kouji-ui/core',
    dir: 'kj-core',
    entry: 'kouji-ui-core.mjs',
    // measured: raw 1 903 206 · gzip 410 010 (entry + engine chunk)
    // Re-baselined for the round-2 review work. The growth is deliberate new
    // code, not drift: a windowed list primitive (KjListVirtual), a shared
    // focus-trap engine behind KjFocusTrap / tabCycle / inertBased, trigger
    // ARIA forwarding (KJ_TRIGGER_CONTROL), indexed list selection and tree
    // topology, a tree-shakeable diagnostics helper, and user-visible strings
    // routed through the i18n catalog. Budgets sit ~6% above measured.
    maxRaw: 2_020_000,
    maxGzip: 435_000,
  },
  {
    name: '@kouji-ui/components',
    dir: 'kj-components',
    entry: 'kouji-ui-components.mjs',
    // measured: raw 1 731 789 · gzip 293 171
    // Raw is comfortably inside the old ceiling; only gzip moved (by ~1 kB),
    // from the round-2 table / chat / chart and preset work. ~6% headroom.
    maxRaw: 1_880_000,
    maxGzip: 311_000,
  },
];

/** Optional peers that must never be statically imported by an entry FESM. */
const HEAVY_PEERS = [
  'echarts', 'lexical', '@lexical/', 'monaco-editor', '@monaco-editor/loader',
  // Optional peers that must only ever be reached through `import()`.
  'lucide-static', '@tanstack/virtual-core',
];

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
const escapeRe = (s) => s.replace(/[/@.\-]/g, (ch) => `\\${ch}`);

let failed = false;

for (const budget of BUDGETS) {
  const dir = join(DIST, budget.dir, 'fesm2022');
  if (!existsSync(dir)) {
    console.error(`✖ ${budget.name}: ${dir} not found — run \`pnpm build\` first`);
    failed = true;
    continue;
  }

  const files = readdirSync(dir).filter((f) => f.endsWith('.mjs'));
  let raw = 0;
  let gzip = 0;
  console.log(`${budget.name}`);
  for (const file of files) {
    const bytes = readFileSync(join(dir, file));
    const gz = gzipSync(bytes, { level: 9 }).length;
    raw += bytes.length;
    gzip += gz;
    console.log(
      `  ${file.padEnd(40)} raw ${kb(bytes.length).padStart(10)}   gzip ${kb(gz).padStart(9)}`,
    );

    if (file === budget.entry) {
      const src = bytes.toString('utf8');
      for (const peer of HEAVY_PEERS) {
        const re = new RegExp(
          `^(?:import|export)[^;\\n]*from\\s*['"]${escapeRe(peer)}[^'"]*['"]`,
          'm',
        );
        const match = src.match(re);
        if (match) {
          console.error(
            `  ✖ static import of optional peer "${peer}" in ${file}: ${match[0].slice(0, 90)}…`,
          );
          failed = true;
        }
      }
    }
  }

  const rawOk = raw <= budget.maxRaw;
  const gzipOk = gzip <= budget.maxGzip;
  console.log(
    `  ${'total'.padEnd(40)} raw ${kb(raw).padStart(10)} / ${kb(budget.maxRaw)} ${rawOk ? '✓' : '✖'}` +
      `   gzip ${kb(gzip).padStart(9)} / ${kb(budget.maxGzip)} ${gzipOk ? '✓' : '✖'}`,
  );
  if (!rawOk || !gzipOk) {
    console.error(`  ✖ ${budget.name} exceeds its size budget (see scripts/check-bundle-size.mjs)`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
