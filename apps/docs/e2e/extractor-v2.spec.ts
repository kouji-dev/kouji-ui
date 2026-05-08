import { test, expect } from '@playwright/test';

test.describe('docs extractor v2', () => {
  // ts-morph extraction on a cold server can take 30-60 s; allow ample time.
  test.setTimeout(120_000);

  test('icon page renders directive (main) plus function/token/type-alias kinds', async ({ page }) => {
    await page.goto('/docs/headless/icon');

    // Main directive item — long timeout covers cold ts-morph extraction.
    await expect(page.locator('text=KjIconDirective').first()).toBeVisible({ timeout: 90_000 });

    // Function-kind items
    await expect(page.locator('text=provideIcons').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=injectKjIconResolver').first()).toBeVisible({ timeout: 10_000 });

    // Token-kind item
    await expect(page.locator('text=KJ_ICON_REGISTRY').first()).toBeVisible({ timeout: 10_000 });

    // Type-alias-kind item
    await expect(page.locator('text=IconResolver').first()).toBeVisible({ timeout: 10_000 });

    // Const-kind item
    await expect(page.locator('text=KJ_ICON_CSS_PATH').first()).toBeVisible({ timeout: 10_000 });
  });

  test('a directive-only page (divider) still renders', async ({ page }) => {
    await page.goto('/docs/headless/divider');
    await expect(page.locator('h1')).toContainText(/divider/i, { timeout: 90_000 });
  });
});
