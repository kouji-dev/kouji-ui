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

  test('pluggable example: minimal echarts/core build renders + kjChartOn/kjChartEvent forwards', async ({ page }) => {
    await page.goto('/docs/headless/chart');
    await page.getByRole('tab', { name: /examples/i }).click();

    // The pluggable example provides a tree-shaken echarts/core build via the
    // KJ_ECHARTS token. If that minimal engine boots, its chart paints a canvas.
    const host = page.locator('[role="img"][aria-label*="minimal ECharts build"]');
    await expect(host).toBeVisible({ timeout: 20000 });
    await expect(host.locator('canvas').first()).toBeVisible({ timeout: 20000 });

    // The example listens on ['click','mouseover'] via (kjChartEvent) and prints
    // the last event. The chart is a bar chart, so moving over / clicking a
    // column reliably fires ECharts 'mouseover'/'click' — proving the general
    // event API forwards a named event through (kjChartEvent).
    const lastEvent = page.locator('kj-chart-pluggable-example p');
    await expect(lastEvent).toHaveText(/Last event: —/, { timeout: 20000 });

    const canvas = host.locator('canvas').first();
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('pluggable example canvas has no box');
    // Sweep the pointer across bar columns (short bars leave gaps at any single
    // fixed x). Landing on any bar makes ECharts fire 'mouseover', which is
    // forwarded through (kjChartEvent) and printed. Positions are element-
    // relative so the pointer lands on the canvas regardless of page scroll.
    for (let fx = 0.15; fx <= 0.9; fx += 0.05) {
      await canvas.hover({ position: { x: box.width * fx, y: box.height * 0.7 } });
      if (!/—/.test((await lastEvent.textContent()) ?? '')) break;
    }
    await expect(lastEvent).toHaveText(/Last event: mouseover event/, { timeout: 20000 });
  });
});
