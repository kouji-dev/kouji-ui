import { describe, expect, test } from 'vitest';
import { deriveTokens } from './derive-tokens';
import { BG_SLOTS, FG_SLOTS, type DraftTheme } from './types';

/**
 * Under the 17-slot model every editable surface and foreground is explicit,
 * so `deriveTokens` no longer computes content colours — it passes the colour
 * maps through untouched and unit-stringifies shape/typography for the
 * serializer. (The earlier `deriveContent` / `deriveBaseShades` helpers
 * belonged to the abandoned `base-100`/`*-content` model.)
 */
function draft(): DraftTheme {
  return {
    name: 'test',
    bg: {
      'bg-body': '#ffffff', 'bg-surface': '#ffffff', 'bg-field': '#f6f6f4', 'bg-elevated': '#ffffff',
      'bg-primary': '#1a1a1a', 'bg-accent': '#d6a300', 'bg-info': '#1e40af',
      'bg-success': '#166534', 'bg-warning': '#d97706', 'bg-danger': '#991b1b',
    },
    fg: {
      'fg-default': '#1a1a1a',
      'fg-on-primary': '#ffffff', 'fg-on-accent': '#1a1a1a', 'fg-on-info': '#ffffff',
      'fg-on-success': '#ffffff', 'fg-on-warning': '#1a1a1a', 'fg-on-danger': '#ffffff',
    },
    shape: { radiusBox: 8, radiusField: 4, radiusSelector: 12, border: 1, depth: 2 },
    type: { fontSans: 'system-ui', fontMono: 'monospace', fontDisplay: 'system-ui' },
    typography: { bodyRem: 1, smallRem: 0.875 },
    motion: { transition: '0.2s ease' },
  };
}

describe('deriveTokens', () => {
  test('passes every editable colour slot through unchanged', () => {
    const d = draft();
    const out = deriveTokens(d);
    for (const slot of BG_SLOTS) expect(out.bg[slot]).toBe(d.bg[slot]);
    for (const slot of FG_SLOTS) expect(out.fg[slot]).toBe(d.fg[slot]);
  });

  test('stringifies shape with px and typography with rem', () => {
    const out = deriveTokens(draft());
    expect(out.shape.radiusBox).toBe('8px');
    expect(out.shape.border).toBe('1px');
    expect(out.typography.bodyRem).toBe('1rem');
    expect(out.typography.smallRem).toBe('0.875rem');
  });

  test('depth is unitless — it multiplies the theme shadow ladder', () => {
    expect(deriveTokens(draft()).shape.depth).toBe('2');
  });

  test('selector radius follows field radius (no separate editor control)', () => {
    const d = draft();
    d.shape.radiusSelector = 99; // ignored on purpose
    expect(deriveTokens(d).shape.radiusSelector).toBe(`${d.shape.radiusField}px`);
  });

  test('type and motion are handed over verbatim', () => {
    const d = draft();
    const out = deriveTokens(d);
    expect(out.type).toEqual(d.type);
    expect(out.motion).toEqual(d.motion);
  });
});
