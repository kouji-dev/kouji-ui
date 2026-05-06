import { expect, test } from '@playwright/test';

test('pressed (toggle) button reports aria-pressed correctly', async ({ page }) => {
  await page.goto('/docs/components/button');

  const example = page.locator('[data-toc-entry="Pressed (toggle)"]');
  await expect(example).toBeVisible();

  const button = example.locator('button.kj-button');
  await expect(button).toHaveAttribute('aria-pressed', 'false');

  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');

  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'false');
});
