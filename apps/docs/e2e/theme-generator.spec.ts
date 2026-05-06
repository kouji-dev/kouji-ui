import { test, expect } from '@playwright/test';

test('theme-generator renders sidebar Col A with built-in themes', async ({ page }) => {
  await page.goto('/theme-generator');
  await expect(page.getByRole('navigation', { name: 'Themes' })).toBeVisible();
  for (const name of ['kouji', 'dark', 'retro', 'cyberpunk', 'corporate']) {
    await expect(page.getByRole('button', { name: new RegExp(`^${name}$`, 'i') })).toBeVisible();
  }
});

test('clicking a built-in theme loads it (active state changes)', async ({ page }) => {
  await page.goto('/theme-generator');
  const retroBtn = page.getByRole('button', { name: /^retro$/i });
  await retroBtn.click();
  await expect(retroBtn).toHaveClass(/active/);
});

test('Col B token editor visible alongside main preview', async ({ page }) => {
  await page.goto('/theme-generator');
  await expect(page.locator('.col-b').first()).toBeVisible();
  await expect(page.locator('main.tg-main')).toBeVisible();
});
