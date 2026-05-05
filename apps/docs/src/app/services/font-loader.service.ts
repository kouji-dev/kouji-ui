import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { CURATED_FONTS } from '../lib/theme/font-catalog';

/**
 * Loads Google Fonts on demand for the theme generator's font dropdowns.
 * Fonts with an empty `query` (system, monospace, georgia) are no-ops.
 * Each font is injected at most once per session.
 */
@Injectable({ providedIn: 'root' })
export class FontLoaderService {
  private readonly document = inject(DOCUMENT);
  private readonly loaded = new Set<string>();

  ensureLoaded(fontId: string): void {
    if (this.loaded.has(fontId)) return;
    const font = CURATED_FONTS.find(f => f.id === fontId);
    if (!font || !font.query) { this.loaded.add(fontId); return; }
    const link = this.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${font.query}&display=swap`;
    this.document.head.appendChild(link);
    this.loaded.add(fontId);
  }
}
