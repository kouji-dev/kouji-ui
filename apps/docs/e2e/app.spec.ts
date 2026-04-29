import { test, expect } from '@playwright/test';

test('docs app loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/kouji/i);
});
