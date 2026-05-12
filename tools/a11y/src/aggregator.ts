import type {
  AxeResult, FontsResult, Impact, LighthouseResult,
  PageReport, SummaryReport, Theme,
} from './types.js';

interface BuildPageReportInput {
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

export function buildPageReport(input: BuildPageReportInput): PageReport {
  const r: PageReport = {
    schemaVersion: 1,
    theme: input.theme,
    page: input.page,
    url: input.url,
    timestamp: input.timestamp,
    axe: input.axe,
    fonts: input.fonts,
    lighthouse: input.lighthouse,
  };
  if (input.error) r.error = input.error;
  if (input.axeError) r.axeError = input.axeError;
  if (input.fontsError) r.fontsError = input.fontsError;
  if (input.lighthouseError) r.lighthouseError = input.lighthouseError;
  return r;
}

const EMPTY_IMPACTS: Record<Impact, number> = {
  critical: 0, serious: 0, moderate: 0, minor: 0,
};

export function buildSummary(
  reports: readonly PageReport[],
  timestamp: string,
): SummaryReport {
  const themes: SummaryReport['themes'] = {} as SummaryReport['themes'];

  for (const r of reports) {
    if (!themes[r.theme]) {
      themes[r.theme] = {
        axeViolationsByImpact: { ...EMPTY_IMPACTS },
        fontWarnings: 0,
        lighthouseAvg: { performance: 0 },
      };
    }
    const bucket = themes[r.theme];
    if (r.axe) {
      for (const impact of Object.keys(EMPTY_IMPACTS) as Impact[]) {
        bucket.axeViolationsByImpact[impact] += r.axe.violationsByImpact[impact];
      }
    }
    if (r.fonts) {
      bucket.fontWarnings += r.fonts.warnings.length;
    }
  }

  for (const theme of Object.keys(themes) as Theme[]) {
    const themeReports = reports.filter((r) => r.theme === theme && r.lighthouse);
    const total = themeReports.reduce((sum, r) => sum + (r.lighthouse?.scores.performance ?? 0), 0);
    themes[theme].lighthouseAvg.performance =
      themeReports.length === 0 ? 0 : Math.round(total / themeReports.length);
  }

  return { schemaVersion: 1, timestamp, themes };
}
