import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writePageReport, writeSummary } from './report-writer.js';
import type { PageReport, SummaryReport } from './types.js';

describe('report-writer', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'a11y-report-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes per-page report at <root>/<theme>/<slug>.json', async () => {
    const report: PageReport = {
      schemaVersion: 1,
      theme: 'kouji',
      page: '/docs/button',
      url: 'http://localhost:4200/docs/button?theme=kouji',
      timestamp: '2026-05-13T10:00:00.000Z',
      axe: null,
      fonts: null,
      lighthouse: null,
    };
    await writePageReport(dir, 'kouji', 'docs-button', report);
    const path = join(dir, 'kouji', 'docs-button.json');
    expect(existsSync(path)).toBe(true);
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    expect(parsed.theme).toBe('kouji');
    expect(parsed.page).toBe('/docs/button');
  });

  it('creates missing theme directories', async () => {
    const report = {
      schemaVersion: 1, theme: 'dark', page: '/', url: '', timestamp: '',
      axe: null, fonts: null, lighthouse: null,
    } as PageReport;
    await writePageReport(dir, 'dark', 'home', report);
    expect(existsSync(join(dir, 'dark', 'home.json'))).toBe(true);
  });

  it('writes _summary.json at the root', async () => {
    const summary: SummaryReport = {
      schemaVersion: 1,
      timestamp: '2026-05-13T10:00:00.000Z',
      themes: {} as SummaryReport['themes'],
    };
    await writeSummary(dir, summary);
    const path = join(dir, '_summary.json');
    expect(existsSync(path)).toBe(true);
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    expect(parsed.schemaVersion).toBe(1);
  });
});
