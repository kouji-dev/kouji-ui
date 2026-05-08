import { describe, expect, it } from 'vitest';
import { detectTokens } from '../../detectors/token.detector';
import { parseTestFile } from './test-utils';

function projectWith(src: string) {
  return parseTestFile('tokens.ts', src);
}

describe('detectTokens', () => {
  it('emits a DocItem for an @doc-tagged InjectionToken', () => {
    const sf = projectWith(`
      import { InjectionToken } from '@angular/core';
      /**
       * Registry of icons.
       * @doc
       * @doc-name icon
       */
      export const KJ_ICON_REGISTRY = new InjectionToken<Map<string, string>>('KJ_ICON_REGISTRY');
    `);
    const items = detectTokens(sf, 'core');
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('token');
    expect(items[0].symbol).toBe('KJ_ICON_REGISTRY');
    expect(items[0].token?.type).toContain('Map<string, string>');
  });

  it('skips non-@doc tokens', () => {
    const sf = projectWith(`
      import { InjectionToken } from '@angular/core';
      export const X = new InjectionToken<string>('X');
    `);
    expect(detectTokens(sf, 'core')).toEqual([]);
  });
});
