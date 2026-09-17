import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { KJ_COMPONENTS_VERSION } from './version';

/**
 * `KJ_COMPONENTS_VERSION` is generated from `package.json` by
 * `scripts/sync-version.mjs` (before every build and after every
 * `changeset version`). It used to be a hand-written literal that sat at
 * `0.0.1` while the package shipped `0.9.x`.
 */
describe('KJ_COMPONENTS_VERSION', () => {
  const pkg = JSON.parse(
    readFileSync(resolve(import.meta.dirname, '..', 'package.json'), 'utf-8'),
  ) as { version: string };

  it('equals the version in package.json', () => {
    expect(KJ_COMPONENTS_VERSION).toBe(pkg.version);
  });

  it('is a semver string, not a placeholder', () => {
    expect(KJ_COMPONENTS_VERSION).toMatch(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/);
    expect(KJ_COMPONENTS_VERSION).not.toBe('0.0.1');
  });

  it('is what the public API re-exports', () => {
    // Textual on purpose: importing the barrel would compile every component
    // for a one-line assertion.
    const barrel = readFileSync(resolve(import.meta.dirname, 'public-api.ts'), 'utf-8');
    expect(barrel).toMatch(/export \{ KJ_COMPONENTS_VERSION \} from '\.\/version';/);
    expect(barrel).not.toMatch(/KJ_COMPONENTS_VERSION\s*=/);
  });
});
