import { describe, expect, it } from 'vitest';
import { detectFunctions } from '../../detectors/function.detector';
import { parseTestFile } from './test-utils';

function projectWith(src: string) {
  return parseTestFile('a.ts', src);
}

describe('detectFunctions', () => {
  it('classifies a provider function via return type', () => {
    const sf = projectWith(`
      import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
      /**
       * Register icons.
       * @doc
       * @doc-name icon
       * @doc-order 2
       */
      export function provideIcons(map: Record<string, string>): EnvironmentProviders {
        return makeEnvironmentProviders([]);
      }
    `);
    const items = detectFunctions(sf, 'core');
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('provider-fn');
    expect(items[0].symbol).toBe('provideIcons');
    expect(items[0].order).toBe(2);
    expect(items[0].function?.parameters[0].name).toBe('map');
  });

  it('classifies an inject helper via inject() body call', () => {
    const sf = projectWith(`
      import { inject } from '@angular/core';
      /**
       * @doc
       * @doc-name icon
       */
      export function injectKjIconResolver(): (name: string) => string | null {
        const x = inject(String);
        return () => null;
      }
    `);
    const items = detectFunctions(sf, 'core');
    expect(items[0].kind).toBe('inject-fn');
    expect(items[0].symbol).toBe('injectKjIconResolver');
  });

  it('classifies a plain function', () => {
    const sf = projectWith(`
      /**
       * @doc
       * @doc-name icon
       */
      export function getIconMode(name: string): 'svg' | 'font' {
        return name.startsWith('@font.') ? 'font' : 'svg';
      }
    `);
    const items = detectFunctions(sf, 'core');
    expect(items[0].kind).toBe('function');
  });

  it('skips non-@doc functions', () => {
    const sf = projectWith(`
      export function helper() { return 1; }
    `);
    expect(detectFunctions(sf, 'core')).toEqual([]);
  });
});
