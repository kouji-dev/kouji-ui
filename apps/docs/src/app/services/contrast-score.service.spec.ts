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
