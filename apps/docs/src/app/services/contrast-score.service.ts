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

/** Computes WCAG contrast ratios and AA/AAA verdicts for the standard
 * theme color pairs. Pure (no draft state held). */
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
      const c = tokens.colors as Record<string, string>;
      const cn = tokens.contents as Record<string, string>;
      if (name in c) return c[name];
      if (name in cn) return cn[name];
      const d = tokens.derivedBase;
      if (name === 'base-200') return d.base200;
      if (name === 'base-300') return d.base300;
      return '#000000';
    };
    const pairs: PairResult[] = PAIRS.map(p => {
      const fgHex = this.cssToHex(lookup(p.fg));
      const bgHex = this.cssToHex(lookup(p.bg));
      const r = this.ratio(fgHex, bgHex);
      const v = this.verdict(r);
      const pass = p.target === 'AAA' ? v === 'AAA' : r >= 3;
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
