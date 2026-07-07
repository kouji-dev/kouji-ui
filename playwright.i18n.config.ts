import { defineConfig, devices } from '@playwright/test';

/**
 * Dedicated config for the i18n E2E: serves the STATIC prerendered docs build
 * (`dist/docs/browser`) rather than `ng serve`, because doc pages are only
 * rendered by the prerender pipeline. Build first: `pnpm build:docs`.
 */
export default defineConfig({
  testDir: './apps/docs/e2e-static',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      'node apps/docs/e2e-static/static-server.mjs dist/docs/browser 4321',
    url: 'http://localhost:4321/docs/headless/i18n',
    reuseExistingServer: !process.env['CI'],
    timeout: 60000,
  },
});
