import { describe, it, expect } from 'vitest';
import { analyzeFonts } from './fonts.js';
import type { FontSample, FontWarning } from '../types.js';

const sample = (overrides: Partial<FontSample>): FontSample => ({
  selector: 'body',
  fontFamily: 'Inter, sans-serif',
  fontSize: 16,
  lineHeight: 24,
  weight: 400,
  ...overrides,
});

describe('analyzeFonts', () => {
  it('returns no warnings when all samples are healthy', () => {
    const r = analyzeFonts([sample({}), sample({ selector: 'h1', fontSize: 32, lineHeight: 40 })]);
    expect(r.warnings).toEqual([]);
    expect(r.samples).toHaveLength(2);
  });

  it('warns when font-size is below 12px (WCAG 1.4.4)', () => {
    const r = analyzeFonts([sample({ selector: '.kj-caption', fontSize: 11 })]);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0].selector).toBe('.kj-caption');
    expect(r.warnings[0].issue).toMatch(/below 12px minimum/);
  });

  it('warns when line-height ratio is below 1.2 (WCAG 1.4.12)', () => {
    const r = analyzeFonts([sample({ fontSize: 20, lineHeight: 22 })]);
    expect(r.warnings.some((w: FontWarning) => w.issue.match(/line-height ratio/))).toBe(true);
  });

  it('warns when computed font-family is a system fallback', () => {
    const r = analyzeFonts([sample({ fontFamily: 'serif' })]);
    expect(r.warnings.some((w: FontWarning) => w.issue.match(/system fallback/))).toBe(true);
  });

  it('warns for bare system-ui too', () => {
    const r = analyzeFonts([sample({ fontFamily: 'system-ui' })]);
    expect(r.warnings.some((w: FontWarning) => w.issue.match(/system fallback/))).toBe(true);
  });
});
