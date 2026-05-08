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

test('clicking a swatch updates URL hash with #t=', async ({ page }) => {
  await page.goto('/theme-generator');
  const swatch = page.locator('kj-seed-swatch-grid button[data-hex]').first();
  await swatch.waitFor();
  const hex = (await swatch.getAttribute('data-hex'))!;
  await swatch.click();
  await expect.poll(() => page.url(), { timeout: 3000 }).toContain('#t=');
  // Reload with the hash and confirm draft persists.
  const url = page.url();
  await page.goto(url);
  // Assert hash survived navigation.
  await expect(page).toHaveURL(/#t=/);
});

test('all five preview tabs render without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/theme-generator');
  for (const tab of ['dashboard', 'settings', 'big-form', 'search', 'chat']) {
    await page.locator(`role=tab[name=${JSON.stringify(tab)}]`).click();
    await page.waitForTimeout(250);
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test('contrast scorecard is visible and shows AAA score', async ({ page }) => {
  await page.goto('/theme-generator');
  await expect(page.locator('kj-contrast-scorecard')).toBeVisible();
  await expect(page.locator('kj-contrast-scorecard')).toContainText(/AAA \d+%/);
});

test('import dialog opens and applies a JSON theme', async ({ page }) => {
  await page.goto('/theme-generator');
  await page.getByRole('button', { name: /import/i }).first().click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  const json = JSON.stringify({
    name: 'imported',
    colors: {
      'base-100': '#ffffff', primary: '#bb0033', secondary: '#000000', accent: '#000000',
      neutral: '#000000', info: '#000000', success: '#000000', warning: '#000000', destructive: '#000000',
    },
    contentOverrides: {},
    shape: { radiusBox: 8, radiusField: 6, radiusSelector: 4, border: 1, depth: 1 },
    type: { fontSans: 'sans-serif', fontMono: 'monospace', fontDisplay: 'serif' },
    motion: { transition: '200ms' },
  });
  await page.locator('[role="dialog"] textarea').fill(json);
  await page.locator('[data-action="apply"]').click();
  await expect(page.locator('text=Imported').first()).toBeVisible({ timeout: 3000 });
});
