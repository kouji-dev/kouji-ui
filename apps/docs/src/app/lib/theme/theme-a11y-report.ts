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

const NON_TEXT_PAIRS: PairSpec[] = [
  { fg: 'base-300', bg: 'base-100' },
  { fg: 'base-300', bg: 'base-200' },
];

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

export function buildThemeA11yReport(resolved: ResolvedTokens, draft: DraftTheme): ThemeA11yReport {
  const contrastEdges = AAA_NORMAL_PAIRS.map(p => makeContrastEdge(resolved, p));
  const nonTextEdges = NON_TEXT_PAIRS.map(p => makeNonTextEdge(resolved, p));

  const aaaNormalTotal = contrastEdges.length;
  const aaaNormalPass  = contrastEdges.filter(e => e.pass).length;
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
      aaaNormalPass, aaaNormalTotal,
      nonTextPass, nonTextTotal,
      typographyWarn,
      worstRatio: worst ? worst.ratio : 1,
      worstEdgeId: worst ? worst.id : null,
    },
  };
}
