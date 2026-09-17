import {
  type EnvironmentProviders,
  makeEnvironmentProviders,
} from '@angular/core';
import type { IconLoader, IconResolver } from './icon.types';
import {
  KJ_ICON_ENTRIES,
  KJ_ICON_LOADER,
  KJ_ICON_REGISTRY,
  KJ_ICON_RESOLVER,
  createScopedIconRegistry,
} from './icon.tokens';

/**
 * Register a map of icon names to CSS-ready values. Call multiple times to
 * compose icon sets; later calls win on key collision.
 *
 * Works at any environment injector. At the root the entries seed the
 * app-wide registry; on a lazy route (`Route.providers`) or in a
 * `createEnvironmentInjector()` they layer a scoped registry over the
 * parent's, so that subtree sees both its own icons and everything
 * registered above it, and can shadow a parent's name without affecting the
 * rest of the page. Environment providers cannot go in a component's
 * `providers` array.
 *
 * ```ts
 * // app.config.ts — global set
 * provideIcons({ settings: 'url("...")' });
 *
 * // a route's providers — extends and shadows for that route only
 * provideIcons({ settings: 'url("...alt")', 'trash-2': 'url("...")' });
 * ```
 *
 * Scoping is by *environment* injector only. {@link KJ_ICON_REGISTRY} is
 * resolved from the injector that instantiated the icon directive, so a
 * `provideIcons` call listed in a component's `providers` array never
 * reaches it — the entries are silently ignored — and a route-level call
 * reaches only components created under that route.
 * @doc
 * @doc-name icon
 * @doc-order 1
 */
export function provideIcons(
  map: Record<string, string>,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: KJ_ICON_ENTRIES, useValue: map, multi: true },
    { provide: KJ_ICON_REGISTRY, useFactory: createScopedIconRegistry },
  ]);
}

/**
 * Override the synchronous fallback resolver used when a name is not in the
 * registry and no async loader is configured.
 * @doc
 * @doc-name icon
 * @doc-order 2
 */
export function provideIconResolver(fn: IconResolver): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: KJ_ICON_RESOLVER, useValue: fn }]);
}

/**
 * Register an async loader. When present, missing icons are loaded via this
 * function and cached into the nearest registry.
 * @doc
 * @doc-name icon
 * @doc-order 3
 */
export function provideIconLoader(fn: IconLoader): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: KJ_ICON_LOADER, useValue: fn }]);
}
