import { describe, expect, it } from 'vitest';
import { detectDirectives } from '../../detectors/directive.detector';
import { parseTestFile } from './test-utils';

function projectWith(src: string) {
  return parseTestFile('icon.directive.ts', src);
}

describe('detectDirectives', () => {
  it('skips non-@doc-tagged classes', () => {
    const sf = projectWith(`
      import { Directive } from '@angular/core';
      /** Plain. */
      @Directive({ selector: '[x]', standalone: true })
      export class XDir {}
    `);
    expect(detectDirectives(sf, 'core')).toEqual([]);
  });

  it('emits a DocItem for an @doc-tagged directive', () => {
    const sf = projectWith(`
      import { Directive } from '@angular/core';
      /**
       * The icon directive.
       * @doc
       * @doc-name icon
       * @doc-is-main
       * @category Core/Layout/Icon
       */
      @Directive({ selector: '[kjIcon]', standalone: true })
      export class KjIconDirective {}
    `);
    const items = detectDirectives(sf, 'core');
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('directive');
    expect(items[0].symbol).toBe('KjIconDirective');
    expect(items[0].pageName).toBe('icon');
    expect(items[0].isMain).toBe(true);
    expect(items[0].directive?.selector).toBe('[kjIcon]');
    expect(items[0].categoryPath).toEqual(['Core', 'Layout', 'Icon']);
  });

  it('respects @internal even if @doc is present', () => {
    const sf = projectWith(`
      import { Directive } from '@angular/core';
      /**
       * @doc
       * @doc-name x
       * @internal
       */
      @Directive({ selector: '[y]', standalone: true })
      export class YDir {}
    `);
    expect(detectDirectives(sf, 'core')).toEqual([]);
  });
});
