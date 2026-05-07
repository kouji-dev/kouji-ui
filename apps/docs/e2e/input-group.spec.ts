import { expect, test } from '@playwright/test';

test('input-group addon visually matches kj-input (background, line-height, height)', async ({ page }) => {
  await page.goto('/docs/components/input-group');

  const group = page.locator('.kj-input-group').first();
  await expect(group).toBeVisible();

  const input = group.locator('input.kj-input').first();

  const measurements = await group.evaluate((el) => {
    const i = el.querySelector('input.kj-input') as HTMLElement;
    const a = el.querySelector('.kj-input-group__addon') as HTMLElement;
    const ic = getComputedStyle(i);
    const ac = getComputedStyle(a);
    const gc = getComputedStyle(el);
    return {
      groupOverflow: gc.overflow,
      bgMatch: ic.backgroundColor === ac.backgroundColor,
      lineHeightMatch: ic.lineHeight === ac.lineHeight,
      borderWidthMatch: ic.borderTopWidth === ac.borderTopWidth,
      heightDiff: Math.abs(i.getBoundingClientRect().height - a.getBoundingClientRect().height),
    };
  });

  expect(measurements.groupOverflow).not.toBe('hidden');
  expect(measurements.bgMatch).toBe(true);
  expect(measurements.lineHeightMatch).toBe(true);
  expect(measurements.borderWidthMatch).toBe(true);
  expect(measurements.heightDiff).toBeLessThanOrEqual(1);

  await input.focus();
  await expect(input).toBeFocused();
});
