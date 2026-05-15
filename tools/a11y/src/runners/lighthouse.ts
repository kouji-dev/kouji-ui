import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import type { Result, RunnerResult } from 'lighthouse';
import type { LighthouseResult } from '../types.js';

export interface LighthouseChrome {
  port: number;
  kill: () => Promise<void>;
}

/**
 * Launch a single headless Chrome instance to drive every lighthouse run.
 * Reusing one process cuts the per-page Chrome startup cost (~3–8 s each)
 * to a single startup at the beginning of the pipeline. Always pair with
 * a `try/finally { await chrome.kill() }` so the Chrome doesn't leak.
 */
export async function launchLighthouseChrome(): Promise<LighthouseChrome> {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
  });
  return {
    port: chrome.port,
    kill: async () => { await chrome.kill(); },
  };
}

interface LighthouseAudits {
  'first-contentful-paint'?: { numericValue?: number };
  'largest-contentful-paint'?: { numericValue?: number };
  'cumulative-layout-shift'?: { numericValue?: number };
  'total-blocking-time'?: { numericValue?: number };
  'speed-index'?: { numericValue?: number };
}

/** Run Lighthouse against `url`, reusing the already-launched Chrome on `port`. */
export async function runLighthouse(url: string, port: number): Promise<LighthouseResult> {
  const runnerResult: RunnerResult | undefined = await lighthouse(
    url,
    { port, output: 'json', onlyCategories: ['performance'], logLevel: 'silent' },
  );
  if (!runnerResult) throw new Error('lighthouse returned no result');
  const lhr: Result = runnerResult.lhr;
  const score = lhr.categories.performance?.score ?? 0;
  const a = (lhr.audits as unknown as LighthouseAudits) ?? {};
  return {
    scores: { performance: Math.round((score ?? 0) * 100) },
    metrics: {
      FCP: Math.round(a['first-contentful-paint']?.numericValue ?? 0),
      LCP: Math.round(a['largest-contentful-paint']?.numericValue ?? 0),
      CLS: Number((a['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)),
      TBT: Math.round(a['total-blocking-time']?.numericValue ?? 0),
      SI:  Math.round(a['speed-index']?.numericValue ?? 0),
    },
  };
}
