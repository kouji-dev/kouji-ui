import { wcagContrast } from 'culori';
import { describe, expect, test } from 'vitest';
import {
  deriveFromSeed,
  randomAccessiblePalette,
  randomMotionTransition,
  randomShapeSnapshot,
  type DerivedPalette,
} from './palette-derive';
import { pickInspiringSeedHex, SEED_SWATCHES } from './seed-swatches';
import { BG_SLOTS, FG_SLOTS, INTENTS, BG_FOR_INTENT, FG_ON_FOR_INTENT } from './types';

/** Class A (`fg-default` on the neutral surfaces) + Class B (on-intent) pairs. */
function textPairs(p: DerivedPalette): [string, string, string][] {
  return [
    ...(['bg-body', 'bg-surface', 'bg-field', 'bg-elevated'] as const).map(
      (bg) => [`fg-default/${bg}`, p.fg['fg-default'], p.bg[bg]] as [string, string, string],
    ),
    ...INTENTS.map(
      (i) =>
        [`${FG_ON_FOR_INTENT[i]}/${BG_FOR_INTENT[i]}`, p.fg[FG_ON_FOR_INTENT[i]], p.bg[BG_FOR_INTENT[i]]] as [
          string,
          string,
          string,
        ],
    ),
  ];
}

describe('deriveFromSeed', () => {
  test('returns the full 17-slot palette', () => {
    const out = deriveFromSeed('#3366cc', { mode: 'light' });
    expect(Object.keys(out.bg).sort()).toEqual([...BG_SLOTS].sort());
    expect(Object.keys(out.fg).sort()).toEqual([...FG_SLOTS].sort());
  });

  test('bg-primary is the seed', () => {
    expect(deriveFromSeed('#3366cc', { mode: 'light' }).bg['bg-primary'].toLowerCase()).toBe('#3366cc');
  });

  test('light mode produces a near-white body and dark ink', () => {
    const out = deriveFromSeed('#3366cc', { mode: 'light' });
    expect(out.bg['bg-body']).toMatch(/^#[ef]/i);
    expect(out.fg['fg-default']).toMatch(/^#[0-2]/i);
  });

  test('dark mode produces a near-black body and light ink', () => {
    const out = deriveFromSeed('#3366cc', { mode: 'dark' });
    expect(out.bg['bg-body']).toMatch(/^#[0-2]/i);
    expect(out.fg['fg-default']).toMatch(/^#[ef]/i);
  });

  test('triadic harmony shifts the accent off the seed', () => {
    const out = deriveFromSeed('#3366cc', { mode: 'light', harmony: 'triadic' });
    expect(out.bg['bg-accent'].toLowerCase()).not.toBe('#3366cc');
  });

  test('every derived slot is a valid hex', () => {
    const out = deriveFromSeed('#3366cc', { mode: 'light' });
    for (const v of [...Object.values(out.bg), ...Object.values(out.fg)]) {
      expect(v).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test.each(['light', 'dark'] as const)(
    '%s mode clears AA 4.5:1 on every Class A and Class B pair, by construction',
    (mode) => {
      // The derivation picks each foreground by the surface's OKLCH lightness,
      // so this is the documented guarantee, not a property of one seed.
      for (const { hex } of SEED_SWATCHES) {
        const p = deriveFromSeed(hex, { mode });
        const failing = textPairs(p)
          .filter(([, fg, bg]) => wcagContrast(fg, bg) < 4.5)
          .map(([id, fg, bg]) => `${hex} ${id}: ${wcagContrast(fg, bg).toFixed(2)}:1 (${fg} on ${bg})`);
        expect(failing).toEqual([]);
      }
    },
  );

  test('is deterministic', () => {
    expect(deriveFromSeed('#3366cc', { mode: 'light' })).toEqual(deriveFromSeed('#3366cc', { mode: 'light' }));
  });
});

describe('randomAccessiblePalette', () => {
  test('returns a full 17-slot palette', () => {
    const out = randomAccessiblePalette({ random: () => 0.5 });
    expect(Object.keys(out.bg)).toHaveLength(BG_SLOTS.length);
    expect(Object.keys(out.fg)).toHaveLength(FG_SLOTS.length);
  });

  test('is deterministic given a fixed RNG', () => {
    expect(randomAccessiblePalette({ random: () => 0.3 })).toEqual(randomAccessiblePalette({ random: () => 0.3 }));
  });

  test('uses a curated swatch as bg-primary', () => {
    const out = randomAccessiblePalette({ random: () => 0 });
    expect(SEED_SWATCHES.map((s) => s.hex.toLowerCase())).toContain(out.bg['bg-primary'].toLowerCase());
  });

  test('default RNG works (smoke)', () => {
    const out = randomAccessiblePalette();
    expect(Object.keys(out.bg)).toHaveLength(BG_SLOTS.length);
    expect(out.bg['bg-primary']).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('pickInspiringSeedHex', () => {
  test('returns a hex from the curated list', () => {
    expect(SEED_SWATCHES.map((s) => s.hex.toLowerCase())).toContain(pickInspiringSeedHex(() => 0).toLowerCase());
  });

  test('deterministic when RNG is fixed', () => {
    expect(pickInspiringSeedHex(() => 0.42)).toBe(pickInspiringSeedHex(() => 0.42));
  });
});

describe('randomShapeSnapshot', () => {
  test('returns shape keys within the allowed preset tiers', () => {
    const s = randomShapeSnapshot(() => 0.5);
    expect([0, 4, 8, 16, 24]).toContain(s.radiusBox);
    expect([0, 4, 8, 16, 24]).toContain(s.radiusField);
    expect(s.radiusSelector).toBe(s.radiusField);
    expect([0, 1, 2, 4]).toContain(s.border);
    expect([0, 1, 2]).toContain(s.depth);
  });

  test('deterministic RNG', () => {
    expect(randomShapeSnapshot(() => 0.2)).toEqual(randomShapeSnapshot(() => 0.2));
    expect(randomMotionTransition(() => 0.2)).toEqual(randomMotionTransition(() => 0.2));
  });
});
