import { PendingTasks, inject } from '@angular/core';
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
 * 1. `KJ_ICON_REGISTRY` (eager; the nearest registry in the injector tree)
 * 2. `KJ_ICON_LOADER` (async; fills registry on success, returns `null` while pending)
 * 3. `KJ_ICON_RESOLVER` (sync default, e.g. URL synthesis)
 *
 * A pending load holds an Angular pending task, so `ApplicationRef.isStable`
 * — and therefore server rendering and prerendering — waits for the icon.
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
  const pendingTasks = inject(PendingTasks);
  const pending = new Set<string>();

  return (name: string): string | null => {
    const map = registry();
    if (Object.prototype.hasOwnProperty.call(map, name)) return map[name];

    if (loader) {
      if (!pending.has(name)) {
        pending.add(name);
        const done = pendingTasks.add();
        const settle = () => {
          pending.delete(name);
          done();
        };
        Promise.resolve(loader(name)).then(
          (value) => {
            // A bulk write may have landed the value first (a loader that
            // fills the whole set at once); an identical map is not a change.
            registry.update((m) => (m[name] === value ? m : { ...m, [name]: value }));
            settle();
          },
          // A failed load is forgotten, not cached: the next request retries.
          settle,
        );
      }
      return null;
    }

    return fallback(name);
  };
}
