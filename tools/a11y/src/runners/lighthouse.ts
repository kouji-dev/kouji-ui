import { spawn } from 'node:child_process';
import type { LighthouseResult } from '../types.js';

interface LighthouseRawAudits {
  'first-contentful-paint'?: { numericValue?: number };
  'largest-contentful-paint'?: { numericValue?: number };
  'cumulative-layout-shift'?: { numericValue?: number };
  'total-blocking-time'?: { numericValue?: number };
  'speed-index'?: { numericValue?: number };
}

interface LighthouseRawReport {
  categories?: { performance?: { score?: number } };
  audits?: LighthouseRawAudits;
}

export async function runLighthouse(url: string): Promise<LighthouseResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      [
        '--yes', 'lighthouse',
        url,
        '--output=json',
        '--output-path=stdout',
        '--only-categories=performance',
        '--quiet',
        '--chrome-flags=--headless=new --no-sandbox',
      ],
      { shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (b) => { stdout += b.toString(); });
    child.stderr.on('data', (b) => { stderr += b.toString(); });

    child.on('error', (err) => reject(new Error(`lighthouse failed to spawn: ${err.message}`)));
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`lighthouse exited with code ${code}: ${stderr.slice(0, 500)}`));
        return;
      }
      try {
        const raw = JSON.parse(stdout) as LighthouseRawReport;
        const score = raw.categories?.performance?.score ?? 0;
        const a = raw.audits ?? {};
        resolve({
          scores: { performance: Math.round(score * 100) },
          metrics: {
            FCP: Math.round(a['first-contentful-paint']?.numericValue ?? 0),
            LCP: Math.round(a['largest-contentful-paint']?.numericValue ?? 0),
            CLS: Number((a['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)),
            TBT: Math.round(a['total-blocking-time']?.numericValue ?? 0),
            SI: Math.round(a['speed-index']?.numericValue ?? 0),
          },
        });
      } catch (err) {
        reject(new Error(`failed to parse lighthouse output: ${(err as Error).message}`));
      }
    });
  });
}
