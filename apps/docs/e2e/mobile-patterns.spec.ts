import { expect, test } from '@playwright/test';

// Mobile viewport for the whole file — these are mobile-first patterns.
test.use({ viewport: { width: 390, height: 844 } });

test.describe('bottom sheet', () => {
  test('opens, traps focus, and dismisses via Escape', async ({ page }) => {
    await page.goto('/docs/components/sheet');

    const example = page.locator('kj-sheet-example');
    await expect(example).toBeVisible();
    await example.locator('kj-button button').first().click();

    // Panel renders as a dialog with a grab handle.
    const panel = page.locator('kj-sheet[role="dialog"]');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('data-state', 'open');
    await expect(panel.locator('.kj-sheet__handle')).toBeVisible();

    // Focus is trapped inside the sheet (moved off the trigger).
    const focusedInSheet = await page.evaluate(() => {
      const sheet = document.querySelector('kj-sheet');
      return !!sheet && sheet.contains(document.activeElement);
    });
    expect(focusedInSheet).toBe(true);

    // Escape dismisses.
    await page.keyboard.press('Escape');
    await expect(page.locator('kj-sheet[role="dialog"]')).toHaveCount(0);
  });

  test('backdrop click dismisses the sheet', async ({ page }) => {
    await page.goto('/docs/components/sheet');
    await page.locator('kj-sheet-example kj-button button').first().click();
    await expect(page.locator('kj-sheet[role="dialog"]')).toBeVisible();

    // Click the backdrop (top-left, above the bottom-anchored sheet).
    await page.mouse.click(10, 10);
    await expect(page.locator('kj-sheet[role="dialog"]')).toHaveCount(0);
  });
});

test.describe('action sheet', () => {
  test('opens a menu of actions and resolves the selection', async ({ page }) => {
    await page.goto('/docs/components/action-sheet');

    const example = page.locator('kj-action-sheet-example');
    await expect(example).toBeVisible();
    await example.locator('kj-button button').first().click();

    // Bottom-sheet panel with a role="menu" list of actions.
    const panel = page.locator('kj-sheet[role="dialog"]');
    await expect(panel).toBeVisible();
    const menu = panel.locator('[role="menu"]');
    await expect(menu).toBeVisible();
    const items = menu.locator('[role="menuitem"]');
    await expect(items).toHaveCount(3);

    // Selecting an action closes the sheet and reports the value.
    await items.filter({ hasText: 'Delete' }).click();
    await expect(page.locator('kj-sheet[role="dialog"]')).toHaveCount(0);
    await expect(example.getByText('Chose: delete')).toBeVisible();
  });

  test('Escape dismisses the action sheet', async ({ page }) => {
    await page.goto('/docs/components/action-sheet');
    await page.locator('kj-action-sheet-example kj-button button').first().click();
    await expect(page.locator('kj-sheet[role="dialog"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('kj-sheet[role="dialog"]')).toHaveCount(0);
  });
});
