import { parseArgs } from 'node:util';
import {
  BASE_URL, OUTPUT_DIR,
  validatePageFilter, validateThemeFilter,
} from './config.js';
import { ensureDevServer } from './dev-server.js';
import { runAxeAndFonts, withChromium } from './runners/axe.js';
import { runLighthouse } from './runners/lighthouse.js';
import { buildPageReport, buildSummary } from './aggregator.js';
import { writePageReport, writeSummary } from './report-writer.js';
import type { PageDef, PageReport, Theme } from './types.js';

interface Args {
  theme?: string;
  page?: string;
}

function parseCliArgs(): Args {
  const { values } = parseArgs({
    options: {
      theme: { type: 'string' },
      page: { type: 'string' },
    },
    allowPositionals: false,
  });
  return values as Args;
}

async function runOnePage(
  browser: import('@playwright/test').Browser,
  theme: Theme,
  page: PageDef,
): Promise<PageReport> {
  const url = `${BASE_URL}${page.path}?theme=${theme}`;
  const timestamp = new Date().toISOString();

  let axe = null, fonts = null, lighthouse = null;
  let axeError: string | undefined;
  let lighthouseError: string | undefined;

  try {
    const r = await runAxeAndFonts(browser, { url });
    axe = r.axe;
    fonts = r.fonts;
  } catch (err) {
    axeError = (err as Error).message;
  }

  try {
    lighthouse = await runLighthouse(url);
  } catch (err) {
    lighthouseError = (err as Error).message;
  }

  return buildPageReport({
    theme, page: page.path, url, timestamp,
    axe, fonts, lighthouse,
    axeError, lighthouseError,
  });
}

function printSummary(reports: PageReport[]): void {
  const byTheme = new Map<string, PageReport[]>();
  for (const r of reports) {
    if (!byTheme.has(r.theme)) byTheme.set(r.theme, []);
    byTheme.get(r.theme)!.push(r);
  }
  console.log('\nSummary');
  console.log('-------');
  for (const [theme, rs] of byTheme) {
    const totalViolations = rs.reduce(
      (s, r) => s + (r.axe?.violations.length ?? 0), 0,
    );
    const totalWarnings = rs.reduce(
      (s, r) => s + (r.fonts?.warnings.length ?? 0), 0,
    );
    const perfScores = rs.map((r) => r.lighthouse?.scores.performance ?? 0).filter((s) => s > 0);
    const avgPerf = perfScores.length === 0 ? 0 : Math.round(perfScores.reduce((a, b) => a + b, 0) / perfScores.length);
    console.log(`  ${theme.padEnd(12)} a11y: ${totalViolations}  fonts: ${totalWarnings}  perf: ${avgPerf}`);
  }
}

async function main(): Promise<void> {
  const args = parseCliArgs();
  const themes = validateThemeFilter(args.theme);
  const pages = validatePageFilter(args.page);

  const server = await ensureDevServer();
  try {
    const reports: PageReport[] = [];

    const themeTasks = themes.map(async (theme) => {
      const themeReports: PageReport[] = [];
      await withChromium(async (browser) => {
        for (const page of pages) {
          const report = await runOnePage(browser, theme, page);
          await writePageReport(OUTPUT_DIR, theme, page.slug, report);
          themeReports.push(report);
          console.log(`  ✓ ${theme}/${page.slug}`);
        }
      });
      return themeReports;
    });

    const themeResults = await Promise.all(themeTasks);
    for (const tr of themeResults) reports.push(...tr);

    const summary = buildSummary(reports, new Date().toISOString());
    await writeSummary(OUTPUT_DIR, summary);

    printSummary(reports);
  } finally {
    if (server.spawned) await server.stop();
  }
}

main().catch((err) => {
  console.error('\n[a11y] fatal:', (err as Error).message);
  process.exit(1);
});
