import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PageReport, SummaryReport, Theme } from './types.js';

async function writeJson(path: string, data: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export async function writePageReport(
  outputDir: string,
  theme: Theme,
  slug: string,
  report: PageReport,
): Promise<string> {
  const themeDir = join(outputDir, theme);
  await mkdir(themeDir, { recursive: true });
  const path = join(themeDir, `${slug}.json`);
  await writeJson(path, report);
  return path;
}

export async function writeSummary(
  outputDir: string,
  summary: SummaryReport,
): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const path = join(outputDir, '_summary.json');
  await writeJson(path, summary);
  return path;
}
