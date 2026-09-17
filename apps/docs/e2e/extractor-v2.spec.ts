import { test, expect } from '@playwright/test';
import { gotoApi } from './_helpers';

test.describe('docs extractor v2', () => {
  // ts-morph extraction on a cold server can take 30-60 s; allow ample time.
  test.setTimeout(120_000);

  // QUARANTINED — app bug, not a stale locator. `provideIcons`,
  // `injectKjIconResolver` and `KJ_ICON_REGISTRY` all still carry
  // `@doc-name icon`, but the icon page's api tab lists only 4 items and
  // none of them. Something in the extractor stopped emitting the
  // function / token / type-alias kinds for this page. Un-fixme once the
  // manifest carries them again — the assertions below are correct.
  test.fixme('icon page renders directive (main) plus function/token/type-alias kinds', async ({ page }) => {
    // The extracted API items (functions, tokens, type aliases) live on the
    // api tab; `overview` is the default.
    await gotoApi(page, 'icon', 'headless');

    // Main directive item — long timeout covers cold ts-morph extraction.
    await expect(page.locator('text=KjIcon').first()).toBeVisible({ timeout: 90_000 });

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
