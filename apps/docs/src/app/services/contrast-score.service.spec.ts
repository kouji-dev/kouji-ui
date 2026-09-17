import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { ContrastScoreService } from './contrast-score.service';
import { ThemeDraftService } from './theme-draft.service';
import { REPORT_VERSION } from '../lib/theme/theme-a11y-report';

/**
 * Rewritten against the 17-slot bg/fg model. The old assertions named
 * `colors.primary` / `base-100` and the `AAA-normal` requirement, all of which
 * the report replaced with `AA-normal` edges over `fg-*` / `bg-*` pairs
 * (matching axe-core's default `color-contrast` rule).
 */
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
    expect(report.reportVersion).toBe(REPORT_VERSION);
    expect(report.contrastEdges.length).toBe(10);
    expect(report.nonTextEdges.length).toBe(6);
    expect(report.summary.aaNormalTotal).toBe(report.contrastEdges.length);
    expect(report.summary.nonTextTotal).toBe(report.nonTextEdges.length);
  });

  test('every edge id is "<fg slot>/<bg slot>"', () => {
    const draft = TestBed.inject(ThemeDraftService);
    draft.loadFork('kouji');
    const report = svc.buildReport(draft.resolvedTokens(), draft.draft());
    expect(report.contrastEdges.map(e => e.id)).toContain('fg-on-primary/bg-primary');
    expect(report.contrastEdges.map(e => e.id)).toContain('fg-default/bg-body');
  });

  test('flags the primary text pair when its ink matches its fill', () => {
    const draft = TestBed.inject(ThemeDraftService);
    draft.loadFork('kouji');
    draft.setFg('fg-on-primary', draft.draft().bg['bg-primary']);
    const report = svc.buildReport(draft.resolvedTokens(), draft.draft());
    const edge = report.contrastEdges.find(e => e.id === 'fg-on-primary/bg-primary');
    expect(edge?.pass).toBe(false);
    expect(edge?.verdict).toBe('FAIL');
    expect(report.summary.worstEdgeId).toBe('fg-on-primary/bg-primary');
  });
});
