import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  BG_SLOTS,
  FG_SLOTS,
  type BgSlot,
  type DraftTheme,
  type FgSlot,
} from '../lib/theme/types';
import type { BuiltInName } from '../lib/theme/built-in-themes';

const DEFAULT_TYPOGRAPHY = { bodyRem: 1, smallRem: 0.875 } as const;

/**
 * Reads the live CSS values of a built-in theme into a `DraftTheme`.
 *
 * The browser is the only place these tokens are real (the theme CSS is
 * loaded via `angular.json` styles). The extractor mounts a hidden probe
 * element with `data-theme="<name>"` and routes the editable tokens
 * through real CSS properties so the browser's value-resolution machinery
 * does the unit conversion for us — `0.5rem` comes back as `8px`,
 * `1rem` font-size comes back as `16px`, etc.
 *
 * Off-browser (SSR/prerender) `extract()` returns `null` so callers can
 * fall back to a hardcoded snapshot. The theme-generator route opts out
 * of SSR via `RenderMode.Client`, so the live path is the only one that
 * actually fires in practice.
 */
@Injectable({ providedIn: 'root' })
export class ThemePresetExtractor {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  /**
   * Build a `DraftTheme` from the live CSS of the named built-in theme.
   * Returns `null` when the document isn't available (SSR).
   */
  extract(name: BuiltInName): DraftTheme | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const doc = this.document;
    const body = doc.body;
    if (!body) return null;

    const probe = doc.createElement('div');
    probe.setAttribute('data-theme', name);
    probe.setAttribute('aria-hidden', 'true');
    // Off-screen so we never repaint or affect layout. Pointer-events:none
    // keeps the hit-test machinery clear; visibility:hidden keeps it out of
    // accessibility trees.
    probe.style.cssText = [
      'position:fixed',
      'top:-9999px',
      'left:-9999px',
      'visibility:hidden',
      'pointer-events:none',
      // Route each editable numeric token through a real CSS property so
      // getComputedStyle resolves the unit:
      //   width        ← radiusBox   (px)
      //   height       ← radiusField (px)
      //   margin-left  ← radiusSelector (px)
      //   padding-left ← border (px)
      //   opacity      ← depth (number)
      'width:var(--kj-radius-box, 0)',
      'height:var(--kj-radius-field, 0)',
      'margin-left:var(--kj-radius-selector, 0)',
      'padding-left:var(--kj-border, 0)',
      'opacity:var(--kj-depth, 1)',
    ].join(';');

    body.appendChild(probe);
    try {
      const cs = getComputedStyle(probe);
      return {
        name: '',
        bg: readSlotMap(cs, BG_SLOTS) as Record<BgSlot, string>,
        fg: readSlotMap(cs, FG_SLOTS) as Record<FgSlot, string>,
        shape: {
          radiusBox: pxToNumber(cs.width),
          radiusField: pxToNumber(cs.height),
          radiusSelector: pxToNumber(cs.marginLeft),
          border: pxToNumber(cs.paddingLeft),
          depth: parseFloat(cs.opacity) || 0,
        },
        type: {
          fontSans: readVar(cs, '--kj-font-sans'),
          fontMono: readVar(cs, '--kj-font-mono'),
          fontDisplay: readVar(cs, '--kj-font-display'),
        },
        typography: { ...DEFAULT_TYPOGRAPHY },
        motion: {
          transition: readVar(cs, '--kj-transition') || 'var(--kj-base-transition-base)',
        },
      };
    } finally {
      probe.remove();
    }
  }
}

function readVar(cs: CSSStyleDeclaration, name: string): string {
  return cs.getPropertyValue(name).trim();
}

function readSlotMap(
  cs: CSSStyleDeclaration,
  slots: readonly string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const slot of slots) {
    out[slot] = readVar(cs, `--kj-${slot}`);
  }
  return out;
}

function pxToNumber(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}
