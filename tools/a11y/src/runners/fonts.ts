import type { Page } from '@playwright/test';
import type { FontSample, FontsResult, FontWarning } from '../types.js';
import { FONT_SELECTORS } from '../config.js';

const SYSTEM_FALLBACKS = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', '-apple-system', 'BlinkMacSystemFont', 'ui-sans-serif',
  'ui-serif', 'ui-monospace', 'ui-rounded',
]);

export function analyzeFonts(samples: readonly FontSample[]): FontsResult {
  const warnings: FontWarning[] = [];

  for (const s of samples) {
    if (s.fontSize > 0 && s.fontSize < 12) {
      warnings.push({
        selector: s.selector,
        issue: `fontSize ${s.fontSize}px below 12px minimum (WCAG 1.4.4)`,
      });
    }
    if (s.fontSize > 0 && s.lineHeight / s.fontSize < 1.2) {
      const ratio = (s.lineHeight / s.fontSize).toFixed(2);
      warnings.push({
        selector: s.selector,
        issue: `line-height ratio ${ratio} below 1.2 (WCAG 1.4.12)`,
      });
    }
    const firstFamily = s.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
    if (SYSTEM_FALLBACKS.has(firstFamily)) {
      warnings.push({
        selector: s.selector,
        issue: `computed font-family resolved to system fallback '${firstFamily}' — theme web font may have failed to load`,
      });
    }
  }

  return { samples: [...samples], warnings };
}

/**
 * Sample computed font properties for a fixed selector list inside the Playwright page.
 * Runs in browser context (passed to page.evaluate).
 */
export async function sampleFonts(page: Page): Promise<FontSample[]> {
  return page.evaluate((selectors) => {
    const out: FontSample[] = [];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const cs = window.getComputedStyle(el);
      const fontSize = parseFloat(cs.fontSize);
      const lineHeightStr = cs.lineHeight;
      const lineHeight = lineHeightStr === 'normal' ? fontSize * 1.2 : parseFloat(lineHeightStr);
      out.push({
        selector: sel,
        fontFamily: cs.fontFamily,
        fontSize,
        lineHeight,
        weight: parseInt(cs.fontWeight, 10) || 400,
      });
    }
    return out;
  }, FONT_SELECTORS as unknown as string[]);
}
