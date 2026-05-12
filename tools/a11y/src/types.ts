export type Theme =
  | 'kouji' | 'dark' | 'light' | 'retro' | 'cyberpunk' | 'corporate';

export interface PageDef {
  /** URL path, leading slash. e.g. '/', '/docs/button' */
  path: string;
  /** Human-readable slug for report filenames. e.g. 'home', 'docs-button' */
  slug: string;
}

export type Impact = 'critical' | 'serious' | 'moderate' | 'minor';

export interface AxeNode {
  target: string[];
  failureSummary: string;
  /** Optional contrast metadata when the violation is color-contrast. */
  fg?: string;
  bg?: string;
  ratio?: number;
  expected?: number;
}

export interface AxeViolation {
  id: string;
  impact: Impact;
  help: string;
  nodes: AxeNode[];
}

export interface AxeResult {
  violationsByImpact: Record<Impact, number>;
  violations: AxeViolation[];
  passes: number;
}

export interface FontSample {
  selector: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  weight: number;
}

export interface FontWarning {
  selector: string;
  issue: string;
}

export interface FontsResult {
  samples: FontSample[];
  warnings: FontWarning[];
}

export interface LighthouseResult {
  scores: { performance: number };
  metrics: {
    FCP: number;
    LCP: number;
    CLS: number;
    TBT: number;
    SI: number;
  };
}

export interface PageReport {
  schemaVersion: 1;
  theme: Theme;
  page: string;
  url: string;
  timestamp: string;
  axe: AxeResult | null;
  fonts: FontsResult | null;
  lighthouse: LighthouseResult | null;
  error?: string;
  axeError?: string;
  fontsError?: string;
  lighthouseError?: string;
}

export interface SummaryReport {
  schemaVersion: 1;
  timestamp: string;
  themes: Record<Theme, {
    axeViolationsByImpact: Record<Impact, number>;
    fontWarnings: number;
    lighthouseAvg: { performance: number };
  }>;
}
