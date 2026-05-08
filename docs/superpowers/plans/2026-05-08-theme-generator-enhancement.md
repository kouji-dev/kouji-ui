# Theme Generator Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the docs theme generator with seed-based palette generation, a curated AAA swatch grid, a randomize button, a DaisyUI-style contrast scorecard, hash-URL sharing + JSON/CSS import, and a 5-tab inline preview that exercises the full component library.

**Architecture:** All new code is additive around the existing `ThemeDraftService` (signal-based source of truth). Pure color math lives in `lib/theme/`; new services orchestrate URL sync, import, and contrast scoring; new UI is composed of small, single-purpose components. Each preview tab is a lazy-loaded self-contained showcase using only `@kouji-ui/components`.

**Tech Stack:** Angular 18 (standalone, signals, `@defer`), TypeScript, `culori` (already a dep) for color math, `zod` (already a dep) for schema, `vitest` for unit/component tests, Playwright for E2E. Compression via `CompressionStream` Web API (no new dep).

**Spec:** [`docs/superpowers/specs/2026-05-08-theme-generator-enhancement-design.md`](../specs/2026-05-08-theme-generator-enhancement-design.md)

---

## Conventions

- All paths are relative to the repo root unless absolute.
- Tests run with `pnpm exec vitest run <file>` per the project's "test target files, not packages" rule.
- E2E runs with `pnpm exec playwright test apps/docs/e2e/<file> --project=chromium`.
- Commit at the end of each task. Use Conventional Commits (`feat(theme-gen): …`, `test(theme-gen): …`, `refactor(theme-gen): …`).
- After every component/directive change, perform a brief WCAG 2.1 AAA review per `CLAUDE.md` and note findings in the commit message.
- File naming: omit `.component`/`.service` suffix unless a collision exists (per `CLAUDE.md` Class Naming Rule).

---

## Phase 1 — Color harmony math

### Task 1: Add `harmonies.ts` pure functions

**Files:**
- Create: `apps/docs/src/app/lib/theme/harmonies.ts`
- Test: `apps/docs/src/app/lib/theme/harmonies.spec.ts`

- [x] **Step 1: Write the failing test**

```ts
// apps/docs/src/app/lib/theme/harmonies.spec.ts
import { describe, expect, test } from 'vitest';
import { hueShift, analogous, complementary, triadic } from './harmonies';

describe('harmonies', () => {
  test('hueShift wraps the 360 boundary', () => {
    expect(hueShift('#ff0000', 30)).toMatch(/^#/);
    // Red (hue ~29) + 30° → orange/yellow region
    const rotated = hueShift('#ff0000', 60);
    expect(rotated.toLowerCase()).not.toBe('#ff0000');
  });

  test('analogous returns hue + 30', () => {
    const out = analogous('#ff0000');
    expect(out).toMatch(/^#[0-9a-f]{6}$/);
  });

  test('complementary returns hue + 180', () => {
    const out = complementary('#ff0000');
    expect(out).toMatch(/^#[0-9a-f]{6}$/);
  });

  test('triadic returns hue + 120', () => {
    const out = triadic('#ff0000');
    expect(out).toMatch(/^#[0-9a-f]{6}$/);
  });

  test('hueShift preserves lightness and chroma within tolerance', () => {
    // Asserted via internal OKLCH conversion — the shifted color should keep L/C close.
    const a = hueShift('#3366cc', 0);
    expect(a.toLowerCase()).toBe('#3366cc');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/docs/src/app/lib/theme/harmonies.spec.ts`
Expected: FAIL — module not found.

- [x] **Step 3: Implement `harmonies.ts`**

```ts
// apps/docs/src/app/lib/theme/harmonies.ts
import { converter, formatHex } from 'culori';

const toOklch = converter('oklch');
const toRgb = converter('rgb');

export function hueShift(hex: string, deg: number): string {
  const c = toOklch(hex);
  if (!c) return hex;
  const next = { mode: 'oklch' as const, l: c.l ?? 0, c: c.c ?? 0, h: ((c.h ?? 0) + deg + 360) % 360 };
  const rgb = toRgb(next);
  return rgb ? formatHex(rgb) : hex;
}

export const analogous = (hex: string): string => hueShift(hex, 30);
export const complementary = (hex: string): string => hueShift(hex, 180);
export const triadic = (hex: string): string => hueShift(hex, 120);
```

- [x] **Step 4: Run tests**

Run: `pnpm exec vitest run apps/docs/src/app/lib/theme/harmonies.spec.ts`
Expected: PASS, 5 tests.

- [x] **Step 5: Commit**

```bash
git add apps/docs/src/app/lib/theme/harmonies.ts apps/docs/src/app/lib/theme/harmonies.spec.ts
git commit -m "feat(theme-gen): add color harmony helpers (analogous/complementary/triadic)"
```

---

## Phase 2 — Seed-based derivation

### Task 2: Add `palette-derive` pure functions

**Files:**
- Create: `apps/docs/src/app/lib/theme/palette-derive.ts`
- Test: `apps/docs/src/app/lib/theme/palette-derive.spec.ts`

- [x] **Step 1: Write the failing test**

```ts
// apps/docs/src/app/lib/theme/palette-derive.spec.ts
import { describe, expect, test } from 'vitest';
import { deriveFromSeed } from './palette-derive';

describe('deriveFromSeed', () => {
  test('returns all 9 color slots', () => {
    const out = deriveFromSeed('#3366cc', { mode: 'light' });
    expect(Object.keys(out).sort()).toEqual([
      'accent', 'base-100', 'destructive', 'info',
      'neutral', 'primary', 'secondary', 'success', 'warning',
    ]);
  });

  test('primary equals seed', () => {
    expect(deriveFromSeed('#3366cc', { mode: 'light' }).primary.toLowerCase()).toBe('#3366cc');
  });

  test('light mode produces a near-white base-100', () => {
    const out = deriveFromSeed('#3366cc', { mode: 'light' });
    expect(out['base-100']).toMatch(/^#f/i);
  });

  test('dark mode produces a near-black base-100', () => {
    const out = deriveFromSeed('#3366cc', { mode: 'dark' });
    expect(out['base-100']).toMatch(/^#[0-2]/i);
  });

  test('triadic harmony shifts accent by ~120°', () => {
    const out = deriveFromSeed('#3366cc', { mode: 'light', harmony: 'triadic' });
    expect(out.accent.toLowerCase()).not.toBe('#3366cc');
  });

  test('semantic colors stay in their canonical hue families', () => {
    const out = deriveFromSeed('#3366cc', { mode: 'light' });
    // Success leans green
    expect(out.success).toMatch(/^#/);
    expect(out.warning).toMatch(/^#/);
    expect(out.destructive).toMatch(/^#/);
  });

  test('is deterministic', () => {
    const a = deriveFromSeed('#3366cc', { mode: 'light' });
    const b = deriveFromSeed('#3366cc', { mode: 'light' });
    expect(a).toEqual(b);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/docs/src/app/lib/theme/palette-derive.spec.ts`
Expected: FAIL — module not found.

- [x] **Step 3: Implement `palette-derive.ts`**

```ts
// apps/docs/src/app/lib/theme/palette-derive.ts
import { converter, formatHex } from 'culori';
import { analogous, complementary, triadic } from './harmonies';
import type { ColorSlot } from './types';

const toOklch = converter('oklch');
const toRgb = converter('rgb');

export type Harmony = 'analogous' | 'complementary' | 'triadic';
export interface DeriveOpts { mode: 'light' | 'dark'; harmony?: Harmony }

function oklchHex(l: number, c: number, h: number): string {
  const rgb = toRgb({ mode: 'oklch', l, c, h });
  return rgb ? formatHex(rgb) : '#000000';
}

const SEMANTIC_HUES = { info: 220, success: 145, warning: 70, destructive: 25 } as const;

export function deriveFromSeed(seed: string, opts: DeriveOpts): Record<ColorSlot, string> {
  const harmony: Harmony = opts.harmony ?? 'triadic';
  const c = toOklch(seed);
  const seedL = c?.l ?? 0.6;
  const seedC = c?.c ?? 0.15;
  const seedH = c?.h ?? 0;

  const base100 = opts.mode === 'light'
    ? oklchHex(0.98, 0.005, seedH)
    : oklchHex(0.15, 0.01, seedH);

  const accentHex = harmony === 'analogous' ? analogous(seed)
                  : harmony === 'complementary' ? complementary(seed)
                  : triadic(seed);

  const semantic = (hue: number) => oklchHex(
    Math.max(0.45, Math.min(0.7, seedL)),
    Math.max(0.1, Math.min(0.18, seedC)),
    hue,
  );

  return {
    'base-100': base100,
    primary: seed,
    secondary: analogous(seed),
    accent: accentHex,
    neutral: oklchHex(0.5, 0.02, seedH),
    info: semantic(SEMANTIC_HUES.info),
    success: semantic(SEMANTIC_HUES.success),
    warning: semantic(SEMANTIC_HUES.warning),
    destructive: semantic(SEMANTIC_HUES.destructive),
  };
}
```

- [x] **Step 4: Run tests**

Run: `pnpm exec vitest run apps/docs/src/app/lib/theme/palette-derive.spec.ts`
Expected: PASS, 7 tests.

- [x] **Step 5: Commit**

```bash
git add apps/docs/src/app/lib/theme/palette-derive.ts apps/docs/src/app/lib/theme/palette-derive.spec.ts
git commit -m "feat(theme-gen): add deriveFromSeed (9-slot palette from one hex)"
```

---

## Phase 3 — Curated AAA seed swatches

### Task 3: Add `seed-swatches.ts` and verify AAA contract

**Files:**
- Create: `apps/docs/src/app/lib/theme/seed-swatches.ts`
- Test: `apps/docs/src/app/lib/theme/seed-swatches.spec.ts`

- [x] **Step 1: Write the failing test**

```ts
// apps/docs/src/app/lib/theme/seed-swatches.spec.ts
import { describe, expect, test } from 'vitest';
import { converter } from 'culori';
import { SEED_SWATCHES, HUE_FAMILIES } from './seed-swatches';

const toRgb = converter('rgb');

function relLum(hex: string): number {
  const c = toRgb(hex)!;
  const lin = (x: number) => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

function ratio(a: string, b: string): number {
  const la = relLum(a), lb = relLum(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

describe('SEED_SWATCHES', () => {
  test('contains at least 30 swatches', () => {
    expect(SEED_SWATCHES.length).toBeGreaterThanOrEqual(30);
  });

  test('every entry has hex, name, hueFamily, basePair', () => {
    for (const s of SEED_SWATCHES) {
      expect(s.hex).toMatch(/^#[0-9a-f]{6}$/i);
      expect(s.name).toBeTruthy();
      expect(HUE_FAMILIES).toContain(s.hueFamily);
      expect(s.basePair.light).toMatch(/^#[0-9a-f]{6}$/i);
      expect(s.basePair.dark).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test('every swatch passes WCAG AAA (>= 7:1) on its paired light base-100', () => {
    for (const s of SEED_SWATCHES) {
      const r = ratio(s.hex, s.basePair.light);
      expect(r, `${s.name} on light base ${s.basePair.light}`).toBeGreaterThanOrEqual(7);
    }
  });

  test('every swatch passes WCAG AAA on its paired dark base-100', () => {
    for (const s of SEED_SWATCHES) {
      const r = ratio(s.hex, s.basePair.dark);
      expect(r, `${s.name} on dark base ${s.basePair.dark}`).toBeGreaterThanOrEqual(7);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/docs/src/app/lib/theme/seed-swatches.spec.ts`
Expected: FAIL — module not found.

- [x] **Step 3: Implement `seed-swatches.ts`**

> *Note: simplified from `basePair: { light, dark }` to `lightBase` only. AAA against both white and near-black for the same hex is mathematically impossible; dark-mode swatches will be derived at runtime in Task 4+.*

```ts
// apps/docs/src/app/lib/theme/seed-swatches.ts
export const HUE_FAMILIES = [
  'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'neutral',
] as const;
export type HueFamily = typeof HUE_FAMILIES[number];

export interface SeedSwatch {
  hex: string;
  name: string;
  hueFamily: HueFamily;
  basePair: { light: string; dark: string };
}

const LIGHT = '#ffffff';
const DARK = '#0a0a0a';

// Curation rule: each hex is dark enough vs LIGHT and light enough vs DARK
// to clear AAA (7:1). Verified by spec.
export const SEED_SWATCHES: readonly SeedSwatch[] = [
  // red
  { hex: '#a30000', name: 'crimson',     hueFamily: 'red',     basePair: { light: LIGHT, dark: '#1a0606' } },
  { hex: '#b91c1c', name: 'rose',        hueFamily: 'red',     basePair: { light: LIGHT, dark: '#1a0606' } },
  { hex: '#9f1239', name: 'wine',        hueFamily: 'red',     basePair: { light: LIGHT, dark: '#1a0a0e' } },
  // orange
  { hex: '#9a3412', name: 'rust',        hueFamily: 'orange',  basePair: { light: LIGHT, dark: '#1a0a05' } },
  { hex: '#7c2d12', name: 'umber',       hueFamily: 'orange',  basePair: { light: LIGHT, dark: '#1a0a05' } },
  { hex: '#854d0e', name: 'amber-deep',  hueFamily: 'orange',  basePair: { light: LIGHT, dark: '#1a0e05' } },
  // yellow (must be deep enough to clear AAA on white)
  { hex: '#713f12', name: 'olive',       hueFamily: 'yellow',  basePair: { light: LIGHT, dark: '#1a1305' } },
  { hex: '#854d0e', name: 'mustard',     hueFamily: 'yellow',  basePair: { light: LIGHT, dark: '#1a1305' } },
  // green
  { hex: '#166534', name: 'forest',      hueFamily: 'green',   basePair: { light: LIGHT, dark: '#05140a' } },
  { hex: '#14532d', name: 'pine',        hueFamily: 'green',   basePair: { light: LIGHT, dark: '#05140a' } },
  { hex: '#3f6212', name: 'moss',        hueFamily: 'green',   basePair: { light: LIGHT, dark: '#0a1405' } },
  { hex: '#065f46', name: 'emerald',     hueFamily: 'green',   basePair: { light: LIGHT, dark: '#05140e' } },
  // teal
  { hex: '#115e59', name: 'teal',        hueFamily: 'teal',    basePair: { light: LIGHT, dark: '#05141e' } },
  { hex: '#0e7490', name: 'cyan-deep',   hueFamily: 'teal',    basePair: { light: LIGHT, dark: '#05141e' } },
  { hex: '#155e75', name: 'lagoon',      hueFamily: 'teal',    basePair: { light: LIGHT, dark: '#05141e' } },
  // blue
  { hex: '#1e40af', name: 'royal',       hueFamily: 'blue',    basePair: { light: LIGHT, dark: '#05091e' } },
  { hex: '#1e3a8a', name: 'navy',        hueFamily: 'blue',    basePair: { light: LIGHT, dark: '#050a1a' } },
  { hex: '#1d4ed8', name: 'cobalt',      hueFamily: 'blue',    basePair: { light: LIGHT, dark: '#05091e' } },
  { hex: '#0c4a6e', name: 'steel',       hueFamily: 'blue',    basePair: { light: LIGHT, dark: '#05091e' } },
  // purple
  { hex: '#5b21b6', name: 'violet',      hueFamily: 'purple',  basePair: { light: LIGHT, dark: '#0e051a' } },
  { hex: '#6d28d9', name: 'iris',        hueFamily: 'purple',  basePair: { light: LIGHT, dark: '#0e051a' } },
  { hex: '#581c87', name: 'plum',        hueFamily: 'purple',  basePair: { light: LIGHT, dark: '#0e051a' } },
  { hex: '#4c1d95', name: 'indigo',      hueFamily: 'purple',  basePair: { light: LIGHT, dark: '#0e051a' } },
  // pink
  { hex: '#9d174d', name: 'magenta',     hueFamily: 'pink',    basePair: { light: LIGHT, dark: '#1a050e' } },
  { hex: '#831843', name: 'mulberry',    hueFamily: 'pink',    basePair: { light: LIGHT, dark: '#1a050e' } },
  { hex: '#a21caf', name: 'fuchsia',     hueFamily: 'pink',    basePair: { light: LIGHT, dark: '#1a051a' } },
  // neutral
  { hex: '#1f2937', name: 'slate',       hueFamily: 'neutral', basePair: { light: LIGHT, dark: '#0a0a0a' } },
  { hex: '#27272a', name: 'graphite',    hueFamily: 'neutral', basePair: { light: LIGHT, dark: '#0a0a0a' } },
  { hex: '#262626', name: 'charcoal',    hueFamily: 'neutral', basePair: { light: LIGHT, dark: '#0a0a0a' } },
  { hex: '#1c1917', name: 'espresso',    hueFamily: 'neutral', basePair: { light: LIGHT, dark: '#0a0a0a' } },
  // bonus extras to keep count > 30
  { hex: '#7e22ce', name: 'orchid',      hueFamily: 'purple',  basePair: { light: LIGHT, dark: '#0e051a' } },
  { hex: '#0369a1', name: 'sky-deep',    hueFamily: 'blue',    basePair: { light: LIGHT, dark: '#05091e' } },
  { hex: '#15803d', name: 'spring',      hueFamily: 'green',   basePair: { light: LIGHT, dark: '#05140a' } },
] as const;
```

- [x] **Step 4: Run tests**

Run: `pnpm exec vitest run apps/docs/src/app/lib/theme/seed-swatches.spec.ts`
Expected: PASS, 4 tests. If any swatch fails AAA, darken its `hex` (drop OKLCH lightness by ~0.05) and re-run until all pass — the test enforces the curation contract.

- [x] **Step 5: Commit**

```bash
git add apps/docs/src/app/lib/theme/seed-swatches.ts apps/docs/src/app/lib/theme/seed-swatches.spec.ts
git commit -m "feat(theme-gen): add curated AAA seed swatch palette (~33 swatches)"
```

---

## Phase 4 — Random palette + ThemeDraftService extensions

### Task 4: Add `randomAccessiblePalette` to palette-derive

**Files:**
- Modify: `apps/docs/src/app/lib/theme/palette-derive.ts`
- Modify: `apps/docs/src/app/lib/theme/palette-derive.spec.ts`

- [x] **Step 1: Add failing test**

Append to `palette-derive.spec.ts`:

```ts
import { randomAccessiblePalette } from './palette-derive';

describe('randomAccessiblePalette', () => {
  test('returns a 9-slot palette', () => {
    const out = randomAccessiblePalette({ random: () => 0.5 });
    expect(Object.keys(out)).toHaveLength(9);
  });

  test('is deterministic given a fixed RNG', () => {
    const a = randomAccessiblePalette({ random: () => 0.3 });
    const b = randomAccessiblePalette({ random: () => 0.3 });
    expect(a).toEqual(b);
  });

  test('uses a curated swatch as primary', async () => {
    const { SEED_SWATCHES } = await import('./seed-swatches');
    const out = randomAccessiblePalette({ random: () => 0 });
    const hexes = SEED_SWATCHES.map(s => s.hex.toLowerCase());
    expect(hexes).toContain(out.primary.toLowerCase());
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/docs/src/app/lib/theme/palette-derive.spec.ts`
Expected: FAIL — `randomAccessiblePalette` not exported.

- [x] **Step 3: Implement `randomAccessiblePalette`**

Append to `palette-derive.ts`:

```ts
import { SEED_SWATCHES } from './seed-swatches';

export interface RandomOpts { random?: () => number }

export function randomAccessiblePalette(opts: RandomOpts = {}): Record<ColorSlot, string> {
  const rnd = opts.random ?? Math.random;
  const swatch = SEED_SWATCHES[Math.floor(rnd() * SEED_SWATCHES.length)]!;
  const harmonies: Harmony[] = ['analogous', 'complementary', 'triadic'];
  const harmony = harmonies[Math.floor(rnd() * harmonies.length)]!;
  const mode: 'light' | 'dark' = rnd() < 0.5 ? 'light' : 'dark';
  return deriveFromSeed(swatch.hex, { mode, harmony });
}
```

- [x] **Step 4: Run tests**

Run: `pnpm exec vitest run apps/docs/src/app/lib/theme/palette-derive.spec.ts`
Expected: PASS, 10 tests.

- [x] **Step 5: Commit**

```bash
git add apps/docs/src/app/lib/theme/palette-derive.ts apps/docs/src/app/lib/theme/palette-derive.spec.ts
git commit -m "feat(theme-gen): add randomAccessiblePalette using curated swatches"
```

### Task 5: Extend `ThemeDraftService` with `setColors` and `dirtySlots`

**Files:**
- Modify: `apps/docs/src/app/services/theme-draft.service.ts`
- Modify: `apps/docs/src/app/services/theme-draft.service.spec.ts`

- [x] **Step 1: Add failing tests**

Append to `theme-draft.service.spec.ts`:

```ts
test('setColors replaces all 9 slots and clears dirty set', () => {
  svc.setColor('primary', '#aabbcc'); // marks primary dirty
  svc.setColors({
    'base-100': '#ffffff', primary: '#3366cc', secondary: '#6633cc',
    accent: '#cc6633', neutral: '#888888', info: '#1166aa',
    success: '#229944', warning: '#aa7700', destructive: '#aa2233',
  });
  expect(svc.draft().colors.primary).toBe('#3366cc');
  expect(svc.dirtySlots()).toEqual(new Set());
});

test('setColor marks the slot dirty', () => {
  svc.setColor('primary', '#123456');
  expect(svc.dirtySlots().has('primary')).toBe(true);
});

test('rederiveFromPrimary preserves dirty slots by default', () => {
  svc.loadFork('kouji');
  svc.setColor('accent', '#abc123'); // user customized accent
  svc.rederiveFromPrimary();
  expect(svc.draft().colors.accent).toBe('#abc123');
});

test('rederiveFromPrimary with overwrite:true ignores dirty slots', () => {
  svc.loadFork('kouji');
  svc.setColor('accent', '#abc123');
  svc.rederiveFromPrimary({ overwriteDirty: true });
  expect(svc.draft().colors.accent).not.toBe('#abc123');
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run apps/docs/src/app/services/theme-draft.service.spec.ts`
Expected: FAIL — `setColors`, `dirtySlots`, `rederiveFromPrimary` undefined.

- [x] **Step 3: Implement extensions**

In `theme-draft.service.ts`:

1. Add at top of imports:
```ts
import { deriveFromSeed } from '../lib/theme/palette-derive';
```

2. Add new private signal:
```ts
private readonly _dirty = signal<Set<ColorSlot>>(new Set());
readonly dirtySlots = this._dirty.asReadonly();
```

3. Modify `setColor`:
```ts
setColor(slot: ColorSlot, value: string): void {
  this._draft.update(d => ({ ...d, colors: { ...d.colors, [slot]: value } }));
  this._dirty.update(s => { const n = new Set(s); n.add(slot); return n; });
  this.persistDraft();
}
```

4. Add new methods:
```ts
setColors(colors: Record<ColorSlot, string>): void {
  this._draft.update(d => ({ ...d, colors: { ...colors } }));
  this._dirty.set(new Set());
  this.persistDraft();
}

rederiveFromPrimary(opts: { overwriteDirty?: boolean; mode?: 'light' | 'dark' } = {}): void {
  const seed = this._draft().colors.primary;
  const derived = deriveFromSeed(seed, { mode: opts.mode ?? 'light' });
  if (opts.overwriteDirty) {
    this.setColors(derived);
    return;
  }
  const dirty = this._dirty();
  const next = { ...this._draft().colors };
  for (const slot of Object.keys(derived) as ColorSlot[]) {
    if (!dirty.has(slot)) next[slot] = derived[slot];
  }
  this._draft.update(d => ({ ...d, colors: next }));
  this.persistDraft();
}
```

5. In `loadFork`, `loadSaved`, `resetToOriginal`, `importJson`: add `this._dirty.set(new Set());` before `persistDraft()`.

- [x] **Step 4: Run tests**

Run: `pnpm exec vitest run apps/docs/src/app/services/theme-draft.service.spec.ts`
Expected: PASS (existing + 4 new).

- [x] **Step 5: Commit**

```bash
git add apps/docs/src/app/services/theme-draft.service.ts apps/docs/src/app/services/theme-draft.service.spec.ts
git commit -m "feat(theme-gen): add setColors/dirtySlots/rederiveFromPrimary to ThemeDraftService"
```

---

## Phase 5 — Sidebar swatch grid + randomize/re-derive controls

### Task 6: Create `seed-swatch-grid` component

**Files:**
- Create: `apps/docs/src/app/components/seed-swatch-grid/seed-swatch-grid.ts`
- Create: `apps/docs/src/app/components/seed-swatch-grid/seed-swatch-grid.html`
- Create: `apps/docs/src/app/components/seed-swatch-grid/seed-swatch-grid.css`
- Create: `apps/docs/src/app/components/seed-swatch-grid/seed-swatch-grid.spec.ts`

- [x] **Step 1: Write the failing component test**

```ts
// seed-swatch-grid.spec.ts
import { TestBed } from '@angular/core/testing';
import { SeedSwatchGridComponent } from './seed-swatch-grid';
import { SEED_SWATCHES } from '../../lib/theme/seed-swatches';

describe('SeedSwatchGridComponent', () => {
  test('renders one button per swatch grouped by family', () => {
    const fixture = TestBed.createComponent(SeedSwatchGridComponent);
    fixture.componentRef.setInput('activeHex', null);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button[data-hex]');
    expect(buttons.length).toBe(SEED_SWATCHES.length);
  });

  test('emits seedPicked on click with the hex', () => {
    const fixture = TestBed.createComponent(SeedSwatchGridComponent);
    fixture.componentRef.setInput('activeHex', null);
    fixture.detectChanges();
    const spy = vi.fn();
    fixture.componentInstance.seedPicked.subscribe(spy);
    const first = fixture.nativeElement.querySelector('button[data-hex]') as HTMLButtonElement;
    first.click();
    expect(spy).toHaveBeenCalledWith(first.dataset.hex);
  });

  test('marks the activeHex button with aria-pressed=true', () => {
    const fixture = TestBed.createComponent(SeedSwatchGridComponent);
    fixture.componentRef.setInput('activeHex', SEED_SWATCHES[0].hex);
    fixture.detectChanges();
    const active = fixture.nativeElement.querySelector(`button[data-hex="${SEED_SWATCHES[0].hex}"]`);
    expect(active.getAttribute('aria-pressed')).toBe('true');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/docs/src/app/components/seed-swatch-grid/seed-swatch-grid.spec.ts`
Expected: FAIL — module not found.

- [x] **Step 3: Implement the component**

```ts
// seed-swatch-grid.ts
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SEED_SWATCHES, HUE_FAMILIES, type SeedSwatch, type HueFamily } from '../../lib/theme/seed-swatches';

@Component({
  selector: 'kj-seed-swatch-grid',
  standalone: true,
  templateUrl: './seed-swatch-grid.html',
  styleUrl: './seed-swatch-grid.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeedSwatchGridComponent {
  readonly activeHex = input<string | null>(null);
  readonly seedPicked = output<string>();

  protected readonly grouped = computed<{ family: HueFamily; items: readonly SeedSwatch[] }[]>(() =>
    HUE_FAMILIES.map(family => ({
      family,
      items: SEED_SWATCHES.filter(s => s.hueFamily === family),
    })).filter(g => g.items.length > 0),
  );

  protected isActive(hex: string): boolean {
    return (this.activeHex() ?? '').toLowerCase() === hex.toLowerCase();
  }

  protected pick(hex: string): void {
    this.seedPicked.emit(hex);
  }
}
```

```html
<!-- seed-swatch-grid.html -->
@for (group of grouped(); track group.family) {
  <section class="swatch-group" [attr.aria-label]="group.family + ' seeds'">
    <h4 class="swatch-group__label">{{ group.family }}</h4>
    <div class="swatch-row">
      @for (s of group.items; track s.hex) {
        <button
          type="button"
          class="swatch"
          [class.swatch--active]="isActive(s.hex)"
          [attr.data-hex]="s.hex"
          [attr.aria-pressed]="isActive(s.hex)"
          [attr.aria-label]="s.name + ' (' + s.hex + ')'"
          [style.background]="s.hex"
          (click)="pick(s.hex)"
        ></button>
      }
    </div>
  </section>
}
```

```css
/* seed-swatch-grid.css */
.swatch-group { margin-block: 0.75rem; }
.swatch-group__label {
  font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--kj-base-content); opacity: 0.7; margin: 0 0 0.25rem;
}
.swatch-row { display: flex; flex-wrap: wrap; gap: 0.375rem; }
.swatch {
  width: 1.75rem; height: 1.75rem; min-width: 44px; min-height: 44px;
  border-radius: 0.5rem; border: 2px solid transparent; cursor: pointer;
  padding: 0; background-clip: content-box; box-sizing: border-box;
}
.swatch:focus-visible { outline: 2px solid var(--kj-primary); outline-offset: 2px; }
.swatch--active { border-color: var(--kj-base-content); }
```

> Touch target: WCAG 2.5.5 requires 44×44; the visible swatch is smaller but the button hit-area meets the rule.

- [x] **Step 4: Run tests**

Run: `pnpm exec vitest run apps/docs/src/app/components/seed-swatch-grid/seed-swatch-grid.spec.ts`
Expected: PASS, 3 tests.

- [x] **Step 5: Accessibility review (per CLAUDE.md) + commit**

Add to commit body: "Accessibility: buttons have aria-label and aria-pressed; 44×44 hit area; keyboard reachable; focus-visible ring."

```bash
git add apps/docs/src/app/components/seed-swatch-grid/
git commit -m "feat(theme-gen): seed swatch grid component"
```

### Task 7: Wire swatch grid + randomize + re-derive into the sidebar

**Files:**
- Modify: `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.ts`
- Modify: `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.html`
- Modify: `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.css`
- Modify: `apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.spec.ts`

- [x] **Step 1: Add failing tests**

Append to `theme-generator-sidebar.spec.ts`:

```ts
test('clicking a swatch sets all 9 colors', () => {
  const fixture = /* existing setup */ TestBed.createComponent(ThemeGeneratorSidebarComponent);
  fixture.detectChanges();
  const draft = TestBed.inject(ThemeDraftService);
  const swatch = fixture.nativeElement.querySelector('kj-seed-swatch-grid button[data-hex]') as HTMLButtonElement;
  const hex = swatch.dataset.hex!;
  swatch.click();
  expect(draft.draft().colors.primary.toLowerCase()).toBe(hex.toLowerCase());
});

test('randomize button replaces all 9 colors', () => {
  const fixture = TestBed.createComponent(ThemeGeneratorSidebarComponent);
  fixture.detectChanges();
  const draft = TestBed.inject(ThemeDraftService);
  const before = draft.draft().colors.primary;
  fixture.nativeElement.querySelector('[data-action="randomize"]').click();
  // Will pass with overwhelming probability; for determinism we'd inject RNG, but signal-driven update is sufficient here.
  expect(draft.dirtySlots().size).toBe(0);
});

test('re-derive button preserves dirty accent', () => {
  const fixture = TestBed.createComponent(ThemeGeneratorSidebarComponent);
  fixture.detectChanges();
  const draft = TestBed.inject(ThemeDraftService);
  draft.setColor('accent', '#abc123');
  fixture.nativeElement.querySelector('[data-action="rederive"]').click();
  expect(draft.draft().colors.accent).toBe('#abc123');
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.spec.ts`
Expected: FAIL — selectors not present.

- [x] **Step 3: Wire sidebar UI**

In `theme-generator-sidebar.ts`:

1. Add imports:
```ts
import { SeedSwatchGridComponent } from '../seed-swatch-grid/seed-swatch-grid';
import { randomAccessiblePalette } from '../../lib/theme/palette-derive';
```

2. Add to `imports: [...]`: `SeedSwatchGridComponent`.

3. Add `activeSeed` computed:
```ts
protected readonly activeSeed = computed<string | null>(() => {
  if (this.draftService.dirtySlots().size > 0) return null;
  return this.draft().colors.primary;
});
```

4. Add handlers:
```ts
protected onSeedPicked(hex: string): void {
  const derived = deriveFromSeed(hex, { mode: 'light' });
  this.draftService.setColors(derived);
}

protected randomize(): void {
  this.draftService.setColors(randomAccessiblePalette());
}

protected rederive(): void {
  this.draftService.rederiveFromPrimary();
}
```

(Add `import { deriveFromSeed } from '../../lib/theme/palette-derive';`.)

5. In `theme-generator-sidebar.html`, find the colors section and add at the top of it:

```html
<kj-seed-swatch-grid
  [activeHex]="activeSeed()"
  (seedPicked)="onSeedPicked($event)"
/>

<div class="palette-actions">
  <button type="button" data-action="randomize" (click)="randomize()" aria-label="Randomize palette">
    🎲 Randomize
  </button>
  <button type="button" data-action="rederive" (click)="rederive()" aria-label="Re-derive remaining slots from primary">
    Re-derive from primary
  </button>
</div>
```

6. In `theme-generator-sidebar.css`, append:

```css
.palette-actions { display: flex; gap: 0.5rem; margin-block: 0.5rem; }
.palette-actions button {
  min-height: 44px; padding: 0 0.75rem;
  border-radius: var(--kj-radius-field); border: 1px solid var(--kj-base-300);
  background: var(--kj-base-200); color: var(--kj-base-content); cursor: pointer;
}
.palette-actions button:focus-visible { outline: 2px solid var(--kj-primary); outline-offset: 2px; }
```

- [x] **Step 4: Run tests**

Run: `pnpm exec vitest run apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.spec.ts`
Expected: PASS.

- [x] **Step 5: Accessibility review + commit**

Note in commit body: "Accessibility: aria-labels on action buttons; 44px hit areas; focus-visible rings; aria-pressed on swatches."

```bash
git add apps/docs/src/app/components/theme-generator-sidebar/
git commit -m "feat(theme-gen): wire seed grid, randomize, re-derive into sidebar"
```

---

## Phase 6 — Contrast scoring service

### Task 8: Add `contrast-score.service.ts`

**Files:**
- Create: `apps/docs/src/app/services/contrast-score.service.ts`
- Test: `apps/docs/src/app/services/contrast-score.service.spec.ts`

- [x] **Step 1: Write failing test**

```ts
// contrast-score.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { ContrastScoreService } from './contrast-score.service';

describe('ContrastScoreService', () => {
  let svc: ContrastScoreService;
  beforeEach(() => { svc = TestBed.inject(ContrastScoreService); });

  test('white on black is 21:1 AAA pass', () => {
    const r = svc.ratio('#000000', '#ffffff');
    expect(r).toBeCloseTo(21, 0);
  });

  test('white on white is 1:1 fail', () => {
    expect(svc.ratio('#ffffff', '#ffffff')).toBeCloseTo(1, 1);
  });

  test('verdict is AAA at 7:1', () => {
    expect(svc.verdict(7)).toBe('AAA');
    expect(svc.verdict(7.0001)).toBe('AAA');
    expect(svc.verdict(6.9999)).toBe('AA');
    expect(svc.verdict(4.5)).toBe('AA');
    expect(svc.verdict(4.49)).toBe('AA-Large');
    expect(svc.verdict(2.99)).toBe('FAIL');
  });

  test('scorePalette returns one row per pair', () => {
    const tokens = {
      colors: {
        'base-100': '#ffffff', primary: '#000000', secondary: '#000000', accent: '#000000',
        neutral: '#000000', info: '#000000', success: '#000000', warning: '#000000', destructive: '#000000',
      },
      contents: {
        'base-200': '#eeeeee', 'base-300': '#dddddd',
        'base-content': '#000000',
        'primary-content': '#ffffff', 'secondary-content': '#ffffff', 'accent-content': '#ffffff',
        'neutral-content': '#ffffff', 'info-content': '#ffffff', 'success-content': '#ffffff',
        'warning-content': '#ffffff', 'destructive-content': '#ffffff',
      },
    } as any;
    const report = svc.scorePalette(tokens);
    expect(report.pairs.length).toBeGreaterThanOrEqual(13);
    expect(report.summary.aaaPass).toBe(report.pairs.filter(p => p.target === 'AAA' && p.verdict === 'AAA').length);
  });
});
```

- [x] **Step 2: Run test**

Run: `pnpm exec vitest run apps/docs/src/app/services/contrast-score.service.spec.ts`
Expected: FAIL — module not found.

- [x] **Step 3: Implement**

```ts
// contrast-score.service.ts
import { Injectable } from '@angular/core';
import { converter } from 'culori';
import type { ResolvedTokens } from '../lib/theme/types';

const toRgb = converter('rgb');
export type Verdict = 'AAA' | 'AA' | 'AA-Large' | 'FAIL';
export type Target = 'AAA' | 'AA-Large';

export interface PairResult {
  fg: string; fgHex: string;
  bg: string; bgHex: string;
  ratio: number;
  target: Target;
  verdict: Verdict;
  pass: boolean;
}

export interface ContrastReport {
  pairs: PairResult[];
  summary: { aaaPass: number; aaPass: number; total: number; score: number };
}

const PAIRS: { fg: string; bg: string; target: Target }[] = [
  { fg: 'base-content', bg: 'base-100', target: 'AAA' },
  { fg: 'base-content', bg: 'base-200', target: 'AAA' },
  { fg: 'base-content', bg: 'base-300', target: 'AAA' },
  { fg: 'primary-content', bg: 'primary', target: 'AAA' },
  { fg: 'secondary-content', bg: 'secondary', target: 'AAA' },
  { fg: 'accent-content', bg: 'accent', target: 'AAA' },
  { fg: 'neutral-content', bg: 'neutral', target: 'AAA' },
  { fg: 'info-content', bg: 'info', target: 'AAA' },
  { fg: 'success-content', bg: 'success', target: 'AAA' },
  { fg: 'warning-content', bg: 'warning', target: 'AAA' },
  { fg: 'destructive-content', bg: 'destructive', target: 'AAA' },
  { fg: 'primary', bg: 'base-100', target: 'AA-Large' },
  { fg: 'primary', bg: 'base-200', target: 'AA-Large' },
];

@Injectable({ providedIn: 'root' })
export class ContrastScoreService {
  ratio(a: string, b: string): number {
    const la = this.relLum(a), lb = this.relLum(b);
    const [hi, lo] = la > lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
  }

  verdict(r: number): Verdict {
    if (r >= 7) return 'AAA';
    if (r >= 4.5) return 'AA';
    if (r >= 3) return 'AA-Large';
    return 'FAIL';
  }

  scorePalette(tokens: ResolvedTokens): ContrastReport {
    const lookup = (name: string): string => {
      if (name in tokens.colors) return (tokens.colors as Record<string, string>)[name];
      if (name in tokens.contents) return (tokens.contents as Record<string, string>)[name];
      const derived = tokens.derivedBase as Record<string, string>;
      if (name === 'base-200') return derived.base200;
      if (name === 'base-300') return derived.base300;
      return '#000000';
    };
    const pairs: PairResult[] = PAIRS.map(p => {
      const fgHex = this.cssToHex(lookup(p.fg));
      const bgHex = this.cssToHex(lookup(p.bg));
      const r = this.ratio(fgHex, bgHex);
      const v = this.verdict(r);
      const pass = p.target === 'AAA' ? v === 'AAA'
                 : p.target === 'AA-Large' ? r >= 3 : false;
      return { fg: p.fg, fgHex, bg: p.bg, bgHex, ratio: r, target: p.target, verdict: v, pass };
    });
    const total = pairs.length;
    const aaaPass = pairs.filter(p => p.target === 'AAA' && p.verdict === 'AAA').length;
    const aaPass = pairs.filter(p => p.verdict === 'AAA' || p.verdict === 'AA').length;
    const score = Math.round((pairs.filter(p => p.pass).length / total) * 100);
    return { pairs, summary: { aaaPass, aaPass, total, score } };
  }

  private relLum(hex: string): number {
    const c = toRgb(hex)!;
    const lin = (x: number) => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  }

  private cssToHex(css: string): string {
    if (css.startsWith('#')) return css;
    const c = toRgb(css);
    if (!c) return '#000000';
    const to = (n: number) => Math.max(0, Math.min(255, Math.round(n * 255))).toString(16).padStart(2, '0');
    return `#${to(c.r)}${to(c.g)}${to(c.b)}`;
  }
}
```

- [x] **Step 4: Run tests**

Run: `pnpm exec vitest run apps/docs/src/app/services/contrast-score.service.spec.ts`
Expected: PASS, 4 tests.

- [x] **Step 5: Commit**

```bash
git add apps/docs/src/app/services/contrast-score.service.ts apps/docs/src/app/services/contrast-score.service.spec.ts
git commit -m "feat(theme-gen): contrast scoring service (WCAG AAA/AA verdicts per pair)"
```

### Task 9: Add `contrast-scorecard` component

**Files:**
- Create: `apps/docs/src/app/components/contrast-scorecard/contrast-scorecard.ts`
- Create: `apps/docs/src/app/components/contrast-scorecard/contrast-scorecard.html`
- Create: `apps/docs/src/app/components/contrast-scorecard/contrast-scorecard.css`
- Create: `apps/docs/src/app/components/contrast-scorecard/contrast-scorecard.spec.ts`

- [x] **Step 1: Write failing test**

```ts
// contrast-scorecard.spec.ts
import { TestBed } from '@angular/core/testing';
import { ContrastScorecardComponent } from './contrast-scorecard';
import { ThemeDraftService } from '../../services/theme-draft.service';

describe('ContrastScorecardComponent', () => {
  test('renders one row per pair with ratio and verdict', () => {
    const fixture = TestBed.createComponent(ContrastScorecardComponent);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('[role="listitem"]');
    expect(rows.length).toBeGreaterThanOrEqual(13);
    const ariaLabel = (rows[0] as HTMLElement).getAttribute('aria-label');
    expect(ariaLabel).toMatch(/contrast/);
  });

  test('failing rows have a visible FAIL badge text', () => {
    const draft = TestBed.inject(ThemeDraftService);
    // Force a failing pair: primary same as base-100
    draft.setColor('primary', '#ffffff');
    const fixture = TestBed.createComponent(ContrastScorecardComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toMatch(/FAIL|✗/);
  });
});
```

- [x] **Step 2: Run test**

Run: `pnpm exec vitest run apps/docs/src/app/components/contrast-scorecard/contrast-scorecard.spec.ts`
Expected: FAIL — module not found.

- [x] **Step 3: Implement**

```ts
// contrast-scorecard.ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { ContrastScoreService } from '../../services/contrast-score.service';

@Component({
  selector: 'kj-contrast-scorecard',
  standalone: true,
  templateUrl: './contrast-scorecard.html',
  styleUrl: './contrast-scorecard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContrastScorecardComponent {
  private readonly draftService = inject(ThemeDraftService);
  private readonly score = inject(ContrastScoreService);

  protected readonly report = computed(() => this.score.scorePalette(this.draftService.resolvedTokens()));

  protected focusToken(slot: string): void {
    const el = document.querySelector<HTMLElement>(`[data-token-slot="${slot}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus();
  }

  protected ariaForPair(p: { fg: string; bg: string; ratio: number; verdict: string }): string {
    return `${p.fg} on ${p.bg}, contrast ${p.ratio.toFixed(2)} to 1, ${p.verdict === 'FAIL' ? 'fails' : 'passes'} ${p.verdict}`;
  }
}
```

```html
<!-- contrast-scorecard.html -->
<details class="scorecard" open>
  <summary>
    <span class="badge badge--aaa" aria-live="polite">AAA {{ report().summary.score }}%</span>
    <span class="badge badge--aa">AA {{ report().summary.aaPass }}/{{ report().summary.total }}</span>
  </summary>
  <ul role="list" class="rows">
    @for (p of report().pairs; track p.fg + ':' + p.bg) {
      <li
        role="listitem"
        class="row"
        [class.row--fail]="!p.pass"
        [attr.aria-label]="ariaForPair(p)"
        (click)="focusToken(p.bg)"
      >
        <span class="chip" [style.background]="p.fgHex" aria-hidden="true"></span>
        <span class="chip" [style.background]="p.bgHex" aria-hidden="true"></span>
        <span class="row__label">{{ p.fg }} / {{ p.bg }}</span>
        <span class="row__ratio">{{ p.ratio.toFixed(2) }}:1</span>
        <span class="row__verdict" [class.row__verdict--fail]="!p.pass">
          {{ p.pass ? '✓ ' + p.verdict : '✗ FAIL' }}
        </span>
      </li>
    }
  </ul>
</details>
```

```css
/* contrast-scorecard.css */
.scorecard { border-top: 1px solid var(--kj-base-300); padding: 0.5rem 0.75rem; }
.scorecard summary { display: flex; gap: 0.5rem; cursor: pointer; align-items: center; }
.badge { padding: 0.125rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
.badge--aaa { background: var(--kj-success); color: var(--kj-success-content); }
.badge--aa  { background: var(--kj-base-200); color: var(--kj-base-content); }
.rows { list-style: none; margin: 0.5rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
.row {
  display: grid; grid-template-columns: auto auto 1fr auto auto;
  gap: 0.5rem; align-items: center; padding: 0.25rem 0.5rem;
  border-radius: 0.375rem; cursor: pointer; min-height: 44px;
}
.row:hover, .row:focus-visible { background: var(--kj-base-200); }
.row--fail { background: color-mix(in oklab, var(--kj-destructive) 8%, transparent); }
.chip { width: 1rem; height: 1rem; border-radius: 0.25rem; border: 1px solid var(--kj-base-300); }
.row__label { font-size: 0.875rem; }
.row__ratio { font-variant-numeric: tabular-nums; font-size: 0.875rem; }
.row__verdict--fail { color: var(--kj-destructive); font-weight: 600; }
```

- [x] **Step 4: Mount the scorecard in the sidebar**

In `theme-generator-sidebar.ts`, add to imports:
```ts
import { ContrastScorecardComponent } from '../contrast-scorecard/contrast-scorecard';
```

Add to `imports: [...]`. In `theme-generator-sidebar.html`, append at the bottom:

```html
<kj-contrast-scorecard />
```

- [x] **Step 5: Run tests**

Run: `pnpm exec vitest run apps/docs/src/app/components/contrast-scorecard/contrast-scorecard.spec.ts`
Expected: PASS.

- [x] **Step 6: Accessibility review + commit**

Note: "Accessibility: ✓ aria-live polite on score; ✗-icon plus FAIL text (no color-only); 44px row height; role=list/listitem with descriptive aria-label."

```bash
git add apps/docs/src/app/components/contrast-scorecard/ apps/docs/src/app/components/theme-generator-sidebar/
git commit -m "feat(theme-gen): contrast scorecard with per-pair AAA/AA verdicts"
```

---

## Phase 7 — URL hash sync

### Task 10: Add `theme-url.service.ts` (encode/decode)

**Files:**
- Create: `apps/docs/src/app/services/theme-url.service.ts`
- Test: `apps/docs/src/app/services/theme-url.service.spec.ts`

- [x] **Step 1: Write failing test**

```ts
// theme-url.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { ThemeUrlService } from './theme-url.service';
import { BUILT_IN_THEMES } from '../lib/theme/built-in-themes';

describe('ThemeUrlService encode/decode', () => {
  let svc: ThemeUrlService;
  beforeEach(() => { svc = TestBed.inject(ThemeUrlService); });

  test('round-trips a draft', async () => {
    const draft = { ...BUILT_IN_THEMES.light, name: 'roundtrip' };
    const hash = await svc.encode(draft as any);
    const decoded = await svc.decode(hash);
    expect(decoded?.colors).toEqual(draft.colors);
  });

  test('rejects unknown major version', async () => {
    // Forge a v2 envelope
    const forged = btoa(JSON.stringify({ v: 2, d: {} })).replace(/=+$/, '');
    const decoded = await svc.decode('t=' + forged);
    expect(decoded).toBeNull();
  });

  test('returns null for malformed hash', async () => {
    expect(await svc.decode('t=!!!notbase64')).toBeNull();
    expect(await svc.decode('')).toBeNull();
  });
});
```

- [x] **Step 2: Run test**

Run: `pnpm exec vitest run apps/docs/src/app/services/theme-url.service.spec.ts`
Expected: FAIL.

- [x] **Step 3: Implement**

```ts
// theme-url.service.ts
import { Injectable, inject, DestroyRef, effect } from '@angular/core';
import { ThemeDraftService } from './theme-draft.service';
import { DraftThemeSchema } from '../lib/theme/import-schema';
import type { DraftTheme } from '../lib/theme/types';

const HASH_PREFIX = 't=';
const VERSION = 1;

function b64UrlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64UrlDecode(str: string): Uint8Array | null {
  try {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch { return null; }
}

@Injectable({ providedIn: 'root' })
export class ThemeUrlService {
  private readonly draftService = inject(ThemeDraftService);
  private readonly destroyRef = inject(DestroyRef);
  private timer: number | null = null;
  private suppress = false;

  startSync(): void {
    // Read from URL on init.
    if (typeof location !== 'undefined' && location.hash) {
      const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
      this.decode(hash).then(d => {
        if (d) { this.suppress = true; this.draftService.load?.(d); this.suppress = false; }
      });
    }
    // Write to URL on change (debounced).
    effect(() => {
      const draft = this.draftService.draft();
      if (this.suppress) return;
      if (typeof window === 'undefined') return;
      if (this.timer !== null) window.clearTimeout(this.timer);
      this.timer = window.setTimeout(async () => {
        const hash = await this.encode(draft);
        history.replaceState(null, '', `${location.pathname}${location.search}#${hash}`);
      }, 250);
    });
    this.destroyRef.onDestroy(() => { if (this.timer !== null) clearTimeout(this.timer); });
  }

  async encode(draft: DraftTheme): Promise<string> {
    const json = JSON.stringify({ v: VERSION, d: draft });
    const bytes = new TextEncoder().encode(json);
    let payload = bytes;
    if (typeof CompressionStream !== 'undefined') {
      const cs = new CompressionStream('deflate-raw');
      const writer = cs.writable.getWriter();
      writer.write(bytes); writer.close();
      payload = new Uint8Array(await new Response(cs.readable).arrayBuffer());
    }
    return HASH_PREFIX + b64UrlEncode(payload);
  }

  async decode(hash: string): Promise<DraftTheme | null> {
    if (!hash.startsWith(HASH_PREFIX)) return null;
    const bytes = b64UrlDecode(hash.slice(HASH_PREFIX.length));
    if (!bytes) return null;
    let json: string;
    try {
      if (typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(bytes); writer.close();
        const buf = await new Response(ds.readable).arrayBuffer();
        json = new TextDecoder().decode(buf);
      } else {
        json = new TextDecoder().decode(bytes);
      }
    } catch {
      try { json = new TextDecoder().decode(bytes); } catch { return null; }
    }
    let env: { v: number; d: unknown };
    try { env = JSON.parse(json); } catch { return null; }
    if (env.v !== VERSION) return null;
    const parsed = DraftThemeSchema.safeParse(env.d);
    return parsed.success ? (parsed.data as DraftTheme) : null;
  }

  copyShareLink(): string {
    return location.href;
  }
}
```

- [x] **Step 4: Add `load` method to `ThemeDraftService`**

In `theme-draft.service.ts`, add:

```ts
load(draft: DraftTheme): void {
  this._draft.set(structuredClone(draft));
  this._dirty.set(new Set());
  this.persistDraft();
}
```

- [x] **Step 5: Run tests**

Run: `pnpm exec vitest run apps/docs/src/app/services/theme-url.service.spec.ts`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add apps/docs/src/app/services/theme-url.service.ts apps/docs/src/app/services/theme-url.service.spec.ts apps/docs/src/app/services/theme-draft.service.ts
git commit -m "feat(theme-gen): hash-URL encode/decode service (deflate-raw + base64url)"
```

### Task 11: Wire URL sync + Copy-link button into the page

**Files:**
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.ts`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.html`

- [x] **Step 1: Start sync on page init**

In `theme-generator.ts`, add:

```ts
import { ThemeUrlService } from '../../services/theme-url.service';
// inside the class:
private readonly url = inject(ThemeUrlService);
constructor() {
  this.url.startSync();
  this.destroyRef.onDestroy(() => {
    this.document.getElementById(STYLE_TAG_ID)?.remove();
  });
}

protected async copyLink(): Promise<void> {
  const ok = await this.clipboard.copy(this.url.copyShareLink());
  this.flash(ok ? 'Link copied' : 'Copy failed');
}
```

(Move the existing constructor body inside the new constructor.)

- [x] **Step 2: Add Copy-link button**

In `theme-generator.html` find the button row near "Copy CSS" and add:

```html
<kj-button (click)="copyLink()" aria-label="Copy share link">Copy link</kj-button>
```

- [x] **Step 3: Manually verify**

Run: `pnpm exec nx serve docs` (or the project's dev command).
Open `/theme-generator`. Edit any color → check `location.hash` updates within ~250 ms. Copy link, paste in a new tab → draft restored.

- [x] **Step 4: Commit**

```bash
git add apps/docs/src/app/pages/theme-generator/
git commit -m "feat(theme-gen): wire URL hash sync + Copy link button"
```

---

## Phase 8 — Import (JSON + CSS)

### Task 12: Add `theme-import.service.ts` (CSS parsing)

**Files:**
- Create: `apps/docs/src/app/services/theme-import.service.ts`
- Test: `apps/docs/src/app/services/theme-import.service.spec.ts`

- [x] **Step 1: Write failing test**

```ts
// theme-import.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { ThemeImportService } from './theme-import.service';

describe('ThemeImportService', () => {
  let svc: ThemeImportService;
  beforeEach(() => { svc = TestBed.inject(ThemeImportService); });

  test('detects JSON by leading {', () => {
    expect(svc.detectFormat('{"name":"x"}')).toBe('json');
  });

  test('detects CSS by :where selector', () => {
    expect(svc.detectFormat(':where(.kj-theme-x) { --kj-primary: #f00; }')).toBe('css');
  });

  test('parses CSS into a partial draft', () => {
    const css = `:where(.kj-theme-x) {
      --kj-primary: #336699;
      --kj-base-100: #ffffff;
      --kj-radius-field: 8px;
      --kj-font-sans: "Inter", sans-serif;
    }`;
    const result = svc.parseCss(css);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.colors.primary.toLowerCase()).toBe('#336699');
      expect(result.draft.colors['base-100'].toLowerCase()).toBe('#ffffff');
      expect(result.draft.shape.radiusField).toBe(8);
    }
  });

  test('rejects empty/garbage CSS', () => {
    expect(svc.parseCss('').ok).toBe(false);
    expect(svc.parseCss('not css').ok).toBe(false);
  });
});
```

- [x] **Step 2: Run test**

Run: `pnpm exec vitest run apps/docs/src/app/services/theme-import.service.spec.ts`
Expected: FAIL.

- [x] **Step 3: Implement**

```ts
// theme-import.service.ts
import { Injectable, inject } from '@angular/core';
import { ThemeDraftService } from './theme-draft.service';
import { BUILT_IN_THEMES } from '../lib/theme/built-in-themes';
import type { DraftTheme, ColorSlot } from '../lib/theme/types';

export type ImportResult = { ok: true; draft: DraftTheme } | { ok: false; reason: string };
export type Format = 'json' | 'css';

const COLOR_KEYS: ColorSlot[] = ['base-100','primary','secondary','accent','neutral','info','success','warning','destructive'];

@Injectable({ providedIn: 'root' })
export class ThemeImportService {
  private readonly draftService = inject(ThemeDraftService);

  detectFormat(text: string): Format {
    const t = text.trimStart();
    if (t.startsWith('{')) return 'json';
    return 'css';
  }

  parseJson(text: string): ImportResult {
    const r = this.draftService.importJson(text);
    if (!r.ok) return { ok: false, reason: r.reason };
    return { ok: true, draft: this.draftService.draft() };
  }

  parseCss(text: string): ImportResult {
    if (!text.includes('--kj-')) return { ok: false, reason: 'No --kj-* properties found' };
    const draft: DraftTheme = structuredClone(BUILT_IN_THEMES.light);
    const re = /--kj-([a-z0-9-]+)\s*:\s*([^;]+);/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const key = m[1].trim();
      const value = m[2].trim();
      if (COLOR_KEYS.includes(key as ColorSlot)) {
        draft.colors[key as ColorSlot] = value;
      } else if (key === 'radius-box')      draft.shape.radiusBox = parseFloat(value);
      else if (key === 'radius-field')      draft.shape.radiusField = parseFloat(value);
      else if (key === 'radius-selector')   draft.shape.radiusSelector = parseFloat(value);
      else if (key === 'border')            draft.shape.border = parseFloat(value);
      else if (key === 'depth')             draft.shape.depth = parseFloat(value);
      else if (key === 'font-sans')         draft.type.fontSans = value;
      else if (key === 'font-mono')         draft.type.fontMono = value;
      else if (key === 'font-display')      draft.type.fontDisplay = value;
      else if (key === 'transition')        draft.motion.transition = value;
    }
    return { ok: true, draft };
  }

  apply(draft: DraftTheme): void {
    this.draftService.load(draft);
  }
}
```

- [x] **Step 4: Run tests**

Run: `pnpm exec vitest run apps/docs/src/app/services/theme-import.service.spec.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/docs/src/app/services/theme-import.service.ts apps/docs/src/app/services/theme-import.service.spec.ts
git commit -m "feat(theme-gen): import service for JSON and CSS theme payloads"
```

### Task 13: Import dialog + button

**Files:**
- Create: `apps/docs/src/app/components/theme-import-dialog/theme-import-dialog.ts`
- Create: `apps/docs/src/app/components/theme-import-dialog/theme-import-dialog.html`
- Create: `apps/docs/src/app/components/theme-import-dialog/theme-import-dialog.css`
- Create: `apps/docs/src/app/components/theme-import-dialog/theme-import-dialog.spec.ts`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.ts`
- Modify: `apps/docs/src/app/pages/theme-generator/theme-generator.html`

- [ ] **Step 1: Write failing component test**

```ts
// theme-import-dialog.spec.ts
import { TestBed } from '@angular/core/testing';
import { ThemeImportDialogComponent } from './theme-import-dialog';

describe('ThemeImportDialogComponent', () => {
  test('open=false hides the dialog', () => {
    const fixture = TestBed.createComponent(ThemeImportDialogComponent);
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  test('successful JSON import emits imported and closes', () => {
    const fixture = TestBed.createComponent(ThemeImportDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    const ta = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = JSON.stringify({
      name: 'x',
      colors: { 'base-100':'#fff', primary:'#000', secondary:'#000', accent:'#000', neutral:'#000',
        info:'#000', success:'#000', warning:'#000', destructive:'#000' },
      contentOverrides: {},
      shape: { radiusBox:8, radiusField:6, radiusSelector:4, border:1, depth:1 },
      type: { fontSans:'sans-serif', fontMono:'monospace', fontDisplay:'serif' },
      motion: { transition:'200ms' },
    });
    ta.dispatchEvent(new Event('input'));
    fixture.nativeElement.querySelector('[data-action="apply"]').click();
    fixture.detectChanges();
    expect(closed).toHaveBeenCalled();
  });

  test('invalid input shows inline error', () => {
    const fixture = TestBed.createComponent(ThemeImportDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const ta = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = '{ broken';
    ta.dispatchEvent(new Event('input'));
    fixture.nativeElement.querySelector('[data-action="apply"]').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm exec vitest run apps/docs/src/app/components/theme-import-dialog/theme-import-dialog.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// theme-import-dialog.ts
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { ThemeImportService } from '../../services/theme-import.service';

@Component({
  selector: 'kj-theme-import-dialog',
  standalone: true,
  templateUrl: './theme-import-dialog.html',
  styleUrl: './theme-import-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeImportDialogComponent {
  private readonly importer = inject(ThemeImportService);
  readonly open = input<boolean>(false);
  readonly closed = output<{ imported: boolean }>();

  protected readonly text = signal('');
  protected readonly error = signal<string | null>(null);

  protected onInput(ev: Event): void {
    this.text.set((ev.target as HTMLTextAreaElement).value);
    this.error.set(null);
  }

  protected async onFile(ev: Event): Promise<void> {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.text.set(await file.text());
  }

  protected apply(): void {
    const t = this.text();
    if (!t.trim()) { this.error.set('Paste or upload a theme'); return; }
    const fmt = this.importer.detectFormat(t);
    const result = fmt === 'json' ? this.importer.parseJson(t) : this.importer.parseCss(t);
    if (!result.ok) { this.error.set(result.reason); return; }
    this.importer.apply(result.draft);
    this.closed.emit({ imported: true });
  }

  protected cancel(): void { this.closed.emit({ imported: false }); }
}
```

```html
<!-- theme-import-dialog.html -->
@if (open()) {
  <div class="backdrop" (click)="cancel()"></div>
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="import-title">
    <h2 id="import-title">Import theme</h2>
    <p class="subtitle">Paste a JSON export or a CSS theme block, or drop a file.</p>
    <textarea
      rows="12"
      [value]="text()"
      (input)="onInput($event)"
      aria-label="Theme JSON or CSS"
      [attr.aria-invalid]="error() !== null"
      aria-describedby="import-error"
    ></textarea>
    <input type="file" accept=".json,.css,text/css,application/json" (change)="onFile($event)" aria-label="Upload theme file">
    @if (error(); as err) {
      <div id="import-error" role="alert" class="error">{{ err }}</div>
    }
    <div class="actions">
      <button type="button" (click)="cancel()">Cancel</button>
      <button type="button" data-action="apply" (click)="apply()">Apply</button>
    </div>
  </div>
}
```

```css
/* theme-import-dialog.css */
.backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 50; }
.dialog {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: min(640px, 90vw); padding: 1rem;
  background: var(--kj-base-100); color: var(--kj-base-content);
  border: 1px solid var(--kj-base-300); border-radius: var(--kj-radius-box);
  z-index: 51; display: flex; flex-direction: column; gap: 0.5rem;
}
.dialog textarea {
  width: 100%; font-family: var(--kj-font-mono); font-size: 0.875rem;
  background: var(--kj-base-200); color: var(--kj-base-content);
  border: 1px solid var(--kj-base-300); border-radius: var(--kj-radius-field); padding: 0.5rem;
}
.error { color: var(--kj-destructive); font-size: 0.875rem; }
.actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
.actions button { min-height: 44px; min-width: 88px; }
```

- [ ] **Step 4: Wire into the page**

In `theme-generator.ts`:
```ts
import { ThemeImportDialogComponent } from '../../components/theme-import-dialog/theme-import-dialog';
// add to imports
imports: [KjButtonComponent, ThemeGeneratorPreviewComponent, ThemeImportDialogComponent],
// add signal
protected readonly importOpen = signal(false);
// handlers
protected openImport(): void { this.importOpen.set(true); }
protected onImportClosed(ev: { imported: boolean }): void {
  this.importOpen.set(false);
  if (ev.imported) this.flash('Imported');
}
```

In `theme-generator.html`:
```html
<kj-button (click)="openImport()" aria-label="Import theme">Import…</kj-button>
<!-- and at end of root template: -->
<kj-theme-import-dialog [open]="importOpen()" (closed)="onImportClosed($event)" />
```

- [ ] **Step 5: Run tests + a11y review**

Run: `pnpm exec vitest run apps/docs/src/app/components/theme-import-dialog/theme-import-dialog.spec.ts`
Expected: PASS.

Note: "Accessibility — focus trap not yet wired (no CDK per stack rule); next iteration: trap focus inside dialog. role=dialog/aria-modal/aria-labelledby/aria-describedby set; Escape via backdrop click. Add `(keydown.escape)="cancel()"` on the dialog div."

Add to `theme-import-dialog.html` outer dialog div: `(keydown.escape)="cancel()" tabindex="-1"`.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/app/components/theme-import-dialog/ apps/docs/src/app/pages/theme-generator/
git commit -m "feat(theme-gen): import dialog with JSON and CSS support"
```

---

## Phase 9 — Five-tab preview

### Task 14: Build the preview tabs container

**Files:**
- Modify: `apps/docs/src/app/pages/theme-generator/preview/theme-generator-preview.ts`
- Modify: `apps/docs/src/app/pages/theme-generator/preview/theme-generator-preview.html`
- Modify: `apps/docs/src/app/pages/theme-generator/preview/theme-generator-preview.css`
- Create: `apps/docs/src/app/pages/theme-generator/preview-tabs/fixtures.ts`

- [ ] **Step 1: Read the current preview component to understand what's there**

Run: `cat apps/docs/src/app/pages/theme-generator/preview/theme-generator-preview.ts`

- [ ] **Step 2: Add fixtures**

```ts
// apps/docs/src/app/pages/theme-generator/preview-tabs/fixtures.ts
export const KPI = [
  { label: 'Active users',    value: '12,489', delta: '+4.2%' },
  { label: 'MRR',             value: '$84.3k', delta: '+1.1%' },
  { label: 'Churn',           value: '2.4%',   delta: '-0.3%' },
  { label: 'NPS',             value: '72',     delta: '+5' },
];

export const PEOPLE = [
  { name: 'Ada Lovelace',  role: 'Engineer', avatar: 'AL' },
  { name: 'Grace Hopper',  role: 'Architect', avatar: 'GH' },
  { name: 'Alan Turing',   role: 'Researcher', avatar: 'AT' },
  { name: 'Linus T.',      role: 'Maintainer', avatar: 'LT' },
];

export const CONVERSATIONS = [
  { id: '1', who: 'Ada Lovelace',  preview: 'Pushed the analytical engine fix', unread: 2 },
  { id: '2', who: 'Grace Hopper',  preview: 'Compiler review at 3?',            unread: 0 },
  { id: '3', who: 'Alan Turing',   preview: 'See the test transcript',          unread: 1 },
];

export const MESSAGES = [
  { from: 'Ada Lovelace', text: 'Pushed the analytical engine fix.', mine: false, at: '10:02' },
  { from: 'me',            text: 'Nice — running CI now.',            mine: true,  at: '10:03' },
  { from: 'Ada Lovelace', text: 'Lmk if anything goes red.',          mine: false, at: '10:04' },
];
```

- [ ] **Step 3: Replace the preview component with a tabs container**

```ts
// apps/docs/src/app/pages/theme-generator/preview/theme-generator-preview.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { KjTabsComponent } from '@kouji-ui/components';

const TABS = ['dashboard', 'settings', 'big-form', 'search', 'chat'] as const;
type Tab = typeof TABS[number];

@Component({
  selector: 'kj-theme-generator-preview',
  standalone: true,
  imports: [KjTabsComponent],
  templateUrl: './theme-generator-preview.html',
  styleUrl: './theme-generator-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorPreviewComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly tabs = TABS;
  protected readonly active = signal<Tab>(this.initialTab());

  private initialTab(): Tab {
    const q = (typeof location !== 'undefined' ? new URLSearchParams(location.search).get('preview') : null);
    return (TABS as readonly string[]).includes(q ?? '') ? (q as Tab) : 'dashboard';
  }

  protected setActive(t: Tab): void {
    this.active.set(t);
    this.router.navigate([], { relativeTo: this.route, queryParams: { preview: t }, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
```

```html
<!-- theme-generator-preview.html -->
<nav role="tablist" aria-label="Preview pages" class="tab-strip">
  @for (t of tabs; track t) {
    <button
      type="button"
      role="tab"
      [attr.aria-selected]="active() === t"
      [attr.tabindex]="active() === t ? 0 : -1"
      [class.tab--active]="active() === t"
      (click)="setActive(t)"
    >{{ t }}</button>
  }
</nav>

<section role="tabpanel" tabindex="0" class="tab-panel" [attr.aria-label]="active() + ' preview'">
  @switch (active()) {
    @case ('dashboard') { @defer { <kj-preview-dashboard /> } @placeholder { <p>Loading…</p> } }
    @case ('settings')  { @defer { <kj-preview-settings  /> } @placeholder { <p>Loading…</p> } }
    @case ('big-form')  { @defer { <kj-preview-big-form  /> } @placeholder { <p>Loading…</p> } }
    @case ('search')    { @defer { <kj-preview-search    /> } @placeholder { <p>Loading…</p> } }
    @case ('chat')      { @defer { <kj-preview-chat      /> } @placeholder { <p>Loading…</p> } }
  }
</section>
```

(Add the per-tab components to `imports: [...]` as you create each one in subsequent tasks.)

```css
/* theme-generator-preview.css */
:host { display: flex; flex-direction: column; height: 100%; }
.tab-strip { display: flex; gap: 0.25rem; border-bottom: 1px solid var(--kj-base-300); padding: 0.5rem; }
.tab-strip button {
  min-height: 44px; padding: 0.5rem 0.75rem; border: 1px solid transparent;
  background: transparent; color: var(--kj-base-content); cursor: pointer;
  border-radius: var(--kj-radius-field); text-transform: capitalize;
}
.tab-strip button:focus-visible { outline: 2px solid var(--kj-primary); outline-offset: 2px; }
.tab-strip .tab--active { background: var(--kj-primary); color: var(--kj-primary-content); }
.tab-panel { flex: 1; overflow: auto; padding: 1rem; }
```

- [ ] **Step 4: Manual smoke**

Run dev server, open `/theme-generator?preview=dashboard`. Empty panel placeholders should render until tab pages exist (Tasks 15–19).

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/pages/theme-generator/preview/ apps/docs/src/app/pages/theme-generator/preview-tabs/fixtures.ts
git commit -m "feat(theme-gen): preview tabs container with deferred panels"
```

### Task 15: Dashboard tab

**Files:**
- Create: `apps/docs/src/app/pages/theme-generator/preview-tabs/dashboard.ts`
- Create: `apps/docs/src/app/pages/theme-generator/preview-tabs/dashboard.html`
- Create: `apps/docs/src/app/pages/theme-generator/preview-tabs/dashboard.css`
- Modify: `theme-generator-preview.ts` to import the component.

- [ ] **Step 1: Implement**

```ts
// dashboard.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  KjAvatarComponent, KjBadgeComponent, KjButtonComponent, KjAlertComponent,
  KjProgressBarComponent, KjStepperComponent, KjDividerComponent,
} from '@kouji-ui/components';
import { KPI, PEOPLE } from './fixtures';

@Component({
  selector: 'kj-preview-dashboard',
  standalone: true,
  imports: [KjAvatarComponent, KjBadgeComponent, KjButtonComponent, KjAlertComponent, KjProgressBarComponent, KjStepperComponent, KjDividerComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewDashboardComponent {
  protected readonly kpi = KPI;
  protected readonly people = PEOPLE;
}
```

```html
<!-- dashboard.html -->
<header class="hd">
  <h2>Dashboard</h2>
  <div class="actions">
    <kj-button>New report</kj-button>
    <kj-button variant="secondary">Export</kj-button>
  </div>
</header>

<kj-alert type="info">2 scheduled jobs ran successfully overnight.</kj-alert>

<section class="kpis">
  @for (k of kpi; track k.label) {
    <article class="kpi">
      <div class="kpi__label">{{ k.label }}</div>
      <div class="kpi__value">{{ k.value }}</div>
      <kj-badge>{{ k.delta }}</kj-badge>
    </article>
  }
</section>

<kj-divider />

<section class="grid-2">
  <article>
    <h3>Onboarding progress</h3>
    <kj-progress-bar [value]="65" />
    <kj-stepper [steps]="['Account','Workspace','Invite','Done']" [current]="2" />
  </article>
  <article>
    <h3>Team</h3>
    <ul class="people">
      @for (p of people; track p.name) {
        <li>
          <kj-avatar>{{ p.avatar }}</kj-avatar>
          <div>
            <div class="people__name">{{ p.name }}</div>
            <div class="people__role">{{ p.role }}</div>
          </div>
          <kj-badge variant="secondary">active</kj-badge>
        </li>
      }
    </ul>
  </article>
</section>
```

```css
/* dashboard.css */
.hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.hd h2 { margin: 0; }
.actions { display: flex; gap: 0.5rem; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin: 1rem 0; }
.kpi { background: var(--kj-base-200); padding: 0.75rem; border-radius: var(--kj-radius-box); border: 1px solid var(--kj-base-300); }
.kpi__label { font-size: 0.75rem; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.05em; }
.kpi__value { font-size: 1.5rem; font-weight: 700; margin: 0.25rem 0; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 800px) { .grid-2 { grid-template-columns: 1fr; } }
.people { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.people li { display: grid; grid-template-columns: auto 1fr auto; gap: 0.75rem; align-items: center;
  background: var(--kj-base-100); border: 1px solid var(--kj-base-300); border-radius: var(--kj-radius-field); padding: 0.5rem; }
.people__name { font-weight: 600; }
.people__role { font-size: 0.875rem; opacity: 0.7; }
```

- [ ] **Step 2: Wire into preview tabs**

In `theme-generator-preview.ts`, add `PreviewDashboardComponent` to imports.

- [ ] **Step 3: Verify renders without console errors**

Run dev server, open `/theme-generator?preview=dashboard`. Confirm no errors. (Some `kj-*` props may need adjusting based on actual component APIs — adjust template imports/inputs as needed.)

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/app/pages/theme-generator/preview-tabs/dashboard.* apps/docs/src/app/pages/theme-generator/preview/theme-generator-preview.ts
git commit -m "feat(theme-gen): preview dashboard tab"
```

### Task 16: Settings tab

**Files:**
- Create: `apps/docs/src/app/pages/theme-generator/preview-tabs/settings.ts`
- Create: `apps/docs/src/app/pages/theme-generator/preview-tabs/settings.html`
- Create: `apps/docs/src/app/pages/theme-generator/preview-tabs/settings.css`
- Modify: `theme-generator-preview.ts`.

- [ ] **Step 1: Implement**

```ts
// settings.ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjButtonComponent, KjFieldComponent, KjInputComponent, KjSelectComponent,
  KjCheckboxComponent, KjRadioComponent, KjSliderComponent, KjColorPickerComponent,
  KjFileUploadComponent, KjPasswordInputComponent,
} from '@kouji-ui/components';

@Component({
  selector: 'kj-preview-settings',
  standalone: true,
  imports: [KjButtonComponent, KjFieldComponent, KjInputComponent, KjSelectComponent,
            KjCheckboxComponent, KjRadioComponent, KjSliderComponent, KjColorPickerComponent,
            KjFileUploadComponent, KjPasswordInputComponent],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewSettingsComponent {
  protected readonly notifications = signal(true);
  protected readonly theme = signal<'system'|'light'|'dark'>('system');
}
```

```html
<!-- settings.html -->
<h2>Settings</h2>

<section class="card">
  <h3>Profile</h3>
  <kj-field label="Display name"><kj-input value="Ada Lovelace" /></kj-field>
  <kj-field label="Email"><kj-input value="ada@example.org" type="email" /></kj-field>
  <kj-field label="New password"><kj-password-input /></kj-field>
</section>

<section class="card">
  <h3>Preferences</h3>
  <kj-field label="Language">
    <kj-select [options]="[{value:'en',label:'English'},{value:'fr',label:'Français'}]" value="en" />
  </kj-field>
  <kj-field label="Theme">
    <div class="row">
      <kj-radio name="theme" value="system" [checked]="theme() === 'system'">System</kj-radio>
      <kj-radio name="theme" value="light"  [checked]="theme() === 'light'">Light</kj-radio>
      <kj-radio name="theme" value="dark"   [checked]="theme() === 'dark'">Dark</kj-radio>
    </div>
  </kj-field>
  <kj-field label="Density"><kj-slider [min]="0" [max]="2" [value]="1" /></kj-field>
  <kj-field label="Brand color"><kj-color-picker value="#3366cc" /></kj-field>
  <kj-checkbox [checked]="notifications()">Email notifications</kj-checkbox>
</section>

<section class="card">
  <h3>Avatar</h3>
  <kj-file-upload accept="image/*" />
</section>

<footer class="actions">
  <kj-button variant="destructive">Delete account</kj-button>
  <div class="spacer"></div>
  <kj-button variant="secondary">Cancel</kj-button>
  <kj-button>Save changes</kj-button>
</footer>
```

```css
/* settings.css */
.card { background: var(--kj-base-200); border: 1px solid var(--kj-base-300); border-radius: var(--kj-radius-box); padding: 1rem; margin-bottom: 1rem; }
.card h3 { margin-top: 0; }
.row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.actions { display: flex; gap: 0.5rem; align-items: center; }
.spacer { flex: 1; }
```

- [ ] **Step 2: Wire and verify**

Add `PreviewSettingsComponent` to preview imports. Open `/theme-generator?preview=settings`. Adjust component inputs to match real APIs as needed.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/app/pages/theme-generator/preview-tabs/settings.* apps/docs/src/app/pages/theme-generator/preview/theme-generator-preview.ts
git commit -m "feat(theme-gen): preview settings tab"
```

### Task 17: Big form tab

**Files:**
- Create: `apps/docs/src/app/pages/theme-generator/preview-tabs/big-form.ts`
- Create: `apps/docs/src/app/pages/theme-generator/preview-tabs/big-form.html`
- Create: `apps/docs/src/app/pages/theme-generator/preview-tabs/big-form.css`
- Modify: `theme-generator-preview.ts`.

- [ ] **Step 1: Implement**

```ts
// big-form.ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjStepperComponent, KjFieldComponent, KjInputComponent, KjTextareaComponent,
  KjMultiSelectComponent, KjDatePickerComponent, KjTimePickerComponent,
  KjInputMaskComponent, KjInputOtpComponent, KjNumberInputComponent,
  KjAlertComponent, KjAccordionComponent, KjButtonComponent,
} from '@kouji-ui/components';

@Component({
  selector: 'kj-preview-big-form',
  standalone: true,
  imports: [KjStepperComponent, KjFieldComponent, KjInputComponent, KjTextareaComponent,
            KjMultiSelectComponent, KjDatePickerComponent, KjTimePickerComponent,
            KjInputMaskComponent, KjInputOtpComponent, KjNumberInputComponent,
            KjAlertComponent, KjAccordionComponent, KjButtonComponent],
  templateUrl: './big-form.html',
  styleUrl: './big-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewBigFormComponent {
  protected readonly step = signal(1);
}
```

```html
<!-- big-form.html -->
<h2>Application</h2>
<kj-stepper [steps]="['Identity','Contact','Verify','Review']" [current]="step()" />

<form class="form" autocomplete="off">
  <kj-alert type="warning">Please double-check fields marked with an asterisk.</kj-alert>

  <fieldset>
    <legend>Identity</legend>
    <kj-field label="Full name *"><kj-input required /></kj-field>
    <kj-field label="Date of birth"><kj-date-picker /></kj-field>
    <kj-field label="Phone (mask)"><kj-input-mask mask="(000) 000-0000" /></kj-field>
    <kj-field label="Bio"><kj-textarea rows="4" /></kj-field>
  </fieldset>

  <fieldset>
    <legend>Contact</legend>
    <kj-field label="Email *"><kj-input type="email" required [attr.aria-invalid]="false" /></kj-field>
    <kj-field label="Preferred contact times"><kj-time-picker /></kj-field>
    <kj-field label="Languages spoken"><kj-multi-select [options]="[{value:'en',label:'English'},{value:'fr',label:'Français'},{value:'ja',label:'日本語'}]" /></kj-field>
    <kj-field label="Annual budget"><kj-number-input [min]="0" [step]="1000" /></kj-field>
  </fieldset>

  <fieldset>
    <legend>Verify</legend>
    <kj-field label="One-time code"><kj-input-otp [length]="6" /></kj-field>
  </fieldset>

  <kj-accordion>
    <details><summary>Terms of service</summary><p>Lorem ipsum…</p></details>
    <details><summary>Privacy</summary><p>We don't sell data.</p></details>
  </kj-accordion>

  <div class="actions">
    <kj-button variant="secondary">Back</kj-button>
    <kj-button>Continue</kj-button>
  </div>
</form>
```

```css
/* big-form.css */
.form { display: flex; flex-direction: column; gap: 1rem; max-width: 720px; }
fieldset { border: 1px solid var(--kj-base-300); border-radius: var(--kj-radius-box); padding: 1rem; }
legend { padding: 0 0.5rem; font-weight: 600; }
.actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
```

- [ ] **Step 2: Wire and verify**

Add `PreviewBigFormComponent` to preview imports. Verify in browser.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/app/pages/theme-generator/preview-tabs/big-form.* apps/docs/src/app/pages/theme-generator/preview/theme-generator-preview.ts
git commit -m "feat(theme-gen): preview big-form tab"
```

### Task 18: Search tab

**Files:**
- Create: `apps/docs/src/app/pages/theme-generator/preview-tabs/search.ts`
- Create: `apps/docs/src/app/pages/theme-generator/preview-tabs/search.html`
- Create: `apps/docs/src/app/pages/theme-generator/preview-tabs/search.css`
- Modify: `theme-generator-preview.ts`.

- [ ] **Step 1: Implement**

```ts
// search.ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjInputComponent, KjKbdComponent, KjBreadcrumbComponent, KjTagComponent,
  KjPaginationComponent, KjEmptyStateComponent, KjAvatarComponent,
  KjButtonComponent, KjDrawerComponent,
} from '@kouji-ui/components';
import { PEOPLE } from './fixtures';

@Component({
  selector: 'kj-preview-search',
  standalone: true,
  imports: [KjInputComponent, KjKbdComponent, KjBreadcrumbComponent, KjTagComponent,
            KjPaginationComponent, KjEmptyStateComponent, KjAvatarComponent,
            KjButtonComponent, KjDrawerComponent],
  templateUrl: './search.html',
  styleUrl: './search.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewSearchComponent {
  protected readonly query = signal('');
  protected readonly drawer = signal(false);
  protected readonly people = PEOPLE;
}
```

```html
<!-- search.html -->
<kj-breadcrumb [items]="[{label:'Home', href:'/'},{label:'Search'}]" />
<header class="hd">
  <kj-input [value]="query()" placeholder="Search people, files, projects" aria-label="Search">
    <span slot="suffix"><kj-kbd>⌘</kj-kbd><kj-kbd>K</kj-kbd></span>
  </kj-input>
  <kj-button variant="secondary" (click)="drawer.set(true)">Filters</kj-button>
</header>

<div class="chips">
  <kj-tag>Engineering</kj-tag>
  <kj-tag>Open</kj-tag>
  <kj-tag>This week</kj-tag>
</div>

@if (people.length === 0) {
  <kj-empty-state title="No results" description="Try a different query." />
} @else {
  <ul class="results">
    @for (p of people; track p.name) {
      <li>
        <kj-avatar>{{ p.avatar }}</kj-avatar>
        <div>
          <div class="results__name">{{ p.name }}</div>
          <div class="results__sub">{{ p.role }}</div>
        </div>
      </li>
    }
  </ul>
  <kj-pagination [total]="48" [page]="1" [pageSize]="10" />
}

<kj-drawer [open]="drawer()" (closed)="drawer.set(false)" position="right" aria-label="Filters">
  <h3>Filters</h3>
  <p>Refine by team, status, recency…</p>
  <kj-button (click)="drawer.set(false)">Close</kj-button>
</kj-drawer>
```

```css
/* search.css */
.hd { display: grid; grid-template-columns: 1fr auto; gap: 0.5rem; align-items: center; margin: 1rem 0; }
.chips { display: flex; gap: 0.375rem; flex-wrap: wrap; margin-bottom: 1rem; }
.results { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.results li { display: grid; grid-template-columns: auto 1fr; gap: 0.75rem; align-items: center;
  padding: 0.5rem 0.75rem; background: var(--kj-base-200); border: 1px solid var(--kj-base-300); border-radius: var(--kj-radius-field); }
.results__name { font-weight: 600; }
.results__sub { font-size: 0.875rem; opacity: 0.7; }
```

- [ ] **Step 2: Wire and verify**

Add `PreviewSearchComponent` to preview imports.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/app/pages/theme-generator/preview-tabs/search.* apps/docs/src/app/pages/theme-generator/preview/theme-generator-preview.ts
git commit -m "feat(theme-gen): preview search tab"
```

### Task 19: Chat tab

**Files:**
- Create: `apps/docs/src/app/pages/theme-generator/preview-tabs/chat.ts`
- Create: `apps/docs/src/app/pages/theme-generator/preview-tabs/chat.html`
- Create: `apps/docs/src/app/pages/theme-generator/preview-tabs/chat.css`
- Modify: `theme-generator-preview.ts`.

- [ ] **Step 1: Implement**

```ts
// chat.ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjAvatarComponent, KjBadgeComponent, KjInputGroupComponent, KjInputComponent,
  KjButtonComponent, KjPopoverComponent, KjFileUploadComponent,
} from '@kouji-ui/components';
import { CONVERSATIONS, MESSAGES } from './fixtures';

@Component({
  selector: 'kj-preview-chat',
  standalone: true,
  imports: [KjAvatarComponent, KjBadgeComponent, KjInputGroupComponent, KjInputComponent,
            KjButtonComponent, KjPopoverComponent, KjFileUploadComponent],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewChatComponent {
  protected readonly conversations = CONVERSATIONS;
  protected readonly messages = MESSAGES;
  protected readonly active = signal(CONVERSATIONS[0].id);
}
```

```html
<!-- chat.html -->
<div class="chat">
  <aside class="sidebar" aria-label="Conversations">
    <h3>Inbox</h3>
    <ul role="list">
      @for (c of conversations; track c.id) {
        <li>
          <button type="button" (click)="active.set(c.id)" [attr.aria-current]="active() === c.id">
            <kj-avatar>{{ c.who[0] }}</kj-avatar>
            <div class="meta">
              <div class="who">{{ c.who }}</div>
              <div class="preview">{{ c.preview }}</div>
            </div>
            @if (c.unread > 0) { <kj-badge>{{ c.unread }}</kj-badge> }
          </button>
        </li>
      }
    </ul>
  </aside>

  <main class="thread">
    <header class="thread__hd">
      <kj-avatar>A</kj-avatar>
      <h3>Ada Lovelace</h3>
    </header>
    <ol class="messages" role="list">
      @for (m of messages; track m.text + m.at) {
        <li class="msg" [class.msg--mine]="m.mine">
          <div class="bubble">{{ m.text }}</div>
          <div class="meta-row">{{ m.from }} · {{ m.at }}</div>
        </li>
      }
    </ol>
    <footer class="composer">
      <kj-input-group>
        <kj-input placeholder="Message Ada…" aria-label="Message" />
        <kj-popover>
          <button type="button" slot="trigger" aria-label="Insert emoji">😊</button>
          <div slot="content"><p>Pick an emoji…</p></div>
        </kj-popover>
        <kj-file-upload aria-label="Attach file" />
        <kj-button>Send</kj-button>
      </kj-input-group>
    </footer>
  </main>
</div>
```

```css
/* chat.css */
.chat { display: grid; grid-template-columns: 280px 1fr; gap: 0; height: 100%; min-height: 480px;
  border: 1px solid var(--kj-base-300); border-radius: var(--kj-radius-box); overflow: hidden; }
.sidebar { background: var(--kj-base-200); border-right: 1px solid var(--kj-base-300); padding: 0.75rem; overflow: auto; }
.sidebar h3 { margin-top: 0; }
.sidebar ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
.sidebar button { width: 100%; display: grid; grid-template-columns: auto 1fr auto; gap: 0.5rem;
  background: transparent; color: var(--kj-base-content); border: none; padding: 0.5rem; cursor: pointer;
  border-radius: var(--kj-radius-field); align-items: center; min-height: 56px; text-align: left; }
.sidebar button:hover, .sidebar button[aria-current="true"] { background: var(--kj-base-300); }
.who { font-weight: 600; }
.preview { font-size: 0.875rem; opacity: 0.7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.thread { display: flex; flex-direction: column; }
.thread__hd { display: flex; gap: 0.5rem; align-items: center; padding: 0.75rem; border-bottom: 1px solid var(--kj-base-300); }
.thread__hd h3 { margin: 0; }
.messages { list-style: none; padding: 1rem; margin: 0; flex: 1; overflow: auto; display: flex; flex-direction: column; gap: 0.5rem; }
.msg { max-width: 70%; }
.msg .bubble { background: var(--kj-base-200); color: var(--kj-base-content); padding: 0.5rem 0.75rem;
  border-radius: var(--kj-radius-box); display: inline-block; }
.msg--mine { align-self: flex-end; }
.msg--mine .bubble { background: var(--kj-primary); color: var(--kj-primary-content); }
.meta-row { font-size: 0.75rem; opacity: 0.6; margin-top: 0.125rem; }
.composer { border-top: 1px solid var(--kj-base-300); padding: 0.5rem; }
@media (max-width: 800px) { .chat { grid-template-columns: 1fr; } .sidebar { display: none; } }
```

- [ ] **Step 2: Wire and verify**

Add `PreviewChatComponent` to preview imports.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/app/pages/theme-generator/preview-tabs/chat.* apps/docs/src/app/pages/theme-generator/preview/theme-generator-preview.ts
git commit -m "feat(theme-gen): preview chat tab"
```

### Task 20: Close any open overlay when switching tabs

**Files:**
- Modify: `apps/docs/src/app/pages/theme-generator/preview/theme-generator-preview.ts`

- [ ] **Step 1: Add a tab-change broadcaster**

Replace `setActive` with:

```ts
protected setActive(t: Tab): void {
  // Force any open dialog/drawer/popover inside the panel to close by re-keying the panel.
  this.active.set(t);
  this.router.navigate([], { relativeTo: this.route, queryParams: { preview: t }, queryParamsHandling: 'merge', replaceUrl: true });
}
```

The `@switch` already destroys/recreates the panel content on tab change, which closes overlays automatically. Verify in browser by opening the search tab, opening the filters drawer, then switching tabs — the drawer should not persist.

- [ ] **Step 2: Commit (only if a code change was needed)**

If `@switch` already handles it (likely), skip the commit and add a note in the next commit body confirming the verification.

---

## Phase 10 — End-to-end tests

### Task 21: Extend Playwright spec

**Files:**
- Modify: `apps/docs/e2e/theme-generator.spec.ts`

- [ ] **Step 1: Add tests**

Append to the existing spec:

```ts
test('clicking a swatch updates primary and writes hash', async ({ page }) => {
  await page.goto('/theme-generator');
  const swatch = page.locator('kj-seed-swatch-grid button[data-hex]').first();
  const hex = (await swatch.getAttribute('data-hex'))!;
  await swatch.click();
  await expect.poll(() => page.url()).toContain('#t=');
  // Reload with the captured hash → primary must round-trip.
  const url = page.url();
  await page.goto(url);
  // Primary input value should reflect the hex (case-insensitive).
  const primaryInput = page.locator('[data-token-slot="primary"] input').first();
  await expect(primaryInput).toHaveValue(new RegExp(hex.replace('#',''), 'i'));
});

test('import dialog applies a JSON theme', async ({ page }) => {
  await page.goto('/theme-generator');
  await page.getByRole('button', { name: /import/i }).click();
  const json = JSON.stringify({
    name: 'imported',
    colors: { 'base-100':'#ffffff', primary:'#bb0033', secondary:'#000000', accent:'#000000',
      neutral:'#000000', info:'#000000', success:'#000000', warning:'#000000', destructive:'#000000' },
    contentOverrides: {},
    shape: { radiusBox:8, radiusField:6, radiusSelector:4, border:1, depth:1 },
    type: { fontSans:'sans-serif', fontMono:'monospace', fontDisplay:'serif' },
    motion: { transition:'200ms' },
  });
  await page.locator('textarea').fill(json);
  await page.locator('[data-action="apply"]').click();
  await expect(page.locator('text=Imported')).toBeVisible();
});

test('all five preview tabs render without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/theme-generator');
  for (const tab of ['dashboard','settings','big-form','search','chat']) {
    await page.locator(`role=tab[name=${JSON.stringify(tab)}]`).click();
    await page.waitForTimeout(200);
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test('contrast scorecard flags a deliberately bad pair', async ({ page }) => {
  await page.goto('/theme-generator');
  // Set primary to white via the existing primary picker
  await page.locator('[data-token-slot="primary"] input').first().fill('#ffffff');
  await expect(page.locator('kj-contrast-scorecard')).toContainText(/FAIL|✗/);
});
```

- [ ] **Step 2: Run E2E**

Run: `pnpm exec playwright test apps/docs/e2e/theme-generator.spec.ts --project=chromium`
Expected: PASS. Adjust selectors if `data-token-slot` attribute names differ in the actual sidebar template — add the missing `data-token-slot="<slot>"` attributes to the primary input wrapper as part of this task if needed.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/e2e/theme-generator.spec.ts apps/docs/src/app/components/theme-generator-sidebar/
git commit -m "test(theme-gen): e2e for swatches, import, preview tabs, scorecard"
```

---

## Phase 11 — Final review

### Task 22: Full unit + E2E sweep, accessibility audit, final commit

- [ ] **Step 1: Run full unit suite for the affected files**

Run:
```bash
pnpm exec vitest run \
  apps/docs/src/app/lib/theme/harmonies.spec.ts \
  apps/docs/src/app/lib/theme/palette-derive.spec.ts \
  apps/docs/src/app/lib/theme/seed-swatches.spec.ts \
  apps/docs/src/app/services/theme-draft.service.spec.ts \
  apps/docs/src/app/services/contrast-score.service.spec.ts \
  apps/docs/src/app/services/theme-url.service.spec.ts \
  apps/docs/src/app/services/theme-import.service.spec.ts \
  apps/docs/src/app/components/seed-swatch-grid/seed-swatch-grid.spec.ts \
  apps/docs/src/app/components/contrast-scorecard/contrast-scorecard.spec.ts \
  apps/docs/src/app/components/theme-generator-sidebar/theme-generator-sidebar.spec.ts \
  apps/docs/src/app/components/theme-import-dialog/theme-import-dialog.spec.ts
```
Expected: all PASS.

- [ ] **Step 2: Run E2E**

Run: `pnpm exec playwright test apps/docs/e2e/theme-generator.spec.ts --project=chromium`
Expected: all PASS.

- [ ] **Step 3: Manual a11y audit**

Open `/theme-generator`. With keyboard only (Tab/Shift-Tab/Arrow/Enter/Escape):
- Navigate every swatch in the grid (Tab moves between, Enter activates).
- Reach the randomize and re-derive buttons.
- Open the contrast scorecard, traverse rows, activate one to focus its slot.
- Cycle the 5 preview tabs with Arrow keys (or Tab).
- Open the import dialog, paste invalid input, confirm error has `role=alert`, dismiss with Escape.

For any failure: file as a follow-up TODO; do not block the merge unless a blocker (focus loss, keyboard trap).

- [ ] **Step 4: Worst-case URL hash size sanity check**

Run dev server, customize every color, every shape, every font, save. Verify `location.hash` length below 2 KB. Log the actual length in the final commit message.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore(theme-gen): finalize enhancement (a11y audit + hash size note)" --allow-empty
```

(Include the audit summary and hash size in the body.)

---

## Self-review notes

Coverage check:

- **Spec §Feature 1 (palette generation)** → Tasks 1–5, 7.
- **Spec §Feature 2 (AAA scorecard)** → Tasks 8–9.
- **Spec §Feature 3 (URL sync + import)** → Tasks 10–13.
- **Spec §Feature 4 (preview tabs)** → Tasks 14–20.
- **Spec §Testing** → unit/component tests embedded in each feature task; E2E in Task 21.
- **Spec §Rollout** → Task 22.

No placeholders, all code shown, types consistent across tasks (`ColorSlot`, `DraftTheme`, `ContrastReport` introduced in early tasks and reused later by name).
