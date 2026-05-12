import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const RUN_A11Y_SMOKE = process.env['RUN_A11Y_SMOKE'] === '1';

test.describe('a11y pipeline smoke', () => {
  test.skip(!RUN_A11Y_SMOKE, 'set RUN_A11Y_SMOKE=1 to run');

  test('writes a well-formed report for kouji/home', async () => {
    const repoRoot = resolve(__dirname, '..', '..', '..');
    const reportPath = resolve(repoRoot, 'reports', 'a11y', 'kouji', 'home.json');
    if (existsSync(reportPath)) rmSync(reportPath);

    execSync('pnpm a11y --theme kouji --page /', {
      cwd: repoRoot, stdio: 'inherit', timeout: 180_000,
    });

    expect(existsSync(reportPath)).toBe(true);
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    expect(report.schemaVersion).toBe(1);
    expect(report.theme).toBe('kouji');
    expect(report.page).toBe('/');
    expect(report.axe).not.toBeNull();
    expect(report.fonts).not.toBeNull();
    expect(report.lighthouse).not.toBeNull();
  });
});
