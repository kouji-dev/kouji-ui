import { expect, test } from '@playwright/test';

test('picking a preset updates the selected range', async ({ page }) => {
  await page.goto('/docs/components/date-range-presets');

  // The "Default" example — a listbox of presets plus a start/end readout.
  const example = page.locator('[data-toc-entry="Default"]');
  await expect(example).toBeVisible();

  const listbox = example.locator('[role="listbox"]');
  await expect(listbox).toBeVisible();
  await expect(listbox).toHaveAttribute('aria-label', 'Date range presets');

  const start = example.locator('[data-testid="range-start"]');
  const end = example.locator('[data-testid="range-end"]');
  await expect(start).toHaveText('—');
  await expect(end).toHaveText('—');

  // Click "Last 7 days" and assert the range readout updates + option selected.
  const lastSeven = example.getByRole('option', { name: 'Last 7 days' });
  await lastSeven.click();

  await expect(lastSeven).toHaveAttribute('aria-selected', 'true');
  await expect(start).not.toHaveText('—');
  await expect(end).not.toHaveText('—');

  // "Last 7 days" is 7 inclusive days: start is 6 days before end.
  const startText = await start.textContent();
  const endText = await end.textContent();
  const startMs = Date.parse(startText!.trim());
  const endMs = Date.parse(endText!.trim());
  const days = Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
  expect(days).toBe(6);
});

test('keyboard: options are a single tab stop with roving focus', async ({ page }) => {
  await page.goto('/docs/components/date-range-presets');
  const example = page.locator('[data-toc-entry="Default"]');
  const options = example.locator('[role="option"]');
  await expect(options.first()).toHaveAttribute('tabindex', '0');
  await expect(options.nth(1)).toHaveAttribute('tabindex', '-1');

  // Arrow-down moves the roving tab stop.
  await options.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(options.nth(1)).toBeFocused();
});
