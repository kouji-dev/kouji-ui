import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for tests that must run against the STATIC prerendered
 * prod build (`dist/docs/browser`) rather than `ng serve` — which does not
 * prerender doc pages. Serves the build via `scripts/serve-docs-dist.mjs`.
 *
 * Build first: `pnpm build --filter=docs`, then
 * `pnpm exec playwright test --config playwright.static.config.ts`.
 */
export default defineConfig({
  testDir: './apps/docs/e2e',
  testMatch: /skip-link\.spec\.ts/,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4331',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/serve-docs-dist.mjs 4331',
    url: 'http://localhost:4331/',
    reuseExistingServer: !process.env['CI'],
    timeout: 60000,
  },
});
