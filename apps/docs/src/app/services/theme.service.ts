import { Injectable, afterNextRender, signal } from '@angular/core';

/**
 * Theme name. Add new theme names here as @kouji-ui/themes ships more themes.
 * Wave 1: 'dark' | 'light'. Future waves: + 'kouji' | 'retro' | 'finance'.
 */
export type Theme = 'dark' | 'light';

export const AVAILABLE_THEMES: readonly Theme[] = ['dark', 'light'] as const;

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>('dark');

  constructor() {
    afterNextRender(() => {
      const stored = localStorage.getItem('kj-theme') as Theme | null;
      if (stored && (AVAILABLE_THEMES as readonly string[]).includes(stored)) {
        this.apply(stored);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.apply(prefersDark ? 'dark' : 'light');
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
