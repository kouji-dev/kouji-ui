#!/usr/bin/env node
// Generates packages/components/src/icon/lucide/icon-names.generated.ts from
// the currently-installed `lucide-static/icon-nodes.json`. Run after a
// lucide-static version bump:
//
//   node scripts/generate-lucide-icon-names.mjs
//
// We emit the list as a static TS const instead of importing the JSON at
// runtime — SSR / Vite ESM module resolution refuses to resolve a JSON path
// inside a workspace dependency at request time.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jsonPath = require.resolve('lucide-static/icon-nodes.json');
const json = JSON.parse(readFileSync(jsonPath, 'utf-8'));
const names = Object.keys(json).sort((a, b) => a.localeCompare(b));

const out = [
  '// Generated from lucide-static/icon-nodes.json. Do not edit by hand.',
  '// Re-generate via scripts/generate-lucide-icon-names.mjs.',
  '',
  'export const LUCIDE_ICON_NAMES_RAW: readonly string[] = [',
  ...names.map((n) => `  '${n}',`),
  '] as const;',
  '',
].join('\n');

writeFileSync('packages/components/src/icon/lucide/icon-names.generated.ts', out);
console.log(`wrote ${names.length} icon names`);
