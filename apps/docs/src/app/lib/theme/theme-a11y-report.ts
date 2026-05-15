import { converter } from 'culori';
import type { DraftTheme, ResolvedTokens, BgSlot, FgSlot } from './types';

const toRgb = converter('rgb');

/** Increment when edge lists, assumptions, or thresholds change. */
export const REPORT_VERSION = 2;

/** `AA-normal` matches axe-core's default `color-contrast` rule (WCAG 1.4.3, 4.5:1).
 *  `non-text` is WCAG 1.4.11 (3:1) — axe does NOT enforce this by default, so
 *  it appears here as an extra signal but doesn't have a one-to-one mapping in
 *  the pipeline report. */
export type EdgeRequirement = 'AA-normal' | 'non-text';
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
  message: string;
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
  contrastEdges: Edge[];
  nonTextEdges:  Edge[];
  typographyChecks: TypographyCheck[];
  summary: {
    /** Editable pairs whose contrast clears AA 4.5:1 (matches axe default). */
    aaNormalPass: number;
    aaNormalTotal: number;
    nonTextPass: number;
    nonTextTotal: number;
    typographyWarn: number;
    worstRatio: number;
    worstEdgeId: string | null;
  };
}

export function relativeLuminance(css: string): number {
  const c = toRgb(css);
  if (!c) return 0;
  const lin = (x: number) => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function verdictFor(ratio: number): Verdict {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA-Large';
  return 'FAIL';
}

export function cssToHex(css: string): string {
  if (css.startsWith('#') && css.length === 7) return css;
  const c = toRgb(css);
  if (!c) return '#000000';
  const to = (n: number) => Math.max(0, Math.min(255, Math.round(n * 255))).toString(16).padStart(2, '0');
  return `#${to(c.r)}${to(c.g)}${to(c.b)}`;
}

interface PairSpec {
  fg: FgSlot | BgSlot;
  bg: BgSlot;
}

/**
 * AA-normal text pairs (target ≥ 4.5:1, matches axe's `color-contrast` rule).
 * Covers:
 *   - fg-default on every neutral surface
 *   - fg-on-{intent} on bg-{intent}
 */
const AA_NORMAL_PAIRS: PairSpec[] = [
  { fg: 'fg-default', bg: 'bg-body' },
  { fg: 'fg-default', bg: 'bg-surface' },
  { fg: 'fg-default', bg: 'bg-field' },
  { fg: 'fg-default', bg: 'bg-elevated' },

  { fg: 'fg-on-primary', bg: 'bg-primary' },
  { fg: 'fg-on-accent',  bg: 'bg-accent'  },
  { fg: 'fg-on-info',    bg: 'bg-info'    },
  { fg: 'fg-on-success', bg: 'bg-success' },
  { fg: 'fg-on-warning', bg: 'bg-warning' },
  { fg: 'fg-on-danger',  bg: 'bg-danger'  },
];

/** Non-text pairs (3:1 minimum) — borders, separators, focus rings. */
const NON_TEXT_PAIRS: PairSpec[] = [
  { fg: 'bg-elevated', bg: 'bg-body' },
  { fg: 'bg-elevated', bg: 'bg-surface' },
];

const BODY_MIN_REM = 1;

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
      : `smallRem ${small} > bodyRem ${body} — small text shouldn't exceed body`,
  });
  return out;
}

function lookupCss(tokens: ResolvedTokens, name: BgSlot | FgSlot): string {
  if (name.startsWith('bg-')) return tokens.bg[name as BgSlot];
  return tokens.fg[name as FgSlot];
}

function makeEdge(tokens: ResolvedTokens, p: PairSpec, requirement: EdgeRequirement): Edge {
  const fgCss = lookupCss(tokens, p.fg);
  const bgCss = lookupCss(tokens, p.bg);
  const ratio = contrastRatio(fgCss, bgCss);
  const verdict = verdictFor(ratio);
  const requiredMin = requirement === 'AA-normal' ? 4.5 : 3;
  const pass = ratio >= requiredMin;
  const target = requirement === 'AA-normal' ? 'AA 4.5:1' : 'non-text 3:1';
  const message = pass
    ? `${p.fg} on ${p.bg}: ${ratio.toFixed(2)}:1 (passes ${target})`
    : `${p.fg} on ${p.bg}: ${ratio.toFixed(2)}:1 — need ${requiredMin}:1 for ${target}`;
  return {
    id: `${p.fg}/${p.bg}`,
    fgToken: p.fg, bgToken: p.bg,
    fgCss, bgCss,
    fgHex: cssToHex(fgCss), bgHex: cssToHex(bgCss),
    ratio, requirement, requiredMin,
    verdict, pass, message,
  };
}

export function buildThemeA11yReport(resolved: ResolvedTokens, draft: DraftTheme): ThemeA11yReport {
  const contrastEdges = AA_NORMAL_PAIRS.map(p => makeEdge(resolved, p, 'AA-normal'));
  const nonTextEdges  = NON_TEXT_PAIRS.map(p => makeEdge(resolved, p, 'non-text'));

  const aaNormalTotal = contrastEdges.length;
  const aaNormalPass  = contrastEdges.filter(e => e.pass).length;
  const nonTextTotal = nonTextEdges.length;
  const nonTextPass  = nonTextEdges.filter(e => e.pass).length;

  const typographyChecks = buildTypographyChecks(draft);
  const typographyWarn   = typographyChecks.filter(c => !c.pass).length;

  const allEdges = [...contrastEdges, ...nonTextEdges];
  const worst = allEdges.reduce<Edge | null>(
    (m, e) => (m === null || e.ratio < m.ratio) ? e : m,
    null,
  );

  return {
    reportVersion: REPORT_VERSION,
    contrastEdges,
    nonTextEdges,
    typographyChecks,
    summary: {
      aaNormalPass, aaNormalTotal,
      nonTextPass, nonTextTotal,
      typographyWarn,
      worstRatio: worst ? worst.ratio : 1,
      worstEdgeId: worst ? worst.id : null,
    },
  };
}
