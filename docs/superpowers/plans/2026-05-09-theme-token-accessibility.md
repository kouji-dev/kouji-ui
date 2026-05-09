# Theme-token accessibility report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure, versioned theme-token accessibility report (`buildThemeA11yReport`) covering contrast, non-text, and typography checks, refactor `ContrastScoreService` to delegate, and refactor the scorecard UI to consume grouped results.

**Architecture:** New pure module at `apps/docs/src/app/lib/theme/theme-a11y-report.ts` consumes `ResolvedTokens` + `DraftTheme.typography` and returns a typed `ThemeA11yReport`. `ContrastScoreService` becomes a thin Angular wrapper around the pure builder. `ContrastScorecard` renders three groups (Contrast / Non-text / Typography) bound to named summary fields.

**Tech Stack:** TypeScript, Angular 20 (signals + DI), `culori` (CSS color parsing — already a dep), `vitest` for unit tests, Zod for draft schema (already a dep).

**Spec:** [`docs/superpowers/specs/2026-05-09-theme-token-accessibility-design.md`](../specs/2026-05-09-theme-token-accessibility-design.md)

---

## File Structure

**Create**

- `apps/docs/src/app/lib/theme/theme-a11y-report.ts` — pure builder + types
- `apps/docs/src/app/lib/theme/theme-a11y-report.spec.ts` — unit tests for builder

**Modify**

- `apps/docs/src/app/lib/theme/types.ts` — add `TypographyKey`, extend `DraftTheme` and `ResolvedTokens`
- `apps/docs/src/app/lib/theme/import-schema.ts` — add `typography` Zod schema with defaults
- `apps/docs/src/app/lib/theme/built-in-themes.ts` — add `typography` to all 6 built-ins
- `apps/docs/src/app/lib/theme/derive-tokens.ts` — copy `typography` into `ResolvedTokens`
- `apps/docs/src/app/lib/theme/serialize-theme.ts` — emit `--kj-text-body` / `--kj-text-small`
- `apps/docs/src/app/services/theme-draft.service.ts` — extend `BLANK_DRAFT`, add `setTypography(...)` method
- `apps/docs/src/app/services/contrast-score.service.ts` — delegate to pure builder; keep `ratio` / `verdict` helpers
- `apps/docs/src/app/services/contrast-score.service.spec.ts` — update assertions for new surface
- `apps/docs/src/app/components/contrast-scorecard/contrast-scorecard.ts` — consume new report shape
- `apps/docs/src/app/components/contrast-scorecard/contrast-scorecard.html` — group rows + named summaries
- `apps/docs/src/app/components/contrast-scorecard/contrast-scorecard.css` — minor styling for group headings
- `apps/docs/e2e/theme-generator.spec.ts` — update copy assertion (text strings)

---

## Task 1: Extend types for typography

**Files:**
- Modify: `apps/docs/src/app/lib/theme/types.ts`

- [ ] **Step 1: Update types**

```ts
export type ColorSlot =
  | 'base-100' | 'primary' | 'secondary' | 'accent' | 'neutral'
  | 'info' | 'success' | 'warning' | 'destructive';

export type ContentSlot =
  | 'base-200' | 'base-300'
  | 'base-content'
  | 'primary-content' | 'secondary-content' | 'accent-content' | 'neutral-content'
  | 'info-content' | 'success-content' | 'warning-content' | 'destructive-content';

export type ShapeKey      = 'radiusBox' | 'radiusField' | 'radiusSelector' | 'border' | 'depth';
export type FontKey       = 'fontSans'  | 'fontMono'    | 'fontDisplay';
export type MotionKey     = 'transition';
export type TypographyKey = 'bodyRem'   | 'smallRem';

export interface DraftTheme {
  name: string;
  colors: Record<ColorSlot, string>;
  contentOverrides: Partial<Record<ContentSlot, string>>;
  shape:      Record<ShapeKey, number>;
  type:       Record<FontKey, string>;
  typography: Record<TypographyKey, number>; // rem (e.g. 1, 0.875)
  motion:     Record<MotionKey, string>;
}

export interface ResolvedTokens {
  colors: Record<ColorSlot, string>;
  derivedBase: { base200: string; base300: string };
  contents: Record<ContentSlot, string>;
  shape:      Record<ShapeKey, string>;
  type:       Record<FontKey, string>;
  typography: Record<TypographyKey, string>; // serialized w/ unit, e.g. "1rem"
  motion:     Record<MotionKey, string>;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/docs/src/app/lib/theme/types.ts
git commit -m "feat(theme): add typography field to DraftTheme and ResolvedTokens"
```

---

## Task 2: Default typography on all built-in themes

**Files:**
- Modify: `apps/docs/src/app/lib/theme/built-in-themes.ts`

- [ ] **Step 1: Add a shared default + spread it onto every built-in**

Add the constant near the top:

```ts
const SHARED_TYPOGRAPHY = { bodyRem: 1, smallRem: 0.875 };
```

Then add `typography: SHARED_TYPOGRAPHY` to each entry in `BUILT_IN_THEMES`. After this change every theme object in the file must include the new field.

Example for `light`:

```ts
light: {
  name: 'light',
  shape: SHARED_SHAPE, type: SHARED_TYPE, motion: FAST,
  typography: SHARED_TYPOGRAPHY,
  contentOverrides: {},
  colors: { /* unchanged */ },
},
```

Apply identically to `dark`, `kouji`, `retro`, `cyberpunk`, `corporate`.

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @kouji-ui/docs typecheck`
Expected: passes (file matches new `DraftTheme`).

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/app/lib/theme/built-in-themes.ts
git commit -m "feat(theme): default typography (1rem/0.875rem) for built-in themes"
```

---

## Task 3: Extend Zod schema with typography defaults

**Files:**
- Modify: `apps/docs/src/app/lib/theme/import-schema.ts`

- [ ] **Step 1: Update schema**

```ts
import { z } from 'zod';

const COLOR_SLOTS = [
  'base-100','primary','secondary','accent','neutral','info','success','warning','destructive',
] as const;

const CONTENT_SLOTS = [
  'base-200', 'base-300',
  'base-content',
  'primary-content','secondary-content','accent-content','neutral-content',
  'info-content','success-content','warning-content','destructive-content',
] as const;

const colorsObj = z.object(
  Object.fromEntries(COLOR_SLOTS.map(s => [s, z.string()])) as Record<typeof COLOR_SLOTS[number], z.ZodString>,
);

const contentsObj = z.object(
  Object.fromEntries(CONTENT_SLOTS.map(s => [s, z.string().optional()])) as Record<typeof CONTENT_SLOTS[number], z.ZodOptional<z.ZodString>>,
);

const typographyObj = z.object({
  bodyRem:  z.number().positive().default(1),
  smallRem: z.number().positive().default(0.875),
});

export const DraftThemeSchema = z.object({
  name: z.string().max(32),
  colors: colorsObj,
  contentOverrides: contentsObj.optional().default({}),
  shape: z.object({
    radiusBox: z.number(),
    radiusField: z.number(),
    radiusSelector: z.number(),
    border: z.number(),
    depth: z.number(),
  }),
  type:       z.object({ fontSans: z.string(), fontMono: z.string(), fontDisplay: z.string() }),
  typography: typographyObj.optional().default({ bodyRem: 1, smallRem: 0.875 }),
  motion:     z.object({ transition: z.string() }),
});

export type ParsedDraft = z.infer<typeof DraftThemeSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add apps/docs/src/app/lib/theme/import-schema.ts
git commit -m "feat(theme): zod schema for typography with defaults"
```

---

## Task 4: Resolve typography in `deriveTokens` + serialize CSS vars

**Files:**
- Modify: `apps/docs/src/app/lib/theme/derive-tokens.ts`
- Modify: `apps/docs/src/app/lib/theme/serialize-theme.ts`

- [ ] **Step 1: Update `deriveTokens` return value**

Add at the bottom of the existing return object inside `deriveTokens`:

```ts
return {
  colors: draft.colors,
  derivedBase: { base200, base300 },
  contents,
  shape: {
    radiusBox:      `${draft.shape.radiusBox}px`,
    radiusField:    `${draft.shape.radiusField}px`,
    radiusSelector: `${draft.shape.radiusSelector}px`,
    border:         `${draft.shape.border}px`,
    depth:          `${draft.shape.depth}`,
  },
  type:   draft.type,
  typography: {
    bodyRem:  `${draft.typography.bodyRem}rem`,
    smallRem: `${draft.typography.smallRem}rem`,
  },
  motion: draft.motion,
};
```

- [ ] **Step 2: Update `serializeToScopedBlock`**

Inside the function, after the motion line, append:

```ts
lines.push(`--kj-text-body: ${t.typography.bodyRem};`);
lines.push(`--kj-text-small: ${t.typography.smallRem};`);
```

- [ ] **Step 3: Type-check + run docs unit tests**

Run: `pnpm --filter @kouji-ui/docs test`
Expected: pre-existing tests still pass; if a test imports a stale `ResolvedTokens` shape, fix the test fixture by adding `typography: { bodyRem: '1rem', smallRem: '0.875rem' }`.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/app/lib/theme/derive-tokens.ts apps/docs/src/app/lib/theme/serialize-theme.ts
git commit -m "feat(theme): resolve and serialize typography tokens"
```

---

## Task 5: Wire typography in `ThemeDraftService`

**Files:**
- Modify: `apps/docs/src/app/services/theme-draft.service.ts`

- [ ] **Step 1: Extend `BLANK_DRAFT` and import the new key type**

Find:

```ts
import type { DraftTheme, ColorSlot, ContentSlot, ShapeKey, FontKey, MotionKey } from '../lib/theme/types';
```

Replace with:

```ts
import type { DraftTheme, ColorSlot, ContentSlot, ShapeKey, FontKey, MotionKey, TypographyKey } from '../lib/theme/types';
```

In `BLANK_DRAFT`, add the new field (after `motion`):

```ts
const BLANK_DRAFT: DraftTheme = {
  name: '',
  colors: { ...BUILT_IN_THEMES.light.colors },
  contentOverrides: {},
  shape:      { ...BUILT_IN_THEMES.light.shape },
  type:       { ...BUILT_IN_THEMES.light.type },
  typography: { ...BUILT_IN_THEMES.light.typography },
  motion:     { ...BUILT_IN_THEMES.light.motion },
};
```

- [ ] **Step 2: Add a setter near other slot setters (e.g. after `setMotion`)**

```ts
setTypography(key: TypographyKey, value: number): void {
  this._draft.update(d => ({ ...d, typography: { ...d.typography, [key]: value } }));
  this.persistDraft();
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @kouji-ui/docs typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/app/services/theme-draft.service.ts
git commit -m "feat(theme): setTypography in draft service"
```

---

## Task 6: Pure report builder — types + skeleton

**Files:**
- Create: `apps/docs/src/app/lib/theme/theme-a11y-report.ts`

- [ ] **Step 1: Create the file with public types and helpers**

```ts
import { converter } from 'culori';
import type { DraftTheme, ResolvedTokens } from './types';

const toRgb = converter('rgb');

/** Increment when edge lists, assumptions, or thresholds change. */
export const REPORT_VERSION = 1;

export type EdgeRequirement = 'AAA-normal' | 'non-text';
export type Verdict         = 'AAA' | 'AA' | 'AA-Large' | 'FAIL';

export interface Edge {
  id: string;
  fgToken: string;
  bgToken: string;
  fgCss: string;
  bgCss: string;
  fgHex: string;
  bgHex: string;
  ratio: number;
  requirement: EdgeRequirement;
  requiredMin: number;        // 7 for AAA-normal, 3 for non-text
  verdict: Verdict;
  pass: boolean;
  message: string;            // plain-language explanation
}

export type TypographySeverity = 'warn' | 'fail';

export interface TypographyCheck {
  id: string;
  message: string;
  severity: TypographySeverity;
  pass: boolean;
}

export interface ThemeA11yReport {
  reportVersion: number;
  contrastEdges: Edge[];      // AAA-normal targets
  nonTextEdges:  Edge[];      // non-text targets
  typographyChecks: TypographyCheck[];
  summary: {
    aaaNormalPass: number;
    aaaNormalTotal: number;
    nonTextPass: number;
    nonTextTotal: number;
    typographyWarn: number;
    worstRatio: number;       // smallest ratio across all edges
    worstEdgeId: string | null;
  };
}

/** Relative luminance per WCAG 2.x. Input must be a CSS color culori can parse. */
export function relativeLuminance(css: string): number {
  const c = toRgb(css);
  if (!c) return 0;
  const lin = (x: number) => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

/** WCAG 2.x contrast ratio between two CSS colors. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Map a ratio to a coarse verdict label (used for UI badges). */
export function verdictFor(ratio: number): Verdict {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA-Large';
  return 'FAIL';
}

/** Convert a CSS color to a 6-char hex string for chip backgrounds. */
export function cssToHex(css: string): string {
  if (css.startsWith('#') && css.length === 7) return css;
  const c = toRgb(css);
  if (!c) return '#000000';
  const to = (n: number) => Math.max(0, Math.min(255, Math.round(n * 255))).toString(16).padStart(2, '0');
  return `#${to(c.r)}${to(c.g)}${to(c.b)}`;
}

// Builder is added in the next task.
export function buildThemeA11yReport(_resolved: ResolvedTokens, _draft: DraftTheme): ThemeA11yReport {
  throw new Error('not implemented');
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/docs/src/app/lib/theme/theme-a11y-report.ts
git commit -m "feat(a11y): types + WCAG helpers for theme report"
```

---

## Task 7: Builder — contrast edges (Track A) — TDD

**Files:**
- Create: `apps/docs/src/app/lib/theme/theme-a11y-report.spec.ts`
- Modify: `apps/docs/src/app/lib/theme/theme-a11y-report.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, test } from 'vitest';
import { buildThemeA11yReport, REPORT_VERSION } from './theme-a11y-report';
import { BUILT_IN_THEMES } from './built-in-themes';
import { deriveTokens } from './derive-tokens';

describe('buildThemeA11yReport — contrast edges', () => {
  test('returns the current reportVersion', () => {
    const draft = BUILT_IN_THEMES.light;
    const report = buildThemeA11yReport(deriveTokens(draft), draft);
    expect(report.reportVersion).toBe(REPORT_VERSION);
  });

  test('includes the 11 AAA-normal semantic pairs + 2 primary-on-base rows', () => {
    const draft = BUILT_IN_THEMES.light;
    const report = buildThemeA11yReport(deriveTokens(draft), draft);
    const ids = report.contrastEdges.map(e => e.id);
    expect(ids).toContain('base-content/base-100');
    expect(ids).toContain('base-content/base-200');
    expect(ids).toContain('base-content/base-300');
    expect(ids).toContain('primary-content/primary');
    expect(ids).toContain('primary/base-100');
    expect(ids).toContain('primary/base-200');
    expect(report.contrastEdges.every(e => e.requirement === 'AAA-normal')).toBe(true);
    expect(report.contrastEdges.every(e => e.requiredMin === 7)).toBe(true);
  });

  test('flags primary-on-base failure when primary equals base-100', () => {
    const draft = structuredClone(BUILT_IN_THEMES.light);
    draft.colors.primary = draft.colors['base-100'];
    const report = buildThemeA11yReport(deriveTokens(draft), draft);
    const edge = report.contrastEdges.find(e => e.id === 'primary/base-100')!;
    expect(edge.pass).toBe(false);
    expect(edge.ratio).toBeCloseTo(1, 1);
    expect(edge.message).toMatch(/7:1/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @kouji-ui/docs test theme-a11y-report`
Expected: FAIL with `not implemented`.

- [ ] **Step 3: Implement contrast-edge logic in the builder**

Replace the placeholder `buildThemeA11yReport` body in `theme-a11y-report.ts`:

```ts
interface PairSpec {
  fg: string;
  bg: string;
}

const AAA_NORMAL_PAIRS: PairSpec[] = [
  // body / surfaces
  { fg: 'base-content', bg: 'base-100' },
  { fg: 'base-content', bg: 'base-200' },
  { fg: 'base-content', bg: 'base-300' },
  // *-content on fills
  { fg: 'primary-content',     bg: 'primary' },
  { fg: 'secondary-content',   bg: 'secondary' },
  { fg: 'accent-content',      bg: 'accent' },
  { fg: 'neutral-content',     bg: 'neutral' },
  { fg: 'info-content',        bg: 'info' },
  { fg: 'success-content',     bg: 'success' },
  { fg: 'warning-content',     bg: 'warning' },
  { fg: 'destructive-content', bg: 'destructive' },
  // primary on base — strict AAA per spec
  { fg: 'primary', bg: 'base-100' },
  { fg: 'primary', bg: 'base-200' },
];

function lookupCss(tokens: ResolvedTokens, name: string): string {
  const c  = tokens.colors   as Record<string, string>;
  const cn = tokens.contents as Record<string, string>;
  if (name in c)  return c[name];
  if (name in cn) return cn[name];
  if (name === 'base-200') return tokens.derivedBase.base200;
  if (name === 'base-300') return tokens.derivedBase.base300;
  return '#000000';
}

function makeContrastEdge(tokens: ResolvedTokens, p: PairSpec): Edge {
  const fgCss = lookupCss(tokens, p.fg);
  const bgCss = lookupCss(tokens, p.bg);
  const ratio = contrastRatio(fgCss, bgCss);
  const verdict = verdictFor(ratio);
  const requiredMin = 7;
  const pass = ratio >= requiredMin;
  const message = pass
    ? `${p.fg} on ${p.bg}: ${ratio.toFixed(2)}:1 (passes AAA 7:1)`
    : `${p.fg} on ${p.bg}: ${ratio.toFixed(2)}:1 — need 7:1 for AAA normal text`;
  return {
    id: `${p.fg}/${p.bg}`,
    fgToken: p.fg, bgToken: p.bg,
    fgCss, bgCss,
    fgHex: cssToHex(fgCss), bgHex: cssToHex(bgCss),
    ratio, requirement: 'AAA-normal', requiredMin,
    verdict, pass, message,
  };
}

export function buildThemeA11yReport(resolved: ResolvedTokens, _draft: DraftTheme): ThemeA11yReport {
  const contrastEdges = AAA_NORMAL_PAIRS.map(p => makeContrastEdge(resolved, p));

  const aaaNormalTotal = contrastEdges.length;
  const aaaNormalPass  = contrastEdges.filter(e => e.pass).length;

  const allEdges = contrastEdges;
  const worst = allEdges.reduce<Edge | null>(
    (m, e) => (m === null || e.ratio < m.ratio) ? e : m,
    null,
  );

  return {
    reportVersion: REPORT_VERSION,
    contrastEdges,
    nonTextEdges: [],
    typographyChecks: [],
    summary: {
      aaaNormalPass, aaaNormalTotal,
      nonTextPass: 0, nonTextTotal: 0,
      typographyWarn: 0,
      worstRatio: worst ? worst.ratio : 1,
      worstEdgeId: worst ? worst.id : null,
    },
  };
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `pnpm --filter @kouji-ui/docs test theme-a11y-report`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/lib/theme/theme-a11y-report.ts apps/docs/src/app/lib/theme/theme-a11y-report.spec.ts
git commit -m "feat(a11y): build contrast edges (AAA 7:1) for theme report"
```

---

## Task 8: Builder — non-text edges (Track B) — TDD

**Files:**
- Modify: `apps/docs/src/app/lib/theme/theme-a11y-report.ts`
- Modify: `apps/docs/src/app/lib/theme/theme-a11y-report.spec.ts`

- [ ] **Step 1: Add failing test**

Append to the spec file (inside the existing `describe`):

```ts
test('includes non-text edges base-300 vs base-100 and base-300 vs base-200 at 3:1', () => {
  const draft = BUILT_IN_THEMES.light;
  const report = buildThemeA11yReport(deriveTokens(draft), draft);
  const ids = report.nonTextEdges.map(e => e.id);
  expect(ids).toEqual(['base-300/base-100', 'base-300/base-200']);
  expect(report.nonTextEdges.every(e => e.requirement === 'non-text')).toBe(true);
  expect(report.nonTextEdges.every(e => e.requiredMin === 3)).toBe(true);
  expect(report.summary.nonTextTotal).toBe(2);
  expect(report.summary.nonTextPass).toBeGreaterThanOrEqual(0);
  expect(report.summary.nonTextPass).toBeLessThanOrEqual(2);
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm --filter @kouji-ui/docs test theme-a11y-report`
Expected: FAIL — `nonTextEdges` is empty.

- [ ] **Step 3: Implement non-text edges**

In `theme-a11y-report.ts`, add the spec list and helper near the existing pair list:

```ts
const NON_TEXT_PAIRS: PairSpec[] = [
  { fg: 'base-300', bg: 'base-100' },
  { fg: 'base-300', bg: 'base-200' },
];

function makeNonTextEdge(tokens: ResolvedTokens, p: PairSpec): Edge {
  const fgCss = lookupCss(tokens, p.fg);
  const bgCss = lookupCss(tokens, p.bg);
  const ratio = contrastRatio(fgCss, bgCss);
  const verdict = verdictFor(ratio);
  const requiredMin = 3;
  const pass = ratio >= requiredMin;
  const message = pass
    ? `${p.fg} on ${p.bg}: ${ratio.toFixed(2)}:1 (passes non-text 3:1)`
    : `${p.fg} on ${p.bg}: ${ratio.toFixed(2)}:1 — need 3:1 for UI / borders`;
  return {
    id: `${p.fg}/${p.bg}`,
    fgToken: p.fg, bgToken: p.bg,
    fgCss, bgCss,
    fgHex: cssToHex(fgCss), bgHex: cssToHex(bgCss),
    ratio, requirement: 'non-text', requiredMin,
    verdict, pass, message,
  };
}
```

In `buildThemeA11yReport`, replace the `nonTextEdges` line and update the worst calculation:

```ts
const nonTextEdges = NON_TEXT_PAIRS.map(p => makeNonTextEdge(resolved, p));
const nonTextTotal = nonTextEdges.length;
const nonTextPass  = nonTextEdges.filter(e => e.pass).length;

const allEdges = [...contrastEdges, ...nonTextEdges];
const worst = allEdges.reduce<Edge | null>(
  (m, e) => (m === null || e.ratio < m.ratio) ? e : m,
  null,
);
```

And in the returned object update the populated fields:

```ts
nonTextEdges,
summary: {
  aaaNormalPass, aaaNormalTotal,
  nonTextPass, nonTextTotal,
  typographyWarn: 0,
  worstRatio: worst ? worst.ratio : 1,
  worstEdgeId: worst ? worst.id : null,
},
```

- [ ] **Step 4: Run — expect pass**

Run: `pnpm --filter @kouji-ui/docs test theme-a11y-report`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/lib/theme/theme-a11y-report.ts apps/docs/src/app/lib/theme/theme-a11y-report.spec.ts
git commit -m "feat(a11y): non-text edges (3:1) under base-300 border assumption"
```

---

## Task 9: Builder — typography checks (Track C) — TDD

**Files:**
- Modify: `apps/docs/src/app/lib/theme/theme-a11y-report.ts`
- Modify: `apps/docs/src/app/lib/theme/theme-a11y-report.spec.ts`

- [ ] **Step 1: Add failing tests**

Append:

```ts
describe('buildThemeA11yReport — typography', () => {
  test('warns when bodyRem < 1 (i.e. < 16px at default root)', () => {
    const draft = structuredClone(BUILT_IN_THEMES.light);
    draft.typography.bodyRem = 0.75;
    const report = buildThemeA11yReport(deriveTokens(draft), draft);
    const warn = report.typographyChecks.find(c => c.id === 'body-min');
    expect(warn?.pass).toBe(false);
    expect(warn?.severity).toBe('warn');
    expect(report.summary.typographyWarn).toBeGreaterThanOrEqual(1);
  });

  test('passes when bodyRem >= 1 and smallRem <= bodyRem', () => {
    const draft = BUILT_IN_THEMES.light;
    const report = buildThemeA11yReport(deriveTokens(draft), draft);
    expect(report.typographyChecks.every(c => c.pass)).toBe(true);
    expect(report.summary.typographyWarn).toBe(0);
  });

  test('warns when smallRem > bodyRem', () => {
    const draft = structuredClone(BUILT_IN_THEMES.light);
    draft.typography.smallRem = 1.25;
    const report = buildThemeA11yReport(deriveTokens(draft), draft);
    const warn = report.typographyChecks.find(c => c.id === 'small-vs-body');
    expect(warn?.pass).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm --filter @kouji-ui/docs test theme-a11y-report`
Expected: FAIL.

- [ ] **Step 3: Implement typography checks**

Add inside `theme-a11y-report.ts`:

```ts
const BODY_MIN_REM = 1; // product policy — ~16px at default root

function buildTypographyChecks(draft: DraftTheme): TypographyCheck[] {
  const out: TypographyCheck[] = [];
  const body  = draft.typography.bodyRem;
  const small = draft.typography.smallRem;
  out.push({
    id: 'body-min',
    severity: 'warn',
    pass: body >= BODY_MIN_REM,
    message: body >= BODY_MIN_REM
      ? `bodyRem ${body} ≥ ${BODY_MIN_REM}rem`
      : `bodyRem ${body} < ${BODY_MIN_REM}rem (≈ 16px) — consider a larger default body size`,
  });
  out.push({
    id: 'small-vs-body',
    severity: 'warn',
    pass: small <= body,
    message: small <= body
      ? `smallRem ${small} ≤ bodyRem ${body}`
      : `smallRem ${small} > bodyRem ${body} — small text shouldn’t exceed body`,
  });
  return out;
}
```

Update `buildThemeA11yReport` to call it and include results:

```ts
const typographyChecks = buildTypographyChecks(_draft);
const typographyWarn   = typographyChecks.filter(c => !c.pass).length;
```

…and replace `typographyChecks: []` / `typographyWarn: 0` in the return object with the new values. Drop the leading underscore in the parameter:

```ts
export function buildThemeA11yReport(resolved: ResolvedTokens, draft: DraftTheme): ThemeA11yReport {
```

(also update the `buildTypographyChecks(_draft)` call to `buildTypographyChecks(draft)`).

- [ ] **Step 4: Run — expect pass**

Run: `pnpm --filter @kouji-ui/docs test theme-a11y-report`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/lib/theme/theme-a11y-report.ts apps/docs/src/app/lib/theme/theme-a11y-report.spec.ts
git commit -m "feat(a11y): typography checks (body min, small ≤ body)"
```

---

## Task 10: `ContrastScoreService` delegates to the pure builder

**Files:**
- Modify: `apps/docs/src/app/services/contrast-score.service.ts`
- Modify: `apps/docs/src/app/services/contrast-score.service.spec.ts`

- [ ] **Step 1: Replace the service body**

```ts
import { Injectable } from '@angular/core';
import type { ResolvedTokens, DraftTheme } from '../lib/theme/types';
import {
  buildThemeA11yReport,
  contrastRatio,
  verdictFor,
  type ThemeA11yReport,
  type Verdict,
} from '../lib/theme/theme-a11y-report';

@Injectable({ providedIn: 'root' })
export class ContrastScoreService {
  /** WCAG 2.x ratio between any two CSS colors. */
  ratio(a: string, b: string): number {
    return contrastRatio(a, b);
  }

  /** Coarse verdict label for a ratio. */
  verdict(r: number): Verdict {
    return verdictFor(r);
  }

  /** Build the full theme-token accessibility report. */
  buildReport(resolved: ResolvedTokens, draft: DraftTheme): ThemeA11yReport {
    return buildThemeA11yReport(resolved, draft);
  }
}
```

- [ ] **Step 2: Update spec assertions**

Replace the file contents:

```ts
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { ContrastScoreService } from './contrast-score.service';
import { ThemeDraftService } from './theme-draft.service';

describe('ContrastScoreService', () => {
  let svc: ContrastScoreService;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    svc = TestBed.inject(ContrastScoreService);
  });

  test('white on black is ~21:1', () => {
    expect(svc.ratio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  test('verdict thresholds', () => {
    expect(svc.verdict(7)).toBe('AAA');
    expect(svc.verdict(4.5)).toBe('AA');
    expect(svc.verdict(3)).toBe('AA-Large');
    expect(svc.verdict(2.99)).toBe('FAIL');
  });

  test('buildReport returns versioned report with edges + summary', () => {
    const draft = TestBed.inject(ThemeDraftService);
    draft.loadFork('kouji');
    const report = svc.buildReport(draft.resolvedTokens(), draft.draft());
    expect(report.reportVersion).toBe(1);
    expect(report.contrastEdges.length).toBeGreaterThanOrEqual(13);
    expect(report.nonTextEdges.length).toBe(2);
    expect(report.summary.aaaNormalTotal).toBe(report.contrastEdges.length);
  });

  test('flags primary-on-base failure when primary equals base-100', () => {
    const draft = TestBed.inject(ThemeDraftService);
    draft.loadFork('kouji');
    draft.setColor('primary', draft.draft().colors['base-100']);
    const report = svc.buildReport(draft.resolvedTokens(), draft.draft());
    const edge = report.contrastEdges.find(e => e.id === 'primary/base-100');
    expect(edge?.pass).toBe(false);
  });
});
```

- [ ] **Step 3: Run — expect pass**

Run: `pnpm --filter @kouji-ui/docs test contrast-score.service`
Expected: 4 tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/app/services/contrast-score.service.ts apps/docs/src/app/services/contrast-score.service.spec.ts
git commit -m "refactor(a11y): ContrastScoreService delegates to buildThemeA11yReport"
```

---

## Task 11: Refactor `ContrastScorecard` to grouped UI

**Files:**
- Modify: `apps/docs/src/app/components/contrast-scorecard/contrast-scorecard.ts`
- Modify: `apps/docs/src/app/components/contrast-scorecard/contrast-scorecard.html`
- Modify: `apps/docs/src/app/components/contrast-scorecard/contrast-scorecard.css`

- [ ] **Step 1: Update the component class**

```ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { ContrastScoreService } from '../../services/contrast-score.service';
import type { Edge, TypographyCheck } from '../../lib/theme/theme-a11y-report';

/** Live theme-token accessibility scorecard for the active draft.
 * Groups results into Contrast (AAA 7:1), Non-text (3:1), and Typography. */
@Component({
  selector: 'kj-contrast-scorecard',
  standalone: true,
  templateUrl: './contrast-scorecard.html',
  styleUrl: './contrast-scorecard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContrastScorecard {
  private readonly draftService = inject(ThemeDraftService);
  private readonly score = inject(ContrastScoreService);

  protected readonly report = computed(() =>
    this.score.buildReport(this.draftService.resolvedTokens(), this.draftService.draft()),
  );

  protected focusToken(slot: string): void {
    if (typeof document === 'undefined') return;
    const el = document.querySelector<HTMLElement>(`[data-token-slot="${slot}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus();
  }

  protected ariaForEdge(e: Edge): string {
    const verdict = e.pass ? `passes ${e.requirement}` : `fails ${e.requirement}`;
    return `${e.fgToken} on ${e.bgToken}, contrast ${e.ratio.toFixed(2)} to 1, ${verdict}`;
  }

  protected ariaForTypography(c: TypographyCheck): string {
    return `${c.id}: ${c.pass ? 'pass' : 'warning'} — ${c.message}`;
  }
}
```

- [ ] **Step 2: Update the template**

```html
<details class="scorecard" open>
  <summary>
    <span class="badge badge--aaa" aria-live="polite">
      AAA {{ report().summary.aaaNormalPass }}/{{ report().summary.aaaNormalTotal }}
    </span>
    <span class="badge badge--nontext">
      UI {{ report().summary.nonTextPass }}/{{ report().summary.nonTextTotal }}
    </span>
    <span class="badge badge--type">
      Type warn {{ report().summary.typographyWarn }}
    </span>
    <span class="badge badge--worst" [attr.title]="'Lowest ratio: ' + report().summary.worstRatio.toFixed(2) + ':1'">
      min {{ report().summary.worstRatio.toFixed(2) }}:1
    </span>
  </summary>

  <h3 class="group-heading">Contrast (AAA 7:1)</h3>
  <ul role="list" class="rows">
    @for (e of report().contrastEdges; track e.id) {
      <li role="listitem"
          class="row"
          [class.row--fail]="!e.pass"
          [attr.aria-label]="ariaForEdge(e)"
          (click)="focusToken(e.bgToken)"
          (keydown.enter)="focusToken(e.bgToken)"
          tabindex="0">
        <span class="chip" [style.background]="e.fgHex" aria-hidden="true"></span>
        <span class="chip" [style.background]="e.bgHex" aria-hidden="true"></span>
        <span class="row__label">{{ e.fgToken }} / {{ e.bgToken }}</span>
        <span class="row__ratio">{{ e.ratio.toFixed(2) }}:1</span>
        <span class="row__verdict">{{ e.pass ? '✓ ' + e.verdict : '✗ ' + e.verdict }}</span>
      </li>
    }
  </ul>

  <h3 class="group-heading">Non-text (3:1)</h3>
  <ul role="list" class="rows">
    @for (e of report().nonTextEdges; track e.id) {
      <li role="listitem"
          class="row"
          [class.row--fail]="!e.pass"
          [attr.aria-label]="ariaForEdge(e)"
          (click)="focusToken(e.bgToken)"
          (keydown.enter)="focusToken(e.bgToken)"
          tabindex="0">
        <span class="chip" [style.background]="e.fgHex" aria-hidden="true"></span>
        <span class="chip" [style.background]="e.bgHex" aria-hidden="true"></span>
        <span class="row__label">{{ e.fgToken }} / {{ e.bgToken }}</span>
        <span class="row__ratio">{{ e.ratio.toFixed(2) }}:1</span>
        <span class="row__verdict">{{ e.pass ? '✓' : '✗' }}</span>
      </li>
    }
  </ul>

  <h3 class="group-heading">Typography</h3>
  <ul role="list" class="rows">
    @for (c of report().typographyChecks; track c.id) {
      <li role="listitem"
          class="row row--type"
          [class.row--fail]="!c.pass"
          [attr.aria-label]="ariaForTypography(c)"
          tabindex="0">
        <span class="row__label">{{ c.id }}</span>
        <span class="row__verdict">{{ c.pass ? '✓' : '⚠' }}</span>
        <span class="row__message">{{ c.message }}</span>
      </li>
    }
  </ul>
</details>
```

- [ ] **Step 3: Add minor styles**

Append to `contrast-scorecard.css`:

```css
.group-heading {
  margin: 0.75rem 0 0.25rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: color-mix(in oklch, var(--kj-color-base-content) 60%, transparent);
}
.badge--nontext { background: var(--kj-color-info); color: var(--kj-color-info-content); }
.badge--type    { background: var(--kj-color-warning); color: var(--kj-color-warning-content); }
.badge--worst   { background: var(--kj-color-base-300); color: var(--kj-color-base-content); }
.row--type { grid-template-columns: auto auto 1fr; }
.row__message { font-size: 0.8125rem; color: color-mix(in oklch, var(--kj-color-base-content) 75%, transparent); }
```

- [ ] **Step 4: Run docs unit tests + a11y verification**

Run: `pnpm --filter @kouji-ui/docs test`
Expected: all docs tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/components/contrast-scorecard/
git commit -m "feat(a11y): grouped scorecard (Contrast / Non-text / Typography)"
```

---

## Task 12: Update e2e copy assertion

**Files:**
- Modify: `apps/docs/e2e/theme-generator.spec.ts`

- [ ] **Step 1: Update the regex (line 53)**

Change:

```ts
await expect(page.locator('kj-contrast-scorecard')).toContainText(/AAA \d+%/);
```

to:

```ts
await expect(page.locator('kj-contrast-scorecard')).toContainText(/AAA \d+\/\d+/);
```

- [ ] **Step 2: Run e2e**

Run: `pnpm --filter @kouji-ui/docs e2e --grep "contrast scorecard"`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/e2e/theme-generator.spec.ts
git commit -m "test(e2e): scorecard now shows pass/total instead of percent"
```

---

## Task 13: Final verification + changeset

**Files:**
- Create: `.changeset/theme-a11y-report.md`

- [ ] **Step 1: Add changeset**

```md
---
'@kouji-ui/docs': minor
---

theme generator: theme-token accessibility report (contrast map, non-text, typography) with grouped scorecard and AAA 7:1 strict primary-on-base rule.
```

- [ ] **Step 2: Run the full docs check**

Run: `pnpm --filter @kouji-ui/docs lint && pnpm --filter @kouji-ui/docs test && pnpm --filter @kouji-ui/docs typecheck`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add .changeset/theme-a11y-report.md
git commit -m "chore(changeset): theme-token a11y report"
```

---

## Self-review

- **Spec coverage:**
  - A — contrast map: Tasks 6–7 (edges, AAA-normal 7:1 incl. `primary` on `base-100/200`), Task 11 (UI grouping).
  - B — non-text: Task 8 (3:1, `base-300` vs surfaces with documented assumption).
  - C — typography: Tasks 1–5 (data model + draft service), Task 9 (warn checks), Task 11 (UI tab section).
  - Single pure builder: Task 6 entry point in `lib/theme`, Task 10 service delegation.
  - Versioning: `REPORT_VERSION` exported and asserted (Task 7).
  - Honest labeling: scorecard summary uses `pass/total` format (Tasks 11–12).

- **Placeholders:** None — every step shows code or commands.

- **Type consistency:** `ThemeA11yReport`, `Edge`, `TypographyCheck`, `Verdict`, `EdgeRequirement`, `REPORT_VERSION`, `buildThemeA11yReport`, `contrastRatio`, `verdictFor`, `cssToHex` all defined in Task 6 and consumed in Tasks 7–11. `TypographyKey` defined in Task 1 and used in Task 5.
