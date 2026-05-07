import { EnvironmentProviders, makeEnvironmentProviders, inject } from '@angular/core';

/**
 * Provider for icons.
 * @doc
 * @doc-name function-page
 * @doc-is-main
 */
export function provideIcons(map: Record<string, string>): EnvironmentProviders {
  return makeEnvironmentProviders([]);
}

/**
 * Inject helper for the icon resolver.
 * @doc
 * @doc-name function-page
 * @doc-order 1
 */
export function injectKjIconResolver(): (name: string) => string | null {
  inject(String);
  return () => null;
}

/**
 * Plain mode helper.
 * @doc
 * @doc-name function-page
 * @doc-order 2
 */
export function getIconMode(name: string): 'svg' | 'font' {
  return name.startsWith('@font.') ? 'font' : 'svg';
}
