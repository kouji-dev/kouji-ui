import {
  type EnvironmentProviders,
  makeEnvironmentProviders,
} from '@angular/core';
import type { IconLoader, IconResolver } from './icon.types';
import {
  KJ_ICON_ENTRIES,
  KJ_ICON_LOADER,
  KJ_ICON_RESOLVER,
} from './icon.tokens';

/**
 * Register a map of icon names to CSS-ready values. Call multiple times to
 * compose icon sets; later calls win on key collision.
 */
export function provideIcons(
  map: Record<string, string>,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: KJ_ICON_ENTRIES, useValue: map, multi: true },
  ]);
}

/**
 * Override the synchronous fallback resolver used when a name is not in the
 * registry and no async loader is configured.
 */
export function provideIconResolver(fn: IconResolver): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: KJ_ICON_RESOLVER, useValue: fn }]);
}

/**
 * Register an async loader. When present, missing icons are loaded via this
 * function and cached into the registry.
 */
export function provideIconLoader(fn: IconLoader): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: KJ_ICON_LOADER, useValue: fn }]);
}
