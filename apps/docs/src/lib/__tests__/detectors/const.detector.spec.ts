import { describe, expect, it } from 'vitest';
import { detectConsts } from '../../detectors/const.detector';
import { parseTestFile } from './test-utils';

function projectWith(src: string) {
  return parseTestFile('a.ts', src);
}

describe('detectConsts', () => {
  it('emits a DocItem for an @doc-tagged exported const', () => {
    const sf = projectWith(`
      /**
       * Path to the prose stylesheet.
       * @doc
       * @doc-name icon
       */
      export const KJ_ICON_CSS_PATH = '@kouji-ui/core/icon/icon.css' as const;
    `);
    const items = detectConsts(sf, 'core');
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('const');
    expect(items[0].const?.literalValue).toContain('icon.css');
  });

  it('skips InjectionToken consts (those go through token detector)', () => {
    const sf = projectWith(`
      import { InjectionToken } from '@angular/core';
      /** @doc @doc-name x */
      export const X = new InjectionToken<string>('X');
    `);
    expect(detectConsts(sf, 'core')).toEqual([]);
  });

  it('skips non-@doc consts', () => {
    const sf = projectWith(`export const Y = 1;`);
    expect(detectConsts(sf, 'core')).toEqual([]);
  });
});
