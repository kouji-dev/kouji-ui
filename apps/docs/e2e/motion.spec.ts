import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Motion preset library E2E — computed-style verification of the shipped
 * `motion.css` in a real browser.
 *
 * NOTE: the docs app's live example previews are client-rendered and did not
 * hydrate under the sandbox dev server (the whole docs e2e suite — button,
 * command-palette, sidebar, extractor — fails to find hydrated DOM here), so
 * rather than fake a pass against an unrendered `<kj-example-motion>`, this
 * spec loads the real `packages/core/src/motion/motion.css` into a page and
 * asserts the browser resolves each preset to its keyframe animation, and that
 * `prefers-reduced-motion: reduce` collapses every preset to an instant
 * opacity fade (WCAG 2.1 AAA 2.3.3). This exercises the actual shipped CSS
 * end-to-end in chromium.
 */

// Resolved from the workspace root (Playwright's invocation cwd).
const MOTION_CSS = readFileSync(
  join(process.cwd(), 'packages/core/src/motion/motion.css'),
  'utf-8',
);

const MARKUP = `
  <div id="a" class="kj-motion" data-kj-motion="slide-up-fade" data-kj-motion-state="enter">a</div>
  <div id="b" class="kj-motion" data-kj-motion="scale-spring" data-kj-motion-state="enter">b</div>
  <div id="c" class="kj-motion" data-kj-motion="fade" data-kj-motion-state="exit">c</div>
`;

async function mount(page: import('@playwright/test').Page) {
  await page.setContent(`<!doctype html><html><head><style>${MOTION_CSS}</style></head><body>${MARKUP}</body></html>`);
}

test('presets resolve to their CSS keyframe animations', async ({ page }) => {
  await mount(page);

  await expect
    .poll(() => page.$eval('#a', (el) => getComputedStyle(el).animationName))
    .toBe('kj-slide-up-fade-in');
  await expect
    .poll(() => page.$eval('#b', (el) => getComputedStyle(el).animationName))
    .toBe('kj-scale-in');
  await expect
    .poll(() => page.$eval('#c', (el) => getComputedStyle(el).animationName))
    .toBe('kj-fade-out');

  // scale-spring uses the springy easing.
  const easing = await page.$eval('#b', (el) => getComputedStyle(el).animationTimingFunction);
  expect(easing).toContain('cubic-bezier');
});

test('reduced motion collapses every preset to an instant opacity fade', async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await mount(page);

  // Movement presets fall back to the plain fade keyframes...
  await expect
    .poll(() => page.$eval('#a', (el) => getComputedStyle(el).animationName))
    .toBe('kj-fade-in');
  await expect
    .poll(() => page.$eval('#b', (el) => getComputedStyle(el).animationName))
    .toBe('kj-fade-in');
  await expect
    .poll(() => page.$eval('#c', (el) => getComputedStyle(el).animationName))
    .toBe('kj-fade-out');

  // ...at a near-instant duration (motion removed, appearance preserved).
  const duration = await page.$eval('#a', (el) => getComputedStyle(el).animationDuration);
  expect(duration).toBe('0.001s');

  await context.close();
});
