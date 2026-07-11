// Temporary config for running table e2e against a dedicated static server on
// 4211 serving this tree's fresh `dist/docs/browser` build (port 4200 is
// occupied by another agent's server for a different worktree).
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/docs/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4211',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx --yes http-server dist/docs/browser -p 4211 -c-1 --silent',
    url: 'http://localhost:4211',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
