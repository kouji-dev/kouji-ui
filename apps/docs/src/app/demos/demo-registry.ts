import { Injectable, InjectionToken, Type } from '@angular/core';
import { PreviewTheme } from './preview-theme';

export const DEMO_THEME = new InjectionToken<PreviewTheme>('DEMO_THEME');

@Injectable({ providedIn: 'root' })
export class DemoRegistryService {
  private readonly registry = new Map<string, Partial<Record<PreviewTheme, Type<unknown>>>>();

  register(slug: string, components: Partial<Record<PreviewTheme, Type<unknown>>>): void {
    this.registry.set(slug, { ...this.registry.get(slug), ...components });
  }

  get(slug: string, theme: PreviewTheme = 'default'): Type<unknown> | null {
    const entry = this.registry.get(slug);
    return entry?.[theme] ?? entry?.['default'] ?? null;
  }

  hasDemo(slug: string): boolean {
    return this.registry.has(slug);
  }
}
