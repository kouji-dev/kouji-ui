import { expect, test } from '@playwright/test';

test('command-palette examples each render a trigger button + closed modal', async ({ page }) => {
  await page.goto('/docs/components/command-palette');

  for (const sel of [
    'kj-command-palette-example',
    'kj-command-palette-dialog-example',
    'kj-command-palette-groups-example',
    'kj-command-palette-async-example',
    'kj-command-palette-fuzzy-example',
  ]) {
    const root = page.locator(sel);
    await expect(root).toBeVisible();
    await expect(root.locator('.trigger').first()).toBeVisible();
    // Shell is rendered but not open by default.
    await expect(root.locator('.kj-command-palette__shell')).toHaveCount(1);
    await expect(root.locator('.kj-command-palette__shell.is-open')).toHaveCount(0);
  }
});

test('clicking the trigger opens the modal with backdrop, dialog, and footer', async ({ page }) => {
  await page.goto('/docs/components/command-palette');

  const example = page.locator('kj-command-palette-example');
  await example.locator('.trigger').click();

  const shell = example.locator('.kj-command-palette__shell.is-open');
  await expect(shell).toBeVisible();
  await expect(shell.locator('.kj-command-palette__backdrop')).toBeVisible();
  await expect(shell.locator('.kj-command-palette__dialog')).toBeVisible();
  await expect(shell.locator('.kj-command-palette__footer')).toBeVisible();
  await expect(shell.locator('input.kj-command-palette__input')).toBeFocused();
});

test('Ctrl+K opens the docs search palette via kjHotkey', async ({ page }) => {
  await page.goto('/docs/components/command-palette');

  await page.keyboard.press('Control+k');

  const search = page.locator('kj-search kj-command-palette.docs-search');
  const shell = search.locator('.kj-command-palette__shell.is-open');
  await expect(shell).toBeVisible();
  await expect(shell.locator('.kj-command-palette__esc-kbd')).toHaveText('esc');

  // Type a query — items render via the kjItems + itemTemplate path.
  await search.locator('input.kj-command-palette__input').fill('button');
  await expect(shell.locator('kj-command-item').first()).toBeVisible();
});
