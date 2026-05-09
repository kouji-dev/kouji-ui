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
});

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
