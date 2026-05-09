import { test, expect } from '@playwright/test';

test('sidebar nav shows Getting Started and category tree on /docs', async ({ page }) => {
  await page.goto('/docs');
  const nav = page.getByRole('navigation', { name: 'Documentation sections' });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Getting Started', exact: true })).toBeVisible();
  await expect(page.getByRole('tree', { name: /browse by category/i })).toBeVisible();
});

test('no legacy Col-B region on /docs/getting-started', async ({ page }) => {
  await page.goto('/docs/getting-started');
  await expect(page.getByRole('navigation', { name: /headless items/i })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: /components items/i })).toHaveCount(0);
});

test('category tree stays visible on /docs/headless', async ({ page }) => {
  await page.goto('/docs/headless');
  await expect(page.getByRole('tree', { name: /browse by category/i })).toBeVisible();
});
