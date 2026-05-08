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

  test('white on white is 1:1', () => {
    expect(svc.ratio('#ffffff', '#ffffff')).toBeCloseTo(1, 1);
  });

  test('verdict thresholds', () => {
    expect(svc.verdict(7)).toBe('AAA');
    expect(svc.verdict(7.0001)).toBe('AAA');
    expect(svc.verdict(6.9999)).toBe('AA');
    expect(svc.verdict(4.5)).toBe('AA');
    expect(svc.verdict(4.49)).toBe('AA-Large');
    expect(svc.verdict(2.99)).toBe('FAIL');
  });

  test('scorePalette returns one row per pair', () => {
    const draft = TestBed.inject(ThemeDraftService);
    draft.loadFork('kouji');
    const report = svc.scorePalette(draft.resolvedTokens());
    expect(report.pairs.length).toBeGreaterThanOrEqual(13);
    expect(report.summary.total).toBe(report.pairs.length);
    expect(report.summary.score).toBeGreaterThanOrEqual(0);
    expect(report.summary.score).toBeLessThanOrEqual(100);
  });

  test('flags a deliberately failing pair', () => {
    const draft = TestBed.inject(ThemeDraftService);
    draft.loadFork('kouji');
    draft.setColor('primary', draft.draft().colors['base-100']);
    const report = svc.scorePalette(draft.resolvedTokens());
    const primaryOnBase = report.pairs.find(p => p.fg === 'primary' && p.bg === 'base-100');
    expect(primaryOnBase?.pass).toBe(false);
  });
});
