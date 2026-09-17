import { expect, test } from '@playwright/test';
import { gotoExamples } from './_helpers';

// Mobile viewport for the whole file — these are mobile-first patterns.
test.use({ viewport: { width: 390, height: 844 } });

/**
 * Since the 2026-05-14 doc-page redesign a component with a registered
 * playground no longer repeats its "Default" example as a recipe card: the
 * canonical demo is the interactive Playground on the Overview tab
 * (`.playground-stage`). The sheet playground mounts the same
 * `KjSheetService.open()` call the old `kj-sheet-example` did.
 *
 * The action-sheet playground has no result readout, so those tests drive the
 * "With icons" example instead — it is the action-sheet demo that both renders
 * a menu and reports the resolved value. Its menu carries four actions
 * (the last, `Remove`, is the destructive one) where the hidden Default
 * example had three.
 */
test.describe('bottom sheet', () => {
  test('opens, traps focus, and dismisses via Escape', async ({ page }) => {
    await page.goto('/docs/components/sheet');

    const example = page.locator('.playground-stage');
    await expect(example).toBeVisible({ timeout: 60_000 });
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
    const stage = page.locator('.playground-stage');
    await expect(stage).toBeVisible({ timeout: 60_000 });
    await stage.locator('kj-button button').first().click();
    await expect(page.locator('kj-sheet[role="dialog"]')).toBeVisible();

    // Click the backdrop (top-left, above the bottom-anchored sheet).
    await page.mouse.click(10, 10);
    await expect(page.locator('kj-sheet[role="dialog"]')).toHaveCount(0);
  });
});

test.describe('action sheet', () => {
  test('opens a menu of actions and resolves the selection', async ({ page }) => {
    await gotoExamples(page, 'action-sheet');

    const example = page.locator('kj-action-sheet-icons-example');
    await expect(example).toBeVisible();
    await example.locator('kj-button button').first().click();

    // Bottom-sheet panel with a role="menu" list of actions.
    const panel = page.locator('kj-sheet[role="dialog"]');
    await expect(panel).toBeVisible();
    const menu = panel.locator('[role="menu"]');
    await expect(menu).toBeVisible();
    const items = menu.locator('[role="menuitem"]');
    await expect(items).toHaveCount(4);

    // Selecting an action closes the sheet and reports the value.
    await items.filter({ hasText: 'Remove' }).click();
    await expect(page.locator('kj-sheet[role="dialog"]')).toHaveCount(0);
    await expect(example.getByText('Chose: remove')).toBeVisible();
  });

  test('Escape dismisses the action sheet', async ({ page }) => {
    await gotoExamples(page, 'action-sheet');
    await page.locator('kj-action-sheet-icons-example kj-button button').first().click();
    await expect(page.locator('kj-sheet[role="dialog"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('kj-sheet[role="dialog"]')).toHaveCount(0);
  });
});
