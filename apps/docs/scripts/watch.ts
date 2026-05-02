/**
 * Dev watcher — re-runs extract-docs whenever packages/core/src files change.
 * Run alongside `ng serve docs` via the `dev` script.
 */
import { watch } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const coreSrc = resolve(__dirname, '../../../packages/core/src');
const docsDir = resolve(__dirname, '..');

console.log('[docs-watch] Watching packages/core/src for changes...');

// Run once on startup to ensure manifest is fresh
try {
  execSync('tsx scripts/extract-docs.ts', { cwd: docsDir, stdio: 'inherit' });
  console.log('[docs-watch] ✔ initial extraction done');
} catch {
  console.error('[docs-watch] ✖ initial extraction failed');
}

let debounce: ReturnType<typeof setTimeout>;

watch(coreSrc, { recursive: true }, (_, filename) => {
  if (!filename?.endsWith('.ts') || filename.includes('.spec.')) return;
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    console.log(`\n[docs-watch] ${filename} changed — re-extracting...`);
    try {
      execSync('tsx scripts/extract-docs.ts', { cwd: docsDir, stdio: 'inherit' });
      console.log('[docs-watch] ✔ manifest updated');
    } catch {
      console.error('[docs-watch] ✖ extraction failed');
    }
  }, 500);
});
