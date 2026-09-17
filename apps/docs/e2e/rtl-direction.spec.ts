import { expect, test } from '@playwright/test';

/**
 * RTL end-to-end: the visible direction toggle drives KjLocale.direction,
 * which provideKjDocumentDirection reflects onto <html dir>, and logical-
 * property layouts mirror as a result.
 *
 * The toggle lives in the interactive Playground on the Overview tab (since
 * the 2026-05-14 doc-page redesign, a component with a registered playground
 * no longer repeats its Default example as a recipe card — so the old
 * `.rtl-demo` breadcrumb/pagination mirror is not on the page any more).
 * Mirroring is therefore measured on the doc page's own logical-property
 * layout: each section head pins its number at the inline-start and its
 * `#anchor` link at the inline-end, so the two swap sides under `dir="rtl"`
 * exactly as the breadcrumb trail did.
 */
test('direction toggle flips <html dir> to rtl and mirrors layout', async ({
  page,
}) => {
  await page.goto('/docs/components/direction-toggle');
  await expect(page.locator('.playground-stage')).toBeVisible({ timeout: 60_000 });

  const toggle = page.locator('button.kj-direction-toggle').first();
  await expect(toggle).toBeVisible();

  // Baseline: LTR everywhere.
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

  // Under LTR the inline-start element of a section head (its number) sits
  // LEFT of the inline-end element (its anchor link).
  const head = page.locator('.doc-section-head').first();
  const inlineStart = head.locator('.num');
  const inlineEnd = head.locator('.anchor');
  await expect(inlineStart).toBeVisible();
  const ltrFirst = await inlineStart.boundingBox();
  const ltrLast = await inlineEnd.boundingBox();
  expect(ltrFirst!.x).toBeLessThan(ltrLast!.x);

  // Flip to RTL.
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

  // Now the inline-start element lays out on the RIGHT: first.x > last.x.
  const rtlFirst = await inlineStart.boundingBox();
  const rtlLast = await inlineEnd.boundingBox();
  expect(rtlFirst!.x).toBeGreaterThan(rtlLast!.x);

  // Toggle back — <html dir> returns to ltr.
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});
