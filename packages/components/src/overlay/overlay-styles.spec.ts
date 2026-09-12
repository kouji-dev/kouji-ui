import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import postcss from 'postcss';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { KjPopoverTrigger, KjPopoverContent, KjPopoverTitle } from '@kouji-ui/core';

/**
 * The overlay surfaces have to paint for the composition the docs teach:
 * a trigger directive plus a content directive, both straight from
 * `@kouji-ui/core`, with no wrapper component on the page.
 *
 * They used to paint nothing. `.kj-popover-content`'s background, border
 * and shadow lived in `popover.css`, which reached the document only as
 * `KjPopoverComponent`'s `styleUrl` — and Angular injects a component's
 * styles only when that component is instantiated. `<kj-popover>` is
 * optional (the library's own usage example never renders one), so the
 * panel came up transparent, borderless and shadowless, with not one rule
 * for `.kj-popover-content` anywhere in `document.styleSheets`.
 *
 * The fix is `src/overlay/overlay.css`: one registerable stylesheet
 * carrying every overlay-family surface, shipped in the published package
 * (`ng-package.json` copies every stylesheet under `src/` verbatim, so these
 * relative imports resolve the same from `node_modules`). These specs pin
 * all three halves: the sheet paints, it covers every surface, and it
 * ships.
 */

const HERE = import.meta.dirname;
const AGGREGATOR = resolve(HERE, 'overlay.css');
const COMPONENTS_SRC = resolve(HERE, '..');

/**
 * Unwraps the single `@layer kj.component { … }` block each stylesheet
 * ships. jsdom's cascade does not implement `@layer`, and leaving the
 * blocks in place after inlining would also leave unbalanced braces.
 */
function unlayer(css: string): string {
  const open = css.match(/@layer\s+[\w.]+\s*\{/);
  if (!open || open.index === undefined) return css;
  const close = css.lastIndexOf('}');
  if (close < 0) return css;
  return css.slice(0, open.index) + css.slice(open.index + open[0].length, close) + css.slice(close + 1);
}

/** Inlines the aggregator's `@import` graph into one stylesheet. */
function flatten(file: string, seen = new Set<string>()): string {
  if (seen.has(file)) return '';
  seen.add(file);
  const css = unlayer(readFileSync(file, 'utf-8'));
  return css.replace(/@import\s+"([^"]+)";/g, (_, spec: string) =>
    flatten(resolve(dirname(file), spec), seen),
  );
}

/** Every stylesheet the aggregator pulls in, as absolute paths. */
function importedFiles(file: string): string[] {
  const css = readFileSync(file, 'utf-8');
  return [...css.matchAll(/@import\s+"([^"]+)";/g)].map(m => resolve(dirname(file), m[1]));
}

@Component({
  standalone: true,
  imports: [KjPopoverTrigger, KjPopoverContent, KjPopoverTitle],
  template: `
    <button kjPopoverTrigger #t="kjPopoverTrigger" data-test="trigger">Settings</button>
    <kj-popover-content [kjFor]="t" data-test="panel">
      <h3 kjPopoverTitle>Notification settings</h3>
    </kj-popover-content>
  `,
})
class DocumentedComposition {}

describe('overlay surfaces paint for the headless-directive composition', () => {
  let styleEl: HTMLStyleElement | null = null;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    styleEl = document.createElement('style');
    // jsdom's cascade does not implement `@layer`, so unwrap the single
    // `@layer kj.component { … }` block each file ships. The declarations,
    // selectors and token references under test are untouched.
    styleEl.textContent =
      ':root{--kj-bg-elevated:rgb(44,45,48);--kj-fg-default:#fff;--kj-border-default:#555;}'
      + flatten(AGGREGATOR);
    document.head.appendChild(styleEl);
  });

  afterEach(() => {
    styleEl?.remove();
    document.body.querySelector('.kj-overlay-container')?.remove();
  });

  it('the documented popover composition renders a panel with a real surface', () => {
    const fixture = TestBed.createComponent(DocumentedComposition);
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('[data-test="panel"]') as HTMLElement;
    expect(panel, 'the panel element exists').not.toBeNull();
    expect(panel.classList.contains('kj-popover-content')).toBe(true);

    // The exact diagnostic that came back empty from the broken build: scan
    // every sheet in the document for a rule that both matches the panel and
    // fills it. Zero matches is the bug; one or more is the fix.
    const filling = [...document.styleSheets]
      .flatMap(sheet => [...(sheet.cssRules ?? [])])
      .filter((r): r is CSSStyleRule => 'selectorText' in r)
      .filter(r => panel.matches(r.selectorText))
      .filter(r => r.style.getPropertyValue('background') || r.style.getPropertyValue('background-color'));
    expect(filling.length, 'a registered rule must fill the panel').toBeGreaterThan(0);
    // Themed, not hardcoded — the fill comes from the elevated-surface token.
    expect(filling.some(r => /--kj-popover-bg|--kj-bg-elevated/.test(r.style.getPropertyValue('background'))))
      .toBe(true);

    // And the rule really reaches the element through the cascade:
    // `display: block` is declared next to `background` in the same block
    // and, unlike the fill, carries no `var()` — jsdom's `getComputedStyle`
    // does not substitute custom properties, so this is the property that
    // can prove the match end to end. (`hidden` is dropped first: a closed
    // panel is `display: none` from the UA sheet whatever we author.)
    panel.removeAttribute('hidden');
    expect(getComputedStyle(panel).display).toBe('block');
  });

  it('the aggregator carries a background for every overlay surface, not just the popover', () => {
    const css = flatten(AGGREGATOR);
    const surfaces = [
      '.kj-popover-content',
      '.kj-tooltip-content',
      '.kj-dropdown-menu',
      '.kj-confirm-popup-content',
      '.kj-drawer',
      '.kj-sheet',
    ];
    for (const sel of surfaces) {
      let painted = false;
      postcss.parse(css).walkRules(rule => {
        if (!rule.selector.split(',').some(s => s.trim() === sel)) return;
        rule.walkDecls('background', () => (painted = true));
        rule.walkDecls('background-color', () => (painted = true));
      });
      expect(painted, `${sel} must get its fill from the registered stylesheet`).toBe(true);
    }
  });

  it('every overlay-family stylesheet is registered — none is reachable only through its wrapper component', () => {
    const imported = new Set(importedFiles(AGGREGATOR));
    // Any component whose CSS styles a panel that a CORE directive renders
    // must be in the aggregator; the wrapper component is optional there.
    const overlayFamily = [
      'popover', 'tooltip', 'dropdown-menu', 'dialog',
      'drawer', 'toast', 'confirm-popup', 'sheet', 'action-sheet',
    ];
    for (const name of overlayFamily) {
      const file = resolve(COMPONENTS_SRC, name, `${name}.css`);
      expect(existsSync(file), `${name}.css exists`).toBe(true);
      expect(imported.has(file), `${name}.css must be in overlay.css`).toBe(true);
    }
    // And nothing listed has gone missing.
    for (const file of imported) {
      expect(existsSync(file), `${file} is imported but does not exist`).toBe(true);
    }
  });

  it('the published package ships the stylesheet tree the aggregator points at', () => {
    const ngPackage = JSON.parse(
      readFileSync(resolve(COMPONENTS_SRC, '..', 'ng-package.json'), 'utf-8'),
    ) as { assets?: { input: string; glob: string; output: string }[] };
    const assets = ngPackage.assets ?? [];
    expect(
      assets.some(a => a.input === 'src' && a.glob === '**/*.css' && a.output === 'src'),
      'ng-package.json must copy the whole src CSS tree, or the relative @imports break once installed',
    ).toBe(true);
    // The aggregator only imports siblings inside src/, which is what makes
    // the copied tree self-consistent in the published package.
    for (const file of importedFiles(AGGREGATOR)) {
      expect(file.startsWith(COMPONENTS_SRC), `${file} must live under src/`).toBe(true);
    }
  });

  it('the core overlay primitive chrome is published on its own', () => {
    const corePkgDir = resolve(COMPONENTS_SRC, '..', '..', 'core');
    const ngPackage = JSON.parse(readFileSync(resolve(corePkgDir, 'ng-package.json'), 'utf-8')) as {
      assets: { input: string; glob: string; output: string }[];
    };
    expect(
      ngPackage.assets.some(
        a => a.input === 'src/primitives/overlay' && a.glob === 'overlay.css' && a.output === 'overlay',
      ),
    ).toBe(true);
    const pkg = JSON.parse(readFileSync(resolve(corePkgDir, 'package.json'), 'utf-8')) as {
      exports: Record<string, unknown>;
    };
    expect(pkg.exports['./overlay/overlay.css']).toBeDefined();
  });

  it('no overlay-family stylesheet was left out of the folder scan', () => {
    // Guards the list above against a new overlay component landing with a
    // wrapper-only stylesheet: anything that names a `*-content` panel class
    // a core directive stamps has to be registered.
    const dirs = readdirSync(COMPONENTS_SRC, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    expect(dirs).toContain('popover');
    expect(dirs).toContain('tooltip');
  });
});
