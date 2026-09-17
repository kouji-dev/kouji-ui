import { describe, expect, test } from 'vitest';
import { buildThemeA11yReport, REPORT_VERSION } from './theme-a11y-report';
import { BUILT_IN_THEMES } from './built-in-themes';
import { deriveTokens } from './derive-tokens';

/**
 * The generator's live contrast panel. Its edge list mirrors the pairs the
 * shipped themes are held to in `packages/themes/src/themes.spec.ts`:
 * `fg-default` on the four neutral surfaces and `fg-on-<intent>` on
 * `bg-<intent>` at AA 4.5:1 (WCAG 1.4.3), plus the non-text 3:1 edges
 * (WCAG 1.4.11) for the elevated surface and the primary fill the focus
 * ring is derived from.
 */
describe('buildThemeA11yReport — contrast edges', () => {
  test('returns the current reportVersion', () => {
    const draft = BUILT_IN_THEMES.light;
    const report = buildThemeA11yReport(deriveTokens(draft), draft);
    expect(report.reportVersion).toBe(REPORT_VERSION);
  });

  test('covers fg-default on every neutral surface and every on-intent pair', () => {
    const draft = BUILT_IN_THEMES.light;
    const report = buildThemeA11yReport(deriveTokens(draft), draft);
    expect(report.contrastEdges.map((e) => e.id)).toEqual([
      'fg-default/bg-body',
      'fg-default/bg-surface',
      'fg-default/bg-field',
      'fg-default/bg-elevated',
      'fg-on-primary/bg-primary',
      'fg-on-accent/bg-accent',
      'fg-on-info/bg-info',
      'fg-on-success/bg-success',
      'fg-on-warning/bg-warning',
      'fg-on-danger/bg-danger',
    ]);
    expect(report.contrastEdges.every((e) => e.requirement === 'AA-normal')).toBe(true);
    expect(report.contrastEdges.every((e) => e.requiredMin === 4.5)).toBe(true);
    expect(report.summary.aaNormalTotal).toBe(report.contrastEdges.length);
  });

  test('every shipped seed clears AA on every text edge', () => {
    // The seeds are mirrored from the shipped themes, which themes.spec.ts
    // holds to the same 4.5:1 — a seed that drifts below it is caught here
    // before a user forks it.
    for (const draft of Object.values(BUILT_IN_THEMES)) {
      const report = buildThemeA11yReport(deriveTokens(draft), draft);
      const failing = report.contrastEdges.filter((e) => !e.pass).map((e) => `${draft.name}: ${e.message}`);
      expect(failing).toEqual([]);
    }
  });

  test('flags an on-intent pair that collapses to its own fill', () => {
    const draft = structuredClone(BUILT_IN_THEMES.light);
    draft.fg['fg-on-primary'] = draft.bg['bg-primary'];
    const report = buildThemeA11yReport(deriveTokens(draft), draft);
    const edge = report.contrastEdges.find((e) => e.id === 'fg-on-primary/bg-primary')!;
    expect(edge.pass).toBe(false);
    expect(edge.verdict).toBe('FAIL');
    expect(edge.ratio).toBeCloseTo(1, 1);
    expect(edge.message).toMatch(/4\.5:1/);
    expect(report.summary.worstEdgeId).toBe('fg-on-primary/bg-primary');
  });

  test('non-text edges are the 1.4.11 pairs at 3:1', () => {
    const draft = BUILT_IN_THEMES.light;
    const report = buildThemeA11yReport(deriveTokens(draft), draft);
    expect(report.nonTextEdges.map((e) => e.id)).toEqual([
      'bg-elevated/bg-body',
      'bg-elevated/bg-surface',
      'bg-primary/bg-body',
      'bg-primary/bg-surface',
      'bg-primary/bg-field',
      'bg-primary/bg-elevated',
    ]);
    expect(report.nonTextEdges.every((e) => e.requirement === 'non-text')).toBe(true);
    expect(report.nonTextEdges.every((e) => e.requiredMin === 3)).toBe(true);
    expect(report.summary.nonTextTotal).toBe(6);
    expect(report.summary.nonTextPass).toBeLessThanOrEqual(6);
  });
});

describe('buildThemeA11yReport — typography', () => {
  test('warns when bodyRem < 1 (i.e. < 16px at default root)', () => {
    const draft = structuredClone(BUILT_IN_THEMES.light);
    draft.typography.bodyRem = 0.75;
    const report = buildThemeA11yReport(deriveTokens(draft), draft);
    const warn = report.typographyChecks.find((c) => c.id === 'body-min');
    expect(warn?.pass).toBe(false);
    expect(warn?.severity).toBe('warn');
    expect(report.summary.typographyWarn).toBeGreaterThanOrEqual(1);
  });

  test('passes when bodyRem >= 1 and smallRem <= bodyRem', () => {
    const draft = BUILT_IN_THEMES.light;
    const report = buildThemeA11yReport(deriveTokens(draft), draft);
    expect(report.typographyChecks.every((c) => c.pass)).toBe(true);
    expect(report.summary.typographyWarn).toBe(0);
  });

  test('warns when smallRem > bodyRem', () => {
    const draft = structuredClone(BUILT_IN_THEMES.light);
    draft.typography.smallRem = 1.25;
    const report = buildThemeA11yReport(deriveTokens(draft), draft);
    const warn = report.typographyChecks.find((c) => c.id === 'small-vs-body');
    expect(warn?.pass).toBe(false);
  });
});
