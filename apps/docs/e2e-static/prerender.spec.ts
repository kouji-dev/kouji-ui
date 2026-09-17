import { test, expect } from '@playwright/test';

/**
 * Prerender guarantees, checked against the STATIC build.
 *
 * Lives in `e2e-static/`, not `e2e/`, on purpose: `playwright.config.ts` —
 * what `pnpm --filter docs test:e2e` and the CI e2e job run — points at
 * `apps/docs/e2e` and boots `ng serve`, which never writes a prerendered
 * document. Every assertion below is about bytes only the static build emits,
 * so running it there would fail for a reason that says nothing about the app.
 * `playwright.i18n.config.ts` is the config whose `testDir` is this folder and
 * whose web server is `dist/docs/browser`. Run it by name:
 * `pnpm build:docs && pnpm --filter docs test:e2e:static`.
 *
 * Covers two review findings:
 *  - SSR F-2: with JavaScript disabled the prerendered content must be
 *    *visible*, not occluded by a full-viewport splash the client never gets
 *    to clear.
 *  - SSR F-16: a component doc page must contain a real, server-rendered
 *    library component — not merely the example's source text inside a
 *    `<pre>`, which is what the old `toContain('kj-editor')` assertion was
 *    actually matching.
 */
test.describe('prerendered output', () => {
  test.use({ javaScriptEnabled: false });

  test('the home page paints its heading with JS disabled', async ({ page }) => {
    await page.goto('/');
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(page.locator('kj-loading-screen')).toHaveCount(0);
    await expect(page.locator('.app-shell')).not.toHaveClass(/content-hidden/);
  });

  test('a component doc page paints its heading with JS disabled', async ({ page }) => {
    await page.goto('/docs/components/button');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('a component doc page server-renders a real kj component', async ({ page }) => {
    const response = await page.goto('/docs/components/button');
    const html = (await response?.text()) ?? '';
    // The playground stage, mounted during prerender.
    expect(html).toContain('class="playground-stage"');
    expect(html).toMatch(/<button[^>]*class="[^"]*\bkj-button\b/);
  });
});
