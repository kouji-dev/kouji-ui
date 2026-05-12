import { describe, it, expect } from 'vitest';
import { buildPageReport, buildSummary } from './aggregator.js';
import type { AxeResult, FontsResult, LighthouseResult, PageReport } from './types.js';

const axe: AxeResult = {
  violationsByImpact: { critical: 0, serious: 1, moderate: 0, minor: 0 },
  violations: [{ id: 'color-contrast', impact: 'serious', help: '', nodes: [] }],
  passes: 10,
};
const fonts: FontsResult = {
  samples: [{ selector: 'body', fontFamily: 'Inter', fontSize: 16, lineHeight: 24, weight: 400 }],
  warnings: [],
};
const lighthouse: LighthouseResult = {
  scores: { performance: 85 },
  metrics: { FCP: 1000, LCP: 1500, CLS: 0.01, TBT: 100, SI: 2000 },
};

describe('buildPageReport', () => {
  it('builds a complete report when all three runners succeed', () => {
    const r = buildPageReport({
      theme: 'kouji',
      page: '/docs/button',
      url: 'http://localhost:4200/docs/button?theme=kouji',
      timestamp: '2026-05-13T10:00:00.000Z',
      axe, fonts, lighthouse,
    });
    expect(r.schemaVersion).toBe(1);
    expect(r.theme).toBe('kouji');
    expect(r.page).toBe('/docs/button');
    expect(r.axe).toBe(axe);
    expect(r.fonts).toBe(fonts);
    expect(r.lighthouse).toBe(lighthouse);
    expect(r.error).toBeUndefined();
  });

  it('captures per-runner errors when sections fail', () => {
    const r = buildPageReport({
      theme: 'kouji', page: '/', url: '', timestamp: '',
      axe: null, fonts, lighthouse: null,
      axeError: 'navigation timeout', lighthouseError: 'subprocess crashed',
    });
    expect(r.axe).toBeNull();
    expect(r.lighthouse).toBeNull();
    expect(r.axeError).toBe('navigation timeout');
    expect(r.lighthouseError).toBe('subprocess crashed');
  });
});

describe('buildSummary', () => {
  it('aggregates totals per theme', () => {
    const reports: PageReport[] = [
      buildPageReport({
        theme: 'kouji', page: '/', url: '', timestamp: '',
        axe, fonts, lighthouse,
      }),
      buildPageReport({
        theme: 'kouji', page: '/docs/button', url: '', timestamp: '',
        axe, fonts: { samples: [], warnings: [{ selector: 'a', issue: 'x' }] }, lighthouse,
      }),
    ];
    const s = buildSummary(reports, '2026-05-13T10:00:00.000Z');
    expect(s.themes.kouji.axeViolationsByImpact.serious).toBe(2);
    expect(s.themes.kouji.fontWarnings).toBe(1);
    expect(s.themes.kouji.lighthouseAvg.performance).toBe(85);
  });

  it('skips themes that have no reports', () => {
    const s = buildSummary([], '2026-05-13T10:00:00.000Z');
    expect(s.themes).toEqual({});
  });

  it('ignores null sections when averaging', () => {
    const r = buildPageReport({
      theme: 'dark', page: '/', url: '', timestamp: '',
      axe: null, fonts: null, lighthouse: null,
    });
    const s = buildSummary([r], '2026-05-13T10:00:00.000Z');
    expect(s.themes.dark.axeViolationsByImpact).toEqual({ critical: 0, serious: 0, moderate: 0, minor: 0 });
    expect(s.themes.dark.fontWarnings).toBe(0);
    expect(s.themes.dark.lighthouseAvg.performance).toBe(0);
  });
});
