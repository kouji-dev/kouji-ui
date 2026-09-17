import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss, { type AtRule, type Rule } from 'postcss';
import { describe, expect, test } from 'vitest';

const css = readFileSync(resolve(import.meta.dirname, 'accordion.css'), 'utf-8');
const root = postcss.parse(css);

/** Declarations of every rule (outside `@media`) whose selector list contains `selector` verbatim. */
function decls(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  root.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && (rule.parent as AtRule).name === 'media') return;
    if (!rule.selector.split(',').some((s) => s.trim() === selector)) return;
    rule.walkDecls((d) => {
      out[d.prop] = d.value;
    });
  });
  return out;
}

describe('accordion panel height', () => {
  test('no rule caps the panel height — content taller than the old 1000px ceiling is not clipped', () => {
    // `max-height: 1000px` was the "tall enough" ceiling of the height tween.
    // At 200% zoom, with a large font or with long content the panel exceeded
    // it and the rest was cut off with no scrollbar (WCAG 1.4.4 Resize Text,
    // 1.4.10 Reflow).
    const caps: string[] = [];
    root.walkDecls(/^(max-height|height)$/, (d) => {
      const selector = d.parent?.type === 'rule' ? (d.parent as Rule).selector : '?';
      caps.push(`${selector} { ${d.prop}: ${d.value} }`);
    });
    expect(caps).toEqual([]);
  });

  test('open/close tweens a grid row between 0fr and 1fr, so the open height is the content height', () => {
    const closed = decls('.kj-accordion-content');
    expect(closed['display']).toBe('grid');
    expect(closed['grid-template-rows']).toBe('0fr');
    expect(closed['transition']).toMatch(/grid-template-rows/);
    expect(decls('.kj-accordion-content[data-state="open"]')['grid-template-rows']).toBe('1fr');
  });

  test('the inner grid item collapses with the row and is the only thing that clips', () => {
    const inner = decls('.kj-accordion-content__inner');
    // Without `min-height: 0` a grid item keeps its automatic minimum size and
    // the 0fr row could not collapse it.
    expect(inner['min-height']).toBe('0');
    expect(inner['overflow']).toBe('hidden');
    // The panel itself no longer clips: when the row is 1fr it is exactly as
    // tall as the item, so there is nothing left to hide.
    expect(decls('.kj-accordion-content')['overflow']).toBeUndefined();
  });

  test('vertical padding lives on the inner item and collapses when closed', () => {
    expect(decls('.kj-accordion-content__inner')['padding']).toBe('0 var(--kj-space-lg)');
    expect(
      decls('.kj-accordion-content[data-state="open"] > .kj-accordion-content__inner')['padding'],
    ).toBe('0 var(--kj-space-lg) var(--kj-space-md)');
  });

  test('reduced motion disables both panel transitions', () => {
    let covered = false;
    root.walkAtRules('media', (at) => {
      if (!/prefers-reduced-motion:\s*reduce/.test(at.params)) return;
      at.walkRules((rule) => {
        const selectors = rule.selector.split(',').map((s) => s.trim());
        if (
          !selectors.includes('.kj-accordion-content') ||
          !selectors.includes('.kj-accordion-content__inner')
        ) {
          return;
        }
        rule.walkDecls('transition', (d) => {
          if (d.value === 'none') covered = true;
        });
      });
    });
    expect(covered).toBe(true);
  });
});
