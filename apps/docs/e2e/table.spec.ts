import { test, expect } from '@playwright/test';

test.describe('table docs', () => {
  // Cold extraction on first hit can be slow; allow ample time.
  test.setTimeout(120_000);

  test('components table page loads with playground and working controls', async ({ page }) => {
    await page.goto('/docs/components/table');
    await expect(page.locator('h1')).toContainText(/table/i, { timeout: 90_000 });

    // Playground is wired (no placeholder) and mounts a live <kj-table>.
    await expect(page.locator('.empty-state', { hasText: /not yet wired/i })).toHaveCount(0);
    const stage = page.locator('.playground-stage');
    const liveTable = stage.locator('kj-table');
    await expect(liveTable).toBeVisible({ timeout: 30_000 });
    await expect(liveTable.locator('tbody tr').first()).toBeVisible();

    // Density chip control writes through to the live table's host attribute.
    await expect(liveTable).toHaveAttribute('data-density', 'standard');
    const densityGroup = page.getByRole('radiogroup', { name: 'density' });
    await densityGroup.getByRole('radio', { name: 'compact' }).click();
    await expect(liveTable).toHaveAttribute('data-density', 'compact');

    // Snippet reflects the control change.
    await expect(page.locator('.pg-snippet-code')).toContainText('kjDensity="compact"');

    // Variant chip reflects on the host too.
    const variantGroup = page.getByRole('radiogroup', { name: 'variant' });
    await variantGroup.getByRole('radio', { name: 'striped' }).click();
    await expect(liveTable).toHaveAttribute('data-variant', 'striped');
  });

  test('examples tab renders the registered table examples', async ({ page }) => {
    await page.goto('/docs/components/table');
    await expect(page.locator('h1')).toContainText(/table/i, { timeout: 90_000 });

    await page.getByRole('tab', { name: /examples/i }).click();

    const sortable = page.locator('[data-toc-entry="Sortable"]');
    await expect(sortable).toBeVisible({ timeout: 30_000 });
    await expect(sortable.locator('kj-table tbody tr').first()).toBeVisible({ timeout: 30_000 });

    const editable = page.locator('[data-toc-entry="Inline editing"]');
    await expect(editable.locator('kj-table tbody tr').first()).toBeVisible({ timeout: 30_000 });
  });

  test('headless table page renders the core directive family', async ({ page }) => {
    await page.goto('/docs/headless/table');
    await expect(page.locator('h1')).toContainText(/table/i, { timeout: 90_000 });

    await expect(page.locator('text=KjTable').first()).toBeVisible();

    // The full directive/function/token family renders on the API tab.
    await page.getByRole('tab', { name: /api/i }).click();
    await expect(page.locator('text=KjTableKeyboardNav').first()).toBeAttached();
    await expect(page.locator('text=kjTableResource').first()).toBeAttached();
    await expect(page.locator('text=KJ_TABLE_STORAGE').first()).toBeAttached();
  });
});
