import { describe, expect, it } from 'vitest';
import { getIconMode } from './icon.mode';

describe('getIconMode', () => {
  it('returns "font" when name starts with "@font."', () => {
    expect(getIconMode('@font.fa-cog')).toBe('font');
  });

  it('returns "svg" for plain names', () => {
    expect(getIconMode('settings')).toBe('svg');
  });

  it('returns "svg" for hyphenated names', () => {
    expect(getIconMode('alert-triangle')).toBe('svg');
  });

  it('returns "svg" for namespaced names that are not @font', () => {
    expect(getIconMode('lucide:settings')).toBe('svg');
  });

  it('returns "svg" for empty string', () => {
    expect(getIconMode('')).toBe('svg');
  });

  it('returns "svg" for "@font" with no trailing dot', () => {
    // Strict: must be exactly "@font." prefix; "@fontawesome" stays svg.
    expect(getIconMode('@fontawesome')).toBe('svg');
  });
});
