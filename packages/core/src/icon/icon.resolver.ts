import { inject } from '@angular/core';
import {
  KJ_ICON_LOADER,
  KJ_ICON_REGISTRY,
  KJ_ICON_RESOLVER,
} from './icon.tokens';

/**
 * Returns a function that resolves an icon name to a CSS-ready value, or
 * `null` while an async load is pending.
 *
 * Lookup order:
 * 1. `KJ_ICON_REGISTRY` (eager)
 * 2. `KJ_ICON_LOADER` (async; fills registry on success, returns `null` while pending)
 * 3. `KJ_ICON_RESOLVER` (sync default, e.g. URL synthesis)
 *
 * Must be called in an injection context.
 * @doc
 * @doc-name icon
 * @doc-order 4
 */
export function injectKjIconResolver(): (name: string) => string | null {
  const registry = inject(KJ_ICON_REGISTRY);
  const loader = inject(KJ_ICON_LOADER);
  const fallback = inject(KJ_ICON_RESOLVER);
  const pending = new Set<string>();

  return (name: string): string | null => {
    const map = registry();
    if (Object.prototype.hasOwnProperty.call(map, name)) return map[name];

    if (loader) {
      if (!pending.has(name)) {
        pending.add(name);
        Promise.resolve(loader(name))
          .then((value) => {
            registry.update((m) => ({ ...m, [name]: value }));
            pending.delete(name);
          })
          .catch(() => {
            pending.delete(name);
          });
      }
      return null;
    }

    return fallback(name);
  };
}
