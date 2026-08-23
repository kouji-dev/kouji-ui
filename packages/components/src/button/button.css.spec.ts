import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import { describe, expect, test } from 'vitest';

const css = readFileSync(resolve(import.meta.dirname, 'button.css'), 'utf-8');

/** Declarations inside the rule whose selector is exactly `.kj-button`. */
function baseBlockDecls(): { prop: string; value: string }[] {
  const out: { prop: string; value: string }[] = [];
  postcss.parse(css).walkRules(rule => {
    if (rule.selector.trim() !== '.kj-button') return;
    rule.walkDecls(d => out.push({ prop: d.prop, value: d.value }));
  });
  return out;
}

describe('button knob overridability', () => {
  const base = baseBlockDecls();

  test('the base .kj-button rule declares no component knobs', () => {
    // A custom property declared on an element always beats an inherited one.
    // Declaring the knobs here made them unreachable from an ancestor — which
    // includes the <kj-button> host, the only element a consumer can put an
    // inline style on, since the host is display:contents.
    const declared = base.filter(d => d.prop.startsWith('--kj-button-'));
    expect(
      declared.map(d => d.prop),
      'knobs must be read as var(name, default) instead of declared here',
    ).toEqual([]);
  });

  test('every knob is read with a default, so nothing regresses visually', () => {
    // Removing the declarations only stays safe while each use site carries the
    // value the base block used to supply.
    const bare = css.match(/var\(--kj-button-[a-z-]+\)/g) ?? [];
    expect(bare, 'these reads would resolve to nothing when unset').toEqual([]);
  });

  test('the base rule still carries the structural properties', () => {
    // Guards against the refactor having emptied the rule entirely.
    const props = base.map(d => d.prop);
    for (const p of ['display', 'padding', 'border-radius', 'background', 'color']) {
      expect(props, `.kj-button must still set ${p}`).toContain(p);
    }
  });

  test('variant and size rules DO still declare knobs on the element', () => {
    // That is the component's own logic and must keep winning over an
    // ancestor value — a consumer picking kjSize="sm" is asking for sm padding.
    const retargeting = new Set<string>();
    postcss.parse(css).walkRules(rule => {
      if (!/\[data-(variant|size)=/.test(rule.selector)) return;
      rule.walkDecls(d => {
        if (d.prop.startsWith('--kj-button-')) retargeting.add(d.prop);
      });
    });
    expect(retargeting.has('--kj-button-height')).toBe(true);
    expect(retargeting.has('--kj-button-padding-x')).toBe(true);
  });

  test('heights resolve from the shared control ladder', () => {
    // So a density switch scales every size variant uniformly.
    for (const [size, token] of [
      ['xs', '--kj-ctl-h-xs'],
      ['sm', '--kj-ctl-h-sm'],
      ['lg', '--kj-ctl-h-lg'],
      ['xl', '--kj-ctl-h-xl'],
    ] as const) {
      const re = new RegExp(
        `\\[data-size="${size}"\\][^}]*--kj-button-height:\\s*var\\(${token}`,
        's',
      );
      expect(css, `size ${size} must read ${token}`).toMatch(re);
    }
  });
});
