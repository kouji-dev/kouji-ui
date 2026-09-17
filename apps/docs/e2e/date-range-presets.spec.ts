import { expect, type Locator, type Page, test } from '@playwright/test';

/**
 * The canonical "Default" demo is the interactive Playground on the Overview
 * tab (since the 2026-05-14 doc-page redesign, a component with a registered
 * playground no longer repeats its Default example as a recipe card). It
 * mounts the same `<kj-date-range-presets>` — a listbox of presets plus a
 * single start → end readout.
 */
async function gotoPlayground(page: Page): Promise<Locator> {
  await page.goto('/docs/components/date-range-presets');
  const stage = page.locator('.playground-stage');
  await expect(stage).toBeVisible({ timeout: 60_000 });
  return stage;
}

test('picking a preset updates the selected range', async ({ page }) => {
  const example = await gotoPlayground(page);

  const listbox = example.locator('[role="listbox"]');
  await expect(listbox).toBeVisible();
  await expect(listbox).toHaveAttribute('aria-label', 'Date range presets');

  // The readout renders `Selected: <start> → <end>`, or an em dash when no
  // range is picked yet (the Default example used to split this across two
  // `range-start` / `range-end` nodes).
  const readout = example.locator('p.selected');
  await expect(readout).toHaveText(/Selected:\s*—/);

  // Click "Last 7 days" and assert the range readout updates + option selected.
  const lastSeven = example.getByRole('option', { name: 'Last 7 days' });
  await lastSeven.click();

  await expect(lastSeven).toHaveAttribute('aria-selected', 'true');
  await expect(readout).not.toHaveText(/Selected:\s*—/);
  await expect(readout).toContainText('→');

  // "Last 7 days" is 7 inclusive days: start is 6 days before end.
  const [startText, endText] = (await readout.textContent())!
    .replace(/^\s*Selected:\s*/, '')
    .split('→');
  expect(startText.trim()).not.toBe('');
  expect(endText.trim()).not.toBe('');
  const startMs = Date.parse(startText.trim());
  const endMs = Date.parse(endText.trim());
  const days = Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
  expect(days).toBe(6);
});

test('keyboard: options are a single tab stop with roving focus', async ({ page }) => {
  const example = await gotoPlayground(page);
  const options = example.locator('[role="option"]');
  await expect(options.first()).toHaveAttribute('tabindex', '0');
  await expect(options.nth(1)).toHaveAttribute('tabindex', '-1');

  // Arrow-down moves the roving tab stop.
  await options.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(options.nth(1)).toBeFocused();
});
