import { expect, test } from '@playwright/test';

// The chart directive lives in @kouji-ui/core, so its docs page is under the
// `headless` track: /docs/headless/chart. The live example previews render on
// the "Examples" tab (the default tab is "overview").
test.describe('chart docs page', () => {
  test('renders ECharts canvases and the screen-reader table fallback', async ({ page }) => {
    await page.goto('/docs/headless/chart');

    // Activate the Examples tab so the example previews mount.
    await page.getByRole('tab', { name: /examples/i }).click();

    // The KjChart directive renders on role="img" hosts with an aria-label.
    const chartHost = page.locator('[role="img"][aria-label]').first();
    await expect(chartHost).toBeVisible({ timeout: 20000 });

    // ECharts paints into a <canvas>. At least one example must produce one.
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 20000 });

    // The fallback example projects an SR <table> alongside a chart. It must be
    // present in the DOM and NOT inside a role="img" subtree (so AT reads it).
    const fallbackTable = page.locator('table').filter({ hasText: /desktop/i }).first();
    await expect(fallbackTable).toBeVisible({ timeout: 20000 });
    expect(await fallbackTable.evaluate((el) => el.closest('[role="img"]') === null)).toBe(true);
  });
});
