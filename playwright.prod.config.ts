import { defineConfig, devices } from '@playwright/test';

// E2E against the STATIC PRERENDERED prod build (dist/docs/browser), served by
// a dependency-free static server. This is the faithful target for the code
// editor, whose docs page is manifest-driven and only materialises in the
// prerendered output (the dev `ng serve` path does not render it).
export default defineConfig({
  testDir: './apps/docs/e2e',
  testMatch: /editor\.spec\.ts/,
  fullyParallel: true,
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node apps/docs/e2e/static-server.mjs',
    url: 'http://localhost:4321/',
    reuseExistingServer: !process.env['CI'],
    timeout: 30_000,
  },
});
