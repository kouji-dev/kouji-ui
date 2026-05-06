import { expect, test } from '@playwright/test';

test('loading button announces busy and suppresses clicks', async ({ page }) => {
  await page.goto('/docs/components/button');

  const example = page.locator('[data-toc-entry="Loading"]');
  await expect(example).toBeVisible();

  const button = example.locator('button.kj-button');
  await expect(button).toHaveText(/save/i);
  await expect(button).not.toHaveAttribute('aria-busy', 'true');

  await button.click();
  await expect(button).toHaveAttribute('aria-busy', 'true');
  await expect(button).toHaveAttribute('aria-disabled', 'true');

  await button.click({ force: true });
  await expect(button).toHaveText(/saving/i);

  await expect(button).toHaveText(/save/i, { timeout: 3000 });
  await expect(button).not.toHaveAttribute('aria-busy', 'true');
});
