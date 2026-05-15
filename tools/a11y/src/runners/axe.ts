import { chromium, type Browser } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import type { AxeResult, AxeViolation, FontsResult, Impact } from '../types.js';
import { analyzeFonts, sampleFonts } from './fonts.js';

export interface AxeRunInput {
  url: string;
}

export interface AxeRunOutput {
  axe: AxeResult;
  fonts: FontsResult;
}

const IMPACTS: Impact[] = ['critical', 'serious', 'moderate', 'minor'];

export async function runAxeAndFonts(browser: Browser, input: AxeRunInput): Promise<AxeRunOutput> {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(input.url, { waitUntil: 'networkidle', timeout: 60_000 });

    // The app shell mounts a splash screen and toggles a `.content-hidden`
    // class on its root while Angular hydrates. Wait for it to clear so axe
    // can actually see the page content (otherwise landmarks/regions read
    // as missing because every descendant is `visibility: hidden`).
    await page.waitForFunction(
      () => !document.querySelector('.app-shell.content-hidden'),
      undefined,
      { timeout: 20_000 },
    ).catch(() => { /* fall through — axe will catch what's there */ });

    const samples = await sampleFonts(page);
    const fonts = analyzeFonts(samples);

    const axeResults = await new AxeBuilder({ page }).analyze();
    const violationsByImpact: Record<Impact, number> = {
      critical: 0, serious: 0, moderate: 0, minor: 0,
    };
    const violations: AxeViolation[] = [];

    for (const v of axeResults.violations) {
      const impact = (IMPACTS as readonly string[]).includes(v.impact ?? '')
        ? (v.impact as Impact)
        : 'minor';
      violationsByImpact[impact] += 1;
      violations.push({
        id: v.id,
        impact,
        help: v.help,
        nodes: v.nodes.map((n) => {
          const node: AxeViolation['nodes'][number] = {
            target: n.target as string[],
            failureSummary: n.failureSummary ?? '',
          };
          if (v.id === 'color-contrast' && n.any.length > 0) {
            const data = n.any[0]?.data as
              | { fgColor?: string; bgColor?: string; contrastRatio?: number; expectedContrastRatio?: number }
              | undefined;
            if (data) {
              node.fg = data.fgColor;
              node.bg = data.bgColor;
              node.ratio = data.contrastRatio;
              node.expected = data.expectedContrastRatio;
            }
          }
          return node;
        }),
      });
    }

    return {
      axe: { violationsByImpact, violations, passes: axeResults.passes.length },
      fonts,
    };
  } finally {
    await context.close();
  }
}

/** Convenience: open a browser, run, close. Use this for one-off runs. */
export async function withChromium<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
  const browser = await chromium.launch();
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}
