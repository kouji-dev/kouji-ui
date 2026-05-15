import { describe, it, expect } from 'vitest';
import {
  THEMES, PAGES, OUTPUT_DIR,
  validateThemeFilter, validatePageFilter,
} from './config.js';

describe('config', () => {
  it('lists every shipped theme', () => {
    expect(THEMES).toEqual([
      'kouji', 'dark', 'light', 'retro', 'cyberpunk', 'corporate',
      'sakura', 'bauhaus', 'dune', 'mint',
      'forest', 'nord', 'terminal',
    ]);
  });

  it('lists six pages each with path and slug', () => {
    expect(PAGES).toHaveLength(6);
    for (const p of PAGES) {
      expect(p.path.startsWith('/')).toBe(true);
      expect(p.slug).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('output dir is reports/a11y relative to repo root', () => {
    expect(OUTPUT_DIR).toMatch(/reports[\\/]a11y$/);
  });

  describe('validateThemeFilter', () => {
    it('returns full list when filter is undefined', () => {
      expect(validateThemeFilter(undefined)).toEqual(THEMES);
    });

    it('returns single theme when valid', () => {
      expect(validateThemeFilter('kouji')).toEqual(['kouji']);
    });

    it('throws with valid list when invalid', () => {
      expect(() => validateThemeFilter('does-not-exist')).toThrow(/Valid themes: kouji, dark/);
    });
  });

  describe('validatePageFilter', () => {
    it('returns full list when filter is undefined', () => {
      expect(validatePageFilter(undefined)).toEqual(PAGES);
    });

    it('returns single page when valid path matches', () => {
      expect(validatePageFilter('/docs/button')).toHaveLength(1);
      expect(validatePageFilter('/docs/button')[0].path).toBe('/docs/button');
    });

    it('throws with valid list when invalid', () => {
      expect(() => validatePageFilter('/nope')).toThrow(/Valid pages:/);
    });
  });
});
