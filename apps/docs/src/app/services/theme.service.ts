import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, afterNextRender, computed, inject, signal } from '@angular/core';

/**
 * Theme name. Add new theme names here as @kouji-ui/themes ships more themes.
 */
export type Theme =
  | 'dark' | 'light' | 'kouji' | 'retro' | 'cyberpunk' | 'corporate'
  | 'sakura' | 'bauhaus' | 'dune' | 'mint'
  | 'forest' | 'nord' | 'terminal';

export const AVAILABLE_THEMES: readonly Theme[] = [
  'kouji', 'dark', 'light', 'retro', 'cyberpunk', 'corporate',
  'sakura', 'bauhaus', 'dune', 'mint',
  'forest', 'nord', 'terminal',
] as const;

/**
 * Color scheme of each theme. Consumed by integrations that need to know
 * whether a theme is "dark-on-light" or "light-on-dark" (e.g., picking
 * Monaco's bundled vs / vs-dark syntax theme, choosing emoji glyphs, etc.).
 * When a new theme is added in @kouji-ui/themes, add it here too.
 */
export const THEME_SCHEME: Record<Theme, 'light' | 'dark'> = {
  kouji:     'dark',
  dark:      'dark',
  light:     'light',
  retro:     'light',
  cyberpunk: 'light',
  corporate: 'light',
  sakura:    'light',
  bauhaus:   'light',
  dune:      'light',
  mint:      'light',
  forest:    'dark',
  nord:      'dark',
  terminal:  'dark',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly theme = signal<Theme>('kouji');
  /** Reactive: 'light' or 'dark' for the active theme. */
  readonly scheme = computed(() => THEME_SCHEME[this.theme()]);
  readonly isDark = computed(() => this.scheme() === 'dark');

  constructor() {
    afterNextRender(() => {
      const fromUrl = new URLSearchParams(window.location.search).get('theme');
      const fromStorage = localStorage.getItem('kj-theme');
      const isValid = (t: string | null): t is Theme =>
        !!t && (AVAILABLE_THEMES as readonly string[]).includes(t);

      if (isValid(fromUrl)) {
        // URL param wins but does NOT persist — used by automated a11y runs
        // and shareable theme preview links.
        this.applyTransient(fromUrl);
      } else if (isValid(fromStorage)) {
        this.apply(fromStorage);
      } else {
        // First-visit default = kouji (the brand identity).
        this.apply('kouji');
      }
    });
  }

  /** Switch to a specific theme. */
  set(theme: Theme): void {
    this.apply(theme);
  }

  /** Cycle through AVAILABLE_THEMES (used by trigger button). */
  cycle(): void {
    const idx = AVAILABLE_THEMES.indexOf(this.theme());
    const next = AVAILABLE_THEMES[(idx + 1) % AVAILABLE_THEMES.length];
    this.apply(next);
  }

  /** @deprecated kept for backwards compatibility — use set() or cycle(). */
  toggle(): void {
    this.cycle();
  }

  private apply(t: Theme): void {
    this.applyTransient(t);
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem('kj-theme', t);
  }

  /** Apply a theme to the DOM + signal without persisting to localStorage. */
  private applyTransient(t: Theme): void {
    this.theme.set(t);
    if (!isPlatformBrowser(this.platformId)) return;
    document.documentElement.setAttribute('data-theme', t);
  }
}
