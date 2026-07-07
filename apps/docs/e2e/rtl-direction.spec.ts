import { expect, test } from '@playwright/test';

/**
 * RTL end-to-end: the visible direction toggle drives KjLocale.direction,
 * which provideKjDocumentDirection reflects onto <html dir>, and logical-
 * property layouts mirror as a result.
 */
test('direction toggle flips <html dir> to rtl and mirrors layout', async ({
  page,
}) => {
  await page.goto('/docs/components/direction-toggle');

  const toggle = page.locator('button.kj-direction-toggle').first();
  await expect(toggle).toBeVisible();

  // Baseline: LTR everywhere.
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

  // Under LTR the first breadcrumb item (Home) sits LEFT of the last item.
  const items = page.locator('.rtl-demo kj-breadcrumb-item');
  await expect(items.first()).toBeVisible();
  const ltrFirst = await items.first().boundingBox();
  const ltrLast = await items.last().boundingBox();
  expect(ltrFirst!.x).toBeLessThan(ltrLast!.x);

  // Flip to RTL.
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

  // Now the inline-start (first) item lays out on the RIGHT: first.x > last.x.
  const rtlFirst = await items.first().boundingBox();
  const rtlLast = await items.last().boundingBox();
  expect(rtlFirst!.x).toBeGreaterThan(rtlLast!.x);

  // Toggle back — <html dir> returns to ltr.
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});
