import { Injectable, afterNextRender, computed, signal } from '@angular/core';

/**
 * Theme name. Add new theme names here as @kouji-ui/themes ships more themes.
 */
export type Theme = 'dark' | 'light' | 'kouji' | 'retro' | 'cyberpunk' | 'corporate';

export const AVAILABLE_THEMES: readonly Theme[] = [
  'kouji', 'dark', 'light', 'retro', 'cyberpunk', 'corporate',
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
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>('kouji');
  /** Reactive: 'light' or 'dark' for the active theme. */
  readonly scheme = computed(() => THEME_SCHEME[this.theme()]);
  readonly isDark = computed(() => this.scheme() === 'dark');

  constructor() {
    afterNextRender(() => {
      const stored = localStorage.getItem('kj-theme') as Theme | null;
      if (stored && (AVAILABLE_THEMES as readonly string[]).includes(stored)) {
        this.apply(stored);
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
    this.theme.set(t);
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('kj-theme', t);
  }
}
